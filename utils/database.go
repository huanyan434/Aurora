package utils

import (
	"crypto/md5"
	"encoding/hex"
	"encoding/json"
	"fmt"
	"math/rand"
	"time"

	"github.com/sashabaranov/go-openai"
	uuid "github.com/satori/go.uuid"
	"gorm.io/driver/mysql"
	"gorm.io/gorm"
)

// User 结构
type User struct {
	ID           uuid.UUID  `gorm:"column:id;type:char(36);primaryKey"`
	Username     string     `gorm:"column:username;type:varchar(64);uniqueIndex:idx_username;not null"`
	Email        string     `gorm:"column:email;type:varchar(120);uniqueIndex:idx_email;not null"`
	PasswordHash string     `gorm:"column:password_hash;type:varchar(255)"`
	IsMember     bool       `gorm:"column:is_member;type:boolean;default:false"`
	MemberLevel  string     `gorm:"column:member_level;type:varchar(20);default:'free'"`
	MemberSince  *time.Time `gorm:"column:member_since;type:datetime;null"`
	MemberUntil  *time.Time `gorm:"column:member_until;type:datetime;null"`
	Points       int        `gorm:"column:points;type:int;default:0"`
	CreatedAt    time.Time  `gorm:"column:created_at;autoCreateTime"`
	UpdatedAt    time.Time  `gorm:"column:updated_at;autoUpdateTime"`
}

// TableName 指定User结构体对应的表名
func (User) TableName() string {
	return "users"
}

type Conversation struct {
	ID        uuid.UUID `gorm:"column:id;type:char(36);primaryKey"`
	UserID    uuid.UUID `gorm:"column:user_id;type:char(36);index"`
	Title     string    `gorm:"column:title;type:varchar(100)"`
	CreatedAt time.Time `gorm:"column:created_at;autoCreateTime"`
	UpdatedAt time.Time `gorm:"column:updated_at;autoUpdateTime"`
}

// TableName 指定Conversation结构体对应的表名
func (Conversation) TableName() string {
	return "conversations"
}

type Message struct {
	ID             uuid.UUID `gorm:"column:id;type:char(36);primaryKey"`
	Content        string    `gorm:"column:content;type:mediumtext"`
	Role           string    `gorm:"column:role;type:varchar(20)"`
	ConversationID uuid.UUID `gorm:"column:conversation_id;type:char(36);index"`
	CreatedAt      time.Time `gorm:"column:created_at;autoCreateTime"`
}

// TableName 指定Message结构体对应的表名
func (Message) TableName() string {
	return "messages"
}

