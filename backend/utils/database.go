package utils

import (
	"crypto/md5"
	"encoding/hex"
	"encoding/json"
	"errors"
	"fmt"
	"math/rand"
	"time"

	"github.com/sashabaranov/go-openai"
	"gorm.io/driver/mysql"
	"gorm.io/gorm"
)

var DB *gorm.DB

// User 结构
type User struct {
	ID           int64     `gorm:"column:id;type:bigint;primaryKey"`
	Username     string    `gorm:"column:username;type:varchar(64);not null"`
	Email        string    `gorm:"column:email;type:varchar(120);uniqueIndex:idx_email;not null"`
	PasswordHash string    `gorm:"column:password_hash;type:varchar(255)"`
	IsMember     bool      `gorm:"column:is_member;type:boolean;default:false"`
	MemberLevel  string    `gorm:"column:member_level;type:varchar(20);default:'free'"`
	MemberSince  time.Time `gorm:"column:member_since;type:datetime;null"`
	MemberUntil  time.Time `gorm:"column:member_until;type:datetime;null"`
	Points       int       `gorm:"column:points;type:int;default:0"`
	CreatedAt    time.Time `gorm:"column:created_at;autoCreateTime"`
	UpdatedAt    time.Time `gorm:"column:updated_at;autoUpdateTime"`
}

// TableName 指定User结构体对应的表名
func (User) TableName() string {
	return "users"
}

type Conversation struct {
	ID        int64     `gorm:"column:id;type:bigint;primaryKey"`
	UserID    int64     `gorm:"column:user_id;type:bigint;index"`
	Title     string    `gorm:"column:title;type:varchar(100)"`
	Summary   string    `gorm:"column:summary;type:varchar(200)"` // 对话摘要
	CreatedAt time.Time `gorm:"column:created_at;autoCreateTime"`
	UpdatedAt time.Time `gorm:"column:updated_at;autoUpdateTime"`
}

// TableName 指定Conversation结构体对应的表名
func (Conversation) TableName() string {
	return "conversations"
}

// extractSummary 从消息内容中提取摘要，去除可能的模型标签，取前20个字符
func extractSummary(content string) string {
	// 如果内容以 [ 开头，表示有模型标签，跳过到 ] 后面
	startIndex := 0
	if len(content) > 0 && content[0] == '[' {
		endBracketIndex := -1
		for i, char := range content {
			if char == ']' {
				endBracketIndex = i
				break
			}
		}
		if endBracketIndex != -1 {
			startIndex = endBracketIndex + 1
			// 跳过可能的空白字符
			for startIndex < len(content) && (content[startIndex] == ' ' || content[startIndex] == '\t' || content[startIndex] == '\n') {
				startIndex++
			}
		}
	}

	// 提取从startIndex开始的最多20个字符
	text := content[startIndex:]

	// 计算实际字符数（考虑到多字节字符）
	runes := []rune(text)
	if len(runes) > 20 {
		runes = runes[:20]
	}

	return string(runes)
}

type Message struct {
	ID               int64     `gorm:"column:id;type:bigint;primaryKey"`
	Content          string    `gorm:"column:content;type:mediumtext"`
	Role             string    `gorm:"column:role;type:varchar(20)"`
	ConversationID   int64     `gorm:"column:conversation_id;type:bigint;index"`
	CreatedAt        time.Time `gorm:"column:created_at;autoCreateTime"`
	ReasoningContent string    `gorm:"column:reasoning_content;type:mediumtext"`
}

// TableName 指定Message结构体对应的表名
func (Message) TableName() string {
	return "messages"
}

// Order 订单结构
type Order struct {
	ID string `gorm:"column:id;type:varchar(255);primaryKey"`
}

// TableName 指定Order结构体对应的表名
func (Order) TableName() string {
	return "orders"
}

