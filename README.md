# 项目简介
本项目是一个名为Aurora的AI聊天网站，旨在让更多人用上更优的AI。

# 使用链接
[https://c.wanyim.cn/](https://c.wanyim.cn/)

# 本地部署
1. 克隆项目仓库：
```bash
git clone https://github.com/huanyan434/Aurora.git
```

2. 进入项目目录：
```bash
cd Aurora-main
```

3. 创建.env文件：
在项目根目录下创建一个名为 `.env` 的文件，并在其中添加以下环境变量：
```plaintext
api=your_volcano_api_key,your_siliconflow_api_key,your_gemini_api_key
volcengine_key=your_volcengine_api_key
siliconflow_api_key=your_siliconflow_api_key
gemini_api_key=your_gemini_api_key
```
请将 `your_volcano_api`、`your_siliconflow_api`、`your_gemini_api` 分别替换为实际的火山方舟、硅基流动、Gemini的API，
将 `your_volcano_api_key`、`your_siliconflow_api_key`、`your_gemini_api_key` 分别替换为实际的火山方舟、硅基流动、Gemini的API密钥。

4. 运行初始化脚本：
```bash
./init.sh  # 对于Windows用户使用 `init.bat`
```
5. 启动应用程序：
```bash
./start.sh  # 对于Windows用户使用 `start.bat`
```

# 注意事项
- 请确保你已经安装了Python 3.11以上版本。
- 在运行初始化脚本和启动脚本之前，请先根据实际情况修改 `.env` 文件。

# 贡献
如果你想为这个项目做出贡献，请遵循以下步骤：
1. Fork这个仓库。
2. 创建一个新的分支：`git checkout -b your-branch-name`
3. 进行修改并提交：`git commit -m '你的修改说明'`
4. 推送到你的分支：`git push origin your-branch-name`
5. 提交一个Pull Request。
