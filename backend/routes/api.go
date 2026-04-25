package routes

import (
	"encoding/base64"
	"fmt"
	"log"
	"strconv"
	"time"
	"utils"

	"github.com/gin-contrib/sessions"
	"github.com/gin-gonic/gin"
)

func ApiInit(r *gin.Engine) {
	{
		api := r.Group("/api")

		// 登录接口
		api.POST("/login", loginHandler)

		// 注册接口
		api.POST("/signup", signupHandler)

		// 获取当前用户信息
		api.GET("/current_user", currentUserHandler)

		// 发送验证码
		api.POST("/send_verify_code", sendVerifyCodeHandler)

		// 签到接口
		api.POST("/sign", signHandler)

		// 获取签到状态
		api.GET("/has_signed", hasSignedHandler)

		// 获取模型列表
		api.GET("/models_list", modelsListHandler)

		// 验证VIP会员
		api.POST("/verify_vip", verifyVipHandler)

		// 验证积分充值
		api.POST("/verify_points", verifyPointsHandler)

		// 退出登录
		api.POST("/logout", logoutHandler)

		// 获取头像
		api.GET("/avatar/:id", avatarHandler)

		// 获取积分记录
		api.GET("/points_records", pointsRecordsHandler)

		// Dashboard 管理面板接口
		api.POST("/dashboard/login", dashboardLoginHandler)

		// 需要验证的 Dashboard 接口
		dashboard := api.Group("/dashboard")
		dashboard.Use(dashboardAuthMiddleware())
		{
			dashboard.GET("/overview", dashboardOverviewHandler)
			dashboard.GET("/users", dashboardUsersHandler)
			dashboard.POST("/users/update", dashboardUpdateUserHandler)
			dashboard.POST("/users/update-info", dashboardUpdateUserInfoHandler)
			dashboard.GET("/conversations", dashboardConversationsHandler)
			dashboard.GET("/points_records", dashboardPointsRecordsHandler)

			// 管理员管理接口（仅0级可访问）
			dashboard.GET("/admins", requireLevel0Middleware(), dashboardAdminsHandler)
			dashboard.POST("/admins/create", requireLevel0Middleware(), dashboardCreateAdminHandler)
			dashboard.POST("/admins/update", requireLevel0Middleware(), dashboardUpdateAdminHandler)
			dashboard.POST("/admins/delete", requireLevel0Middleware(), dashboardDeleteAdminHandler)
		}
	}
}

// @Summary 用户登录
// @Description 通过邮箱和密码进行用户登录验证
// @Tags 用户
// @Accept json
// @Produce json
// @Param login body loginRequest true "登录信息"
// @Success 200 {object} loginResponseSuccess "登录成功"
// @Failure 400 {object} loginResponseFailed "登录失败"
// @Router /api/login [post]
func loginHandler(c *gin.Context) {
	var req loginRequest

	err := c.ShouldBindJSON(&req)
	if err != nil {
		c.JSON(400, gin.H{
			"success": false,
			"message": "内部错误",
		})
		return
	}
	email := req.Email
	password := req.Password

	if email == "" || password == "" {
		c.JSON(400, gin.H{
			"success": false,
			"message": "请填写相关字段",
		})
		return
	}

	//在数据库通过邮箱找用户
	user := utils.FilterByEmail(email)
	if user.ID == 0 || !utils.VerifyPassword(password, user.PasswordHash) {
		c.JSON(400, gin.H{
			"success": false,
			"message": "用户名或密码错误",
		})
		return
	}

	setCurrentUser(c, user)
	c.JSON(200, gin.H{
		"success": true,
		"message": "登录成功",
	})
}

// @Summary 用户注册
// @Description 通过用户名、邮箱、密码和验证码进行用户注册
// @Tags 用户
// @Accept json
// @Produce json
// @Param signup body signupRequest true "注册信息"
// @Success 200 {object} signupResponseSuccess "注册成功"
// @Failure 400 {object} signupResponseFailed "注册失败"
// @Router /api/signup [post]
func signupHandler(c *gin.Context) {
	var req signupRequest

	err := c.ShouldBindJSON(&req)
	if err != nil {
		c.JSON(400, gin.H{
			"success": false,
			"message": "参数错误",
		})
		return
	}
	email := req.Email
	username := req.Username
	password := req.Password
	verifyCode := req.VerifyCode

	if email == "" || username == "" || password == "" || verifyCode == "" {
		c.JSON(400, gin.H{
			"success": false,
			"message": "请填写相关字段",
		})
		return
	}

	// 检测邮箱是否存在
	if utils.FilterByEmail(email).ID != 0 {
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
	user, err := utils.RegisterUser(username, email, password)
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
			"id":       strconv.FormatInt(user.ID, 10),
			"username": user.Username,
			"email":    user.Email,
			"avatar":   user.Avatar,
		},
	})
}

