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

	// 4. 提交任务到队列中执行
	// 使用 QueueTask 方法来安排任务
	conversationIDCopy := conversationID // 创建副本以在闭包中使用
	promptCopy := prompt                 // 创建副本以在闭包中使用
	base64Copy := base64                 // 创建副本以在闭包中使用

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

				// 生成完成后，保存整个对话历史到数据库
				// 从缓存中获取完整的 AI 回复内容
				MessageContentCacheMutex.RLock()
				aiContent := MessageContentCache[messageAssistantID]
				MessageContentCacheMutex.RUnlock()

				if aiContent != nil {
					// 从数据库加载历史消息
					historyMessages, err := LoadConversationHistoryFormat2(conversationIDCopy)
					if err != nil {
						fmt.Printf("加载历史消息失败：%v\n", err)
					} else {
						// 构建完整的消息列表：历史消息 + 当前用户消息 + AI 回复
						completeMessages := historyMessages

						// 添加当前用户消息（使用前端传来的 messageUserID）
						userMessage := messageFormat{
							ID:             messageUserID,
							ConversationID: conversationIDCopy,
							Role:           "user",
							Content:        promptCopy,
							Base64:         base64Copy,
							CreatedAt:      time.Now().Format("2006-01-02T15:04:05Z07:00"),
						}
						completeMessages = append(completeMessages, userMessage)

						// 添加 AI 回复到消息列表（使用前端传来的 messageAssistantID）
						aiMessage := messageFormat{
							ID:               messageAssistantID,
							ConversationID:   conversationIDCopy,
							Role:             "assistant",
							Content:          aiContent.Content,
							ReasoningContent: aiContent.ReasoningContent,
							CreatedAt:        time.Now().Format("2006-01-02T15:04:05Z07:00"),
						}
						completeMessages = append(completeMessages, aiMessage)

						// 保存整个对话历史到数据库
						if err := SaveConversationHistoryFormat2(conversationIDCopy, completeMessages); err != nil {
							fmt.Printf("保存对话历史失败：%v\n", err)
						}
					}
				}

				close(resp)
				ThreadMutex.Lock()
				delete(ThreadRegistry, threadID)
				ThreadMutex.Unlock()
				ConversationIDMessageIDsMutex.Lock()
				delete(ConversationIDMessageIDs, conversationIDCopy)
				ConversationIDMessageIDsMutex.Unlock()
			}()

			Openai(ctx, conversationIDCopy, messageUserID, messageAssistantID, model, prompt, base64, reasoning, resp)
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

	// 创建流式请求
	stream, err := client.CreateChatCompletionStream(ctx, openai.ChatCompletionRequest{
		Model:    model,
		Messages: messages,
		Stream:   true,
	})
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

				// 更新缓存：推理内容
				if delta.ReasoningContent != "" {
					MessageContentCacheMutex.Lock()
					if content, exists := MessageContentCache[messageAssistantID]; exists {
						content.ReasoningContent += delta.ReasoningContent
					}
					MessageContentCacheMutex.Unlock()
				}

				// 更新缓存：普通内容
				if delta.Content != "" {
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
