package utils

import (
	"context"
	"encoding/json"
	"errors"
	"fmt"
	"io"
	"strconv"
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

	// 添加当前用户消息
	userMessage := messageFormat{
		ID:             messageUserID,
		ConversationID: conversationID,
		Role:           "user",
		Content:        prompt,
		Base64:         base64,
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
						// 添加 AI 回复到消息列表（使用前端传来的 messageAssistantID）
						aiMessage := messageFormat{
							ID:               messageAssistantID,
							ConversationID:   conversationID,
							Role:             "assistant",
							Content:          aiContent.Content,
							ReasoningContent: aiContent.ReasoningContent,
							CreatedAt:        time.Now().Format("2006-01-02T15:04:05Z07:00"),
						}
						historyMessages = append(historyMessages, aiMessage)

						// 保存整个对话历史到数据库
						if err := SaveConversationHistoryFormat2(conversationID, historyMessages); err != nil {
							fmt.Printf("保存对话历史失败：%v\n", err)
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

			Openai(ctx, conversationID, messageUserID, messageAssistantID, model, prompt, base64, reasoning, resp)
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

	go func() {
		select {
		case <-time.After(10 * time.Second):
			contentMutex.Lock()
			received := hasReceivedContent
			contentMutex.Unlock()

			if !received {
				elapsed := time.Since(startTime).Seconds()
				fmt.Printf("[超时检测] conversationID=%d, 10秒内未收到AI回复，已等待%.1f秒，断开连接\n", conversationID, elapsed)

				// 发送超时错误消息
				jsonResp, _ := json.Marshal(Response{
					Success: false,
					Error:   "AI服务器响应超时，请稍后重试",
				})
				select {
				case resp <- string(jsonResp):
				default:
					// 通道可能已关闭，忽略错误
				}
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

	// 添加当前用户消息
	if base64Image != "" {
		// 带图片的消息
		messages = append(messages, openai.ChatCompletionMessage{
			Role: openai.ChatMessageRoleUser,
			MultiContent: []openai.ChatMessagePart{
				{
					Type: openai.ChatMessagePartTypeText,
					Text: prompt,
				},
				{
					Type: openai.ChatMessagePartTypeImageURL,
					ImageURL: &openai.ChatMessageImageURL{
						URL: base64Image,
					},
				},
			},
		})
	} else {
		// 纯文本消息
		messages = append(messages, openai.ChatCompletionMessage{
			Role:    openai.ChatMessageRoleUser,
			Content: prompt,
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

	// 如果支持工具，添加联网搜索工具
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

				// 处理工具调用
				if len(delta.ToolCalls) > 0 {
					for _, toolCall := range delta.ToolCalls {
						if toolCall.Function.Name == "web_search" {
							// 解析搜索参数
							var params struct {
								Query string `json:"query"`
							}
							if err := json.Unmarshal([]byte(toolCall.Function.Arguments), &params); err != nil {
								fmt.Printf("解析工具调用参数失败: %v\n", err)
								continue
							}

							// 执行搜索
							searchResult, err := SimpleSearch(params.Query)
							if err != nil {
								searchResult = fmt.Sprintf("搜索失败: %v", err)
							}

							// 将工具调用和结果添加到消息历史
							messages = append(messages, openai.ChatCompletionMessage{
								Role:      openai.ChatMessageRoleAssistant,
								ToolCalls: []openai.ToolCall{toolCall},
							})
							messages = append(messages, openai.ChatCompletionMessage{
								Role:       openai.ChatMessageRoleTool,
								Content:    searchResult,
								ToolCallID: toolCall.ID,
							})

							// 关闭当前流
							stream.Close()

							// 重新创建请求，包含工具调用结果
							reqParams.Messages = messages
							stream, err = client.CreateChatCompletionStream(ctx, reqParams)
							if err != nil {
								jsonResp, _ := json.Marshal(Response{
									Success: false,
									Error:   fmt.Sprintf("重新创建流失败: %v", err),
								})
								resp <- string(jsonResp)
								return
							}
							continue
						}
					}
				}

				// 更新缓存：推理内容
				if delta.ReasoningContent != "" {
					// 标记已收到内容，取消超时检测
					contentMutex.Lock()
					if !hasReceivedContent {
						hasReceivedContent = true
						cancelTimeout()
						fmt.Printf("[超时检测] conversationID=%d, 已收到AI回复，取消超时检测\n", conversationID)
					}
					contentMutex.Unlock()

					MessageContentCacheMutex.Lock()
					if content, exists := MessageContentCache[messageAssistantID]; exists {
						content.ReasoningContent += delta.ReasoningContent
					}
					MessageContentCacheMutex.Unlock()
				}

				// 更新缓存：普通内容
				if delta.Content != "" {
					// 标记已收到内容，取消超时检测
					contentMutex.Lock()
					if !hasReceivedContent {
						hasReceivedContent = true
						cancelTimeout()
						fmt.Printf("[超时检测] conversationID=%d, 已收到AI回复，取消超时检测\n", conversationID)
					}
					contentMutex.Unlock()

					MessageContentCacheMutex.Lock()
					if content, exists := MessageContentCache[messageAssistantID]; exists {
						content.Content += delta.Content
					}
					MessageContentCacheMutex.Unlock()

					// 写入响应通道（JSON 格式）
					jsonResp, _ := json.Marshal(Response{
						Success:          true,
						Content:          delta.Content,
						ReasoningContent: delta.ReasoningContent,
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
