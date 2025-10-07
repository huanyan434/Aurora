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
	"os"
	"regexp"
	"strconv"
	"strings"
	"sync"
	"time"

	"github.com/golang-queue/queue"
	"github.com/sashabaranov/go-openai"
)

// --- 全局线程管理 ---

// ThreadInfo 存储线程相关的全部信息
type ThreadInfo struct {
	Cancel context.CancelFunc
	Resp   chan string
}

// 全局线程ID列表和相关管理结构
var (
	// 使用一个map来存储所有线程信息，保证数据一致性
	threadRegistry = make(map[string]ThreadInfo)
	threadMutex    sync.RWMutex

	// 使用队列处理并发请求
	taskQueue *queue.Queue
)

// 初始化队列
func init() {
	taskQueue = queue.NewPool(100) // 同时处理100个并发请求
}

// --- 核心功能：并发处理 OpenAI 请求 ---

// ThreadOpenai 使用并发处理OpenAI请求，返回一个通道以实现类似Python yield的功能
func ThreadOpenai(conversationID int64, messageUserID int64, messageAssistantID int64, model string, prompt string, base64 string, reasoning bool) <-chan string {
	threadID := strconv.FormatInt(conversationID, 10)

	// 1. 检查线程是否已存在
	threadMutex.RLock()
	info, exists := threadRegistry[threadID]
	threadMutex.RUnlock()

	// 如果线程已存在，直接返回已存在的通道
	if exists {
		// 确保返回的通道没有被关闭
		// 这是一个简单的检查，更严谨地实现需要额外的状态字段
		// 但基于当前的defer close逻辑，我们相信如果存在，它应该仍在使用中。
		return info.Resp
	}

	// 2. 创建新的响应通道和上下文
	resp := make(chan string, 100) // 缓冲通道提高性能
	_, cancel := context.WithCancel(context.Background())

	// 3. 注册新线程
	threadMutex.Lock()
	threadRegistry[threadID] = ThreadInfo{
		Cancel: cancel,
		Resp:   resp,
	}
	threadMutex.Unlock()

	// 4. 提交任务到队列中执行
	// 使用 QueueTask 方法来安排任务
	conversationIDCopy := conversationID // 创建副本以在闭包中使用

	go func() {
		err := taskQueue.QueueTask(func(ctx context.Context) error {
			// 确保在函数退出时清理资源
			defer func() {
				close(resp)
				threadMutex.Lock()
				delete(threadRegistry, threadID)
				threadMutex.Unlock()
			}()

			Openai(ctx, conversationIDCopy, messageUserID, messageAssistantID, model, prompt, base64, reasoning, resp)
			return nil
		})

		if err != nil {
			// 如果任务排队失败，发送错误信息并清理资源
			resp <- fmt.Sprintf("ERROR: failed to queue task: %v", err)
			close(resp)
			threadMutex.Lock()
			delete(threadRegistry, threadID)
			threadMutex.Unlock()
		}
	}()

	return resp
}

type Response struct {
	Success          bool   `json:"success" default:"false"`
	Error            string `json:"error" default:""`
	ReasoningContent string `json:"reasoningContent" default:""`
	Content          string `json:"content" default:""`
}