// @Summary 获取当前用户信息
// @Description 获取当前登录用户的信息
// @Tags 用户
// @Produce json
// @Success 200 {object} currentUserResponseSuccess "获取用户信息成功"
// @Failure 400 {object} currentUserResponseFailed "获取用户信息失败"
// @Router /api/current_user [get]
func currentUserHandler(c *gin.Context) {
	// 获取当前登录用户信息
	userInfo, err := getCurrentUser(c)
	if err != nil {
		c.JSON(400, gin.H{
			"success": false,
		})
		return
	}
	avatarURL := userInfo.Avatar
	c.JSON(200, gin.H{
		"success":     true,
		"id":          strconv.FormatInt(userInfo.ID, 10),
		"username":    userInfo.Username,
		"email":       userInfo.Email,
		"avatarUrl":   avatarURL,
		"isMember":    userInfo.IsMember,
		"memberLevel": userInfo.MemberLevel,
		"points":      userInfo.Points,
	})
}

// @Summary 发送验证码
// @Description 向指定邮箱发送验证码
// @Tags 用户
// @Accept json
// @Produce json
// @Param email body sendVerifyCodeRequest true "邮箱地址"
// @Success 200 {object} sendVerifyCodeResponseSuccess "验证码发送成功"
// @Failure 400 {object} sendVerifyCodeResponseFailed "验证码发送失败"
// @Router /api/send_verify_code [post]
func sendVerifyCodeHandler(c *gin.Context) {
	var sendVerifyCodeJson sendVerifyCodeRequest

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
}

// @Summary 用户签到
// @Description 用户每日签到获取积分
// @Tags 用户
// @Produce json
// @Success 200 {object} signResponseSuccess "签到成功"
// @Failure 400 {object} signResponseFailed "签到失败"
// @Router /api/sign [post]
func signHandler(c *gin.Context) {
	User, err := getCurrentUser(c)
	if err != nil {
		c.JSON(400, gin.H{
			"success": false,
			"message": "签到失败: " + err.Error(),
		})
		return
	}

	// 执行签到
	signResult, err := utils.Sign(User.Email)
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
		"data":    signResult,
	})
}

// @Summary 获取签到状态
// @Description 获取当前用户今日的签到状态
// @Tags 用户
// @Produce json
// @Success 200 {object} hasSignedResponseSuccess "获取签到状态成功"
// @Failure 400 {object} hasSignedResponseFailed "获取签到状态失败"
// @Router /api/has_signed [get]
func hasSignedHandler(c *gin.Context) {
	User, err := getCurrentUser(c)
	if err != nil {
		c.JSON(400, gin.H{
			"success": false,
			"message": "获取签到状态失败: " + err.Error(),
		})
		return
	}
	signed, err := utils.HasSignedToday(User.Email)
	if err != nil {
		c.JSON(400, gin.H{
			"success": false,
			"message": "获取签到状态失败: " + err.Error(),
		})
		return
	}
	c.JSON(200, gin.H{
		"success": true,
		"signed":  signed,
	})
}

// @Summary 获取模型列表
// @Description 获取可用的AI模型列表
// @Tags 模型
// @Produce json
// @Success 200 {object} modelsListResponse "获取模型列表成功"
// @Router /api/models_list [get]
func modelsListHandler(c *gin.Context) {
	config := utils.GetConfig()
	models := config.Models

	// 返回JSON响应
	c.JSON(200, gin.H{
		"models": models,
	})
}

// @Summary 验证VIP会员
// @Description 通过订单ID验证并激活VIP会员资格
// @Tags 用户
// @Accept json
// @Produce json
// @Param verifyVip body verifyVipRequest true "验证信息"
// @Success 200 {object} verifyVipResponseSuccess "VIP验证成功"
// @Failure 400 {object} verifyVipResponseFailed "VIP验证失败"
// @Router /api/verify_vip [post]
func verifyVipHandler(c *gin.Context) {
	var req verifyVipRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(400, gin.H{
			"success": false,
			"message": "内部错误",
		})
		return
	}
	user, err := getCurrentUser(c)
	if err != nil {
		c.JSON(400, gin.H{
			"success": false,
			"message": "Err:" + err.Error(),
		})
	}
	message := utils.VerifyVip(user.ID, req.OrderID, req.Force)
	if message != "" {
		c.JSON(400, gin.H{
			"success": false,
			"message": message,
		})
		return
	}
	c.JSON(200, gin.H{
		"success": true,
	})
}

// @Summary 验证积分充值
// @Description 通过订单ID验证并充值积分
// @Tags 用户
// @Accept json
// @Produce json
// @Param verifyPoints body verifyPointsRequest true "验证信息"
// @Success 200 {object} verifyPointsResponseSuccess "积分验证成功"
// @Failure 400 {object} verifyPointsResponseFailed "积分验证失败"
// @Router /api/verify_points [post]
func verifyPointsHandler(c *gin.Context) {
	var req verifyPointsRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(400, gin.H{
			"success": false,
			"message": "内部错误",
		})
		return
	}
	user, err := getCurrentUser(c)
	if err != nil {
		c.JSON(400, gin.H{
			"success": false,
			"message": "Err:" + err.Error(),
		})
	}
	message := utils.VerifyPoints(user.ID, req.OrderID)
	if message != "" {
		c.JSON(400, gin.H{
			"success": false,
			"message": message,
		})
		return
	}
	c.JSON(200, gin.H{
		"success": true,
	})
}

