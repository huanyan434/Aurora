document.addEventListener('DOMContentLoaded', function() {
    // ====================== 核心元素 ======================
    const elements = {
        messagesContainer: document.getElementById('messages'),
        messageInput: document.getElementById('message-input'),
        sendButton: document.querySelector('.send-button'),
        newChatBtn: document.getElementById('new-chat-btn'),
        conversationsList: document.getElementById('conversations-list'),
        collapseBtn: document.querySelector('.collapse-btn'),
        sidebar: document.querySelector('.conversation-sidebar'),
        sidebarToggle: document.querySelector('.sidebar-toggle'),
        sidebarOverlay: document.querySelector('.sidebar-overlay'),
        logoutBtn: document.querySelector('.logout-btn'),
        confirmDialog: null,
        confirmOk: null,
        confirmCancel: null,
        modelSelect: document.getElementById('model-select'),
        imageUploadButton: document.querySelector('.image-upload-button'),
        imageUploadInput: document.getElementById('image-upload'),
        imagePreviewContainer: document.getElementById('image-preview-container'),
        previewImage: document.getElementById('preview-image'),
        removeImageBtn: document.querySelector('.remove-image-btn')
    };

    // ====================== 状态管理 ======================
    const state = {
        currentConversationId: null,
        isSending: false,
        conversations: [],  // 存储对话列表
        isDeleting: false,
        isSidebarCollapsed: document.querySelector('.conversation-sidebar')?.classList.contains('collapsed') || false,
        currentModel: localStorage.getItem('selectedModel') || 'DeepSeek-R1',  // 从localStorage中获取模型，如果没有则使用默认值
        isNearBottom: false,
        abortController: null,  // 添加中断控制器
        lastUserMessage: null,  // 添加 lastUserMessage 属性
        selectedImage: null     // 存储选择的图片
    };

    // ====================== 初始化 ======================
    async function init() {
        try {
        validateElements();
        setupEventListeners();
            setupScrollListener();
            setupModelSelector();
            await initChat();
            startMarkdownObserver();
            scrollToBottom(true);
        } catch (error) {
            console.error('初始化失败:', error);
            showError('初始化失败: ' + error.message);
        }
    }

    function validateElements() {
        for (const [key, element] of Object.entries(elements)) {
            if (!element) {
                console.error(`${key} 元素未找到`);
            }
        }
    }

    // ====================== 事件监听 ======================
    function setupEventListeners() {
        // 发送按钮点击事件
        if (elements.sendButton) {
            elements.sendButton.addEventListener('click', async () => {
                console.log('发送/停止按钮被点击');
                console.log('当前状态:', state.isSending ? '正在发送中' : '准备发送');
                
                if (state.isSending) {
                    console.log('尝试中断请求...');
                    // 如果正在发送，立即中断请求
                    if (state.abortController) {
                        // 立即更新UI状态
                        state.isSending = false;
                        updateSendButtonState();
                        
                        try {
                        // 中断请求 - AbortError会在getAIResponse中处理
                        // 包括添加中断提示和保存内容
                        state.abortController.abort();
                            console.log('请求已中断');
                        } catch (e) {
                            console.error('中断请求时出错:', e);
                        }
                        state.abortController = null;
                    } else {
                        console.warn('没有可中断的请求');
                        state.isSending = false;
                        updateSendButtonState();
                    }
                } else {
                    console.log('开始发送消息...');
                    sendMessageHandler();
                }
            });
        }

        // 输入框回车事件
        if (elements.messageInput) {
            elements.messageInput.addEventListener('keypress', function(e) {
            if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault();
                sendMessageHandler();
            }
        });

            // 添加输入框自动调整高度
            elements.messageInput.addEventListener('input', function() {
                this.style.height = 'auto';
                this.style.height = (this.scrollHeight) + 'px';
            });
        }

        // 新对话按钮点击事件
        if (elements.newChatBtn) {
            elements.newChatBtn.addEventListener('click', handleNewChat);
        }

        // 折叠按钮点击事件
        if (elements.collapseBtn) {
            elements.collapseBtn.addEventListener('click', toggleSidebar);
        }

        // 登出按钮点击事件
        if (elements.logoutBtn) {
            elements.logoutBtn.addEventListener('click', logout);
        }

        // 添加侧边栏切换按钮事件
        if (elements.sidebarToggle) {
            elements.sidebarToggle.addEventListener('click', toggleMobileSidebar);
        }

        // 添加遮罩层点击事件
        if (elements.sidebarOverlay) {
            elements.sidebarOverlay.addEventListener('click', closeMobileSidebar);
        }

        // 图片上传按钮点击事件
        if (elements.imageUploadButton) {
            elements.imageUploadButton.addEventListener('click', function() {
                elements.imageUploadInput.click();
            });
        }

        // 图片选择事件
        if (elements.imageUploadInput) {
            elements.imageUploadInput.addEventListener('change', handleImageSelect);
        }
        
        // 删除图片按钮事件
        if (elements.removeImageBtn) {
            elements.removeImageBtn.addEventListener('click', removeSelectedImage);
        }
    }

    // ====================== 图片处理 ======================
    function handleImageSelect(event) {
        const file = event.target.files[0];
        if (file && file.type.startsWith('image/')) {
            state.selectedImage = file;
            
            // 显示图片预览
            const reader = new FileReader();
            reader.onload = function(e) {
                elements.previewImage.src = e.target.result;
                elements.imagePreviewContainer.style.display = 'block';
            };
            reader.readAsDataURL(file);
            
            // 更新发送按钮状态
            updateSendButtonState();
            
            // 提示用户可以添加描述或直接发送
            showNotification('图片已选择，您可以添加描述或直接点击发送按钮', 3000);
        } else if (file) {
            showError('请选择有效的图片文件');
        }
        
        // 重置input，允许再次选择同一文件
        event.target.value = '';
    }
    
    // 移除选择的图片
    function removeSelectedImage() {
        state.selectedImage = null;
        elements.previewImage.src = '';
        elements.imagePreviewContainer.style.display = 'none';
        updateSendButtonState();
    }

    // 显示通知
    function showNotification(message, duration = 3000) {
        // 创建通知元素
        const notification = document.createElement('div');
        notification.className = 'notification';
        notification.textContent = message;
        
        // 添加到页面
        document.body.appendChild(notification);
        
        // 显示动画
        setTimeout(() => {
            notification.classList.add('show');
        }, 10);
        
        // 自动关闭
        setTimeout(() => {
            notification.classList.remove('show');
            setTimeout(() => {
                notification.remove();
            }, 300);
        }, duration);
    }

    // 将图片转换为base64
    function fileToBase64(file) {
        return new Promise((resolve, reject) => {
            const reader = new FileReader();
            reader.onload = () => resolve(reader.result.split(',')[1]); // 只取base64部分
            reader.onerror = reject;
            reader.readAsDataURL(file);
        });
    }

    // ====================== 消息发送核心 ======================
    async function sendMessageHandler() {
        console.log('尝试发送消息');
        const content = elements.messageInput.value.trim();
        
        // 检查是否有内容或图片
        if ((!content && !state.selectedImage) || state.isSending) {
            console.log('消息为空或正在发送中');
            return;
        }

        console.log('开始发送消息:', content);
        state.isSending = true;
        state.lastUserMessage = content;  // 保存用户消息
        updateSendButtonState();
        elements.messageInput.value = '';
        elements.messageInput.style.height = 'auto';
        
        // 隐藏图片预览（如果有）
        if (state.selectedImage) {
            elements.imagePreviewContainer.style.display = 'none';
        }

        try {
            // 如果没有当前对话 ID，先创建新对话
            if (!state.currentConversationId) {
                console.log('创建新对话');
                // 清空欢迎界面内容
                clearMessages();
                
                const response = await fetch('/conversations', {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json'
                    }
                });

                if (!response.ok) {
                    const errorData = await response.json();
                    throw new Error(`创建对话失败: ${errorData.error}`);
                }

                const data = await response.json();
                console.log('新对话创建成功:', data);
                
                state.currentConversationId = data.id;
                state.conversations.unshift(data);
                updateConversationsList();
                
                // 更新 URL
                updateUrl(data.id);
            }

            // 准备发送数据
            let messageData = {
                message: content,
                conversation_id: state.currentConversationId,
                model: getSelectedModel()
            };
            
            // 如果有图片，将其转换为base64并添加到请求中
            if (state.selectedImage) {
                try {
                    const imageBase64 = await fileToBase64(state.selectedImage);
                    messageData.image = imageBase64;
                    messageData.image_type = state.selectedImage.type;
                    messageData.image_name = state.selectedImage.name;
                    
                    // 添加消息预览(包含图片预览)
                    const messageContent = await createImagePreview(state.selectedImage, content);
                    appendMessage(messageContent, true);
                } catch (error) {
                    console.error('图片处理失败:', error);
                    showError('图片处理失败');
                    return;
                }
            } else {
                // 文本消息，直接添加
                appendMessage(content, true);
            }
            
            // 强制滚动到底部
            scrollToBottom(true);

            // 发送消息到服务器并获取 AI 响应
            const aiMessageId = `ai-${Date.now()}`;
            
            // 创建加载中的AI消息
            const modelName = getSelectedModel();
            createLoadingMessage(aiMessageId, modelName);
            
            // 获取AI响应
            await getAIResponse(messageData, state.currentConversationId, aiMessageId);
            
            // 清除已选择的图片
            state.selectedImage = null;
            
            // 更新对话列表
            await loadConversations();

        } catch (error) {
            console.error('发送消息失败:', error);
            showError('发送消息失败: ' + error.message);
            // 如果创建对话失败，清空当前对话ID
            if (!state.currentConversationId) {
                state.currentConversationId = null;
            }
        } finally {
            state.isSending = false;
            updateSendButtonState();  // 更新按钮状态
            elements.messageInput.focus();
            
            // 清除所有资源
            try {
                if (thinkTimerInterval) {
                    clearInterval(thinkTimerInterval);
                    thinkTimerInterval = null;
                }
            } catch (e) {
                console.error('清理资源时出错:', e);
            }
            
            state.abortController = null;
        }
    }

    // 创建图片预览
    async function createImagePreview(imageFile, caption) {
        return new Promise((resolve) => {
            const reader = new FileReader();
            reader.onload = function(e) {
                let content = '';
                
                // 如果有文字说明，先添加文字
                if (caption) {
                    content += `<p>${escapeHtml(caption)}</p>`;
                }
                
                // 图片显示在文字后面
                content += `<div class="image-preview"><img src="${e.target.result}" alt="上传的图片"></div>`;
                
                resolve(content);
            };
            reader.readAsDataURL(imageFile);
        });
    }

    // ====================== AI回复获取 ======================
    async function getAIResponse(messageData, conversationId, aiMessageId) {
        // 声明所有变量在函数开头，确保它们在作用域中的所有地方可用
        let buffer = '';
        let messageCreated = false;
        let aiMessageDiv = document.getElementById(aiMessageId); // 获取已创建的消息元素
        let currentThink = '';
        let currentContent = '';
        let thinkStartTime = Date.now();
        let thinkTimerInterval = null;
        let thinkHeaderElement = null;
        
        try {
            state.abortController = new AbortController();
            
            // 确保按钮状态立即更新
            updateSendButtonState();
            console.log('AI响应开始，已设置中断控制器');
            
            const response = await fetch('/stream-chat', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify(messageData),
                signal: state.abortController.signal
            });

            if (!response.ok) throw new Error('AI服务不可用');

            // 读取响应流
            const reader = response.body.getReader();
            const decoder = new TextDecoder();

            while (true) {
                const { done, value } = await reader.read();
                
                if (done) break;

                buffer += decoder.decode(value, { stream: true });
                
                // 处理缓冲区中的所有完整消息
                let newlineIndex;
                while ((newlineIndex = buffer.indexOf('\n')) !== -1) {
                    const line = buffer.slice(0, newlineIndex);
                    buffer = buffer.slice(newlineIndex + 1);
                    
                    if (!line) continue;
                    
                    try {
                        const data = JSON.parse(line);
                        console.log('解析的数据:', JSON.stringify(data));
                        
                        // 首次接收到消息内容时替换加载动画
                        if (!messageCreated) {
                            const modelName = data.model_name || getSelectedModel();
                            
                            // 清除加载动画
                            if (aiMessageDiv) {
                                // 保留模型信息，仅添加消息内容容器
                                const modelInfo = aiMessageDiv.querySelector('.model-info');
                                aiMessageDiv.innerHTML = '';
                                if (modelInfo) {
                                    aiMessageDiv.appendChild(modelInfo);
                                }
                                
                                // 添加消息内容元素
                                const contentDiv = document.createElement('div');
                                contentDiv.className = 'message-content';
                                aiMessageDiv.appendChild(contentDiv);
                                
                                messageCreated = true;
                                
                                // 强制滚动到底部，确保看到新消息
                                scrollToBottom(true);
                                
                                console.log('AI消息加载动画已替换为内容元素', aiMessageId);
                            } else {
                                console.error('找不到加载中的AI消息元素，ID:', aiMessageId);
                                
                                // 创建新消息元素（备用方案）
                                aiMessageDiv = document.createElement('div');
                                aiMessageDiv.className = 'message ai';
                                aiMessageDiv.id = aiMessageId;
                                
                                // 添加模型信息
                                const imageName = getModelImageName(modelName);
                                const modelInfoHtml = `
                                    <div class="model-info">
                                    <img src="/static/models/${imageName}.png" alt="${modelName}" class="model-avatar" onerror="this.src='/static/models/default.png';">
                                    <div class="model-name"><strong>${modelName}</strong></div>
                                    </div>
                                `;
                                
                                // 添加消息内容元素
                                const contentHtml = '<div class="message-content"></div>';
                                aiMessageDiv.innerHTML = modelInfoHtml + contentHtml;
                                
                                // 添加到消息容器
                                elements.messagesContainer.appendChild(aiMessageDiv);
                                
                                messageCreated = true;
                                
                                // 强制滚动到底部，确保看到新消息
                                scrollToBottom(true);
                                
                                console.log('找不到加载消息，创建了新的AI消息元素', aiMessageId);
                            }
                        }
                        
                        // 更新消息内容 - 先处理正文，保证即使没有思考内容也能显示消息
                        if ((data.content && data.content !== currentContent) || 
                            (data.text && data.text !== currentContent)) {
                            console.log('收到新消息内容:', JSON.stringify(data).substring(0, 50));
                            
                            // 更新currentContent，优先使用content，其次使用text
                            if (data.content) {
                                currentContent = data.content;
                            } else if (data.text) {
                                currentContent = data.text;
                            }
                            
                            // 确保消息内容元素存在
                            let contentDiv = aiMessageDiv.querySelector('.message-content');
                            if (!contentDiv) {
                                console.log('创建消息内容元素');
                                // 如果不存在，创建一个
                                contentDiv = document.createElement('div');
                                contentDiv.className = 'message-content';
                                // 添加到消息容器的末尾
                                aiMessageDiv.appendChild(contentDiv);
                            }
                            
                            // 更新消息内容
                            if (contentDiv) {
                                try {
                                    // 处理内容，确保是字符串
                                    let content = currentContent;
                                    if (typeof content !== 'string') {
                                        if (content.content) {
                                            content = content.content;
                                        } else if (content.text) {
                                            // 增加对text对象的支持
                                            content = content.text;
                                        } else {
                                            content = JSON.stringify(content);
                                        }
                                    }
                                    
                                    // 替换换行符为 \n 而非 <br>，以便和历史记录的解析保持一致
                                    content = content.replace(/\n/g, '\n');
                                    
                                    // 处理base64图片标签
                                    content = processMessageContent(content);
                                    
                                    // 确保正文内容正确显示 - 使用与历史记录相同的解析方式
                                    let formattedContent = marked.parse(content);
                                    
                                    // 添加内联样式确保可见
                                    contentDiv.style.display = 'block';
                                    contentDiv.style.padding = '0.6rem';
                                    contentDiv.style.fontSize = '1rem';
                                    contentDiv.style.lineHeight = '1.3';
                                    contentDiv.style.color = '#333';
                                    contentDiv.innerHTML = formattedContent;
                                    console.log('正文内容已更新', contentDiv.innerHTML.substring(0, 50));
                                    
                                    // 如果有思考内容，更新思考头部
                                    if (thinkHeaderElement && currentThink) {
                                        const elapsedSeconds = Math.floor((Date.now() - thinkStartTime) / 1000);
                                        thinkHeaderElement.innerHTML = `
                                            <span>已深度思考（用时 ${elapsedSeconds} 秒）<span style="display:inline-block; width:5px;"></span>
                                            <div class="triangle" style="display:inline-block; width:0; height:0; border-left:6px solid transparent; border-right:6px solid transparent; border-top:6px solid #999; vertical-align:middle;"></div></span>
                                        `;
                                        console.log('思考头部已更新为显示时间');
                                    }
                                } catch (error) {
                                    console.error('处理消息内容时出错:', error);
                                    contentDiv.innerHTML = `<p>消息处理错误: ${error.message}</p>`;
                                }
                            } else {
                                console.error('找不到消息内容元素，无法更新内容');
                            }
                            
                            // 如果用户在底部，自动滚动
                            if (state.isNearBottom) {
                                scrollToBottom();
                                console.log('已滚动到底部');
                            }
                        }
                        
                        // 更新思考内容
                        if ((data.think && data.think !== currentThink) ||
                            (data.thinking && data.thinking !== currentThink)) {
                            console.log('收到新思考内容:', JSON.stringify(data).substring(0, 50));
                            
                            // 更新currentThink，优先使用think，其次使用thinking
                            if (data.think) {
                            currentThink = data.think;
                            } else if (data.thinking) {
                                currentThink = data.thinking;
                            }
                            
                            // 检查是否已有思考容器
                            let thinkContainer = aiMessageDiv.querySelector('.think-container');
                            if (!thinkContainer) {
                                console.log('创建思考容器');
                                // 创建思考容器
                                thinkContainer = document.createElement('div');
                                thinkContainer.className = 'think-container';
                                
                                // 添加内联样式确保可折叠功能正常
                                thinkContainer.style.margin = '0.5rem 0';
                                thinkContainer.style.borderRadius = '8px';
                                thinkContainer.style.overflow = 'hidden';
                                thinkContainer.style.transition = 'all 0.3s ease';
                                
                                // 创建思考头部
                                const thinkHeader = document.createElement('div');
                                thinkHeader.className = 'think-header';
                                thinkHeader.innerHTML = `<span>思考中...<span style="display:inline-block; width:5px;"></span><div class="triangle" style="display:inline-block; width:0; height:0; border-left:6px solid transparent; border-right:6px solid transparent; border-top:6px solid #999; vertical-align:middle;"></div></span>`;
                                
                                // 创建思考内容
                                const thinkContentDiv = document.createElement('div');
                                thinkContentDiv.className = 'message-think';
                                try {
                                    // 处理思考内容
                                    let thinkText = currentThink;
                                    if (typeof thinkText !== 'string') {
                                        if (thinkText.content) {
                                            thinkText = thinkText.content;
                                        } else if (thinkText.text) {
                                            // 增加对text对象的支持
                                            thinkText = thinkText.text;
                                        } else {
                                            thinkText = JSON.stringify(thinkText);
                                        }
                                    }
                                    
                                    // 替换换行符
                                    thinkText = thinkText.replace(/\n/g, '<br>');
                                    
                                    // 解析并显示
                                    thinkContentDiv.innerHTML = marked.parse(thinkText);
                                } catch (error) {
                                    console.error('处理思考内容时出错:', error);
                                    thinkContentDiv.innerHTML = `<p>思考内容解析错误</p>`;
                                }
                                thinkContentDiv.style.padding = '0.6rem'; // 减小上下内边距
                                // 移除背景色
                                thinkContentDiv.style.backgroundColor = 'transparent';
                                thinkContentDiv.style.lineHeight = '1.3'; // 减小行高
                                
                                // 组装思考容器
                                thinkContainer.appendChild(thinkHeader);
                                thinkContainer.appendChild(thinkContentDiv);
                                
                                // 保存思考头部元素引用（全局变量）
                                thinkHeaderElement = thinkHeader;
                                
                                // 添加点击事件，实现展开/折叠功能
                                thinkHeader.onclick = function(event) {
                                    console.log('点击思考头部');
                                    event.stopPropagation();
                                    if (thinkContentDiv.style.display === 'none') {
                                        thinkContentDiv.style.display = 'block';
                                        console.log('思考内容展开');
                                    } else {
                                        thinkContentDiv.style.display = 'none';
                                        console.log('思考内容折叠');
                                    }
                                };
                                
                                // 设置思考开始时间
                                thinkStartTime = Date.now();
                                
                                // 启动计时器，每秒更新思考时间
                                thinkTimerInterval = setInterval(() => {
                                    const elapsedSeconds = Math.floor((Date.now() - thinkStartTime) / 1000);
                                    
                                    // 仅当有内容时才显示思考时间
                                    if (currentContent && currentContent.trim() !== '') {
                                        thinkHeader.innerHTML = `
                                            <span>已深度思考（用时 ${elapsedSeconds} 秒）<span style="display:inline-block; width:5px;"></span>
                                            <div class="triangle" style="display:inline-block; width:0; height:0; border-left:6px solid transparent; border-right:6px solid transparent; border-top:6px solid #999; vertical-align:middle;"></div></span>
                                        `;
                                    }
                                }, 1000);
                                
                                // 插入到模型信息之后，消息内容之前
                                const contentDiv = aiMessageDiv.querySelector('.message-content');
                                if (contentDiv) {
                                aiMessageDiv.insertBefore(thinkContainer, contentDiv);
                                    console.log('思考容器已添加到DOM');
                                } else {
                                    console.error('找不到消息内容元素，无法插入思考容器');
                                }
                            }
                            
                            // 更新思考内容
                            const thinkContentDiv = thinkContainer.querySelector('.message-think');
                            if (thinkContentDiv) {
                                try {
                                    // 处理内容，确保是字符串
                                    let thinkText = currentThink;
                                    if (typeof thinkText !== 'string') {
                                        if (thinkText.content) {
                                            thinkText = thinkText.content;
                                        } else if (thinkText.text) {
                                            // 增加对text对象的支持
                                            thinkText = thinkText.text;
                                        } else {
                                            thinkText = JSON.stringify(thinkText);
                                        }
                                    }
                                    
                                    // 替换换行符
                                    thinkText = thinkText.replace(/\n/g, '<br>');
                                    
                                    // 解析并显示
                                    thinkContentDiv.innerHTML = marked.parse(thinkText);
                                    
                                    // 移除背景色
                                    thinkContentDiv.style.backgroundColor = 'transparent';
                                    // 减小思考内容上下间距
                                    thinkContentDiv.style.padding = '0.6rem';
                                    thinkContentDiv.style.lineHeight = '1.3';
                                    console.log('思考内容已更新');
                                } catch (error) {
                                    console.error('处理思考内容时出错:', error);
                                    thinkContentDiv.innerHTML = `<p>思考内容解析错误</p>`;
                                }
                                
                                // 如果容器未被折叠，滚动到可见位置
                                if (thinkContentDiv.style.display !== 'none' && state.isNearBottom) {
                        scrollToBottom();
                        }
                            } else {
                                console.error('找不到思考内容元素');
                            }
                        }
                        
                            } catch (e) {
                        console.error('解析服务器消息失败:', e, line);
                    }
                }
            }
            
            // 清除计时器
            if (thinkTimerInterval) {
                clearInterval(thinkTimerInterval);
            }
            
            // 不再保存内容到服务器，避免重复保存
            // 后端已经处理了正常完成的消息保存
            console.log('AI响应正常完成，后端已自动保存内容');
            
        } catch (error) {
            if (error.name === 'AbortError') {
                console.log('用户中断了请求');
                
                // 清除计时器（使用try-catch防止错误）
                try {
                    if (thinkTimerInterval) {
                        clearInterval(thinkTimerInterval);
                        thinkTimerInterval = null;
                    }
                            } catch (e) {
                    console.error('清除计时器时出错:', e);
                }
                
                // 添加中断提示
                try {
                    const aiMessageDiv = document.getElementById(aiMessageId);
                    if (aiMessageDiv) {
                        const contentDiv = aiMessageDiv.querySelector('.message-content');
                        if (contentDiv) {
                            // 如果内容为空，或者只有部分内容
                            if (!currentContent || currentContent.trim() === '') {
                                contentDiv.innerHTML = '<div class="interrupt-note">*用户已中断此次响应*</div>';
                            } else {
                                // 处理内容，确保是字符串
                                let textContent = currentContent;
                                if (typeof textContent !== 'string') {
                                    if (textContent.content) {
                                        textContent = textContent.content;
                                    } else if (textContent.text) {
                                        // 增加对text对象的支持
                                        textContent = textContent.text;
                                    } else {
                                        textContent = JSON.stringify(textContent);
                                    }
                                }
                                
                                // 替换换行符为 \n 而非 <br>，以便和历史记录的解析保持一致
                                textContent = textContent.replace(/\n/g, '\n');
                                
                                // 处理base64图片
                                textContent = processMessageContent(textContent);
                                
                                // 确保内容已经显示
                                try {
                                    const formattedContent = marked.parse(textContent);
                                    contentDiv.innerHTML = formattedContent + '<div class="interrupt-note">*用户已中断此次响应*</div>';
                                } catch (error) {
                                    console.error('处理中断内容时出错:', error);
                                    contentDiv.innerHTML = `<p>${textContent}</p><div class="interrupt-note">*用户已中断此次响应*</div>`;
                                }
                            }
                            
                            // 更新本地内容变量
                            if (!currentContent || currentContent.trim() === '') {
                                currentContent = '<div class="interrupt-note">*用户已中断此次响应*</div>';
                            } else {
                                currentContent += '\n\n*用户已中断此次响应*';
                            }

                            // 修复变量不一致问题：确保正确引用变量
                            let finalContent = currentContent;
                            if (finalContent.indexOf('*用户已中断此次响应*') === -1) {
                                finalContent += '\n\n*用户已中断此次响应*';
                            }
                        }
                        
                        // 更新思考头部文本（如果存在）
                        if (thinkHeaderElement && currentThink) {
                            const elapsedSeconds = Math.floor((Date.now() - thinkStartTime) / 1000);
                            thinkHeaderElement.innerHTML = `
                                <span>已深度思考（用时 ${elapsedSeconds} 秒）<span style="display:inline-block; width:5px;"></span>
                                <div class="triangle" style="display:inline-block; width:0; height:0; border-left:6px solid transparent; border-right:6px solid transparent; border-top:6px solid #999; vertical-align:middle;"></div></span>
                            `;
                        }
                        
                        // 保存当前内容
                        await saveCurrentContent(
                            conversationId,
                            finalContent || currentContent, // 使用finalContent或fallback到currentContent
                            currentThink,
                            getSelectedModel()
                        );
                    }
                } catch (error) {
                    console.error('保存当前内容时出错:', error);
                }
            } else {
                console.error('获取AI响应失败:', error);
                throw error;
            }
        } finally {
            // 清除所有资源
            try {
                if (thinkTimerInterval) {
                    clearInterval(thinkTimerInterval);
                    thinkTimerInterval = null;
                }
            } catch (e) {
                console.error('清理资源时出错:', e);
            }
            
            state.abortController = null;
        }
    }

    // ====================== 对话管理 ======================
    async function createNewConversation() {
        if (state.isSending) return;

        try {
            state.isSending = true;
            if (elements.newChatBtn) elements.newChatBtn.disabled = true;

            const response = await fetch('/conversations', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                }
            });

            if (!response.ok) {
                const errorData = await response.json();
                throw new Error(`创建对话失败: ${errorData.error}`);
            }

            const data = await response.json();
            
            // 更新 URL
            const url = `/chat/${data.id}`;
            history.pushState({ conversationId: data.id }, '', url);
            
            // 更新当前对话ID
            state.currentConversationId = data.id;
            
            // 添加到对话列表
            state.conversations.unshift(data);
            
            // 清空消息区域
            clearMessages();
            
            // 更新对话列表UI
            updateConversationsList();
            
            // 聚焦到输入框
            if (elements.messageInput) {
                elements.messageInput.focus();
            }

            return data;

        } catch (error) {
            console.error('创建对话失败:', error);
            showError('创建对话失败: ' + error.message);
        } finally {
            state.isSending = false;
            if (elements.newChatBtn) elements.newChatBtn.disabled = false;
        }
    }

    // ====================== UI操作 ======================
    function appendMessage(content, isUser = false, modelName = null) {
        const messageDiv = document.createElement('div');
        messageDiv.className = isUser ? 'message user' : 'message ai';

        // 用户消息直接使用现有逻辑
        if (isUser) {
            // 处理换行和 HTML 标签
            const cleanContent = typeof content === 'string' ? 
                content.replace(/\n/g, '\n') :  // 替换换行符为 \n 而非 <br>，以便和历史记录的解析保持一致
                content.content?.replace(/\n/g, '\n') || '';
            
            // 处理特殊标签（显示时）
            const processedContent = processMessageContent(cleanContent, true);
            
            // 使用 marked.parse() 解析 Markdown 内容
            const parsedContent = marked.parse(processedContent);
            
            // 创建消息内容元素
            const contentDiv = document.createElement('div');
            contentDiv.className = 'message-content';
            contentDiv.innerHTML = parsedContent;
            
            // 添加样式，让消息气泡更矮
            contentDiv.style.padding = '0.6rem';
            contentDiv.style.lineHeight = '1.3';
            
            // 添加到消息元素
            messageDiv.appendChild(contentDiv);
            elements.messagesContainer.appendChild(messageDiv);
            scrollToBottom(true);
            return messageDiv;
        } 
        
        // AI消息现在由getAIResponse直接处理，这里只返回基本元素
        elements.messagesContainer.appendChild(messageDiv);
        scrollToBottom(true);
        return messageDiv;
    }

    function updateMessageContent(messageId, newContent) {
        const messageEl = document.getElementById(messageId);
        if (messageEl) {
            const contentEl = messageEl.querySelector('.message-content');
            if (contentEl) {
                contentEl.innerHTML += newContent; // 使用 innerHTML 以支持 HTML 内容
                scrollToBottom();
            }
        }
    }

    // ====================== 工具函数 ======================
    function escapeHtml(text) {
        return text
            .replace(/&/g, "&amp;")
            .replace(/</g, "&lt;")
            .replace(/>/g, "&gt;")
            .replace(/"/g, "&quot;")
            .replace(/'/g, "&#039;");
    }

    function formatContent(text) {
        if (!text) return '';
        // 将 <br> 转换为实际的换行符
        return text.replace(/<br>/g, '\n');
    }

    // 处理消息内容中的特殊标签
    function processMessageContent(content, displayOnly = false) {
        if (!content) return '';
        let processedContent = content;
        
        // 处理 <image>图片描述</image> 标签
        if (displayOnly) {
            // 如果是用于显示的内容，删除 <image> 标签
            processedContent = processedContent.replace(/<image>(.*?)<\/image>/g, '');
        }
        
        // 处理 <base64>图片base64</base64> 标签
        // 将图片标签保存起来，等待文本处理后再附加到末尾
        let imageElements = [];
        processedContent = processedContent.replace(/<base64>(.*?)<\/base64>/g, (match, base64Content) => {
            // 创建图片元素
            const imgHtml = `<img src="data:image/png;base64,${base64Content}" alt="嵌入图片" class="embedded-image" style="max-width: 100%; border-radius: 8px; margin: 10px 0;" />`;
            imageElements.push(imgHtml);
            return ''; // 先删除图片标签
        });
        
        // 文本处理完成后，将所有图片附加到末尾
        if (imageElements.length > 0) {
            processedContent = processedContent.trim() + '<br>' + imageElements.join('');
        }
        
        return processedContent;
    }

    // 修改 scrollToBottom 函数
    function scrollToBottom(force = false) {
        const container = elements.messagesContainer;
        if (!container) return;
        
        // 强制滚动到底部
            setTimeout(() => {
                container.scrollTop = container.scrollHeight;
            }, 0);
    }

    function focusInput() {
        if (elements.messageInput) elements.messageInput.focus();
    }

    function showError(message) {
        if (!elements.messagesContainer) return;
        
        const errorEl = document.createElement('div');
        errorEl.className = 'error-message';
        errorEl.textContent = message;
        elements.messagesContainer.appendChild(errorEl);
        
        setTimeout(() => errorEl.remove(), 5000);
        scrollToBottom();
    }

    // ====================== 全局函数 ======================
    window.retryMessage = async function(messageId) {
        const messageEl = document.getElementById(messageId);
        if (!messageEl) return;

        const content = messageEl.querySelector('.message-content')?.textContent;
        const isUser = messageEl.classList.contains('user');

        if (content) {
            try {
                await saveMessage({ content: content, is_user: isUser });
            } catch (error) {
                updateMessageStatus(messageId, 'failed', error.message);
            }
        }
    };

    // ====================== 对话列表功能 ======================
    async function loadConversations() {
        try {
            const response = await fetch('/conversations');
            if (!response.ok) throw new Error('获取对话列表失败');
            
            state.conversations = await response.json();
            updateConversationsList();  // 更新UI
        } catch (error) {
            console.error('加载对话列表失败:', error);
        }
    }

    async function loadLatestConversation() {
        if (state.conversations.length > 0) {
            const latestConv = state.conversations[0];
            await loadConversationHistory(latestConv.id);
        }
    }

    // 提取思考内容
    function extractThinkContent(content) {
        // 使用正则表达式匹配 <think time=数字>内容</think>
        const thinkMatch = content.match(/<think time=(\d+)>([\s\S]*?)<\/think>/);
        if (thinkMatch) {
            return {
                think: thinkMatch[0],  // 完整的 think 标签
                text: content.replace(thinkMatch[0], '').trim()  // 剩余内容
            };
        }
        return {
            think: null,
            text: content
        };
    }

    // 加载对话历史
    function loadConversationHistory(conversationId) {
        if (!conversationId) {
            console.error('对话ID不能为空');
            return;
        }

        // 设置当前对话 ID
        state.currentConversationId = conversationId;

        fetch(`/conversations/${conversationId}/history`)
            .then(response => {
                if (!response.ok) {
                    if (response.status === 404) {
                        throw new Error('对话不存在或无权访问');
                    }
                    throw new Error(`获取历史记录失败: ${response.status} ${response.statusText}`);
                }
                return response.json();
            })
            .then(data => {
                const chatMessages = document.getElementById('messages');
                if (!chatMessages) {
                    console.error('找不到消息容器元素');
                    return;
                }
                
                chatMessages.innerHTML = '';  // 清空现有消息
                
                if (!data.history || !Array.isArray(data.history)) {
                    console.error('无效的历史记录数据格式');
                    return;
                }
            
            data.history.forEach(msg => {
                // 跳过空消息
                if (!msg.content || !msg.content.trim()) {
                    return;
                }

                const messageDiv = document.createElement('div');
                messageDiv.className = `message ${msg.role === 'user' ? 'user' : 'ai'}`;
                
                if (msg.role === 'user') {
                    // 用户消息
                    console.log('添加历史用户消息');
                    const contentDiv = document.createElement('div');
                    contentDiv.className = 'message-content';
                    
                    // 处理特殊标签（<image>和<base64>）
                    const processedContent = processMessageContent(msg.content, true);
                    contentDiv.innerHTML = marked.parse(processedContent);
                    
                    // 添加样式
                    contentDiv.style.display = 'block';
                    contentDiv.style.padding = '0.6rem';
                    contentDiv.style.fontSize = '1rem';
                    contentDiv.style.lineHeight = '1.3';
                    contentDiv.style.color = '#333';
                    
                    // 添加到消息元素
                    messageDiv.appendChild(contentDiv);
                    chatMessages.appendChild(messageDiv);
                } else {
                    let content = msg.content;
                    
                    // 提取模型名称
                    const modelMatch = content.match(/<model="([^"]+)"\/>/);
                    const modelName = modelMatch ? modelMatch[1] : 'DeepSeek-R1';
                    const imageName = getModelImageName(modelName);
                    
                    console.log('添加历史AI消息，模型:', modelName);
                    
                    // 创建并添加模型信息
                    const modelInfoDiv = document.createElement('div');
                    modelInfoDiv.className = 'model-info';
                    modelInfoDiv.innerHTML = `
                            <img src="/static/models/${imageName}.png" alt="${modelName}" class="model-avatar" onerror="this.src='/static/models/default.png';">
                            <div class="model-name"><strong>${modelName}</strong></div>
                    `;
                    
                    // 添加样式
                    modelInfoDiv.style.display = 'flex';
                    modelInfoDiv.style.alignItems = 'center';
                    modelInfoDiv.style.marginBottom = '0.5rem';
                    
                    // 添加到消息元素
                    messageDiv.appendChild(modelInfoDiv);
                    
                    // 提取思考内容
                    const thinkRegex = /<think time=(\d+)>([\s\S]*?)<\/think>/;
                    const thinkMatches = content.match(thinkRegex);
                    if (thinkMatches) {
                        const thinkTime = thinkMatches[1];
                        const thinkContent = thinkMatches[2];
                        
                        console.log('历史消息包含思考内容');
                        
                        // 创建思考容器
                        const thinkContainer = document.createElement('div');
                        thinkContainer.className = 'think-container';
                        
                        // 添加内联样式确保可折叠功能正常
                        thinkContainer.style.margin = '0.5rem 0';
                        thinkContainer.style.borderRadius = '8px';
                        thinkContainer.style.overflow = 'hidden';
                        thinkContainer.style.transition = 'all 0.3s ease';
                        
                        // 创建思考头部
                        const thinkHeader = document.createElement('div');
                        thinkHeader.className = 'think-header';
                        thinkHeader.innerHTML = `<span>已深度思考（用时 ${thinkTime} 秒）<span style="display:inline-block; width:5px;"></span><div class="triangle" style="display:inline-block; width:0; height:0; border-left:6px solid transparent; border-right:6px solid transparent; border-top:6px solid #999; vertical-align:middle;"></div></span>`;
                        
                        // 创建思考内容
                        const thinkContentDiv = document.createElement('div');
                        thinkContentDiv.className = 'message-think';
                        try {
                            // 处理思考内容
                            let thinkText = thinkContent;
                            if (typeof thinkText !== 'string') {
                                if (thinkText.content) {
                                    thinkText = thinkText.content;
                                } else if (thinkText.text) {
                                    // 增加对text对象的支持
                                    thinkText = thinkText.text;
                                } else {
                                    thinkText = JSON.stringify(thinkText);
                                }
                            }
                            
                            // 替换换行符
                            thinkText = thinkText.replace(/\n/g, '<br>');
                            
                            // 解析并显示
                            thinkContentDiv.innerHTML = marked.parse(thinkText);
                        } catch (error) {
                            console.error('处理历史思考内容时出错:', error);
                            thinkContentDiv.innerHTML = `<p>思考内容解析错误</p>`;
                        }
                        thinkContentDiv.style.padding = '0.6rem'; // 减小上下内边距
                        // 移除背景色
                        thinkContentDiv.style.backgroundColor = 'transparent';
                        thinkContentDiv.style.lineHeight = '1.3'; // 减小行高
                        
                        // 组装思考容器
                        thinkContainer.appendChild(thinkHeader);
                        thinkContainer.appendChild(thinkContentDiv);
                        
                        // 添加到消息元素
                        messageDiv.appendChild(thinkContainer);
                        
                        // 添加点击事件
                        thinkHeader.onclick = function(event) {
                            console.log('点击历史思考头部');
                            event.stopPropagation();
                            if (thinkContentDiv.style.display === 'none') {
                                thinkContentDiv.style.display = 'block';
                                console.log('历史思考内容展开');
                            } else {
                                thinkContentDiv.style.display = 'none';
                                console.log('历史思考内容折叠');
                            }
                        };
                        
                        // 移除思考内容，保留其他内容
                        content = content.replace(thinkRegex, '').trim();
                    }
                    
                    // 移除模型标签
                    content = content.replace(/<model="[^"]+"\/>/g, '').trim();
                    
                    // 添加主要内容
                    if (content) {
                        console.log('添加历史消息正文内容');
                        // 创建内容元素
                        const contentDiv = document.createElement('div');
                        contentDiv.className = 'message-content';
                        
                        try {
                            // 处理内容，确保是字符串
                            let textContent = content;
                            if (typeof textContent !== 'string') {
                                if (textContent.content) {
                                    textContent = textContent.content;
                                } else {
                                    textContent = JSON.stringify(textContent);
                                }
                            }
                            
                            // 替换换行符
                            textContent = textContent.replace(/\n/g, '<br>');
                            
                            // 处理base64图片标签
                            textContent = processMessageContent(textContent);
                            
                            // 解析并显示
                            contentDiv.innerHTML = marked.parse(textContent);
                        } catch (error) {
                            console.error('处理历史消息内容时出错:', error);
                            contentDiv.innerHTML = `<p>${textContent}</p>`;
                        }
                        
                        // 添加样式
                        contentDiv.style.display = 'block';
                        contentDiv.style.padding = '0.6rem';
                        contentDiv.style.fontSize = '1rem';
                        contentDiv.style.lineHeight = '1.3';
                        contentDiv.style.color = '#333';
                        
                        // 添加到消息元素
                        messageDiv.appendChild(contentDiv);
                        
                        // 添加到消息容器
                        chatMessages.appendChild(messageDiv);
                    }
                }
            });
            
            // 强制滚动到底部
        scrollToBottom(true);
        })
        .catch(error => {
            console.error('加载历史记录失败:', error);
            showError('加载历史记录失败: ' + error.message);
        });
    }

    function updateUrl(conversationId) {
        try {
            const url = `/chat/${conversationId}`;
            const currentPath = window.location.pathname;
            if (currentPath !== url) {
                history.pushState({ conversationId }, '', url);
                // 验证 URL 是否成功更新
                if (window.location.pathname !== url) {
                    console.warn('URL 更新可能未生效，当前路径:', window.location.pathname);
                }
            }
        } catch (error) {
            console.error('更新 URL 时出错:', error);
        }
    }

    function updateConversationsList() {
        if (!elements.conversationsList) return;
        
        elements.conversationsList.innerHTML = '';
        state.conversations.forEach(conv => {
            const item = document.createElement('div');
            item.className = `conversation-item ${conv.id === state.currentConversationId ? 'active' : ''}`;
            
            // 创建对话内容容器
            const contentDiv = document.createElement('div');
            contentDiv.className = 'conversation-content';
            contentDiv.onclick = () => {
                updateUrl(conv.id);  // 使用新的 updateUrl 函数
                loadConversationHistory(conv.id);
            };
            
            contentDiv.innerHTML = `
                <div class="conversation-title">${conv.title || '新对话'}</div>
                <div class="conversation-time">${formatTime(conv.updated_at)}</div>
            `;
            
            // 创建删除按钮
            const deleteBtn = document.createElement('button');
            deleteBtn.className = 'delete-conversation-btn';
            deleteBtn.innerHTML = '×';
            deleteBtn.onclick = (e) => {
                e.stopPropagation();
                deleteConversation(conv.id);
            };
            
            item.appendChild(contentDiv);
            item.appendChild(deleteBtn);
            elements.conversationsList.appendChild(item);
        });
    }

    function clearMessages() {
        elements.messagesContainer.innerHTML = '';
    }

    function formatTime(isoString) {
        const date = new Date(isoString);
        return date.toLocaleString('zh-CN', {
            month: '2-digit',
            day: '2-digit',
            hour: '2-digit',
            minute: '2-digit'
        });
    }

    // ====================== 初始化聊天 ======================
    async function initChat() {
        try {
            // 加载对话列表
            await loadConversations();
            
            // 检查 URL 路径
            const path = window.location.pathname;
            
            if (path === '/' || path === '') {
                // 在根路径显示欢迎界面
                showInitialPage();
            } else if (path.startsWith('/chat/')) {
                // 如果是聊天路径，检查是否包含有效的 conversation_id
                const conversationId = path.split('/').pop();
                if (conversationId && conversationId.match(/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i)) {
                    await loadConversationHistory(conversationId);
                } else {
                    // 无效的 conversation_id，重定向到根路径
                    history.pushState({}, '', '/');
                    showInitialPage();
                }
            }

            // 添加折叠按钮事件监听
            if (elements.collapseBtn) {
                elements.collapseBtn.addEventListener('click', toggleSidebar);
            }
            
            // 添加初始化标记，启用过渡动画
            requestAnimationFrame(() => {
                elements.sidebar.classList.add('initialized');
                elements.collapseBtn.classList.add('initialized');
            });

            // 添加登出按钮事件监听
            if (elements.logoutBtn) {
                elements.logoutBtn.addEventListener('click', logout);
            }
        } catch (error) {
            console.error('初始化聊天失败:', error);
            showError('初始化聊天失败: ' + error.message);
        }
    }

    // 修改新对话按钮的处理函数
    function handleNewChat() {
        // 更新 URL 到根路径
        history.pushState({}, '', '/');
        // 显示欢迎界面
        showInitialPage();
        // 清空当前对话 ID
        state.currentConversationId = null;
    }

    // 修改发送消息的函数
    function sendMessage() {
        const input = elements.messageInput.value.trim();
        if (!input) return;

        // 获取当前对话 ID
        const currentConversationId = state.currentConversationId;
        
        // 如果是新对话，创建新对话
        if (!currentConversationId) {
            createNewConversation(input).then(newConversation => {
                if (newConversation) {
                state.currentConversationId = newConversation.id;
                    // 显示用户消息
                    const userMessageDiv = document.createElement('div');
                    userMessageDiv.className = 'message user';
                    userMessageDiv.innerHTML = `<div class="message-content">${input}</div>`;
                    elements.messagesContainer.appendChild(userMessageDiv);

                    // 清空输入框
                    elements.messageInput.value = '';

                    // 生成 AI 消息的 ID
                    const aiMessageId = 'ai-' + Date.now();

                    // 创建加载中的AI消息
                    const modelName = getSelectedModel();
                    createLoadingMessage(aiMessageId, modelName);

                    // 获取 AI 回复
                    getAIResponse(input, newConversation.id, aiMessageId);

                    // 滚动到底部
                    scrollToBottom();
                }
            });
            return;
        }

        // 显示用户消息
        const userMessageDiv = document.createElement('div');
        userMessageDiv.className = 'message user';
        userMessageDiv.innerHTML = `<div class="message-content">${input}</div>`;
        elements.messagesContainer.appendChild(userMessageDiv);

        // 清空输入框
        elements.messageInput.value = '';

        // 生成 AI 消息的 ID
        const aiMessageId = 'ai-' + Date.now();

        // 创建加载中的AI消息
        const modelName = getSelectedModel();
        createLoadingMessage(aiMessageId, modelName);

        // 获取 AI 回复
        getAIResponse(input, currentConversationId, aiMessageId);

        // 滚动到底部
        scrollToBottom();
    }

    // 修改 showInitialPage 函数
    function showInitialPage() {
        if (!elements.messagesContainer) return;
        
        elements.messagesContainer.innerHTML = `
            <div class="initial-page">
                <div class="welcome-message">
                    <h1>我是 Aurora，很高兴见到你</h1>
                    <p>我可以帮你写代码、读文件、写作各种创意内容，请把你的任务交给我吧~</p>
                </div>
            </div>
        `;

        // 聚焦到输入框
        if (elements.messageInput) {
            elements.messageInput.focus();
        }
    }

    // 修改删除对话的处理
    async function deleteConversation(conversationId) {
        if (state.isDeleting) return;
        
        showConfirmDialog('确定要删除这个对话吗？', async () => {
            try {
                state.isDeleting = true;
                
                const response = await fetch(`/conversations/${conversationId}`, {
                    method: 'DELETE',
                    headers: {
                        'Content-Type': 'application/json'
                    }
                });
                
                if (!response.ok) {
                    const errorData = await response.json();
                    throw new Error(`删除对话失败: ${errorData.error}`);
                }
                
                // 从列表中移除对话
                state.conversations = state.conversations.filter(conv => conv.id !== conversationId);
                
                // 如果删除的是当前对话，清空消息区域并显示初始页面
                if (state.currentConversationId === conversationId) {
                    state.currentConversationId = null;
                    history.pushState({}, '', '/');
                    showInitialPage();
                }
                
                // 更新对话列表UI
                updateConversationsList();
                
            } catch (error) {
                console.error('删除对话失败:', error);
                showError('删除对话失败: ' + error.message);
            } finally {
                state.isDeleting = false;
            }
        });
    }

    // 修改 toggleSidebar 函数
    function toggleSidebar() {
        state.isSidebarCollapsed = !state.isSidebarCollapsed;
        
        requestAnimationFrame(() => {
            elements.sidebar.classList.toggle('collapsed');
            elements.collapseBtn.classList.toggle('collapsed');
            
            // 发送请求到服务器保存折叠状态
            fetch('/save-sidebar-state', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    collapsed: state.isSidebarCollapsed
                })
            }).catch(error => {
                console.error('保存侧边栏状态失败:', error);
            });
        });
    }

    // 创建确认对话框
    function createConfirmDialog() {
        const dialog = document.createElement('div');
        dialog.className = 'confirm-dialog';
        dialog.id = 'confirm-dialog';
        
        const content = document.createElement('div');
        content.className = 'confirm-content';
        
        const message = document.createElement('div');
        message.className = 'confirm-message';
        
        const buttons = document.createElement('div');
        buttons.className = 'confirm-buttons';
        
        const cancelBtn = document.createElement('button');
        cancelBtn.className = 'confirm-cancel';
        cancelBtn.textContent = '取消';
        
        const okBtn = document.createElement('button');
        okBtn.className = 'confirm-ok';
        okBtn.textContent = '确定';
        
        buttons.appendChild(cancelBtn);
        buttons.appendChild(okBtn);
        content.appendChild(message);
        content.appendChild(buttons);
        dialog.appendChild(content);
        
        document.body.appendChild(dialog);
        
        return {
            dialog,
            message,
            okBtn,
            cancelBtn
        };
    }

    // 修改登出函数
    function logout() {
        showConfirmDialog('确定要退出登录吗？', () => {
            window.location.href = '/auth/logout';
        });
    }

    // 添加 CSS 样式
    const style = document.createElement('style');
    style.textContent = `
    .initial-page {
        display: flex;
        flex-direction: column;
        align-items: center;
        justify-content: center;
        height: 100%;
        padding: 2rem;
        text-align: center;
    }

    .welcome-message {
        margin-bottom: 2rem;
    }

    .welcome-message h1 {
        font-size: 2rem;
        margin-bottom: 1rem;
        color: #333;
    }

    .welcome-message p {
        font-size: 1.1rem;
        color: #666;
    }

    .quick-actions {
        display: flex;
        gap: 1rem;
    }

    .action-btn {
        display: flex;
        align-items: center;
        gap: 0.5rem;
        padding: 0.75rem 1.5rem;
        border: none;
        border-radius: 8px;
        background: #4361ee;
        color: white;
        cursor: pointer;
        transition: background 0.2s ease;
    }

    .action-btn:hover {
        background: #3651d4;
    }

    .action-btn .icon {
        width: 20px;
        height: 20px;
        fill: currentColor;
    }
    `;

    document.head.appendChild(style);

    // 添加浏览器历史记录支持
    window.addEventListener('popstate', (event) => {
        if (event.state && event.state.conversationId) {
            loadConversationHistory(event.state.conversationId);
        } else {
            showInitialPage();
        }
    });

    // 设置模型选择器
    function setupModelSelector() {
        const modelSelect = document.querySelector('.model-select');
        const modelHeader = modelSelect.querySelector('.model-select-header');
        const modelOptions = modelSelect.querySelector('.model-select-options');
        const selectedModelSpan = modelSelect.querySelector('.selected-model');

        // 根据localStorage中保存的模型设置初始选中状态
        const savedModel = state.currentModel;
        const savedModelOption = modelOptions.querySelector(`.model-option[data-value="${savedModel}"]`);
        
        if (savedModelOption) {
            // 更新显示的文本
            const savedModelText = savedModelOption.querySelector('span').textContent;
            selectedModelSpan.textContent = savedModelText;
            
            // 更新选中状态
            modelOptions.querySelectorAll('.model-option').forEach(opt => {
                opt.classList.remove('selected');
            });
            savedModelOption.classList.add('selected');
            
            console.log(`从缓存中加载模型设置: ${savedModel}`);
        }

        // 点击头部显示/隐藏选项
        modelHeader.addEventListener('click', (e) => {
            e.stopPropagation();
            modelSelect.classList.toggle('active');
        });

        // 点击选项时更新选中的模型
        modelOptions.querySelectorAll('.model-option').forEach(option => {
            option.addEventListener('click', (e) => {
                e.stopPropagation();
                const value = option.getAttribute('data-value');
                const text = option.querySelector('span').textContent;
                
                // 更新显示的文本
                selectedModelSpan.textContent = text;
                
                // 更新选中状态
                modelOptions.querySelectorAll('.model-option').forEach(opt => {
                    opt.classList.remove('selected');
                });
                option.classList.add('selected');
                
                // 关闭下拉菜单
                modelSelect.classList.remove('active');
                
                // 更新当前选中的模型
                state.currentModel = value;
                
                // 保存到localStorage
                localStorage.setItem('selectedModel', value);
                console.log(`模型设置已保存: ${value}`);
            });
        });

        // 点击页面其他地方时关闭下拉菜单
        document.addEventListener('click', () => {
            modelSelect.classList.remove('active');
        });
    }

    // 获取当前选中的模型
    function getSelectedModel() {
        return state.currentModel;
    }

    // 添加一个计时器管理对象
    const thinkTimers = {};

    function startThinkTimer(aiMessageId) {
        const thinkHeader = document.getElementById(`${aiMessageId}-think-header`);
        if (!thinkHeader) return;

        let startTime = Date.now();
        thinkTimers[aiMessageId] = setInterval(() => {
            const elapsed = Math.floor((Date.now() - startTime) / 1000);
            thinkHeader.innerHTML = `
                已深度思考（用时 ${elapsed} 秒）
                <div class="triangle"></div>
            `;
        }, 1000);
    }

    function stopThinkTimer(aiMessageId) {
        if (thinkTimers[aiMessageId]) {
            clearInterval(thinkTimers[aiMessageId]);
            delete thinkTimers[aiMessageId];
        }
    }

    // 添加滚动监听函数
    function setupScrollListener() {
        const container = elements.messagesContainer;
        container.addEventListener('scroll', () => {
            // 更新是否在底部的状态
            state.isNearBottom = container.scrollHeight - container.scrollTop - container.clientHeight < 100;
        });
    }

    // 添加模型选择的处理函数
    function handleModelSelection() {
        const modelInputs = document.querySelectorAll('.model-options input[type="radio"]');
        let selectedModel = 'gpt-3.5'; // 默认模型

        modelInputs.forEach(input => {
            input.addEventListener('change', (e) => {
                selectedModel = e.target.value;
                // 可以在这里添加模型切换的其他逻辑
                console.log('Selected model:', selectedModel);
            });
        });

        // 在发送消息时获取选中的模型
        function getSelectedModel() {
            return selectedModel;
        }

        // 修改发送消息的函数，加入模型参数
        async function sendMessage(message) {
            const model = getSelectedModel();
            // ... 其他发送消息的代码 ...
            const response = await fetch('/api/chat', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    message: message,
                    model: model
                })
            });
            // ... 其他处理代码 ...
        }
    }

    // 调用初始化函数
    init().catch(error => {
        console.error('初始化失败:', error);
        showError('初始化失败: ' + error.message);
    });

    // 修改 startMarkdownObserver 函数
    function startMarkdownObserver() {
        const observer = new MutationObserver((mutations) => {
            mutations.forEach((mutation) => {
                if (mutation.type === 'childList') {
                    mutation.addedNodes.forEach((node) => {
                        if (node.nodeType === Node.ELEMENT_NODE) {
                            const contentDiv = node.querySelector('.message-content');
                            if (contentDiv) {
                                const originalText = contentDiv.innerHTML;
                                try {
                                    // 处理 LaTeX 内容
                                    const processedText = originalText
                                        .replace(/\\\[/g, '$$')
                                        .replace(/\\\]/g, '$$')
                                        .replace(/\\\(/g, '$')
                                        .replace(/\\\)/g, '$')
                                        .replace(/<br>/g, '\n')
                                        .replace(/&gt;/g, '>')
                                        .replace(/&lt;/g, '<')
                                        .replace(/&amp;/g, '&');
                                    
                                    // 解析 Markdown
                                    const parsedHtml = marked.parse(processedText);
                                    contentDiv.innerHTML = parsedHtml;
                                    
                                    // 渲染数学公式
                                    renderMathInElement(contentDiv, {
                                        delimiters: [
                                            { left: "$$", right: "$$", display: true },
                                            { left: "$", right: "$", display: false }
                                        ],
                                        throwOnError: false,
                                        output: 'html',
                                        strict: false,
                                        trust: true,
                                        macros: {
                                            "\\epsilon": "\\varepsilon",
                                            "\\top": "\\intercal"
                                        }
                                    });
                                } catch (e) {
                                    console.error('解析失败:', e);
                                }
                            }
                        }
                    });
                }
            });
        });

        observer.observe(elements.messagesContainer, {
            childList: true,
            subtree: true
        });
    }

    // 添加 showConfirmDialog 函数
    function showConfirmDialog(messageText, onConfirm) {
        // 如果对话框元素不存在，创建它
        if (!elements.confirmDialog) {
            const dialogElements = createConfirmDialog();
            elements.confirmDialog = dialogElements.dialog;
            elements.confirmOk = dialogElements.okBtn;
            elements.confirmCancel = dialogElements.cancelBtn;
        }

        // 设置消息文本
        const messageElement = elements.confirmDialog.querySelector('.confirm-message');
        if (messageElement) {
            messageElement.textContent = messageText;
        }

        // 显示对话框
        elements.confirmDialog.classList.add('show');

        // 设置按钮事件
        const handleConfirm = () => {
            elements.confirmDialog.classList.remove('show');
            onConfirm();
            cleanup();
        };

        const handleCancel = () => {
            elements.confirmDialog.classList.remove('show');
            cleanup();
        };

        // 清理函数
        const cleanup = () => {
            elements.confirmOk.removeEventListener('click', handleConfirm);
            elements.confirmCancel.removeEventListener('click', handleCancel);
        };

        // 添加事件监听
        elements.confirmOk.addEventListener('click', handleConfirm);
        elements.confirmCancel.addEventListener('click', handleCancel);
    }

    // 添加确认对话框的 CSS 样式
    const confirmDialogStyle = document.createElement('style');
    confirmDialogStyle.textContent = `
        .confirm-dialog {
            display: none;
            position: fixed;
            top: 0;
            left: 0;
            right: 0;
            bottom: 0;
            background: rgba(0, 0, 0, 0.5);
            z-index: 1000;
            align-items: center;
            justify-content: center;
            backdrop-filter: blur(3px);
        }

        .confirm-dialog.show {
            display: flex;
            animation: fadeIn 0.2s ease;
        }

        .confirm-content {
            background: white;
            padding: 2rem;
            border-radius: 12px;
            box-shadow: 0 4px 24px rgba(0, 0, 0, 0.12);
            max-width: 400px;
            width: 90%;
            transform: scale(0.95);
            opacity: 0;
            animation: scaleIn 0.3s ease forwards;
        }

        .confirm-message {
            margin-bottom: 2rem;
            color: #333;
            font-size: 1.1rem;
            line-height: 1.5;
            text-align: center;
        }

        .confirm-buttons {
            display: flex;
            justify-content: center;
            gap: 1.5rem;
        }

        .confirm-buttons button {
            min-width: 100px;
            padding: 0.8rem 1.5rem;
            border: none;
            border-radius: 8px;
            cursor: pointer;
            font-size: 1rem;
            font-weight: 500;
            transition: all 0.2s ease;
        }

        .confirm-buttons button:active {
            transform: scale(0.98);
        }

        .confirm-cancel {
            background: #f1f1f1;
            color: #666;
        }

        .confirm-cancel:hover {
            background: #e5e5e5;
        }

        .confirm-ok {
            background: #4361ee;
            color: white;
        }

        .confirm-ok:hover {
            background: #3651d4;
        }

        @keyframes fadeIn {
            from {
                opacity: 0;
            }
            to {
                opacity: 1;
            }
        }

        @keyframes scaleIn {
            from {
                transform: scale(0.95);
                opacity: 0;
            }
            to {
                transform: scale(1);
                opacity: 1;
            }
        }
    `;

    document.head.appendChild(confirmDialogStyle);

    // 加载对话列表
    function loadConversationList() {
        fetch('/conversations')
            .then(response => {
                if (!response.ok) {
                    throw new Error(`获取对话列表失败: ${response.status} ${response.statusText}`);
                }
                return response.json();
            })
            .then(data => {
                const conversationList = document.getElementById('conversations-list');
                if (!conversationList) {
                    console.error('找不到对话列表容器元素');
                    return;
                }
                
                conversationList.innerHTML = '';  // 清空现有列表
                
                if (!Array.isArray(data)) {
                    console.error('无效的对话列表数据格式');
                    return;
                }
                
                data.forEach(conv => {
                    const convItem = document.createElement('div');
                    convItem.className = 'conversation-item';
                    
                    // 创建对话内容容器
                    const contentDiv = document.createElement('div');
                    contentDiv.className = 'conversation-content';
                    contentDiv.innerHTML = `
                        <div class="conversation-title">${conv.title || '新对话'}</div>
                        <div class="conversation-time">${new Date(conv.updated_at).toLocaleString()}</div>
                    `;
                    
                    // 添加点击事件
                    contentDiv.addEventListener('click', () => {
                        updateUrl(conv.id);  // 添加这一行来更新URL
                        loadConversationHistory(conv.id);
                    });
                    
                    // 创建删除按钮
                    const deleteBtn = document.createElement('button');
                    deleteBtn.className = 'delete-conversation-btn';
                    deleteBtn.innerHTML = '×';
                    deleteBtn.onclick = (e) => {
                        e.stopPropagation();
                        deleteConversation(conv.id);
                    };
                    
                    convItem.appendChild(contentDiv);
                    convItem.appendChild(deleteBtn);
                    conversationList.appendChild(convItem);
                });
            })
            .catch(error => {
                console.error('加载对话列表失败:', error);
                showError('加载对话列表失败: ' + error.message);
            });
    }

    // 加载对话列表
    loadConversationList();

    // 获取模型图片名称
    function getModelImageName(modelName) {
        // 使用正确的大小写形式
        const modelMap = {
            'DeepSeek-R1': 'DeepSeek-R1',
            'DeepSeek-V3': 'DeepSeek-V3',
            'Doubao-1.5-lite': 'Doubao-1.5-lite',
            'Doubao-1.5-pro': 'Doubao-1.5-pro',
            'Doubao-1.5-pro-256k': 'Doubao-1.5-pro-256k',
            'Doubao-1.5-vision-pro': 'Doubao-1.5-vision-pro'
        };
        return modelMap[modelName] || modelName;
    }

    // 切换移动端侧边栏
    function toggleMobileSidebar() {
        elements.sidebar.classList.toggle('show');
        elements.sidebarOverlay.classList.toggle('show');
        elements.sidebarToggle.classList.toggle('show');
        state.isSidebarCollapsed = !state.isSidebarCollapsed;
    }

    // 关闭移动端侧边栏
    function closeMobileSidebar() {
        elements.sidebar.classList.remove('show');
        elements.sidebarOverlay.classList.remove('show');
        elements.sidebarToggle.classList.remove('show');
        state.isSidebarCollapsed = true;
    }

    // 更新发送按钮状态
    function updateSendButtonState() {
        const hasContent = elements.messageInput.value.trim() !== '';
        const hasImage = state.selectedImage !== null;
        const canSend = (hasContent || hasImage) && !state.isSending;
        
        if (state.isSending) {
            elements.sendButton.innerHTML = `
                <svg width="24" height="24" viewBox="0 0 24 24">
                    <rect x="6" y="6" width="12" height="12" rx="2" ry="2" fill="currentColor"/>
                </svg>
            `;
            elements.sendButton.classList.add('stop-button');
            elements.sendButton.title = "停止生成";
            console.log('切换为停止按钮，可点击状态');
            
            // 确保按钮总是可点击的
            elements.sendButton.disabled = false;
            elements.sendButton.style.opacity = "1";
            elements.sendButton.style.cursor = "pointer";
            elements.sendButton.style.pointerEvents = "auto";
        } else {
            elements.sendButton.innerHTML = `
                <svg viewBox="0 0 24 24" width="24" height="24">
                    <path d="M2.01 21L23 12 2.01 3 2 10l15 2-15 2z" fill="currentColor"/>
                </svg>
            `;
            elements.sendButton.classList.remove('stop-button');
            elements.sendButton.title = "发送消息";
            console.log('切换为发送按钮');
            
            // 如果没有内容也没有图片，禁用发送按钮
            elements.sendButton.disabled = !canSend;
            elements.sendButton.style.opacity = canSend ? "1" : "0.5";
            elements.sendButton.style.cursor = canSend ? "pointer" : "not-allowed";
        }
    }

    // 定义一个全局的保存函数
    async function saveCurrentContent(conversationId, content, thinkContent, modelName) {
        if (!conversationId || !content) {
            console.warn('保存消息失败: 缺少必要参数');
            return;
        }

        // 最多重试3次
        for (let attempt = 0; attempt < 3; attempt++) {
            try {
                // 构建完整内容
                let finalContent = '';
                
                // 如果有模型名称，添加模型标签
                if (modelName) {
                    finalContent += `<model="${modelName}"/>`;
                }
                
                // 如果有思考内容，添加think标签
                if (thinkContent && thinkContent.trim()) {
                    const thinkTime = Math.floor(Math.random() * 5) + 1; // 1-5秒的随机思考时间
                    finalContent += `<think time=${thinkTime}>${thinkContent}</think>\n`;
                }
                
                // 添加主要内容
                finalContent += content;
                
                const response = await fetch(`/conversations/${conversationId}/messages`, {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json'
                    },
                    body: JSON.stringify({
                        content: finalContent,
                        is_user: false
                    })
                });
                
                if (!response.ok) {
                    const errorData = await response.json();
                    throw new Error(`保存消息失败: ${errorData.error || response.statusText}`);
                }
                
                // 保存成功，返回
                console.log('消息保存成功');
                return await response.json();
            } catch (error) {
                console.error(`保存消息失败(尝试 ${attempt+1}/3):`, error);
                // 最后一次尝试失败才显示错误
                if (attempt === 2) {
                    // 在UI上显示一个小小的错误通知
                    const errorNote = document.createElement('div');
                    errorNote.className = 'error-note';
                    errorNote.textContent = '内容保存失败，请刷新页面';
                    errorNote.style.cssText = 'color: #d9534f; font-size: 0.8rem; margin-top: 5px;';
                    
                    const lastMessage = document.querySelector('.message.ai:last-child');
                    if (lastMessage) {
                        lastMessage.appendChild(errorNote);
                    }
                } else {
                    // 等待一小段时间再重试
                    await new Promise(resolve => setTimeout(resolve, 500));
                }
            }
        }
    }

    // 创建AI加载消息
    function createLoadingMessage(aiMessageId, modelName) {
        const messageDiv = document.createElement('div');
        messageDiv.className = 'message ai';
        messageDiv.id = aiMessageId;
        
        // 创建模型信息
        const imageName = getModelImageName(modelName);
        const modelInfoHtml = `
            <div class="model-info">
                <img src="/static/models/${imageName}.png" alt="${modelName}" class="model-avatar" onerror="this.src='/static/models/default.png';">
                <div class="model-name"><strong>${modelName}</strong></div>
            </div>
        `;
        
        // 创建加载动画
        const loadingHtml = `
            <div class="ai-loading">
                <div class="loading-dots">
                    <div class="loading-dot"></div>
                    <div class="loading-dot"></div>
                    <div class="loading-dot"></div>
                </div>
            </div>
        `;
        
        messageDiv.innerHTML = modelInfoHtml + loadingHtml;
        elements.messagesContainer.appendChild(messageDiv);
        scrollToBottom(true);
        
        return messageDiv;
    }
})