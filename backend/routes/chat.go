package routes

import (
	"encoding/json"
	"fmt"
	"math"
	"net/http"
	"strconv"
	"sync"
	"time"
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
	Success          bool   `json:"success" default:"false"`
	Error            string `json:"error" default:""`
	ReasoningContent string `json:"reasoningContent" default:""`
	ReasoningTime    int    `json:"reasoningTime" default:""`
	Content          string `json:"content" default:""`
	IsCached         bool   `json:"isCached" default:"false"`      // 是否是缓存内容
	IsUserMessage    bool   `json:"isUserMessage" default:"false"` // 是否为用户消息
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
		// 用户未登录，直接返回，不建立 WebSocket 连接
		return
	}
	userInfo, ok := userInfoInterface.(utils.User)
	if !ok {
		// 内部错误，直接返回
		return
	}
	userInfo = utils.FilterByEmail(userInfo.Email)

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
							Success:          true,
							ReasoningContent: reasoningContent,
							ReasoningTime:    reasoningTime,
							Content:          parsedResponse.Content,
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
		case "resume_check":
			handleWSResumeCheck(conn, userInfo.ID, req.ConversationID)
		default:
			sendWSResponse(conn, "error", gin.H{"error": "未知的请求类型：" + req.Type})
		}
	}
}

// WebSocket 请求结构
type WSRequest struct {
	Type               string `json:"type"`
	ConversationID     int64  `json:"conversationID"`
	MessageUserID      int64  `json:"messageUserID"`
	MessageAssistantID int64  `json:"messageAssistantID"`
	Prompt             string `json:"prompt"`
	Model              string `json:"model"`
	Base64             string `json:"base64"`
	Reasoning          bool   `json:"reasoning"`
	MessageID          int64  `json:"messageID"`
}

// 发送 WebSocket 响应
func sendWSResponse(conn *websocket.Conn, respType string, data interface{}) {
	response := WSResponse{Type: respType, Data: data}
	jsonData, _ := json.Marshal(response)
	conn.WriteMessage(websocket.TextMessage, jsonData)
}