func setCurrentUser(c *gin.Context, userInfo utils.User) {
	session := sessions.Default(c)
	session.Set("currentUser", CurrentUserSession{
		ID:          userInfo.ID,
		Email:       userInfo.Email,
		Username:    userInfo.Username,
		IsMember:    userInfo.IsMember,
		MemberLevel: userInfo.MemberLevel,
	})
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
	currentSession, ok := userInfoInterface.(CurrentUserSession)
	if !ok {
		err = fmt.Errorf("内部错误")
		return
	}

	userInfo = utils.FilterByID(currentSession.ID)
	if userInfo.ID == 0 {
		err = fmt.Errorf("用户不存在")
		return
	}
	if !utils.IsActiveMember(&userInfo) {
		userInfo.IsMember = false
		userInfo.MemberLevel = "free"
	}
	setCurrentUser(c, userInfo)
	return userInfo, nil
}

// @Summary 退出登录
// @Description 清除用户登录会话
// @Tags 用户
// @Produce json
// @Success 200 {object} logoutResponseSuccess "退出成功"
// @Failure 400 {object} logoutResponseFailed "退出失败"
// @Router /api/logout [post]
func logoutHandler(c *gin.Context) {
	session := sessions.Default(c)
	session.Clear()
	// 一定要Save否则不生效，若未使用gob注册User结构体，调用Save时会返回一个Error
	err := session.Save()
	if err != nil {
		c.JSON(400, gin.H{
			"success": false,
			"message": "退出失败",
		})
		return
	}
	c.JSON(200, gin.H{
		"success": true,
		"message": "退出成功",
	})
}

// @Summary 获取头像
// @Description 从数据库获取用户头像并返回PNG图片
// @Tags 用户
// @Produce image/png
// @Param id path string true "用户ID"
// @Success 200 "头像图片"
// @Failure 400 {object} map[string]interface{} "头像不存在"
// @Router /api/avatar/{id} [get]
func avatarHandler(c *gin.Context) {
	idStr := c.Param("id")
	log.Printf("avatarHandler raw id=%q", idStr)
	if idStr == "" {
		c.JSON(400, gin.H{
			"success": false,
			"message": "用户ID无效",
		})
		return
	}

	userID, err := strconv.ParseInt(idStr, 10, 64)
	if err != nil {
		c.JSON(400, gin.H{
			"success": false,
			"message": "用户ID无效",
		})
		return
	}
	if userID <= 0 {
		c.JSON(400, gin.H{
			"success": false,
			"message": "用户ID无效",
		})
		return
	}
	log.Printf("avatarHandler parsed userID=%d", userID)

	user := utils.FilterByID(userID)
	log.Printf("avatarHandler query result userID=%d found=%t avatarLen=%d", user.ID, user.ID != 0, len(user.Avatar))
	if user.ID == 0 {
		c.JSON(404, gin.H{
			"success": false,
			"message": "用户不存在",
		})
		return
	}

	if len(user.Avatar) == 0 {
		log.Printf("avatarHandler avatar empty, generating userID=%d", user.ID)
		avatarBytes, genErr := utils.GenerateUserAvatar(strconv.FormatInt(user.ID, 10))
		if genErr != nil {
			c.JSON(500, gin.H{
				"success": false,
				"message": "生成头像失败",
			})
			return
		}
		avatarBase64 := base64.StdEncoding.EncodeToString(avatarBytes)
		if err := utils.GetDB().Table("users").Where("id = ?", user.ID).Update("avatar", avatarBase64).Error; err != nil {
			c.JSON(500, gin.H{
				"success": false,
				"message": "保存头像失败",
			})
			return
		}
		log.Printf("avatarHandler avatar generated and saved userID=%d avatarLen=%d", user.ID, len(avatarBase64))
		user.Avatar = avatarBase64
	}

	avatarBytes, decodeErr := base64.StdEncoding.DecodeString(user.Avatar)
	if decodeErr != nil {
		c.JSON(500, gin.H{
			"success": false,
			"message": "头像数据损坏",
		})
		return
	}

	log.Printf("avatarHandler return png userID=%d avatarLen=%d", user.ID, len(user.Avatar))
	c.Data(200, "image/png", avatarBytes)
}

type loginRequest struct {
	Email    string `json:"email" example:"user@example.com"`
	Password string `json:"password" example:"password123"`
}

type signupRequest struct {
	Username   string `json:"username" example:"newuser"`
	Email      string `json:"email" example:"newuser@example.com"`
	Password   string `json:"password" example:"password123"`
	VerifyCode string `json:"verifyCode" example:"123456"`
}