func Openai(ctx context.Context, conversationID int64, messageUserID int64, messageAssistantID int64, model string, prompt string, base64 string, reasoning bool, resp chan<- string) {
	var responseByte []byte
	configs := GetConfig()
	// 判断模型信息
	modelSupport := false
	visionSupport := false
	var modelReasoning string
	for _, m := range configs.Models {
		if m.ID == model {
			modelSupport = true
			modelReasoning = m.Reasoning
			if m.Image == 1 {
				visionSupport = true
			}
		}
	}
	if modelSupport == false {
		responseByte, _ = json.Marshal(Response{Success: false, Error: fmt.Sprintf("ERROR: model not supported:%s", model)})
		resp <- string(responseByte)
		return
	}
	if reasoning == true {
		if modelReasoning == "" {
			responseByte, _ = json.Marshal(Response{Success: false, Error: fmt.Sprintf("ERROR: model does not support reasoning:%s", model)})
			resp <- string(responseByte)
			return
		} else if modelReasoning != model {
			model = modelReasoning
		}
	}

	// 处理messages
	messages, err := LoadConversationHistoryFormat2(conversationID)
	if err != nil {
		responseByte, _ = json.Marshal(Response{Success: false, Error: fmt.Sprintf("ERROR:%s", err)})
		resp <- string(responseByte)
	}
	messagesCopy, err := LoadConversationHistory(conversationID)
	if err != nil {
		responseByte, _ = json.Marshal(Response{Success: false, Error: fmt.Sprintf("ERROR:%s", err)})
		resp <- string(responseByte)
	}
	for _, m := range messagesCopy {
		if m.Role == "assistant" {
			_, m.Content = ParseModelBlock(m.Content)
			_, m.ReasoningContent, _ = ParseThinkBlock(m.Content)
		}
		if m.Role == "user" {
			_, m.Content = ParseBase64Block(m.Content)
		}
	}

	if base64 != "" {
		messages = append(messages, messageFormat{
			ID:      messageUserID,
			Role:    "user",
			Content: fmt.Sprintf("<base64>%s</base64>", base64) + prompt,
		})
	} else {
		messages = append(messages, messageFormat{
			ID:      messageUserID,
			Role:    "user",
			Content: prompt,
		})
	}
	err = SaveConversationHistoryFormat2(conversationID, messages)
	if err != nil {
		responseByte, _ = json.Marshal(Response{Success: false, Error: fmt.Sprintf("ERROR:%s", err)})
		resp <- string(responseByte)
	}

	// 处理base64，创建client
	promptWrapper := openai.ChatCompletionMessage{
		Role:    "user",
		Content: prompt,
	}
	if base64 != "" {
		if visionSupport == true {
			promptWrapper = openai.ChatCompletionMessage{
				Role:    "user",
				Content: prompt,
				MultiContent: []openai.ChatMessagePart{
					{
						Type: "image_url",
						ImageURL: &openai.ChatMessageImageURL{
							URL: base64,
						},
					},
				},
			}
		} else {
			promptWrapper = openai.ChatCompletionMessage{
				Role:    "user",
				Content: prompt + "\n\n" + ScanPicture(base64, prompt),
			}
		}
	}

	clientConfig := openai.DefaultConfig(configs.APIKey)
	clientConfig.BaseURL = configs.API
	client := openai.NewClientWithConfig(clientConfig)
	date := time.Now().Format(time.DateOnly)
	timeOnly := time.Now().Format(time.TimeOnly)
	req := openai.ChatCompletionRequest{
		Model: model,
		Messages: append(
			append(messagesCopy, openai.ChatCompletionMessage{
				Role: "system",
				Content: "今天是 " + date + "。" + "\n" +
					"现在是 " + timeOnly + "。",
			}),
			promptWrapper),
		Stream: true,
	}

	// 创建流式响应
	stream, err := client.CreateChatCompletionStream(ctx, req)
	if err != nil {
		// 发送错误信息到通道，并确保格式清晰
		responseByte, _ = json.Marshal(Response{Success: false, Error: fmt.Sprintf("ERROR: failed to create stream: %v", err)})
		resp <- string(responseByte)
		// 返回 nil 表示 Job 执行完成，避免 go-queue 再次尝试
		return
	}

	// 确保流式连接关闭
	defer func() {
		if err := stream.Close(); err != nil {
			// 避免 panic，改为记录错误或发送到通道
			responseByte, _ = json.Marshal(Response{Success: false, Error: fmt.Sprintf("ERROR: failed to close stream: %v", err)})
			resp <- string(responseByte)
		}
	}()

	var reasoningContent, content string
	timeO := time.Now().Unix()
	usedTime := strconv.Itoa(int(time.Now().Unix() - timeO))

	defer func() {
		messages, _ = LoadConversationHistoryFormat2(conversationID)
		if reasoningContent != "" {
			messages = append(messages, messageFormat{
				ID:               messageAssistantID,
				Role:             "assistant",
				Content:          fmt.Sprintf("<model=%s>", model) + content,
				ReasoningContent: fmt.Sprintf("<think time=%s>%s</think>", usedTime, reasoningContent),
			})
		} else {
			messages = append(messages, messageFormat{
				ID:               messageAssistantID,
				Role:             "assistant",
				Content:          fmt.Sprintf("<model=%s>", model) + content,
				ReasoningContent: "",
			})
		}
		if err := SaveConversationHistoryFormat2(conversationID, messages); err != nil {
			fmt.Printf("ERROR:%v\n", err)
		}
		var conversation Conversation
		GetDB().Table("conversations").Where("id = ?", conversationID).First(&conversation)
		// 如果对话标题为"新对话"
		if conversation.Title == "新对话" {
			configs := GetConfig()
			clientConfig := openai.DefaultConfig(configs.APIKey2)
			clientConfig.BaseURL = configs.API2
			client := openai.NewClientWithConfig(clientConfig)
			messages, _ := LoadConversationHistory(conversationID)
			messages = append(messages, openai.ChatCompletionMessage{
				Role:    "user",
				Content: "请总结概括对话内容，生成一个对话标题，不超过15字，不要使用 Emoji 和 Konomoji，不要使用 markdown，不要输出其他内容，仅需对话标题内容，不需前缀。",
			})
			req := openai.ChatCompletionRequest{
				Model:    configs.DefaultDialogNamingModel,
				Messages: messages,
			}
			title, err := client.CreateChatCompletion(ctx, req)
			if err != nil {
				fmt.Println("Error:", err)
			}

			_ = RenameConversation(conversationID, title.Choices[0].Message.Content)
		}
	}()

	for {
		select {
		case <-ctx.Done():
			return
		default:
			response, err := stream.Recv()
			if err != nil {
				if errors.Is(err, context.Canceled) {
					return
				}
				if err == io.EOF {
					return
				}
				responseByte, _ = json.Marshal(Response{Success: false, Error: fmt.Sprintf("ERROR:%v", err)})
				resp <- string(responseByte)
				return
			}

			if len(response.Choices) > 0 {
				if reasoning := response.Choices[0].Delta.ReasoningContent; reasoning != "" {
					reasoningContent += reasoning
					usedTime = strconv.Itoa(int(time.Now().Unix() - timeO))
					responseByte, _ = json.Marshal(Response{
						Success:          true,
						ReasoningContent: fmt.Sprintf("<think time=%s>%s</think>", usedTime, reasoning),
					})
					resp <- string(responseByte)
				}

				if contentDelta := response.Choices[0].Delta.Content; contentDelta != "" {
					content += contentDelta
					responseByte, _ = json.Marshal(Response{
						Success: true,
						Content: contentDelta,
					})
					resp <- string(responseByte)
				}
			}
		}
	}
}