// VerifyCode 验证码结构
type VerifyCode struct {
	ID        int64     `gorm:"column:id;type:bigint;primaryKey"`
	Email     string    `gorm:"column:email;type:varchar(120);not null;index"`
	Code      string    `gorm:"column:code;type:varchar(6);not null"`
	CreatedAt time.Time `gorm:"column:created_at;autoCreateTime"`
	ExpiresAt time.Time `gorm:"column:expires_at;not null"`
}

// TableName 指定VerifyCode结构体对应的表名
func (VerifyCode) TableName() string {
	return "verify_codes"
}

// SignRecord 签到记录结构
type SignRecord struct {
	ID        int64     `gorm:"column:id;type:bigint;primaryKey"`
	Email     string    `gorm:"column:email;type:varchar(120);not null;index"`
	LastSign  time.Time `gorm:"column:last_sign;type:datetime;not null"`
	CreatedAt time.Time `gorm:"column:created_at;autoCreateTime"`
	UpdatedAt time.Time `gorm:"column:updated_at;autoUpdateTime"`
}

// TableName 指定SignRecord结构体对应的表名
func (SignRecord) TableName() string {
	return "sign_records"
}

// Share 分享结构
type Share struct {
	ShareID    string    `gorm:"column:share_id;type:char(16);primaryKey"`
	MessageIDs string    `gorm:"column:message_ids;type:text"` // 存储JSON格式的数组
	CreatedAt  time.Time `gorm:"column:created_at;autoCreateTime"`
}

// TableName 指定Share结构体对应的表名
func (Share) TableName() string {
	return "shares"
}

// PointsRecord 积分使用记录结构
type PointsRecord struct {
	ID        int64     `gorm:"column:id;type:bigint;primaryKey"`         // 记录ID，使用雪花算法生成
	UserID    int64     `gorm:"column:user_id;type:bigint;not null"`      // 用户ID
	Amount    int       `gorm:"column:amount;type:int;not null"`          // 积分变动数量，正数为增加，负数为减少
	Reason    string    `gorm:"column:reason;type:varchar(255);not null"` // 变动原因
	CreatedAt time.Time `gorm:"column:created_at;autoCreateTime"`         // 创建时间
}

// TableName 指定PointsRecord结构体对应的表名
func (PointsRecord) TableName() string {
	return "points_records"
}

// Log 日志结构
type Log struct {
	ID       int64     `gorm:"column:id;type:bigint;primaryKey"`
	UserID   int64     `gorm:"column:user_id;type:bigint;not null"`
	Time     time.Time `gorm:"column:time;not null"`
	Route    string    `gorm:"column:route;type:varchar(255);not null"`
	Method   string    `gorm:"column:method;type:varchar(10);not null"`
	Response string    `gorm:"column:response;type:text"`
	About    string    `gorm:"column:about;type:varchar(255)"`
}

// TableName 指定Log结构体对应的表名
func (Log) TableName() string {
	return "logs"
}

// SetPassword 设置用户密码
func SetPassword(u *User, password string) {
	u.PasswordHash = HashPassword(password)
}

// IsActiveMember 检查用户会员是否有效
func IsActiveMember(u *User) bool {
	if !u.IsMember {
		return false
	}
	if u.MemberUntil.IsZero() {
		return false
	}
	return time.Now().Before(u.MemberUntil)
}

// GetMemberStatus 获取会员状态信息
func GetMemberStatus(u *User) map[string]interface{} {
	if !u.IsMember {
		return map[string]interface{}{
			"is_member": false,
			"level":     "free",
			"days_left": 0,
			"expired":   false,
		}
	}

	daysLeft := 0
	expired := true

	if !(u.MemberUntil.IsZero()) {
		now := time.Now()
		if now.Before(u.MemberUntil) {
			daysLeft = int(u.MemberUntil.Sub(now).Hours() / 24)
			expired = false
		}
	}

	result := map[string]interface{}{
		"is_member": true,
		"level":     u.MemberLevel,
		"days_left": daysLeft,
		"expired":   expired,
	}
	if !(u.MemberSince.IsZero()) {
		result["since"] = u.MemberSince.Format(time.RFC3339)
	}
	if !(u.MemberSince.IsZero()) {
		result["until"] = u.MemberUntil.Format(time.RFC3339)
	}
	return result
}