type signupResponseSuccess struct {
	Success bool       `json:"success" example:"true"`
	Message string     `json:"message" example:"注册成功"`
	User    signupUser `json:"user"`
}

type signupUser struct {
	ID       string `json:"id" example:"1234567890"`
	Username string `json:"username" example:"newuser"`
	Email    string `json:"email" example:"newuser@example.com"`
}

type signupResponseFailed struct {
	Success bool   `json:"success" example:"false"`
	Message string `json:"message" example:"该邮箱已被注册"`
}

type currentUserResponseSuccess struct {
	Success     bool   `json:"success" example:"true"`
	ID          string `json:"id" example:"1234567890"`
	Username    string `json:"username" example:"currentuser"`
	Email       string `json:"email" example:"user@example.com"`
	IsMember    bool   `json:"isMember" example:"true"`
	MemberLevel string `json:"memberLevel" example:"VIP"`
	Points      int    `json:"points" example:"100"`
}

type currentUserResponseFailed struct {
	Success bool `json:"success" example:"false"`
}

type sendVerifyCodeRequest struct {
	Email string `json:"email" example:"user@example.com"`
}

type sendVerifyCodeResponseSuccess struct {
	Success bool   `json:"success" example:"true"`
	Message string `json:"message" example:"发送成功"`
}

type sendVerifyCodeResponseFailed struct {
	Success bool   `json:"success" example:"false"`
	Message string `json:"message" example:"发送失败"`
}

type signResponseSuccess struct {
	Success bool                   `json:"success" example:"true"`
	Message string                 `json:"message" example:"签到成功"`
	Data    map[string]interface{} `json:"data"`
}

type signResponseFailed struct {
	Success bool   `json:"success" example:"false"`
	Message string `json:"message" example:"今日已签到"`
}

type hasSignedResponseSuccess struct {
	Success bool `json:"success" example:"true"`
	Signed  bool `json:"signed" example:"false"`
}

type hasSignedResponseFailed struct {
	Success bool   `json:"success" example:"false"`
	Error   string `json:"error"`
}

type modelsListResponse struct {
	Models []interface{} `json:"models"`
}

type verifyVipRequest struct {
	OrderID string `json:"orderID" example:"订单ID"`
	Force   bool   `json:"force" example:"false"`
}

type verifyVipResponseSuccess struct {
	Success bool `json:"success" example:"true"`
}

type verifyVipResponseFailed struct {
	Success bool   `json:"success" example:"false"`
	Message string `json:"message" example:"无效订单号"`
}

type verifyPointsRequest struct {
	OrderID string `json:"orderID" example:"订单ID"`
}

type verifyPointsResponseSuccess struct {
	Success bool `json:"success" example:"true"`
}

type verifyPointsResponseFailed struct {
	Success bool   `json:"success" example:"false"`
	Message string `json:"message" example:"无效订单号"`
}

type logoutResponseSuccess struct {
	Success bool   `json:"success" example:"true"`
	Message string `json:"message" example:"退出成功"`
}

type logoutResponseFailed struct {
	Success bool   `json:"success" example:"false"`
	Message string `json:"message" example:"退出失败"`
}

// @Summary 获取积分记录
// @Description 获取当前用户的积分变动记录
// @Tags 用户
// @Produce json
// @Success 200 {object} pointsRecordsResponseSuccess "获取积分记录成功"
// @Failure 400 {object} pointsRecordsResponseFailed "获取积分记录失败"
// @Router /api/points_records [get]
func pointsRecordsHandler(c *gin.Context) {
	user, err := getCurrentUser(c)
	if err != nil {
		c.JSON(400, gin.H{
			"success": false,
			"message": "获取积分记录失败: " + err.Error(),
		})
		return
	}

	// 获取用户的积分记录
	records, err := utils.GetPointsRecordsByUserID(user.ID)
	if err != nil {
		c.JSON(400, gin.H{
			"success": false,
			"message": "获取积分记录失败: " + err.Error(),
		})
		return
	}

	// 格式化响应数据
	var formattedRecords []map[string]interface{}
	for _, record := range records {
		formattedRecord := map[string]interface{}{
			"id":        strconv.FormatInt(record.ID, 10),
			"amount":    record.Amount,
			"reason":    record.Reason,
			"timestamp": record.CreatedAt.Format("2006-01-02 15:04:05"),
		}
		formattedRecords = append(formattedRecords, formattedRecord)
	}

	c.JSON(200, gin.H{
		"success": true,
		"data":    formattedRecords,
	})
}

// 积分记录响应结构体
type pointsRecordsResponseSuccess struct {
	Success bool                     `json:"success" example:"true"`
	Data    []map[string]interface{} `json:"data"`
}

type pointsRecordsResponseFailed struct {
	Success bool   `json:"success" example:"false"`
	Message string `json:"message" example:"获取积分记录失败"`
}

