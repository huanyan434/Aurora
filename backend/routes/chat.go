package routes

import (
	"context"
	"encoding/json"
	"fmt"
	"math"
	"net/http"
	"strconv"
	"strings"
	"sync"
	"time"
	"unicode/utf8"
	"utils"

	"github.com/gin-contrib/sessions"
	"github.com/gin-gonic/gin"
	"github.com/gorilla/websocket"
)

func ChatInit(r *gin.Engine) {
	chat := r.Group("/chat")
	{
		// WebSocket 连接 - 统一消息通道
		chat.GET("/ws", wsHandler)

		// 以下 HTTP 路由已废弃，所有功能请通过 WebSocket 调用
		// 保留仅用于向后兼容
		chat.POST("/generate", generateHandler)
		chat.POST("/thread_list", threadListHandler)
		chat.POST("/stop", stopHandler)
		chat.GET("/new_conversation", newConversationHandler)
		chat.POST("/delete_conversation", deleteConversationHandler)
		chat.POST("/rename_conversation", renameConversationHandler)
		chat.GET("/conversations_list", conversationsListHandler)
		chat.POST("/messages_list", messagesListHandler)
		chat.POST("/share_messages", shareMessagesHandler)
		chat.GET("/:shareID", loadShareMessagesHandler)
		chat.POST("/delete_message", deleteMessageHandler)
		chat.POST("/tts", ttsHandler)
		chat.POST("/stt", sttHandler)
	}
}

type MSG struct {
	Success             bool   `json:"success" default:"false"`
	Error               string `json:"error" default:""`
	ReasoningContent    string `json:"reasoningContent" default:""`
	ReasoningTime       int    `json:"reasoningTime" default:""`
	Content             string `json:"content" default:""`
	Base64              string `json:"base64,omitempty"`
	ConversationID      int64  `json:"conversationID"`
	MessageAssistantID  int64  `json:"messageAssistantID"`
	IsCached            bool   `json:"isCached" default:"false"`      // 是否是缓存内容
	IsUserMessage       bool   `json:"isUserMessage" default:"false"` // 是否为用户消息
	PointsDeducted      int    `json:"pointsDeducted,omitempty"`
	ModelName           string `json:"modelName,omitempty"`
	StreamSource        string `json:"streamSource,omitempty"`
}

// WebSocket 响应消息
type WSResponse struct {
	Type string      `json:"type"`
	Data interface{} `json:"data"`
}

var (
	// WebSocket 连接管理 (userID -> connection)
	wsConnections = make(map[int64]*websocket.Conn)
	wsMutex       sync.RWMutex

	// WebSocket 升级配置
	upgrader = websocket.Upgrader{
		CheckOrigin: func(r *http.Request) bool {
			return true // 允许所有来源，生产环境应该根据实际情况配置
		},
	}
)

// @Summary WebSocket 连接
// @Description 建立 WebSocket 连接用于所有聊天功能（生成、停止、获取列表等）
// @Tags Chat
// @Router /chat/ws [get]
func wsHandler(c *gin.Context) {
	// 获取当前用户
	session := sessions.Default(c)
	userInfoInterface := session.Get("currentUser")
	if userInfoInterface == nil {
		c.Status(http.StatusUnauthorized)
		return
	}
	currentSession, ok := userInfoInterface.(CurrentUserSession)
	if !ok {
		c.Status(http.StatusUnauthorized)
		return
	}
	userInfo := utils.FilterByID(currentSession.ID)
	if userInfo.ID == 0 {
		c.Status(http.StatusUnauthorized)
		return
	}
	if !utils.IsActiveMember(&userInfo) {
		userInfo.IsMember = false
		userInfo.MemberLevel = "free"
	}
	fmt.Printf("[当前用户][WS] userID=%d isMember=%v memberLevel=%s points=%d\n", userInfo.ID, userInfo.IsMember, userInfo.MemberLevel, userInfo.Points)

	conn, err := upgrader.Upgrade(c.Writer, c.Request, nil)
	if err != nil {
		// WebSocket 升级失败，可能是客户端已经断开
		return
	}

	// 存储连接（按 userID）
	wsMutex.Lock()
	wsConnections[userInfo.ID] = conn
	wsMutex.Unlock()

	// 确保连接关闭时清理
	defer func() {
		wsMutex.Lock()
		delete(wsConnections, userInfo.ID)
		wsMutex.Unlock()
		conn.Close()
	}()

	// WebSocket 连接建立后，检查是否有未完成的消息需要续传
	// 获取当前用户的所有未完成消息
	utils.MessageContentCacheMutex.RLock()
	var pendingMessages []gin.H
	for messageAssistantID, content := range utils.MessageContentCache {
		if !content.Completed {
			// 检查这个消息是否属于当前用户（通过数据库查询）
			_, userID, err := utils.GetMessageWithUser(messageAssistantID)
			if err == nil && userID == userInfo.ID {
				pendingMessages = append(pendingMessages, gin.H{
					"messageAssistantID": messageAssistantID,
					"reasoningContent":   content.ReasoningContent,
					"content":            content.Content,
					"reasoningTime":      content.ReasoningTime,
				})
			}
		}
	}
	utils.MessageContentCacheMutex.RUnlock()

	// 发送未完成消息的缓存内容
	for _, msg := range pendingMessages {
		// 先发送推理内容（如果有）
		if msg["reasoningContent"] != "" {
			sendWSResponse(conn, "generate_response", MSG{
				Success:          true,
				ReasoningContent: msg["reasoningContent"].(string),
				Content:          "",
				ReasoningTime:    msg["reasoningTime"].(int),
				IsCached:         true,
			})
			// 推迟一点点时间，确保客户端处理完
			time.Sleep(50 * time.Millisecond)
		}
		// 发送正文内容
		if msg["content"] != "" {
			sendWSResponse(conn, "generate_response", MSG{
				Success:          true,
				ReasoningContent: "",
				Content:          msg["content"].(string),
				ReasoningTime:    0,
				IsCached:         true,
			})
			// 推迟一点点时间，确保客户端处理完
			time.Sleep(50 * time.Millisecond)
		}

		// 问题 3 修复：检查是否有正在运行的线程，如果有，重新启动一个 goroutine 来读取响应
		messageAssistantID := msg["messageAssistantID"].(int64)
		utils.ConversationIDMessageIDsMutex.RLock()
		var conversationID int64
		for convID, convMsgID := range utils.ConversationIDMessageIDs {
			if convMsgID.MessageAssistantID == messageAssistantID {
				conversationID = convID
				break
			}
		}
		utils.ConversationIDMessageIDsMutex.RUnlock()

		if conversationID != 0 {
			threadID := strconv.FormatInt(conversationID, 10)
			utils.ThreadMutex.RLock()
			info, threadExists := utils.ThreadRegistry[threadID]
			utils.ThreadMutex.RUnlock()

			if threadExists {
				// 线程还在运行，启动 goroutine 读取响应并发送到新的 WebSocket 连接
				go func(conn *websocket.Conn, convID int64, respChan <-chan string) {
					for response := range respChan {
						var msg MSG
						var parsedResponse utils.Response
						err := json.Unmarshal([]byte(response), &parsedResponse)
						if err != nil {
							msg = MSG{Success: false, Error: err.Error()}
							sendWSResponse(conn, "generate_response", msg)
							continue
						}

						if parsedResponse.Error != "" {
							msg = MSG{Success: false, Error: parsedResponse.Error}
							sendWSResponse(conn, "generate_response", msg)
							continue
						}

						reasoningTime, reasoningContent, _ := utils.ParseThinkBlock(parsedResponse.ReasoningContent)
						msg = MSG{
							Success:            true,
							ReasoningContent:   reasoningContent,
							ReasoningTime:      reasoningTime,
							Content:            parsedResponse.Content,
							ConversationID:     convID,
							MessageAssistantID: messageAssistantID,
						}
						sendWSResponse(conn, "generate_response", msg)
					}

					// 通道关闭，生成结束
					sendWSResponse(conn, "generate_end", gin.H{
						"conversationID":     convID,
						"messageAssistantID": messageAssistantID,
					})
				}(conn, conversationID, info.Resp)
			}
		}
	}

	// 处理 WebSocket 消息
	for {
		_, message, err := conn.ReadMessage()
		if err != nil {
			// 客户端断开连接或发生错误，正常退出
			break
		}

		// 解析请求
		var req WSRequest
		if err := json.Unmarshal(message, &req); err != nil {
			sendWSResponse(conn, "error", gin.H{"error": "无效的请求格式"})
			continue
		}

		// 根据类型路由
		switch req.Type {
		case "generate":
			handleWSGenerate(conn, userInfo, req)
		case "regenerate":
			handleWSRegenerate(conn, userInfo, req)
		case "stop":
			handleWSStop(conn, req.ConversationID)
		case "thread_list":
			handleWSThreadList(conn, userInfo.ID)
		case "new_conversation":
			handleWSNewConversation(conn, userInfo.ID)
		case "delete_conversation":
			handleWSDeleteConversation(conn, req.ConversationID)
		case "conversations_list":
			handleWSConversationsList(conn, userInfo.ID)
		case "messages_list":
			handleWSMessagesList(conn, req.ConversationID)
		case "delete_message":
			handleWSDeleteMessage(conn, req.MessageID)
		case "tts":
			handleWSTTS(conn, userInfo, req.Prompt)
		case "stt":
			handleWSSTT(conn, userInfo, req.Base64)
		case "image_generate":
			handleWSImageGenerate(conn, userInfo, req, true) // 新生成图片时需要保存用户消息
		case "image_edit":
			handleWSImageEdit(conn, userInfo, req)
		case "resume_check":
			handleWSResumeCheck(conn, userInfo.ID, req.ConversationID)
		default:
			sendWSResponse(conn, "error", gin.H{"error": "未知的请求类型：" + req.Type})
		}
	}
}

