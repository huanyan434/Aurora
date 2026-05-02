package utils

import (
	"bytes"
	"context"
	"encoding/base64"
	"encoding/json"
	"errors"
	"fmt"
	"io"
	"mime/multipart"
	"net/http"
	"strconv"
	"strings"
	"sync"
	"time"

	"github.com/gin-gonic/gin"
	"github.com/golang-queue/queue"
	"github.com/sashabaranov/go-openai"
)

// --- 全局线程管理 ---

// ThreadInfo 存储线程相关的全部信息
type ThreadInfo struct {
	Cancel context.CancelFunc
	Resp   chan string
}

type ConversationIDMessageID struct {
	MessageUserID      int64 `json:"messageUserID"`
	MessageAssistantID int64 `json:"messageAssistantID"`
}

// MessageContent 缓存消息的完整内容，用于断点续传
type MessageContent struct {
	ReasoningContent string
	Content          string
	ReasoningTime    int
	Completed        bool // 是否已完成
}

type ImageGenerateRequest struct {
	Model   string `json:"model"`
	Prompt  string `json:"prompt"`
	N       int    `json:"n"`
	Size    string `json:"size,omitempty"`
	Format  string `json:"format,omitempty"`
	Quality string `json:"quality,omitempty"`
}

type ImageEditRequest struct {
	Model      string   `json:"model"`
	Prompt     string   `json:"prompt"`
	Images     []string `json:"images"`
	Mask       string   `json:"mask,omitempty"`
	N          int      `json:"n,omitempty"`
	Size       string   `json:"size,omitempty"`
	Quality    string   `json:"quality,omitempty"`
	Background string   `json:"background,omitempty"`
}

type ImageGenerateResponse struct {
	Created int64 `json:"created"`
	Data    []struct {
		URL           string `json:"url"`
		B64JSON       string `json:"b64_json"`
		RevisedPrompt string `json:"revised_prompt"`
	} `json:"data"`
}

// 全局线程 ID 列表和相关管理结构
var (
	// 使用一个 map 来存储所有线程信息，保证数据一致性
	ThreadRegistry = make(map[string]ThreadInfo)
	ThreadMutex    sync.RWMutex

	// 使用队列处理并发请求
	TaskQueue *queue.Queue

	// 记录请求中的 conversationID 对应 messageUserID 和 messageAssistantID
	ConversationIDMessageIDs      = map[int64]ConversationIDMessageID{}
	ConversationIDMessageIDsMutex sync.RWMutex

	// 缓存每个消息的完整内容，用于断点续传
	MessageContentCache      = make(map[int64]*MessageContent)
	MessageContentCacheMutex sync.RWMutex
)

// 初始化队列
func init() {
	TaskQueue = queue.NewPool(100) // 同时处理 100 个并发请求
}

func generateConversationTitleByAI(ctx context.Context, model string, userMessage string, assistantMessage string) string {
	userMessage = strings.TrimSpace(userMessage)
	assistantMessage = strings.TrimSpace(assistantMessage)
	if userMessage == "" || assistantMessage == "" {
		return ""
	}

	config := GetConfig()
	c := openai.DefaultConfig(config.APIKey)
	c.BaseURL = config.API
	client := openai.NewClientWithConfig(c)

	resp, err := client.CreateChatCompletion(ctx, openai.ChatCompletionRequest{
		Model: model,
		Messages: []openai.ChatCompletionMessage{
			{
				Role:    openai.ChatMessageRoleSystem,
				Content: "你是对话标题生成助手。请根据用户首条消息和AI首条回复，生成一个简洁、规范、准确的中文对话标题。要求：1. 8到20个字；2. 不要使用引号、书名号、冒号、句号等多余标点；3. 不要出现\"用户\"\"AI\"\"对话\"\"请求\"等词；4. 只输出标题本身。",
			},
			{
				Role:    openai.ChatMessageRoleUser,
				Content: fmt.Sprintf("用户首条消息：%s\nAI首条回复：%s\n请直接输出标题。", userMessage, assistantMessage),
			},
		},
	})
	if err != nil {
		fmt.Printf("AI生成对话标题失败：%v\n", err)
		return ""
	}
	if len(resp.Choices) == 0 {
		return ""
	}

	title := strings.TrimSpace(resp.Choices[0].Message.Content)
	title = strings.Trim(title, "\"'《》【】[]()（）:：;；,.，。!！?？")
	if title == "" || title == "新对话" {
		return ""
	}
	return title
}

func stripBase64Block(content string) string {
	start := strings.Index(content, "<base64>")
	end := strings.Index(content, "</base64>")
	if start == -1 || end == -1 || end < start {
		return strings.TrimSpace(content)
	}
	cleaned := content[:start] + content[end+len("</base64>"):]
	return strings.TrimSpace(cleaned)
}

func extractBase64Block(content string) string {
	start := strings.Index(content, "<base64>")
	end := strings.Index(content, "</base64>")
	if start == -1 || end == -1 || end < start {
		return ""
	}
	return strings.TrimSpace(content[start+len("<base64>") : end])
}

func buildVisualSummaryPrompt(prompt string) string {
	prompt = strings.TrimSpace(prompt)
	if prompt == "" {
		return "请用简洁准确的中文总结这张图片的内容，保留关键信息、场景、人物、文字和可见细节，便于后续对话模型继续回答。"
	}
	return "请先用简洁准确的中文总结这张图片的内容，保留关键信息、场景、人物、文字和可见细节，并结合用户需求给出可直接供后续对话使用的图片理解摘要。用户问题：" + prompt
}

func getModelImageCapability(model string) int {
	for _, m := range GetConfig().Models {
		if m.ID == model {
			return m.Image
		}
	}
	return 0
}

func getDefaultVisualModel() string {
	config := GetConfig()
	if strings.TrimSpace(config.DefaultVisualModel) != "" {
		return strings.TrimSpace(config.DefaultVisualModel)
	}
	return strings.TrimSpace(config.DefaultDialogNamingModel)
}

func summarizeImageWithModel(ctx context.Context, model string, prompt string, base64Image string) (string, error) {
	config := GetConfig()
	c := openai.DefaultConfig(config.APIKey)
	c.BaseURL = config.API
	client := openai.NewClientWithConfig(c)

	messages := []openai.ChatCompletionMessage{
		{
			Role:    openai.ChatMessageRoleSystem,
			Content: "你是图片理解助手。请根据图片内容输出中文摘要，只输出可供后续对话模型直接使用的结果，不要输出多余解释。",
		},
		{
			Role: openai.ChatMessageRoleUser,
			MultiContent: []openai.ChatMessagePart{
				{
					Type: openai.ChatMessagePartTypeText,
					Text: buildVisualSummaryPrompt(prompt),
				},
				{
					Type:     openai.ChatMessagePartTypeImageURL,
					ImageURL: &openai.ChatMessageImageURL{URL: base64Image},
				},
			},
		},
	}

	resp, err := client.CreateChatCompletion(ctx, openai.ChatCompletionRequest{Model: model, Messages: messages})
	if err != nil {
		return "", err
	}
	if len(resp.Choices) == 0 {
		return "", fmt.Errorf("图片识别结果为空")
	}
	return strings.TrimSpace(resp.Choices[0].Message.Content), nil
}

