const { defineConfig } = require('@vue/cli-service')

module.exports = {
  devServer: {
    proxy: {
      '/api': {
        target: 'http://localhost:5000', // 后端接口地址
        changeOrigin: true // 允许跨域
      },
      '/auth': {
        target: 'http://localhost:5000',
        changeOrigin: true
      },
      '/static': {
        target: 'http://localhost:5000',
        changeOrigin: true
      },
      '/dashboard': {
        target: 'http://localhost:5000',
        changeOrigin: true
      }
    }
  },
  transpileDependencies: true
}