// AddPoints 增加或减少用户积分
func AddPoints(userID int64, amount int, reason string) {
	db := GetDB()
	var user User
	db.Table("users").Where("id = ?", userID).First(&user)
	user.Points += amount
	if user.Points < 0 {
		user.Points = 0
	}
	db.Model(&user).Update("points", user.Points)

	// 记录积分变动
	RecordPointsChange(userID, amount, reason)
}

// RegisterUser 用户注册函数
func RegisterUser(username, email, password string) (User, error) {
	// 创建用户实例
	id, err := GenerateSnowflakeId()
	if err != nil {
		return User{}, err
	}

	// 检查邮箱是否已存在
	db := GetDB()
	var existingUser User
	result := db.Where("email = ?", email).First(&existingUser)
	if result.Error == nil {
		return User{}, fmt.Errorf("邮箱已存在")
	}

	user := User{
		ID:          id,
		Username:    username,
		Email:       email,
		IsMember:    false,  // 显式初始化布尔字段
		MemberLevel: "free", // 显式初始化会员级别
		Points:      0,      // 显式初始化积分数
	}

	// 设置密码
	SetPassword(&user, password)

	// 插入数据库
	result = db.Create(&user)
	if result.Error != nil {
		return user, result.Error
	}

	return user, nil
}

func GetDB() *gorm.DB {
	if DB == nil {
		// 如果连接未初始化，尝试初始化
		InitDB()
	}
	return DB
}

// InitDB 初始化数据库
func InitDB() {
	// 连接数据库
	// 获取配置
	config := GetConfig()

	var err error
	// 使用配置中的数据库连接信息
	DB, err = gorm.Open(mysql.Open(config.GetDSN()), &gorm.Config{})
	if err != nil {
		fmt.Println("连接数据库失败：", err)
		return
	}
	// 自动迁移表结构
	// 如果表不存在则创建，如果存在但结构不匹配则修改表结构
	err = DB.AutoMigrate(&User{}, &Conversation{}, &Message{}, &VerifyCode{}, &SignRecord{}, &Share{}, &Order{}, &Log{}, &PointsRecord{})
	if err != nil {
		fmt.Println("自动迁移表结构失败：", err)
		return
	}

	fmt.Println("数据库表结构初始化完成")

	// 配置连接池
	sqlDB, err := DB.DB()
	if err != nil {
		fmt.Printf("获取底层数据库连接失败：%v\n", err)
		return
	}

	// 设置连接池参数
	sqlDB.SetMaxIdleConns(10)           // 最大空闲连接数
	sqlDB.SetMaxOpenConns(100)          // 最大打开连接数
	sqlDB.SetConnMaxLifetime(time.Hour) // 连接的最大生存期
}

// HashPassword 使用MD5哈希密码
func HashPassword(password string) string {
	hash := md5.Sum([]byte(password))
	return hex.EncodeToString(hash[:])
}

// FilterByEmail 通过条件过滤用户
func FilterByEmail(email string) User {
	var user User
	GetDB().Table("users").Where("email = ?", email).First(&user)
	return user
}

// VerifyPassword 比较密码
func VerifyPassword(inputPassword string, passwordHash string) bool {
	// 将输入的密码进行哈希处理并与存储的哈希值进行比较
	return HashPassword(inputPassword) == passwordHash
}

// LoadConversationHistory 加载指定conversationID的对话历史
func LoadConversationHistory(conversationID int64) ([]openai.ChatCompletionMessage, error) {
	db := GetDB()
	var messages []Message
	result := db.Table("messages").Where("conversation_id = ?", conversationID).Order("created_at ASC").Find(&messages)
	if result.Error != nil {
		return nil, result.Error
	}
	var chatMessages []openai.ChatCompletionMessage
	for _, msg := range messages {
		if msg.Role == "assistant" {
			chatMessages = append(chatMessages, openai.ChatCompletionMessage{
				Role:             msg.Role,
				Content:          msg.Content,
				ReasoningContent: msg.ReasoningContent,
			})
		} else {
			chatMessages = append(chatMessages, openai.ChatCompletionMessage{
				Role:    msg.Role,
				Content: msg.Content,
			})
		}
	}

	return chatMessages, nil
}

