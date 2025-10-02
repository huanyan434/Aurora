package utils

import (
	"crypto/md5"
	"encoding/json"
	"fmt"
	"io"
	"net/http"
	"strconv"
	"strings"
	"time"
)

func QueryOrder(orderID string) bool {
	configs := GetConfig()
	userID := configs.UserID
	token := configs.Token
	ts := strconv.Itoa(int(time.Now().Unix()))
	params := fmt.Sprintf(`{"out_trade_no":"%s"}`, orderID)
	sign := MD5(fmt.Sprintf("%sparams%sts%suser_id%s", token, params, ts, userID))
	params = fmt.Sprintf(`{\"out_trade_no\":\"%s\"}`, orderID)

	Json := fmt.Sprintf(`{"user_id":"%s","params":"%s","ts":%s,"sign":"%s"}`, userID, params, ts, sign)
	url := "https://afdian.com/api/open/query-order"

	fmt.Println(Json)
	payload := strings.NewReader(Json)
	req, _ := http.NewRequest("POST", url, payload)
	req.Header.Add("Content-Type", "application/json")
	resp, err := http.DefaultClient.Do(req)
	if err != nil {
		fmt.Println("Err:", err)
		return false
	}
	defer resp.Body.Close()

	result, err := ParseResponse(resp)
	if err != nil {
		fmt.Println("Err:", err)
		return false
	}
	fmt.Println(result)
	var data map[string]interface{}

	resultData, err := json.Marshal(result["data"])
	if err != nil {
		return false
	}
	err = json.Unmarshal(resultData, &data)
	if err != nil {
		return false
	}

	var list []map[string]interface{}
	dataList, err := json.Marshal(data["list"])
	if err != nil {
		return false
	}
	err = json.Unmarshal(dataList, &list)
	if err != nil {
		return false
	}
	if list[0]["user_id"].(string) != "" {
		return true
	}
	return false
}

func MD5(str string) string {
	data := []byte(str)
	has := md5.Sum(data)
	md5str := fmt.Sprintf("%x", has)
	return md5str
}

func ParseResponse(response *http.Response) (map[string]interface{}, error) {
	var result map[string]interface{}
	body, err := io.ReadAll(response.Body)
	if err == nil {
		err = json.Unmarshal(body, &result)
	}
	return result, err
}