// @Summary Dashboard 登录
// @Description 管理后台登录验证
// @Tags Dashboard
// @Accept json
// @Produce json
// @Param request body dashboardLoginRequest true "登录信息"
// @Success 200 {object} dashboardLoginResponseSuccess "登录成功"
// @Failure 400 {object} dashboardLoginResponseFailed "登录失败"
// @Router /api/dashboard/login [post]
func dashboardLoginHandler(c *gin.Context) {
	var req dashboardLoginRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(400, gin.H{
			"success": false,
			"message": "参数错误：" + err.Error(),
		})
		return
	}

	// 验证管理员用户名和密码
	admin, err := utils.VerifyAdminPassword(req.Username, req.Password)
	if err != nil {
		c.JSON(400, gin.H{
			"success": false,
			"message": "用户名或密码错误",
		})
		return
	}

	// 设置 session 标记为 dashboard 管理员
	session := sessions.Default(c)
	session.Set("dashboard_admin", true)
	session.Set("admin_id", admin.ID)
	session.Set("admin_level", admin.Level)
	session.Set("dashboard_login_time", time.Now())
	if err := session.Save(); err != nil {
		fmt.Println("Session save error:", err)
		c.JSON(400, gin.H{
			"success": false,
			"message": "登录失败：" + err.Error(),
		})
		return
	}

	c.JSON(200, gin.H{
		"success": true,
		"message": "登录成功",
		"data": gin.H{
			"username": admin.Username,
			"level":    admin.Level,
		},
	})
}

// dashboardAuthMiddleware Dashboard 权限验证中间件
func dashboardAuthMiddleware() gin.HandlerFunc {
	return func(c *gin.Context) {
		session := sessions.Default(c)
		admin := session.Get("dashboard_admin")
		if admin == nil || admin != true {
			c.JSON(401, gin.H{
				"success": false,
				"message": "未授权访问",
			})
			c.Abort()
			return
		}
		c.Next()
	}
}

// @Summary 更新用户信息
// @Description 更新用户的积分和会员等级
// @Tags Dashboard
// @Accept json
// @Produce json
// @Param request body dashboardUpdateUserRequest true "更新信息"
// @Success 200 {object} dashboardUpdateUserResponseSuccess "更新成功"
// @Failure 400 {object} dashboardUpdateUserResponseFailed "更新失败"
// @Router /api/dashboard/users/update [post]
func dashboardUpdateUserHandler(c *gin.Context) {
	var req dashboardUpdateUserRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(400, gin.H{
			"success": false,
			"message": "参数错误",
		})
		return
	}

	// 验证用户 ID
	if req.UserID <= 0 {
		c.JSON(400, gin.H{
			"success": false,
			"message": "用户 ID 无效",
		})
		return
	}

	// 获取管理员权限等级
	session := sessions.Default(c)
	adminLevel := session.Get("admin_level")
	if adminLevel == nil {
		c.JSON(401, gin.H{
			"success": false,
			"message": "未授权访问",
		})
		return
	}
	level := adminLevel.(int)

	// 权限检查：2级不能修改会员，3级不能修改积分
	if level >= 2 && (req.IsMember || req.MemberLevel != "" || req.MemberSince != "" || req.MemberUntil != "") {
		c.JSON(403, gin.H{
			"success": false,
			"message": "权限不足：无法修改会员信息",
		})
		return
	}
	if level >= 3 {
		c.JSON(403, gin.H{
			"success": false,
			"message": "权限不足：仅可查看",
		})
		return
	}

	// 更新用户信息
	err := utils.UpdateUserByID(req.UserID, req.Points, req.IsMember, req.MemberLevel, req.MemberSince, req.MemberUntil)
	if err != nil {
		c.JSON(400, gin.H{
			"success": false,
			"message": "更新失败：" + err.Error(),
		})
		return
	}

	c.JSON(200, gin.H{
		"success": true,
		"message": "更新成功",
	})
}

// @Summary 获取管理面板概览数据
// @Description 获取管理面板的概览统计数据
// @Tags Dashboard
// @Produce json
// @Success 200 {object} dashboardOverviewResponseSuccess "获取概览数据成功"
// @Failure 400 {object} dashboardOverviewResponseFailed "获取概览数据失败"
// @Router /api/dashboard/overview [get]
func dashboardOverviewHandler(c *gin.Context) {
	// 获取概览数据（不需要用户 ID）
	overview, err := utils.GetDashboardOverview(0)
	if err != nil {
		c.JSON(400, gin.H{
			"success": false,
			"message": "获取概览数据失败：" + err.Error(),
		})
		return
	}

	c.JSON(200, gin.H{
		"success": true,
		"data":    overview,
	})
}