// WebSocket 请求结构
type WSRequest struct {
	Type               string  `json:"type"`
	ConversationID     int64   `json:"conversationID"`
	MessageUserID      int64   `json:"messageUserID"`
	MessageAssistantID int64   `json:"messageAssistantID"`
	Prompt             string  `json:"prompt"`
	Model              string  `json:"model"`
	Base64             string  `json:"base64"`
	Reasoning          bool    `json:"reasoning"`
	MessageID          int64   `json:"messageID"`
	TargetMessageID    int64   `json:"targetMessageID"`
	ImageMessageID     int64   `json:"imageMessageID"`
	RegenerateMode     string  `json:"regenerateMode"`
	MaskBase64         string  `json:"maskBase64"`
	Size               string  `json:"size"`
	Format             string  `json:"format"`
	Quality            string  `json:"quality"`
	N                  int     `json:"n"`
	Temperature        *float32 `json:"temperature,omitempty"`
	TopP               *float32 `json:"top_p,omitempty"`
	FrequencyPenalty   *float32 `json:"frequency_penalty,omitempty"`
	PresencePenalty    *float32 `json:"presence_penalty,omitempty"`
}

// 发送 WebSocket 响应
func sendWSResponse(conn *websocket.Conn, respType string, data interface{}) {
	response := WSResponse{Type: respType, Data: data}
	jsonData, _ := json.Marshal(response)
	conn.WriteMessage(websocket.TextMessage, jsonData)
}

func calculatePlannedPoints(user utils.User, modelID string, reasoning bool) (int, bool) {
	config := utils.GetConfig()
	for _, m := range config.Models {
		if m.ID != modelID {
			continue
		}

		if reasoning && m.Reasoning != modelID {
			if user.IsMember {
				switch user.MemberLevel {
				case "VIP":
					return int(math.Ceil(math.Ceil(float64(m.Points/2)) * 1.5)), true
				case "SVIP":
					return 0, true
				}
			}
			return int(math.Ceil(math.Ceil(float64(m.Points)) * 1.5)), true
		}

		if user.IsMember {
			switch user.MemberLevel {
			case "VIP":
				return int(math.Ceil(float64(m.Points / 2))), true
			case "SVIP":
				return 0, true
			}
		}
		return m.Points, true
	}
	return 0, false
}

func ensureUserPoints(conn *websocket.Conn, user utils.User, modelID string, reasoning bool, errorType string) (int, bool) {
	plannedPoints, matched := calculatePlannedPoints(user, modelID, reasoning)
	if !matched {
		sendWSResponse(conn, errorType, gin.H{"error": "未找到对应模型配置"})
		return 0, false
	}
	if user.Points < plannedPoints {
		sendWSResponse(conn, errorType, gin.H{"error": "积分不足"})
		return 0, false
	}
	return plannedPoints, true
}

func extractModelFromMessageContent(content string) string {
	content = strings.TrimSpace(content)
	if content == "" {
		return ""
	}
	if !strings.HasPrefix(content, "<model=") {
		return ""
	}
	end := strings.Index(content, ">")
	if end <= 7 {
		return ""
	}
	return strings.TrimSpace(content[7:end])
}

func isValidGptImageSize(size string) bool {
	parts := strings.Split(size, "x")
	if len(parts) != 2 {
		return false
	}
	width, err1 := strconv.Atoi(strings.TrimSpace(parts[0]))
	height, err2 := strconv.Atoi(strings.TrimSpace(parts[1]))
	if err1 != nil || err2 != nil || width <= 0 || height <= 0 {
		return false
	}
	if width > 3840 || height > 3840 {
		return false
	}
	if width%16 != 0 || height%16 != 0 {
		return false
	}
	longSide := width
	shortSide := height
	if shortSide > longSide {
		longSide, shortSide = shortSide, longSide
	}
	if shortSide == 0 || float64(longSide)/float64(shortSide) > 3.0 {
		return false
	}
	pixels := width * height
	return pixels >= 655360 && pixels <= 8294400
}

// WebSocket: 生成 AI 回复
func handleWSRegenerate(conn *websocket.Conn, user utils.User, req WSRequest) {
	if req.TargetMessageID <= 0 {
		sendWSResponse(conn, "generate_response", MSG{Success: false, Error: "缺少待重生成的消息 ID", ConversationID: req.ConversationID})
		return
	}

	var targetMessage utils.Message
	if err := utils.GetDB().Table("messages").Where("id = ? AND conversation_id = ?", req.TargetMessageID, req.ConversationID).First(&targetMessage).Error; err != nil {
		if err := utils.SaveAssistantErrorMessage(req.ConversationID, req.TargetMessageID, req.Model, err.Error()); err != nil {
			fmt.Printf("保存重生成错误消息失败: %v\n", err)
		}
		sendWSResponse(conn, "generate_response", MSG{Success: false, Error: err.Error(), ConversationID: req.ConversationID, MessageAssistantID: req.TargetMessageID, ModelName: utils.GetModelName(req.Model)})
		return
	}

	previousUser, err := utils.GetPreviousUserMessageBefore(req.ConversationID, req.TargetMessageID)
	if err != nil {
		if err := utils.SaveAssistantErrorMessage(req.ConversationID, req.TargetMessageID, req.Model, err.Error()); err != nil {
			fmt.Printf("保存重生成错误消息失败: %v\n", err)
		}
		sendWSResponse(conn, "generate_response", MSG{Success: false, Error: err.Error(), ConversationID: req.ConversationID, MessageAssistantID: req.TargetMessageID, ModelName: utils.GetModelName(req.Model)})
		return
	}

	deleteIDs, err := utils.GetMessageIDsAfterConversationMessage(req.ConversationID, req.TargetMessageID)
	if err != nil {
		if err := utils.SaveAssistantErrorMessage(req.ConversationID, req.TargetMessageID, req.Model, err.Error()); err != nil {
			fmt.Printf("保存重生成错误消息失败: %v\n", err)
		}
		sendWSResponse(conn, "generate_response", MSG{Success: false, Error: err.Error(), ConversationID: req.ConversationID, MessageAssistantID: req.TargetMessageID, ModelName: utils.GetModelName(req.Model)})
		return
	}

	if err := utils.DeleteMessagesByIDs(deleteIDs); err != nil {
		if err := utils.SaveAssistantErrorMessage(req.ConversationID, req.TargetMessageID, req.Model, err.Error()); err != nil {
			fmt.Printf("保存重生成错误消息失败: %v\n", err)
		}
		sendWSResponse(conn, "generate_response", MSG{Success: false, Error: err.Error(), ConversationID: req.ConversationID, MessageAssistantID: req.TargetMessageID, ModelName: utils.GetModelName(req.Model)})
		return
	}

	messageUserID := previousUser.ID
	messageAssistantID := req.MessageAssistantID
	if messageUserID == 0 || messageAssistantID == 0 {
		messageUserID = req.MessageUserID
		if messageUserID == 0 {
			messageUserID = req.TargetMessageID
		}
		if messageAssistantID == 0 {
			messageAssistantID = req.TargetMessageID
		}
	}

	prompt := previousUser.Content
	base64 := previousUser.Base64
	reasoning := false
	model := extractModelFromMessageContent(targetMessage.Content)
	if model == "" {
		model = req.Model
	}

	if req.RegenerateMode == "image" {
		handleWSImageGenerate(conn, user, WSRequest{
			ConversationID:     req.ConversationID,
			MessageUserID:      messageUserID,
			MessageAssistantID: messageAssistantID,
			Prompt:             prompt,
			Model:              model,
			Base64:             "",
			Size:               req.Size,
			Quality:            req.Quality,
			N:                  req.N,
		}, false) // 重新生成时不需要保存用户消息
		return
	}

	handleWSGenerate(conn, user, WSRequest{
		ConversationID:     req.ConversationID,
		MessageUserID:      messageUserID,
		MessageAssistantID: messageAssistantID,
		Prompt:             prompt,
		Model:              model,
		Base64:             base64,
		Reasoning:          reasoning,
	})
}

