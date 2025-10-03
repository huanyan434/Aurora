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
		chat.POST("/generate", func(c *gin.Context) {
			c.Writer.Header().Set("Content-Type", "text/event-stream")
			c.Writer.Header().Set("Cache-Control", "no-cache")
			c.Writer.Header().Set("Connection", "keep-alive")
			flusher, _ := c.Writer.(http.Flusher)
			var req struct {
				ConversationID uuid.UUID `json:"conversationID"`
				Prompt         string    `json:"prompt"`
				Model          string    `json:"model"`
				Base64         string    `json:"base64"`
			}
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
		})

		chat.POST("/thread_list", func(c *gin.Context) {
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
		})

		chat.POST("/stop", func(c *gin.Context) {
			var req struct {
				ConversationID uuid.UUID `json:"conversationID"`
			}
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
		})

		chat.GET("/new_conversation", func(c *gin.Context) {
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
		})

		chat.POST("/delete_conversation", func(c *gin.Context) {
			var req struct {
				ConversationID uuid.UUID `json:"conversationID"`
			}
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
		})

		chat.GET("/conversations_list", func(c *gin.Context) {
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
		})

		chat.POST("/share_messages", func(c *gin.Context) {
			var req struct {
				MessageIDs []uuid.UUID `json:"messageIDs"`
			}
			if err := c.ShouldBindJSON(&req); err != nil {
				c.JSON(400, gin.H{
					"success": false,
					"error":   err,
				})
				return
			}
			shareID, err := utils.SaveShareMessages(utils.GetDB(), req.MessageIDs)
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

		})

		chat.GET("/:shareID", func(c *gin.Context) {
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
		})

		chat.POST("/delete_message", func(c *gin.Context) {
			var req struct {
				MessageID uuid.UUID `json:"messageID"`
			}
			if err := c.ShouldBindJSON(&req); err != nil {
				c.JSON(400, gin.H{
					"success": false,
					"error":   err,
				})
				return
			}

			utils.DeleteMessage(utils.GetDB(), req.MessageID)
			c.JSON(200, gin.H{
				"success": true,
			})
		})
	}
}