func prepareVisualPrompt(ctx context.Context, model string, prompt string, base64Image string) (string, string, error) {
	if strings.TrimSpace(base64Image) == "" {
		return prompt, "", nil
	}

	capability := getModelImageCapability(model)
	if capability == 1 || capability == 3 {
		return prompt, base64Image, nil
	}

	visualModel := getDefaultVisualModel()
	if visualModel == "" {
		return prompt, "", fmt.Errorf("未配置可用的视觉模型")
	}

	summary, err := summarizeImageWithModel(ctx, visualModel, prompt, base64Image)
	if err != nil {
		return prompt, "", fmt.Errorf("图片识别失败: %w", err)
	}

	prompt = strings.TrimSpace(prompt)
	if prompt == "" {
		prompt = summary
	} else {
		prompt = prompt + "\n\n图片内容摘要：" + summary
	}
	return prompt, "", nil
}

// --- 核心功能：并发处理 OpenAI 请求 ---

// ThreadOpenai 使用并发处理 OpenAI 请求，返回一个通道以实现类似 Python yield 的功能
func ThreadOpenai(conversationID int64, messageUserID int64, messageAssistantID int64, model string, prompt string, base64 string, reasoning bool) <-chan string {
	threadID := strconv.FormatInt(conversationID, 10)

	// 1. 检查线程是否已存在
	ThreadMutex.RLock()
	info, exists := ThreadRegistry[threadID]
	ThreadMutex.RUnlock()

	// 如果线程已存在，直接返回已存在的通道
	if exists {
		// 确保返回的通道没有被关闭
		// 这是一个简单的检查，更严谨地实现需要额外的状态字段
		// 但基于当前的 defer close 逻辑，我们相信如果存在，它应该仍在使用中。
		return info.Resp
	}

	// 2. 创建新的响应通道和上下文
	resp := make(chan string, 100) // 缓冲通道提高性能
	_, cancel := context.WithCancel(context.Background())

	// 3. 注册新线程
	ThreadMutex.Lock()
	ThreadRegistry[threadID] = ThreadInfo{
		Cancel: cancel,
		Resp:   resp,
	}
	ThreadMutex.Unlock()
	ConversationIDMessageIDsMutex.Lock()
	ConversationIDMessageIDs[conversationID] = ConversationIDMessageID{
		MessageUserID:      messageUserID,
		MessageAssistantID: messageAssistantID,
	}
	ConversationIDMessageIDsMutex.Unlock()

	// 初始化消息内容缓存
	MessageContentCacheMutex.Lock()
	MessageContentCache[messageAssistantID] = &MessageContent{
		ReasoningContent: "",
		Content:          "",
		ReasoningTime:    0,
		Completed:        false,
	}
	MessageContentCacheMutex.Unlock()

	// 4. 在开始AI生成前，先保存用户消息到数据库
	// 从数据库加载历史消息
	historyMessages, err := LoadConversationHistoryFormat2(conversationID)
	if err != nil {
		fmt.Printf("加载历史消息失败：%v\n", err)
		historyMessages = []messageFormat{} // 如果加载失败，使用空列表
	}

	preparedPrompt, preparedBase64, err := prepareVisualPrompt(context.Background(), model, prompt, base64)
	if err != nil {
		jsonResp, _ := json.Marshal(Response{Success: false, Error: err.Error()})
		resp <- string(jsonResp)
		close(resp)
		return resp
	}

	rawBase64 := base64
	if rawBase64 == "" {
		rawBase64 = extractBase64Block(prompt)
	}

	// 添加当前用户消息
	userMessage := messageFormat{
		ID:             messageUserID,
		ConversationID: conversationID,
		Role:           "user",
		Content:        prompt,
		Base64:         rawBase64,
		CreatedAt:      time.Now().Format("2006-01-02T15:04:05Z07:00"),
	}
	historyMessages = append(historyMessages, userMessage)

	// 保存包含用户消息的历史记录
	if err := SaveConversationHistoryFormat2(conversationID, historyMessages); err != nil {
		fmt.Printf("保存用户消息失败：%v\n", err)
	}

	go func() {
		err := TaskQueue.QueueTask(func(ctx context.Context) error {
			// 确保在函数退出时清理资源
			defer func() {
				// 标记消息内容为已完成
				MessageContentCacheMutex.Lock()
				if content, exists := MessageContentCache[messageAssistantID]; exists {
					content.Completed = true
				}
				MessageContentCacheMutex.Unlock()

				// 生成完成后，只保存AI消息到数据库（用户消息已经保存过了）
				// 从缓存中获取完整的 AI 回复内容
				MessageContentCacheMutex.RLock()
				aiContent := MessageContentCache[messageAssistantID]
				MessageContentCacheMutex.RUnlock()

				if aiContent != nil {
					// 从数据库加载历史消息（包含刚才保存的用户消息）
					historyMessages, err := LoadConversationHistoryFormat2(conversationID)
					if err != nil {
						fmt.Printf("加载历史消息失败：%v\n", err)
					} else {
						isFirstRound := len(historyMessages) == 1 && historyMessages[0].Role == "user"

						// 添加 AI 回复到消息列表（使用前端传来的 messageAssistantID）
						aiContentText := aiContent.Content
						if strings.TrimSpace(aiContentText) == "" {
							aiContentText = "当前内容为空，请重新生成。"
						}

						aiMessage := messageFormat{
							ID:               messageAssistantID,
							ConversationID:   conversationID,
							Role:             "assistant",
							Content:          "<model=" + model + ">" + aiContentText,
							ReasoningContent: aiContent.ReasoningContent,
							CreatedAt:        time.Now().Format("2006-01-02T15:04:05Z07:00"),
						}
						historyMessages = append(historyMessages, aiMessage)

						// 保存整个对话历史到数据库
						if err := SaveConversationHistoryFormat2(conversationID, historyMessages); err != nil {
							fmt.Printf("保存对话历史失败：%v\n", err)
						} else if isFirstRound {
							titleModel := GetConfig().DefaultDialogNamingModel
							title := generateConversationTitleByAI(ctx, titleModel, historyMessages[0].Content, aiContent.Content)
							if err := UpdateConversationTitleIfDefault(conversationID, title); err != nil {
								fmt.Printf("更新对话标题失败：%v\n", err)
							}
						}
					}
				}

				// 延迟清理缓存，给续流检查留出时间（5分钟后清理）
				go func() {
					time.Sleep(5 * time.Minute)
					MessageContentCacheMutex.Lock()
					delete(MessageContentCache, messageAssistantID)
					MessageContentCacheMutex.Unlock()
					fmt.Printf("[清理缓存] messageAssistantID=%d\n", messageAssistantID)
				}()

				close(resp)
				ThreadMutex.Lock()
				delete(ThreadRegistry, threadID)
				ThreadMutex.Unlock()
				ConversationIDMessageIDsMutex.Lock()
				delete(ConversationIDMessageIDs, conversationID)
				ConversationIDMessageIDsMutex.Unlock()
			}()

			Openai(ctx, conversationID, messageUserID, messageAssistantID, model, preparedPrompt, preparedBase64, reasoning, resp)
			return nil
		})

		if err != nil {
			// 如果任务排队失败，发送错误信息并清理资源
			jsonResp, _ := json.Marshal(Response{
				Success: false,
				Error:   fmt.Sprintf("failed to queue task: %v", err),
			})
			resp <- string(jsonResp)
			close(resp)
			ThreadMutex.Lock()
			delete(ThreadRegistry, threadID)
			ThreadMutex.Unlock()
			ConversationIDMessageIDsMutex.Lock()
			delete(ConversationIDMessageIDs, conversationID)
			ConversationIDMessageIDsMutex.Unlock()
		}
	}()

	return resp
}

