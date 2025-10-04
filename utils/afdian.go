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

	uuid "github.com/satori/go.uuid"
)

func QueryOrder(orderID string) (bool, []map[string]interface{}) {
	var data map[string]interface{}
	var list []map[string]interface{}

	configs := GetConfig()
	userID := configs.UserID
	token := configs.Token
	ts := strconv.Itoa(int(time.Now().Unix()))
	params := fmt.Sprintf(`{"out_trade_no":"%s"}`, orderID)
	sign := MD5(fmt.Sprintf("%sparams%sts%suser_id%s", token, params, ts, userID))
	params = fmt.Sprintf(`{\"out_trade_no\":\"%s\"}`, orderID)

	Json := fmt.Sprintf(`{"user_id":"%s","params":"%s","ts":%s,"sign":"%s"}`, userID, params, ts, sign)
	url := "https://afdian.com/api/open/query-order"

	payload := strings.NewReader(Json)
	req, _ := http.NewRequest("POST", url, payload)
	req.Header.Add("Content-Type", "application/json")
	resp, err := http.DefaultClient.Do(req)
	if err != nil {
		fmt.Println("Err:", err)
		return false, list
	}
	defer resp.Body.Close()

	result, err := ParseResponse(resp)
	if err != nil {
		fmt.Println("Err:", err)
		return false, list
	}

	resultData, err := json.Marshal(result["data"])
	if err != nil {
		return false, list
	}
	err = json.Unmarshal(resultData, &data)
	if err != nil {
		return false, list
	}

	dataList, err := json.Marshal(data["list"])
	if err != nil {
		return false, list
	}
	err = json.Unmarshal(dataList, &list)
	if err != nil {
		return false, list
	}
	jsonList, err := json.Marshal(list)
	if err != nil {
		fmt.Println("Err:", err)
		return false, list
	}
	fmt.Println(string(jsonList))
	if list[0]["plan_title"].(string) != "" {
		return true, list
	}
	return false, list
}

func VerifyVip(userID uuid.UUID, orderID string, force bool) string {
	success, list := QueryOrder(orderID)
	if success {
		verify, err := SearchOrder(orderID)
		if err != nil {
			return "发生错误：" + err.Error()
		}
		if verify == true {
			return "orderID 已被使用"
		}
		var user User
		GetDB().Table("users").Where("id = ?", userID).First(&user)
		var level string
		var begin time.Time
		var end time.Time
		var days int

		memberStatus := GetMemberStatus(&user)
		if list[0]["plan_title"] == "月VIP" {
			days = 30
			level = "VIP"
			if IsActiveMember(&user) {
				if user.MemberLevel == "SVIP" {
					if force == false {
						return "SVIP用户无法使用VIP orderID"
					} else {
						days = 30 + memberStatus["days_left"].(int)*2
					}
				}
				begin = user.MemberSince
				end = begin
			} else {
				begin = time.Now()
				end = time.Now()
			}
		} else if list[0]["plan_title"] == "季VIP" {
			days = 90
			level = "VIP"
			if IsActiveMember(&user) {
				if user.MemberLevel == "SVIP" {
					if force == false {
						return "SVIP用户无法使用VIP orderID"
					} else {
						days = 90 + memberStatus["days_left"].(int)*2
					}
				}
				begin = user.MemberSince
				end = begin
			} else {
				begin = time.Now()
				end = time.Now()
			}
		} else if list[0]["plan_title"] == "年VIP" {
			days = 365
			level = "VIP"
			if IsActiveMember(&user) {
				if user.MemberLevel == "SVIP" {
					if force == false {
						return "SVIP用户无法使用VIP orderID"
					} else {
						days = 365 + memberStatus["days_left"].(int)*2
					}
				}
				begin = user.MemberSince
				end = begin
			} else {
				begin = time.Now()
				end = time.Now()
			}
		} else if list[0]["plan_title"] == "月SVIP" {
			days = 30
			level = "SVIP"
			if IsActiveMember(&user) {
				if user.MemberLevel == "VIP" {
					days = 30 + (memberStatus["days_left"].(int) / 2)
				}
				begin = user.MemberSince
				end = begin
			} else {
				begin = time.Now()
				end = time.Now()
			}
		} else if list[0]["plan_title"] == "季SVIP" {
			days = 90
			level = "SVIP"
			if IsActiveMember(&user) {
				if user.MemberLevel == "VIP" {
					days = 30 + (memberStatus["days_left"].(int) / 2)
				}
				begin = user.MemberSince
				end = begin
			} else {
				begin = time.Now()
				end = time.Now()
			}
		} else if list[0]["plan_title"] == "年SVIP" {
			days = 365
			level = "SVIP"
			if IsActiveMember(&user) {
				if user.MemberLevel == "VIP" {
					days = 30 + (memberStatus["days_left"].(int) / 2)
				}
				begin = user.MemberSince
				end = begin
			} else {
				begin = time.Now()
				end = time.Now()
			}
		} else {
			return "无效 orderID"
		}

		user.IsMember = true
		user.MemberLevel = level

		user.MemberSince = begin
		user.MemberUntil = end.AddDate(0, 0, days)

		err = VerifyOrder(orderID)
		if err != nil {
			return "内部错误"
		}
		return ""
	} else {
		return "无效 orderID"
	}
}

func VerifyPoints(userID uuid.UUID, orderID string) string {
	success, list := QueryOrder(orderID)
	if success {
		verify, err := SearchOrder(orderID)
		if err != nil {
			return "发生错误：" + err.Error()
		}
		if verify == true {
			return "orderID 已被使用"
		}
		var user User
		GetDB().Table("users").Where("id = ?", userID).First(&user)

		if list[0]["plan_title"] == "Aurora 积分" {
		} else {
			return "无效 orderID"
		}

		points, err := strconv.ParseFloat(list[0]["show_amount"].(string), 64)
		if err != nil {
			return "内部错误"
		}
		AddPoints(user.ID, int(points)*100)
		err = VerifyOrder(orderID)
		if err != nil {
			return "内部错误"
		}
		return ""
	} else {
		return "无效 orderID"
	}
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
