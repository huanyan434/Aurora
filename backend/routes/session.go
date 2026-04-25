package routes

// CurrentUserSession 只保存当前用户会话所需的轻量字段。
type CurrentUserSession struct {
	ID          int64  `json:"id"`
	Email       string `json:"email"`
	Username    string `json:"username"`
	IsMember    bool   `json:"isMember"`
	MemberLevel string `json:"memberLevel"`
}