func handleWSGenerate(conn *websocket.Conn, user utils.User, req WSRequest) {
	fmt.Printf("[积分检查][WS] userID=%d model=%s reasoning=%v points=%d isMember=%v memberLevel=%s\n", user.ID, req.Model, req.Reasoning, user.Points, user.IsMember, user.MemberLevel)

	// 积分检查（仅校验，不立即扣除）
	plannedPointsDeducted, matchedModel := ensureUserPoints(conn, user, req.Model, req.Reasoning, "generate_error")
	pointsDeducted := 0
	if !matchedModel {
		fmt.Printf("[积分检查][WS] 未匹配到模型，req.Model=%s\n", req.Model)
		return
	}

	// 调用 AI 生成
	params := utils.ModelParameters{
		Temperature:      req.Temperature,
		TopP:             req.TopP,
		FrequencyPenalty: req.FrequencyPenalty,
		PresencePenalty:  req.PresencePenalty,
	}
	generationFailed := false
	resp := utils.ThreadOpenai(req.ConversationID, req.MessageUserID, req.MessageAssistantID, req.Model, req.Prompt, req.Base64, req.Reasoning, params)
	for response := range resp {
		var msg MSG
		var parsedResponse utils.Response
		err := json.Unmarshal([]byte(response), &parsedResponse)
		if err != nil {
			generationFailed = true
			msg = MSG{Success: false, Error: err.Error()}
			sendWSResponse(conn, "generate_response", msg)
			continue
		}

		if parsedResponse.Error != "" {
			generationFailed = true
			msg = MSG{Success: false, Error: parsedResponse.Error}
			sendWSResponse(conn, "generate_response", msg)
			continue
		}

		reasoningTime, reasoningContent, _ := utils.ParseThinkBlock(parsedResponse.ReasoningContent)
		msg = MSG{
			Success:            true,
			ReasoningContent:   reasoningContent,
			ReasoningTime:      reasoningTime,
			Content:            parsedResponse.Content,
			ConversationID:     req.ConversationID,
			MessageAssistantID: req.MessageAssistantID,
			StreamSource:       "live",
		}
		sendWSResponse(conn, "generate_response", msg)

		// 更新缓存内容已在 gpt.go 的 Openai 函数中完成，此处不再重复更新
	}

	// 如果已经生成完成但最终内容为空，先补发兜底消息
	utils.MessageContentCacheMutex.RLock()
	finalContent := ""
	hasAnyContent := false
	if cachedContent, exists := utils.MessageContentCache[req.MessageAssistantID]; exists {
		finalContent = strings.TrimSpace(cachedContent.Content)
		hasAnyContent = strings.TrimSpace(cachedContent.Content) != "" || strings.TrimSpace(cachedContent.ReasoningContent) != ""
	}
	utils.MessageContentCacheMutex.RUnlock()

	if finalContent == "" && !hasAnyContent {
		fmt.Printf("[generate_end] empty final content, sending fallback conversationID=%d messageAssistantID=%d\n", req.ConversationID, req.MessageAssistantID)
		sendWSResponse(conn, "generate_response", MSG{
			Success:            true,
			ReasoningContent:   "",
			ReasoningTime:      0,
			Content:            "当前内容为空，请重新生成。",
			ConversationID:     req.ConversationID,
			MessageAssistantID: req.MessageAssistantID,
			ModelName:          utils.GetModelName(req.Model),
		})
	}

	if !generationFailed && finalContent != "" && plannedPointsDeducted > 0 {
		if err := utils.AddPoints(user.ID, -plannedPointsDeducted, "使用大语言模型"); err != nil {
			fmt.Printf("[积分检查][WS] 最终扣费失败 userID=%d points=%d err=%v\n", user.ID, plannedPointsDeducted, err)
			sendWSResponse(conn, "generate_error", gin.H{"error": "扣除积分失败: " + err.Error()})
			return
		}
		pointsDeducted = plannedPointsDeducted
		fmt.Printf("[积分检查][WS] 最终扣费成功 userID=%d points=%d\n", user.ID, pointsDeducted)
	} else {
		fmt.Printf("[积分检查][WS] 本次不扣费 userID=%d generationFailed=%v finalContentLen=%d plannedPoints=%d\n", user.ID, generationFailed, len(finalContent), plannedPointsDeducted)
	}

	pointsDeductReason := ""
	if pointsDeducted > 0 {
		pointsDeductReason = "使用大语言模型"
	}

	// 生成结束，发送结束信号
	fmt.Printf("[generate_end] sending end conversationID=%d messageAssistantID=%d finalContentLen=%d pointsDeducted=%d\n", req.ConversationID, req.MessageAssistantID, len(finalContent), pointsDeducted)
	sendWSResponse(conn, "generate_end", gin.H{
		"conversationID":     req.ConversationID,
		"messageAssistantID": req.MessageAssistantID,
		"pointsDeducted":     pointsDeducted,
		"pointsDeductReason": pointsDeductReason,
		"modelName":          utils.GetModelName(req.Model),
	})
}

// WebSocket: 停止生成
func handleWSStop(conn *websocket.Conn, conversationID int64) {
	success := utils.KillThread(strconv.FormatInt(conversationID, 10))
	if success {
		sendWSResponse(conn, "stop_success", gin.H{"conversationID": conversationID})
	} else {
		sendWSResponse(conn, "stop_error", gin.H{"error": "内部错误"})
	}
}

// WebSocket: 获取线程列表
func handleWSThreadList(conn *websocket.Conn, userID int64) {
	list, err := utils.GetThreadList(userID)
	if err != nil {
		sendWSResponse(conn, "thread_list_error", gin.H{"error": err.Error()})
	} else {
		sendWSResponse(conn, "thread_list", list)
	}
}

// WebSocket: 创建新对话
func handleWSNewConversation(conn *websocket.Conn, userID int64) {
	conversationID := utils.CreateConversation(userID)
	sendWSResponse(conn, "new_conversation", gin.H{"conversationID": strconv.FormatInt(conversationID, 10)})
}

// WebSocket: 删除对话
func handleWSDeleteConversation(conn *websocket.Conn, conversationID int64) {
	err := utils.DeleteConversation(conversationID)
	if err != nil {
		sendWSResponse(conn, "delete_conversation_error", gin.H{"error": err.Error()})
	} else {
		sendWSResponse(conn, "delete_conversation_success", gin.H{"conversationID": conversationID})
	}
}

// WebSocket: 获取对话列表
func handleWSConversationsList(conn *websocket.Conn, userID int64) {
	var conversations []utils.Conversation
	utils.GetDB().Table("conversations").Where("user_id = ?", userID).Order("updated_at DESC").Find(&conversations)

	formattedConversations := make([]gin.H, 0, len(conversations))
	for _, conversation := range conversations {
		formattedConversations = append(formattedConversations, gin.H{
			"conversationID": strconv.FormatInt(conversation.ID, 10),
			"title":          conversation.Title,
			"summary":        conversation.Summary,
			"createdAt":      conversation.CreatedAt.Format(time.RFC3339),
			"updatedAt":      conversation.UpdatedAt.Format(time.RFC3339),
		})
	}

	sendWSResponse(conn, "conversations_list", gin.H{"conversations": formattedConversations})
}

// WebSocket: 获取历史消息
func handleWSMessagesList(conn *websocket.Conn, conversationID int64) {
	messages, err := utils.LoadConversationHistoryFormat2(conversationID)
	if err != nil {
		sendWSResponse(conn, "messages_list_error", gin.H{"error": err.Error()})
	} else {
		sendWSResponse(conn, "messages_list", messages)
	}
}

// WebSocket: 删除消息
func handleWSDeleteMessage(conn *websocket.Conn, messageID int64) {
	utils.DeleteMessage(messageID)
	sendWSResponse(conn, "delete_message_success", gin.H{"messageID": messageID})
}

// WebSocket: TTS
func handleWSTTS(conn *websocket.Conn, user utils.User, prompt string) {
	if utils.IsActiveMember(&user) {
		switch user.MemberLevel {
		case "SVIP":
			// SVIP 免费
		case "VIP":
			if user.Points < 1 {
				sendWSResponse(conn, "tts_error", gin.H{"error": "积分不足"})
				return
			}
			utils.AddPoints(user.ID, -1, "使用语音模型")
		}
	} else {
		if user.Points < 2 {
			sendWSResponse(conn, "tts_error", gin.H{"error": "积分不足"})
			return
		}
		utils.AddPoints(user.ID, -2, "使用语音模型")
	}
	data := utils.TTS(prompt)
	sendWSResponse(conn, "tts_response", gin.H{"data": data})
}