// ScanPicture 视图
func ScanPicture(base64 string, prompt string) string {
	configs := GetConfig()
	clientConfig := openai.DefaultConfig(configs.APIKey2)
	clientConfig.BaseURL = configs.API2
	client := openai.NewClientWithConfig(clientConfig)
	req := openai.ChatCompletionRequest{
		Model: configs.DefaultVisualModel,
		Messages: []openai.ChatCompletionMessage{
			{
				Role: "user",
				MultiContent: []openai.ChatMessagePart{
					{
						Type: "text",
						Text: "请简要描述输入图片的内容，优先描述图片上的文字，其次概括图片内容。你的描述会作为提示词给另一个不支持视觉模型进行理解。请根据用户输入来更好地描述图片，以下是用户的输入：" + prompt,
					},
					{
						Type: "image_url",
						// ImageURL: &openai.ChatMessageImageURL{URL: fmt.Sprintf("data:image/jpeg;base64,%s", base64)},
						ImageURL: &openai.ChatMessageImageURL{URL: base64},
					},
				},
			},
		},
	}
	resp, err := client.CreateChatCompletion(context.Background(), req)
	if err != nil {
		return fmt.Sprintf("识图失败：%s", err)
	}
	return "用户上传了一张图片，以下是一个视觉模型对图片的描述：" + resp.Choices[0].Message.Content
}

// KillThread 终止指定ID的线程
func KillThread(threadID string) bool {
	threadMutex.RLock()
	info, exists := threadRegistry[threadID]
	threadMutex.RUnlock()

	if exists {
		info.Cancel()
		return true
	}
	return false
}

// ParseThinkBlock 解析思考内容
func ParseThinkBlock(c string) (int, string, string) {
	if c == "" {
		return 0, "", ""
	}
	re := regexp.MustCompile(`<think time=(\d+)>(.*?)</think>`)
	matches := re.FindStringSubmatch(c)
	if len(matches) < 3 {
		return 0, "", c
	}
	// 提取各部分
	timeStr := matches[1]
	timeInt, err := strconv.Atoi(timeStr)
	if err != nil {
		return 0, "", c
	}
	inner := matches[2]

	// 计算外部部分（标签之外的内容）
	outer := re.ReplaceAllString(c, "")
	return timeInt, inner, outer
}

// ParseModelBlock 解析模型标签
func ParseModelBlock(c string) (string, string) {
	if c == "" {
		return "", ""
	}
	re := regexp.MustCompile(`<model=([^>]+)>(.*?)`)

	matches := re.FindStringSubmatch(c)
	if len(matches) < 3 {
		return "", c
	}

	return matches[1], matches[2]
}

// ParseBase64Block 解析图片标签
func ParseBase64Block(c string) (string, string) {
	if c == "" {
		return "", ""
	}
	re := regexp.MustCompile(`<base64>(.*?)</base64>(.*)`)

	matches := re.FindStringSubmatch(c)
	if len(matches) < 3 {
		return "", c
	}

	return matches[1], matches[2]
}

