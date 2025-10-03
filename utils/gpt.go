package utils

import (
	"context"
	"errors"
	"fmt"
	"io"
	"regexp"
	"strconv"
	"sync"
	"time"

	"github.com/golang-queue/queue"
	"github.com/sashabaranov/go-openai"
	uuid "github.com/satori/go.uuid"
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
	taskQueue = queue.NewPool(5) // 同时处理5个并发请求
}

// --- 核心功能：并发处理 OpenAI 请求 ---

// ThreadOpenai 使用并发处理OpenAI请求，返回一个通道以实现类似Python yield的功能
func ThreadOpenai(conversationID uuid.UUID, model string, prompt string, base64 string) <-chan string {
	threadID := conversationID.String()

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

			Openai(ctx, conversationIDCopy, model, prompt, base64, resp)
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

func Openai(ctx context.Context, conversationID uuid.UUID, model string, prompt string, base64 string, resp chan<- string) {
	messages, err := LoadConversationHistory(GetDB(), conversationID)
	if err != nil {
		resp <- fmt.Sprintf("ERR:%s", err)
	}
	messagesCopy := make([]openai.ChatCompletionMessage, len(messages))
	copy(messagesCopy, messages)
	if base64 != "" {
		messages = append(messages, openai.ChatCompletionMessage{
			Role:    "user",
			Content: fmt.Sprintf("<base64>%s</base64>", base64) + prompt,
		})
	}
	err = SaveConversationHistory(GetDB(), conversationID, messages)
	if err != nil {
		resp <- fmt.Sprintf("ERR:%s", err)
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
	var promptImage string
	if base64 != "" {
		promptImage = "\n\n" + ScanPicture(base64, prompt)
		fmt.Println("promptImage:", promptImage)
	}

	Configs := GetConfig()
	clientConfig := openai.DefaultConfig(Configs.APIKey)
	clientConfig.BaseURL = Configs.API
	client := openai.NewClientWithConfig(clientConfig)
	date := time.Now().Format(time.DateOnly)
	timeOnly := time.Now().Format(time.TimeOnly)
	req := openai.ChatCompletionRequest{
		Model: model,
		Messages: append(
			append(messagesCopy, openai.ChatCompletionMessage{
				Role:    "user",
				Content: prompt + promptImage,
			}),
			openai.ChatCompletionMessage{
				Role: "system",
				Content: "今天是 " + date + "。" + "\n" +
					"现在是 " + timeOnly + "。",
			}),
		Stream: true,
	}

	// 使用传入的ctx，而不是context.Background()
	stream, err := client.CreateChatCompletionStream(ctx, req)
	if err != nil {
		// 发送错误信息到通道，并确保格式清晰
		resp <- fmt.Sprintf("ERROR: failed to create stream: %v", err)
		// 返回 nil 表示 Job 执行完成，避免 go-queue 再次尝试
		return
	}

	// 确保流式连接关闭
	defer func() {
		if err := stream.Close(); err != nil {
			// 避免 panic，改为记录错误或发送到通道
			resp <- fmt.Sprintf("ERROR: failed to close stream: %v", err)
		}
	}()

	var reasoningContent, content string
	timeO := time.Now().Unix()
	usedTime := strconv.Itoa(int(time.Now().Unix() - timeO))

	defer func() {
		db := GetDB()
		if reasoningContent != "" {
			messages = append(messages, openai.ChatCompletionMessage{
				Role:             "assistant",
				Content:          fmt.Sprintf("<model=%s>", model) + content,
				ReasoningContent: fmt.Sprintf("<think time=%s>%s</think>", usedTime, reasoningContent),
			})
		} else {
			messages = append(messages, openai.ChatCompletionMessage{
				Role:             "assistant",
				Content:          fmt.Sprintf("<model=%s>", model) + content,
				ReasoningContent: "",
			})
		}
		if err := SaveConversationHistory(GetDB(), conversationID, messages); err != nil {
			fmt.Printf("save error: %v\n", err)
		}
		var conversation Conversation
		db.Table("conversations").Where("id = ?", conversationID).First(&conversation)
		// 如果对话标题为“新对话”
		if conversation.Title == "新对话" {
			Configs := GetConfig()
			clientConfig := openai.DefaultConfig(Configs.APIKeyNameC)
			clientConfig.BaseURL = Configs.APINameC
			client := openai.NewClientWithConfig(clientConfig)
			messages, _ := LoadConversationHistory(db, conversationID)
			messages = append(messages, openai.ChatCompletionMessage{
				Role:    "user",
				Content: "请总结概括对话内容，生成一个对话标题，不超过15字，不要使用 Emoji 和 Konomoji，不要使用 markdown，不要输出其他内容，仅需对话标题内容，不需前缀。",
			})
			req := openai.ChatCompletionRequest{
				Model:    Configs.ModelNameC,
				Messages: messages,
			}
			title, err := client.CreateChatCompletion(ctx, req)
			if err != nil {
				fmt.Println("Error:", err)
			}

			_ = RenameConversation(db, conversationID, title.Choices[0].Message.Content)
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
				resp <- fmt.Sprintf("stream error: %v", err)
				return
			}

			if len(response.Choices) > 0 {
				if reasoning := response.Choices[0].Delta.ReasoningContent; reasoning != "" {
					reasoningContent += reasoning
					usedTime = strconv.Itoa(int(time.Now().Unix() - timeO))
					resp <- fmt.Sprintf("<think time=%s>%s</think>", usedTime, reasoning)
				}

				if contentDelta := response.Choices[0].Delta.Content; contentDelta != "" {
					content += contentDelta
					resp <- contentDelta
				}
			}
		}
	}
}

// ScanPicture 视图
func ScanPicture(base64 string, prompt string) string {
	Configs := GetConfig()
	clientConfig := openai.DefaultConfig(Configs.APIKeyNameC)
	clientConfig.BaseURL = Configs.APINameC
	client := openai.NewClientWithConfig(clientConfig)
	req := openai.ChatCompletionRequest{
		Model: Configs.ModelScan,
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
func GetThreadList(userID uuid.UUID) ([]string, error) {
	db := GetDB()
	var conversations []Conversation
	result := db.Where("user_id = ?", userID).Find(&conversations)
	if result.Error != nil {
		return nil, result.Error
	}

	var conversationIDs []string
	threadMutex.RLock()
	for _, conv := range conversations {
		convID := conv.ID.String()
		if _, exists := threadRegistry[convID]; exists {
			conversationIDs = append(conversationIDs, convID)
		}
	}
	threadMutex.RUnlock()

	return conversationIDs, nil
}
