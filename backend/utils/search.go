package utils

import (
	"bytes"
	"encoding/json"
	"fmt"
	"io"
	"net/http"
	"time"
)

// TavilySearchRequest Tavily 搜索请求结构
type TavilySearchRequest struct {
	APIKey          string   `json:"api_key"`
	Query           string   `json:"query"`
	SearchDepth     string   `json:"search_depth,omitempty"`     // basic 或 advanced
	MaxResults      int      `json:"max_results,omitempty"`      // 默认5
	IncludeAnswer   bool     `json:"include_answer,omitempty"`   // 是否包含AI生成的答案
	IncludeRawContent bool   `json:"include_raw_content,omitempty"` // 是否包含原始内容
	IncludeDomains  []string `json:"include_domains,omitempty"`  // 限制搜索域名
	ExcludeDomains  []string `json:"exclude_domains,omitempty"`  // 排除域名
}

// TavilySearchResult Tavily 搜索结果项
type TavilySearchResult struct {
	Title       string  `json:"title"`
	URL         string  `json:"url"`
	Content     string  `json:"content"`
	Score       float64 `json:"score"`
	RawContent  string  `json:"raw_content,omitempty"`
}

// TavilySearchResponse Tavily 搜索响应结构
type TavilySearchResponse struct {
	Answer         string               `json:"answer,omitempty"`
	Query          string               `json:"query"`
	ResponseTime   float64              `json:"response_time"`
	Images         []string             `json:"images,omitempty"`
	Results        []TavilySearchResult `json:"results"`
	FollowUpQuestions []string          `json:"follow_up_questions,omitempty"`
}

// SearchWithTavily 使用 Tavily API 进行搜索
func SearchWithTavily(query string, maxResults int, searchDepth string, includeAnswer bool) (*TavilySearchResponse, error) {
	config := GetConfig()
	if config.TavilyApiKey == "" {
		return nil, fmt.Errorf("Tavily API Key 未配置")
	}

	// 设置默认值
	if maxResults <= 0 {
		maxResults = 5
	}
	if searchDepth == "" {
		searchDepth = "basic"
	}

	// 构建请求
	reqBody := TavilySearchRequest{
		APIKey:        config.TavilyApiKey,
		Query:         query,
		SearchDepth:   searchDepth,
		MaxResults:    maxResults,
		IncludeAnswer: includeAnswer,
	}

	jsonData, err := json.Marshal(reqBody)
	if err != nil {
		return nil, fmt.Errorf("序列化请求失败: %v", err)
	}

	// 发送 HTTP 请求
	client := &http.Client{
		Timeout: 30 * time.Second,
	}

	req, err := http.NewRequest("POST", "https://api.tavily.com/search", bytes.NewBuffer(jsonData))
	if err != nil {
		return nil, fmt.Errorf("创建请求失败: %v", err)
	}

	req.Header.Set("Content-Type", "application/json")

	resp, err := client.Do(req)
	if err != nil {
		return nil, fmt.Errorf("请求失败: %v", err)
	}
	defer resp.Body.Close()

	// 读取响应
	body, err := io.ReadAll(resp.Body)
	if err != nil {
		return nil, fmt.Errorf("读取响应失败: %v", err)
	}

	if resp.StatusCode != http.StatusOK {
		return nil, fmt.Errorf("搜索失败 (状态码 %d): %s", resp.StatusCode, string(body))
	}

	// 解析响应
	var searchResp TavilySearchResponse
	if err := json.Unmarshal(body, &searchResp); err != nil {
		return nil, fmt.Errorf("解析响应失败: %v", err)
	}

	return &searchResp, nil
}

// SimpleSearch 简化的搜索接口，返回格式化的文本结果
func SimpleSearch(query string) (string, error) {
	resp, err := SearchWithTavily(query, 5, "basic", true)
	if err != nil {
		return "", err
	}

	var result string

	// 添加 AI 生成的答案
	if resp.Answer != "" {
		result += fmt.Sprintf("【AI 答案】\n%s\n\n", resp.Answer)
	}

	// 添加搜索结果
	result += "【搜索结果】\n"
	for i, item := range resp.Results {
		result += fmt.Sprintf("%d. %s\n", i+1, item.Title)
		result += fmt.Sprintf("   链接: %s\n", item.URL)
		result += fmt.Sprintf("   摘要: %s\n\n", item.Content)
	}

	return result, nil
}