type toolCallBufferItem struct {
	Name      string
	Arguments string
}

func appendToolCallArguments(buffer map[string]*toolCallBufferItem, toolCallID string, toolName string, argumentsChunk string) (string, bool) {
	item, exists := buffer[toolCallID]
	if !exists {
		item = &toolCallBufferItem{}
		buffer[toolCallID] = item
	}
	if strings.TrimSpace(toolName) != "" {
		item.Name = toolName
	}
	item.Arguments += argumentsChunk
	arguments := item.Arguments
	fmt.Printf("[tool_call] toolCallID=%s tool=%s chunk_len=%d total_len=%d valid_json=%v\n", toolCallID, item.Name, len(argumentsChunk), len(arguments), json.Valid([]byte(arguments)))
	if !json.Valid([]byte(arguments)) {
		return "", false
	}
	delete(buffer, toolCallID)
	return arguments, true
}

func buildFallbackSearchQuery(reasoning string, prompt string) string {
	reasoning = strings.TrimSpace(reasoning)
	prompt = strings.TrimSpace(stripBase64Block(prompt))

	query := prompt
	if reasoning != "" {
		lines := strings.FieldsFunc(reasoning, func(r rune) bool {
			return r == '\n' || r == '。' || r == '！' || r == '？'
		})
		for _, line := range lines {
			line = strings.TrimSpace(line)
			if line == "" {
				continue
			}
			if strings.Contains(line, "搜索") || strings.Contains(line, "query") || strings.Contains(line, "武器") {
				query = line
			}
		}
	}

	query = strings.TrimSpace(strings.Trim(query, "\"'：:，,。！？!?"))
	if query == "" {
		query = "请根据上下文搜索相关信息"
	}
	return query
}

func buildCurrentTimeSystemPrompt() string {
	now := time.Now()
	return fmt.Sprintf("当前时间是：%04d年%02d月%02d日 %02d:%02d。请基于这个时间理解和回答用户与日期、时间、今天、昨天、明天、本周等相关的问题。", now.Year(), now.Month(), now.Day(), now.Hour(), now.Minute())
}

func GenerateImage(ctx context.Context, req ImageGenerateRequest) (*ImageGenerateResponse, error) {
	config := GetConfig()
	model := strings.TrimSpace(req.Model)
	if model == "" {
		model = "gpt-image-2"
	}

	payload := ImageGenerateRequest{
		Model:   model,
		Prompt:  strings.TrimSpace(req.Prompt),
		N:       req.N,
		Size:    strings.TrimSpace(req.Size),
		Format:  strings.TrimSpace(req.Format),
		Quality: strings.TrimSpace(req.Quality),
	}
	if payload.Prompt == "" {
		return nil, fmt.Errorf("prompt 不能为空")
	}
	if payload.N <= 0 {
		payload.N = 1
	}
	if payload.Size == "" {
		payload.Size = "1024x1024"
	}
	if payload.Quality == "" {
		payload.Quality = "auto"
	}

	body, err := json.Marshal(payload)
	if err != nil {
		return nil, fmt.Errorf("序列化生图请求失败: %v", err)
	}

	request, err := http.NewRequestWithContext(ctx, http.MethodPost, strings.TrimRight(config.API, "/")+"/images/generations", bytes.NewReader(body))
	if err != nil {
		return nil, fmt.Errorf("创建生图请求失败: %v", err)
	}
	request.Header.Set("Content-Type", "application/json")
	request.Header.Set("Accept", "application/json")
	imageAPIKey := strings.TrimSpace(config.ImageAPIKey)
	if imageAPIKey == "" {
		imageAPIKey = strings.TrimSpace(config.APIKey)
	}
	if imageAPIKey != "" {
		request.Header.Set("Authorization", "Bearer "+imageAPIKey)
	}

	response, err := http.DefaultClient.Do(request)
	if err != nil {
		return nil, fmt.Errorf("调用生图接口失败: %v", err)
	}
	defer response.Body.Close()

	responseBody, err := io.ReadAll(response.Body)
	if err != nil {
		return nil, fmt.Errorf("读取生图响应失败: %v", err)
	}

	if response.StatusCode < 200 || response.StatusCode >= 300 {
		return nil, fmt.Errorf("生图接口返回异常状态(%d): %s", response.StatusCode, strings.TrimSpace(string(responseBody)))
	}

	var imageResp ImageGenerateResponse
	if err := json.Unmarshal(responseBody, &imageResp); err != nil {
		return nil, fmt.Errorf("解析生图响应失败: %v", err)
	}
	if len(imageResp.Data) == 0 {
		return nil, fmt.Errorf("生图结果为空")
	}
	return &imageResp, nil
}