type messageFormat struct {
	ID               int64  `json:"id"`
	Role             string `json:"role"`
	Content          string `json:"content"`
	ReasoningContent string `json:"reasoning_content,omitempty"`
}

// LoadConversationHistoryFormat2 加载指定conversationID的对话历史，返回自定义格式
func LoadConversationHistoryFormat2(conversationID int64) ([]messageFormat, error) {
	db := GetDB()
	var messages []Message
	result := db.Table("messages").Where("conversation_id = ?", conversationID).Order("created_at ASC").Find(&messages)
	if result.Error != nil {
		return nil, result.Error
	}
	var chatMessages []messageFormat
	for _, msg := range messages {
		if msg.Role == "assistant" {
			chatMessages = append(chatMessages, messageFormat{
				ID:               msg.ID,
				Role:             msg.Role,
				Content:          msg.Content,
				ReasoningContent: msg.ReasoningContent,
			})
		} else {
			chatMessages = append(chatMessages, messageFormat{
				ID:      msg.ID,
				Role:    msg.Role,
				Content: msg.Content,
			})
		}
	}

	return chatMessages, nil
}

// SaveConversationHistory 保存对话历史到指定conversationID
func SaveConversationHistory(conversationID int64, messages []openai.ChatCompletionMessage) error {
	db := GetDB()
	// 删除现有的消息记录
	if err := db.Table("messages").Where("conversation_id = ?", conversationID).Delete(&Message{}).Error; err != nil {
		return err
	}

	// 寻找最后一个非空消息作为摘要
	var lastMessage string
	for i := len(messages) - 1; i >= 0; i-- {
		msg := messages[i]
		if msg.Content != "" {
			lastMessage = msg.Content
			break
		}
	}

	// 添加新的消息记录
	for _, msg := range messages {
		id, err := GenerateSnowflakeId()
		if err != nil {
			return err
		}
		message := Message{
			ID:               id,
			Content:          msg.Content,
			Role:             msg.Role,
			ConversationID:   conversationID,
			ReasoningContent: msg.ReasoningContent,
		}
		if err := db.Create(&message).Error; err != nil {
			return err
		}
	}

	// 更新对话摘要
	if lastMessage != "" {
		summary := extractSummary(lastMessage)
		if err := db.Model(&Conversation{}).Where("id = ?", conversationID).Update("summary", summary).Error; err != nil {
			return err
		}
	}

	return nil
}

// SaveConversationHistoryFormat2 保存对话历史到指定conversationID
func SaveConversationHistoryFormat2(conversationID int64, messages []messageFormat) error {
	db := GetDB()
	// 删除现有的消息记录
	if err := db.Table("messages").Where("conversation_id = ?", conversationID).Delete(&Message{}).Error; err != nil {
		return err
	}

	// 寻找最后一个非空消息作为摘要
	var lastMessage string
	for i := len(messages) - 1; i >= 0; i-- {
		if messages[i].Content != "" {
			lastMessage = messages[i].Content
			break
		}
	}

	// 添加新的消息记录
	for _, msg := range messages {
		message := Message{
			ID:               msg.ID,
			Content:          msg.Content,
			Role:             msg.Role,
			ConversationID:   conversationID,
			ReasoningContent: msg.ReasoningContent,
		}
		if err := db.Create(&message).Error; err != nil {
			return err
		}
	}

	// 更新对话摘要
	if lastMessage != "" {
		summary := extractSummary(lastMessage)
		if err := db.Model(&Conversation{}).Where("id = ?", conversationID).Update("summary", summary).Error; err != nil {
			return err
		}
	}

	return nil
}

