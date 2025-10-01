package main

import (
	"encoding/gob"
	"github.com/gin-contrib/sessions"
	"github.com/gin-contrib/sessions/cookie"
	"github.com/gin-gonic/gin"

	"routes"
	"utils"
)

func main() {
	// 数据库
	DB := utils.GetDB()
	utils.InitDB(DB)

	r := gin.Default()

	store := cookie.NewStore([]byte("snaosnca"))
	r.Use(sessions.Sessions("SESSIONID", store))
	gob.Register(utils.User{})

	routes.ChatInit(r)
	routes.ApiInit(r)

	r.Run(":5000")
}
