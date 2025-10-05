package utils

import (
	"fmt"
	"os"

	"gopkg.in/yaml.v2"
)

// Config 定义整体配置结构
type Config struct {
	API                      string `yaml:"api"`
	APIKey                   string `yaml:"apiKey"`
	ModelTTS                 string `yaml:"modelTTS"`
	ModelSTT                 string `yaml:"modelSTT"`
	API2                     string `yaml:"api2"`
	APIKey2                  string `yaml:"apiKey2"`
	DefaultDialogNamingModel string `yaml:"defaultDialogNamingModel"`
	DefaultVisualModel       string `yaml:"defaultVisualModel"`
	Models                   []struct {
		Name      string `yaml:"name"`      // 向用户展示
		ID        string `yaml:"id"`        // 调用模型时使用
		Points    int    `yaml:"points"`    // 使用1次扣除积分 VIP用户半价（向上取整） SVIP用户免费
		Reasoning string `yaml:"reasoning"` // ""：不支持 原模型ID：强制推理 其他模型ID：支持推理（扣除1.5倍积分（向上取整））
		Tool      int    `yaml:"tool"`      // 0不支持 1支持
		Image     int    `yaml:"image"`     // 0不支持 1只支持输入 2只支持输出 3支持输出和输出
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
	Database struct {
		Host     string `yaml:"host"`
		Port     int    `yaml:"port"`
		Username string `yaml:"username"`
		Password string `yaml:"password"`
		DBName   string `yaml:"dbname"`
		Charset  string `yaml:"charset"`
	} `yaml:"database"`
	UserID string `yaml:"userID"`
	Token  string `yaml:"token"`
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