// @Summary 获取用户列表
// @Description 获取所有用户列表（支持分页）
// @Tags Dashboard
// @Produce json
// @Param page query int false "页码" default(1)
// @Param pageSize query int false "每页数量" default(20)
// @Success 200 {object} dashboardUsersResponseSuccess "获取用户列表成功"
// @Failure 400 {object} dashboardUsersResponseFailed "获取用户列表失败"
// @Router /api/dashboard/users [get]
func dashboardUsersHandler(c *gin.Context) {
	pageStr := c.DefaultQuery("page", "1")
	pageSizeStr := c.DefaultQuery("pageSize", "20")

	page, _ := strconv.Atoi(pageStr)
	pageSize, _ := strconv.Atoi(pageSizeStr)

	if page < 1 {
		page = 1
	}
	if pageSize < 1 || pageSize > 100 {
		pageSize = 20
	}

	users, total, err := utils.GetUserList(page, pageSize)
	if err != nil {
		c.JSON(400, gin.H{
			"success": false,
			"message": "获取用户列表失败：" + err.Error(),
		})
		return
	}

	// 格式化用户数据
	var formattedUsers []map[string]interface{}
	for _, user := range users {
		formattedUser := map[string]interface{}{
			"id":          strconv.FormatInt(user.ID, 10),
			"username":    user.Username,
			"email":       user.Email,
			"isMember":    user.IsMember,
			"memberLevel": user.MemberLevel,
			"points":      user.Points,
			"memberSince": "",
			"memberUntil": "",
			"createdAt":   user.CreatedAt.Format("2006-01-02 15:04:05"),
		}

		// 格式化会员时间
		if !(user.MemberSince.IsZero()) {
			formattedUser["memberSince"] = user.MemberSince.Format("2006-01-02T15:04")
		}
		if !(user.MemberUntil.IsZero()) {
			formattedUser["memberUntil"] = user.MemberUntil.Format("2006-01-02T15:04")
		}

		formattedUsers = append(formattedUsers, formattedUser)
	}

	c.JSON(200, gin.H{
		"success": true,
		"data": gin.H{
			"users":    formattedUsers,
			"total":    total,
			"page":     page,
			"pageSize": pageSize,
		},
	})
}

// @Summary 获取对话列表
// @Description 获取所有对话列表（支持分页）
// @Tags Dashboard
// @Produce json
// @Param page query int false "页码" default(1)
// @Param pageSize query int false "每页数量" default(20)
// @Success 200 {object} dashboardConversationsResponseSuccess "获取对话列表成功"
// @Failure 400 {object} dashboardConversationsResponseFailed "获取对话列表失败"
// @Router /api/dashboard/conversations [get]
func dashboardConversationsHandler(c *gin.Context) {
	_, err := getCurrentUser(c)
	if err != nil {
		c.JSON(400, gin.H{
			"success": false,
			"message": "获取用户信息失败：" + err.Error(),
		})
		return
	}

	pageStr := c.DefaultQuery("page", "1")
	pageSizeStr := c.DefaultQuery("pageSize", "20")

	page, _ := strconv.Atoi(pageStr)
	pageSize, _ := strconv.Atoi(pageSizeStr)

	if page < 1 {
		page = 1
	}
	if pageSize < 1 || pageSize > 100 {
		pageSize = 20
	}

	conversations, total, err := utils.GetConversationList(page, pageSize)
	if err != nil {
		c.JSON(400, gin.H{
			"success": false,
			"message": "获取对话列表失败：" + err.Error(),
		})
		return
	}

	// 格式化对话数据
	var formattedConversations []map[string]interface{}
	for _, conv := range conversations {
		formattedConv := map[string]interface{}{
			"id":        strconv.FormatInt(conv.ID, 10),
			"userId":    strconv.FormatInt(conv.UserID, 10),
			"title":     conv.Title,
			"summary":   conv.Summary,
			"createdAt": conv.CreatedAt.Format("2006-01-02 15:04:05"),
			"updatedAt": conv.UpdatedAt.Format("2006-01-02 15:04:05"),
		}
		formattedConversations = append(formattedConversations, formattedConv)
	}

	c.JSON(200, gin.H{
		"success": true,
		"data": gin.H{
			"conversations": formattedConversations,
			"total":         total,
		},
	})
}

// @Summary 获取积分记录列表
// @Description 获取所有积分记录列表（支持分页）
// @Tags Dashboard
// @Produce json
// @Param page query int false "页码" default(1)
// @Param pageSize query int false "每页数量" default(20)
// @Success 200 {object} dashboardPointsRecordsResponseSuccess "获取积分记录成功"
// @Failure 400 {object} dashboardPointsRecordsResponseFailed "获取积分记录失败"
// @Router /api/dashboard/points_records [get]
func dashboardPointsRecordsHandler(c *gin.Context) {
	pageStr := c.DefaultQuery("page", "1")
	pageSizeStr := c.DefaultQuery("pageSize", "20")

	page, _ := strconv.Atoi(pageStr)
	pageSize, _ := strconv.Atoi(pageSizeStr)

	if page < 1 {
		page = 1
	}
	if pageSize < 1 || pageSize > 100 {
		pageSize = 20
	}

	records, total, err := utils.GetAllPointsRecords(page, pageSize)
	if err != nil {
		c.JSON(400, gin.H{
			"success": false,
			"message": "获取积分记录失败：" + err.Error(),
		})
		return
	}

	// 格式化积分记录数据
	var formattedRecords []map[string]interface{}
	for _, record := range records {
		formattedRecord := map[string]interface{}{
			"id":        strconv.FormatInt(record.ID, 10),
			"userId":    strconv.FormatInt(record.UserID, 10),
			"amount":    record.Amount,
			"reason":    record.Reason,
			"createdAt": record.CreatedAt.Format("2006-01-02 15:04:05"),
		}
		formattedRecords = append(formattedRecords, formattedRecord)
	}

	c.JSON(200, gin.H{
		"success": true,
		"data": gin.H{
			"records": formattedRecords,
			"total":   total,
		},
	})
}