func handleWSImageGenerate(conn *websocket.Conn, user utils.User, req WSRequest, saveUserMessage bool) {
	fmt.Printf("[image_ws] generate start userID=%d conversationID=%d messageUserID=%d messageAssistantID=%d model=%s saveUserMessage=%v\n", user.ID, req.ConversationID, req.MessageUserID, req.MessageAssistantID, req.Model, saveUserMessage)

	// 检查图片尺寸权限
	size := strings.TrimSpace(req.Size)
	if size == "" {
		size = "1024x1024"
	}

	isGptImageModel := strings.EqualFold(strings.TrimSpace(req.Model), "gpt-image-2") || strings.EqualFold(strings.TrimSpace(req.Model), "gpt-image-1") || strings.Contains(strings.ToLower(strings.TrimSpace(req.Model)), "gpt-image")
	if isGptImageModel {
		if !isValidGptImageSize(size) {
			errMsg := fmt.Sprintf("gpt-image 不支持该图片尺寸: %s", size)
			if err := utils.SaveAssistantImageErrorMessage(req.ConversationID, req.MessageAssistantID, req.Model, req.Prompt, errMsg); err != nil {
				fmt.Printf("保存图片错误消息失败: %v\n", err)
			}
			sendWSResponse(conn, "generate_response", MSG{Success: false, Error: errMsg, ConversationID: req.ConversationID, MessageAssistantID: req.MessageAssistantID, ModelName: utils.GetModelName(req.Model)})
			sendWSResponse(conn, "generate_end", gin.H{"conversationID": req.ConversationID, "messageAssistantID": req.MessageAssistantID, "pointsDeducted": 0})
			return
		}
	} else {
		// 定义不同会员等级可以使用的图片尺寸
		validSizes := map[string][]string{
			"free": {"1024x1024", "1536x1024", "1024x1536"},
			"VIP":  {"1024x1024", "1536x1024", "1024x1536", "2048x2048", "1152x2048", "2048x1152"},
			"SVIP": {"1024x1024", "1536x1024", "1024x1536", "2048x2048", "1152x2048", "2048x1152", "3840x2160", "2160x3840"},
		}

		// 获取用户等级对应的可用尺寸
		userLevel := "free"
		if user.IsMember {
			userLevel = user.MemberLevel
		}
		allowedSizes := validSizes[userLevel]

		// 检查请求的尺寸是否在允许范围内
		isAllowed := false
		for _, allowedSize := range allowedSizes {
			if size == allowedSize {
				isAllowed = true
				break
			}
		}

		if !isAllowed {
			errMsg := fmt.Sprintf("当前会员等级 (%s) 不支持该图片尺寸: %s", userLevel, size)
			if err := utils.SaveAssistantImageErrorMessage(req.ConversationID, req.MessageAssistantID, req.Model, req.Prompt, errMsg); err != nil {
				fmt.Printf("保存图片错误消息失败: %v\n", err)
			}
			sendWSResponse(conn, "generate_response", MSG{Success: false, Error: errMsg, ConversationID: req.ConversationID, MessageAssistantID: req.MessageAssistantID, ModelName: utils.GetModelName(req.Model)})
			sendWSResponse(conn, "generate_end", gin.H{"conversationID": req.ConversationID, "messageAssistantID": req.MessageAssistantID, "pointsDeducted": 0})
			return
		}
	}

	// 积分检查
	plannedPointsDeducted, ok := ensureUserPoints(conn, user, req.Model, false, "image_generate_error")
	if !ok {
		return
	}
	
	// 只有在需要时才保存用户消息
	if saveUserMessage {
		if err := utils.SaveUserImageMessage(req.ConversationID, req.MessageUserID, req.Prompt, req.Base64); err != nil {
			fmt.Printf("保存图片用户消息失败: %v\n", err)
		}
	}
	
	if strings.TrimSpace(req.Prompt) == "" {
		errMsg := "prompt 不能为空"
		if err := utils.SaveAssistantImageErrorMessage(req.ConversationID, req.MessageAssistantID, req.Model, req.Prompt, errMsg); err != nil {
			fmt.Printf("保存图片错误消息失败: %v\n", err)
		}
		sendWSResponse(conn, "generate_response", MSG{Success: false, Error: errMsg, ConversationID: req.ConversationID, MessageAssistantID: req.MessageAssistantID, ModelName: utils.GetModelName(req.Model)})
		sendWSResponse(conn, "generate_end", gin.H{"conversationID": req.ConversationID, "messageAssistantID": req.MessageAssistantID, "pointsDeducted": 0})
		return
	}

	resp, err := utils.GenerateImage(context.Background(), utils.ImageGenerateRequest{
		Model:   req.Model,
		Prompt:  req.Prompt,
		N:       req.N,
		Size:    req.Size,
		Format:  req.Format,
		Quality: req.Quality,
	})
	if err != nil {
		fmt.Printf("[image_ws] generate upstream error conversationID=%d messageAssistantID=%d err=%v\n", req.ConversationID, req.MessageAssistantID, err)
		if saveErr := utils.SaveAssistantImageErrorMessage(req.ConversationID, req.MessageAssistantID, req.Model, req.Prompt, err.Error()); saveErr != nil {
			fmt.Printf("保存图片错误消息失败: %v\n", saveErr)
		}
		sendWSResponse(conn, "generate_response", MSG{Success: false, Error: err.Error(), ConversationID: req.ConversationID, MessageAssistantID: req.MessageAssistantID, ModelName: utils.GetModelName(req.Model)})
		sendWSResponse(conn, "generate_end", gin.H{"conversationID": req.ConversationID, "messageAssistantID": req.MessageAssistantID, "pointsDeducted": 0})
		return
	}

	imageBase64 := strings.TrimSpace(resp.Data[0].B64JSON)
	if imageBase64 == "" {
		errMsg := "生图结果缺少 base64 数据"
		if saveErr := utils.SaveAssistantImageErrorMessage(req.ConversationID, req.MessageAssistantID, req.Model, req.Prompt, errMsg); saveErr != nil {
			fmt.Printf("保存图片错误消息失败: %v\n", saveErr)
		}
		sendWSResponse(conn, "generate_response", MSG{Success: false, Error: errMsg, ConversationID: req.ConversationID, MessageAssistantID: req.MessageAssistantID, ModelName: utils.GetModelName(req.Model)})
		sendWSResponse(conn, "generate_end", gin.H{"conversationID": req.ConversationID, "messageAssistantID": req.MessageAssistantID, "pointsDeducted": 0})
		return
	}
	imageBase64 = "data:image/png;base64," + imageBase64

	if err := utils.SaveAssistantImageMessage(req.ConversationID, req.MessageAssistantID, req.Model, req.Prompt, imageBase64); err != nil {
		sendWSResponse(conn, "generate_response", MSG{Success: false, Error: "保存图片消息失败: " + err.Error(), ConversationID: req.ConversationID, MessageAssistantID: req.MessageAssistantID})
		sendWSResponse(conn, "generate_end", gin.H{"conversationID": req.ConversationID, "messageAssistantID": req.MessageAssistantID, "pointsDeducted": 0})
		return
	}

	if plannedPointsDeducted > 0 {
		if err := utils.AddPoints(user.ID, -plannedPointsDeducted, "使用生图模型"); err != nil {
			if saveErr := utils.SaveAssistantImageErrorMessage(req.ConversationID, req.MessageAssistantID, req.Model, req.Prompt, "扣除积分失败: "+err.Error()); saveErr != nil {
				fmt.Printf("保存图片错误消息失败: %v\n", saveErr)
			}
			sendWSResponse(conn, "generate_response", MSG{Success: false, Error: "扣除积分失败: " + err.Error(), ConversationID: req.ConversationID, MessageAssistantID: req.MessageAssistantID})
			sendWSResponse(conn, "generate_end", gin.H{"conversationID": req.ConversationID, "messageAssistantID": req.MessageAssistantID, "pointsDeducted": 0})
			return
		}
	}

	sendWSResponse(conn, "generate_response", MSG{
		Success:            true,
		Content:            "",
		Base64:             imageBase64,
		ConversationID:     req.ConversationID,
		MessageAssistantID: req.MessageAssistantID,
		ModelName:          utils.GetModelName(req.Model),
	})
	sendWSResponse(conn, "generate_end", gin.H{
		"conversationID":     req.ConversationID,
		"messageAssistantID": req.MessageAssistantID,
		"pointsDeducted":     plannedPointsDeducted,
		"pointsDeductReason": "使用图像创作工具",
	})
}

