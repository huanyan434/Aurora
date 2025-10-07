package main

import (
	"bytes"
	"encoding/gob"
	"time"

	"github.com/gin-contrib/sessions"
	"github.com/gin-contrib/sessions/cookie"
	"github.com/gin-gonic/gin"
	swaggerFiles "github.com/swaggo/files"
	ginSwagger "github.com/swaggo/gin-swagger"
	"gorm.io/gorm"

	"encoding/json"

	_ "docs"
	"routes"
	"utils"
)

// @title Aurora API
// @version 1.0
// @description API文档 for Aurora 项目
// @host localhost:5000
// @BasePath /
func main() {
	// 数据库
	db := utils.GetDB()
	utils.InitDB(db)

	r := gin.Default()

	// 添加日志记录中间件
	r.Use(loggingMiddleware(db))

	store := cookie.NewStore([]byte("snaosnca"))
	r.Use(sessions.Sessions("SESSIONID", store))
	gob.Register(utils.User{})

	routes.ChatInit(r)
	routes.ApiInit(r)

	// Swagger路由
	r.GET("/swagger/*any", ginSwagger.WrapHandler(swaggerFiles.Handler))

	r.Run(":5000")
}

// 日志记录中间件
func loggingMiddleware(db *gorm.DB) gin.HandlerFunc {
	return func(c *gin.Context) {
		// 创建响应记录器
		writer := &responseWriter{body: bytes.NewBufferString(""), ResponseWriter: c.Writer}
		c.Writer = writer

		// 开始时间
		startTime := time.Now()

		// 处理请求
		c.Next()

		// 结束时间
		endTime := time.Now()

		// 获取用户ID（如果已登录）
		var userID int64
		session := sessions.Default(c)
		user := session.Get("currentUser")
		if user != nil {
			userStruct, ok := user.(utils.User)
			if ok {
				userID = userStruct.ID
			}
		}

		// 根据路由确定about内容
		about := getAboutFromRoute(c.Request.URL.Path)

		// 只记录"用户"和"财务"类别的日志，忽略其他类别
		if about != "用户" && about != "财务" {
			return
		}

		// 当user_id为空时不记录日志
		if userID == 0 {
			return
		}

		// 构造响应信息
		responseData := map[string]interface{}{
			"status":      c.Writer.Status(),
			"path":        c.Request.URL.Path,
			"latency":     endTime.Sub(startTime).String(),
			"client_ip":   c.ClientIP(),
			"user_agent":  c.Request.UserAgent(),
			"error_count": len(c.Errors),
			"response":    writer.body.String(), // 实际的响应内容
		}

		// 将响应信息转换为JSON字符串
		responseJSON, _ := json.Marshal(responseData)

		id, err := utils.GenerateSnowflakeId()
		if err != nil {
			return
		}
		// 创建日志记录
		log := utils.Log{
			ID:       id,
			UserID:   userID,
			Time:     startTime,
			Route:    c.Request.URL.Path,
			Method:   c.Request.Method,
			Response: string(responseJSON),
			About:    about,
		}

		// 异步保存到数据库，避免阻塞主线程
		go func() {
			db.Create(&log)
		}()
	}
}

// responseWriter 是一个自定义的响应写入器，用于捕获响应内容
type responseWriter struct {
	gin.ResponseWriter
	body *bytes.Buffer
}

func (w *responseWriter) Write(b []byte) (int, error) {
	w.body.Write(b)
	return w.ResponseWriter.Write(b)
}

func (w *responseWriter) WriteString(s string) (int, error) {
	w.body.WriteString(s)
	return w.ResponseWriter.WriteString(s)
}

// 根据路由确定about内容
func getAboutFromRoute(path string) string {
	switch {
	// 用户相关路由
	case path == "/api/login" || path == "/api/signup" || path == "/api/current_user" ||
		path == "/api/send_verify_code" || path == "/api/sign" || path == "/api/logout":
		return "用户"
	// 对话相关路由
	case path == "/chat/generate" || path == "/chat/thread_list" || path == "/chat/stop" ||
		path == "/chat/new_conversation" || path == "/chat/delete_conversation" ||
		path == "/chat/conversations_list" || path == "/chat/share_messages" ||
		path == "/chat/delete_message" || path == "/api/models_list":
		return "对话"
	// 财务相关路由
	case path == "/api/verify_vip" || path == "/api/verify_points":
		return "财务"
	// 分享相关路由
	case path[:6] == "/chat/" && path[6] != ':':
		return "对话"
	// 默认情况
	default:
		return "其他"
	}
}
