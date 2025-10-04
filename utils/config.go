package utils

import (
	"fmt"
	"os"

	"gopkg.in/yaml.v2"
)

// DatabaseConfig 定义数据库配置结构
type DatabaseConfig struct {
	Host     string `yaml:"host"`
	Port     int    `yaml:"port"`
	Username string `yaml:"username"`
	Password string `yaml:"password"`
	DBName   string `yaml:"dbname"`
	Charset  string `yaml:"charset"`
}

// Config 定义整体配置结构
type Config struct {
	API         string `yaml:"api"`
	APIKey      string `yaml:"apiKey"`
	ModelTTS    string `yaml:"modelTTS"`
	ModelSTT    string `yaml:"modelSTT"`
	APINameC    string `yaml:"apiNameC"`
	APIKeyNameC string `yaml:"apiKeyNameC"`
	ModelNameC  string `yaml:"modelNameC"`
	ModelScan   string `yaml:"modelScan"`
	Models      []struct {
		Name   string `yaml:"name"`
		ID     string `yaml:"id"`
		Points int    `yaml:"points"`
	} `yaml:"models"`
	Email struct {
		Sender struct {
			Email    string `yaml:"email"`
			Password string `yaml:"password"`
		} `yaml:"sender"`
		SMTP struct {
			Host string `yaml:"host"`
			Port int    `yaml:"port"`
		} `yaml:"smtp"`
	} `yaml:"email"`
	Database DatabaseConfig `yaml:"database"`
	UserID   string         `yaml:"userID"`
	Token    string         `yaml:"token"`
}

var AppConfig *Config

// LoadConfig 从config.yaml加载配置
func LoadConfig() (*Config, error) {
	// 读取配置文件
	data, err := os.ReadFile("utils/config.yaml")
	if err != nil {
		return nil, fmt.Errorf("无法读取配置文件: %v", err)
	}

	// 解析YAML
	var config Config
	err = yaml.Unmarshal(data, &config)
	if err != nil {
		return nil, fmt.Errorf("无法解析配置文件: %v", err)
	}

	AppConfig = &config
	return &config, nil
}

// GetConfig 获取配置实例
func GetConfig() *Config {
	if AppConfig == nil {
		_, err := LoadConfig()
		if err != nil {
			panic(err)
		}
	}
	return AppConfig
}

// GetDSN 生成数据库连接字符串
func (c *Config) GetDSN() string {
	return fmt.Sprintf("%s:%s@tcp(%s:%d)/%s?charset=%s&parseTime=True&loc=Local",
		c.Database.Username,
		c.Database.Password,
		c.Database.Host,
		c.Database.Port,
		c.Database.DBName,
		c.Database.Charset)
}