func handleWSImageEdit(conn *websocket.Conn, user utils.User, req WSRequest) {
	fmt.Printf("[image_ws] edit start userID=%d conversationID=%d messageUserID=%d messageAssistantID=%d model=%s imageMessageID=%d\n", user.ID, req.ConversationID, req.MessageUserID, req.MessageAssistantID, req.Model, req.ImageMessageID)
	plannedPointsDeducted, ok := ensureUserPoints(conn, user, req.Model, false, "image_edit_error")
	if !ok {
		return
	}
	// 图片编辑时需要保存用户消息
	if err := utils.SaveUserImageMessage(req.ConversationID, req.MessageUserID, req.Prompt, req.Base64); err != nil {
		fmt.Printf("保存图片用户消息失败: %v\n", err)
	}
	if strings.TrimSpace(req.Prompt) == "" {
		errMsg := "prompt 不能为空"
		if err := utils.SaveAssistantImageErrorMessage(req.ConversationID, req.MessageAssistantID, req.Model, req.Prompt, errMsg); err != nil {
			fmt.Printf("保存图片错误消息失败: %v\n", err)
		}
		sendWSResponse(conn, "generate_response", MSG{Success: false, Error: errMsg, ConversationID: req.ConversationID, MessageAssistantID: req.MessageAssistantID, ModelName: utils.GetModelName(req.Model)})
		sendWSResponse(conn, "generate_end", gin.H{"conversationID": req.ConversationID, "messageAssistantID": req.MessageAssistantID, "pointsDeducted": 0})
		return
	}
	if req.ImageMessageID <= 0 {
		errMsg := "缺少待编辑图片 messageID"
		if err := utils.SaveAssistantImageErrorMessage(req.ConversationID, req.MessageAssistantID, req.Model, req.Prompt, errMsg); err != nil {
			fmt.Printf("保存图片错误消息失败: %v\n", err)
		}
		sendWSResponse(conn, "generate_response", MSG{Success: false, Error: errMsg, ConversationID: req.ConversationID, MessageAssistantID: req.MessageAssistantID, ModelName: utils.GetModelName(req.Model)})
		sendWSResponse(conn, "generate_end", gin.H{"conversationID": req.ConversationID, "messageAssistantID": req.MessageAssistantID, "pointsDeducted": 0})
		return
	}

	sourceBase64, err := utils.GetMessageBase64ByID(req.ImageMessageID)
	if err != nil {
		if saveErr := utils.SaveAssistantImageErrorMessage(req.ConversationID, req.MessageAssistantID, req.Model, req.Prompt, err.Error()); saveErr != nil {
			fmt.Printf("保存图片错误消息失败: %v\n", saveErr)
		}
		sendWSResponse(conn, "generate_response", MSG{Success: false, Error: err.Error(), ConversationID: req.ConversationID, MessageAssistantID: req.MessageAssistantID, ModelName: utils.GetModelName(req.Model)})
		sendWSResponse(conn, "generate_end", gin.H{"conversationID": req.ConversationID, "messageAssistantID": req.MessageAssistantID, "pointsDeducted": 0})
		return
	}

	resp, err := utils.EditImage(context.Background(), utils.ImageEditRequest{
		Model:   req.Model,
		Prompt:  req.Prompt,
		Images:  []string{sourceBase64},
		Mask:    req.MaskBase64,
		N:       req.N,
		Size:    req.Size,
		Quality: req.Quality,
	})
	if err != nil {
		fmt.Printf("[image_ws] edit upstream error conversationID=%d messageAssistantID=%d err=%v\n", req.ConversationID, req.MessageAssistantID, err)
		if saveErr := utils.SaveAssistantImageErrorMessage(req.ConversationID, req.MessageAssistantID, req.Model, req.Prompt, err.Error()); saveErr != nil {
			fmt.Printf("保存图片错误消息失败: %v\n", saveErr)
		}
		sendWSResponse(conn, "generate_response", MSG{Success: false, Error: err.Error(), ConversationID: req.ConversationID, MessageAssistantID: req.MessageAssistantID, ModelName: utils.GetModelName(req.Model)})
		sendWSResponse(conn, "generate_end", gin.H{"conversationID": req.ConversationID, "messageAssistantID": req.MessageAssistantID, "pointsDeducted": 0})
		return
	}

	imageBase64 := strings.TrimSpace(resp.Data[0].B64JSON)
	if imageBase64 == "" {
		errMsg := "图片编辑结果缺少 base64 数据"
		if err := utils.SaveAssistantImageErrorMessage(req.ConversationID, req.MessageAssistantID, req.Model, req.Prompt, errMsg); err != nil {
			fmt.Printf("保存图片错误消息失败: %v\n", err)
		}
		sendWSResponse(conn, "generate_response", MSG{Success: false, Error: errMsg, ConversationID: req.ConversationID, MessageAssistantID: req.MessageAssistantID, ModelName: utils.GetModelName(req.Model)})
		sendWSResponse(conn, "generate_end", gin.H{"conversationID": req.ConversationID, "messageAssistantID": req.MessageAssistantID, "pointsDeducted": 0})
		return
	}
	imageBase64 = "data:image/png;base64," + imageBase64

	if err := utils.SaveAssistantImageMessage(req.ConversationID, req.MessageAssistantID, req.Model, req.Prompt, imageBase64); err != nil {
		sendWSResponse(conn, "generate_response", MSG{Success: false, Error: "保存图片消息失败: " + err.Error(), ConversationID: req.ConversationID, MessageAssistantID: req.MessageAssistantID})
		sendWSResponse(conn, "generate_end", gin.H{"conversationID": req.ConversationID, "messageAssistantID": req.MessageAssistantID, "pointsDeducted": 0})
		return
	}

	if plannedPointsDeducted > 0 {
		if err := utils.AddPoints(user.ID, -plannedPointsDeducted, "使用图片编辑模型"); err != nil {
			if saveErr := utils.SaveAssistantImageErrorMessage(req.ConversationID, req.MessageAssistantID, req.Model, req.Prompt, "扣除积分失败: "+err.Error()); saveErr != nil {
				fmt.Printf("保存图片错误消息失败: %v\n", saveErr)
			}
			sendWSResponse(conn, "generate_response", MSG{Success: false, Error: "扣除积分失败: " + err.Error(), ConversationID: req.ConversationID, MessageAssistantID: req.MessageAssistantID})
			sendWSResponse(conn, "generate_end", gin.H{"conversationID": req.ConversationID, "messageAssistantID": req.MessageAssistantID, "pointsDeducted": 0})
			return
		}
	}

	sendWSResponse(conn, "generate_response", MSG{
		Success:            true,
		Content:            "",
		Base64:             imageBase64,
		ConversationID:     req.ConversationID,
		MessageAssistantID: req.MessageAssistantID,
		ModelName:          utils.GetModelName(req.Model),
	})
	sendWSResponse(conn, "generate_end", gin.H{
		"conversationID":     req.ConversationID,
		"messageAssistantID": req.MessageAssistantID,
		"pointsDeducted":     plannedPointsDeducted,
		"pointsDeductReason": "使用图像创作工具",
	})
}

// WebSocket: STT
func handleWSSTT(conn *websocket.Conn, user utils.User, base64 string) {
	if !utils.IsActiveMember(&user) {
		if user.Points < 1 {
			sendWSResponse(conn, "stt_error", gin.H{"error": "积分不足"})
			return
		}
		utils.AddPoints(user.ID, -1, "使用语音模型")
	}
	data := utils.STT(base64)
	sendWSResponse(conn, "stt_response", gin.H{"data": data})
}

