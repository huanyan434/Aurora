package routes

import (
	"encoding/json"
	"fmt"
	"math"
	"net/http"
	"strconv"
	"time"
	"utils"

	"github.com/gin-gonic/gin"
)

func ChatInit(r *gin.Engine) {
	chat := r.Group("/chat")
	{
		// 生成AI回复
		chat.POST("/generate", generateHandler)

		// 获取线程列表
		chat.POST("/thread_list", threadListHandler)

		// 停止生成
		chat.POST("/stop", stopHandler)

		// 创建新对话
		chat.GET("/new_conversation", newConversationHandler)

		// 删除对话
		chat.POST("/delete_conversation", deleteConversationHandler)

		// 获取对话列表
		chat.GET("/conversations_list", conversationsListHandler)

		// 获取历史消息
		chat.POST("/messages_list", messagesListHandler)

		// 分享消息
		chat.POST("/share_messages", shareMessagesHandler)

		// 获取分享内容
		chat.GET("/:shareID", loadShareMessagesHandler)

		// 删除消息
		chat.POST("/delete_message", deleteMessageHandler)

		// TTS
		chat.POST("/tts", ttsHandler)

		// STT
		chat.POST("/stt", sttHandler)
	}
}

type MSG struct {
	Success          bool   `json:"success" default:"false"`
	Error            string `json:"error" default:""`
	ReasoningContent string `json:"reasoningContent" default:""`
	ReasoningTime    int    `json:"reasoningTime" default:""`
	Content          string `json:"content" default:""`
}

var (
	resps = make(map[int64][]MSG)
)

// @Summary 生成AI回复
// @Description 根据用户输入生成AI回复，使用SSE流式传输
// @Tags Chat
// @Accept json
// @Produce text/event-stream
// @Param request body generateRequest true "生成请求参数"
// @Success 200 {object} generateResponseSuccess "流式响应，返回AI生成内容"
// @Failure 400 {object} generateResponseFailed "生成失败"
// @Router /chat/generate [post]
func generateHandler(c *gin.Context) {
	c.Writer.Header().Set("Content-Type", "text/event-stream")
	c.Writer.Header().Set("Cache-Control", "no-cache")
	c.Writer.Header().Set("Connection", "keep-alive")
	flusher, _ := c.Writer.(http.Flusher)
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
						utils.AddPoints(User.ID, -int(math.Ceil((math.Ceil(float64(m.Points/2))))*1.5))
					}
				} else {
					if User.Points < int(math.Ceil((math.Ceil(float64(m.Points))))*1.5) {
						c.JSON(400, gin.H{
							"success": false,
							"error":   "积分不足",
						})
						return
					}
					utils.AddPoints(User.ID, -int(math.Ceil((math.Ceil(float64(m.Points))))*1.5))
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
						utils.AddPoints(User.ID, -int((math.Ceil(float64(m.Points / 2)))))
					}
				} else {
					if User.Points < m.Points {
						c.JSON(400, gin.H{
							"success": false,
							"error":   "积分不足",
						})
						return
					}
					utils.AddPoints(User.ID, -m.Points)
				}
			}
		}
	}

	// 检查是否有之前缓存的响应数据，如果有则先发送
	if cachedResponses, exists := resps[req.ConversationID]; exists && len(cachedResponses) > 0 {
		fmt.Println("convID:", req.ConversationID, " len(cachedResponses):", len(cachedResponses))
		for n := 0; ; n++ {
			if n >= len(cachedResponses) {
				for n := 0; n < 10; n++ {
					time.Sleep(100 * time.Millisecond)
					if n < len(cachedResponses) {
						break
					}
				}
				if n < len(cachedResponses) {
					continue
				}
				return
			}
			jsonData, _ := json.Marshal(cachedResponses[n])
			_, _ = fmt.Fprintf(c.Writer, "data:%s\n\n", jsonData)
			flusher.Flush()
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
			_, _ = fmt.Fprintf(c.Writer, "data:%s\n\n", jsonData)
			flusher.Flush()
			continue
		}

		if parsedResponse.Error != "" {
			msg = MSG{
				Success: false,
				Error:   parsedResponse.Error,
			}
			jsonData, _ := json.Marshal(msg)
			_, _ = fmt.Fprintf(c.Writer, "data:%s\n\n", jsonData)
			flusher.Flush()
			continue
		}

		reasoningTime, reasoningContent, _ := utils.ParseThinkBlock(parsedResponse.ReasoningContent)
		msg = MSG{
			Success:          true,
			ReasoningContent: reasoningContent,
			ReasoningTime:    reasoningTime,
			Content:          parsedResponse.Content,
		}

		resps[req.ConversationID] = append(resps[req.ConversationID], msg)
		jsonData, _ := json.Marshal(msg)
		_, _ = fmt.Fprintf(c.Writer, "data:%s\n\n", jsonData)
		flusher.Flush()
	}
	delete(resps, req.ConversationID)
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
// @Description 停止指定对话的AI生成过程
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
// @Description 将指定的消息ID列表创建为分享链接
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
	// 将字符串类型的MessageIDs转换为int64类型
	var messageIDs []int64
	for _, id := range req.MessageIDs {
		parsedID, err := strconv.ParseInt(id, 10, 64)
		if err != nil {
			c.JSON(400, gin.H{
				"success": false,
				"error":   "无效的消息ID: " + id,
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
// @Description 根据分享ID获取分享的消息内容
// @Tags Chat
// @Produce json
// @Param shareID path string true "分享ID"
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
			utils.AddPoints(user.ID, -1)
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
		utils.AddPoints(user.ID, -2)
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
		utils.AddPoints(user.ID, -1)
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
	Prompt             string `json:"prompt" example:"你好，帮我写一个Hello World程序"`
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
