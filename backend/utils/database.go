package utils

import (
	"crypto/md5"
	"encoding/hex"
	"encoding/json"
	"errors"
	"fmt"
	"math"
	"math/rand"
	"strings"
	"time"

	"github.com/sashabaranov/go-openai"
	"golang.org/x/crypto/bcrypt"
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
	Base64           string    `gorm:"column:base64;type:mediumtext"`
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

// Admin 管理员结构
type Admin struct {
	ID           int64     `gorm:"column:id;type:bigint;primaryKey"`
	Username     string    `gorm:"column:username;type:varchar(64);uniqueIndex;not null"`
	PasswordHash string    `gorm:"column:password_hash;type:varchar(255);not null"`
	Level        int       `gorm:"column:level;type:int;not null;default:3"` // 0最高权限，3最低
	CreatedAt    time.Time `gorm:"column:created_at;autoCreateTime"`
	UpdatedAt    time.Time `gorm:"column:updated_at;autoUpdateTime"`
}

// TableName 指定Admin结构体对应的表名
func (Admin) TableName() string {
	return "admins"
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
// @param userID 用户 ID
// @param amount 积分变动数量，正数为增加，负数为减少
// @param reason 变动原因
func AddPoints(userID int64, amount int, reason string) error {
	db := GetDB()

	// 开启事务
	tx := db.Begin()

	// 使用 defer + recover 防止 panic 导致事务未回滚
	defer func() {
		if r := recover(); r != nil {
			tx.Rollback()
		}
	}()

	// 获取用户信息
	var user User
	result := tx.Table("users").Where("id = ?", userID).First(&user)
	if result.Error != nil {
		tx.Rollback()
		return result.Error
	}

	// 更新积分
	user.Points += amount
	if user.Points < 0 {
		user.Points = 0
	}

	result = tx.Model(&user).Update("points", user.Points)
	if result.Error != nil {
		tx.Rollback()
		return result.Error
	}

	// 记录积分变动
	err := RecordPointsChangeWithTx(tx, userID, amount, reason)
	if err != nil {
		tx.Rollback()
		return err
	}

	// 提交事务
	if err := tx.Commit().Error; err != nil {
		return err
	}

	return nil
}

// RegisterUser 用户注册函数
// @param username 用户名
// @param email 邮箱
// @param password 密码
// @return User 用户对象，error 错误信息
func RegisterUser(username, email, password string) (User, error) {
	// 创建用户实例
	id, err := GenerateSnowflakeId()
	if err != nil {
		return User{}, err
	}

	db := GetDB()

	// 开启事务
	tx := db.Begin()

	// 使用 defer + recover 防止 panic 导致事务未回滚
	defer func() {
		if r := recover(); r != nil {
			tx.Rollback()
		}
	}()

	// 检查邮箱是否已存在
	var existingUser User
	result := tx.Where("email = ?", email).First(&existingUser)
	if result.Error == nil {
		tx.Rollback()
		return User{}, fmt.Errorf("邮箱已存在")
	}
	if result.Error != nil && !errors.Is(result.Error, gorm.ErrRecordNotFound) {
		tx.Rollback()
		return User{}, result.Error
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
	result = tx.Create(&user)
	if result.Error != nil {
		tx.Rollback()
		return user, result.Error
	}

	// 提交事务
	if err := tx.Commit().Error; err != nil {
		return user, err
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
	err = DB.AutoMigrate(&User{}, &Conversation{}, &Message{}, &VerifyCode{}, &SignRecord{}, &Share{}, &Order{}, &Log{}, &PointsRecord{}, &Admin{})
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
	ConversationID   int64  `json:"conversation_id"`
	Role             string `json:"role"`
	Content          string `json:"content"`
	Base64           string `json:"base64,omitempty"`
	ReasoningContent string `json:"reasoning_content,omitempty"`
	CreatedAt        string `json:"created_at"`
}

// LoadConversationHistoryFormat2 加载指定 conversationID 的对话历史，返回自定义格式
func LoadConversationHistoryFormat2(conversationID int64) ([]messageFormat, error) {
	db := GetDB()
	var messages []Message
	result := db.Table("messages").Where("conversation_id = ?", conversationID).Order("created_at ASC").Find(&messages)
	if result.Error != nil {
		return nil, result.Error
	}
	var chatMessages []messageFormat
	for _, msg := range messages {
		chatMessages = append(chatMessages, messageFormat{
			ID:               msg.ID,
			ConversationID:   msg.ConversationID,
			Role:             msg.Role,
			Content:          msg.Content,
			Base64:           msg.Base64,
			ReasoningContent: msg.ReasoningContent,
			CreatedAt:        msg.CreatedAt.Format("2006-01-02T15:04:05Z07:00"),
		})
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

	// 检查是否需要生成标题
	var conversation Conversation
	if err := db.Table("conversations").Where("id = ?", conversationID).First(&conversation).Error; err == nil {
		if conversation.Title == "新对话" {
			// 生成新标题
			newTitle := GenerateConversationTitle(messages)
			if newTitle != "新对话" {
				if err := db.Model(&Conversation{}).Where("id = ?", conversationID).Update("title", newTitle).Error; err != nil {
					fmt.Printf("更新对话标题失败：%v\n", err)
				}
			}
		}
	}

	return nil
}

// GenerateConversationTitle 根据对话内容生成标题
// @param messages 对话消息列表
// @return string 生成的标题
func GenerateConversationTitle(messages []messageFormat) string {
	// 获取第一条用户消息作为标题基础
	for _, msg := range messages {
		if msg.Role == "user" && msg.Content != "" {
			content := msg.Content
			// 去除内容中的换行符和多余空格
			content = strings.ReplaceAll(content, "\n", " ")
			if len(content) > 30 {
				content = content[:30]
			}
			// 清理可能的模型标签
			if strings.HasPrefix(content, "[") {
				if end := strings.Index(content, "]"); end != -1 {
					content = content[end+1:]
					content = strings.TrimSpace(content)
				}
			}
			return strings.TrimSpace(content)
		}
	}
	return "新对话"
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
// @param Email 用户邮箱
// @return map[string]interface{} 签到结果信息，error 错误信息
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

	// 基础积分：90-110 之间的随机数
	basePoints := rand.Intn(21) + 90 // 90-110 之间的随机数

	// 检查是否满足连续签到奖励条件
	hasExtraReward := false
	multiplier := 1 // 奖励倍数

	// 每 7 天的倍数天数给予额外奖励（排除 0 天的情况）
	if consecutiveDays >= 30 && consecutiveDays%30 == 0 {
		// 第 30 天，4 倍奖励
		multiplier = 4
		hasExtraReward = true
	} else if consecutiveDays >= 14 && consecutiveDays%14 == 0 {
		// 第 14 天，3 倍奖励
		multiplier = 3
		hasExtraReward = true
	} else if consecutiveDays >= 7 && consecutiveDays%7 == 0 {
		// 第 7 天，2 倍奖励
		multiplier = 2
		hasExtraReward = true
	}

	// 计算总积分
	totalPoints := basePoints * multiplier

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

	db := GetDB()

	// 开启事务
	tx := db.Begin()

	// 使用 defer + recover 防止 panic 导致事务未回滚
	defer func() {
		if r := recover(); r != nil {
			tx.Rollback()
		}
	}()

	// 增加积分
	var targetUser User
	result := tx.Table("users").Where("id = ?", user.ID).First(&targetUser)
	if result.Error != nil {
		tx.Rollback()
		return nil, result.Error
	}

	targetUser.Points += totalPoints
	if targetUser.Points < 0 {
		targetUser.Points = 0
	}

	result = tx.Model(&targetUser).Update("points", targetUser.Points)
	if result.Error != nil {
		tx.Rollback()
		return nil, result.Error
	}

	// 记录积分变动
	err = RecordPointsChangeWithTx(tx, user.ID, totalPoints, "每日签到")
	if err != nil {
		tx.Rollback()
		return nil, err
	}

	// 检查用户是否已有签到记录
	var existingRecord SignRecord
	result = tx.Where("email = ?", user.Email).First(&existingRecord)
	if result.Error != nil && errors.Is(result.Error, gorm.ErrRecordNotFound) {
		// 创建新记录
		result = tx.Create(&signRecord)
	} else if result.Error == nil {
		// 更新现有记录
		result = tx.Model(&existingRecord).Updates(map[string]interface{}{
			"last_sign": time.Now(),
		})
	} else {
		// 其他数据库错误
		tx.Rollback()
		return nil, result.Error
	}

	if result.Error != nil {
		tx.Rollback()
		return nil, result.Error
	}

	// 提交事务
	if err := tx.Commit().Error; err != nil {
		return nil, err
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
		// 如果没有任何签到记录，则连续签到天数为0
		return 0, nil
	}

	// 从今天开始，逐天向前检查连续签到情况
	today := time.Date(time.Now().Year(), time.Now().Month(), time.Now().Day(), 0, 0, 0, 0, time.Now().Location())
	currentCheckDate := today

	// 计算连续签到天数
	consecutiveDays := 0

	for {
		// 检查当前日期是否签到
		hasSignedToday := false
		for _, record := range signRecords {
			recordDate := time.Date(record.LastSign.Year(), record.LastSign.Month(), record.LastSign.Day(), 0, 0, 0, 0, record.LastSign.Location())
			if recordDate.Equal(currentCheckDate) {
				hasSignedToday = true
				break
			}
		}

		// 如果当前日期已签到，增加计数，检查前一天
		if hasSignedToday {
			consecutiveDays++
			currentCheckDate = currentCheckDate.AddDate(0, 0, -1) // 检查前一天
		} else {
			// 如果当前日期未签到，说明连续中断
			// 特别地，如果今天都没签到，那么连续签到天数就是已累计的天数
			break
		}

		// 限制检查范围，避免无限循环
		daysDiff := int(today.Sub(currentCheckDate).Hours() / 24)
		if daysDiff > 365 { // 限制检查一年内的记录
			break
		}
	}

	return consecutiveDays, nil
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
// @param messageIDs 消息 ID 列表
// @return string 分享 ID，error 错误信息
func SaveShareMessages(messageIDs []int64) (string, error) {
	db := GetDB()

	// 开启事务
	tx := db.Begin()

	// 使用 defer + recover 防止 panic 导致事务未回滚
	defer func() {
		if r := recover(); r != nil {
			tx.Rollback()
		}
	}()

	// 清理超过 7 天的分享
	tx.Where("created_at < ?", time.Now().AddDate(0, 0, -7)).Delete(&Share{})

	// 将 messageIDs 转换为 JSON 字符串
	messageIDsJSON, err := json.Marshal(messageIDs)
	if err != nil {
		tx.Rollback()
		return "", err
	}

	// 循环生成唯一的 shareID 直到不重复为止
	var shareID string
	for {
		// 生成 16 位随机十六进制字符串
		bytes := make([]byte, 8) // 8 字节=16 个十六进制字符
		rand.Read(bytes)
		shareID = hex.EncodeToString(bytes)

		// 检查是否已经存在
		var count int64
		tx.Model(&Share{}).Where("share_id = ?", shareID).Count(&count)
		if count == 0 {
			break // 找到唯一的 shareID
		}
		// 如果重复，则重新生成
	}

	// 创建分享记录
	share := Share{
		ShareID:    shareID,
		MessageIDs: string(messageIDsJSON),
		CreatedAt:  time.Now(),
	}

	result := tx.Create(&share)
	if result.Error != nil {
		tx.Rollback()
		return "", result.Error
	}

	// 提交事务
	if err := tx.Commit().Error; err != nil {
		return "", err
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

	// 使用事务保证数据一致性
	tx := db.Begin()
	defer func() {
		if r := recover(); r != nil {
			tx.Rollback()
		}
	}()

	// 先删除该对话下的所有消息记录
	result := tx.Where("conversation_id = ?", conversationID).Delete(&Message{})
	if result.Error != nil {
		tx.Rollback()
		return result.Error
	}

	// 再删除对话本身
	result = tx.Where("id = ?", conversationID).Delete(&Conversation{})
	if result.Error != nil {
		tx.Rollback()
		return result.Error
	}

	// 提交事务
	if err := tx.Commit().Error; err != nil {
		return err
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

// RecordPointsChangeWithTx 使用指定事务记录积分变动
func RecordPointsChangeWithTx(tx *gorm.DB, userID int64, amount int, reason string) error {
	// 生成唯一 ID
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
	result := tx.Create(&pointsRecord)
	return result.Error
}

// GetDashboardOverview 获取管理面板概览数据
func GetDashboardOverview(userID int64) (map[string]interface{}, error) {
	db := GetDB()

	// 获取今日开始时间
	now := time.Now()
	today := time.Date(now.Year(), now.Month(), now.Day(), 0, 0, 0, 0, now.Location())

	// 总用户数
	var totalUsers int64
	db.Model(&User{}).Count(&totalUsers)

	// 今日新增用户
	var todayNewUsers int64
	db.Model(&User{}).Where("created_at >= ?", today).Count(&todayNewUsers)

	// 总对话数
	var totalConversations int64
	db.Model(&Conversation{}).Count(&totalConversations)

	// 今日新增对话
	var todayConversations int64
	db.Model(&Conversation{}).Where("created_at >= ?", today).Count(&todayConversations)

	// 总积分发放 - 使用 COALESCE 处理 NULL 值
	var totalPointsIssued int64
	db.Model(&PointsRecord{}).Where("amount > 0").Select("COALESCE(SUM(amount), 0)").Scan(&totalPointsIssued)

	// 今日积分发放 - 使用 COALESCE 处理 NULL 值
	var todayPointsIssued int64
	db.Model(&PointsRecord{}).Where("amount > 0 AND created_at >= ?", today).Select("COALESCE(SUM(amount), 0)").Scan(&todayPointsIssued)

	// VIP 用户数
	var vipUsers int64
	db.Model(&User{}).Where("is_member = ? AND member_level IN ?", true, []string{"VIP", "SVIP"}).Count(&vipUsers)

	return map[string]interface{}{
		"totalUsers":         totalUsers,
		"todayNewUsers":      todayNewUsers,
		"totalConversations": totalConversations,
		"todayConversations": todayConversations,
		"totalPointsIssued":  totalPointsIssued,
		"todayPointsIssued":  todayPointsIssued,
		"vipUsers":           vipUsers,
	}, nil
}

// GetUserList 获取用户列表（分页）
func GetUserList(page, pageSize int) ([]User, int64, error) {
	db := GetDB()
	var users []User
	var total int64

	// 获取总数
	db.Model(&User{}).Count(&total)

	// 获取分页数据
	offset := (page - 1) * pageSize
	result := db.Order("created_at DESC").
		Limit(pageSize).
		Offset(offset).
		Find(&users)

	if result.Error != nil {
		return nil, 0, result.Error
	}

	return users, total, nil
}

// GetConversationList 获取对话列表（分页）
func GetConversationList(page, pageSize int) ([]Conversation, int64, error) {
	db := GetDB()
	var conversations []Conversation
	var total int64

	// 获取总数
	db.Model(&Conversation{}).Count(&total)

	// 获取分页数据
	offset := (page - 1) * pageSize
	result := db.Order("updated_at DESC").
		Limit(pageSize).
		Offset(offset).
		Find(&conversations)

	if result.Error != nil {
		return nil, 0, result.Error
	}

	return conversations, total, nil
}

// GetAllPointsRecords 获取所有积分记录（分页）
func GetAllPointsRecords(page, pageSize int) ([]PointsRecord, int64, error) {
	db := GetDB()
	var records []PointsRecord
	var total int64

	// 获取总数
	db.Model(&PointsRecord{}).Count(&total)

	// 获取分页数据
	offset := (page - 1) * pageSize
	result := db.Order("created_at DESC").
		Limit(pageSize).
		Offset(offset).
		Find(&records)

	if result.Error != nil {
		return nil, 0, result.Error
	}

	return records, total, nil
}

// CheckPasswordHash 验证密码哈希（使用 bcrypt）
func CheckPasswordHash(password, hash string) bool {
	err := bcrypt.CompareHashAndPassword([]byte(hash), []byte(password))
	return err == nil
}

// HashPasswordBcrypt 对密码进行 bcrypt 哈希（用于 Dashboard）
func HashPasswordBcrypt(password string) (string, error) {
	bytes, err := bcrypt.GenerateFromPassword([]byte(password), bcrypt.DefaultCost)
	return string(bytes), err
}

// UpdateUserByID 根据 ID 更新用户信息
func UpdateUserByID(userID int64, points int, isMember bool, memberLevel string, memberSince string, memberUntil string) error {
	db := GetDB()

	// 使用事务
	tx := db.Begin()
	defer func() {
		if r := recover(); r != nil {
			tx.Rollback()
		}
	}()

	// 查找用户
	var user User
	result := tx.Where("id = ?", userID).First(&user)
	if result.Error != nil {
		tx.Rollback()
		return fmt.Errorf("用户不存在")
	}

	// 更新积分（如果提供了新值）
	if points != user.Points {
		// 积分溢出检查 - 严格检查
		if points < 0 {
			tx.Rollback()
			return fmt.Errorf("积分不能为负数")
		}
		if points > math.MaxInt {
			tx.Rollback()
			return fmt.Errorf("积分超出最大限制 (最大值：%d)", math.MaxInt)
		}

		// 记录积分变动
		pointsDiff := points - user.Points
		reason := "管理员手动调整"
		if pointsDiff > 0 {
			reason = "管理员增加积分"
		} else if pointsDiff < 0 {
			reason = "管理员扣除积分"
		}

		// 更新用户积分
		user.Points = points
		if err := tx.Save(&user).Error; err != nil {
			tx.Rollback()
			return err
		}

		// 记录积分变动
		if err := RecordPointsChangeWithTx(tx, userID, pointsDiff, reason); err != nil {
			tx.Rollback()
			return err
		}
	}

	// 更新会员信息
	user.IsMember = isMember
	user.MemberLevel = memberLevel

	// 处理会员时间
	if isMember {
		// 处理开始时间
		if memberSince != "" {
			memberSinceTime, err := time.Parse("2006-01-02T15:04", memberSince)
			if err != nil {
				memberSinceTime, err = time.Parse("2006-01-02", memberSince)
				if err != nil {
					tx.Rollback()
					return fmt.Errorf("会员开始时间格式错误")
				}
			}
			user.MemberSince = memberSinceTime
		} else if user.MemberSince.IsZero() {
			// 如果没有提供开始时间且当前为空，设置为现在
			user.MemberSince = time.Now()
		}

		// 处理到期时间
		if memberUntil != "" {
			memberUntilTime, err := time.Parse("2006-01-02T15:04", memberUntil)
			if err != nil {
				memberUntilTime, err = time.Parse("2006-01-02", memberUntil)
				if err != nil {
					tx.Rollback()
					return fmt.Errorf("会员到期时间格式错误")
				}
			}
			user.MemberUntil = memberUntilTime
		}
	}

	// 如果不是会员，清空会员相关信息
	if !isMember {
		user.MemberLevel = "free"
		user.MemberUntil = time.Time{}
		user.MemberSince = time.Time{}
	}

	if err := tx.Save(&user).Error; err != nil {
		tx.Rollback()
		return err
	}

	// 提交事务
	if err := tx.Commit().Error; err != nil {
		return err
	}

	return nil
}

// UpdateUserInfo 根据用户ID更新用户名和密码
func UpdateUserInfo(userID int64, username string, password string) error {
	db := GetDB()

	// 使用事务
	tx := db.Begin()
	defer func() {
		if r := recover(); r != nil {
			tx.Rollback()
		}
	}()

	// 查找用户
	var user User
	result := tx.Where("id = ?", userID).First(&user)
	if result.Error != nil {
		tx.Rollback()
		return fmt.Errorf("用户不存在")
	}

	// 更新用户名（如果提供了）
	if username != "" {
		// 检查用户名是否已存在
		var existingUser User
		if err := tx.Where("username = ? AND id != ?", username, userID).First(&existingUser).Error; err == nil {
			tx.Rollback()
			return fmt.Errorf("用户名已被使用")
		}
		user.Username = username
	}

	// 更新密码（如果提供了）
	if password != "" {
		// 验证密码长度
		if len(password) < 6 {
			tx.Rollback()
			return fmt.Errorf("密码长度不能少于6位")
		}

		// 哈希化密码
		user.PasswordHash = HashPassword(password)
	}

	if err := tx.Save(&user).Error; err != nil {
		tx.Rollback()
		return err
	}

	// 提交事务
	if err := tx.Commit().Error; err != nil {
		return err
	}

	return nil
}

// VerifyAdminPassword 验证管理员密码
func VerifyAdminPassword(username, password string) (*Admin, error) {
	var admin Admin
	result := DB.Where("username = ?", username).First(&admin)
	if result.Error != nil {
		return nil, result.Error
	}
	if !CheckPasswordHash(password, admin.PasswordHash) {
		return nil, fmt.Errorf("密码错误")
	}
	return &admin, nil
}

// GetAdminList 获取管理员列表
func GetAdminList() ([]Admin, error) {
	var admins []Admin
	result := DB.Order("level ASC, created_at DESC").Find(&admins)
	if result.Error != nil {
		return nil, result.Error
	}
	return admins, nil
}

// CreateAdmin 创建管理员
func CreateAdmin(username, password string, level int) error {
	// 检查用户名是否已存在
	var existingAdmin Admin
	result := DB.Where("username = ?", username).First(&existingAdmin)
	if result.Error == nil {
		return fmt.Errorf("管理员用户名已存在")
	}
	if !errors.Is(result.Error, gorm.ErrRecordNotFound) {
		return result.Error
	}

	// 生成ID
	id, err := GenerateSnowflakeId()
	if err != nil {
		return err
	}

	// 哈希密码
	hashedPassword, err := HashPasswordBcrypt(password)
	if err != nil {
		return err
	}

	// 创建管理员
	admin := Admin{
		ID:           id,
		Username:     username,
		PasswordHash: hashedPassword,
		Level:        level,
	}
	return DB.Create(&admin).Error
}

// UpdateAdmin 更新管理员信息
func UpdateAdmin(adminID int64, username string, password string, level int) error {
	var admin Admin
	result := DB.Where("id = ?", adminID).First(&admin)
	if result.Error != nil {
		return fmt.Errorf("管理员不存在")
	}

	// 更新用户名
	if username != "" && username != admin.Username {
		// 检查用户名是否已被使用
		var existingAdmin Admin
		if err := DB.Where("username = ? AND id != ?", username, adminID).First(&existingAdmin).Error; err == nil {
			return fmt.Errorf("用户名已被使用")
		}
		admin.Username = username
	}

	// 更新密码
	if password != "" {
		hashedPassword, err := HashPasswordBcrypt(password)
		if err != nil {
			return err
		}
		admin.PasswordHash = hashedPassword
	}

	// 更新等级
	admin.Level = level

	return DB.Save(&admin).Error
}

// DeleteAdmin 删除管理员
func DeleteAdmin(adminID int64) error {
	result := DB.Where("id = ?", adminID).Delete(&Admin{})
	if result.Error != nil {
		return result.Error
	}
	if result.RowsAffected == 0 {
		return fmt.Errorf("管理员不存在")
	}
	return nil
}