// WebSocket: 检查是否有进行中的对话，用于续流
func handleWSResumeCheck(conn *websocket.Conn, userID int64, conversationID int64) {
	fmt.Printf("[续流检查] 用户 ID=%d, 对话 ID=%d\n", userID, conversationID)

	utils.ResumeCheckRegistryMutex.Lock()
	if lastAt, exists := utils.ResumeCheckRegistry[conversationID]; exists && time.Since(lastAt) < 3*time.Second {
		utils.ResumeCheckRegistryMutex.Unlock()
		sendWSResponse(conn, "resume_status", gin.H{
			"status":  "streaming",
			"message": "续流已接管，忽略重复刷新",
		})
		return
	}
	utils.ResumeCheckRegistry[conversationID] = time.Now()
	utils.ResumeCheckRegistryMutex.Unlock()

	threadID := strconv.FormatInt(conversationID, 10)
	utils.ThreadMutex.RLock()
	_, threadExists := utils.ThreadRegistry[threadID]
	utils.ThreadMutex.RUnlock()

	if !threadExists {
		sendWSResponse(conn, "resume_status", gin.H{
			"status":  "completed",
			"message": "没有进行中的对话",
		})
		return
	}

	utils.MessageContentCacheMutex.RLock()
	type resumeMessage struct {
		messageAssistantID int64
		content           *utils.MessageContent
	}
	var pendingMessages []resumeMessage
	cacheCount := 0
	for messageAssistantID, content := range utils.MessageContentCache {
		if content == nil || content.Completed {
			continue
		}
		cacheCount++
		fmt.Printf("[续流检查] 缓存消息 ID=%d, Completed=%v, 内容长度=%d\n",
			messageAssistantID, content.Completed, len(content.Content))

		_, msgUserID, err := utils.GetMessageWithUser(messageAssistantID)
		if err != nil {
			utils.ConversationIDMessageIDsMutex.RLock()
			for convID, convMsgID := range utils.ConversationIDMessageIDs {
				if convMsgID.MessageAssistantID != messageAssistantID {
					continue
				}
				var conv utils.Conversation
				if err2 := utils.GetDB().Table("conversations").Where("id = ?", convID).First(&conv).Error; err2 == nil {
					msgUserID = conv.UserID
					err = nil
					break
				}
			}
			utils.ConversationIDMessageIDsMutex.RUnlock()
			if err != nil {
				fmt.Printf("[续流检查] 无法确定消息归属：%v\n", err)
				continue
			}
		}

		if msgUserID == userID {
			pendingMessages = append(pendingMessages, resumeMessage{
				messageAssistantID: messageAssistantID,
				content:           content,
			})
		}
	}
	utils.MessageContentCacheMutex.RUnlock()

	fmt.Printf("[续流检查] 缓存总数=%d, 匹配的消息数=%d, threadExists=%v\n", cacheCount, len(pendingMessages), threadExists)

	if len(pendingMessages) == 0 {
		// 检查是否有缓存的图片工具调用结果
		utils.ImageToolResultCacheMutex.RLock()
		var imageToolResults []*utils.ImageToolResult
		for _, result := range utils.ImageToolResultCache {
			if result.ConversationID == conversationID {
				imageToolResults = append(imageToolResults, result)
			}
		}
		utils.ImageToolResultCacheMutex.RUnlock()

		if len(imageToolResults) > 0 {
			// 先声明进入续流状态
			sendWSResponse(conn, "resume_status", gin.H{
				"status":  "resuming",
				"message": "检测到缓存的图片生成结果，正在续流...",
			})

			// 回放缓存的图片工具调用结果
			for _, result := range imageToolResults {
				fmt.Printf("[续流回放] 回放图片工具调用结果 toolID=%s\n", result.ToolID)
				sendWSResponse(conn, "generate_response", gin.H{
					"success":         true,
					"content":         "",
					"base64":          result.Base64Data,
					"messageKind":     "image",
					"conversationID":  result.ConversationID,
					"messageAssistantID": result.MessageAssistantID,
					"isCached":        true,
					"isUserMessage":   false,
					"streamSource":    "resume",
				})
			}

			// 发送结束信号
			sendWSResponse(conn, "resume_status", gin.H{
				"status":  "completed",
				"message": "图片生成结果已发送",
			})
			return
		}

		sendWSResponse(conn, "resume_status", gin.H{
			"status":  "streaming",
			"message": "生成正在进行中，但暂无可续传缓存",
		})
		return
	}
	hasRenderableContent := false
	for _, msg := range pendingMessages {
		if msg.content != nil && (msg.content.ReasoningContent != "" || msg.content.Content != "") {
			hasRenderableContent = true
			break
		}
	}

	if hasRenderableContent {
		// 先声明进入续流状态，让前端先创建占位消息，再回放缓存内容
		sendWSResponse(conn, "resume_status", gin.H{
			"status":  "resuming",
			"message": "检测到缓存的对话内容，正在续流...",
		})

		for _, msg := range pendingMessages {
			content := msg.content
			if content == nil {
				continue
			}
			content.ResumeMode = true
			if content.ReasoningContent != "" {
				sendWSResponse(conn, "generate_response", MSG{
					Success:            true,
					ReasoningContent:   content.ReasoningContent,
					ReasoningTime:      content.ReasoningTime,
					ConversationID:     conversationID,
					MessageAssistantID: msg.messageAssistantID,
					IsCached:           true,
					StreamSource:       "resume",
				})
				time.Sleep(50 * time.Millisecond)
			}
			if content.Content != "" {
				sendWSResponse(conn, "generate_response", MSG{
					Success:            true,
					Content:            content.Content,
					ConversationID:     conversationID,
					MessageAssistantID: msg.messageAssistantID,
					IsCached:           true,
					StreamSource:       "resume",
				})
				time.Sleep(50 * time.Millisecond)
			}
		}
		sendWSResponse(conn, "resume_status", gin.H{
			"status":  "streaming",
			"message": "缓存内容已发送，继续接收后续内容",
		})
		return
	}

	if threadExists {
		sendWSResponse(conn, "resume_status", gin.H{
			"status":  "streaming",
			"message": "生成正在进行中，将继续接收后续内容",
		})
		return
	}

	sendWSResponse(conn, "resume_status", gin.H{
		"status":  "completed",
		"message": "没有进行中的对话",
	})
}

// @Summary 生成 AI 回复
// @Description 根据用户输入生成 AI 回复，使用 WebSocket 流式传输
// @Tags Chat
// @Accept json
// @Produce application/json
// @Param request body generateRequest true "生成请求参数"
// @Success 200 {object} generateResponseSuccess "流式响应，返回 AI 生成内容"
// @Failure 400 {object} generateResponseFailed "生成失败"
// @Router /chat/generate [post]
func generateHandler(c *gin.Context) {
	var req generateRequest
	err := c.ShouldBindJSON(&req)
	if err != nil {
		c.JSON(400, gin.H{
			"success": false,
			"error":   err,
		})
		return
	}

	User, err := getCurrentUser(c)
	if err != nil {
		c.JSON(400, gin.H{
			"success": false,
			"error":   err,
		})
		return
	}
	if !utils.IsActiveMember(&User) {
		User.IsMember = false
		User.MemberLevel = "free"
	}

	config := utils.GetConfig()
	for _, m := range config.Models {
		if m.ID == req.Model {
			if req.Reasoning == true && m.Reasoning != req.Model {
				if User.IsMember == true {
					if User.MemberLevel == "VIP" {
						if User.Points < int(math.Ceil((math.Ceil(float64(m.Points/2))))*1.5) {
							c.JSON(400, gin.H{
								"success": false,
								"error":   "积分不足",
							})
							return
						}
						if err := utils.AddPoints(User.ID, -int(math.Ceil((math.Ceil(float64(m.Points/2))))*1.5), "使用大语言模型"); err != nil {
							c.JSON(500, gin.H{
								"success": false,
								"error":   "扣除积分失败: " + err.Error(),
							})
							return
						}
					}
				} else {
					if User.Points < int(math.Ceil((math.Ceil(float64(m.Points))))*1.5) {
						c.JSON(400, gin.H{
							"success": false,
							"error":   "积分不足",
						})
						return
					}
					if err := utils.AddPoints(User.ID, -int(math.Ceil((math.Ceil(float64(m.Points))))*1.5), "使用大语言模型"); err != nil {
						c.JSON(500, gin.H{
							"success": false,
							"error":   "扣除积分失败: " + err.Error(),
						})
						return
					}
				}
			} else {
				if User.IsMember == true {
					if User.MemberLevel == "VIP" {
						if User.Points < int((math.Ceil(float64(m.Points / 2)))) {
							c.JSON(400, gin.H{
								"success": false,
								"error":   "积分不足",
							})
							return
						}
						if err := utils.AddPoints(User.ID, -int((math.Ceil(float64(m.Points / 2)))), "使用大语言模型"); err != nil {
							c.JSON(500, gin.H{
								"success": false,
								"error":   "扣除积分失败: " + err.Error(),
							})
							return
						}
					}
				} else {
					if User.Points < m.Points {
						c.JSON(400, gin.H{
							"success": false,
							"error":   "积分不足",
						})
						return
					}
					if err := utils.AddPoints(User.ID, -m.Points, "使用大语言模型"); err != nil {
						c.JSON(500, gin.H{
							"success": false,
							"error":   "扣除积分失败: " + err.Error(),
						})
						return
					}
				}
			}
		}
	}

	params := utils.ModelParameters{
		Temperature:      req.Temperature,
		TopP:             req.TopP,
		FrequencyPenalty: req.FrequencyPenalty,
		PresencePenalty:  req.PresencePenalty,
	}
	resp := utils.ThreadOpenai(req.ConversationID, req.MessageUserID, req.MessageAssistantID, req.Model, req.Prompt, req.Base64, req.Reasoning, params)
	for response := range resp {
		var msg MSG
		var parsedResponse utils.Response
		err := json.Unmarshal([]byte(response), &parsedResponse)
		if err != nil {
			msg = MSG{
				Success: false,
				Error:   err.Error(),
			}
			jsonData, _ := json.Marshal(msg)
			// WebSocket 模式：通过 WebSocket 发送
			wsMutex.RLock()
			wsConn, wsExists := wsConnections[req.ConversationID]
			wsMutex.RUnlock()
			if wsExists {
				wsConn.WriteMessage(websocket.TextMessage, jsonData)
			}
			continue
		}

		if parsedResponse.Error != "" {
			msg = MSG{
				Success: false,
				Error:   parsedResponse.Error,
			}
			jsonData, _ := json.Marshal(msg)
			// WebSocket 模式：通过 WebSocket 发送
			wsMutex.RLock()
			wsConn, wsExists := wsConnections[req.ConversationID]
			wsMutex.RUnlock()
			if wsExists {
				wsConn.WriteMessage(websocket.TextMessage, jsonData)
			}
			continue
		}

		reasoningTime, reasoningContent, _ := utils.ParseThinkBlock(parsedResponse.ReasoningContent)
		msg = MSG{
			Success:            true,
			ReasoningContent:   reasoningContent,
			ReasoningTime:      reasoningTime,
			Content:            parsedResponse.Content,
			ConversationID:     req.ConversationID,
			MessageAssistantID: req.MessageAssistantID,
			StreamSource:       "live",
		}

		jsonData, _ := json.Marshal(msg)
		// WebSocket 模式：通过 WebSocket 发送
		wsMutex.RLock()
		wsConn, wsExists := wsConnections[req.ConversationID]
		wsMutex.RUnlock()
		if wsExists {
			wsConn.WriteMessage(websocket.TextMessage, jsonData)
		}
	}
}