// WebSocket: 生成 AI 回复
func handleWSGenerate(conn *websocket.Conn, user utils.User, req WSRequest) {
	// 积分检查和扣除
	config := utils.GetConfig()
	for _, m := range config.Models {
		if m.Name == req.Model {
			if req.Reasoning && m.Reasoning != req.Model {
				if user.IsMember {
					if user.MemberLevel == "VIP" {
						if user.Points < int(math.Ceil(math.Ceil(float64(m.Points/2))*1.5)) {
							sendWSResponse(conn, "generate_error", gin.H{"error": "积分不足"})
							return
						}
						utils.AddPoints(user.ID, -int(math.Ceil(math.Ceil(float64(m.Points/2))*1.5)), "使用大语言模型")
					}
				} else {
					if user.Points < int(math.Ceil(math.Ceil(float64(m.Points))*1.5)) {
						sendWSResponse(conn, "generate_error", gin.H{"error": "积分不足"})
						return
					}
					utils.AddPoints(user.ID, -int(math.Ceil(math.Ceil(float64(m.Points))*1.5)), "使用大语言模型")
				}
			} else {
				if user.IsMember {
					if user.MemberLevel == "VIP" {
						if user.Points < int(math.Ceil(float64(m.Points/2))) {
							sendWSResponse(conn, "generate_error", gin.H{"error": "积分不足"})
							return
						}
						utils.AddPoints(user.ID, -int(math.Ceil(float64(m.Points/2))), "使用大语言模型")
					}
				} else {
					if user.Points < m.Points {
						sendWSResponse(conn, "generate_error", gin.H{"error": "积分不足"})
						return
					}
					utils.AddPoints(user.ID, -m.Points, "使用大语言模型")
				}
			}
		}
	}

	// 调用 AI 生成
	resp := utils.ThreadOpenai(req.ConversationID, req.MessageUserID, req.MessageAssistantID, req.Model, req.Prompt, req.Base64, req.Reasoning)
	for response := range resp {
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
			Success:          true,
			ReasoningContent: reasoningContent,
			ReasoningTime:    reasoningTime,
			Content:          parsedResponse.Content,
		}
		sendWSResponse(conn, "generate_response", msg)

		// 更新缓存内容已在 gpt.go 的 Openai 函数中完成，此处不再重复更新
	}

	// 生成结束，发送结束信号
	sendWSResponse(conn, "generate_end", gin.H{
		"conversationID":     req.ConversationID,
		"messageAssistantID": req.MessageAssistantID,
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
	sendWSResponse(conn, "conversations_list", gin.H{"conversations": conversations})
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

	// 检查 MessageContentCache 中所有属于当前用户的消息（不管 Completed 状态）
	utils.MessageContentCacheMutex.RLock()
	var pendingMessages []gin.H
	cacheCount := 0
	for messageAssistantID, content := range utils.MessageContentCache {
		cacheCount++
		fmt.Printf("[续流检查] 缓存消息 ID=%d, Completed=%v, 内容长度=%d\n",
			messageAssistantID, content.Completed, len(content.Content))

		// 检查这个消息是否属于当前用户
		// 方法 1：查询数据库
		_, msgUserID, err := utils.GetMessageWithUser(messageAssistantID)
		if err != nil {
			// 方法 2：检查 ConversationIDMessageIDs 映射（运行时动态创建）
			utils.ConversationIDMessageIDsMutex.RLock()
			found := false
			for convID, convMsgID := range utils.ConversationIDMessageIDs {
				if convMsgID.MessageAssistantID == messageAssistantID {
					// 通过这个对话 ID 查询用户 ID
					var conv utils.Conversation
					if err2 := utils.GetDB().Table("conversations").Where("id = ?", convID).First(&conv).Error; err2 == nil {
						msgUserID = conv.UserID
						found = true
						fmt.Printf("[续流检查] 从 ConversationIDMessageIDs 找到消息，用户 ID=%d\n", msgUserID)
						break
					}
				}
			}
			utils.ConversationIDMessageIDsMutex.RUnlock()

			if !found {
				fmt.Printf("[续流检查] 无法确定消息归属：%v\n", err)
				continue
			}
		}

		fmt.Printf("[续流检查] 消息用户 ID=%d, 当前用户 ID=%d, 匹配=%v\n",
			msgUserID, userID, msgUserID == userID)

		if msgUserID == userID {
			pendingMessages = append(pendingMessages, gin.H{
				"messageAssistantID": messageAssistantID,
				"content":            content,
			})
		}
	}
	utils.MessageContentCacheMutex.RUnlock()

	fmt.Printf("[续流检查] 缓存总数=%d, 匹配的消息数=%d\n", cacheCount, len(pendingMessages))

	if len(pendingMessages) > 0 {
		// 有缓存消息，发送续流通知
		fmt.Printf("[续流检查] 发现缓存消息，发送续流\n")
		sendWSResponse(conn, "resume_status", gin.H{
			"status":  "resuming",
			"message": "检测到缓存的对话内容，正在续流...",
		})

		// 发送缓存内容
		for _, msg := range pendingMessages {
			content := msg["content"].(*utils.MessageContent)
			_ = msg["messageAssistantID"].(int64) // 保留变量，后续可能使用

			// 问题 2 修复：在发送缓存内容之前，先发送用户消息
			// 从 ConversationIDMessageIDs 中获取用户消息 ID
			utils.ConversationIDMessageIDsMutex.RLock()
			convMsgID, ok := utils.ConversationIDMessageIDs[conversationID]
			utils.ConversationIDMessageIDsMutex.RUnlock()

			if ok {
				// 查询用户消息
				userMsg, err := utils.LoadMessage(convMsgID.MessageUserID)
				if err == nil && userMsg.Content != "" {
					sendWSResponse(conn, "generate_response", MSG{
						Success:       true,
						Content:       userMsg.Content,
						IsCached:      true,
						IsUserMessage: true, // 标记为用户消息
					})
					time.Sleep(50 * time.Millisecond)
				}
			}

			// 发送缓存的推理内容（如果有）
			if content.ReasoningContent != "" {
				sendWSResponse(conn, "generate_response", MSG{
					Success:          true,
					ReasoningContent: content.ReasoningContent,
					Content:          "",
					ReasoningTime:    content.ReasoningTime,
					IsCached:         true,
				})
				time.Sleep(50 * time.Millisecond)
			}
			// 发送缓存的正文内容
			if content.Content != "" {
				sendWSResponse(conn, "generate_response", MSG{
					Success:          true,
					ReasoningContent: "",
					Content:          content.Content,
					ReasoningTime:    0,
					IsCached:         true,
				})
				time.Sleep(50 * time.Millisecond)
			}

			// 检查生成是否还在进行
			threadID := strconv.FormatInt(conversationID, 10)
			utils.ThreadMutex.RLock()
			_, threadExists := utils.ThreadRegistry[threadID]
			utils.ThreadMutex.RUnlock()

			if threadExists && !content.Completed {
				// 生成还在进行中
				sendWSResponse(conn, "resume_status", gin.H{
					"status":  "streaming",
					"message": "生成正在进行中，将继续接收后续内容",
				})
			} else {
				// 生成已完成
				sendWSResponse(conn, "resume_status", gin.H{
					"status":  "completed",
					"message": "生成已完成",
				})
			}
		}
	} else {
		// 没有缓存消息
		fmt.Printf("[续流检查] 没有缓存消息\n")
		sendWSResponse(conn, "resume_status", gin.H{
			"status":  "completed",
			"message": "没有进行中的对话",
		})
	}
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

	config := utils.GetConfig()
	for _, m := range config.Models {
		if m.Name == req.Model {
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
						utils.AddPoints(User.ID, -int(math.Ceil((math.Ceil(float64(m.Points/2))))*1.5), "使用大语言模型")
					}
				} else {
					if User.Points < int(math.Ceil((math.Ceil(float64(m.Points))))*1.5) {
						c.JSON(400, gin.H{
							"success": false,
							"error":   "积分不足",
						})
						return
					}
					utils.AddPoints(User.ID, -int(math.Ceil((math.Ceil(float64(m.Points))))*1.5), "使用大语言模型")
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
						utils.AddPoints(User.ID, -int((math.Ceil(float64(m.Points / 2)))), "使用大语言模型")
					}
				} else {
					if User.Points < m.Points {
						c.JSON(400, gin.H{
							"success": false,
							"error":   "积分不足",
						})
						return
					}
					utils.AddPoints(User.ID, -m.Points, "使用大语言模型")
				}
			}
		}
	}

	resp := utils.ThreadOpenai(req.ConversationID, req.MessageUserID, req.MessageAssistantID, req.Model, req.Prompt, req.Base64, req.Reasoning)
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
			Success:          true,
			ReasoningContent: reasoningContent,
			ReasoningTime:    reasoningTime,
			Content:          parsedResponse.Content,
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
	var req renameConversationRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(400, gin.H{
			"success": false,
			"error":   err,
		})
		return
	}
	err := utils.RenameConversation(req.ConversationID, req.Title)
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

	Messages, err := json.Marshal(messages)
	if err != nil {
		c.JSON(400, gin.H{
			"success": false,
			"error":   err,
		})
		return
	}
	c.JSON(200, gin.H{
		"success":  true,
		"messages": string(Messages),
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
	var req shareMessagesRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(400, gin.H{
			"success": false,
			"error":   err,
		})
		return
	}
	// 将字符串类型的 MessageIDs 转换为 int64 类型
	var messageIDs []int64
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

	shareID, err := utils.SaveShareMessages(messageIDs)
	if err != nil {
		c.JSON(400, gin.H{
			"success": false,
			"error":   err,
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
			"error":   err,
		})
		return
	}
	var messages []utils.Message
	for _, m := range messageIDs {
		message, err := utils.LoadMessage(m)
		if err != nil {
			c.JSON(400, gin.H{
				"success": false,
				"error":   err,
			})
		}
		messages = append(messages, message)
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
	ConversationID     int64  `json:"conversationID" example:"1234567890"`
	MessageUserID      int64  `json:"messageUserID" example:"1234567891"`
	MessageAssistantID int64  `json:"messageAssistantID" example:"1234567892"`
	Prompt             string `json:"prompt" example:"你好，帮我写一个 Hello World 程序"`
	Model              string `json:"model" example:"gpt-3.5-turbo"`
	Base64             string `json:"base64" example:"data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8/5+hHgAHggJ/PchI7wAAAABJRU5ErkJggg=="`
	Reasoning          bool   `json:"reasoning" example:"false"`
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