// VerifyCode 验证码结构
type VerifyCode struct {
	ID        uuid.UUID `gorm:"column:id;type:char(36);primaryKey"`
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
	ID        uuid.UUID `gorm:"column:id;type:char(36);primaryKey"`
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

// SetPassword 设置用户密码
func SetPassword(u *User, password string) {
	u.PasswordHash = HashPassword(password)
}

// IsActiveMember 检查用户会员是否有效
func IsActiveMember(u *User) bool {
	if !u.IsMember {
		return false
	}
	if u.MemberUntil == nil {
		return false
	}
	return time.Now().Before(*u.MemberUntil)
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

	if u.MemberUntil != nil {
		now := time.Now()
		if now.Before(*u.MemberUntil) {
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
	if u.MemberSince != nil {
		result["since"] = u.MemberSince.Format(time.RFC3339)
	}
	if u.MemberUntil != nil {
		result["until"] = u.MemberUntil.Format(time.RFC3339)
	}
	return result
}

// AddPoints 增加或减少用户积分
func AddPoints(u *User, amount int) bool {
	u.Points += amount
	if u.Points < 0 {
		u.Points = 0
		return true
	}
	return false
}

// RegisterUser 用户注册函数
func RegisterUser(db *gorm.DB, username, email, password string) (User, error) {
	// 创建用户实例
	user := User{
		ID:          uuid.NewV4(),
		Username:    username,
		Email:       email,
		IsMember:    false,  // 显式初始化布尔字段
		MemberLevel: "free", // 显式初始化会员级别
		Points:      0,      // 显式初始化积分数
	}

	// 设置密码
	SetPassword(&user, password)

	// 插入数据库
	result := db.Create(&user)
	if result.Error != nil {
		return user, result.Error
	}

	return user, nil
}

var DB *gorm.DB

func GetDB() *gorm.DB {
	// 连接数据库
	var err error

	// 获取配置
	config := GetConfig()

	// 使用配置中的数据库连接信息
	DB, err = gorm.Open(mysql.Open(config.GetDSN()), &gorm.Config{})
	if err != nil {
		fmt.Println("连接数据库失败：", err)
		return nil
	}
	return DB
}

// InitDB 初始化数据库
func InitDB(DB *gorm.DB) *gorm.DB {
	// 自动迁移表结构
	// 如果表不存在则创建，如果存在但结构不匹配则修改表结构
	err := DB.AutoMigrate(&User{}, &Conversation{}, &Message{}, &VerifyCode{}, &SignRecord{}, &Share{})
	if err != nil {
		fmt.Println("自动迁移表结构失败：", err)
		return nil
	}

	fmt.Println("数据库表结构初始化完成")

	return DB
}

// HashPassword 使用MD5哈希密码
func HashPassword(password string) string {
	hash := md5.Sum([]byte(password))
	return hex.EncodeToString(hash[:])
}

// FilterBy 通过条件过滤用户
func FilterBy(db *gorm.DB, username string, email string) User {
	var user User

	// 创建查询
	query := db.Table("users")

	// 根据提供的参数添加查询条件
	if username != "" {
		query = query.Where("username = ?", username)
	}
	if email != "" {
		query = query.Where("email = ?", email)
	}

	// 执行查询
	query.First(&user)

	return user
}

// VerifyPassword 比较密码
func VerifyPassword(inputPassword string, passwordHash string) bool {
	// 将输入的密码进行哈希处理并与存储的哈希值进行比较
	return HashPassword(inputPassword) == passwordHash
}

// LoadConversationHistory 加载指定conversationID的对话历史
func LoadConversationHistory(db *gorm.DB, conversationID uuid.UUID) ([]openai.ChatCompletionMessage, error) {
	var messages []Message
	result := db.Where("conversation_id = ?", conversationID).Order("created_at ASC").Find(&messages)
	if result.Error != nil {
		return nil, result.Error
	}

	var chatMessages []openai.ChatCompletionMessage
	for _, msg := range messages {
		chatMessages = append(chatMessages, openai.ChatCompletionMessage{
			Role:    msg.Role,
			Content: msg.Content,
		})
	}

	return chatMessages, nil
}

// SaveConversationHistory 保存对话历史到指定conversationID
func SaveConversationHistory(db *gorm.DB, conversationID uuid.UUID, messages []openai.ChatCompletionMessage) error {
	// 删除现有的消息记录
	if err := db.Where("conversation_id = ?", conversationID).Delete(&Message{}).Error; err != nil {
		return err
	}

	// 添加新的消息记录
	for _, msg := range messages {
		message := Message{
			ID:             uuid.NewV4(),
			Content:        msg.Content,
			Role:           msg.Role,
			ConversationID: conversationID,
		}
		if err := db.Create(&message).Error; err != nil {
			return err
		}
	}

	return nil
}

// HasSignedToday 检查用户今日是否已签到
func HasSignedToday(db *gorm.DB, email string) (bool, error) {
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
func Sign(db *gorm.DB, Email string) error {
	// 获取用户信息
	user := FilterBy(db, "", Email)
	if user.Username == "" {
		return fmt.Errorf("用户不存在")
	}

	// 检查今日是否已签到
	signed, err := HasSignedToday(db, user.Email)
	if err != nil {
		return err
	}

	if signed {
		return fmt.Errorf("今日已签到")
	}

	// 随机数生成
	points := rand.Intn(20) + 90
	AddPoints(&user, points)

	// 记录签到信息
	signRecord := SignRecord{
		ID:       uuid.NewV4(),
		Email:    user.Email,
		LastSign: time.Now(),
	}

	// 检查用户是否已有签到记录
	var existingRecord SignRecord
	result := db.Where("email = ?", user.Email).First(&existingRecord)
	if result.Error != nil && result.Error == gorm.ErrRecordNotFound {
		// 创建新记录
		result = db.Create(&signRecord)
	} else if result.Error == nil {
		// 更新现有记录
		result = db.Model(&existingRecord).Updates(map[string]interface{}{
			"last_sign": time.Now(),
		})
	} else {
		// 其他数据库错误
		return result.Error
	}

	if result.Error != nil {
		return result.Error
	}

	// 更新用户积分
	db.Model(&user).Update("points", user.Points)

	return nil
}

// SaveVerifyCode 保存验证码到数据库
func SaveVerifyCode(db *gorm.DB, email, code string) error {
	// 删除该邮箱之前的验证码
	db.Where("email = ?", email).Delete(&VerifyCode{})

	// 创建新的验证码记录
	verifyCode := VerifyCode{
		ID:        uuid.NewV4(),
		Email:     email,
		Code:      code,
		CreatedAt: time.Now(),
		ExpiresAt: time.Now().Add(10 * time.Minute), // 10分钟后过期
	}

	result := db.Create(&verifyCode)
	return result.Error
}

// CheckVerifyCode 验证邮箱和验证码
func CheckVerifyCode(db *gorm.DB, email, code string) bool {
	var verifyCode VerifyCode

	// 查找未过期的验证码
	result := db.Where("email = ? AND code = ? AND expires_at > ?", email, code, time.Now()).First(&verifyCode)
	if result.Error != nil {
		return false
	}

	return true
}

func CreateConversation(db *gorm.DB, userID uuid.UUID) uuid.UUID {
	conversationID := uuid.NewV4()
	db.Create(&Conversation{
		ID:     conversationID,
		UserID: userID,
		Title:  "新对话",
	})
	return conversationID
}

// SaveShareMessages 保存分享消息
func SaveShareMessages(db *gorm.DB, messageIDs []string) (string, error) {
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
func LoadShareMessages(db *gorm.DB, shareID string) ([]string, error) {
	// 清理超过7天的分享
	db.Where("created_at < ?", time.Now().AddDate(0, 0, -7)).Delete(&Share{})

	// 查找分享记录
	var share Share
	result := db.Where("share_id = ?", shareID).First(&share)
	if result.Error != nil {
		return nil, result.Error
	}

	// 解析messageIDs JSON
	var messageIDs []string
	err := json.Unmarshal([]byte(share.MessageIDs), &messageIDs)
	if err != nil {
		return nil, err
	}

	return messageIDs, nil
}

func DeleteConversation(db *gorm.DB, conversationID uuid.UUID) error {
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

func RenameConversation(db *gorm.DB, conversationID uuid.UUID, title string) error {
	result := db.Table("conversations").Where("id = ?", conversationID).Update("title", title)
	if result.Error != nil {
		return result.Error
	}
	return nil
}
