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

		// 获取模型列表
		api.GET("/models_list", modelsListHandler)

		// 验证VIP会员
		api.POST("/verify_vip", verifyVipHandler)

		// 验证积分充值
		api.POST("/verify_points", verifyPointsHandler)
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
	var loginJSON loginRequest

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
	var signupJSON signupRequest

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

// 请求和响应结构体定义
type loginRequest struct {
	Email    string `json:"email" example:"user@example.com"`
	Password string `json:"password" example:"password123"`
}

type loginResponseSuccess struct {
	Success bool   `json:"success" example:"true"`
	Message string `json:"message" example:"登录成功"`
}

type loginResponseFailed struct {
	Success bool   `json:"success" example:"false"`
	Message string `json:"message" example:"用户名或密码错误"`
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
	ID       string `json:"id" example:"uuid-string"`
	Username string `json:"username" example:"newuser"`
	Email    string `json:"email" example:"newuser@example.com"`
}

type signupResponseFailed struct {
	Success bool   `json:"success" example:"false"`
	Message string `json:"message" example:"该邮箱已被注册"`
}

type currentUserResponseSuccess struct {
	Success     bool   `json:"success" example:"true"`
	ID          string `json:"id" example:"uuid-string"`
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
	Success bool   `json:"success" example:"true"`
	Message string `json:"message" example:"签到成功"`
}

type signResponseFailed struct {
	Success bool   `json:"success" example:"false"`
	Message string `json:"message" example:"今日已签到"`
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
	Message string `json:"message" example:"无效 orderID"`
}

type verifyPointsRequest struct {
	OrderID string `json:"orderID" example:"订单ID"`
}

type verifyPointsResponseSuccess struct {
	Success bool `json:"success" example:"true"`
}

type verifyPointsResponseFailed struct {
	Success bool   `json:"success" example:"false"`
	Message string `json:"message" example:"无效 orderID"`
}
