package utils

import (
	"crypto/tls"
	"math/rand"
	"strconv"

	"gopkg.in/gomail.v2"
)

func SendEmailCode(email string, code string) bool {
	// 获取配置
	config := GetConfig()

	senderEmail := config.Email.Sender.Email
	senderPassword := config.Email.Sender.Password
	smtpHost := config.Email.SMTP.Host
	smtpPort := config.Email.SMTP.Port

	m := gomail.NewMessage()

	m.SetHeader("From", "Aurora"+"<"+senderEmail+">")
	m.SetHeader("To", email)
	m.SetHeader("Subject", "Aurora 验证码")

	m.SetBody("text/plain", "您的验证码是："+code+"，15分钟内有效，请勿将验证码告知他人。")

	d := gomail.NewDialer(
		smtpHost,
		smtpPort,
		senderEmail,
		senderPassword,
	)

	d.TLSConfig = &tls.Config{InsecureSkipVerify: true}

	err := d.DialAndSend(m)
	if err != nil {
		return false
	}

	// 保存验证码到数据库
	db := GetDB()
	err = SaveVerifyCode(db, email, code)
	if err != nil {
		return false
	}

	return true
}

func VerifyEmail(email string, code string) bool {
	// 检测验证码是否数字
	_, err := strconv.Atoi(code)
	if err != nil {
		return false
	}
	// 验证是否6位
	if len(code) != 6 {
		return false
	}

	// 从数据库验证验证码
	db := GetDB()
	return CheckVerifyCode(db, email, code)
}

func GenerateVerifyCode() string {
	code := rand.Intn(899999) + 100000
	return strconv.Itoa(code)
}