// HasSignedToday 检查用户今日是否已签到
func HasSignedToday(email string) (bool, error) {
	db := GetDB()
	var signRecord SignRecord

	// 获取今天的开始时间
	now := time.Now()
	today := time.Date(now.Year(), now.Month(), now.Day(), 0, 0, 0, 0, now.Location())

	// 查找该用户今天的签到记录
	result := db.Where("email = ? AND last_sign >= ?", email, today).First(&signRecord)
	if result.Error != nil {
		if result.Error == gorm.ErrRecordNotFound {
			// 没有找到记录，表示今日未签到
			return false, nil
		}
		// 其他数据库错误
		return false, result.Error
	}

	// 找到记录，表示今日已签到
	return true, nil
}

// Sign 用户签到
func Sign(Email string) (map[string]interface{}, error) {
	// 获取用户信息
	user := FilterByEmail(Email)
	if user.Username == "" {
		return nil, fmt.Errorf("用户不存在")
	}

	// 检查今日是否已签到
	signed, err := HasSignedToday(user.Email)
	if err != nil {
		return nil, err
	}

	if signed {
		return nil, fmt.Errorf("今日已签到")
	}

	// 计算连续签到天数
	consecutiveDays, err := calculateConsecutiveSignDays(user.Email)
	if err != nil {
		return nil, err
	}

	// 基础积分：90-110之间的随机数
	basePoints := rand.Intn(21) + 90 // 90-110之间的随机数

	// 检查是否满足连续签到奖励条件
	hasExtraReward := false
	multiplier := 1 // 奖励倍数

	// 每7天的倍数天数给予额外奖励
	if consecutiveDays%30 == 0 {
		// 第30天，4倍奖励
		multiplier = 4
		hasExtraReward = true
	} else if consecutiveDays%14 == 0 {
		// 第14天，3倍奖励
		multiplier = 3
		hasExtraReward = true
	} else if consecutiveDays%7 == 0 {
		// 第7天，2倍奖励
		multiplier = 2
		hasExtraReward = true
	}

	// 计算总积分
	totalPoints := basePoints * multiplier

	AddPoints(user.ID, totalPoints, "每日签到")

	// 记录签到信息
	id, err := GenerateSnowflakeId()
	if err != nil {
		return nil, err
	}
	signRecord := SignRecord{
		ID:       id,
		Email:    user.Email,
		LastSign: time.Now(),
	}

	// 检查用户是否已有签到记录
	var existingRecord SignRecord
	db := GetDB()
	result := db.Where("email = ?", user.Email).First(&existingRecord)
	if result.Error != nil && errors.Is(result.Error, gorm.ErrRecordNotFound) {
		// 创建新记录
		result = db.Create(&signRecord)
	} else if result.Error == nil {
		// 更新现有记录
		result = db.Model(&existingRecord).Updates(map[string]interface{}{
			"last_sign": time.Now(),
		})
	} else {
		// 其他数据库错误
		return nil, result.Error
	}

	if result.Error != nil {
		return nil, result.Error
	}

	// 返回签到结果信息
	resultData := map[string]interface{}{
		"points":           totalPoints,
		"consecutive_days": consecutiveDays,
		"has_extra_reward": hasExtraReward,
		"multiplier":       multiplier, // 添加倍数信息
	}

	return resultData, nil
}