func decodeDataURLBase64(data string) ([]byte, string, error) {
	trimmed := strings.TrimSpace(data)
	if trimmed == "" {
		return nil, "", fmt.Errorf("图片内容为空")
	}

	mimeType := "image/png"
	base64Payload := trimmed
	if strings.HasPrefix(trimmed, "data:") {
		parts := strings.SplitN(trimmed, ",", 2)
		if len(parts) != 2 {
			return nil, "", fmt.Errorf("无效的 data url")
		}
		header := parts[0]
		base64Payload = parts[1]
		if strings.HasPrefix(header, "data:") {
			mimePart := strings.TrimPrefix(header, "data:")
			mimePart = strings.TrimSuffix(mimePart, ";base64")
			if mimePart != "" {
				mimeType = mimePart
			}
		}
	}

	decoded, err := base64.StdEncoding.DecodeString(base64Payload)
	if err != nil {
		return nil, "", fmt.Errorf("base64 解码失败: %v", err)
	}
	return decoded, mimeType, nil
}

func fileExtensionFromMimeType(mimeType string) string {
	switch strings.ToLower(strings.TrimSpace(mimeType)) {
	case "image/png":
		return ".png"
	case "image/webp":
		return ".webp"
	case "image/jpeg", "image/jpg":
		return ".jpg"
	default:
		return ".png"
	}
}

func EditImage(ctx context.Context, req ImageEditRequest) (*ImageGenerateResponse, error) {
	config := GetConfig()
	model := strings.TrimSpace(req.Model)
	if model == "" {
		model = "gpt-image-2"
	}
	if strings.TrimSpace(req.Prompt) == "" {
		return nil, fmt.Errorf("prompt 不能为空")
	}
	if len(req.Images) == 0 {
		return nil, fmt.Errorf("至少需要一张待编辑图片")
	}

	var body bytes.Buffer
	writer := multipart.NewWriter(&body)
	for index, imageData := range req.Images {
		decoded, mimeType, err := decodeDataURLBase64(imageData)
		if err != nil {
			return nil, fmt.Errorf("解析第 %d 张图片失败: %v", index+1, err)
		}
		fieldWriter, err := writer.CreateFormFile("image", fmt.Sprintf("image_%d%s", index+1, fileExtensionFromMimeType(mimeType)))
		if err != nil {
			return nil, fmt.Errorf("创建图片字段失败: %v", err)
		}
		if _, err := fieldWriter.Write(decoded); err != nil {
			return nil, fmt.Errorf("写入图片字段失败: %v", err)
		}
	}

	if strings.TrimSpace(req.Mask) != "" {
		decoded, _, err := decodeDataURLBase64(req.Mask)
		if err != nil {
			return nil, fmt.Errorf("解析 mask 失败: %v", err)
		}
		fieldWriter, err := writer.CreateFormFile("mask", "mask.png")
		if err != nil {
			return nil, fmt.Errorf("创建 mask 字段失败: %v", err)
		}
		if _, err := fieldWriter.Write(decoded); err != nil {
			return nil, fmt.Errorf("写入 mask 字段失败: %v", err)
		}
	}

	_ = writer.WriteField("prompt", strings.TrimSpace(req.Prompt))
	_ = writer.WriteField("model", model)
	if req.N > 0 {
		_ = writer.WriteField("n", strconv.Itoa(req.N))
	}
	if strings.TrimSpace(req.Quality) != "" {
		_ = writer.WriteField("quality", strings.TrimSpace(req.Quality))
	}
	if strings.TrimSpace(req.Size) != "" {
		_ = writer.WriteField("size", strings.TrimSpace(req.Size))
	}
	if strings.TrimSpace(req.Background) != "" {
		_ = writer.WriteField("background", strings.TrimSpace(req.Background))
	}
	if err := writer.Close(); err != nil {
		return nil, fmt.Errorf("关闭 multipart writer 失败: %v", err)
	}

	request, err := http.NewRequestWithContext(ctx, http.MethodPost, strings.TrimRight(config.API, "/")+"/images/edits", &body)
	if err != nil {
		return nil, fmt.Errorf("创建编辑请求失败: %v", err)
	}
	request.Header.Set("Accept", "application/json")
	request.Header.Set("Content-Type", writer.FormDataContentType())
	imageAPIKey := strings.TrimSpace(config.ImageAPIKey)
	if imageAPIKey == "" {
		imageAPIKey = strings.TrimSpace(config.APIKey)
	}
	if imageAPIKey != "" {
		request.Header.Set("Authorization", "Bearer "+imageAPIKey)
	}

	response, err := http.DefaultClient.Do(request)
	if err != nil {
		return nil, fmt.Errorf("调用图片编辑接口失败: %v", err)
	}
	defer response.Body.Close()

	responseBody, err := io.ReadAll(response.Body)
	if err != nil {
		return nil, fmt.Errorf("读取图片编辑响应失败: %v", err)
	}
	if response.StatusCode < 200 || response.StatusCode >= 300 {
		return nil, fmt.Errorf("图片编辑接口返回异常状态(%d): %s", response.StatusCode, strings.TrimSpace(string(responseBody)))
	}

	var imageResp ImageGenerateResponse
	if err := json.Unmarshal(responseBody, &imageResp); err != nil {
		return nil, fmt.Errorf("解析图片编辑响应失败: %v", err)
	}
	if len(imageResp.Data) == 0 {
		return nil, fmt.Errorf("图片编辑结果为空")
	}
	return &imageResp, nil
}

func executeWebSearchTool(client *openai.Client, ctx context.Context, reqParams *openai.ChatCompletionRequest, stream *openai.ChatCompletionStream, messages []openai.ChatCompletionMessage, toolCall openai.ToolCall, query string, resp chan string) ([]openai.ChatCompletionMessage, *openai.ChatCompletionStream, error) {
	query = strings.TrimSpace(query)
	if query == "" {
		query = "请根据上下文搜索相关信息"
	}

	arguments := fmt.Sprintf(`{"query":%q}`, query)
	fmt.Printf("[tool_call] search start query=%q\n", query)
	searchResult, err := SimpleSearch(query)
	if err != nil {
		searchResult = fmt.Sprintf("搜索失败: %v", err)
	}
	fmt.Printf("[tool_call] search done query=%q result_len=%d err=%v\n", query, len(searchResult), err)

	messages = append(messages, openai.ChatCompletionMessage{
		Role: openai.ChatMessageRoleAssistant,
		ToolCalls: []openai.ToolCall{{
			ID:   toolCall.ID,
			Type: openai.ToolTypeFunction,
			Function: openai.FunctionCall{
				Name:      "web_search",
				Arguments: arguments,
			},
		}},
	})
	messages = append(messages, openai.ChatCompletionMessage{
		Role:       openai.ChatMessageRoleTool,
		Content:    searchResult,
		ToolCallID: toolCall.ID,
	})

	if stream != nil {
		stream.Close()
	}

	reqParams.Messages = messages
	newStream, err := client.CreateChatCompletionStream(ctx, *reqParams)
	if err != nil {
		jsonResp, _ := json.Marshal(Response{
			Success: false,
			Error:   fmt.Sprintf("重新创建流失败: %v", err),
		})
		resp <- string(jsonResp)
		return messages, nil, err
	}

	return messages, newStream, nil
}