// Dashboard 响应结构体
type dashboardOverviewResponseSuccess struct {
	Success bool                   `json:"success" example:"true"`
	Data    map[string]interface{} `json:"data"`
}

type dashboardOverviewResponseFailed struct {
	Success bool   `json:"success" example:"false"`
	Message string `json:"message"`
}

type dashboardUsersResponseSuccess struct {
	Success bool                   `json:"success" example:"true"`
	Data    map[string]interface{} `json:"data"`
}

type dashboardUsersResponseFailed struct {
	Success bool   `json:"success" example:"false"`
	Message string `json:"message"`
}

type dashboardConversationsResponseSuccess struct {
	Success bool                   `json:"success" example:"true"`
	Data    map[string]interface{} `json:"data"`
}

type dashboardConversationsResponseFailed struct {
	Success bool   `json:"success" example:"false"`
	Message string `json:"message"`
}

type dashboardPointsRecordsResponseSuccess struct {
	Success bool                   `json:"success" example:"true"`
	Data    map[string]interface{} `json:"data"`
}

type dashboardPointsRecordsResponseFailed struct {
	Success bool   `json:"success" example:"false"`
	Message string `json:"message"`
}

// Dashboard 登录请求
type dashboardLoginRequest struct {
	Username string `json:"username" binding:"required"`
	Password string `json:"password" binding:"required"`
}

type dashboardLoginResponseSuccess struct {
	Success bool   `json:"success" example:"true"`
	Message string `json:"message" example:"登录成功"`
}

type dashboardLoginResponseFailed struct {
	Success bool   `json:"success" example:"false"`
	Message string `json:"message" example:"密码错误"`
}

// 更新用户请求
type dashboardUpdateUserRequest struct {
	UserID      int64  `json:"userId" binding:"required"`
	Points      int    `json:"points"`
	IsMember    bool   `json:"isMember"`
	MemberLevel string `json:"memberLevel"`
	MemberSince string `json:"memberSince,omitempty"`
	MemberUntil string `json:"memberUntil,omitempty"`
}

type dashboardUpdateUserResponseSuccess struct {
	Success bool   `json:"success" example:"true"`
	Message string `json:"message" example:"更新成功"`
}

type dashboardUpdateUserResponseFailed struct {
	Success bool   `json:"success" example:"false"`
	Message string `json:"message" example:"更新失败"`
}

// @Summary 更新用户用户名和密码
// @Description 更新用户的用户名和/或密码
// @Tags Dashboard
// @Accept json
// @Produce json
// @Param request body dashboardUpdateUserInfoRequest true "更新信息"
// @Success 200 {object} dashboardUpdateUserInfoResponseSuccess "更新成功"
// @Failure 400 {object} dashboardUpdateUserInfoResponseFailed "更新失败"
// @Router /api/dashboard/users/update-info [post]
func dashboardUpdateUserInfoHandler(c *gin.Context) {
	var req dashboardUpdateUserInfoRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(400, gin.H{
			"success": false,
			"message": "参数错误",
		})
		return
	}

	// 验证用户 ID
	if req.UserID <= 0 {
		c.JSON(400, gin.H{
			"success": false,
			"message": "用户 ID 无效",
		})
		return
	}

	// 至少要提供一个字段
	if req.Username == "" && req.Password == "" {
		c.JSON(400, gin.H{
			"success": false,
			"message": "请提供要更新的字段",
		})
		return
	}

	// 获取管理员权限等级
	session := sessions.Default(c)
	adminLevel := session.Get("admin_level")
	if adminLevel == nil {
		c.JSON(401, gin.H{
			"success": false,
			"message": "未授权访问",
		})
		return
	}
	level := adminLevel.(int)

	// 权限检查：1级及以上不能修改用户名和密码
	if level >= 1 {
		c.JSON(403, gin.H{
			"success": false,
			"message": "权限不足：无法修改用户名和密码",
		})
		return
	}

	// 更新用户信息
	err := utils.UpdateUserInfo(req.UserID, req.Username, req.Password)
	if err != nil {
		c.JSON(400, gin.H{
			"success": false,
			"message": "更新失败：" + err.Error(),
		})
		return
	}

	c.JSON(200, gin.H{
		"success": true,
		"message": "更新成功",
	})
}