// calculateConsecutiveSignDays 计算用户连续签到天数
func calculateConsecutiveSignDays(email string) (int, error) {
	db := GetDB()
	var signRecords []SignRecord

	// 获取用户所有的签到记录，按时间倒序排列
	result := db.Where("email = ?", email).
		Order("last_sign DESC").
		Find(&signRecords)

	if result.Error != nil {
		return 0, result.Error
	}

	if len(signRecords) == 0 {
		// 如果没有任何签到记录，则连续签到天数为1
		return 1, nil
	}

	// 计算连续签到天数
	consecutiveDays := 0
	currentDate := time.Now()

	// 从今天开始向前检查每一天是否签到
	for {
		// 将当前日期调整为当天的零点
		checkDate := time.Date(currentDate.Year(), currentDate.Month(), currentDate.Day(), 0, 0, 0, 0, currentDate.Location())

		// 检查用户在这一天是否签到
		hasSignedOnDay := false
		for _, record := range signRecords {
			recordDate := time.Date(record.LastSign.Year(), record.LastSign.Month(), record.LastSign.Day(), 0, 0, 0, 0, record.LastSign.Location())

			if recordDate.Equal(checkDate) {
				hasSignedOnDay = true
				break
			}
		}

		if hasSignedOnDay {
			consecutiveDays++
			// 检查前一天
			currentDate = checkDate.AddDate(0, 0, -1)
		} else {
			// 如果今天没签到，检查是否是今天（如果是今天没签到，则连续天数就是已计算的天数）
			today := time.Date(time.Now().Year(), time.Now().Month(), time.Now().Day(), 0, 0, 0, 0, time.Now().Location())
			if checkDate.Equal(today) {
				// 今天还没签到，所以连续天数就是已计算的天数
				break
			} else {
				// 如果不是今天且没签到，则连续签到中断
				break
			}
		}

		// 限制检查范围，避免无限循环（例如用户很久以前的签到记录）
		// 如果连续天数达到一定数量或者检查日期太远，可以提前结束
		today := time.Date(time.Now().Year(), time.Now().Month(), time.Now().Day(), 0, 0, 0, 0, time.Now().Location())
		daysDiff := int(today.Sub(checkDate).Hours() / 24)
		if daysDiff > 365 { // 限制检查一年内的记录
			break
		}
	}

	// 如果今天已经签到，连续天数就是计算出的天数
	// 如果今天还没签到，连续天数应该是计算出的天数（不加1，因为今天没签到）
	todaySigned, _ := HasSignedToday(email)
	if todaySigned {
		return consecutiveDays, nil
	} else {
		return consecutiveDays, nil
	}
}

// SaveVerifyCode 保存验证码到数据库
func SaveVerifyCode(email, code string) error {
	db := GetDB()
	// 删除该邮箱之前的验证码
	db.Where("email = ?", email).Delete(&VerifyCode{})

	// 创建新的验证码记录
	id, err := GenerateSnowflakeId()
	if err != nil {
		return err
	}
	verifyCode := VerifyCode{
		ID:        id,
		Email:     email,
		Code:      code,
		CreatedAt: time.Now(),
		ExpiresAt: time.Now().Add(10 * time.Minute), // 10分钟后过期
	}

	result := db.Create(&verifyCode)
	return result.Error
}

// CheckVerifyCode 验证邮箱和验证码
func CheckVerifyCode(email, code string) bool {
	db := GetDB()
	var verifyCode VerifyCode

	// 查找未过期的验证码
	result := db.Where("email = ? AND code = ? AND expires_at > ?", email, code, time.Now()).First(&verifyCode)
	if result.Error != nil {
		return false
	}

	return true
}

func CreateConversation(userID int64) int64 {
	db := GetDB()
	id, err := GenerateSnowflakeId()
	if err != nil {
		return 0
	}
	conversationID := id
	db.Create(&Conversation{
		ID:     conversationID,
		UserID: userID,
		Title:  "新对话",
	})
	return conversationID
}