func executeImageGenerateTool(client *openai.Client, ctx context.Context, reqParams *openai.ChatCompletionRequest, stream *openai.ChatCompletionStream, messages []openai.ChatCompletionMessage, toolCall openai.ToolCall, model string, prompt string, size string, quality string, resp chan string) ([]openai.ChatCompletionMessage, *openai.ChatCompletionStream, error) {
	prompt = strings.TrimSpace(prompt)
	if prompt == "" {
		return messages, stream, fmt.Errorf("image_generate prompt 不能为空")
	}

	imageResp, err := GenerateImage(ctx, ImageGenerateRequest{
		Model:   "gpt-image-2",
		Prompt:  prompt,
		N:       1,
		Size:    strings.TrimSpace(size),
		Quality: strings.TrimSpace(quality),
	})
	if err != nil {
		jsonResp, _ := json.Marshal(Response{Success: false, Error: fmt.Sprintf("图片生成失败: %v", err)})
		resp <- string(jsonResp)
		return messages, stream, err
	}

	imageBase64 := strings.TrimSpace(imageResp.Data[0].B64JSON)
	if imageBase64 == "" {
		return messages, stream, fmt.Errorf("图片生成结果为空")
	}
	imageDataURL := "data:image/png;base64," + imageBase64

	toolArguments := fmt.Sprintf(`{"prompt":%q,"size":%q,"quality":%q}`, prompt, size, quality)
	toolResult := fmt.Sprintf(`{"success":true,"model":"%s","prompt":%q,"base64":"%s"}`,
		model,
		prompt,
		imageDataURL,
	)

	messages = append(messages, openai.ChatCompletionMessage{
		Role: openai.ChatMessageRoleAssistant,
		ToolCalls: []openai.ToolCall{{
			ID:   toolCall.ID,
			Type: openai.ToolTypeFunction,
			Function: openai.FunctionCall{
				Name:      "image_generate",
				Arguments: toolArguments,
			},
		}},
	})
	messages = append(messages, openai.ChatCompletionMessage{
		Role:       openai.ChatMessageRoleTool,
		Content:    toolResult,
		ToolCallID: toolCall.ID,
	})

	if stream != nil {
		stream.Close()
	}

	reqParams.Messages = messages
	newStream, err := client.CreateChatCompletionStream(ctx, *reqParams)
	if err != nil {
		jsonResp, _ := json.Marshal(Response{Success: false, Error: fmt.Sprintf("重新创建流失败: %v", err)})
		resp <- string(jsonResp)
		return messages, nil, err
	}

	jsonResp, _ := json.Marshal(Response{Success: true, Content: prompt, Base64: imageDataURL})
	resp <- string(jsonResp)
	return messages, newStream, nil
}

func executeImageEditTool(client *openai.Client, ctx context.Context, reqParams *openai.ChatCompletionRequest, stream *openai.ChatCompletionStream, messages []openai.ChatCompletionMessage, toolCall openai.ToolCall, prompt string, sourceImage string, quality string, resp chan string) ([]openai.ChatCompletionMessage, *openai.ChatCompletionStream, error) {
	prompt = strings.TrimSpace(prompt)
	if prompt == "" {
		return messages, stream, fmt.Errorf("image_edit prompt 不能为空")
	}
	if strings.TrimSpace(sourceImage) == "" {
		return messages, stream, fmt.Errorf("image_edit 缺少源图片")
	}

	imageResp, err := EditImage(ctx, ImageEditRequest{
		Model:   "gpt-image-2",
		Prompt:  prompt,
		Images:  []string{sourceImage},
		N:       1,
		Quality: strings.TrimSpace(quality),
	})
	if err != nil {
		jsonResp, _ := json.Marshal(Response{Success: false, Error: fmt.Sprintf("图片编辑失败: %v", err)})
		resp <- string(jsonResp)
		return messages, stream, err
	}

	imageBase64 := strings.TrimSpace(imageResp.Data[0].B64JSON)
	if imageBase64 == "" {
		return messages, stream, fmt.Errorf("图片编辑结果为空")
	}
	imageDataURL := "data:image/png;base64," + imageBase64

	toolArguments := fmt.Sprintf(`{"prompt":%q,"quality":%q}`, prompt, quality)
	toolResult := fmt.Sprintf(`{"success":true,"prompt":%q,"base64":"%s"}`,
		prompt,
		imageDataURL,
	)

	messages = append(messages, openai.ChatCompletionMessage{
		Role: openai.ChatMessageRoleAssistant,
		ToolCalls: []openai.ToolCall{{
			ID:   toolCall.ID,
			Type: openai.ToolTypeFunction,
			Function: openai.FunctionCall{
				Name:      "image_edit",
				Arguments: toolArguments,
			},
		}},
	})
	messages = append(messages, openai.ChatCompletionMessage{
		Role:       openai.ChatMessageRoleTool,
		Content:    toolResult,
		ToolCallID: toolCall.ID,
	})

	if stream != nil {
		stream.Close()
	}

	reqParams.Messages = messages
	newStream, err := client.CreateChatCompletionStream(ctx, *reqParams)
	if err != nil {
		jsonResp, _ := json.Marshal(Response{Success: false, Error: fmt.Sprintf("重新创建流失败: %v", err)})
		resp <- string(jsonResp)
		return messages, nil, err
	}

	jsonResp, _ := json.Marshal(Response{Success: true, Content: prompt, Base64: imageDataURL})
	resp <- string(jsonResp)
	return messages, newStream, nil
}