// 更新用户用户名和密码请求
type dashboardUpdateUserInfoRequest struct {
	UserID   int64  `json:"userId" binding:"required"`
	Username string `json:"username,omitempty"`
	Password string `json:"password,omitempty"`
}

type dashboardUpdateUserInfoResponseSuccess struct {
	Success bool   `json:"success" example:"true"`
	Message string `json:"message" example:"更新成功"`
}

type dashboardUpdateUserInfoResponseFailed struct {
	Success bool   `json:"success" example:"false"`
	Message string `json:"message" example:"更新失败"`
}

// requireLevel0Middleware 0级权限中间件
func requireLevel0Middleware() gin.HandlerFunc {
	return func(c *gin.Context) {
		session := sessions.Default(c)
		adminLevel := session.Get("admin_level")
		if adminLevel == nil || adminLevel.(int) != 0 {
			c.JSON(403, gin.H{
				"success": false,
				"message": "权限不足：仅0级管理员可访问",
			})
			c.Abort()
			return
		}
		c.Next()
	}
}

// @Summary 获取管理员列表
// @Tags Dashboard
// @Produce json
// @Success 200 {object} map[string]interface{} "成功"
// @Router /api/dashboard/admins [get]
func dashboardAdminsHandler(c *gin.Context) {
	admins, err := utils.GetAdminList()
	if err != nil {
		c.JSON(400, gin.H{
			"success": false,
			"message": "获取管理员列表失败：" + err.Error(),
		})
		return
	}

	// 隐藏密码哈希
	var result []gin.H
	for _, admin := range admins {
		result = append(result, gin.H{
			"id":         admin.ID,
			"username":   admin.Username,
			"level":      admin.Level,
			"created_at": admin.CreatedAt,
			"updated_at": admin.UpdatedAt,
		})
	}

	c.JSON(200, gin.H{
		"success": true,
		"data":    result,
	})
}

// @Summary 创建管理员
// @Tags Dashboard
// @Accept json
// @Produce json
// @Param request body map[string]interface{} true "创建信息"
// @Success 200 {object} map[string]interface{} "成功"
// @Router /api/dashboard/admins/create [post]
func dashboardCreateAdminHandler(c *gin.Context) {
	var req struct {
		Username string `json:"username" binding:"required"`
		Password string `json:"password" binding:"required"`
		Level    int    `json:"level" binding:"required,min=0,max=3"`
	}
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(400, gin.H{
			"success": false,
			"message": "参数错误：" + err.Error(),
		})
		return
	}

	err := utils.CreateAdmin(req.Username, req.Password, req.Level)
	if err != nil {
		c.JSON(400, gin.H{
			"success": false,
			"message": "创建失败：" + err.Error(),
		})
		return
	}

	c.JSON(200, gin.H{
		"success": true,
		"message": "创建成功",
	})
}

// @Summary 更新管理员
// @Tags Dashboard
// @Accept json
// @Produce json
// @Param request body map[string]interface{} true "更新信息"
// @Success 200 {object} map[string]interface{} "成功"
// @Router /api/dashboard/admins/update [post]
func dashboardUpdateAdminHandler(c *gin.Context) {
	var req struct {
		AdminID  int64  `json:"adminId" binding:"required"`
		Username string `json:"username"`
		Password string `json:"password"`
		Level    int    `json:"level" binding:"min=0,max=3"`
	}
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(400, gin.H{
			"success": false,
			"message": "参数错误：" + err.Error(),
		})
		return
	}

	err := utils.UpdateAdmin(req.AdminID, req.Username, req.Password, req.Level)
	if err != nil {
		c.JSON(400, gin.H{
			"success": false,
			"message": "更新失败：" + err.Error(),
		})
		return
	}

	c.JSON(200, gin.H{
		"success": true,
		"message": "更新成功",
	})
}

// @Summary 删除管理员
// @Tags Dashboard
// @Accept json
// @Produce json
// @Param request body map[string]interface{} true "删除信息"
// @Success 200 {object} map[string]interface{} "成功"
// @Router /api/dashboard/admins/delete [post]
func dashboardDeleteAdminHandler(c *gin.Context) {
	var req struct {
		AdminID int64 `json:"adminId" binding:"required"`
	}
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(400, gin.H{
			"success": false,
			"message": "参数错误：" + err.Error(),
		})
		return
	}

	// 防止删除自己
	session := sessions.Default(c)
	currentAdminID := session.Get("admin_id")
	if currentAdminID != nil && currentAdminID.(int64) == req.AdminID {
		c.JSON(400, gin.H{
			"success": false,
			"message": "不能删除自己",
		})
		return
	}

	err := utils.DeleteAdmin(req.AdminID)
	if err != nil {
		c.JSON(400, gin.H{
			"success": false,
			"message": "删除失败：" + err.Error(),
		})
		return
	}

	c.JSON(200, gin.H{
		"success": true,
		"message": "删除成功",
	})
}