// SaveShareMessages 保存分享消息
func SaveShareMessages(messageIDs []int64) (string, error) {
	db := GetDB()
	// 清理超过7天的分享
	db.Where("created_at < ?", time.Now().AddDate(0, 0, -7)).Delete(&Share{})

	// 将messageIDs转换为JSON字符串
	messageIDsJSON, err := json.Marshal(messageIDs)
	if err != nil {
		return "", err
	}

	// 循环生成唯一的shareID直到不重复为止
	var shareID string
	for {
		// 生成16位随机十六进制字符串
		bytes := make([]byte, 8) // 8字节=16个十六进制字符
		rand.Read(bytes)
		shareID = hex.EncodeToString(bytes)

		// 检查是否已经存在
		var count int64
		db.Model(&Share{}).Where("share_id = ?", shareID).Count(&count)
		if count == 0 {
			break // 找到唯一的shareID
		}
		// 如果重复，则重新生成
	}

	// 创建分享记录
	share := Share{
		ShareID:    shareID,
		MessageIDs: string(messageIDsJSON),
		CreatedAt:  time.Now(),
	}

	result := db.Create(&share)
	if result.Error != nil {
		return "", result.Error
	}

	return shareID, nil
}

// LoadShareMessages 根据shareID加载分享的消息
func LoadShareMessages(shareID string) ([]int64, error) {
	db := GetDB()
	// 清理超过7天的分享
	db.Where("created_at < ?", time.Now().AddDate(0, 0, -7)).Delete(&Share{})

	// 查找分享记录
	var share Share
	result := db.Where("share_id = ?", shareID).First(&share)
	if result.Error != nil {
		return nil, result.Error
	}

	// 解析messageIDs JSON
	var messageIDs []int64
	err := json.Unmarshal([]byte(share.MessageIDs), &messageIDs)
	if err != nil {
		return nil, err
	}

	return messageIDs, nil
}

func DeleteConversation(conversationID int64) error {
	db := GetDB()
	// 删除对话
	result := db.Where("id = ?", conversationID).Delete(&Conversation{})
	if result.Error != nil {
		return result.Error
	}

	// 删除对话中的消息记录
	result = db.Where("conversation_id = ?", conversationID).Delete(&Message{})
	if result.Error != nil {
		return result.Error
	}

	return nil
}

func RenameConversation(conversationID int64, title string) error {
	db := GetDB()
	result := db.Table("conversations").Where("id = ?", conversationID).Update("title", title)
	if result.Error != nil {
		return result.Error
	}
	return nil
}

func LoadMessage(messageID int64) (Message, error) {
	db := GetDB()
	var message Message
	result := db.Table("messages").Where("id = ?", messageID).First(&message)
	if result.Error != nil {
		return message, result.Error
	}
	return message, nil
}

// VerifyOrder 向orders表插入orderID
func VerifyOrder(order string) error {
	db := GetDB()
	orderRecord := Order{
		ID: order,
	}
	result := db.Create(&orderRecord)
	return result.Error
}

// SearchOrder 查询orders表中是否有此id
func SearchOrder(orderId string) (bool, error) {
	db := GetDB()
	var order Order
	result := db.Where("id = ?", orderId).First(&order)
	if result.Error != nil {
		if result.Error == gorm.ErrRecordNotFound {
			return false, nil
		}
		return false, result.Error
	}
	return true, nil
}

func DeleteMessage(messageID int64) {
	db := GetDB()
	var message Message
	db.Table("messages").Where("id = ?", messageID).First(&message).Delete(&message)
}

// RecordPointsChange 记录积分变动
func RecordPointsChange(userID int64, amount int, reason string) error {
	db := GetDB()

	// 生成唯一ID
	id, err := GenerateSnowflakeId()
	if err != nil {
		return err
	}

	// 创建积分变动记录
	pointsRecord := PointsRecord{
		ID:     id,
		UserID: userID,
		Amount: amount,
		Reason: reason,
	}

	// 保存到数据库
	result := db.Create(&pointsRecord)
	return result.Error
}

// GetPointsRecordsByUserID 根据用户ID获取积分记录
func GetPointsRecordsByUserID(userID int64) ([]PointsRecord, error) {
	db := GetDB()
	var records []PointsRecord

	result := db.Where("user_id = ?", userID).
		Order("created_at DESC"). // 按时间倒序排列
		Limit(50).                // 限制返回最近50条记录
		Find(&records)

	if result.Error != nil {
		return nil, result.Error
	}

	return records, nil
}