// Openai 调用 OpenAI API 并流式返回结果，同时更新消息内容缓存
func Openai(ctx context.Context, conversationID int64, messageUserID int64, messageAssistantID int64, model string, prompt string, base64Image string, reasoning bool, resp chan string) {
	config := GetConfig()

	// 记录开始时间，用于空窗期超时检测
	startTime := time.Now()
	hasReceivedContent := false
	var contentMutex sync.Mutex

	// 启动超时检测 goroutine
	timeoutCtx, cancelTimeout := context.WithCancel(ctx)
	defer cancelTimeout()

	markModelResponded := func(reason string) {
		contentMutex.Lock()
		defer contentMutex.Unlock()
		if hasReceivedContent {
			return
		}
		hasReceivedContent = true
		cancelTimeout()
		fmt.Printf("[超时检测] conversationID=%d, 首次收到模型响应(%s)，取消超时检测\n", conversationID, reason)
	}

	go func() {
		select {
		case <-time.After(30 * time.Second):
			contentMutex.Lock()
			received := hasReceivedContent
			contentMutex.Unlock()

			if !received {
				elapsed := time.Since(startTime).Seconds()
				fmt.Printf("[超时检测] conversationID=%d, 30秒内未收到AI回复，已等待%.1f秒，断开连接\n", conversationID, elapsed)

				// 发送超时错误消息
				jsonResp, _ := json.Marshal(Response{
					Success: false,
					Error:   "响应超时，请稍后重试",
				})
				select {
				case resp <- string(jsonResp):
				default:
					// 通道可能已关闭，忽略错误
				}
				return
			}
		case <-timeoutCtx.Done():
			// 超时检测被取消（已收到内容）
			return
		}
	}()

	// 创建 OpenAI 客户端配置
	c := openai.DefaultConfig(config.APIKey)
	c.BaseURL = config.API

	// 创建客户端
	client := openai.NewClientWithConfig(c)

	// 构建消息历史
	messages, err := LoadConversationHistory(conversationID)
	if err != nil {
		jsonResp, _ := json.Marshal(Response{
			Success: false,
			Error:   fmt.Sprintf("failed to load conversation history: %v", err),
		})
		resp <- string(jsonResp)
		return
	}

	messages = append([]openai.ChatCompletionMessage{{
		Role:    openai.ChatMessageRoleSystem,
		Content: buildCurrentTimeSystemPrompt(),
	}}, messages...)

	originalBase64 := extractBase64Block(prompt)
	if originalBase64 == "" {
		originalBase64 = base64Image
	}
	preparedPrompt := stripBase64Block(prompt)
	preparedBase64 := originalBase64
	if originalBase64 != "" && !strings.Contains(prompt, "<base64>") {
		prompt = strings.TrimSpace(prompt) + "<base64>" + originalBase64 + "</base64>"
	}
	if strings.TrimSpace(preparedBase64) != "" {
		capability := getModelImageCapability(model)
		if capability != 1 && capability != 3 {
			preparedBase64 = ""
		}
	}

	// 添加当前用户消息
	if preparedBase64 != "" {
		// 带图片的消息
		messages = append(messages, openai.ChatCompletionMessage{
			Role: openai.ChatMessageRoleUser,
			MultiContent: []openai.ChatMessagePart{
				{
					Type: openai.ChatMessagePartTypeText,
					Text: preparedPrompt,
				},
				{
					Type: openai.ChatMessagePartTypeImageURL,
					ImageURL: &openai.ChatMessageImageURL{
						URL: preparedBase64,
					},
				},
			},
		})
	} else {
		// 纯文本消息
		messages = append(messages, openai.ChatCompletionMessage{
			Role:    openai.ChatMessageRoleUser,
			Content: preparedPrompt,
		})
	}

	// 检查模型是否支持工具调用
	var tools []openai.Tool
	supportsTools := false
	for _, m := range config.Models {
		if m.ID == model && m.Tool == 1 {
			supportsTools = true
			break
		}
	}

	// 如果支持工具，添加工具
	if supportsTools {
		tools = []openai.Tool{
			{
				Type: openai.ToolTypeFunction,
				Function: &openai.FunctionDefinition{
					Name:        "web_search",
					Description: "搜索互联网获取实时信息。当用户询问最新资讯、实时数据、当前事件或需要联网查询的问题时使用此工具。",
					Parameters: map[string]interface{}{
						"type": "object",
						"properties": map[string]interface{}{
							"query": map[string]interface{}{
								"type":        "string",
								"description": "搜索关键词或问题",
							},
						},
						"required": []string{"query"},
					},
				},
			},
			{
				Type: openai.ToolTypeFunction,
				Function: &openai.FunctionDefinition{
					Name:        "image_generate",
					Description: "根据用户描述生成图片。当用户明确要求画图、生图、生成海报、插画、配图、封面图时使用。",
					Parameters: map[string]interface{}{
						"type": "object",
						"properties": map[string]interface{}{
							"prompt": map[string]interface{}{
								"type":        "string",
								"description": "图片生成提示词",
							},
							"size": map[string]interface{}{
								"type":        "string",
								"description": "图片尺寸，例如 1024x1024",
							},
							"quality": map[string]interface{}{
								"type":        "string",
								"description": "图片质量，例如 auto / high",
							},
						},
						"required": []string{"prompt"},
					},
				},
			},
			{
				Type: openai.ToolTypeFunction,
				Function: &openai.FunctionDefinition{
					Name:        "image_edit",
					Description: "根据当前对话里最近一张用户图片进行编辑。当用户要求改图、重绘、换背景、修图、局部调整时使用。",
					Parameters: map[string]interface{}{
						"type": "object",
						"properties": map[string]interface{}{
							"prompt": map[string]interface{}{
								"type":        "string",
								"description": "图片编辑提示词",
							},
							"quality": map[string]interface{}{
								"type":        "string",
								"description": "图片质量，例如 auto / high",
							},
						},
						"required": []string{"prompt"},
					},
				},
			},
		}
	}

	// 创建流式请求
	reqParams := openai.ChatCompletionRequest{
		Model:    model,
		Messages: messages,
		Stream:   true,
	}
	if supportsTools {
		reqParams.Tools = tools
	}

	stream, err := client.CreateChatCompletionStream(ctx, reqParams)
	if err != nil {
		jsonResp, _ := json.Marshal(Response{
			Success: false,
			Error:   fmt.Sprintf("failed to create chat completion stream: %v", err),
		})
		resp <- string(jsonResp)
		return
	}
	defer stream.Close()

	// 流式工具调用参数缓冲
	toolCallArgumentsBuffer := make(map[string]*toolCallBufferItem)

	// 流式读取响应
	for {
		select {
		case <-ctx.Done():
			return
		default:
			response, err := stream.Recv()
			if errors.Is(err, io.EOF) {
				return
			}
			if err != nil {
				jsonResp, _ := json.Marshal(Response{
					Success: false,
					Error:   fmt.Sprintf("stream receive error: %v", err),
				})
				resp <- string(jsonResp)
				return
			}

			if len(response.Choices) > 0 {
				delta := response.Choices[0].Delta
				finishReason := response.Choices[0].FinishReason

				// 先处理工具调用，避免 reasoning 模型在同一帧携带 finish_reason=tool_calls 时缓冲区尚未写入
				if len(delta.ToolCalls) > 0 {
					markModelResponded("tool_calls")
					for _, toolCall := range delta.ToolCalls {
						toolName := toolCall.Function.Name
						if toolName != "web_search" && toolName != "image_generate" && toolName != "image_edit" {
							continue
						}

						fmt.Printf("[tool_call] received name=%s id=%s raw_chunk=%q\n", toolName, toolCall.ID, toolCall.Function.Arguments)
						arguments, ok := appendToolCallArguments(toolCallArgumentsBuffer, toolCall.ID, toolName, toolCall.Function.Arguments)
						if !ok {
							continue
						}

						fmt.Printf("[tool_call] complete id=%s arguments=%s\n", toolCall.ID, arguments)

						switch toolName {
						case "web_search":
							var params struct {
								Query string `json:"query"`
							}
							if err := json.Unmarshal([]byte(arguments), &params); err != nil {
								fmt.Printf("解析工具调用参数失败: %v\n", err)
								continue
							}

							query := strings.TrimSpace(params.Query)
							if query == "" {
								MessageContentCacheMutex.RLock()
								reasoningText := ""
								if cachedContent, exists := MessageContentCache[messageAssistantID]; exists {
									reasoningText = cachedContent.ReasoningContent
								}
								MessageContentCacheMutex.RUnlock()
								query = buildFallbackSearchQuery(reasoningText, prompt)
								fmt.Printf("[tool_call] empty query fallback id=%s query=%q\n", toolCall.ID, query)
							}

							var execErr error
							messages, stream, execErr = executeWebSearchTool(client, ctx, &reqParams, stream, messages, toolCall, query, resp)
							if execErr != nil {
								return
							}
						case "image_generate":
							var params struct {
								Prompt  string `json:"prompt"`
								Size    string `json:"size"`
								Quality string `json:"quality"`
							}
							if err := json.Unmarshal([]byte(arguments), &params); err != nil {
								fmt.Printf("解析 image_generate 参数失败: %v\n", err)
								continue
							}

							var execErr error
							messages, stream, execErr = executeImageGenerateTool(client, ctx, &reqParams, stream, messages, toolCall, model, params.Prompt, params.Size, params.Quality, resp)
							if execErr != nil {
								return
							}
						case "image_edit":
							var params struct {
								Prompt  string `json:"prompt"`
								Quality string `json:"quality"`
							}
							if err := json.Unmarshal([]byte(arguments), &params); err != nil {
								fmt.Printf("解析 image_edit 参数失败: %v\n", err)
								continue
							}

							historyMessages, historyErr := LoadConversationHistoryFormat2(conversationID)
							if historyErr != nil {
								jsonResp, _ := json.Marshal(Response{Success: false, Error: fmt.Sprintf("加载图片编辑历史失败: %v", historyErr)})
								resp <- string(jsonResp)
								return
							}

							sourceImage := ""
							for i := len(historyMessages) - 1; i >= 0; i-- {
								if historyMessages[i].Role == "user" && strings.TrimSpace(historyMessages[i].Base64) != "" {
									sourceImage = historyMessages[i].Base64
									break
								}
							}

							var execErr error
							messages, stream, execErr = executeImageEditTool(client, ctx, &reqParams, stream, messages, toolCall, params.Prompt, sourceImage, params.Quality, resp)
							if execErr != nil {
								return
							}
						}
						continue
					}
				}

				if finishReason != "" {
					fmt.Printf("[stream] finish_reason=%s conversationID=%d messageAssistantID=%d\n", finishReason, conversationID, messageAssistantID)
					if finishReason == "tool_calls" {
						markModelResponded("finish_reason_tool_calls")
						fmt.Printf("[stream] tool_calls finished but pending_buffers=%d buffers=%v\n", len(toolCallArgumentsBuffer), toolCallArgumentsBuffer)

						for toolCallID, item := range toolCallArgumentsBuffer {
							if item == nil {
								continue
							}
							if strings.TrimSpace(item.Arguments) != "" {
								continue
							}

							switch item.Name {
							case "web_search":
								MessageContentCacheMutex.RLock()
								reasoningText := ""
								if cachedContent, exists := MessageContentCache[messageAssistantID]; exists {
									reasoningText = cachedContent.ReasoningContent
								}
								MessageContentCacheMutex.RUnlock()

								fallbackQuery := buildFallbackSearchQuery(reasoningText, prompt)
								fmt.Printf("[tool_call_fallback] tool=%s id=%s query=%q\n", item.Name, toolCallID, fallbackQuery)

								var execErr error
								messages, stream, execErr = executeWebSearchTool(client, ctx, &reqParams, stream, messages, openai.ToolCall{
									ID:   toolCallID,
									Type: openai.ToolTypeFunction,
									Function: openai.FunctionCall{
										Name: "web_search",
									},
								}, fallbackQuery, resp)
								if execErr != nil {
									return
								}
							case "image_generate":
								fallbackPrompt := strings.TrimSpace(stripBase64Block(prompt))
								fmt.Printf("[tool_call_fallback] tool=%s id=%s prompt=%q\n", item.Name, toolCallID, fallbackPrompt)

								var execErr error
								messages, stream, execErr = executeImageGenerateTool(client, ctx, &reqParams, stream, messages, openai.ToolCall{
									ID:   toolCallID,
									Type: openai.ToolTypeFunction,
									Function: openai.FunctionCall{
										Name: "image_generate",
									},
								}, model, fallbackPrompt, "1024x1024", "auto", resp)
								if execErr != nil {
									return
								}
							case "image_edit":
								fallbackPrompt := strings.TrimSpace(stripBase64Block(prompt))
								historyMessages, historyErr := LoadConversationHistoryFormat2(conversationID)
								if historyErr != nil {
									jsonResp, _ := json.Marshal(Response{Success: false, Error: fmt.Sprintf("加载图片编辑历史失败: %v", historyErr)})
									resp <- string(jsonResp)
									return
								}
								sourceImage := ""
								for i := len(historyMessages) - 1; i >= 0; i-- {
									if historyMessages[i].Role == "user" && strings.TrimSpace(historyMessages[i].Base64) != "" {
										sourceImage = historyMessages[i].Base64
										break
									}
								}
								fmt.Printf("[tool_call_fallback] tool=%s id=%s prompt=%q hasSource=%v\n", item.Name, toolCallID, fallbackPrompt, strings.TrimSpace(sourceImage) != "")

								var execErr error
								messages, stream, execErr = executeImageEditTool(client, ctx, &reqParams, stream, messages, openai.ToolCall{
									ID:   toolCallID,
									Type: openai.ToolTypeFunction,
									Function: openai.FunctionCall{
										Name: "image_edit",
									},
								}, fallbackPrompt, sourceImage, "auto", resp)
								if execErr != nil {
									return
								}
							default:
								fmt.Printf("[tool_call_fallback] skip unknown tool id=%s name=%s\n", toolCallID, item.Name)
							}
							delete(toolCallArgumentsBuffer, toolCallID)
							break
						}
					}
				}

				// 更新缓存：推理内容
				if delta.ReasoningContent != "" {
					markModelResponded("reasoning_content")

					MessageContentCacheMutex.Lock()
					if content, exists := MessageContentCache[messageAssistantID]; exists {
						content.ReasoningContent += delta.ReasoningContent
					}
					MessageContentCacheMutex.Unlock()

					jsonResp, _ := json.Marshal(Response{
						Success:          true,
						Content:          "",
						ReasoningContent: delta.ReasoningContent,
						Error:            "",
					})
					resp <- string(jsonResp)
				}

				// 更新缓存：普通内容
				if delta.Content != "" {
					markModelResponded("content")

					contentDelta := delta.Content
					MessageContentCacheMutex.Lock()
					if content, exists := MessageContentCache[messageAssistantID]; exists {
						if content.Content == "" {
							contentDelta = "<model=" + model + ">" + contentDelta
						}
						content.Content += delta.Content
					}
					MessageContentCacheMutex.Unlock()

					// 写入响应通道（JSON 格式）
					jsonResp, _ := json.Marshal(Response{
						Success:          true,
						Content:          contentDelta,
						ReasoningContent: "",
						Error:            "",
					})
					resp <- string(jsonResp)
				}
			}
		}
	}
}