// @Summary 获取线程列表
// @Description 获取当前用户的线程列表
// @Tags Chat
// @Accept json
// @Produce json
// @Success 200 {object} threadListResponseSuccess "获取线程列表成功"
// @Failure 400 {object} threadListResponseFailed "获取线程列表失败"
// @Router /chat/thread_list [post]
func threadListHandler(c *gin.Context) {
	User, err := getCurrentUser(c)
	if err != nil {
		c.JSON(400, gin.H{
			"success": false,
			"error":   err,
		})
		return
	}
	list, err := utils.GetThreadList(User.ID)
	if err != nil {
		c.JSON(400, gin.H{
			"success": false,
			"error":   err,
		})
	}
	c.JSON(200, gin.H{
		"success":     true,
		"thread_list": list,
	})
}

// @Summary 停止生成
// @Description 停止指定对话的 AI 生成过程
// @Tags Chat
// @Accept json
// @Produce json
// @Param request body stopRequest true "停止生成请求参数"
// @Success 200 {object} stopResponseSuccess "停止生成成功"
// @Failure 400 {object} stopResponseFailed "停止生成失败"
// @Router /chat/stop [post]
func stopHandler(c *gin.Context) {
	var req stopRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(400, gin.H{
			"success": false,
			"error":   err,
		})
		return
	}

	if utils.KillThread(strconv.FormatInt(req.ConversationID, 10)) != true {
		c.JSON(400, gin.H{
			"success": false,
			"error":   "内部错误",
		})
		return
	}

	// 关闭 WebSocket 连接
	wsMutex.Lock()
	if wsConn, exists := wsConnections[req.ConversationID]; exists {
		wsConn.Close()
		delete(wsConnections, req.ConversationID)
	}
	wsMutex.Unlock()

	c.JSON(200, gin.H{
		"success": true,
	})
}

// @Summary 创建新对话
// @Description 为当前用户创建一个新的对话
// @Tags Chat
// @Produce json
// @Success 200 {object} newConversationResponseSuccess "创建新对话成功"
// @Failure 400 {object} newConversationResponseFailed "创建新对话失败"
// @Router /chat/new_conversation [get]
func newConversationHandler(c *gin.Context) {
	User, err := getCurrentUser(c)
	if err != nil {
		c.JSON(400, gin.H{
			"success": false,
			"error":   err,
		})
		return
	}
	conversationID := utils.CreateConversation(User.ID)
	c.JSON(200, gin.H{
		"success":        true,
		"conversationID": strconv.FormatInt(conversationID, 10),
	})
}

// @Summary 删除对话
// @Description 删除指定的对话及其相关消息
// @Tags Chat
// @Accept json
// @Produce json
// @Param request body deleteConversationRequest true "删除对话请求参数"
// @Success 200 {object} deleteConversationResponseSuccess "删除对话成功"
// @Failure 400 {object} deleteConversationResponseFailed "删除对话失败"
// @Router /chat/delete_conversation [post]
func deleteConversationHandler(c *gin.Context) {
	var req deleteConversationRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(400, gin.H{
			"success": false,
			"error":   err,
		})
		return
	}
	err := utils.DeleteConversation(req.ConversationID)
	if err != nil {
		c.JSON(400, gin.H{
			"success": false,
			"error":   err,
		})
		return
	}
	c.JSON(200, gin.H{
		"success": true,
	})
}

// @Summary 重命名对话
// @Description 重命名指定的对话
// @Tags Chat
// @Accept json
// @Produce json
// @Param request body renameConversationRequest true "重命名对话请求参数"
// @Success 200 {object} renameConversationResponseSuccess "重命名对话成功"
// @Failure 400 {object} renameConversationResponseFailed "重命名对话失败"
// @Router /chat/rename_conversation [post]
func renameConversationHandler(c *gin.Context) {
	User, err := getCurrentUser(c)
	if err != nil {
		c.JSON(400, gin.H{
			"success": false,
			"error":   err,
		})
		return
	}

	var req renameConversationRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(400, gin.H{
			"success": false,
			"error":   err,
		})
		return
	}

	title := strings.TrimSpace(req.Title)
	if title == "" {
		c.JSON(400, gin.H{
			"success": false,
			"error":   "标题不能为空",
		})
		return
	}
	if utf8.RuneCountInString(title) > 100 {
		c.JSON(400, gin.H{
			"success": false,
			"error":   "标题长度不能超过100个字符",
		})
		return
	}

	err = utils.RenameConversation(User.ID, req.ConversationID, title)
	if err != nil {
		c.JSON(400, gin.H{
			"success": false,
			"error":   err,
		})
		return
	}
	c.JSON(200, gin.H{
		"success": true,
	})
}

// @Summary 获取对话列表
// @Description 获取当前用户的所有对话列表
// @Tags Chat
// @Produce json
// @Success 200 {object} conversationsListResponseSuccess "获取对话列表成功"
// @Failure 400 {object} conversationsListResponseFailed "获取对话列表失败"
// @Router /chat/conversations_list [get]
func conversationsListHandler(c *gin.Context) {
	User, err := getCurrentUser(c)
	if err != nil {
		c.JSON(400, gin.H{
			"success": false,
			"error":   err,
		})
		return
	}
	var conversations []utils.Conversation
	utils.GetDB().Table("conversations").Where("user_id = ?", User.ID).Order("updated_at DESC").Find(&conversations)
	c.JSON(200, gin.H{
		"success":       true,
		"conversations": conversations,
	})
}

// @Summary 获取历史消息
// @Description 获取指定对话的聊天记录
// @Tags Chat
// @Accept json
// @Produce json
// @Param request body messagesListRequest true "获取历史消息请求参数"
// @Success 200 {object} messagesListResponseSuccess "获取历史消息成功"
// @Failure 400 {object} messagesListResponseFailed "获取历史消息失败"
// @Router /chat/messages_list [post]
func messagesListHandler(c *gin.Context) {
	var req messagesListRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(400, gin.H{
			"success": false,
			"error":   err,
		})
		return
	}
	messages, err := utils.LoadConversationHistoryFormat2(req.ConversationID)
	if err != nil {
		c.JSON(400, gin.H{
			"success": false,
			"error":   err,
		})
		return
	}

	c.JSON(200, gin.H{
		"success":  true,
		"messages": messages,
	})
}

// @Summary 分享消息
// @Description 将指定的消息 ID 列表创建为分享链接
// @Tags Chat
// @Accept json
// @Produce json
// @Param request body shareMessagesRequest true "分享消息请求参数"
// @Success 200 {object} shareMessagesResponseSuccess "创建分享成功"
// @Failure 400 {object} shareMessagesResponseFailed "创建分享失败"
// @Router /chat/share_messages [post]
func shareMessagesHandler(c *gin.Context) {
	user, err := getCurrentUser(c)
	if err != nil {
		c.JSON(400, gin.H{
			"success": false,
			"error":   err.Error(),
		})
		return
	}

	var req shareMessagesRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(400, gin.H{
			"success": false,
			"error":   err.Error(),
		})
		return
	}
	if len(req.MessageIDs) == 0 {
		c.JSON(400, gin.H{
			"success": false,
			"error":   "请选择要分享的消息",
		})
		return
	}
	// 将字符串类型的 MessageIDs 转换为 int64 类型
	messageIDs := make([]int64, 0, len(req.MessageIDs))
	for _, id := range req.MessageIDs {
		parsedID, err := strconv.ParseInt(id, 10, 64)
		if err != nil {
			c.JSON(400, gin.H{
				"success": false,
				"error":   "无效的消息 ID: " + id,
			})
			return
		}
		messageIDs = append(messageIDs, parsedID)
	}

	belongsToUser, err := utils.DoesMessagesBelongToUser(messageIDs, user.ID)
	if err != nil {
		c.JSON(400, gin.H{
			"success": false,
			"error":   err.Error(),
		})
		return
	}
	if !belongsToUser {
		c.JSON(403, gin.H{
			"success": false,
			"error":   "只能分享当前用户自己的消息",
		})
		return
	}

	shareID, err := utils.SaveShareMessages(messageIDs)
	if err != nil {
		c.JSON(400, gin.H{
			"success": false,
			"error":   err.Error(),
		})
		return
	}
	c.JSON(200, gin.H{
		"success":  true,
		"share_id": shareID,
	})

}

// @Summary 获取分享内容
// @Description 根据分享 ID 获取分享的消息内容
// @Tags Chat
// @Produce json
// @Param shareID path string true "分享 ID"
// @Success 200 {object} loadShareMessagesResponseSuccess "获取分享内容成功"
// @Failure 400 {object} loadShareMessagesResponseFailed "获取分享内容失败"
// @Router /chat/{shareID} [get]
func loadShareMessagesHandler(c *gin.Context) {
	shareID := c.Param("shareID")
	messageIDs, err := utils.LoadShareMessages(shareID)
	if err != nil {
		c.JSON(400, gin.H{
			"success": false,
			"error":   err.Error(),
		})
		return
	}

	messages, err := utils.LoadSharedMessagesByIDs(messageIDs)
	if err != nil {
		c.JSON(400, gin.H{
			"success": false,
			"error":   err.Error(),
		})
		return
	}

	c.JSON(200, gin.H{
		"success":  true,
		"messages": messages,
	})
}

