package routes

import (
	"encoding/json"
	"fmt"
	"net/http"
	"utils"

	"github.com/gin-gonic/gin"
	uuid "github.com/satori/go.uuid"
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

		// 分享消息
		chat.POST("/share_messages", shareMessagesHandler)

		// 获取分享内容
		chat.GET("/:shareID", loadShareMessagesHandler)

		// 删除消息
		chat.POST("/delete_message", deleteMessageHandler)
	}
}

// @Summary 生成AI回复
// @Description 根据用户输入生成AI回复，使用SSE流式传输
// @Tags Chat
// @Accept json
// @Produce text/event-stream
// @Param request body generateRequest true "生成请求参数"
// @Success 200 {string} string "流式响应，返回AI生成内容"
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
	for i := range config.Models {
		if req.Model == config.Models[i].Name {
			if User.IsMember == true {
				if User.MemberLevel == "VIP" {
					if User.Points < (config.Models[i].Points / 2) {
						c.JSON(400, gin.H{
							"success": false,
							"error":   "积分不足",
						})
						return
					}
					utils.AddPoints(&User, -config.Models[i].Points/2)
				}
			} else {
				if User.Points < config.Models[i].Points {
					c.JSON(400, gin.H{
						"success": false,
						"error":   "积分不足",
					})
					return
				}
				utils.AddPoints(&User, -config.Models[i].Points)
			}

		}
	}
	resp := utils.ThreadOpenai(req.ConversationID, req.Model, req.Prompt, req.Base64)
	for response := range resp {
		reasoningTime, reasoningContent, content := utils.ParseThinkBlock(response)
		msg := struct {
			Success          bool   `json:"success"`
			ReasoningContent string `json:"reasoningContent"`
			ReasoningTime    int    `json:"reasoningTime"`
			Content          string `json:"content"`
		}{
			Success:          true,
			ReasoningContent: reasoningContent,
			ReasoningTime:    reasoningTime,
			Content:          content,
		}
		jsonData, _ := json.Marshal(msg)
		_, _ = fmt.Fprintf(c.Writer, "data:%s\n\n", jsonData)
		flusher.Flush()
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
	}

	if utils.KillThread(req.ConversationID.String()) != true {
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
	conversationID := utils.CreateConversation(utils.GetDB(), User.ID)
	c.JSON(200, gin.H{
		"success":        true,
		"conversationID": conversationID,
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
	}
	err := utils.DeleteConversation(utils.GetDB(), req.ConversationID)
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
	// 将字符串类型的MessageIDs转换为uuid类型
	var messageIDs []uuid.UUID
	for _, id := range req.MessageIDs {
		parsedID, err := uuid.FromString(id)
		if err != nil {
			c.JSON(400, gin.H{
				"success": false,
				"error":   "无效的消息ID: " + id,
			})
			return
		}
		messageIDs = append(messageIDs, parsedID)
	}

	shareID, err := utils.SaveShareMessages(utils.GetDB(), messageIDs)
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
	messageIDs, err := utils.LoadShareMessages(utils.GetDB(), shareID)
	if err != nil {
		c.JSON(400, gin.H{
			"success": false,
			"error":   err,
		})
		return
	}
	var messages []utils.Message
	for _, m := range messageIDs {
		message, err := utils.LoadMessage(utils.GetDB(), m)
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

	parsedID, err := uuid.FromString(req.MessageID)
	if err != nil {
		c.JSON(400, gin.H{
			"success": false,
			"error":   "无效的消息ID",
		})
		return
	}

	utils.DeleteMessage(utils.GetDB(), parsedID)
	c.JSON(200, gin.H{
		"success": true,
	})
}

// 请求和响应结构体定义
type generateRequest struct {
	ConversationID uuid.UUID `json:"conversationID" example:"uuid-string"`
	Prompt         string    `json:"prompt" example:"你好，帮我写一个Hello World程序"`
	Model          string    `json:"model" example:"gpt-3.5-turbo"`
	Base64         string    `json:"base64" example:"data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8/5+hHgAHggJ/PchI7wAAAABJRU5ErkJggg=="`
}

type generateResponseFailed struct {
	Success bool   `json:"success" example:"false"`
	Error   string `json:"error"`
}

type threadListResponseSuccess struct {
	Success    bool          `json:"success" example:"true"`
	ThreadList []interface{} `json:"thread_list"`
}

type threadListResponseFailed struct {
	Success bool   `json:"success" example:"false"`
	Error   string `json:"error"`
}

type stopRequest struct {
	ConversationID uuid.UUID `json:"conversationID" example:"uuid-string"`
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
	ConversationID string `json:"conversationID" example:"uuid-string"`
}

type newConversationResponseFailed struct {
	Success bool   `json:"success" example:"false"`
	Error   string `json:"error"`
}

type deleteConversationRequest struct {
	ConversationID uuid.UUID `json:"conversationID" example:"uuid-string"`
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
	MessageID string `json:"messageID" example:"uuid-string"`
}

type deleteMessageResponseSuccess struct {
	Success bool `json:"success" example:"true"`
}

type deleteMessageResponseFailed struct {
	Success bool   `json:"success" example:"false"`
	Error   string `json:"error"`
}
