package routes

import (
	"fmt"
	"utils"

	"github.com/gin-contrib/sessions"
	"github.com/gin-gonic/gin"
)

func ApiInit(r *gin.Engine) {
	{
		api := r.Group("/api")

		// LoginApiInit
		api.POST("/login", func(c *gin.Context) {
			loginJSON := struct {
				Email    string `json:"email"`
				Password string `json:"password"`
			}{}

			err := c.ShouldBindJSON(&loginJSON)
			if err != nil {
				c.JSON(400, gin.H{
					"success": false,
					"message": "内部错误",
				})
				return
			}
			email := loginJSON.Email
			password := loginJSON.Password

			if email == "" || password == "" {
				c.JSON(400, gin.H{
					"success": false,
					"message": "请填写相关字段",
				})
				return
			}

			//在数据库通过邮箱找用户
			user := utils.FilterBy(utils.GetDB(), "", email)

			if (user == utils.User{}) || !utils.VerifyPassword(password, user.PasswordHash) {
				c.JSON(400, gin.H{
					"success": false,
					"message": "用户名或密码错误",
				})
				return
			}

			// 检查用户是否为会员
			isActiveMember := utils.IsActiveMember(&user)

			setCurrentUser(c, user)
			c.JSON(200, gin.H{
				"success":  true,
				"message":  "登录成功",
				"isMember": isActiveMember,
			})
		})

		// SignupApiInit
		api.POST("/signup", func(c *gin.Context) {
			signupJSON := struct {
				Username   string `json:"username"`
				Email      string `json:"email"`
				Password   string `json:"password"`
				VerifyCode string `json:"verifyCode"`
			}{}
			err := c.ShouldBindJSON(&signupJSON)
			if err != nil {
				c.JSON(400, gin.H{
					"success": false,
					"message": "参数错误",
				})
				return
			}
			email := signupJSON.Email
			username := signupJSON.Username
			password := signupJSON.Password
			verifyCode := signupJSON.VerifyCode

			if email == "" || username == "" || password == "" || verifyCode == "" {
				c.JSON(400, gin.H{
					"success": false,
					"message": "请填写相关字段",
				})
				return
			}

			db := utils.GetDB()

			// 检测邮箱是否存在
			if (utils.FilterBy(db, "", email) != utils.User{}) {
				c.JSON(400, gin.H{
					"success": false,
					"message": "该邮箱已被注册",
				})
				return
			}

			// 检测验证码是否有效
			if utils.VerifyEmail(email, verifyCode) == false {
				c.JSON(400, gin.H{
					"success": false,
					"message": "验证码无效",
				})
				return
			}

			// 注册流程
			user, err := utils.RegisterUser(db, username, email, password)
			if err != nil {
				c.JSON(400, gin.H{
					"success": false,
					"message": "内部错误",
				})
				return
			}

			// 设置当前用户并返回成功响应
			setCurrentUser(c, user)
			c.JSON(200, gin.H{
				"success": true,
				"message": "注册成功",
				"user": gin.H{
					"id":       user.ID.String(),
					"username": user.Username,
					"email":    user.Email,
				},
			})
		})

		// User
		api.GET("/user_current", func(c *gin.Context) {
			// 获取当前登录用户信息
			userInfo, err := getCurrentUser(c)
			if err != nil {
				c.JSON(400, gin.H{
					"success": false,
				})
			}
			// 以json格式返回
			c.JSON(200, gin.H{
				"success":     true,
				"id":          userInfo.ID.String(),
				"username":    userInfo.Username,
				"email":       userInfo.Email,
				"isMember":    userInfo.IsMember,
				"memberLevel": userInfo.MemberLevel,
				"points":      userInfo.Points,
			})
		})

		// 发送验证码
		api.POST("/send_verify_code", func(c *gin.Context) {
			sendVerifyCodeJson := struct {
				Email string `json:"email"`
			}{}

			if err := c.ShouldBindJSON(&sendVerifyCodeJson); err != nil {
				c.JSON(400, gin.H{
					"success": false,
					"message": "内部错误",
				})
				return
			}

			if !utils.SendEmailCode(sendVerifyCodeJson.Email, utils.GenerateVerifyCode()) {
				c.JSON(400, gin.H{
					"success": false,
					"message": "发送失败",
				})
				return
			}

			c.JSON(200, gin.H{
				"success": true,
				"message": "发送成功",
			})
		})

		api.POST("/sign", func(c *gin.Context) {
			User, err := getCurrentUser(c)
			if err != nil {
				c.JSON(400, gin.H{
					"success": false,
					"message": "签到失败: " + err.Error(),
				})
				return
			}

			// 执行签到
			err = utils.Sign(utils.GetDB(), User.Email)
			if err != nil {
				if err.Error() == "already signed today" {
					c.JSON(400, gin.H{
						"success": false,
						"message": "今日已签到",
					})
					return
				}

				c.JSON(400, gin.H{
					"success": false,
					"message": "签到失败: " + err.Error(),
				})
				return
			}

			c.JSON(200, gin.H{
				"success": true,
				"message": "签到成功",
			})
		})

		api.GET("/models_list", func(c *gin.Context) {
			config := utils.GetConfig()
			models := config.Models

			// 返回JSON响应
			c.JSON(200, gin.H{
				"models": models,
			})
		})
	}
}

func setCurrentUser(c *gin.Context, userInfo utils.User) {
	session := sessions.Default(c)
	session.Set("currentUser", userInfo)
	// 一定要Save否则不生效，若未使用gob注册User结构体，调用Save时会返回一个Error
	err := session.Save()
	if err != nil {
		return
	}
}

func getCurrentUser(c *gin.Context) (userInfo utils.User, err error) {
	session := sessions.Default(c)
	userInfoInterface := session.Get("currentUser")

	// 检查session中是否存在currentUser
	if userInfoInterface == nil {
		err = fmt.Errorf("用户未登录")
		return
	}

	// 类型断言检查
	userInfo, ok := userInfoInterface.(utils.User)
	if !ok {
		err = fmt.Errorf("内部错误")
		return
	}

	userInfo = utils.FilterBy(utils.GetDB(), "", userInfo.Email)
	setCurrentUser(c, userInfo)
	return userInfo, nil
}