// @Summary 删除消息
// @Description 删除指定的消息
// @Tags Chat
// @Accept json
// @Produce json
// @Param request body deleteMessageRequest true "删除消息请求参数"
// @Success 200 {object} deleteMessageResponseSuccess "删除消息成功"
// @Failure 400 {object} deleteMessageResponseFailed "删除消息失败"
// @Router /chat/delete_message [post]
func deleteMessageHandler(c *gin.Context) {
	var req deleteMessageRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(400, gin.H{
			"success": false,
			"error":   err,
		})
		return
	}

	utils.DeleteMessage(req.MessageID)
	c.JSON(200, gin.H{
		"success": true,
	})
}

// @Summary 文字转语音
// @Description 将文字转换为语音
// @Tags Chat
// @Accept json
// @Produce json
// @Param request body ttsRequest true "文字转语音请求参数"
// @Success 200 {object} ttsResponseSuccess "文字转语音成功"
// @Failure 400 {object} ttsResponseFailed "文字转语音失败"
// @Router /chat/tts [post]
func ttsHandler(c *gin.Context) {
	var req ttsRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(400, gin.H{
			"success": false,
			"error":   err,
		})
		return
	}
	user, err := getCurrentUser(c)
	if err != nil {
		c.JSON(400, gin.H{
			"success": false,
			"error":   err,
		})
		return
	}
	if utils.IsActiveMember(&user) == true && !(user.MemberLevel == "SVIP") {
		if user.MemberLevel == "VIP" {
			if user.Points < 1 {
				c.JSON(400, gin.H{
					"success": false,
					"error":   "积分不足",
				})
				return
			}
			utils.AddPoints(user.ID, -1, "使用语音模型")
		} else {
			c.JSON(400, gin.H{
				"success": false,
				"error":   "未知 MemberLevel",
			})
			return
		}
	} else {
		if user.Points < 2 {
			c.JSON(400, gin.H{
				"success": false,
				"error":   "积分不足",
			})
			return
		}
		utils.AddPoints(user.ID, -2, "使用语音模型")
	}
	data := utils.TTS(req.Prompt)
	c.JSON(200, gin.H{
		"success": true,
		"data":    data,
	})
}

// @Summary 语音转文字
// @Description 将语音转换为文字
// @Tags Chat
// @Accept json
// @Produce json
// @Param request body sttRequest true "语音转文字请求参数"
// @Success 200 {object} sttResponseSuccess "语音转文字成功"
// @Failure 400 {object} sttResponseFailed "语音转文字失败"
// @Router /chat/stt [post]
func sttHandler(c *gin.Context) {
	var req sttRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(400, gin.H{
			"success": false,
			"error":   err,
		})
		return
	}
	user, err := getCurrentUser(c)
	if err != nil {
		c.JSON(400, gin.H{
			"success": false,
			"error":   err,
		})
		return
	}
	if utils.IsActiveMember(&user) == false {
		if user.Points < 1 {
			c.JSON(400, gin.H{
				"success": false,
				"error":   "积分不足",
			})
			return
		}
		utils.AddPoints(user.ID, -1, "使用语音模型")
	}
	data := utils.STT(req.Base64)
	c.JSON(200, gin.H{
		"success": true,
		"data":    data,
	})
}

// 请求和响应结构体定义
type generateRequest struct {
	ConversationID     int64   `json:"conversationID" example:"1234567890"`
	MessageUserID      int64   `json:"messageUserID" example:"1234567891"`
	MessageAssistantID int64   `json:"messageAssistantID" example:"1234567892"`
	Prompt             string  `json:"prompt" example:"你好，帮我写一个 Hello World 程序"`
	Model              string  `json:"model" example:"gpt-3.5-turbo"`
	Base64             string  `json:"base64" example:"data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8/5+hHgAHggJ/PchI7wAAAABJRU5ErkJggg=="`
	Reasoning          bool    `json:"reasoning" example:"false"`
	Temperature        *float32 `json:"temperature,omitempty"`
	TopP               *float32 `json:"top_p,omitempty"`
	FrequencyPenalty   *float32 `json:"frequency_penalty,omitempty"`
	PresencePenalty    *float32 `json:"presence_penalty,omitempty"`
}

type generateResponseSuccess struct {
	Success          bool   `json:"success" example:"true"`
	Error            string `json:"error"`
	ReasoningContent string `json:"reasoningContent"`
	ReasoningTime    int    `json:"reasoningTime"`
	Content          string `json:"content"`
}

type generateResponseFailed struct {
	Success          bool   `json:"success" example:"false"`
	Error            string `json:"error" example:"ERROR:"`
	ReasoningContent string `json:"reasoningContent"`
	ReasoningTime    int    `json:"reasoningTime"`
	Content          string `json:"content"`
}

type threadListResponseSuccess struct {
	Success    bool                                    `json:"success" example:"true"`
	ThreadList map[int64]utils.ConversationIDMessageID `json:"thread_list"`
}

type threadListResponseFailed struct {
	Success bool   `json:"success" example:"false"`
	Error   string `json:"error"`
}

type stopRequest struct {
	ConversationID int64 `json:"conversationID" example:"1234567890"`
}

type stopResponseSuccess struct {
	Success bool `json:"success" example:"true"`
}

type stopResponseFailed struct {
	Success bool   `json:"success" example:"false"`
	Error   string `json:"error" example:"内部错误"`
}

type newConversationResponseSuccess struct {
	Success        bool   `json:"success" example:"true"`
	ConversationID string `json:"conversationID" example:"1234567890"`
}

type newConversationResponseFailed struct {
	Success bool   `json:"success" example:"false"`
	Error   string `json:"error"`
}

type deleteConversationRequest struct {
	ConversationID int64 `json:"conversationID" example:"1234567890"`
}

type deleteConversationResponseSuccess struct {
	Success bool `json:"success" example:"true"`
}

type deleteConversationResponseFailed struct {
	Success bool   `json:"success" example:"false"`
	Error   string `json:"error"`
}

type renameConversationRequest struct {
	ConversationID int64  `json:"conversationID" example:"1234567890"`
	Title          string `json:"title" example:"新的对话标题"`
}

type renameConversationResponseSuccess struct {
	Success bool `json:"success" example:"true"`
}

type renameConversationResponseFailed struct {
	Success bool   `json:"success" example:"false"`
	Error   string `json:"error"`
}

type conversationsListResponseSuccess struct {
	Success       bool                 `json:"success" example:"true"`
	Conversations []utils.Conversation `json:"conversations"`
}

type conversationsListResponseFailed struct {
	Success bool   `json:"success" example:"false"`
	Error   string `json:"error"`
}

type messagesListRequest struct {
	ConversationID int64 `json:"conversationID" example:"1234567890"`
}

type messagesListResponseSuccess struct {
	Success  bool   `json:"success" example:"true"`
	Messages string `json:"messages" example:"{\"role\": \"user\", \"content\": \"你好\"}"`
}

type messagesListResponseFailed struct {
	Success bool   `json:"success" example:"false"`
	Error   string `json:"error"`
}

type shareMessagesRequest struct {
	MessageIDs []string `json:"messageIDs" example:"message-id-1,message-id-2"`
}

type shareMessagesResponseSuccess struct {
	Success bool   `json:"success" example:"true"`
	ShareID string `json:"share_id" example:"a1b2c3d4e5f67890"`
}

type shareMessagesResponseFailed struct {
	Success bool   `json:"success" example:"false"`
	Error   string `json:"error"`
}

type loadShareMessagesResponseSuccess struct {
	Success  bool            `json:"success" example:"true"`
	Messages []utils.Message `json:"messages"`
}

type loadShareMessagesResponseFailed struct {
	Success bool   `json:"success" example:"false"`
	Error   string `json:"error"`
}

type deleteMessageRequest struct {
	MessageID int64 `json:"messageID" example:"1234567890"`
}

type deleteMessageResponseSuccess struct {
	Success bool `json:"success" example:"true"`
}

type deleteMessageResponseFailed struct {
	Success bool   `json:"success" example:"false"`
	Error   string `json:"error"`
}

type ttsRequest struct {
	Prompt string `json:"prompt" example:"你好，请讲一个笑话"`
}

type ttsResponseSuccess struct {
	Success bool   `json:"success" example:"true"`
	Data    []byte `json:"data"`
}

type ttsResponseFailed struct {
	Success bool   `json:"success" example:"false"`
	Error   string `json:"error"`
}

type sttRequest struct {
	Base64 string `json:"base64"`
}

type sttResponseSuccess struct {
	Success bool   `json:"success"`
	Data    string `json:"data"`
}

type sttResponseFailed struct {
	Success bool   `json:"success"`
	Error   string `json:"error"`
}
