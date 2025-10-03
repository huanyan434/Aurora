package main

import (
	"encoding/gob"
	"fmt"

	"github.com/gin-contrib/sessions"
	"github.com/gin-contrib/sessions/cookie"
	"github.com/gin-gonic/gin"
	swaggerFiles "github.com/swaggo/files"
	ginSwagger "github.com/swaggo/gin-swagger"

	_ "docs"
	"routes"
	"utils"
)

// @title Aurora API
// @version 1.0
// @description API文档 for Aurora 项目
// @host localhost:5000
// @BasePath /
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

	// Swagger路由
	r.GET("/swagger/*any", ginSwagger.WrapHandler(swaggerFiles.Handler))

	err := r.Run(":5000")
	if err != nil {
		fmt.Println("Err:", err)
		return
	}
}