// GetMessageContent 获取缓存的消息内容
func GetMessageContent(messageAssistantID int64) *MessageContent {
	MessageContentCacheMutex.RLock()
	defer MessageContentCacheMutex.RUnlock()

	if content, exists := MessageContentCache[messageAssistantID]; exists {
		return content
	}
	return nil
}

// DeleteMessageContent 删除缓存的消息内容
func DeleteMessageContent(messageAssistantID int64) {
	MessageContentCacheMutex.Lock()
	defer MessageContentCacheMutex.Unlock()

	delete(MessageContentCache, messageAssistantID)
}

// UpdateMessageContent 更新缓存中的消息内容，累加而不是覆盖
// @param messageAssistantID 消息 assistant ID
// @param reasoningContent 推理内容增量
// @param content 普通内容增量
// @param reasoningTime 推理时间（秒）
func UpdateMessageContent(messageAssistantID int64, reasoningContent string, content string, reasoningTime int) {
	MessageContentCacheMutex.Lock()
	defer MessageContentCacheMutex.Unlock()

	if msgContent, exists := MessageContentCache[messageAssistantID]; exists {
		// 累加推理内容
		if reasoningContent != "" {
			msgContent.ReasoningContent += reasoningContent
		}
		// 累加普通内容
		if content != "" {
			msgContent.Content += content
		}
		// 累加推理时间
		if reasoningTime > 0 {
			msgContent.ReasoningTime += reasoningTime
		}
	}
}

