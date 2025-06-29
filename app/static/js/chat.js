document.addEventListener('DOMContentLoaded', function () {
    // 预加载关键资源
    preloadResources();
    
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
        selectedImage: null,    // 存储选择的图片
        currentUser: {          // 当前用户信息
            id: null,
            username: null,
            email: null,
            member_level: null
        }
    };

    var lastMessageTime = 0;  // 上次发送消息的时间戳

    
    // 预加载关键资源函数
    function preloadResources() {
        // 只预加载实际在页面加载后几秒内需要使用的资源
        const criticalResources = [];
        
        if (criticalResources.length > 0) {
            criticalResources.forEach(resource => {
                const preloadLink = document.createElement('link');
                preloadLink.rel = 'preload';
                preloadLink.as = resource.endsWith('.svg') ? 'image' : 
                                resource.endsWith('.png') ? 'image' : 
                                'style';
                preloadLink.href = resource;
                document.head.appendChild(preloadLink);
            });
        }
    }

    // ====================== 核心元素 ======================
    const elements = {
        messagesContainer: document.getElementById('messages'),
        messageInput: document.getElementById('message-input'),
        sendButton: document.querySelector('.send-button'),
        newChatBtn: document.getElementById('new-chat-btn'),
        conversationsList: document.getElementById('conversations-list'),
        sidebar: document.querySelector('.conversation-sidebar'),
        sidebarToggle: document.querySelector('.sidebar-toggle'),
        sidebarOverlay: document.querySelector('.sidebar-overlay'),
        logoutBtn: document.querySelector('.logout-btn'),
        userNameDisplay: document.getElementById('user-name-display'),
        userProfile: document.querySelector(".user-profile"),
        userProfileModal: document.getElementById('user-profile-modal'),
        closeModalBtn: document.querySelector('.close-modal'),
        usernameInput: document.getElementById('username-input'),
        saveUsernameBtn: document.getElementById('save-username-btn'),
        membershipInfo: document.getElementById('membership-info'),
        membershipPrivileges: document.getElementById('membership-privileges'),
        confirmDialog: null,
        confirmOk: null,
        confirmCancel: null,
        modelSelect: document.getElementById('model-select'),
        imageUploadButton: document.querySelector('.image-upload-button'),
        imageUploadInput: document.getElementById('image-upload'),
        imagePreviewContainer: document.getElementById('image-preview-container'),
        previewImage: document.getElementById('preview-image'),
        removeImageBtn: document.querySelector('.remove-image-btn'),
        signBtn: document.getElementById('sign-btn'),
        vipCodeInput: document.getElementById('vip-code-input'), // 兑换码输入框
        vipRedeemBtn: document.getElementById('vip-redeem-btn'),   // 兑换按钮
        vipRedeemResult: document.getElementById('vip-redeem-result'), // 兑换结果显示
        deactivateAccountBtn: document.getElementById('deactivate-account-btn'), // 注销账号按钮
        deactivateModal: document.getElementById('deactivate-modal'), // 注销确认弹窗
        closeDeactivateModalBtn: document.querySelector('.close-deactivate-modal'), // 关闭注销弹窗按钮
        confirmDeactivateBtn: document.getElementById('confirm-deactivate-btn'), // 确认注销按钮
        cancelDeactivateBtn: document.getElementById('cancel-deactivate-btn'), // 取消注销按钮
        countdownTimer: document.getElementById('countdown-timer'), // 倒计时显示
        onlineSearchBtn: document.getElementById('online-search-btn'), // 联网搜索按钮
        conversationTitle: document.querySelector('.chat-main .conversation-title'), // 新增：聊天区标题元素
        scrollableContainer: document.querySelector('.scrollable'),
        // 内部侧边栏切换按钮元素
        sidebarInsideToggle: document.querySelector('.sidebar-toggle-inside'),
    };

    // ====================== 初始化 ======================
    async function init() {
        try {
            console.log('初始化应用...');
            
                // 获取当前用户信息
            const userData = await getCurrentUser();

            // 设置模型选择器 - 对所有用户都设置
            await setupModelSelector();

            // 恢复联网搜索按钮状态
            const savedSearch = localStorage.getItem('onlineSearchActive');
            if (elements.onlineSearchBtn) {
                if (savedSearch === 'true') {
                    elements.onlineSearchBtn.classList.add('active');
                    elements.imageUploadButton.disabled = true;
                    elements.imageUploadButton.style.opacity = '0.5';
                    elements.imageUploadButton.style.cursor = 'not-allowed';
                } else {
                    elements.onlineSearchBtn.classList.remove('active');
                    elements.imageUploadButton.disabled = false;
                    elements.imageUploadButton.style.opacity = '';
                    elements.imageUploadButton.style.cursor = '';
                  }
            }

            // 优化未登录场景处理 - 即使未登录也显示主界面
            if (!userData || !userData.id) {
                console.log('未登录用户访问，显示初始界面');
                state.currentUser = { id: null, username: null };

                // 设置基本事件监听器
                setupEventListeners();

                // 直接显示初始界面
                showInitialPage();

                // 设置滚动监听和Markdown观察器
                setupScrollListener();
                startMarkdownObserver();

                // 加载完成后显示主界面
                setTimeout(() => {
                    // 退出登录按钮不可见
                    elements.logoutBtn.style.display = 'none';
                    // 显示主界面
                    showMainUI();
                }, 200);
                return; // 不再执行后续登录用户需要的初始化
            }

            // 并行执行多个异步任务 - 仅针对已登录用户
            await Promise.all([
                // 加载对话历史
                loadConversations()
            ]);
            
            // 设置事件监听器
            setupEventListeners();
            
            // 初始化用户界面元素
            setupUserProfileModal();
            setupUserFormButtonEvents();
            
            // 加载侧边栏状态
            loadSidebarState();
            
            // 根据URL参数或最新对话加载内容
            const urlParams = new URLSearchParams(window.location.search);
            const conversationId = urlParams.get('conversation');
            const path = window.location.pathname;
            
            if (conversationId) {
                // 加载指定的对话
                await loadConversationHistory(conversationId);
            } else if (path !== '/' && state.conversations && state.conversations.length > 0) {
                // 非根路径且存在历史对话，则加载最新对话
                await loadLatestConversation();
            } else {
                // 根路径或无历史对话，显示欢迎界面
                state.currentConversationId = null;
                showInitialPage();
            }
            
            // 获取用户积分信息
            fetchUserPointsInfo().catch(err => console.error('加载用户积分信息出错:', err));
            
            // 初始化时如果有未完成的AI请求，立即在当前会话创建加载动画容器
            try {
                const pendingInit = JSON.parse(localStorage.getItem('pending_ai_messages') || '[]');
                pendingInit.forEach(item => {
                    const { messageData } = item;
                    if (messageData.conversation_id === state.currentConversationId) {
                        console.log('初始化检测到未完成请求，添加加载动画:', messageData.message_id);
                        createLoadingMessage(messageData.message_id, messageData.model);
                    }
                });
            } catch(e) {
                console.error('初始化时加载未完成AI请求失败:', e);
            }
            
            // 尝试续流未完成的消息
            checkActiveResponses().catch(err => console.error('检查活跃响应出错:', err));
            
            // 优化体验：延迟加载非关键资源
            setTimeout(() => {
                
                // 异步加载其他资源
                setupScrollListener();
                startMarkdownObserver();
                signInit();
                
                // 初始化完成后添加复制按钮
                window.addCopyButtonsToAllCodeBlocks();
                
                // 确保滚动到底部
                scrollToBottom(true);

                // 显示主界面，隐藏加载logo
                showMainUI();
            }, 200);
            
            console.log('应用初始化完成');
        } catch (error) {
            console.error('初始化过程中发生错误:', error);
            // 确保显示初始页面，即使发生错误
            showInitialPage();
            // 出错时也显示主界面，隐藏加载logo
            showMainUI();
        }
    }

    // 显示主界面，隐藏加载logo
    function showMainUI() {
        // 显示所有隐藏的元素
        const appContainer = document.getElementById('app-container');
        if (appContainer) {
            appContainer.style.display = 'flex'; // 使用flex布局而不是block
        }

        // 特别确保chat-main元素显示
        const chatMain = document.querySelector('.chat-main');
        if (chatMain) {
            chatMain.style.display = 'flex';
            chatMain.style.flexDirection = 'column';
            chatMain.style.flex = '1';
        }

        // 隐藏loading logo
        const logoContainer = document.getElementById('loading-logo-container');
        if (logoContainer) {
            logoContainer.style.opacity = '0';
            logoContainer.style.transition = 'opacity 0.3s ease';
            setTimeout(() => {
                logoContainer.style.display = 'none';
            }, 300);
        }

        // 强制重绘页面布局
        window.dispatchEvent(new Event('resize'));
    }

    // 获取当前用户信息
    async function getCurrentUser() {
        try {
            const response = await fetch('/api/user/current');
            if (!response.ok) {
                if (response.status === 401) {
                    console.log('用户未登录');
                    return null; // 返回null表示未登录
                }
                throw new Error('获取用户信息失败');
            }
            const userData = await response.json();
            
            // 存储用户信息
            state.currentUser.id = userData.id;
            state.currentUser.username = userData.username;
            state.currentUser.email = userData.email;
            
            console.log('当前用户:', state.currentUser.username, 'ID:', state.currentUser.id);
            return userData;
        } catch (error) {
            console.error('获取用户信息时出错:', error);
            return null; // 出错时也返回null
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

        // 联网搜索按钮点击事件
        // 联网搜索按钮点击事件
        if (elements.onlineSearchBtn) {
            elements.onlineSearchBtn.addEventListener('click', function () {
                this.classList.toggle('active');
                // 保存联网搜索按钮状态到缓存
                localStorage.setItem('onlineSearchActive', this.classList.contains('active'));

                // 处理图片上传按钮状态
                if (elements.imageUploadButton) {
                    if (this.classList.contains('active')) {
                        elements.imageUploadButton.disabled = true;
                        elements.imageUploadButton.style.opacity = '0.5';
                        elements.imageUploadButton.style.cursor = 'not-allowed';
                    } else {
                        elements.imageUploadButton.disabled = false;
                        elements.imageUploadButton.style.opacity = '';
                        elements.imageUploadButton.style.cursor = '';
                    }
                }

                if (this.classList.contains('active')) {
                    // 检查当前是否有文本内容
                    const content = elements.messageInput.value.trim();
                    if (!content) {
                        // 自动聚焦到输入框
                        elements.messageInput.focus();
                    }
                }
            });
        }

        // 图片上传事件处理
        if (elements.imageUploadInput) {
            elements.imageUploadInput.addEventListener('change', function(e) {
                if (e.target.files.length > 0 && elements.onlineSearchBtn) {
                    elements.onlineSearchBtn.classList.remove('active');
                    elements.onlineSearchBtn.disabled = true;
                    elements.onlineSearchBtn.style.opacity = '0.5';
                    elements.onlineSearchBtn.style.cursor = 'not-allowed';
                    localStorage.setItem('onlineSearchActive', 'false');
                }
            });
        }

        // 发送消息后重置按钮状态
        elements.sendButton?.addEventListener('click', function() {
            setTimeout(() => {
                if (elements.onlineSearchBtn) {
                    elements.onlineSearchBtn.disabled = false;
                    elements.onlineSearchBtn.style.opacity = '';
                    elements.onlineSearchBtn.style.cursor = '';
                }
            }, 100);
        });

        // 输入框回车事件
        if (elements.messageInput) {
            elements.messageInput.addEventListener('keypress', function (e) {
            if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault();
                sendMessageHandler();
            }
        });

            // 添加输入框自动调整高度
            elements.messageInput.addEventListener('input', function () {
                this.style.height = 'auto';
                this.style.height = (this.scrollHeight) + 'px';
                // 输入内容变化时更新发送按钮状态
                updateSendButtonState();
            });

            // 添加粘贴事件监听器，用于检测和上传粘贴的图片
            elements.messageInput.addEventListener('paste', function (e) {
                // 检查剪贴板数据中是否包含图片
                const clipboardData = e.clipboardData || window.clipboardData;
                const items = clipboardData.items;
                
                for (let i = 0; i < items.length; i++) {
                    if (items[i].type.indexOf('image') !== -1) {
                        // 阻止默认粘贴行为
                        e.preventDefault();
                        
                        // 获取图片文件
                        const file = items[i].getAsFile();
                        if (file) {
                            // 使用与图片上传相同的处理逻辑
                            state.selectedImage = file;
                            
                            // 显示图片预览
                            const reader = new FileReader();
                            reader.onload = function (e) {
                                elements.previewImage.src = e.target.result;
                                elements.imagePreviewContainer.style.display = 'block';
                            };
                            reader.readAsDataURL(file);
                            
                            // 更新发送按钮状态
                            updateSendButtonState();
                            
                            // 提示用户
                            showNotification('图片已粘贴', 3000);
                            
                            // 只处理第一个图片
                            break;
                        }
                    }
                }
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
        const logoutBtn = document.querySelector('.logout-btn');
        let logoutTooltip;
        logoutBtn.addEventListener('mouseenter', () => {
            const rect = logoutBtn.getBoundingClientRect();
            logoutTooltip = document.createElement('div');
            logoutTooltip.className = 'au-tooltip au-tooltip--m au-elevated au-theme';
            logoutTooltip.style.cssText = '--au-rgb-hover: 0 0 0 / 4%; font-size: var(--au-font-size-m); line-height: var(--au-line-height-m); z-index: 0;';
            logoutTooltip.style.position = 'fixed';
            logoutTooltip.style.left = `${rect.left - 20}px`;
            logoutTooltip.style.top = `${rect.top - 47}px`;
            logoutTooltip.innerText = '退出登录';
            // 添加提示箭头
            const arrowDiv = document.createElement('div');
            arrowDiv.className = 'au-tooltip__arrow au-tooltip__arrow--soft';
            arrowDiv.setAttribute('au-floating-placement', 'top');
            arrowDiv.style.cssText = 'left: 32px;';
            arrowDiv.innerHTML = `<svg class="au-tooltip__soft-arrow" viewBox="0 0 47 13" fill="none" xmlns="http://www.w3.org/2000/svg"><mask id="mask0_0_3329" maskUnits="userSpaceOnUse" x="0" y="0" width="47" height="13" style="mask-type: alpha;"><path fill-rule="evenodd" clip-rule="evenodd" d="M0 0.00316996C1.71249 0.00316996 3.42448 -0.00533022 5.13697 0.0131702C6.77598 0.0311706 8.61044 0.0566711 10.2055 0.658184C11.9284 1.3082 13.0691 2.44472 14.2168 3.78225C15.043 4.74427 16.666 6.79681 17.4563 7.78784C18.1031 8.60035 19.3692 10.2064 20.0605 10.9834C20.9308 11.9609 22.0064 12.9999 23.5005 12.9999C24.9946 12.9999 26.0697 11.9609 26.9395 10.9844C27.6308 10.2079 28.8969 8.60085 29.5442 7.78884C30.3335 6.79781 31.9565 4.74527 32.7832 3.78325C33.9329 2.44572 35.0716 1.3092 36.794 0.659184C38.3896 0.0591711 40.2245 0.0321706 41.8625 0.0141702C43.5755 -0.0043302 45.2875 0.00416998 47 0.00416998" fill="#FF0000"></path></mask><g mask="url(#mask0_0_3329)"><g clip-path="url(#clip0_0_3329)"><g filter="url(#filter0_b_0_3329)"><rect width="47" height="13" fill="currentColor" style="mix-blend-mode: color-dodge;"></rect></g></g></g><defs><filter id="filter0_b_0_3329" x="-50" y="-50" width="147" height="113" filterUnits="userSpaceOnUse" color-interpolation-filters="sRGB"><feFlood flood-opacity="0" result="BackgroundImageFix"></feFlood><feGaussianBlur in="BackgroundImageFix" stdDeviation="25"></feGaussianBlur><feComposite in2="SourceAlpha" operator="in" result="effect1_backgroundBlur_0_3329"></feComposite><feBlend mode="normal" in="SourceGraphic" in2="effect1_backgroundBlur_0_3329" result="shape"></feBlend></filter><clipPath id="clip0_0_3329"><rect width="47" height="13" fill="white"></rect></clipPath></defs></svg>`;
            logoutTooltip.appendChild(arrowDiv);
            document.body.appendChild(logoutTooltip);
        });
        logoutBtn.addEventListener('mouseleave', () => {
            if (logoutTooltip) {
                logoutTooltip.remove();
                logoutTooltip = null;
            }
        });  

        // 添加侧边栏切换按钮事件
        if (elements.sidebarToggle) {
            elements.sidebarToggle.addEventListener('click', () => {
                if (window.innerWidth <= 768) {
                    toggleMobileSidebar();
                } else {
                    toggleSidebar();
                    // 新增：桌面端折叠/展开后调整模型选择位置
                    const modelSelectEl = document.querySelector('.model-select');
                    if (modelSelectEl) {
                        if (state.isSidebarCollapsed) {
                            const computedLeft = window.getComputedStyle(modelSelectEl).left;
                            const leftValue = parseFloat(computedLeft) || 0;
                            modelSelectEl.style.left = (leftValue + 31) + 'px';
                        } else {
                            modelSelectEl.style.left = '';
                        }
                    }
                }
            });
        }

        // 添加遮罩层点击事件
        if (elements.sidebarOverlay) {
            elements.sidebarOverlay.addEventListener('click', closeMobileSidebar);
        }

        // 内部侧边栏切换按钮点击事件（移动端）
        if (elements.sidebarInsideToggle) {
            elements.sidebarInsideToggle.addEventListener('click', () => {
                if (window.innerWidth <= 768) {
                    toggleMobileSidebar();
                } else {
                    toggleSidebar();
                }
            });
        }

        // 图片上传按钮点击事件
        if (elements.imageUploadButton) {
            elements.imageUploadButton.addEventListener('click', function () {
                elements.imageUploadInput.click();
            });
        }
        const imageUploadButton = document.querySelector('.image-upload-button');
        let uploadImageTooltip;
        imageUploadButton.addEventListener('mouseenter', () => {
            const rect = imageUploadButton.getBoundingClientRect();
            uploadImageTooltip = document.createElement('div');
            uploadImageTooltip.className = 'au-tooltip au-tooltip--m au-elevated au-theme';
            uploadImageTooltip.style.cssText = '--au-rgb-hover: 0 0 0 / 4%; font-size: var(--au-font-size-m); line-height: var(--au-line-height-m); z-index: 0;';
            uploadImageTooltip.style.position = 'fixed';
            uploadImageTooltip.style.left = `${rect.left - 20}px`;
            uploadImageTooltip.style.top = `${rect.top - 47}px`;
            uploadImageTooltip.innerText = '上传图片';
            // 添加提示箭头
            const arrowDiv = document.createElement('div');
            arrowDiv.className = 'au-tooltip__arrow au-tooltip__arrow--soft';
            arrowDiv.setAttribute('au-floating-placement', 'top');
            arrowDiv.style.cssText = 'left: 32px;';
            arrowDiv.innerHTML = `<svg class="au-tooltip__soft-arrow" viewBox="0 0 47 13" fill="none" xmlns="http://www.w3.org/2000/svg"><mask id="mask0_0_3329" maskUnits="userSpaceOnUse" x="0" y="0" width="47" height="13" style="mask-type: alpha;"><path fill-rule="evenodd" clip-rule="evenodd" d="M0 0.00316996C1.71249 0.00316996 3.42448 -0.00533022 5.13697 0.0131702C6.77598 0.0311706 8.61044 0.0566711 10.2055 0.658184C11.9284 1.3082 13.0691 2.44472 14.2168 3.78225C15.043 4.74427 16.666 6.79681 17.4563 7.78784C18.1031 8.60035 19.3692 10.2064 20.0605 10.9834C20.9308 11.9609 22.0064 12.9999 23.5005 12.9999C24.9946 12.9999 26.0697 11.9609 26.9395 10.9844C27.6308 10.2079 28.8969 8.60085 29.5442 7.78884C30.3335 6.79781 31.9565 4.74527 32.7832 3.78325C33.9329 2.44572 35.0716 1.3092 36.794 0.659184C38.3896 0.0591711 40.2245 0.0321706 41.8625 0.0141702C43.5755 -0.0043302 45.2875 0.00416998 47 0.00416998" fill="#FF0000"></path></mask><g mask="url(#mask0_0_3329)"><g clip-path="url(#clip0_0_3329)"><g filter="url(#filter0_b_0_3329)"><rect width="47" height="13" fill="currentColor" style="mix-blend-mode: color-dodge;"></rect></g></g></g><defs><filter id="filter0_b_0_3329" x="-50" y="-50" width="147" height="113" filterUnits="userSpaceOnUse" color-interpolation-filters="sRGB"><feFlood flood-opacity="0" result="BackgroundImageFix"></feFlood><feGaussianBlur in="BackgroundImageFix" stdDeviation="25"></feGaussianBlur><feComposite in2="SourceAlpha" operator="in" result="effect1_backgroundBlur_0_3329"></feComposite><feBlend mode="normal" in="SourceGraphic" in2="effect1_backgroundBlur_0_3329" result="shape"></feBlend></filter><clipPath id="clip0_0_3329"><rect width="47" height="13" fill="white"></rect></clipPath></defs></svg>`;
            uploadImageTooltip.appendChild(arrowDiv);
            document.body.appendChild(uploadImageTooltip);
        });
        imageUploadButton.addEventListener('mouseleave', () => {
            if (uploadImageTooltip) {
                uploadImageTooltip.remove();
                uploadImageTooltip = null;
            }
        });

        // 图片选择事件
        if (elements.imageUploadInput) {
            elements.imageUploadInput.addEventListener('change', handleImageSelect);
        }
        
        // 删除图片按钮事件
        if (elements.removeImageBtn) {
            elements.removeImageBtn.addEventListener('click', removeSelectedImage);
        }
        const removeImageBtn = document.querySelector('.remove-image-btn');
        let removeImageTooltip;
        removeImageBtn.addEventListener('mouseenter', () => {
            const rect = removeImageBtn.getBoundingClientRect();
            removeImageTooltip = document.createElement('div');
            removeImageTooltip.className = 'au-tooltip au-tooltip--m au-elevated au-theme';
            removeImageTooltip.style.cssText = '--au-rgb-hover: 0 0 0 / 4%; font-size: var(--au-font-size-m); line-height: var(--au-line-height-m); z-index: 0;';
            removeImageTooltip.style.position = 'fixed';
            removeImageTooltip.style.left = `${rect.left - 20}px`;
            removeImageTooltip.style.top = `${rect.top - 47}px`;
            removeImageTooltip.innerText = '删除图片';
            // 添加提示箭头
            const arrowDiv = document.createElement('div');
            arrowDiv.className = 'au-tooltip__arrow au-tooltip__arrow--soft';
            arrowDiv.setAttribute('au-floating-placement', 'top');
            arrowDiv.style.cssText = 'left: 32px;';
            arrowDiv.innerHTML = `<svg class="au-tooltip__soft-arrow" viewBox="0 0 47 13" fill="none" xmlns="http://www.w3.org/2000/svg"><mask id="mask0_0_3329" maskUnits="userSpaceOnUse" x="0" y="0" width="47" height="13" style="mask-type: alpha;"><path fill-rule="evenodd" clip-rule="evenodd" d="M0 0.00316996C1.71249 0.00316996 3.42448 -0.00533022 5.13697 0.0131702C6.77598 0.0311706 8.61044 0.0566711 10.2055 0.658184C11.9284 1.3082 13.0691 2.44472 14.2168 3.78225C15.043 4.74427 16.666 6.79681 17.4563 7.78784C18.1031 8.60035 19.3692 10.2064 20.0605 10.9834C20.9308 11.9609 22.0064 12.9999 23.5005 12.9999C24.9946 12.9999 26.0697 11.9609 26.9395 10.9844C27.6308 10.2079 28.8969 8.60085 29.5442 7.78884C30.3335 6.79781 31.9565 4.74527 32.7832 3.78325C33.9329 2.44572 35.0716 1.3092 36.794 0.659184C38.3896 0.0591711 40.2245 0.0321706 41.8625 0.0141702C43.5755 -0.0043302 45.2875 0.00416998 47 0.00416998" fill="#FF0000"></path></mask><g mask="url(#mask0_0_3329)"><g clip-path="url(#clip0_0_3329)"><g filter="url(#filter0_b_0_3329)"><rect width="47" height="13" fill="currentColor" style="mix-blend-mode: color-dodge;"></rect></g></g></g><defs><filter id="filter0_b_0_3329" x="-50" y="-50" width="147" height="113" filterUnits="userSpaceOnUse" color-interpolation-filters="sRGB"><feFlood flood-opacity="0" result="BackgroundImageFix"></feFlood><feGaussianBlur in="BackgroundImageFix" stdDeviation="25"></feGaussianBlur><feComposite in2="SourceAlpha" operator="in" result="effect1_backgroundBlur_0_3329"></feComposite><feBlend mode="normal" in="SourceGraphic" in2="effect1_backgroundBlur_0_3329" result="shape"></feBlend></filter><clipPath id="clip0_0_3329"><rect width="47" height="13" fill="white"></rect></clipPath></defs></svg>`;
            removeImageTooltip.appendChild(arrowDiv);
            document.body.appendChild(removeImageTooltip);
        });
        removeImageBtn.addEventListener('mouseleave', () => {
            if (removeImageTooltip) {
                removeImageTooltip.remove();
                removeImageTooltip = null;
            }
        });

        // 用户名点击事件
        if (elements.userProfile) {
            elements.userProfile.addEventListener('click', openUserProfileModal);
        }

        // 关闭模态窗口事件
        if (elements.closeModalBtn) {
            elements.closeModalBtn.addEventListener('click', closeUserProfileModal);
        }

        // 点击模态窗口外部关闭
        if (elements.userProfileModal) {
            elements.userProfileModal.addEventListener('click', function (e) {
                if (e.target === this) {
                    closeUserProfileModal();
                }
            });
        }

        // 编辑用户名按钮点击事件
        const editUsernameBtn = document.querySelector('.edit-username-btn');
        let editUsernameTooltip;
        if (editUsernameBtn) {
            editUsernameBtn.addEventListener('mouseenter', () => {
                const rect = editUsernameBtn.getBoundingClientRect();
                editUsernameTooltip = document.createElement('div');
                editUsernameTooltip.className = 'au-tooltip au-tooltip--m au-elevated au-theme';
                editUsernameTooltip.style.cssText = '--au-rgb-hover: 0 0 0 / 4%; font-size: var(--au-font-size-m); line-height: var(--au-line-height-m); z-index: 0;';
                editUsernameTooltip.style.position = 'fixed';
                editUsernameTooltip.style.left = `${rect.left - 27}px`;
                editUsernameTooltip.style.top = `${rect.top - 47}px`;
                editUsernameTooltip.innerText = '修改用户名';
                // 添加提示箭头
                const arrowDiv = document.createElement('div');
                arrowDiv.className = 'au-tooltip__arrow au-tooltip__arrow--soft';
                arrowDiv.setAttribute('au-floating-placement', 'top');
                arrowDiv.style.cssText = 'left: 39px;';
                arrowDiv.innerHTML = `<svg class="au-tooltip__soft-arrow" viewBox="0 0 47 13" fill="none" xmlns="http://www.w3.org/2000/svg"><mask id="mask0_0_3329" maskUnits="userSpaceOnUse" x="0" y="0" width="47" height="13" style="mask-type: alpha;"><path fill-rule="evenodd" clip-rule="evenodd" d="M0 0.00316996C1.71249 0.00316996 3.42448 -0.00533022 5.13697 0.0131702C6.77598 0.0311706 8.61044 0.0566711 10.2055 0.658184C11.9284 1.3082 13.0691 2.44472 14.2168 3.78225C15.043 4.74427 16.666 6.79681 17.4563 7.78784C18.1031 8.60035 19.3692 10.2064 20.0605 10.9834C20.9308 11.9609 22.0064 12.9999 23.5005 12.9999C24.9946 12.9999 26.0697 11.9609 26.9395 10.9844C27.6308 10.2079 28.8969 8.60085 29.5442 7.78884C30.3335 6.79781 31.9565 4.74527 32.7832 3.78325C33.9329 2.44572 35.0716 1.3092 36.794 0.659184C38.3896 0.0591711 40.2245 0.0321706 41.8625 0.0141702C43.5755 -0.0043302 45.2875 0.00416998 47 0.00416998" fill="#FF0000"></path></mask><g mask="url(#mask0_0_3329)"><g clip-path="url(#clip0_0_3329)"><g filter="url(#filter0_b_0_3329)"><rect width="47" height="13" fill="currentColor" style="mix-blend-mode: color-dodge;"></rect></g></g></g><defs><filter id="filter0_b_0_3329" x="-50" y="-50" width="147" height="113" filterUnits="userSpaceOnUse" color-interpolation-filters="sRGB"><feFlood flood-opacity="0" result="BackgroundImageFix"></feFlood><feGaussianBlur in="BackgroundImageFix" stdDeviation="25"></feGaussianBlur><feComposite in2="SourceAlpha" operator="in" result="effect1_backgroundBlur_0_3329"></feComposite><feBlend mode="normal" in="SourceGraphic" in2="effect1_backgroundBlur_0_3329" result="shape"></feBlend></filter><clipPath id="clip0_0_3329"><rect width="47" height="13" fill="white"></rect></clipPath></defs></svg>`;
                editUsernameTooltip.appendChild(arrowDiv);
                document.body.appendChild(editUsernameTooltip);
            });
            editUsernameBtn.addEventListener('mouseleave', () => {
                if (editUsernameTooltip) {
                    editUsernameTooltip.remove();
                    editUsernameTooltip = null;
                }
            });
            editUsernameBtn.addEventListener('click', toggleUsernameEdit);
        }

        // 保存用户名按钮点击事件
        if (elements.saveUsernameBtn) {
            elements.saveUsernameBtn.addEventListener('click', updateUsername);
        }

        // 取消编辑用户名按钮事件
        const cancelUsernameBtn = document.getElementById('cancel-username-btn');
        if (cancelUsernameBtn) {
            cancelUsernameBtn.addEventListener('click', cancelUsernameEdit);
        }

        // 签到事件
        if (elements.signBtn) {
            elements.signBtn.addEventListener('click', sign);
        }
        // 兑换兑换码事件
        const vipCodeInputEl = document.getElementById('vip-code-input');
        const vipRedeemBtnEl = document.getElementById('vip-redeem-btn');
        if (vipRedeemBtnEl) {
            vipRedeemBtnEl.addEventListener('click', async () => {
                // 调用统一的兑换码处理函数
                redeemVIPCode();
            });
            // 支持回车提交
            vipCodeInputEl.addEventListener('keypress', (e) => {
                if (e.key === 'Enter') vipRedeemBtnEl.click();
            });
        }
        
        // 积分充值码兑换事件
        const pointsCodeInputEl = document.getElementById('points-code-input');
        const pointsRedeemBtnEl = document.getElementById('points-redeem-btn');
        const pointsRedeemResultEl = document.getElementById('points-redeem-result');
        if (pointsRedeemBtnEl) {
            pointsRedeemBtnEl.addEventListener('click', async () => {
                const code = pointsCodeInputEl.value.trim();
                if (!code) {
                    pointsRedeemResultEl.textContent = '请输入充值码';
                    return;
                }
                
                try {
                    const resp = await fetch('/points/redeem_points_token', {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({ code })
                    });
                    
                    const data = await resp.json();
                    
                    if (!resp.ok) {
                        pointsRedeemResultEl.textContent = data.message || '充值失败';
                        pointsRedeemResultEl.style.color = 'red';
                    } else {
                        pointsRedeemResultEl.textContent = data.message || `成功充值${data.amount}`;
                        pointsRedeemResultEl.style.color = 'green';
                        
                        // 更新积分显示
                        fetchUserPointsInfo();
                        
                        // 清空输入框
                        pointsCodeInputEl.value = '';
                    }
                } catch (error) {
                    console.error('充值失败:', error);
                    pointsRedeemResultEl.textContent = '充值操作失败，请稍后重试';
                    pointsRedeemResultEl.style.color = 'red';
                }
            });
            
            // 支持回车键提交
            pointsCodeInputEl.addEventListener('keypress', (e) => {
                if (e.key === 'Enter') pointsRedeemBtnEl.click();
            });
        }
    }

// ====================== 图片处理 ======================

// 检测是否为iOS设备
function isIOSDevice() {
    // 使用正则表达式匹配 iOS 设备的 userAgent
    const iosRegex = /iPad|iPhone|iPod/i;
    
    // 主要检测方法
    const isIosDevice = (
        // 检查是否匹配 iOS 设备
        iosRegex.test(navigator.userAgent) ||
        // iPad在iOS13后会显示为Mac
        (navigator.userAgent.includes('Mac') && 'ontouchend' in document)
    );

    return isIosDevice;
}

async function compressImage(file, maxSizeInBytes = 3 * 1024 * 1024) {
    // 只在 iOS 设备上进行压缩
    if (!isIOSDevice()) {
        return file;
    }
    // 如果文件已经小于最大大小，直接返回
    if (file.size <= maxSizeInBytes) {
        return file;
    }

    console.log('开始压缩图片');

    return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.readAsDataURL(file);

        reader.onload = function(e) {
            const img = new Image();
            img.src = e.target.result;

            img.onload = function() {
                // 创建canvas进行图片处理 
                const canvas = document.createElement('canvas');
                let width = img.width;
                let height = img.height;

                // 如果图片尺寸超过2048，按比例缩小
                const maxDimension = 2048;
                if (width > maxDimension || height > maxDimension) {
                    const ratio = Math.min(maxDimension / width, maxDimension / height);
                    width *= ratio;
                    height *= ratio;
                }

                canvas.width = width;
                canvas.height = height;
                const ctx = canvas.getContext('2d');
                ctx.drawImage(img, 0, 0, width, height);

                // 从0.9开始尝试不同的压缩质量
                let quality = 0.9;
                let compressed = canvas.toDataURL('image/jpeg', quality);

                // 压缩循环：如果大小仍然超过限制且质量可以继续降低
                while (compressed.length > maxSizeInBytes * 1.33 && quality > 0.1) {
                    quality -= 0.1;
                    compressed = canvas.toDataURL('image/jpeg', quality);
                }

                // 将base64转回File对象
                const binaryString = atob(compressed.split(',')[1]);
                const bytes = new Uint8Array(binaryString.length);
                for (let i = 0; i < binaryString.length; i++) {
                    bytes[i] = binaryString.charCodeAt(i);
                }

                // 创建新的File对象
                const compressedFile = new File(
                    [bytes.buffer], 
                    file.name, 
                    { type: 'image/jpeg' }
                );

                resolve(compressedFile);
            };

            img.onerror = function() {
                reject(new Error('图片处理失败'));
            };
        };

        reader.onerror = function() {
            reject(new Error('文件读取失败'));
        };
    });
}

async function handleImageSelect(event) {
        const file = event.target.files[0];
        if (file && file.type.startsWith('image/')) {
            // 如果联网搜索已启用，不允许选择图片
            if (elements.onlineSearchBtn && elements.onlineSearchBtn.classList.contains('active')) {
                showNotification('请先关闭联网搜索', 3000);
                event.target.value = '';
                return;
            }
            
            state.selectedImage = await compressImage(file);
            
            // 显示图片预览
            const reader = new FileReader();
            reader.onload = function (e) {
                elements.previewImage.src = e.target.result;
                elements.imagePreviewContainer.style.display = 'block';
                updateMessagesPadding();
            };
            reader.readAsDataURL(state.selectedImage);

            // 更新发送按钮状态
            updateSendButtonState();

            // 禁用联网搜索按钮
            if (elements.onlineSearchBtn) {
                elements.onlineSearchBtn.disabled = true;
                elements.onlineSearchBtn.style.opacity = '0.5';
                elements.onlineSearchBtn.style.cursor = 'not-allowed';
            }

            showNotification('图片已选择', 3000);
        } else if (file) {
            showError('请选择有效的图片文件');
        }

        // 重置input，允许再次选择同一文件
        event.target.value = '';
}
    
    function removeSelectedImage() {
        state.selectedImage = null;
        elements.previewImage.src = '';
        elements.imagePreviewContainer.style.display = 'none';
        updateMessagesPadding();
        updateSendButtonState();

        // 检查是否没有其他图片在预览容器中
        if (elements.imagePreviewContainer.style.display === 'none') {
            // 重新启用联网搜索按钮
            if (elements.onlineSearchBtn) {
                elements.onlineSearchBtn.disabled = false;
                elements.onlineSearchBtn.style.opacity = '';
                elements.onlineSearchBtn.style.cursor = '';
            }
        }
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
            reader.onload = () => {
                // 返回完整的base64字符串，不再分割
                const base64String = reader.result;
                // 确保返回完整base64字符串，包括MIME类型前缀
                resolve(base64String.split(',')[1]); // 只取base64部分，去掉MIME前缀
            };
            reader.onerror = reject;
            reader.readAsDataURL(file);
        });
    }

    // ====================== 消息发送核心 ======================
    async function sendMessageHandler() {
        console.log('尝试发送消息');
        // !重要!
        // 检查是否有内容或图片 | 发送中
        if ((!elements.messageInput.value && !state.selectedImage) || state.isSending) {
            console.log('消息为空或正在发送中');
            return;
        }
        state.isSending = true;


        // 获取当前时间戳
        const currentTime = Date.now();
        // 检查时间间隔
        if (currentTime - lastMessageTime < 10000) { 
            const time = Math.round(parseFloat((10000 - (currentTime - lastMessageTime)) / 1000)).toString();
            showNotification("发送消息太快啦，请等待 " + time + " 秒后重试~");
            state.isSending = false;
            return; 
        }
        // 更新最后发送时间
        lastMessageTime = Date.now();
        console.log('已更新发送时间');


        // 检查用户是否登录
        if (!state.currentUser || !state.currentUser.id) {
            console.log('用户未登录，重定向到登录页面');
            showNotification('请先登录后发送消息', 2000);
            window.location.href = '/auth/login';
            state.isSending = false;
            return;
        }

        // 捕获当前输入内容（创建快照）
        const content = elements.messageInput.value.trim();
        const contentSnapshot = content; // 保存当前内容的快照
        
        const isOnlineSearchEnabled = elements.onlineSearchBtn && 
                                     elements.onlineSearchBtn.classList.contains('active');
        
        
        // 当启用联网搜索时，必须有文本内容
        if (isOnlineSearchEnabled && !elements.messageInput.value) {
            showNotification('联网搜索需要输入文本内容', 3000);
            state.isSending = false;
            return;
        }
        
        // 检查积分是否足够
        const pointsOk = await checkPointsBeforeSend();
        if (!pointsOk) {
            console.log('积分不足，无法发送消息');
            state.isSending = false;
            return;
        }

        console.log('开始发送消息:', contentSnapshot);
        state.lastUserMessage = contentSnapshot;  // 保存用户消息
        updateSendButtonState();
        
        // 清空输入框
        elements.messageInput.value = '';
        elements.messageInput.style.height = 'auto';
        // 清除首次页面布局时添加的输入框和预览框样式，使其恢复默认位置
        resetInputPosition();
        
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
                // 新增：更新聊天主界面标题为新对话
                if (elements.conversationTitle) {
                    elements.conversationTitle.textContent = data.title || '新对话';
                }
            }

            // 准备发送数据
            let messageData = {
                message: contentSnapshot,  // 使用快照内容
                conversation_id: state.currentConversationId,
                model: getSelectedModel(),
                user_id: state.currentUser.id || 'anonymous'  // 添加用户ID
            };
            
            // 添加 message_id，用于续流
            const aiMessageId = `ai-${Date.now()}`;
            messageData.message_id = aiMessageId;
            
            // 如果有图片，将其转换为base64并添加到请求中
            if (state.selectedImage) {
                try {
                    const imageBase64 = await fileToBase64(state.selectedImage);
                    messageData.image = imageBase64;
                    messageData.image_type = state.selectedImage.type;
                    messageData.image_name = state.selectedImage.name;
                    
                    // 首先添加图片作为独立元素 (不在气泡中)
                    const imageContent = await createImagePreview(state.selectedImage);
                    const imageContainer = document.createElement('div');
                    imageContainer.className = 'user-image-container';
                    imageContainer.innerHTML = imageContent;
                    elements.messagesContainer.appendChild(imageContainer);
                    
                    // 然后如果有文本内容，再添加文本气泡
                    if (content) {
                        appendMessage(content, true);
                    }
                } catch (error) {
                    console.error('图片处理失败:', error);
                    showError('图片处理失败');
                    return;
                }
            } else {
                // 纯文本消息，直接添加
                appendMessage(content, true);
            }
            
            
            // 强制滚动到底部
            scrollToBottom(true);

            // 保存 pending 消息以便续流
            let pending = JSON.parse(localStorage.getItem('pending_ai_messages') || '[]');
            pending.push({ messageData });
            localStorage.setItem('pending_ai_messages', JSON.stringify(pending));
            
            // 创建加载中的AI消息
            const modelName = getSelectedModel();
            createLoadingMessage(aiMessageId, modelName);
            
            // 获取AI响应，自动选择接口
            await getAIResponse(messageData, state.currentConversationId, aiMessageId);
            
            // 请求完成后刷新对话列表，确保用户消息入库后展示
            await loadConversations();
            
            // 移除已完成的 pending
            pending = JSON.parse(localStorage.getItem('pending_ai_messages') || '[]');
            pending = pending.filter(item => item.messageData.message_id !== aiMessageId);
            localStorage.setItem('pending_ai_messages', JSON.stringify(pending));

            // 清除已选择的图片
            state.selectedImage = null;
            
            // 更新对话列表
            await loadConversations();

        } catch (error) {
            console.error('发送消息失败:', error);
            showError('发送消息失败: ' + error.message);
            attachCopyButtonsToAIMessages();
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
                // 移除对未定义变量的引用
                state.abortController = null;
            } catch (e) {
                console.error('清理资源时出错:', e);
            }
        }
    }

    // 创建图片预览
    async function createImagePreview(imageFile, caption) {
        return new Promise((resolve) => {
            const reader = new FileReader();
            reader.onload = function (e) {
                // 只返回图片HTML，不包含文字说明
                // 图片不再放在气泡内，而是作为独立元素显示
                const content = `<div class="standalone-image-container"><img src="${e.target.result}" alt="上传的图片" class="standalone-image"></div>`;
                resolve(content);
            };
            reader.readAsDataURL(imageFile);
        });
    }

    // ====================== AI回复获取 ======================
    async function getAIResponse(messageData, conversationId, aiMessageId) {
        // 声明所需变量
        let buffer = '';
        let messageCreated = false;
        let aiMessageDiv = document.getElementById(aiMessageId); // 获取已创建的消息元素
        let currentThink = '';
        let currentContent = '';
        let thinkStartTime = Date.now();
        let thinkTimerInterval = null;
        
        try {
            // 添加联网搜索参数
            const isOnlineSearchEnabled = elements.onlineSearchBtn && 
            elements.onlineSearchBtn.classList.contains('active');
            
            // 日志 - 联网搜索状态
            console.log("联网搜索状态:", isOnlineSearchEnabled);
            console.log("消息内容:", messageData.message);
            
            if (isOnlineSearchEnabled && (!messageData.message || messageData.message.trim() === '')) {
                showError('联网搜索需要文本内容，请输入问题');
                throw new Error('联网搜索需要文本内容');
            }
            
            // 创建一个可中断的控制器
            state.abortController = new AbortController();
            const signal = state.abortController.signal;
            // 更改发送按钮状态为停止按钮
            state.isSending = true;
            updateSendButtonState();
            
            
            // 构建请求体
            const requestBody = {
                prompt: messageData.message, // 主要参数，用于联网搜索
                message: messageData.message, // 兼容其他功能
                conversation_id: conversationId,
                model_name: messageData.model, // 确保模型名称正确传递
                model: messageData.model, // 添加model参数
                has_image: !!messageData.image, // 根据image字段判断是否有图片
                image: messageData.image || null, // 直接传递image base64数据
                image_type: messageData.image_type || null,
                image_name: messageData.image_name || null,
                online_search: isOnlineSearchEnabled
            };

            // 添加 message_id，以便后端使用已有的线程续流
            requestBody.message_id = aiMessageId;
            
            // 确保联网搜索时prompt参数有值
            if (isOnlineSearchEnabled) {
                if (!requestBody.prompt || requestBody.prompt.trim() === '') {
                    throw new Error('联网搜索需要提供prompt参数');
                }
                console.log("联网搜索prompt:", requestBody.prompt);
            }
            
            // 确保model参数有值
            if (!requestBody.model) {
                // 如果没有指定模型，使用默认模型
                const defaultModel = 'DeepSeek-R1';
                console.warn("未指定模型，使用默认模型:", defaultModel);
                requestBody.model = defaultModel;
                requestBody.model_name = defaultModel;
            }
            
            console.log("请求体完整信息:", JSON.stringify(requestBody));

            const serverUrl = `/api/chat/${conversationId}/generate`;
            console.log("请求URL:", serverUrl);
            
            const response = await fetch(serverUrl, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify(requestBody),
                signal // 传递中断信号
            });

            if (!response.ok) {
                // 尝试解析错误响应
                try {
                    const errorText = await response.text();
                    console.error('API错误响应:', errorText);
                    
                    // 尝试解析JSON
                    try {
                        const errorJson = JSON.parse(errorText);
                        if (errorJson.error && typeof errorJson.error === 'string') {
                            // 处理具体错误
                            if (errorJson.error.includes('缺少提示内容') || 
                                errorJson.error.includes('无法继续') ||
                                errorJson.error.includes('prompt')) {
                                showError('联网搜索需要输入有效的问题');
                                throw new Error('联网搜索需要提供有效问题: ' + errorJson.error);
                            } 
                            // 检查是否是模型相关错误
                            else if (errorJson.error.includes('model') || 
                                     errorJson.error.includes('模型')) {
                                showError('模型选择错误: ' + errorJson.error);
                                throw new Error('模型错误: ' + errorJson.error);
                            }
                            else {
                                throw new Error(errorJson.error);
                            }
                        }
                    } catch (jsonError) {
                        // 如果不是JSON，直接使用文本
                        if (errorText.includes('缺少提示内容') || errorText.includes('prompt')) {
                            showError('联网搜索需要输入有效的问题');
                            throw new Error('联网搜索需要提供有效问题: ' + errorText);
                        }
                        // 检查是否是模型相关错误
                        else if (errorText.includes('model') || errorText.includes('模型')) {
                            showError('模型选择错误: ' + errorText);
                            throw new Error('模型错误: ' + errorText);
                        }
                    }
                } catch (parseError) {
                    console.error('解析错误响应失败:', parseError);
                }
                
                throw new Error('AI服务不可用，HTTP状态: ' + response.status);
            }
            // 用户消息已保存到后端，刷新对话列表以立即展示用户消息
            try {
                await loadConversations();
            } catch (e) {
                console.error('刷新对话列表失败:', e);
            }

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
                        // 处理搜索结果 - 检查 data.search 字段
                        if (data.search && typeof data.search === 'string') {
                            handleSearchResults(data.search, aiMessageDiv);
                        }
                        // 首次接收到消息内容时替换加载动画
                        if ((data.content || data.text || data.think) && !messageCreated) {
                            const modelName = data.model_name || getSelectedModel();
                            
                            // 清除加载动画
                            if (aiMessageDiv) {
                                // 保留模型信息，仅添加消息内容容器
                                const modelInfo = aiMessageDiv.querySelector('.model-info');
                                aiMessageDiv.innerHTML = '';
                                if (modelInfo) {
                                    aiMessageDiv.appendChild(modelInfo);
                                }
                                
                                // 思考容器 (初始隐藏)
                                const thinkContainer = document.createElement('div');
                                thinkContainer.className = 'think-container';
                                thinkContainer.style.display = 'none';
                                aiMessageDiv.appendChild(thinkContainer);
                                
                                // 主要消息内容容器
                                const contentDiv = document.createElement('div');
                                contentDiv.className = 'message-content';
                                aiMessageDiv.appendChild(contentDiv);
                                
                                messageCreated = true;
                                
                                // 强制滚动到底部，确保看到新消息
                                scrollToBottom(true);
                                
                                console.log('AI消息加载动画已替换为内容元素', aiMessageId);
                            } else {
                                console.error('找不到加载中的AI消息元素，ID:', aiMessageId);
                                
                                // 备用方案：使用 createLoadingMessage 创建消息容器并添加加载动画
                                aiMessageDiv = createLoadingMessage(aiMessageId, modelName);
                                messageCreated = true;
                                console.log('使用 createLoadingMessage 创建了新的 AI 消息元素', aiMessageId);
                            }
                        }
                        
                        // 更新消息内容 - 先处理正文，保证即使没有思考内容也能显示消息
                        if ((data.content && data.content !== currentContent) || 
                            (data.text && data.text !== currentContent)) {
                            console.log('收到新消息，更新界面');
                            // console.log('收到新消息内容:', JSON.stringify(data).substring(0, 50));
                            
                            // 更新currentContent，优先使用content，其次使用text
                            if (data.content) {
                                currentContent = data.content;
                            } else if (data.text) {
                                currentContent = data.text;
                            }
                            
                            // 添加调试日志
                            // console.log('当前文本内容:', currentContent);
                            
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
                                    let textContent = currentContent;
                                    if (typeof textContent !== 'string') {
                                        if (textContent.content) {
                                            textContent = textContent.content;
                                        } else if (textContent.text) {
                                            textContent = textContent.text;
                                        } else {
                                            textContent = JSON.stringify(textContent);
                                        }
                                    }
                                    
                                    // 如果包含 <search>，先解析搜索结果并移除标签
                                    if (textContent.includes('<search>')) {
                                        handleSearchResults(textContent, aiMessageDiv);
                                        textContent = textContent.replace(/<search>[\s\S]*?<\/search>/g, '').trim();
                                    }

                                    // 保存原始Markdown文本到data-original-text属性，用于复制功能
                                    contentDiv.setAttribute('data-original-text', textContent);
                                    
                                    // 处理base64图片标签
                                    textContent = processMessageContent(textContent, false);
                                    
                                    // 解析并显示
                                    try {
                                    contentDiv.innerHTML = marked.parse(textContent);
                                    } catch (error) {
                                        console.error('解析Markdown失败:', error);
                                        contentDiv.innerHTML = textContent;
                                    }
                                    
                                    // 如果有思考容器，更新其状态
                                    const thinkContainer = aiMessageDiv.querySelector('.think-container');
                                    if (thinkContainer) {
                                        const thinkHeader = thinkContainer.querySelector('.think-header');
                                        if (thinkHeader) {
                                            // 检查是否有实际内容
                                            const hasContent = textContent && textContent.trim().length > 0;
                                            console.log('文本内容检查:', { hasContent, textContent: textContent.substring(0, 50) });
                                            if (hasContent) {
                                                const thinkTimeMatch = currentThink.match(/<think time=(\d+)>/);
                                                var thinkSeconds = 0;
                
                                                thinkSeconds = parseInt(thinkTimeMatch[1], 10) || 0;
                                            }
                                            const headerText = hasContent ? 
                                                `已深度思考（用时 ${thinkSeconds || Math.floor((Date.now() - thinkStartTime) / 1000)} 秒）` : 
                                                '思考中...';
                                            
                                            thinkHeader.innerHTML = `
                                                <span>${headerText}<span style="display:inline-block; width:5px;"></span>
                                                <div class="triangle" style="display:inline-block; width:0; height:0; border-left:6px solid transparent; border-right:6px solid transparent; border-top:6px solid #999; vertical-align:middle;"></div></span>
                                            `;
                                        }
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
                                scrollToBottom(true);
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
                                
                                // 检查是否有实际内容
                                const hasContent = currentContent && currentContent.trim().length > 0;
                                console.log('创建思考头部时的内容检查:', { hasContent, currentContent: currentContent ? currentContent.substring(0, 50) : null });
                                
                                if (hasContent) {
                                    const thinkTimeMatch = currentThink.match(/<think time=(\d+)>/);
                                    var thinkSeconds = 0;
    
                                    thinkSeconds = parseInt(thinkTimeMatch[1], 10) || 0;
                                }
                                const headerText = hasContent ? 
                                    `已深度思考（用时 ${thinkSeconds || Math.floor((Date.now() - thinkStartTime) / 1000)} 秒）` : 
                                    '思考中...';
                                
                                thinkHeader.innerHTML = `
                                    <span>${headerText}<span style="display:inline-block; width:5px;"></span>
                                    <div class="triangle" style="display:inline-block; width:0; height:0; border-left:6px solid transparent; border-right:6px solid transparent; border-top:6px solid #999; vertical-align:middle;"></div></span>
                                `;
                                
                                // 创建思考内容
                                const thinkContentDiv = document.createElement('div');
                                thinkContentDiv.className = 'message-think';
                                thinkContentDiv.style.display = 'block';
                                thinkContentDiv.style.backgroundColor = 'transparent';
                                thinkContentDiv.style.lineHeight = '1.3';
                                
                                // 处理换行符和粗体语法
                                let processed = thinkContent;
                                // 处理换行符
                                processed = processed.replace(/\n/g, '<br>');
                                // 只处理粗体语法 (**text** 或 __text__)
                                processed = processed.replace(/(\*\*|__)(.*?)\1/g, '<strong>$2</strong>');
                                thinkContentDiv.innerHTML = processed;
                                
                                // 切换展示
                                thinkHeader.onclick = () => {
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
                                
                                // 插入到模型信息之后，消息内容之前
                                const contentDiv = aiMessageDiv.querySelector('.message-content');
                                if (contentDiv) {
                                aiMessageDiv.insertBefore(thinkContainer, contentDiv);
                                    console.log('思考容器已添加到DOM');
                                } else {
                                    console.error('找不到消息内容元素，无法插入思考容器');
                                }
                            } else {
                                // 如果容器已存在，确保think-header元素存在
                                let thinkHeader = thinkContainer.querySelector('.think-header');
                                
                                // 如果think-header不存在，创建它
                                if (!thinkHeader) {
                                    console.log('创建缺失的思考头部');
                                    thinkHeader = document.createElement('div');
                                    thinkHeader.className = 'think-header';
                                    
                                    // 添加点击事件，实现展开/折叠功能
                                    thinkHeader.onclick = function (event) {
                                        console.log('点击思考头部');
                                        event.stopPropagation();
                                        const thinkContentDiv = thinkContainer.querySelector('.message-think');
                                        if (thinkContentDiv) {
                                            if (thinkContentDiv.style.display === 'none') {
                                                thinkContentDiv.style.display = 'block';
                                                console.log('思考内容展开');
                                            } else {
                                                thinkContentDiv.style.display = 'none';
                                                console.log('思考内容折叠');
                                            }
                                        }
                                    };
                                    
                                    // 插入到思考容器的开头
                                    thinkContainer.insertBefore(thinkHeader, thinkContainer.firstChild);
                                    
                                    // 保存思考头部元素引用
                                    thinkHeaderElement = thinkHeader;
                                }

                                if (currentContent && currentContent.trim()) {
                                    const thinkTimeMatch = currentThink.match(/<think time=(\d+)>/);
                                    var thinkSeconds = 0;
    
                                    thinkSeconds = parseInt(thinkTimeMatch[1], 10) || 0;
                                }

                                // 更新头部文本
                                const headerText = currentContent && currentContent.trim() ? 
                                    `已深度思考（用时 ${thinkSeconds || Math.floor((Date.now() - thinkStartTime) / 1000)} 秒）` : 
                                    '思考中...';
                                
                                thinkHeader.innerHTML = `
                                    <span>${headerText}<span style="display:inline-block; width:5px;"></span>
                                    <div class="triangle" style="display:inline-block; width:0; height:0; border-left:6px solid transparent; border-right:6px solid transparent; border-top:6px solid #999; vertical-align:middle;"></div></span>
                                `;
                                }
                        
                                // 确保思考容器可见（移除display: none）
                                if (thinkContainer && currentThink && currentThink.trim() !== '') {
                                    thinkContainer.style.display = 'block';
                                    console.log('思考容器显示状态已设置为可见');
                                }
                        
                                // 更新思考内容
                                // 确保思考内容容器存在，若不存在则自动创建
                                let thinkContentDiv = thinkContainer.querySelector('.message-think');
                                if (!thinkContentDiv) {
                                    thinkContentDiv = document.createElement('div');
                                    thinkContentDiv.className = 'message-think';
                                    thinkContentDiv.style.backgroundColor = 'transparent';
                                    thinkContentDiv.style.lineHeight = '1.3';
                                    thinkContainer.appendChild(thinkContentDiv);
                                }
                                try {
                                    // 处理内容，确保是字符串
                                    let thinkText = currentThink;
                                    if (typeof thinkText !== 'string') {
                                        if (thinkText.content) {
                                            thinkText = thinkText.content;
                                        } else if (thinkText.text) {
                                            thinkText = thinkText.text;
                                        } else {
                                            thinkText = JSON.stringify(thinkText);
                                        }
                                    }
                                    
                                    // 处理换行符
                                    thinkText = thinkText.replace(/\n/g, '<br>');
                                    
                                    // 处理思考内容的粗体语法
                                    thinkContentDiv.innerHTML = processThinkContent(thinkText);
                                    
                                    console.log('思考内容已更新');
                                } catch (error) {
                                    console.error('处理思考内容时出错:', error);
                                    thinkContentDiv.innerHTML = `<p>思考内容解析错误</p>`;
                                }
                                // 如果容器未被折叠，滚动到可见位置
                                if (thinkContentDiv.style.display !== 'none' && state.isNearBottom) {
                                    scrollToBottom();
                                }
                        }
                        
                    } catch (e) {
                        console.error('解析服务器消息失败:', e, line);
                    }
                }
            }
            
            if (thinkTimerInterval) {
                clearInterval(thinkTimerInterval);
            }
            
            // 完成响应处理后的代码块
            console.log('AI响应完成');

            // 请求完成，结束流式显示
            if (state.isSending) {
                state.isSending = false;
                updateSendButtonState();
            }

            attachCopyButtonsToAIMessages();
            // 添加复制按钮后再次滚动到底部
            scrollToBottom();

            // 检查当前对话的标题是否为"新对话"，如果是则获取新标题
            if (conversationId) {
                const currentConversation = state.conversations.find(conv => conv.id === conversationId);
                if (currentConversation && currentConversation.title === '新对话') {
                    // 异步获取标题，不阻塞继续交流
                    fetchConversationTitle(conversationId);
                }
            }
            
            // 函数结束时，获取和刷新用户积分
            try {
                // 刷新积分显示
                await fetchUserPointsInfo();
            } catch (error) {
                console.error('刷新信息失败:', error);
            }
            
            return aiMessageDiv;
        } catch (error) {
            if (error.name === 'AbortError') {
                // 请求 /stop 接口，用 POST 方法，发送要中断的 message_id
                const response = await fetch('/stop', {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json'
                    },
                    body: JSON.stringify({ message_id: aiMessageId })
                });

                if (response.ok) {
                    console.log('请求已中断');
                } else {
                    console.error('中断请求失败:', response.statusText);
                }

                // 清除计时器（使用try-catch防止错误）
                try {
                    if (thinkTimerInterval) {
                        clearInterval(thinkTimerInterval);
                        thinkTimerInterval = null;
                    }
                } catch (e) {
                    console.error('清除计时器时出错:', e);
                }
                
                attachCopyButtonsToAIMessages();
                // 添加复制按钮后再次滚动到底部
                scrollToBottom();
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
    function appendMessage(content, isUser = false) {
        const messageDiv = document.createElement('div');
        messageDiv.className = isUser ? 'message user' : 'message ai';

        // 用户消息直接使用现有逻辑
        if (isUser) {
            // 处理换行和 HTML 标签
            // const processedContent = content.replace(/\n/g, '<br>') // 替换换行符为 <br>

            // 处理特殊标签（显示时）
            // const processedContent = processMessageContent(cleanContent, true);
                        
            // 创建消息内容元素
            const contentDiv = document.createElement('div');
            contentDiv.className = 'message-content';
            contentDiv.innerHTML = content;
            
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

    // ====================== 工具函数 ======================
    function escapeHtml(text) {
        return text
            .replace(/&/g, "&amp;")
            .replace(/</g, "&lt;")
            .replace(/>/g, "&gt;")
            .replace(/"/g, "&quot;")
            .replace(/'/g, "&#039;");
    }

    // 处理消息内容中的特殊标签
    function processMessageContent(content, displayOnly = false, separateImages = false) {
        if (!content) return '';
        let processedContent = content;
        
        // 处理 <image>图片描述</image> 标签
        // 始终删除 <image> 标签块，不管是否为显示模式
        processedContent = processedContent.replace(/<image>.*?<\/image>/gs, '');
        
        // 如果不需要分离图片，按原方式处理 <base64> 标签
        if (!separateImages) {
        // 处理 <base64>图片base64</base64> 标签
        // 将图片标签保存起来，等待文本处理后再附加到末尾
        let imageElements = [];
        processedContent = processedContent.replace(/<base64>(.*?)<\/base64>/g, (match, base64Content) => {
            // 创建图片元素
            const imgHtml = `<img src="data:image/png;base64,${base64Content}" alt="嵌入图片" class="embedded-image" style="max-width: 100%; border-radius: 8px;" />`;
            imageElements.push(imgHtml);
            return ''; // 先删除图片标签
        });
        
        // 文本处理完成后，将所有图片附加到末尾
        if (imageElements.length > 0) {
            processedContent = processedContent.trim() + '<br>' + imageElements.join('');
            }
        } else {
            // 需要分离图片时，直接删除 <base64> 标签，不附加
            processedContent = processedContent.replace(/<base64>.*?<\/base64>/gs, '');
        }
        
        return processedContent;
    }

    // 修改 scrollToBottom 函数，临时禁用平滑滚动直接跳到底部
    function scrollToBottom(force = false) {
        const container = elements.scrollableContainer || elements.messagesContainer;
        if (!container) return;
        
            setTimeout(() => {
            // 禁用平滑滚动
            container.style.scrollBehavior = 'auto';

            const scrollHeight = container.scrollHeight;
            const clientHeight = container.clientHeight;
            const scrollTop = container.scrollTop;
            const scrollFromBottom = scrollHeight - scrollTop - clientHeight;
            const isAtBottom = scrollFromBottom <= 160;

            // 当强制滚动、内容未填满或用户已在底部时滚动到底部
            if (force || scrollHeight <= clientHeight || isAtBottom) {
                container.scrollTop = scrollHeight;
            }
            }, 0);
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
    window.retryMessage = async function (messageId) {
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
            
            let conversations = await response.json();
            
            // 按照创建时间倒序排列对话列表
            conversations.sort((a, b) => {
                // 如果有created_at字段，按时间排序
                if (a.created_at && b.created_at) {
                    return new Date(b.created_at) - new Date(a.created_at);
                }
                // 如果没有时间字段，保持原有顺序
                return 0;
            });
            
            state.conversations = conversations;
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

    // 处理思考内容的粗体语法
    function processThinkContent(content) {
        if (!content) return '';
        // 处理换行符
        let processed = content.replace(/\n/g, '<br>');
        // 只处理粗体语法 (**text** 或 __text__)
        processed = processed.replace(/(\*\*|__)(.*?)\1/g, '<strong>$2</strong>');
        return processed;
    }

    // 加载对话历史
    function loadConversationHistory(conversationId) {
        if (!conversationId) {
            console.error('对话ID不能为空');
            return;
        }

        // 设置当前对话 ID
        state.currentConversationId = conversationId;
        
        // 清除首次页面布局时添加的输入框和预览框样式，使其恢复默认位置
        resetInputPosition();
        
        // 新增：如果获取历史记录超过 0.5 秒，显示加载动画
        const chatMain = document.querySelector('.chat-main');
        let loadingTimer = setTimeout(() => {
            if (chatMain) {
                // 防止重复创建
                let overlay = chatMain.querySelector('.history-loading-overlay');
                if (!overlay) {
                    overlay = document.createElement('div');
                    overlay.className = 'history-loading-overlay';
                    overlay.style.position = 'absolute';
                    overlay.style.top = '50%';
                    overlay.style.left = '50%';
                    overlay.style.transform = 'translate(-50%, -50%)';
                    overlay.style.zIndex = '1000';
                    overlay.innerHTML = '<div class="history-spinner" role="status"></div>';
                    chatMain.appendChild(overlay);
                }
            }
        }, 100);
        
        // 更新侧边栏中的活动对话项
        updateActiveConversationInSidebar(conversationId);
        // 新增：设置聊天区标题
        if (elements.conversationTitle) {
            const conv = state.conversations.find(c => c.id === conversationId);
            elements.conversationTitle.textContent = conv && conv.title ? conv.title : '';
        }

        // 新增：立即清空消息容器
        const chatMessages = document.getElementById('messages');
        if (chatMessages) chatMessages.innerHTML = '';

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
                // 请求完成，清理加载动画
                clearTimeout(loadingTimer);
                if (chatMain) {
                    const overlay = chatMain.querySelector('.history-loading-overlay');
                    if (overlay) overlay.remove();
                }
                const chatMessages = document.getElementById('messages');
                if (!chatMessages) {
                    console.error('找不到消息容器元素');
                    return;
                }
                
                // 清空消息容器（已在 fetch 前执行，此处确保）
                chatMessages.innerHTML = '';
                
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
                        
                        // 检查消息内容是否包含图片预览或base64图片标签
                        const hasImagePreview = msg.content.includes('<div class="image-preview">');
                        const hasBase64Image = msg.content.includes('<base64>');
                        
                        if (hasImagePreview || hasBase64Image) {
                            let textContent = msg.content;
                            let imageHTML = '';
                            
                            // 处理图片预览
                            if (hasImagePreview) {
                                const imageMatch = textContent.match(/<div class="image-preview">(.*?)<\/div>/s);
                                if (imageMatch) {
                                    imageHTML = imageMatch[1];
                                    // 移除消息中的图片部分
                                    textContent = textContent.replace(/<div class="image-preview">.*?<\/div>/s, '').trim();
                                }
                            }
                            
                            // 处理base64图片标签
                            if (hasBase64Image) {
                                const base64Match = textContent.match(/<base64>(.*?)<\/base64>/s);
                                if (base64Match) {
                                    const base64Content = base64Match[1];
                                    imageHTML = `<img src="data:image/png;base64,${base64Content}" alt="嵌入图片" class="embedded-image" style="max-width: 100%; border-radius: 8px; margin: 10px 0;" />`;
                                    // 移除消息中的base64部分
                                    textContent = textContent.replace(/<base64>.*?<\/base64>/s, '').trim();
                                }
                            }
                            
                            // 创建独立的图片容器
                            if (imageHTML) {
                                const imageContainer = document.createElement('div');
                                imageContainer.className = 'user-image-container';
                                imageContainer.innerHTML = `<div class="standalone-image-container">${imageHTML}</div>`;
                                chatMessages.appendChild(imageContainer);
                            }
                            
                            // 处理<image>标签（直接删除，不显示）
                            textContent = textContent.replace(/<image>.*?<\/image>/gs, '').trim();
                            
                            // 如果还有文本内容，添加文本气泡
                            if (textContent) {
                                const messageDiv = document.createElement('div');
                                messageDiv.className = 'message user';
                                const contentDiv = document.createElement('div');
                                contentDiv.className = 'message-content';
                        
                                // 处理特殊标签
                                const processedContent = processMessageContent(textContent, true, true);
                                contentDiv.innerHTML = marked.parse(processedContent);
                                
                                messageDiv.appendChild(contentDiv);
                                chatMessages.appendChild(messageDiv);
                            }
                        } else {
                            // 无图片的普通消息
                            const contentDiv = document.createElement('div');
                            contentDiv.className = 'message-content';
                            
                            // 处理特殊标签
                            const processedContent = processMessageContent(msg.content, true, true);
                            contentDiv.innerHTML = marked.parse(processedContent);
                            
                            // 添加到消息元素
                            messageDiv.appendChild(contentDiv);
                            chatMessages.appendChild(messageDiv);
                        }
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
                            <div class="model-avatar"><img src="/static/models/${imageName}.png" alt="${modelName}" onerror="this.src='/static/models/default.png';"></div>
                            <div class="model-name"><strong>${modelName}</strong></div>
                        `;
                        
                        // 添加到消息元素
                        messageDiv.appendChild(modelInfoDiv);
                        
                        // 历史消息中的搜索结果，放在 model-info 之后
                        if (msg.content.includes('<search>')) {
                            const searchContainer = document.createElement('div');
                            searchContainer.className = 'search-results-container';
                            searchContainer.style.display = 'block';
                            messageDiv.appendChild(searchContainer);
                            handleSearchResults(msg.content, messageDiv);
                            content = content.replace(/<search>[\s\S]*?<\/search>/g, '').trim();
                        }
                        
                        // 提取并渲染有思考内容的折叠块
                        const thinkRegex = /<think time=(\d+)>([\s\S]*?)<\/think>/;
                        const thinkMatches = content.match(thinkRegex);
                        if (thinkMatches && thinkMatches[2].trim()) {
                            const thinkTime = thinkMatches[1];
                            const thinkContent = thinkMatches[2];
                            // 创建折叠容器
                            const thinkContainer = document.createElement('div');
                            thinkContainer.className = 'think-container';
                            thinkContainer.style.margin = '0.5rem 0';
                
                            // 创建思考头部
                            const thinkHeader = document.createElement('div');
                            thinkHeader.className = 'think-header';
                            thinkHeader.innerHTML = `<span>已深度思考（用时 ${thinkTime} 秒）<span style="display:inline-block; width:5px;"></span><div class="triangle" style="display:inline-block; width:0; height:0; border-left:6px solid transparent; border-right:6px solid transparent; border-top:6px solid #999; vertical-align:middle;"></div></span>`;
                            thinkHeader.style.cursor = 'pointer';
                    
                            // 创建内容区域
                            const thinkContentDiv = document.createElement('div');
                            thinkContentDiv.className = 'message-think';
                            thinkContentDiv.style.display = 'block';
                            thinkContentDiv.style.backgroundColor = 'transparent';
                            thinkContentDiv.style.lineHeight = '1.3';
                                
                            // 处理换行符，但不进行markdown解析
                            const processedThinkContent = thinkContent.replace(/\n/g, '<br>');
                            thinkContentDiv.innerHTML = processedThinkContent;
                            
                            // 切换展示
                            thinkHeader.onclick = () => {
                                thinkContentDiv.style.display = thinkContentDiv.style.display === 'none' ? 'block' : 'none';
                            };
                            
                            // 组装并添加到消息元素
                            thinkContainer.appendChild(thinkHeader);
                            thinkContainer.appendChild(thinkContentDiv);
                            messageDiv.appendChild(thinkContainer);
                    
                            // 更新剩余文本
                            content = content.replace(thinkRegex, '').trim();
                    }
                                        
                    // 添加主要内容
                    if (content) {
                        console.log('添加历史消息正文内容');
                    // 创建内容元素
                    const contentDiv = document.createElement('div');
                    contentDiv.className = 'message-content';
                    // 处理内容，确保是字符串
                    let textContent = content;
                    if (typeof textContent !== 'string') {
                        if (textContent.content) {
                            textContent = textContent.content;
                        } else {
                            textContent = JSON.stringify(textContent);
                        }
                    }

                    if (msg.role === 'user') {
                        contentDiv.innerHTML = textContent;
                    } else {
                        // 移除模型标签
                        content = content.replace(/<model="[^"]+"\/>/g, '').trim();

                        try {                           
                            // 处理base64图片标签
                            textContent = processMessageContent(content, false);
                            
                            // textContent = textContent.replace(/\n/g, '<br>');
                            // 解析并显示
                            
                                
                            try {
                                contentDiv.innerHTML = marked.parse(textContent);
                            } catch (error) {
                                console.error('解析Markdown失败:', error);
                                contentDiv.innerHTML = textContent;
                            }
                            
                        } catch (error) {
                            console.error('处理历史消息内容时出错:', error);
                            contentDiv.innerHTML = `<p>${textContent}</p>`;
                        }
                    }
                    // 添加到消息元素
                    messageDiv.appendChild(contentDiv);
                    
                    // 添加到消息容器
                    chatMessages.appendChild(messageDiv);
                    }
                }
            });
            
                // 加载完历史记录后，立即跳转到底部
                scrollToBottom(true);
                
                // 历史记录加载完成后，添加复制按钮
                console.log('历史记录加载完成，添加复制按钮...');
                attachCopyButtonsToAIMessages();
                // 添加复制按钮后再次滚动到底部
                scrollToBottom(true);
            })
            .catch(error => {
                // 请求失败，也要清理加载动画
                clearTimeout(loadingTimer);
                if (chatMain) {
                    const overlay = chatMain.querySelector('.history-loading-overlay');
                    if (overlay) overlay.remove();
                }
                console.error('加载历史记录失败:', error);
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
            
            // 在URL更新的同时，确保更新当前对话ID和活动状态
            state.currentConversationId = conversationId;
            console.log(`设置当前对话ID: ${conversationId}`);
            
            // 更新侧边栏活动状态
            updateActiveConversationInSidebar(conversationId);
        } catch (error) {
            console.error('更新 URL 时出错:', error);
        }
    }

    function updateConversationsList() {
        if (!elements.conversationsList) return;
        
        elements.conversationsList.innerHTML = '';
        state.conversations.forEach(conv => {
            const item = document.createElement('div');
            // 添加data-id属性，方便后续查找
            item.setAttribute('data-id', conv.id);
            // 正确设置active类 - 基于当前选中的对话ID
            item.className = `conversation-item ${conv.id === state.currentConversationId ? 'active' : ''}`;
            
            // 如果是活动项，记录日志
            if (conv.id === state.currentConversationId) {
                console.log(`设置活动对话项: ${conv.id}, 标题: ${conv.title || '新对话'}`);
            }
            
            // 创建对话内容容器
            const contentDiv = document.createElement('div');
            contentDiv.className = 'conversation-content';
            contentDiv.onclick = () => {
                // 先更新当前对话ID
                state.currentConversationId = conv.id;
                // 更新URL
                updateUrl(conv.id);
                // 加载对话历史
                loadConversationHistory(conv.id);
            };
            
            contentDiv.innerHTML = `
                <div class="conversation-title">${conv.title || '新对话'}</div>
            `;
            
            // 创建更多选项按钮（替换原来的删除按钮）
            const moreBtn = document.createElement('button');
            moreBtn.className = 'more-options-btn';
            moreBtn.innerHTML = `
                <div class="dots">
                    <div class="dot"></div>
                    <div class="dot"></div>
                    <div class="dot"></div>
                </div>
            `;
            // 点击更多按钮显示/隐藏下拉菜单
            moreBtn.onclick = (e) => {
                e.stopPropagation(); // 阻止冒泡，避免触发对话点击事件
                
                // 删除所有已存在的下拉菜单
                document.querySelectorAll('.conversation-dropdown-menu').forEach(menu => menu.remove());
                
                // 创建下拉菜单
                const dropdownMenu = document.createElement('div');
                dropdownMenu.className = 'conversation-dropdown-menu';
                dropdownMenu.innerHTML = `
                    <div class="conversation-dropdown-item rename-item">
                        <span>重命名</span>
                    </div>
                    <div class="conversation-dropdown-item delete-item">
                        <span>删除</span>
                    </div>
                `;
                
                // 将菜单添加到body
                document.body.appendChild(dropdownMenu);
                
                // 设置菜单位置
                const btnRect = moreBtn.getBoundingClientRect();
                dropdownMenu.style.position = 'fixed';
                dropdownMenu.style.top = `${btnRect.bottom + 5}px`;
                dropdownMenu.style.left = `${btnRect.left - 90}px`; // 菜单左对齐，宽度约100px
                
                // 显示菜单
                dropdownMenu.classList.add('show');
                
                // 重命名选项点击事件
                const renameItem = dropdownMenu.querySelector('.rename-item');
                renameItem.onclick = (e) => {
                e.stopPropagation();
                    dropdownMenu.remove(); // 移除菜单
                    
                    // 找到对话标题元素并使其可编辑
                    const conversationItem = document.querySelector(`.conversation-item[data-id="${conv.id}"]`);
                    if (conversationItem) {
                        const titleElement = conversationItem.querySelector('.conversation-title');
                        if (titleElement) {
                            // 调用内联编辑函数
                            makeConversationTitleEditable(conv.id, titleElement);
                        }
                    }
                };
                
                // 删除选项点击事件
                const deleteItem = dropdownMenu.querySelector('.delete-item');
                deleteItem.onclick = (e) => {
                    e.stopPropagation();
                    dropdownMenu.remove(); // 移除菜单
                    
                    // 调用删除对话函数
                deleteConversation(conv.id);
                };
                
                // 点击其他地方时关闭菜单
                const closeMenu = (event) => {
                    if (!dropdownMenu.contains(event.target) && !moreBtn.contains(event.target)) {
                        dropdownMenu.remove(); // 移除菜单
                        document.removeEventListener('click', closeMenu);
                    }
                };
                
                // 添加全局点击事件来关闭菜单
                setTimeout(() => {
                    document.addEventListener('click', closeMenu);
                }, 0);
            };
            
            item.appendChild(contentDiv);
            item.appendChild(moreBtn);
            elements.conversationsList.appendChild(item);
        });
    }

    function clearMessages() {
        elements.messagesContainer.innerHTML = '';
    }

    // ====================== 初始化聊天 ======================
    // 修改新对话按钮的处理函数
    function handleNewChat() {
        // 更新 URL 到根路径
        history.pushState({}, '', '/');
        // 显示欢迎界面
        showInitialPage();
        // 清空当前对话 ID
        state.currentConversationId = null;
    }

    // 修改 showInitialPage 函数
    function showInitialPage() {
        if (!elements.messagesContainer) return;
        console.log('未找到消息容器元素')
        // 新增：切换到欢迎界面时清空聊天区标题
        if (elements.conversationTitle) {
            elements.conversationTitle.textContent = '';
        }
        /* 获取时间（仅小时） */
        const now = new Date();
        const hours = now.getHours();
        // 确保用户名为字符串，避免 null 或 undefined 导致错误
        const user_name = state.currentUser.username || 'User';
        const user_name_cn = user_name.match(/[\u4e00-\u9fa5]/);
        // const user_name_cn = null;
        if (user_name_cn) {
            if (hours < 12) {
                greeting = '早上好，' + user_name;
            } else if (hours < 18) {
                greeting = '下午好，' + user_name;
            } else {
                greeting = '晚上好，' + user_name;
            }
        } else {
            if (hours < 12) {
                greeting = 'Good morning, ' + user_name;
            } else if (hours < 18) {
                greeting = 'Good afternoon, ' + user_name;
            } else {
                greeting = 'Good evening, ' + user_name;
            }
        }
        if (state.currentUser && state.currentUser.id) {
        elements.messagesContainer.innerHTML = `
            <div class="initial-page">
                <div class="welcome-message">
                        <h1>${greeting}</h1>
                </div>
            </div>
        `;
        } else {
            elements.messagesContainer.innerHTML = `
                <div class="initial-page">
                    <div class="welcome-message">
                            <h1>${greeting}</h1>
                    </div>
                </div>
            `;
            // 为未登录用户修改输入框提示文本
            if (elements.messageInput) {
                elements.messageInput.placeholder = "登录后即可开始与 Aurora 对话...";
            }
        }

        // 聚焦到输入框
        if (elements.messageInput) {
            elements.messageInput.focus();
        }
        // 初始页面时更新输入框和预览位置
        updateInitialInputPosition();
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
            elements.sidebarToggle.classList.toggle('collapsed');
            
            // 发送请求到服务器保存折叠状态
            // 保存到本地存储
            localStorage.setItem('sidebarState', state.isSidebarCollapsed);
        });
        // 新增：桌面端折叠/展开时调整模型选择位置
        if (window.innerWidth > 768) {
            const modelSelectEl = document.querySelector('.model-select');
            if (modelSelectEl) {
                modelSelectEl.style.removeProperty('left');
                if (state.isSidebarCollapsed) {
                    const computedLeft = window.getComputedStyle(modelSelectEl).left;
                    const leftValue = parseFloat(computedLeft) || 0;
                    modelSelectEl.style.left = (leftValue + 45) + 'px';
                }
            }
        }
    }

    // 修改登出函数
    function logout() {
        showConfirmDialog('确定要退出登录吗？', function () {
            // 直接重定向到退出页面，保持原来的行为
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
        padding: 2rem 2rem;
        font-weight: 200;
        margin-top: calc(25dvh - 50px);
    }

    .welcome-message {
        margin-bottom: 2rem;
    }

    .welcome-message h1 {
        font-size: 2rem;
        margin-bottom: 1rem;
        color: #333;
        font-weight: 500;
    }

    @media (max-width: 768px) {
        /* 靠左显示 */
        .initial-page {
            align-items: baseline;
            margin-top: calc(27dvh - 50px);
        }
        .welcome-message h1 {
            font-size: calc(150% + 9px);
        }
    }

    @media (prefers-color-scheme: dark) {
        .welcome-message h1 {
            color: #e0e0e0;
        }
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
        try {
            const modelSelect = document.querySelector('.model-select');
                if (!modelSelect) {
                    console.error('未找到模型选择器元素');
                    return;
                }

            const modelHeader = modelSelect.querySelector('.model-select-header');
            const modelOptions = modelSelect.querySelector('.model-select-options');
            const selectedModelSpan = modelSelect.querySelector('.selected-model');

                if (!modelHeader || !modelOptions || !selectedModelSpan) {
                    console.error('模型选择器子元素不完整');
                    return;
                }

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
                const isActive = modelSelect.classList.toggle('active');
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
            return true;
        } catch (error) {
            console.error('设置模型选择器时出错:', error);
            return false;
        }
    }

    // 获取当前选中的模型
    function getSelectedModel() {
        return state.currentModel;
    }

    // 添加滚动监听函数
    function setupScrollListener() {
        const container = elements.scrollableContainer || elements.messagesContainer;
        container.addEventListener('scroll', () => {
            // 更新是否在底部的状态
            state.isNearBottom = container.scrollHeight - container.scrollTop - container.clientHeight < 100;
        });
    }

    // 调用初始化函数
    init().catch(error => {
        console.error('初始化失败:', error);
        showError('初始化失败: ' + error.message);
    });

    // 修改 startMarkdownObserver 函数
    function startMarkdownObserver() {
        console.log('启动Markdown观察器...');
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
                                    
                                    // 为代码块添加复制按钮
                                    console.log('新内容渲染后添加复制按钮');
                                    addCopyButtonsToCodeBlocks(contentDiv);
                                    
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
    
    // 为代码块添加复制按钮
    function addCopyButtonsToCodeBlocks(container) {
        const codeBlocks = container.querySelectorAll('pre code');
        console.log('找到代码块数量:', codeBlocks.length);
        
        codeBlocks.forEach((codeBlock, index) => {
            // 创建复制按钮容器
            const buttonContainer = document.createElement('div');
            buttonContainer.className = 'copy-button-container';
            buttonContainer.style.cssText = 'position: absolute; top: 5px; right: 5px; z-index: 100; opacity: 1;';
            
            // 创建复制按钮
            const copyButton = document.createElement('button');
            copyButton.className = 'copy-button';
            copyButton.innerHTML = '<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="9" y="9" width="13" height="13" rx="2" ry="2"></rect><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"></path></svg>';
            copyButton.title = "复制代码";
            copyButton.style.cssText = 'background: rgba(240, 240, 240, 0.8); border: none; border-radius: 4px; color: #555; cursor: pointer; padding: 5px; width: 28px; height: 28px; display: flex; align-items: center; justify-content: center; box-shadow: 0 1px 3px rgba(0,0,0,0.12);';
            
            // 添加点击事件
            copyButton.addEventListener('click', async (e) => {
                e.stopPropagation(); // 防止事件冒泡
                const code = codeBlock.textContent;
                
                try {
                    await navigator.clipboard.writeText(code);
                    // 复制成功，修改按钮文本
                    copyButton.innerHTML = '<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="20 6 9 17 4 12"></polyline></svg>';
                    copyButton.style.background = 'rgba(73, 204, 144, 0.8)';
                    copyButton.style.color = '#fff';
                    
                    // 显示提示
                    showNotification('已复制到剪贴板', 1500);
                    
                    // 2秒后恢复原状
                    setTimeout(() => {
                        copyButton.innerHTML = '<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="9" y="9" width="13" height="13" rx="2" ry="2"></rect><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"></path></svg>';
                        copyButton.style.background = 'rgba(240, 240, 240, 0.8)';
                        copyButton.style.color = '#555';
                    }, 2000);
                } catch (err) {
                    console.error('复制失败：', err);
                    copyButton.innerHTML = '<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"></circle><line x1="15" y1="9" x2="9" y2="15"></line><line x1="9" y1="9" x2="15" y2="15"></line></svg>';
                    copyButton.style.background = 'rgba(255, 59, 48, 0.8)';
                    copyButton.style.color = '#fff';
                    
                    // 显示失败提示
                    showNotification('复制失败，请重试', 1500);
                    
                    // 2秒后恢复原状
                    setTimeout(() => {
                        copyButton.innerHTML = '<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="9" y="9" width="13" height="13" rx="2" ry="2"></rect><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"></path></svg>';
                        copyButton.classList.remove('copy-error');
                    }, 2000);
                    
                    // 兼容性处理：尝试使用备用方法复制
                    fallbackCopy(code);
                }
            });
            
            // 添加按钮到容器
            buttonContainer.appendChild(copyButton);
            
            // 确保代码块的父元素有相对定位
            const preElement = codeBlock.parentElement;
            if (preElement && preElement.tagName === 'PRE') {
                // 强制设置pre元素的样式
                preElement.style.position = 'relative';
                preElement.style.padding = '1em';
                preElement.style.borderRadius = '6px';
                preElement.style.margin = '0.5em 0';
                preElement.style.overflow = 'auto';
                
                preElement.appendChild(buttonContainer);
                console.log(`已添加复制按钮到第${index + 1}个代码块`);
            } else {
                console.log(`找不到第${index + 1}个代码块的PRE父元素`);
            }
        });
    }
    
    // 兼容性备用复制方法
    function fallbackCopy(text) {
        try {
            // 创建一个临时文本区域
            const textArea = document.createElement('textarea');
            textArea.value = text;
            textArea.style.position = 'fixed';
            textArea.style.left = '-9999px';
            textArea.style.top = '-9999px';
            document.body.appendChild(textArea);
            textArea.focus();
            textArea.select();
            
            // 尝试执行复制命令
            const successful = document.execCommand('copy');
            
            // 清理并返回
            document.body.removeChild(textArea);
            
            if (successful) {
                // showNotification('已复制到剪贴板');
            } else {
                showNotification('复制失败，请重试');
            }
        } catch (err) {
            console.error('备用复制方法失败:', err);
            showNotification('复制失败，请重试');
        }
    }


    // 获取模型图片名称
    function getModelImageName(modelName) {
        if (modelName.includes('DeepSeek')) {
            return 'DeepSeek';
        } else if (modelName.includes('Doubao')) {
            return 'Doubao';
        } else if (modelName.includes('Gemini')) {
            return 'Gemini';
        } else if (modelName.includes('Qwen') || modelName.includes('QwQ') || modelName.includes('QvQ')) {
            return 'Qwen';
        } else if (modelName.includes('GLM')) {
            return 'Zhipu';
        } else {
            return modelName;
        }
    }

    // 切换移动端侧边栏
    function toggleMobileSidebar() {
        elements.sidebar.classList.toggle('show');
        elements.sidebarOverlay.classList.toggle('show');
    }

    // 关闭移动端侧边栏
    function closeMobileSidebar() {
        elements.sidebar.classList.remove('show');
        elements.sidebarOverlay.classList.remove('show');
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
            console.log('切换为发送按钮');
            
            // 如果没有内容也没有图片，禁用发送按钮
            elements.sendButton.disabled = !canSend;
            elements.sendButton.style.opacity = canSend ? "1" : "0.5";
            elements.sendButton.style.cursor = canSend ? "pointer" : "not-allowed";
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
            <div class="model-avatar"><img src="/static/models/${imageName}.png" alt="${modelName}" onerror="this.src='/static/models/default.png';"></div>
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

    // 添加更新对话标题的函数
    function updateConversationTitle(conversationId, title) {
        console.log('更新对话标题:', conversationId, title);
        
        // 更新内存中的对话标题
        const conversation = state.conversations.find(conv => conv.id === conversationId);
        if (conversation) {
            conversation.title = title;
            
            // 更新UI中的对话标题 - 使用更可靠的方式定位元素
            const conversationItems = elements.conversationsList.querySelectorAll('.conversation-item');
            let updated = false;
            
            // 遍历所有对话项
            for (const item of conversationItems) {
                // 为了调试，打印各个元素
                console.log('检查对话项:', item);
                
                // 当前激活的对话项会有active类
                if (item.classList.contains('active')) {
                    const titleDiv = item.querySelector('.conversation-title');
                    if (titleDiv) {
                        console.log('找到活动对话标题元素，更新前:', titleDiv.textContent);
                        titleDiv.textContent = title;
                        console.log('标题已更新为:', title);
                        updated = true;
                        break;
                    }
                }
            }
            
            if (!updated) {
                console.log('未找到匹配的对话项，尝试直接匹配ID');
                // 如果未找到匹配项，尝试通过ID精确匹配
                for (let i = 0; i < state.conversations.length; i++) {
                    if (state.conversations[i].id === conversationId) {
                        const allItems = elements.conversationsList.querySelectorAll('.conversation-item');
                        if (i < allItems.length) {
                            const titleDiv = allItems[i].querySelector('.conversation-title');
                            if (titleDiv) {
                                titleDiv.textContent = title;
                                console.log('通过索引位置找到并更新标题');
                                updated = true;
                                break;
                            }
                        }
                    }
                }
            }
            
            // 如果还是没有更新成功，则重新渲染整个对话列表
            if (!updated) {
                console.log('无法定位特定元素，重新渲染整个对话列表');
                updateConversationsList();
            }

            // 新增：如果当前正在查看的对话就是此对话，则更新聊天主界面标题
            if (elements.conversationTitle && state.currentConversationId === conversationId) {
                console.log('更新聊天主界面标题:', title);
                elements.conversationTitle.textContent = title;
            }
            
            // 直接发送请求更新对话标题到服务器（使用现有接口）
            fetch(`/conversations/${conversationId}/update_title`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({ title: title })
            })
            .then(response => {
                if (!response.ok) {
                    console.error('更新对话标题失败:', response.status);
                }
            })
            .catch(error => {
                console.error('更新对话标题请求失败:', error);
            });
        } else {
            console.error('找不到对话:', conversationId);
        }
    }

    // 异步获取对话标题
    async function fetchConversationTitle(conversationId) {
        try {
            // 再次检查对话标题是否已更改（防止重复请求）
            const conversation = state.conversations.find(conv => conv.id === conversationId);
            if (!conversation || conversation.title !== '新对话') {
                console.log('对话标题已不是"新对话"，跳过获取标题');
                return;
            }
            
            console.log('对话标题是"新对话"，尝试获取新标题');
            const response = await fetch(`/name_conversation/${conversationId}`);
            if (response.ok) {
                const title = await response.text();
                if (title && title !== '新对话') {
                    // 更新对话标题
                    updateConversationTitle(conversationId, title);
                    console.log('已更新对话标题:', title);
                } else {
                    console.log('获取到的标题为空或仍为"新对话"，保持原标题不变');
                }
            }
        } catch (error) {
            console.error('获取对话标题失败:', error);
        }
    }

    // 更新侧边栏中的活动对话项
    function updateActiveConversationInSidebar(conversationId) {
        console.log(`尝试更新活动对话项: ${conversationId}`);
        
        // 移除所有项目的active类
        const allItems = document.querySelectorAll('.conversation-item');
        allItems.forEach(item => {
            item.classList.remove('active');
        });
        
        if (!conversationId) {
            console.log('无活动对话，已清除所有active类');
            return;
        }
        
        let activeItemFound = false;
        
        // 方法1: 尝试通过data-id属性查找
        const itemWithDataId = document.querySelector(`.conversation-item[data-id="${conversationId}"]`);
        if (itemWithDataId) {
            itemWithDataId.classList.add('active');
            activeItemFound = true;
            console.log('通过data-id找到活动对话项');
        } else {
            // 方法2: 尝试通过onclick函数内容查找
            allItems.forEach(item => {
                const contentDiv = item.querySelector('.conversation-content');
                if (contentDiv && contentDiv.onclick && contentDiv.onclick.toString().includes(conversationId)) {
                    item.classList.add('active');
                    activeItemFound = true;
                    console.log('通过onclick内容找到活动对话项');
                }
            });
            
            // 方法3: 如果还未找到，通过索引位置匹配
            if (!activeItemFound && state.conversations && state.conversations.length > 0) {
                const convIndex = state.conversations.findIndex(conv => conv.id === conversationId);
                if (convIndex !== -1 && convIndex < allItems.length) {
                    allItems[convIndex].classList.add('active');
                    activeItemFound = true;
                    console.log('通过索引位置找到活动对话项', convIndex);
                }
            }
        }
        
        if (!activeItemFound) {
            console.warn(`未找到匹配的对话项: ${conversationId}`);
            // 如果未找到对话项，可能需要重新加载对话列表
            if (state.conversations && state.conversations.some(conv => conv.id === conversationId)) {
                console.log('对话存在于state中，但未在DOM中找到，尝试重新加载对话列表');
                setTimeout(() => {
                    updateConversationsList();
                    // 再次尝试更新活动状态
                    setTimeout(() => {
                        const retryItem = document.querySelector(`.conversation-item[data-id="${conversationId}"]`);
                        if (retryItem) {
                            retryItem.classList.add('active');
                            console.log('重试成功，已更新活动状态');
                        }
                    }, 100);
                }, 100);
            }
        }
    }

    // 新增：检查并续流活跃响应
    async function checkActiveResponses() {
        try {
            const resp = await fetch('/api/chat/active_responses');
            if (!resp.ok) return;
            const active = await resp.json();
            const pending = JSON.parse(localStorage.getItem('pending_ai_messages') || '[]');
            const newPending = [];
            for (const item of pending) {
                const { messageData } = item;
                const mid = messageData.message_id;
                const convId = messageData.conversation_id;
                if (active[mid]) {
                    // 活跃响应：续流处理
                    if (state.currentConversationId !== convId) {
                        await loadConversationHistory(convId);
                    }
                    createLoadingMessage(mid, messageData.model);
                    await getAIResponse(messageData, convId, mid);
                    // 不保留在 pending 中
                } else {
                    // 已完成或不活跃的请求：刷新历史以显示完整回复
                    if (state.currentConversationId === convId) {
                        console.log('检查到已完成的AI请求，刷新历史记录:', mid);
                        await loadConversationHistory(convId);
                    }
                    // 不保留在 pending 中
                }
            }
            // 清空所有已处理的 pending
            localStorage.setItem('pending_ai_messages', JSON.stringify(newPending));
        } catch (e) {
            console.error('续流失败:', e);
        }
    }

    // 初始化页面
    document.addEventListener('DOMContentLoaded', init);

    // 全局复制按钮添加函数，可以从控制台调用
    window.addCopyButtonsToAllCodeBlocks = function () {
        const allContainers = document.querySelectorAll('.message-content');        
        allContainers.forEach((container, index) => {
            addCopyButtonsToCodeBlocks(container);
        });
        
        console.log('复制按钮添加完成');
    };

    // 在页面完全加载后运行复制按钮添加
    window.addEventListener('load', function () {
        setTimeout(window.addCopyButtonsToAllCodeBlocks, 500);
    });

    // 加载侧边栏状态
    function loadSidebarState() {
        try {
            // 从本地存储读取状态
            const savedState = localStorage.getItem('sidebarState');
            state.isSidebarCollapsed = savedState === 'true';
            
            if (state.isSidebarCollapsed) {
                elements.sidebar.classList.add('collapsed');
                elements.sidebarToggle.classList.add('collapsed');
            } else {
                elements.sidebar.classList.remove('collapsed');
                elements.sidebarToggle.classList.remove('collapsed');
            }
            
            // 新增：桌面端初始加载时调整模型选择位置
            if (window.innerWidth > 768) {
                const modelSelectEl = document.querySelector('.model-select');
                if (modelSelectEl) {
                    modelSelectEl.style.removeProperty('left');
                    if (state.isSidebarCollapsed) {
                        const computedLeft = window.getComputedStyle(modelSelectEl).left;
                        const leftValue = parseFloat(computedLeft) || 0;
                        modelSelectEl.style.left = (leftValue + 45) + 'px';
                    }
                }
            }
        } catch (error) {
            console.error('加载侧边栏状态时出错:', error);
            // 默认保持现有状态或使用默认状态
        }
    }

    // ====================== 用户资料模态窗口 ======================
    function setupUserProfileModal() {
        // 当用户资料模态框打开时，获取会员信息和积分信息
        const userProfileModal = document.getElementById('user-profile-modal');
        if (userProfileModal) {
            userProfileModal.addEventListener('show', () => {
                fetchUserMembershipInfo();
                fetchUserPointsInfo();
            });
            
            // 设置VIP码兑换按钮事件
            const vipRedeemBtn = document.getElementById('vip-redeem-btn');
            const vipCodeInput = document.getElementById('vip-code-input');
            const vipRedeemResult = document.getElementById('vip-redeem-result');
            
            if (vipRedeemBtn && vipCodeInput && vipRedeemResult) {
                vipRedeemBtn.addEventListener('click', async () => {
                    // 调用统一的兑换码处理函数
                    redeemVIPCode();
                });
                
                // 支持回车键提交
                vipCodeInput.addEventListener('keypress', (e) => {
                    if (e.key === 'Enter') {
                        vipRedeemBtn.click();
                    }
                });
            }
            
            // 设置充值码兑换按钮事件
            const pointsRedeemBtn = document.getElementById('points-redeem-btn');
            const pointsCodeInput = document.getElementById('points-code-input');
            const pointsRedeemResult = document.getElementById('points-redeem-result');
            
            if (pointsRedeemBtn && pointsCodeInput && pointsRedeemResult) {
                pointsRedeemBtn.addEventListener('click', async () => {
                    // 调用统一的积分充值码处理函数
                    redeempointsCode();
                });
                
                // 支持回车键提交
                pointsCodeInput.addEventListener('keypress', (e) => {
                    if (e.key === 'Enter') {
                        pointsRedeemBtn.click();
                    }
                });
            }
        }
    }

    function openUserProfileModal() {
        const userProfileModal = document.getElementById('user-profile-modal');
        if (!userProfileModal) return;

        userProfileModal.classList.add('show');
        
        // 主动触发show事件，以便获取用户信息
        const showEvent = new Event('show');
        userProfileModal.dispatchEvent(showEvent);
    }

    function closeUserProfileModal() {
        const userProfileModal = document.getElementById('user-profile-modal');
        if (!userProfileModal) return;
        userProfileModal.classList.remove('show');
    }

    function openPasswordModal() {
        const passwordModal = document.getElementById('password-modal');
        if (!passwordModal) return;

        // 清空表单
        document.getElementById('current-password').value = '';
        document.getElementById('new-password').value = '';
        document.getElementById('confirm-password').value = '';

        // 显示密码修改弹窗
        passwordModal.classList.add('show');
    }

    function closePasswordModal() {
        const passwordModal = document.getElementById('password-modal');
        if (!passwordModal) return;

        passwordModal.classList.remove('show');
    }

    async function fetchUserMembershipInfo() {
        if (!state.currentUser || !state.currentUser.id) {
            console.error('获取会员信息失败：用户未登录');
            return {
                is_member: false,
                level: 'normal',
                expired: true,
                expiration_date: null,
                days_left: 0
            };
        }
        
        try {
            const response = await fetch(`/vip/get_vip_level/${state.currentUser.id}`);
            const data = await response.json();
            console.log('获取到的会员信息详情:', data);
            
            if (data.success) {
                // 保存会员级别到状态
                state.currentUser.member_level = data.level;
                
                const memberInfo = {
                    is_member: data.is_member,
                    level: data.level || 'normal',
                    level_display: data.level_display,
                    expired: data.expired,
                    member_since: data.member_since,
                    member_until: data.member_until,
                    days_left: data.days_left || 0,
                    privileges: data.privileges // 确保将权益信息传递给updateMembershipUI
                };
                
                console.log('处理后的会员信息:', memberInfo);
                
                // 更新会员信息显示
                updateMembershipUI(memberInfo);
                
                return memberInfo;
            } else {
                console.error('获取会员信息失败:', data.message);
                
                // 显示错误信息
                const membershipInfo = document.getElementById('membership-info');
                if (membershipInfo) {
                    membershipInfo.innerHTML = '<div class="error-message">获取会员信息失败</div>';
                }
                
                const membershipPrivileges = document.getElementById('membership-privileges');
                if (membershipPrivileges) {
                    membershipPrivileges.innerHTML = '<div class="error-message">无法获取权益信息</div>';
                }
                
                return {
                    is_member: false,
                    level: 'normal',
                    expired: true,
                    expiration_date: null,
                    days_left: 0
                };
            }
        } catch (error) {
            console.error('获取会员信息时出错:', error);
            
            // 显示错误信息
            const membershipInfo = document.getElementById('membership-info');
            if (membershipInfo) {
                membershipInfo.innerHTML = '<div class="error-message">获取会员信息失败</div>';
            }
            
            const membershipPrivileges = document.getElementById('membership-privileges');
            if (membershipPrivileges) {
                membershipPrivileges.innerHTML = '<div class="error-message">无法获取权益信息</div>';
            }
            
            return {
                is_member: false,
                level: 'normal',
                expired: true,
                expiration_date: null,
                days_left: 0
            };
        }
    }

    function setupUserProfileModal() {
        // 当用户资料模态框打开时，获取会员信息和积分信息
        const userProfileModal = document.getElementById('user-profile-modal');
        if (userProfileModal) {
            userProfileModal.addEventListener('show', () => {
                fetchUserMembershipInfo();
                fetchUserPointsInfo();
            });
            
            // 设置VIP码兑换按钮事件
            const vipRedeemBtn = document.getElementById('vip-redeem-btn');
            const vipCodeInput = document.getElementById('vip-code-input');
            const vipRedeemResult = document.getElementById('vip-redeem-result');
            
            if (vipRedeemBtn && vipCodeInput && vipRedeemResult) {
                vipRedeemBtn.addEventListener('click', async () => {
                    // 调用统一的兑换码处理函数
                    redeemVIPCode();
                });
                
                // 支持回车键提交
                vipCodeInput.addEventListener('keypress', (e) => {
                    if (e.key === 'Enter') {
                        vipRedeemBtn.click();
                    }
                });
            }
            
            // 设置充值码兑换按钮事件
            const pointsRedeemBtn = document.getElementById('points-redeem-btn');
            const pointsCodeInput = document.getElementById('points-code-input');
            const pointsRedeemResult = document.getElementById('points-redeem-result');
            
            if (pointsRedeemBtn && pointsCodeInput && pointsRedeemResult) {
                pointsRedeemBtn.addEventListener('click', async () => {
                    // 调用统一的积分充值码处理函数
                    redeempointsCode();
                });
                
                // 支持回车键提交
                pointsCodeInput.addEventListener('keypress', (e) => {
                    if (e.key === 'Enter') {
                        pointsRedeemBtn.click();
                    }
                });
            }
        }
    }

    function openUserProfileModal() {
        const userProfileModal = document.getElementById('user-profile-modal');
        if (!userProfileModal) return;

        userProfileModal.classList.add('show');
        
        // 主动触发show事件，以便获取用户信息
        const showEvent = new Event('show');
        userProfileModal.dispatchEvent(showEvent);
    }

    function closeUserProfileModal() {
        const userProfileModal = document.getElementById('user-profile-modal');
        if (!userProfileModal) return;
        userProfileModal.classList.remove('show');
    }

    async function updateUsername() {
        const usernameInput = document.getElementById('username-input');
        const saveBtn = document.getElementById('save-username-btn');
        const errorSpan = document.getElementById('username-error');

        if (!usernameInput || !saveBtn) return;

        const newUsername = usernameInput.value.trim();

        // 验证用户名
        if (!newUsername) {
            if (errorSpan) errorSpan.textContent = '用户名不能为空';
            return;
        }

        if (newUsername.length < 2 || newUsername.length > 20) {
            if (errorSpan) errorSpan.textContent = '用户名长度必须在2-20个字符之间';
            return;
        }

        try {
            saveBtn.disabled = true;
            saveBtn.textContent = '保存中...';

            const response = await fetch('/auth/api/user/update_username', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ username: newUsername })
            });

            const data = await response.json();

            if (response.ok) {
                // 更新成功
                const userNameDisplay = document.getElementById('user-name-display');
                if (userNameDisplay) userNameDisplay.textContent = newUsername;

                // 更新全局状态
                state.currentUser.username = newUsername;

                // 关闭编辑模式
                toggleUsernameEdit(false);

                // 显示成功消息
                showNotification('用户名已更新', 3000);
            } else {
                // 显示错误信息
                if (errorSpan) errorSpan.textContent = data.message || '更新用户名失败';
            }
        } catch (error) {
            console.error('更新用户名时出错:', error);
            if (errorSpan) errorSpan.textContent = '更新用户名时发生错误';
        } finally {
            saveBtn.disabled = false;
            saveBtn.textContent = '保存';
        }
    }

    // 切换用户名编辑模式
    function toggleUsernameEdit() {
        const displayEl = document.querySelector('.username-display');
        const editEl = document.querySelector('.username-edit');
        const usernameInput = document.getElementById('username-input');
        const currentUsername = document.getElementById('profile-username').textContent.trim();

        if (displayEl && editEl && usernameInput) {
            displayEl.style.display = 'none';
            editEl.style.display = 'flex';
            usernameInput.value = currentUsername;
            usernameInput.focus();
        }
    }

    // 取消用户名编辑
    function cancelUsernameEdit() {
        const displayEl = document.querySelector('.username-display');
        const editEl = document.querySelector('.username-edit');

        if (displayEl && editEl) {
            displayEl.style.display = 'flex';
            editEl.style.display = 'none';
        }
    }

    // 更新密码
    async function updatePassword() {
        const currentPassword = document.getElementById('current-password').value;
        const newPassword = document.getElementById('new-password').value;
        const confirmPassword = document.getElementById('confirm-password').value;
        const saveBtn = document.getElementById('save-password-btn');

        // 基本验证
        if (!currentPassword || !newPassword || !confirmPassword) {
            showNotification('所有密码字段都不能为空', 3000);
            return;
        }

        if (newPassword !== confirmPassword) {
            showNotification('新密码与确认密码不匹配', 3000);
            return;
        }

        if (newPassword.length < 6) {
            showNotification('新密码长度不能少于6个字符', 3000);
            return;
        }

        try {
            saveBtn.disabled = true;
            saveBtn.textContent = '保存中...';

            const response = await fetch('/auth/api/user/update_password', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    current_password: currentPassword,
                    new_password: newPassword,
                    confirm_password: confirmPassword
                })
            });

            const data = await response.json();

            if (response.ok) {
                // 更新成功
                showNotification('密码已成功更新', 3000);
                // 关闭密码弹窗
                closePasswordModal();
            } else {
                // 显示错误信息
                showNotification(data.message || '密码更新失败', 3000);
            }
        } catch (error) {
            console.error('更新密码时出错:', error);
            showNotification('更新密码时发生错误', 3000);
        } finally {
            saveBtn.disabled = false;
            saveBtn.textContent = '保存';
        }
    }

    /**
     * 将对话标题转换为可编辑的输入框
     * @param {string} conversationId - 对话ID
     * @param {HTMLElement} titleElement - 标题元素
     */
    function makeConversationTitleEditable(conversationId, titleElement) {
        // 获取当前标题
        const currentTitle = titleElement.textContent;
        // 保存原始标题内容和样式
        const originalTitle = currentTitle;
        const originalDisplay = titleElement.style.display;
        
        // 创建输入框
        const inputElement = document.createElement('input');
        inputElement.type = 'text';
        inputElement.value = originalTitle;
        inputElement.className = 'conversation-title-edit';
        
        // 隐藏原标题元素
        titleElement.style.display = 'none';
        // 将输入框插入到标题元素后面
        titleElement.parentNode.insertBefore(inputElement, titleElement.nextSibling);
        // 自动聚焦输入框
        inputElement.focus();
        
        // 处理回车键提交
        inputElement.addEventListener('keydown', function (e) {
            if (e.key === 'Enter') {
                submitTitleEdit();
            } else if (e.key === 'Escape') {
                cancelTitleEdit();
            }
        });
        
        // 处理失去焦点时提交
        inputElement.addEventListener('blur', function () {
            submitTitleEdit();
        });
        
        // 提交编辑
        function submitTitleEdit() {
            const newTitle = inputElement.value.trim();
            if (newTitle && newTitle !== originalTitle) {
                // 更新UI
                titleElement.textContent = newTitle;
                
                // 发送API请求更新标题
                fetch(`/conversations/${conversationId}/update_title`, {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                    },
                    body: JSON.stringify({
                        conversation_id: conversationId,
                        title: newTitle
                    })
                })
                .then(response => response.json())
                .then(data => {
                    if (data.success) {
                        console.log('对话重命名成功:', newTitle);
                    } else {
                        console.error('对话重命名失败:', data.message);
                        // 重置为原始标题
                        titleElement.textContent = originalTitle;
                    }
                })
                .catch(error => {
                    console.error('对话重命名请求错误:', error);
                    // 重置为原始标题
                    titleElement.textContent = originalTitle;
                });
            } else if (!newTitle) {
                // 如果标题为空，恢复原标题
                titleElement.textContent = originalTitle;
            }
            
            // 恢复原标题元素显示
            titleElement.style.display = originalDisplay;
            // 移除输入框
            if (inputElement.parentNode) {
                inputElement.parentNode.removeChild(inputElement);
            }
        }
        
        // 取消编辑
        function cancelTitleEdit() {
            // 恢复原标题元素显示
            titleElement.style.display = originalDisplay;
            // 移除输入框
            if (inputElement.parentNode) {
                inputElement.parentNode.removeChild(inputElement);
            }
        }
    }

    // 更新会员信息UI
    function updateMembershipUI(memberInfo) {
        const membershipInfoElement = document.getElementById('membership-info');
        
        if (!membershipInfoElement) {
            console.error('找不到membership-info元素');
            return;
        }
        
        // 会员级别中文名称
        const levelDisplayMap = {
            'free': '普通用户',
            'vip': 'VIP会员',
            'svip': 'SVIP会员'
        };
        
        // 格式化日期函数，处理ISO 8601格式
        const formatDate = (dateStr) => {
            if (!dateStr) return '未知';
            try {
                const date = new Date(dateStr);
                return isNaN(date.getTime()) ? '未知' : date.toLocaleDateString('zh-CN');
            } catch (e) {
                console.error('日期解析错误:', e, dateStr);
                return '未知';
            }
        };
        
        console.log('会员信息:', memberInfo);
        
        // 构建会员信息HTML
        let membershipHTML = '';
        
        if (memberInfo.is_member && !memberInfo.expired) {
            // 会员有效
            membershipHTML = `
                <div class="membership-card ${memberInfo.level}">
                    <div class="membership-header">
                        <div class="membership-level">${memberInfo.level_display || levelDisplayMap[memberInfo.level] || memberInfo.level}</div>
                        <div class="membership-status">有效</div>
                    </div>
                    <div class="membership-days">剩余 ${memberInfo.days_left} 天</div>
                </div>
            `;
            
            // 只有在有日期信息时才显示日期部分
            if (memberInfo.member_since || memberInfo.member_until) {
                const start = formatDate(memberInfo.member_since).replace(/\//g, '/');
                const end = formatDate(memberInfo.member_until).replace(/\//g, '/');
                membershipHTML = membershipHTML.replace('</div>', `
                    <div class="membership-dates">
                        ${start}-${end}
                    </div>
                </div>`);
            }
        } else if (memberInfo.is_member && memberInfo.expired) {
            // 会员已过期
            membershipHTML = `
                <div class="membership-card ${memberInfo.level}">
                    <div class="membership-header">
                        <div class="membership-level">${memberInfo.level_display || levelDisplayMap[memberInfo.level] || memberInfo.level}</div>
                        <div class="membership-status">已过期</div>
                    </div>
                </div>
            `;
            
            // 只有在有日期信息时才显示日期部分
            if (memberInfo.member_since || memberInfo.member_until) {
                const start = formatDate(memberInfo.member_since).replace(/\//g, '/');
                const end = formatDate(memberInfo.member_until).replace(/\//g, '/');
                membershipHTML = membershipHTML.replace('</div>', `
                    <div class="membership-dates">
                        ${start}-${end}
                    </div>
                </div>`);
            }
        } else {
            // 非会员
            membershipHTML = `
                <div class="membership-card free">
                    <div class="membership-header">
                        <div class="membership-level">${levelDisplayMap['free']}</div>
                    </div>
                    <div class="membership-days">可使用兑换码升级为VIP</div>
                </div>
            `;
        }
        
        // 更新会员信息显示
        membershipInfoElement.innerHTML = membershipHTML;
        
        // 更新会员权益显示
        const membershipPrivilegesElement = document.getElementById('membership-privileges');
        if (membershipPrivilegesElement) {
            console.log('会员权益信息:', memberInfo.privileges);
            
            if (memberInfo.privileges && Array.isArray(memberInfo.privileges) && memberInfo.privileges.length > 0) {
            let privilegesHTML = '<div class="privilege-list">';
            
            memberInfo.privileges.forEach(privilege => {
                privilegesHTML += `
                    <div class="privilege-item">
                        <div class="privilege-icon">
                            <i class="bi ${privilege.icon || 'bi-check-circle'}"></i>
                        </div>
                            <div class="privilege-name">${privilege.name || ''}</div>
                            <div class="privilege-description">${privilege.description || ''}</div>
                    </div>
                `;
            });
            
            privilegesHTML += '</div>';            
                membershipPrivilegesElement.innerHTML = privilegesHTML;
            } else {
                membershipPrivilegesElement.innerHTML = '<div class="no-privileges">无可用权益</div>';
                console.warn('没有会员权益数据或数据格式不正确', memberInfo);
            }
        } else {
            console.error('找不到membership-privileges元素');
        }
    }

    // 显示确认对话框
    function showConfirmDialog(message, confirmCallback) {
        console.log('显示确认对话框', message);
        
        // 移除可能存在的旧对话框
        const existingModal = document.getElementById('customConfirmDialog');
        if (existingModal) {
            document.body.removeChild(existingModal);
        }
        
        // 创建模态对话框
        const modalHTML = `
        <div id="customConfirmDialog" class="confirm-dialog" tabindex="-1" aria-labelledby="customConfirmDialogLabel" aria-modal="true" role="dialog">
            <div class="confirm-dialog__content">
                <div class="confirm-dialog__header">
                    <h5 id="customConfirmDialogLabel">确认操作</h5>
                    </div>
                <div class="confirm-dialog__body">
                        ${message}
                    </div>
                <div class="confirm-dialog__footer">
                    <button type="button" class="confirm-dialog__btn confirm-dialog__btn--cancel" id="customConfirmDialogCancelBtn">取消</button>
                    <button type="button" class="confirm-dialog__btn confirm-dialog__btn--confirm" id="customConfirmDialogConfirmBtn">确认</button>
                </div>
            </div>
        </div>
        `;
        
        // 添加到文档
        const modalContainer = document.createElement('div');
        modalContainer.innerHTML = modalHTML;
        document.body.appendChild(modalContainer.firstElementChild);
        
        // 获取对话框元素
        const modalElement = document.getElementById('customConfirmDialog');
        const confirmBtn = document.getElementById('customConfirmDialogConfirmBtn');
        
        // 设置显示样式
        // modalElement.style.display = 'flex';
        // modalElement.style.backgroundColor = 'rgba(0, 0, 0, 0.5)';
        // modalElement.style.zIndex = '9999';
        
        // 添加show类
        modalElement.classList.add('show');
        
        // 点击确认按钮执行回调
        confirmBtn.addEventListener('click', function () {
            console.log('点击确认按钮');
            closeModal();
            if (typeof confirmCallback === 'function') {
                confirmCallback();
            }
        });
        
        // 点击关闭按钮关闭对话框
        const closeBtn = modalElement.querySelector('.confirm-dialog__close');
        if (closeBtn) {
            closeBtn.addEventListener('click', closeModal);
        }
        
        // 点击取消按钮关闭对话框
        const cancelBtn = document.getElementById('customConfirmDialogCancelBtn');
        if (cancelBtn) {
            cancelBtn.addEventListener('click', closeModal);
        }
        
        // 点击模态框外部关闭对话框
        modalElement.addEventListener('click', function (event) {
            if (event.target === modalElement) {
                console.log('点击模态框外部');
                closeModal();
            }
        });
        
        // 关闭模态框的辅助函数
        function closeModal() {
            console.log('关闭模态框');
            modalElement.classList.remove('show');
                modalElement.style.display = 'none';
                setTimeout(() => {
                    if (modalElement.parentNode === document.body) {
                        document.body.removeChild(modalElement);
                    }
                }, 300);
        }
    }

    // 显示通知消息
    function showToast(message, type = 'info') {
        // 检查是否已存在toast容器
        let toastContainer = document.getElementById('toast-container');
        
        if (!toastContainer) {
            toastContainer = document.createElement('div');
            toastContainer.id = 'toast-container';
            toastContainer.style.position = 'fixed';
            toastContainer.style.bottom = '20px';
            toastContainer.style.right = '20px';
            toastContainer.style.zIndex = '1050';
            document.body.appendChild(toastContainer);
        }
        
        // 创建新的toast
        const toastId = 'toast-' + Date.now();
        const toast = document.createElement('div');
        toast.id = toastId;
        toast.style.backgroundColor = type === 'success' ? '#4caf50' : 
                                     type === 'warning' ? '#ff9800' : 
                                     type === 'danger' ? '#f44336' : '#2196f3';
        toast.style.color = '#fff';
        toast.style.padding = '12px 20px';
        toast.style.marginBottom = '10px';
        toast.style.borderRadius = '4px';
        toast.style.boxShadow = '0 2px 5px rgba(0,0,0,0.2)';
        toast.style.display = 'flex';
        toast.style.justifyContent = 'space-between';
        toast.style.alignItems = 'center';
        toast.style.minWidth = '250px';
        toast.style.maxWidth = '400px';
        toast.style.animation = 'fadeIn 0.3s, fadeOut 0.5s 2.5s forwards';
        
        // 添加消息内容
        const messageSpan = document.createElement('span');
        messageSpan.textContent = message;
        toast.appendChild(messageSpan);
        
        // 添加关闭按钮
        const closeButton = document.createElement('button');
        closeButton.textContent = '×';
        closeButton.style.background = 'none';
        closeButton.style.border = 'none';
        closeButton.style.color = '#fff';
        closeButton.style.fontSize = '20px';
        closeButton.style.fontWeight = 'bold';
        closeButton.style.cursor = 'pointer';
        closeButton.style.marginLeft = '10px';
        closeButton.onclick = () => {
            toastContainer.removeChild(toast);
        };
        toast.appendChild(closeButton);
        
        // 添加到容器
        toastContainer.appendChild(toast);
        
        // 添加动画样式
        const styleEl = document.createElement('style');
        styleEl.textContent = `
            @keyframes fadeIn {
                from { opacity: 0; transform: translateY(20px); }
                to { opacity: 1; transform: translateY(0); }
            }
            @keyframes fadeOut {
                from { opacity: 1; transform: translateY(0); }
                to { opacity: 0; transform: translateY(-20px); }
            }
        `;
        document.head.appendChild(styleEl);
        
        // 自动移除
        setTimeout(() => {
            if (toast.parentNode === toastContainer) {
                toastContainer.removeChild(toast);
            }
        }, 3000);
    }

    // 在初始化页面时调用
    document.addEventListener('DOMContentLoaded', function () {
        // 初始化VIP兑换码处理
        setupVipCodeHandlers();
        
        // 初始化用户表单按钮事件
        setupUserFormButtonEvents();
        
        // ... existing code ...
    });

    // 用户名修改和密码修改按钮的事件处理
    function setupUserFormButtonEvents() {
        // 编辑用户名按钮
        document.querySelector('.edit-username-btn')?.addEventListener('click', toggleUsernameEdit);
        
        // 保存用户名按钮
        document.getElementById('save-username-btn')?.addEventListener('click', updateUsername);
        
        // 取消编辑用户名按钮
        document.getElementById('cancel-username-btn')?.addEventListener('click', cancelUsernameEdit);
        
        // 修改密码按钮
        document.getElementById('change-password-btn')?.addEventListener('click', openPasswordModal);
        
        // 保存新密码按钮
        document.getElementById('save-password-btn')?.addEventListener('click', updatePassword);
        
        // 取消修改密码按钮
        document.getElementById('cancel-password-btn')?.addEventListener('click', closePasswordModal);
        
        // 关闭密码弹窗按钮
        document.querySelector('.close-password-modal')?.addEventListener('click', closePasswordModal);

        // VIP兑换码按钮
        document.getElementById('vip-redeem-btn')?.addEventListener('click', redeemVIPCode);
        
        // 积分充值按钮
        document.getElementById('points-redeem-btn')?.addEventListener('click', redeempointsCode);
        
        // 注销账号按钮
        elements.deactivateAccountBtn?.addEventListener('click', openDeactivateModal);
        
        // 关闭注销弹窗按钮
        elements.closeDeactivateModalBtn?.addEventListener('click', closeDeactivateModal);
        
        // 取消注销按钮
        elements.cancelDeactivateBtn?.addEventListener('click', closeDeactivateModal);
        
        // 确认注销按钮
        elements.confirmDeactivateBtn?.addEventListener('click', deactivateAccount);
    }

    // 获取用户积分信息函数
    async function fetchUserPointsInfo() {
        if (!state.currentUser || !state.currentUser.id) {
            console.error('获取积分信息失败：用户未登录');
            return {
                success: false,
                points: 0,
                formatted_points: "0"
            };
        }
        
        try {
            const response = await fetch(`/points/get_points/${state.currentUser.id}`);
            
            if (!response.ok) {
                throw new Error('获取积分信息失败');
            }
            
            const pointsData = await response.json();
            
            if (pointsData.success) {
                // 更新积分显示
                const pointsDisplay = document.getElementById('points-display');
                if (pointsDisplay) {
                    pointsDisplay.innerHTML = `
                        <div class="points-card">
                            <div class="points-header">
                                <span>我的积分</span>
                            </div>
                            <div class="points-amount">${pointsData.formatted_points}</div>
                        </div>
                    `;
                }
                
                // 如果积分不足，禁用发送按钮
                if (pointsData.points <= 0) {
                    const sendButton = document.getElementById('send-button');
                    if (sendButton) {
                        sendButton.disabled = true;
                    }
                    
                    // 积分不足时不弹提示，提示仅在发送时显示
                } else {
                    // 确保发送按钮启用
                    const sendButton = document.getElementById('send-button');
                    if (sendButton) {
                        sendButton.disabled = false;
                        sendButton.title = '';
                    }
                }
                
                return pointsData;
            } else {
                throw new Error(pointsData.message || '获取积分信息失败');
            }
            
        } catch (error) {
            console.error('获取积分信息时出错:', error);
            
            // 显示错误信息
            const pointsDisplay = document.getElementById('points-display');
            if (pointsDisplay) {
                pointsDisplay.innerHTML = '<div class="error-message">获取积分信息失败</div>';
            }
            
            return {
                success: false,
                points: 0,
                formatted_points: "0"
            };
        }
    }

    // 签到
    function signInit() {
        // 初始化签到按钮
        fetch(`/auth/sign_log`)
            .then((response) => {
                if (!response.ok) {
                    throw new Error('初始化签到按钮失败');
                }
                return response.json();
            })
            .then((data) => {
                if (data.success) {
                    elements.signBtn.innerText = `今天已经签到过啦`;
                    elements.signBtn.disabled = true;
                }
            })
            .catch ((error) => console.log('初始化签到按钮失败:'+error));
    }

    function sign() {
        fetch(`/auth/sign`)
            .then((response) => {
                if (!response.ok) {
                    throw new Error('签到失败');
                };
                return response.json();
            })
            .then((data) => {
                if (data.success) {
                    elements.signBtn.innerText = `今天已经签到过啦`;
                    elements.signBtn.disabled = true;
                    fetchUserPointsInfo();
                    console.log('签到成功');
                    const points = data.points;
                    showNotification('签到成功，恭喜获得'+points+`积分~`);
                } else {
                    if (elements.signBtn.innerText = `签到` || elements.signBtn.disabled == false) {
                        elements.signBtn.innerText = `今天已经签到过啦`;
                        elements.signBtn.disabled = true;
                    }
                    showNotification('今天已经签到过啦');
                }
            })
            .catch((error) => {
                console.log('签到失败:'+error);
                if (elements.signBtn.innerText = `签到` || elements.signBtn.disabled == false) {
                    elements.signBtn.innerText = `今天已经签到过啦`;
                    elements.signBtn.disabled = true;
                }
                showNotification('签到失败');
            });
        
    }
    
    // 在发送消息前检查积分
    async function checkPointsBeforeSend() {
        if (!state.currentUser || !state.currentUser.id) {
            return true; // 匿名用户不检查积分
        }
        
        try {
            // 获取当前选择的模型
            const currentModel = getSelectedModel();
            
            const reducePoints = {
                "DeepSeek-R1": 10,
                "DeepSeek-V3": 5,
                "Doubao-1.5-Lite": 10, 
                "Doubao-1.5-Pro": 10,
                "Doubao-1.5-Pro-256k": 10,
                "Doubao-1.5-vision-Pro": 10,
                "Doubao-1.5-Thinking-Pro": 10,
                "Doubao-1.5-Thinking-vision-Pro": 10,
                "Gemini-2.5-Flash": 5,
                "Gemini-2.0-Flash": 5,
                "Qwen3": 2,
                "QwQ": 2,
                "QwQ-Preview": 1,
                "QvQ": 1,
                "Qwen2.5-Instruct": 1,
                "GLM-4": 2,
                "GLM-Z1": 5
            };
            const pointsData = await fetchUserPointsInfo();
            if (!pointsData.success || pointsData.points < reducePoints[currentModel]) {
                showNotification('您的积分不足，请充值或签到后继续使用');
                return false;
            }
            return true;
        } catch (error) {
            console.error('检查积分时出错:', error);
            return true; // 出错时允许发送，后端会再次检查
        }
    }
    
    // ========= 注销账号相关函数 =========
    // 打开注销确认弹窗
    function openDeactivateModal() {
        if (elements.deactivateModal) {
            elements.deactivateModal.classList.add('show');
            startDeactivateCountdown();
        }
    }
    
    // 关闭注销确认弹窗
    function closeDeactivateModal() {
        if (elements.deactivateModal) {
            elements.deactivateModal.classList.remove('show');
            // 停止倒计时
            if (window.deactivateCountdown) {
                clearInterval(window.deactivateCountdown);
                window.deactivateCountdown = null;
            }
            // 重置按钮状态
            if (elements.confirmDeactivateBtn) {
                elements.confirmDeactivateBtn.disabled = true;
                elements.countdownTimer.textContent = '5';
            }
        }
    }
    
    // 开始倒计时
    function startDeactivateCountdown() {
        // 确保按钮开始是禁用的
        if (elements.confirmDeactivateBtn) {
            elements.confirmDeactivateBtn.disabled = true;
        }
        
        // 初始化倒计时
        let countdown = 5;
        if (elements.countdownTimer) {
            elements.countdownTimer.textContent = countdown;
        }
        
        // 清除可能存在的之前的倒计时
        if (window.deactivateCountdown) {
            clearInterval(window.deactivateCountdown);
        }
        
        // 设置新的倒计时
        window.deactivateCountdown = setInterval(() => {
            countdown--;
            if (elements.countdownTimer) {
                elements.countdownTimer.textContent = countdown;
            }
            
            // 倒计时结束，启用按钮
            if (countdown <= 0) {
                clearInterval(window.deactivateCountdown);
                if (elements.confirmDeactivateBtn) {
                    elements.confirmDeactivateBtn.disabled = false;
                }
            }
        }, 1000);
    }
    
    // 执行账号注销
    async function deactivateAccount() {
        // 清除倒计时
        clearInterval(deactivateCountdown);
        
        // 使用自定义确认对话框进行最终确认
        showConfirmDialog('您确定要注销账号吗？此操作不可撤销，所有数据将被永久删除。', async function () {
            try {
                const response = await fetch('/user/deactivate', {
                method: 'POST',
                headers: {
                        'Content-Type': 'application/json'
                    }
                });
                
                const result = await response.json();
                
                if (result.success) {
                    // 注销成功，跳转到登录页面
                    alert('账号已成功注销，即将返回登录页面');
                    window.location.href = '/';
            } else {
                    // 注销失败
                    alert('账号注销失败：' + (result.message || '未知错误'));
                closeDeactivateModal();
            }
        } catch (error) {
                console.error('注销账号出错：', error);
                alert('注销账号过程中出现错误，请稍后重试');
            closeDeactivateModal();
        }
        });
    }

    // 设置VIP兑换码处理函数
    function setupVipCodeHandlers() {
        // VIP兑换码输入框回车键处理
        document.getElementById('vip-code-input')?.addEventListener('keypress', function (e) {
            if (e.key === 'Enter') {
                e.preventDefault();
                redeemVIPCode();
            }
        });
        
        // 积分充值码输入框回车键处理
        document.getElementById('points-code-input')?.addEventListener('keypress', function (e) {
            if (e.key === 'Enter') {
                e.preventDefault();
                redeempointsCode();
            }
        });
    }
    
    // VIP兑换码兑换函数
    async function redeemVIPCode() {
        const codeInput = document.getElementById('vip-code-input');
        const resultDisplay = document.getElementById('vip-redeem-result');
        const redeemButton = document.getElementById('vip-redeem-btn');
        
        if (!codeInput || !resultDisplay || !redeemButton) {
            console.error('VIP兑换码相关元素未找到');
            return;
        }
        
        const code = codeInput.value.trim();
        if (!code) {
            resultDisplay.textContent = '请输入有效的兑换码';
            resultDisplay.className = 'redeem-result error';
            return;
        }
        
            // 禁用按钮防止重复提交
            redeemButton.disabled = true;
        resultDisplay.textContent = '正在验证兑换码...';
            resultDisplay.className = 'redeem-result';
            
        try {
            // 首先验证兑换码是否有效
            const checkResponse = await fetch('/vip/check_vip_token', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({ code: code })
            });
            
            if (checkResponse.status === 400) {
                // 兑换码无效返回400
                resultDisplay.textContent = '兑换码无效或已使用';
                resultDisplay.className = 'redeem-result error';
                redeemButton.disabled = false;
                return;
            }
            
            const checkData = await checkResponse.json();
            
            if (!checkData.success) {
                // 其他原因失败
                resultDisplay.textContent = checkData.message || '兑换码验证失败';
                resultDisplay.className = 'redeem-result error';
                redeemButton.disabled = false;
                return;
            }
            
            // 处理兑换的函数
            const activateVipToken = async () => {
                resultDisplay.textContent = '正在处理...';
                
                try {
                    const response = await fetch('/vip/activate_vip_token', {
                        method: 'POST',
                        headers: {
                            'Content-Type': 'application/json'
                        },
                        body: JSON.stringify({ code: code })
            });
            
            const data = await response.json();
            
            if (data.success) {
                resultDisplay.textContent = data.message || '兑换成功！';
                resultDisplay.className = 'redeem-result success';
                codeInput.value = '';
                
                // 刷新会员信息
                await fetchUserMembershipInfo();
                
                // 显示成功提示
                showToast('会员兑换成功！', 'success');
            } else {
                resultDisplay.textContent = data.message || '兑换失败，请检查兑换码是否有效';
                resultDisplay.className = 'redeem-result error';
            }
        } catch (error) {
            console.error('处理VIP兑换码时出错:', error);
            resultDisplay.textContent = '兑换过程中发生错误，请稍后重试';
            resultDisplay.className = 'redeem-result error';
        } finally {
            // 恢复按钮状态
                    redeemButton.disabled = false;
                }
            };
                        
            // 检查是否需要显示降级确认
            if (state?.currentUser?.member_level === 'svip' && checkData.type === 'vip') {
                // 用户是SVIP，兑换码是VIP，可能导致降级，显示确认对话框
                showConfirmDialog('此操作将会把您从SVIP降级为VIP，是否继续？', activateVipToken);
            } else {
                // 用户不是SVIP或兑换码不是VIP类型，直接处理
                await activateVipToken();
            }
        } catch (error) {
            console.error('验证VIP兑换码时出错:', error);
            resultDisplay.textContent = '验证兑换码过程中发生错误，请稍后重试';
            resultDisplay.className = 'redeem-result error';
            redeemButton.disabled = false;
        }
    }
    
    // 积分充值码兑换函数
    async function redeempointsCode() {
        const codeInput = document.getElementById('points-code-input');
        const resultDisplay = document.getElementById('points-redeem-result');
        const redeemButton = document.getElementById('points-redeem-btn');
        
        if (!codeInput || !resultDisplay || !redeemButton) {
            console.error('积分充值码相关元素未找到');
            return;
        }
        
        const code = codeInput.value.trim();
        if (!code) {
            resultDisplay.textContent = '请输入有效的充值码';
            resultDisplay.className = 'redeem-result error';
            return;
        }
        
        try {
            // 禁用按钮防止重复提交
            redeemButton.disabled = true;
            resultDisplay.textContent = '正在处理...';
            resultDisplay.className = 'redeem-result';
            
            const response = await fetch('/points/redeem', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({ code })
            });
            
            const data = await response.json();
            
            if (data.success) {
                resultDisplay.textContent = data.message || '充值成功！';
                resultDisplay.className = 'redeem-result success';
                codeInput.value = '';
                
                // 刷新积分信息
                await fetchUserPointsInfo();
                
                // 显示成功提示
                showToast('积分充值成功！', 'success');
            } else {
                resultDisplay.textContent = data.message || '充值失败，请检查充值码是否有效';
                resultDisplay.className = 'redeem-result error';
            }
        } catch (error) {
            console.error('处理积分充值码时出错:', error);
            resultDisplay.textContent = '充值过程中发生错误，请稍后重试';
            resultDisplay.className = 'redeem-result error';
        } finally {
            // 恢复按钮状态
            redeemButton.disabled = false;
        }
    }

    function handleSearchResults(text, messageDiv) {
        // 先尝试提取搜索结果
        const match = text.match(/<search>([\s\S]*?)<\/search>/);
        if (!match || !match[1]) return;

        let results;
        try {
            results = JSON.parse(match[1]);
        } catch (e) {
            console.error('解析搜索结果失败:', e);
            return;
        }

        // 创建或获取搜索结果容器
        let container = messageDiv.querySelector('.search-results-container');
        if (!container) {
            container = document.createElement('div');
            container.className = 'search-results-container';
            // 查找思考容器
            const thinkContainer = document.querySelectorAll('.think-container');
            // 将容器插入到消息div
            messageDiv.insertBefore(container, thinkContainer[thinkContainer.length - 1]);
        }
        container.innerHTML = ''; // 清空现有内容

        // 创建标题头
        const header = document.createElement('div');
        header.className = 'search-results-header';
        header.textContent = `已找到 ${results.length} 个网页`;
        header.style.cursor = 'pointer';

        // 创建内容区域（默认折叠）
        const contentBox = document.createElement('div');
        contentBox.className = 'search-results-content';
        contentBox.style.display = 'none'; // 默认折叠

        // 添加搜索结果
        if (results.length > 0) {
            results.forEach(item => {
                const link = document.createElement('a');
                link.href = item.href;
                link.target = '_blank';
                link.textContent = item.title;
                link.className = 'search-result-item';
                contentBox.appendChild(link);
            });
        }

        // 添加点击切换显示/隐藏功能
        header.onclick = () => {
            contentBox.style.display = contentBox.style.display === 'none' ? 'block' : 'none';
        };

        // 添加到容器
        container.appendChild(header);
        container.appendChild(contentBox);
    }

    // ====================== 复制消息功能 ======================
    // 复制消息内容
    function copyAIMessage(messageElement, button) {
        // 获取消息内容
        const contentElement = messageElement.querySelector('.message-content');
        if (!contentElement) return;

        // 尝试从data-original-text属性获取原始内容
        let textContent = contentElement.getAttribute('data-original-text');

        // 如果没有原始属性，则从HTML内容中提取并转换回Markdown格式
        if (!textContent) {
            const contentClone = contentElement.cloneNode(true);

            // 处理标题
            Array.from(contentClone.querySelectorAll('h1, h2, h3, h4, h5, h6')).forEach(heading => {
                const level = parseInt(heading.tagName.substring(1));
                const hashes = '#'.repeat(level) + ' ';
                heading.textContent = hashes + heading.textContent;
            });

            // 处理加粗文本
            Array.from(contentClone.querySelectorAll('strong')).forEach(strong => {
                strong.textContent = '**' + strong.textContent + '**';
            });

            // 处理斜体文本
            Array.from(contentClone.querySelectorAll('em')).forEach(em => {
                em.textContent = '*' + em.textContent + '*';
            });

            // 处理代码块
            Array.from(contentClone.querySelectorAll('pre > code')).forEach(code => {
                const language = code.className.replace('language-', '').trim();
                code.textContent = '```' + language + '\n' + code.textContent + '\n```';
            });

            // 处理行内代码
            Array.from(contentClone.querySelectorAll('code:not(pre > code)')).forEach(code => {
                code.textContent = '`' + code.textContent + '`';
            });

            // 处理列表
            Array.from(contentClone.querySelectorAll('ul li')).forEach(li => {
                li.textContent = '- ' + li.textContent;
            });

            Array.from(contentClone.querySelectorAll('ol li')).forEach((li, index) => {
                li.textContent = (index + 1) + '. ' + li.textContent;
            });

            // 处理链接
            Array.from(contentClone.querySelectorAll('a')).forEach(a => {
                a.textContent = '[' + a.textContent + '](' + a.href + ')';
            });

            // 最后，提取所有文本内容
            textContent = contentClone.textContent || contentClone.innerText;
        }

        // 创建临时文本区域
        const textarea = document.createElement('textarea');
        textarea.value = textContent;
        textarea.setAttribute('readonly', '');
        textarea.style.position = 'absolute';
        textarea.style.left = '-9999px';
        document.body.appendChild(textarea);

        // 选择并复制文本
        textarea.select();
        document.execCommand('copy');

        // 移除临时元素
        document.body.removeChild(textarea);

        // 更新按钮状态
        button.className = `copy-message-btn copied-icon iconfont`

        // 2秒后恢复按钮原状
        setTimeout(() => {
            button.className = `copy-message-btn copy-icon iconfont`
        }, 2000);

        // 显示通知
        // showNotification('消息已复制到剪贴板', 2000);
    }

    // 添加 updateMessagesPadding 函数，更新 messages 容器 padding
    function updateMessagesPadding() {
        const container = elements.messagesContainer;
        const preview = elements.imagePreviewContainer;
        if (!container) return;
        if (preview && preview.style.display !== 'none') {
            container.style.padding = '38px 0 225px';
        } else {
            container.style.padding = '38px 0 150px';
        }
    }

    // 添加更新初始页面输入框和图片预览位置的函数
    function updateInitialInputPosition() {
        const chatMain = document.querySelector('.chat-main');
        const initialPage = chatMain?.querySelector('.initial-page');
        const inputArea = document.querySelector('.input-area');
        const wrapper = document.querySelector('.message-input-wrapper');
        const preview = document.getElementById('image-preview-container');
        if (!chatMain || !initialPage || !wrapper || !preview || !inputArea) return;
        // 设置输入区域
        inputArea.style.position = 'relative';
        // 设置输入框位置
        wrapper.style.position = 'relative';
        wrapper.style.maxWidth = '680px';
        // 同步图片预览容器位置，置于输入框上方
        preview.style.position = 'relative';
        preview.style.maxWidth = '680px';
        preview.style.bottom = '7px';
    }
    // 当点击 message-input-wrapper 或 bottom-buttons 的时候，聚焦到 message-input 输入框
    document.querySelector('.message-input-wrapper').addEventListener('click', () => {
        const elementIsInFocus = (el) => (el === document.activeElement);
        if (elementIsInFocus(document.getElementById('message-input')) == false) {
            document.getElementById('message-input').focus();   
        }
    })
    document.querySelector('.bottom-buttons').addEventListener('click', () => {
        const elementIsInFocus = (el) => (el === document.activeElement);
        if (elementIsInFocus(document.getElementById('message-input')) == false) {
            document.getElementById('message-input').focus();   
        }
    })
    
    // 还原输入框和图片预览位置
    function resetInputPosition() {
        const inputArea = document.querySelector('.input-area');
        if (inputArea) {
            inputArea.style.removeProperty('position');
        }
        const wrapper = document.querySelector('.message-input-wrapper');
        if (wrapper) {
            wrapper.style.removeProperty('position');
            wrapper.style.removeProperty('max-width');
        }
        const preview = document.getElementById('image-preview-container');
        if (preview) {
            preview.style.removeProperty('position');
            preview.style.removeProperty('max-width');
            preview.style.removeProperty('bottom');
        }
    }
    // 窗口大小变化时重新计算位置
    window.addEventListener('resize', updateInitialInputPosition);
    // 移动端视图时自动展开侧边栏
    window.addEventListener('resize', function () {
        if (window.innerWidth <= 768) {
            if (elements.sidebar) {
                elements.sidebar.classList.remove('collapsed');
            }
            if (elements.sidebarToggle) {
                elements.sidebarToggle.classList.remove('collapsed');
            }
        }
    });

    // 新增函数：将复制按钮添加到所有模型消息
    function attachCopyButtonsToAIMessages() {
        // 添加复制按钮到所有模型消息
        const aiMessages = document.querySelectorAll('.message.ai');
        aiMessages.forEach((msg, idx) => {
            if (msg.dataset.copyAttached) return;
            msg.style.position = 'relative';
            // 如果存在复制按钮，则删除
            const btn_old = msg.querySelector('.copy-message-btn');
            if (btn_old) {
                btn_old.remove();
            }
            const btn = document.createElement('button');
            btn.className = 'copy-message-btn copy-icon iconfont';
            btn.style.color = 'transparent'
            btn.addEventListener('click', (e) => {
                e.stopPropagation();
                copyAIMessage(msg, btn);
            });
            msg.appendChild(btn);
         
            // 最后一条 AI 消息复制按钮常显，其余消息默认隐藏并悬停可见
            const lastIndex = aiMessages.length - 1;
            if (idx === lastIndex) {
                btn.style.removeProperty('color')
            } else {
                btn.style.color = 'transparent';
                let hideTimeout;
                msg.addEventListener('mouseenter', () => {
                    clearTimeout(hideTimeout);
                    // 删除后加的 style
                    btn.style.removeProperty('color')
                });
                msg.addEventListener('mouseleave', () => {
                    hideTimeout = setTimeout(() => { btn.style.color = 'transparent'; }, 10);
                });
                msg.dataset.copyAttached = 'true';
            }
        });
    }
});

// 全局处理搜索结果，创建可折叠的搜索结果区域
function handleSearchResults(text, messageDiv) {
    const match = text.match(/<search>([\s\S]*?)<\/search>/);
    if (!match || !match[1]) return;
    let results;
    try {
        results = JSON.parse(match[1]);
    } catch (e) {
        console.error('解析 search JSON 失败:', e);
        return;
    }
    const container = messageDiv.querySelector('.search-results-container');
    if (!container) return;
    container.innerHTML = '';
    // 标题
    const header = document.createElement('div');
    header.className = 'search-results-header';
    header.textContent = `已联网搜索（找到 ${results.length} 个内容）`;
    header.style.cursor = 'pointer';
    // 内容区域
    const contentBox = document.createElement('div');
    contentBox.className = 'search-results-content';
    contentBox.style.display = 'block';
    results.forEach(item => {
        const link = document.createElement('a');
        link.href = item.href;
        link.target = '_blank';
        link.textContent = item.title;
        link.className = 'search-result-item';
        contentBox.appendChild(link);
    });
    header.onclick = () => {
        contentBox.style.display = contentBox.style.display === 'none' ? 'block' : 'none';
    };
    container.appendChild(header);
    container.appendChild(contentBox);
}