// GetThreadList 获取用户正在进行中的对话线程ID列表
func GetThreadList(userID int64) ([]string, error) {
	var conversations []Conversation
	result := GetDB().Where("user_id = ?", userID).Find(&conversations)
	if result.Error != nil {
		return nil, result.Error
	}

	var conversationIDs []string
	threadMutex.RLock()
	for _, conv := range conversations {
		convID := strconv.FormatInt(conv.ID, 10)
		if _, exists := threadRegistry[convID]; exists {
			conversationIDs = append(conversationIDs, convID)
		}
	}
	threadMutex.RUnlock()

	return conversationIDs, nil
}

func TTS(prompt string) []byte {
	configs := GetConfig()
	url := fmt.Sprint(configs.API, "/chat/completions")
	method := "POST"

	payload := strings.NewReader(fmt.Sprintf(`{
      "model": "%s",
      "modalities": ["text", "audio"],
      "audio": { "voice": "alloy", "format": "opus" },
      "messages": [
        {
          "role": "user",
          "content": "请复述以下内容：%s"
        }
      ]
    }`, configs.ModelTTS, prompt))

	client := &http.Client{}
	req, err := http.NewRequest(method, url, payload)

	if err != nil {
		fmt.Println(err)
		return []byte{}
	}
	req.Header.Add("Authorization", fmt.Sprint("Bearer ", configs.APIKey))
	req.Header.Add("Content-Type", "application/json")

	res, err := client.Do(req)
	if err != nil {
		fmt.Println(err)
		return []byte{}
	}
	defer res.Body.Close()

	body, err := io.ReadAll(res.Body)
	if err != nil {
		fmt.Println(err)
		return []byte{}
	}
	var data map[string]interface{}
	err = json.Unmarshal(body, &data)
	if err != nil {
		fmt.Println(err)
		return []byte{}
	}
	choicesByte, _ := json.Marshal(data["choices"])
	var choices []map[string]interface{}
	err = json.Unmarshal(choicesByte, &choices)
	if err != nil {
		fmt.Println(err)
		return []byte{}
	}
	messageByte, _ := json.Marshal(choices[0]["message"])
	var message map[string]interface{}
	err = json.Unmarshal(messageByte, &message)
	if err != nil {
		fmt.Println(err)
		return []byte{}
	}
	audioByte, _ := json.Marshal(message["audio"])
	var audio map[string]interface{}
	err = json.Unmarshal(audioByte, &audio)
	if err != nil {
		fmt.Println(err)
		return []byte{}
	}
	Base64 := audio["data"].(string)
	decoded, err := base64.StdEncoding.DecodeString(Base64)
	if err != nil {
		fmt.Println("解码错误:", err)
		return []byte{}
	}
	fmt.Println(audio["transcript"].(string))
	return decoded
}

func STT(Base64 string) string {
	configs := GetConfig()
	url := fmt.Sprint(configs.API, "/audio/transcriptions")
	method := "POST"

	payload := &bytes.Buffer{}
	writer := multipart.NewWriter(payload)
	file, err := Base64ToOsFile(Base64)
	defer file.Close()
	part1, err := writer.CreateFormFile("file", "tmp.wav")
	_, err = io.Copy(part1, file)
	if err != nil {
		fmt.Println(err)
		return ""
	}
	_ = writer.WriteField("model", configs.ModelSTT)
	err = writer.Close()
	if err != nil {
		fmt.Println(err)
		return ""
	}

	client := &http.Client{}
	req, err := http.NewRequest(method, url, payload)

	if err != nil {
		fmt.Println(err)
		return ""
	}
	req.Header.Add("Authorization", fmt.Sprint("Bearer ", configs.APIKey))

	req.Header.Set("Content-Type", writer.FormDataContentType())
	res, err := client.Do(req)
	if err != nil {
		fmt.Println(err)
		return ""
	}
	defer res.Body.Close()

	body, err := io.ReadAll(res.Body)
	if err != nil {
		fmt.Println(err)
		return ""
	}
	fmt.Println(string(body))

	var data map[string]interface{}
	err = json.Unmarshal(body, &data)
	return data["text"].(string)
}

func Base64ToOsFile(Base64 string) (*os.File, error) {
	// 解码base64字符串
	decodedData, err := base64.StdEncoding.DecodeString(Base64)
	if err != nil {
		return nil, err
	}

	// 创建临时文件
	tmpFile, err := os.CreateTemp("", "decoded_file_*")
	if err != nil {
		return nil, err
	}

	// 写入解码的数据到文件
	_, err = bytes.NewReader(decodedData).WriteTo(tmpFile)
	if err != nil {
		tmpFile.Close()
		return nil, err
	}

	// 重置文件指针到开头
	tmpFile.Seek(0, 0)

	return tmpFile, nil
}