// GetMessageWithUser 从数据库获取消息及其所属用户 ID
// @param messageID 消息 ID
// @return *Message 消息对象，int64 用户 ID，error 错误信息
func GetMessageWithUser(messageID int64) (*Message, int64, error) {
	db := GetDB()
	var message Message
	result := db.Table("messages").Where("id = ?", messageID).First(&message)
	if result.Error != nil {
		return nil, 0, result.Error
	}

	// 通过 conversation_id 查询所属用户
	var conversation Conversation
	result = db.Table("conversations").Where("id = ?", message.ConversationID).First(&conversation)
	if result.Error != nil {
		return nil, 0, result.Error
	}

	return &message, conversation.UserID, nil
}

// ClearMessageContent 清除缓存的消息内容
// 当生成完成时调用此函数清理缓存
// @param messageAssistantID 消息 assistant ID
func ClearMessageContent(messageAssistantID int64) {
	MessageContentCacheMutex.Lock()
	defer MessageContentCacheMutex.Unlock()

	delete(MessageContentCache, messageAssistantID)
}

// Response OpenAI API 响应结构
type Response struct {
	Success          bool   `json:"success"`
	Content          string `json:"content"`
	ReasoningContent string `json:"reasoningContent"`
	Error            string `json:"error"`
	Base64           string `json:"base64,omitempty"`
}

// ParseThinkBlock 解析推理内容，返回推理时间和推理内容
// @param reasoningContent 推理内容字符串
// @return int 推理时间（秒），string 推理内容，error 错误信息
func ParseThinkBlock(reasoningContent string) (int, string, error) {
	// 如果推理内容为空，直接返回
	if reasoningContent == "" {
		return 0, "", nil
	}

	// 尝试解析推理时间（假设格式为 "思考了 X 秒" 或类似格式）
	// 这里简单处理，返回 0 和原始内容
	// 实际项目中可能需要根据具体格式进行解析
	return 0, reasoningContent, nil
}

// KillThread 停止指定 threadID 的线程
// @param threadID 线程 ID
// @return bool 是否成功停止
func KillThread(threadID string) bool {
	ThreadMutex.RLock()
	info, exists := ThreadRegistry[threadID]
	ThreadMutex.RUnlock()

	if !exists {
		return false
	}

	// 调用取消函数
	info.Cancel()
	return true
}

// GetThreadList 获取指定用户的线程列表
// @param userID 用户 ID
// @return []gin.H 线程列表，error 错误信息
func GetThreadList(userID int64) ([]gin.H, error) {
	// 获取用户的所有对话
	db := GetDB()
	var conversations []Conversation
	result := db.Table("conversations").Where("user_id = ?", userID).Order("updated_at DESC").Find(&conversations)
	if result.Error != nil {
		return nil, result.Error
	}

	// 构建返回结果
	var list []gin.H
	for _, conversation := range conversations {
		list = append(list, gin.H{
			"conversationID": strconv.FormatInt(conversation.ID, 10),
			"title":          conversation.Title,
			"summary":        conversation.Summary,
			"createdAt":      conversation.CreatedAt.Format(time.RFC3339),
			"updatedAt":      conversation.UpdatedAt.Format(time.RFC3339),
		})
	}

	return list, nil
}

// TTS 文字转语音
// @param text 要转换的文本
// @return string 语音数据的 base64 编码
func TTS(text string) string {
	// TODO: 实现文字转语音功能
	// 这里返回空字符串作为占位符
	return ""
}

// STT 语音转文字
// @param base64Audio 语音数据的 base64 编码
// @return string 转换后的文本
func STT(base64Audio string) string {
	// TODO: 实现语音转文字功能
	// 这里返回空字符串作为占位符
	return ""
}
