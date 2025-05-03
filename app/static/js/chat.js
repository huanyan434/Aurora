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
        collapseBtn: document.querySelector('.collapse-btn'),
        sidebar: document.querySelector('.conversation-sidebar'),
        sidebarToggle: document.querySelector('.sidebar-toggle'),
        sidebarOverlay: document.querySelector('.sidebar-overlay'),
        logoutBtn: document.querySelector('.logout-btn'),
        userNameDisplay: document.getElementById('user-name-display'),
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
    };

    // ====================== 初始化 ======================
    async function init() {
        try {
            console.log('初始化应用...');
            
            // 并行执行多个异步任务
            await Promise.all([
                // 获取当前用户信息
                getCurrentUser(),
                
                // 加载对话历史
                loadConversations(),
                
                // 其他可以并行加载的任务
                setupModelSelector()
            ]);
            
            // 验证必要的DOM元素已加载
            validateElements();
            
            // 设置事件监听器
            setupEventListeners();
            
            // 初始化用户界面元素
            setupUserProfileModal();
            setupUserFormButtonEvents();
            
            // 加载侧边栏状态
            await loadSidebarState();
            
            // 根据URL参数或最新对话加载内容
            const urlParams = new URLSearchParams(window.location.search);
            const conversationId = urlParams.get('conversation');
            
            if (conversationId) {
                // 加载指定的对话
                await loadConversationHistory(conversationId);
            } else if (state.conversations && state.conversations.length > 0) {
                // 加载最新的对话
                await loadLatestConversation();
            } else {
                // 显示初始页面
                showInitialPage();
            }
            
            // 获取用户余额信息
            fetchUserBalanceInfo().catch(err => console.error('加载用户余额信息出错:', err));
            
            // 尝试续流未完成的消息
            checkActiveResponses().catch(err => console.error('检查活跃响应出错:', err));
            
            // 优化体验：延迟加载非关键资源
            setTimeout(() => {
                // 异步更新模型使用次数
                updateAllModelsFreeUsage().catch(err => console.error('加载模型免费使用次数出错:', err));
                
                // 异步加载其他资源
                setupScrollListener();
            startMarkdownObserver();
            
            // 初始化完成后添加复制按钮
                window.addCopyButtonsToAllCodeBlocks();
                
                // 确保滚动到底部
                scrollToBottom(true);
            }, 200);
            
            console.log('应用初始化完成');
        } catch (error) {
            console.error('初始化过程中发生错误:', error);
            // 确保显示初始页面，即使发生错误
            showInitialPage();
        }
    }

    // 获取当前用户信息
    async function getCurrentUser() {
        try {
            const response = await fetch('/api/user/current');
            if (!response.ok) {
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
            return null;
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

        // 联网搜索按钮点击事件
        if (elements.onlineSearchBtn) {
            elements.onlineSearchBtn.addEventListener('click', function() {
                this.classList.toggle('active');
                
                if (this.classList.contains('active')) {
                    showNotification('已启用联网搜索功能，请确保输入文本内容', 3000);
                    
                    // 检查当前是否有文本内容
                    const content = elements.messageInput.value.trim();
                    if (!content) {
                        // 自动聚焦到输入框
                        elements.messageInput.focus();
                    }
                } else {
                    showNotification('已关闭联网搜索功能', 2000);
                }
            });
        }

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
            elements.sidebarToggle.addEventListener('click', toggleMobileSidebar);
        }

        // 添加遮罩层点击事件
        if (elements.sidebarOverlay) {
            elements.sidebarOverlay.addEventListener('click', closeMobileSidebar);
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
        if (elements.userNameDisplay) {
            elements.userNameDisplay.addEventListener('click', openUserProfileModal);
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
        if (editUsernameBtn) {
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

        // 兑换兑换码事件
        const vipCodeInputEl = document.getElementById('vip-code-input');
        const vipRedeemBtnEl = document.getElementById('vip-redeem-btn');
        const vipRedeemResultEl = document.getElementById('vip-redeem-result');
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
        
        // 余额充值码兑换事件
        const moneyCodeInputEl = document.getElementById('money-code-input');
        const moneyRedeemBtnEl = document.getElementById('money-redeem-btn');
        const moneyRedeemResultEl = document.getElementById('money-redeem-result');
        if (moneyRedeemBtnEl) {
            moneyRedeemBtnEl.addEventListener('click', async () => {
                const code = moneyCodeInputEl.value.trim();
                if (!code) {
                    moneyRedeemResultEl.textContent = '请输入充值码';
                    return;
                }
                
                try {
                    const resp = await fetch('/money/redeem_money_token', {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({ code })
                    });
                    
                    const data = await resp.json();
                    
                    if (!resp.ok) {
                        moneyRedeemResultEl.textContent = data.message || '充值失败';
                        moneyRedeemResultEl.style.color = 'red';
                    } else {
                        moneyRedeemResultEl.textContent = data.message || `成功充值¥${data.amount}`;
                        moneyRedeemResultEl.style.color = 'green';
                        
                        // 更新余额显示
                        fetchUserBalanceInfo();
                        
                        // 清空输入框
                        moneyCodeInputEl.value = '';
                    }
                } catch (error) {
                    console.error('充值失败:', error);
                    moneyRedeemResultEl.textContent = '充值操作失败，请稍后重试';
                    moneyRedeemResultEl.style.color = 'red';
                }
            });
            
            // 支持回车键提交
            moneyCodeInputEl.addEventListener('keypress', (e) => {
                if (e.key === 'Enter') moneyRedeemBtnEl.click();
            });
        }
    }

    // ====================== 图片处理 ======================
    function handleImageSelect(event) {
        const file = event.target.files[0];
        if (file && file.type.startsWith('image/')) {
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
            
            // 提示用户可以添加描述或直接发送
            showNotification('图片已选择', 3000);
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
        // 捕获当前输入内容（创建快照）
        const content = elements.messageInput.value.trim();
        const contentSnapshot = content; // 保存当前内容的快照
        
        const isOnlineSearchEnabled = elements.onlineSearchBtn && 
                                     elements.onlineSearchBtn.classList.contains('active');
        
        // 检查是否有内容或图片
        if ((!content && !state.selectedImage) || state.isSending) {
            console.log('消息为空或正在发送中');
            return;
        }
        
        // 当启用联网搜索时，必须有文本内容
        if (isOnlineSearchEnabled && !content) {
            showNotification('联网搜索需要输入文本内容', 3000);
            return;
        }
        
        // 检查余额是否足够
        const balanceOk = await checkBalanceBeforeSend();
        if (!balanceOk) {
            console.log('余额不足，无法发送消息');
            return;
        }

        console.log('开始发送消息:', contentSnapshot);
        state.isSending = true;
        state.lastUserMessage = contentSnapshot;  // 保存用户消息
        updateSendButtonState();
        
        // 清空输入框
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
        let thinkHeaderElement = null;
        
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
            console.log("请求体摘要:", JSON.stringify({
                prompt: requestBody.prompt ? "已提供" : "未提供",
                message: requestBody.message ? "已提供" : "未提供",
                prompt长度: requestBody.prompt ? requestBody.prompt.length : 0,
                conversation_id: conversationId,
                model_name: requestBody.model_name,
                model: requestBody.model,
                has_image: !!messageData.image,
                online_search: isOnlineSearchEnabled
            }));
            
            // 更改发送按钮状态为停止按钮
            state.isSending = true;
            updateSendButtonState();
            
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
                            
                            // 添加调试日志
                            console.log('当前文本内容:', currentContent);
                            
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
                                    
                                    // 处理base64图片标签
                                    textContent = processMessageContent(textContent, false);
                                    
                                    // 解析并显示
                                    contentDiv.innerHTML = marked.parse(textContent);
                                    
                                    // 如果有思考容器，更新其状态
                                    const thinkContainer = aiMessageDiv.querySelector('.think-container');
                                    if (thinkContainer) {
                                        const thinkHeader = thinkContainer.querySelector('.think-header');
                                        if (thinkHeader) {
                                            // 检查是否有实际内容
                                            const hasContent = textContent && textContent.trim().length > 0;
                                            console.log('文本内容检查:', { hasContent, textContent: textContent.substring(0, 50) });
                                            
                                            const headerText = hasContent ? 
                                                `已深度思考（用时 ${data.think_time || Math.floor((Date.now() - thinkStartTime) / 1000)} 秒）` : 
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
                                
                                // 检查是否有实际内容
                                const hasContent = currentContent && currentContent.trim().length > 0;
                                console.log('创建思考头部时的内容检查:', { hasContent, currentContent: currentContent ? currentContent.substring(0, 50) : null });
                                
                                const headerText = hasContent ? 
                                    `已深度思考（用时 ${data.think_time || Math.floor((Date.now() - thinkStartTime) / 1000)} 秒）` : 
                                    '思考中...';
                                
                                thinkHeader.innerHTML = `
                                    <span>${headerText}<span style="display:inline-block; width:5px;"></span>
                                    <div class="triangle" style="display:inline-block; width:0; height:0; border-left:6px solid transparent; border-right:6px solid transparent; border-top:6px solid #999; vertical-align:middle;"></div></span>
                                `;
                                
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
                                
                                // 移除背景色
                                thinkContentDiv.style.backgroundColor = 'transparent';
                                thinkContentDiv.style.lineHeight = '1.3';
                                
                                // 组装思考容器
                                thinkContainer.appendChild(thinkHeader);
                                thinkContainer.appendChild(thinkContentDiv);
                                
                                // 保存思考头部元素引用
                                thinkHeaderElement = thinkHeader;
                                
                                // 添加点击事件，实现展开/折叠功能
                                thinkHeader.onclick = function (event) {
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
                                // 如果容器已存在，更新头部文本
                                const thinkHeader = thinkContainer.querySelector('.think-header');
                                if (thinkHeader) {
                                    // 同样的逻辑应用于更新时
                                    const headerText = currentContent && currentContent.trim() ? 
                                        `已深度思考（用时 ${data.think_time || Math.floor((Date.now() - thinkStartTime) / 1000)} 秒）` : 
                                        '思考中...';
                                    
                                    thinkHeader.innerHTML = `
                                        <span>${headerText}<span style="display:inline-block; width:5px;"></span>
                                        <div class="triangle" style="display:inline-block; width:0; height:0; border-left:6px solid transparent; border-right:6px solid transparent; border-top:6px solid #999; vertical-align:middle;"></div></span>
                                    `;
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
                                            thinkText = thinkText.text;
                                        } else {
                                            thinkText = JSON.stringify(thinkText);
                                        }
                                    }
                                    
                                    // 替换换行符
                                    thinkText = thinkText.replace(/\n/g, '<br>');
                                    
                                    // 解析并显示
                                    thinkContentDiv.innerHTML = marked.parse(thinkText);
                                    
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
            
            // 不再需要清除计时器，因为我们不再使用计时器
            // if (thinkTimerInterval) {
            //     clearInterval(thinkTimerInterval);
            // }
            
            // 不再保存内容到服务器，避免重复保存
            // 后端已经处理了正常完成的消息保存
            console.log('AI响应正常完成，后端已自动保存内容');
            
            // 完成响应处理后的代码块
            console.log('AI响应完成');

            // 检查当前对话的标题是否为"新对话"，如果是则获取新标题
            if (conversationId) {
                const currentConversation = state.conversations.find(conv => conv.id === conversationId);
                if (currentConversation && currentConversation.title === '新对话') {
                    // 异步获取标题，不阻塞继续交流
                    fetchConversationTitle(conversationId);
                }
            }
            
            // 函数结束时，获取和刷新用户余额
            try {
                // 刷新余额显示
                await fetchUserBalanceInfo();
                // 刷新免费次数显示
                await updateAllModelsFreeUsage();
            } catch (error) {
                console.error('刷新信息失败:', error);
            }
            
            return aiMessageDiv;
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
                                contentDiv.innerHTML = '<div class="interrupt-note">用户已中断此次响应</div>';
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
                                
                                // 不再替换换行符为<br>，保留原始格式以便正确解析代码块
                                // textContent = textContent.replace(/\n/g, '<br>');
                                
                                // 处理base64图片
                                textContent = processMessageContent(textContent, false);
                                
                                // 确保内容已经显示
                                try {
                                    const formattedContent = marked.parse(textContent);
                                    contentDiv.innerHTML = formattedContent + '<div class="interrupt-note">用户已中断此次响应</div>';
                                } catch (error) {
                                    console.error('处理中断内容时出错:', error);
                                    contentDiv.innerHTML = `<p>${textContent}</p><div class="interrupt-note">用户已中断此次响应</div>`;
                                }
                            }
                            
                            // 更新本地内容变量
                            if (!currentContent || currentContent.trim() === '') {
                                currentContent = '<div class="interrupt-note">用户已中断此次响应</div>';
                            } else {
                                currentContent += '\n\n用户已中断此次响应';
                            }

                            // 修复变量不一致问题：确保正确引用变量
                            let finalContent = currentContent;
                            if (finalContent.indexOf('用户已中断此次响应') === -1) {
                                finalContent += '\n\n用户已中断此次响应';
                            }
                        }
                        
                        // 更新思考头部文本（如果存在）
                        if (thinkHeaderElement && currentThink) {
                            // 解析思考时间标签
                            const thinkTimeMatch = currentThink.match(/<think time=(\d+)>/);
                            let thinkSeconds = 0;
                            
                            // 检查是否真正完成了思考
                            let isThinkingComplete = false;
                            
                            if (thinkTimeMatch && thinkTimeMatch[1] && currentContent && currentContent.trim() !== '') {
                                // 使用标签中指定的时间，并且确认已有正文内容
                                thinkSeconds = parseInt(thinkTimeMatch[1], 10) || 0;
                                // 有思考时间且有正文内容，表示思考已完成
                                isThinkingComplete = true;
                            }
                            
                            // 根据思考是否完成设置适当的头部
                            if (isThinkingComplete) {
                                // 思考完成，显示时间
                                thinkHeaderElement.innerHTML = `
                                    <span>已深度思考（用时 ${thinkSeconds} 秒）<span style="display:inline-block; width:5px;"></span>
                                    <div class="triangle" style="display:inline-block; width:0; height:0; border-left:6px solid transparent; border-right:6px solid transparent; border-top:6px solid #999; vertical-align:middle;"></div></span>
                                `;
                            } else {
                                // 思考尚未完成，显示"思考中..."
                                thinkHeaderElement.innerHTML = `
                                    <span>思考中...<span style="display:inline-block; width:5px;"></span>
                                    <div class="triangle" style="display:inline-block; width:0; height:0; border-left:6px solid transparent; border-right:6px solid transparent; border-top:6px solid #999; vertical-align:middle;"></div></span>
                                `;
                            }
                            console.log('思考头部已更新');
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
            const imgHtml = `<img src="data:image/png;base64,${base64Content}" alt="嵌入图片" class="embedded-image" style="max-width: 100%; border-radius: 8px; margin: 10px 0;" />`;
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

    // 加载对话历史
    function loadConversationHistory(conversationId) {
        if (!conversationId) {
            console.error('对话ID不能为空');
            return;
        }

        // 设置当前对话 ID
        state.currentConversationId = conversationId;
        
        // 更新侧边栏中的活动对话项
        updateActiveConversationInSidebar(conversationId);

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
                                <img src="/static/models/${imageName}.png" alt="${modelName}" class="model-avatar" onerror="this.src='/static/models/default.png';">
                                <div class="model-name"><strong>${modelName}</strong></div>
                        `;
                        
                        // 添加到消息元素
                        messageDiv.appendChild(modelInfoDiv);
                        
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
                        thinkContentDiv.innerHTML = marked.parse(thinkContent);
                        
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
                            
                            // 处理base64图片标签，不先替换换行符
                            // textContent = textContent.replace(/\n/g, '<br>');
                            
                            // 处理base64图片标签
                            textContent = processMessageContent(textContent, false);
                            
                            // 解析并显示
                            contentDiv.innerHTML = marked.parse(textContent);
                        } catch (error) {
                            console.error('处理历史消息内容时出错:', error);
                            contentDiv.innerHTML = `<p>${textContent}</p>`;
                        }
                        
                        // 添加到消息元素
                        messageDiv.appendChild(contentDiv);
                        
                        // 添加到消息容器
                        chatMessages.appendChild(messageDiv);
                    }
                }
            });
            
            // 强制滚动到底部
                    scrollToBottom(true);
                
                // 历史记录加载完成后，添加复制按钮
                console.log('历史记录加载完成，添加复制按钮...');
                setTimeout(() => {
                    window.addCopyButtonsToAllCodeBlocks();
                }, 300);
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
                document.querySelectorAll('.dropdown-menu').forEach(menu => menu.remove());
                
                // 创建下拉菜单
                const dropdownMenu = document.createElement('div');
                dropdownMenu.className = 'dropdown-menu';
                dropdownMenu.innerHTML = `
                    <div class="dropdown-item rename-item">
                        <svg class="dropdown-icon" viewBox="0 0 24 24" width="16" height="16">
                            <path d="M3 17.25V21h3.75L17.81 9.94l-3.75-3.75L3 17.25zM20.71 7.04c.39-.39.39-1.02 0-1.41l-2.34-2.34a.9959.9959 0 0 0-1.41 0l-1.83 1.83 3.75 3.75 1.83-1.83z" fill="currentColor"/>
                        </svg>
                        <span>重命名</span>
                    </div>
                    <div class="dropdown-item delete-item">
                        <svg class="dropdown-icon" viewBox="0 0 24 24" width="16" height="16">
                            <path d="M6 19c0 1.1.9 2 2 2h8c1.1 0 2-.9 2-2V7H6v12zM19 4h-3.5l-1-1h-5l-1 1H5v2h14V4z" fill="currentColor"/>
                        </svg>
                        <span>删除</span>
                    </div>
                `;
                
                // 将菜单添加到body
                document.body.appendChild(dropdownMenu);
                
                // 设置菜单位置
                const btnRect = moreBtn.getBoundingClientRect();
                dropdownMenu.style.position = 'fixed';
                dropdownMenu.style.top = `${btnRect.bottom + 5}px`;
                dropdownMenu.style.left = `${btnRect.left - 100}px`; // 菜单左对齐，宽度约100px
                
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
                            makeConversationTitleEditable(conv.id, titleElement, conv.title || '新对话');
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
            // 自定义悬浮提示"更多"
            /* let moreTooltip;
            moreBtn.addEventListener('mouseenter', () => {
              const rect = moreBtn.getBoundingClientRect();
              moreTooltip = document.createElement('div');
              moreTooltip.className = 'au-tooltip au-tooltip--m au-elevated au-theme';
              moreTooltip.style.cssText = '--au-rgb-hover: 0 0 0 / 4%; font-size: var(--au-font-size-m); line-height: var(--au-line-height-m); z-index: 0;';
              moreTooltip.style.position = 'fixed';
              moreTooltip.style.left = `${rect.left-7}px`;
              moreTooltip.style.top = `${rect.bottom}px`;
              moreTooltip.innerText = '更多';
              // 添加提示箭头
              const arrowDiv = document.createElement('div');
              arrowDiv.className = 'au-tooltip__arrow au-tooltip__arrow--soft';
              arrowDiv.setAttribute('au-floating-placement', 'bottom');
              arrowDiv.style.cssText = 'left: 16px;';
              arrowDiv.innerHTML = `<svg class="au-tooltip__soft-arrow" viewBox="0 0 47 13" fill="none" xmlns="http://www.w3.org/2000/svg"><mask id="mask0_0_3329" maskUnits="userSpaceOnUse" x="0" y="0" width="47" height="13" style="mask-type: alpha;"><path fill-rule="evenodd" clip-rule="evenodd" d="M0 0.00316996C1.71249 0.00316996 3.42448 -0.00533022 5.13697 0.0131702C6.77598 0.0311706 8.61044 0.0566711 10.2055 0.658184C11.9284 1.3082 13.0691 2.44472 14.2168 3.78225C15.043 4.74427 16.666 6.79681 17.4563 7.78784C18.1031 8.60035 19.3692 10.2064 20.0605 10.9834C20.9308 11.9609 22.0064 12.9999 23.5005 12.9999C24.9946 12.9999 26.0697 11.9609 26.9395 10.9844C27.6308 10.2079 28.8969 8.60085 29.5442 7.78884C30.3335 6.79781 31.9565 4.74527 32.7832 3.78325C33.9329 2.44572 35.0716 1.3092 36.794 0.659184C38.3896 0.0591711 40.2245 0.0321706 41.8625 0.0141702C43.5755 -0.0043302 45.2875 0.00416998 47 0.00416998" fill="#FF0000"></path></mask><g mask="url(#mask0_0_3329)"><g clip-path="url(#clip0_0_3329)"><g filter="url(#filter0_b_0_3329)"><rect width="47" height="13" fill="currentColor" style="mix-blend-mode: color-dodge;"></rect></g></g></g><defs><filter id="filter0_b_0_3329" x="-50" y="-50" width="147" height="113" filterUnits="userSpaceOnUse" color-interpolation-filters="sRGB"><feFlood flood-opacity="0" result="BackgroundImageFix"></feFlood><feGaussianBlur in="BackgroundImageFix" stdDeviation="25"></feGaussianBlur><feComposite in2="SourceAlpha" operator="in" result="effect1_backgroundBlur_0_3329"></feComposite><feBlend mode="normal" in="SourceGraphic" in2="effect1_backgroundBlur_0_3329" result="shape"></feBlend></filter><clipPath id="clip0_0_3329"><rect width="47" height="13" fill="white"></rect></clipPath></defs></svg>`;
              moreTooltip.appendChild(arrowDiv);
              document.body.appendChild(moreTooltip);
            });
            moreBtn.addEventListener('mouseleave', () => {
              if (moreTooltip) {
                moreTooltip.remove();
                moreTooltip = null;
              }
            });*/
            
            item.appendChild(contentDiv);
            item.appendChild(moreBtn);
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
                // 清除当前对话ID
                state.currentConversationId = null;
                // 更新侧边栏中的活动对话项
                updateActiveConversationInSidebar(null);
            } else if (path.startsWith('/chat/')) {
                // 如果是聊天路径，检查是否包含有效的 conversation_id
                const conversationId = path.split('/').pop();
                if (conversationId && conversationId.match(/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i)) {
                    state.currentConversationId = conversationId;
                    await loadConversationHistory(conversationId);
                    // 确保更新了侧边栏中的活动对话项
                    updateActiveConversationInSidebar(conversationId);
                } else {
                    // 无效的 conversation_id，重定向到根路径
                    history.pushState({}, '', '/');
                    showInitialPage();
                    state.currentConversationId = null;
                    updateActiveConversationInSidebar(null);
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
                    isOpen: !state.isSidebarCollapsed
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
        showConfirmDialog('确定要退出登录吗？', function() {
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

        // 添加免费次数提示的样式
        const freeUsageStyle = document.createElement('style');
        freeUsageStyle.textContent = `
            .free-usage-display {
                display: inline-block;
                margin-left: 8px;
                padding: 2px 6px;
                background-color: rgba(255, 236, 153, 0.7);
                border-radius: 4px;
                font-size: 12px;
                color: #664d03;
            }
            .free-usage-display.depleted {
                background-color: rgba(255, 200, 200, 0.7);
                color: #842029;
            }
            .free-usage-remaining {
                font-weight: bold;
            }
        `;
        document.head.appendChild(freeUsageStyle);

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
            
            // 更新所有模型的免费使用次数
            if (isActive) {
                updateAllModelsFreeUsage();
            }
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
        
        // 初始化时更新一次所有模型的免费使用次数
        updateAllModelsFreeUsage();
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
                思考中...（${elapsed} 秒）
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
                    showNotification('代码已复制到剪贴板', 1500);
                    
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
                    showNotification('复制失败，请手动复制', 1500);
                    
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
                showNotification('已复制到剪贴板');
            } else {
                showNotification('复制失败，请手动复制');
            }
        } catch (err) {
            console.error('备用复制方法失败:', err);
            showNotification('复制失败，请手动复制');
        }
    }

    // 添加 showConfirmDialog 函数
    function showConfirmDialog(message, confirmCallback) {
        console.log('显示确认对话框', message);
        
        // 移除可能存在的旧对话框
        const existingModal = document.getElementById('confirmDialog');
        if (existingModal) {
            document.body.removeChild(existingModal);
        }
        
        // 创建模态对话框
        const modalHTML = `
        <div class="modal fade" id="confirmDialog" tabindex="-1" role="dialog" aria-labelledby="confirmDialogLabel" aria-hidden="true">
            <div class="modal-dialog" role="document">
                <div class="modal-content">
                    <div class="modal-header">
                        <h5 class="modal-title" id="confirmDialogLabel">确认操作</h5>
                        <button type="button" class="close" data-dismiss="modal" aria-label="Close">
                            <span aria-hidden="true">&times;</span>
                        </button>
                    </div>
                    <div class="modal-body">
                        ${message}
                    </div>
                    <div class="modal-footer">
                        <button type="button" class="btn btn-secondary" data-dismiss="modal">取消</button>
                        <button type="button" class="btn btn-primary" id="confirmDialogConfirmBtn">确认</button>
                    </div>
                </div>
            </div>
        </div>
        `;
        
        // 添加到文档
        const modalContainer = document.createElement('div');
        modalContainer.innerHTML = modalHTML;
        document.body.appendChild(modalContainer.firstElementChild);
        
        // 获取对话框元素
        const modalElement = document.getElementById('confirmDialog');
        console.log('模态框元素:', modalElement);
        const confirmBtn = document.getElementById('confirmDialogConfirmBtn');
        
        // 设置显示样式
        modalElement.style.display = 'flex';
        modalElement.style.backgroundColor = 'rgba(0, 0, 0, 0.5)';
        modalElement.style.zIndex = '9999';
        
        // 添加show类
        modalElement.classList.add('show');
        
        // 输出调试信息
        console.log('模态框显示状态:', {
            display: getComputedStyle(modalElement).display,
            zIndex: getComputedStyle(modalElement).zIndex,
            classList: [...modalElement.classList]
        });
        
        // 点击确认按钮执行回调
        confirmBtn.addEventListener('click', function() {
            console.log('点击确认按钮');
            closeModal();
            if (typeof confirmCallback === 'function') {
                confirmCallback();
            }
        });
        
        // 点击关闭按钮关闭对话框
        const closeBtn = modalElement.querySelector('.close');
        if (closeBtn) {
            closeBtn.addEventListener('click', closeModal);
        }
        
        // 点击取消按钮关闭对话框
        const cancelBtn = modalElement.querySelector('.btn-secondary');
        if (cancelBtn) {
            cancelBtn.addEventListener('click', closeModal);
        }
        
        // 点击模态框外部关闭对话框
        modalElement.addEventListener('click', function(event) {
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

        /* 代码块样式增强 */
        pre {
            position: relative !important;
            border-radius: 6px !important;
            padding: 1em !important;
            margin: 0.5em 0 !important;
            overflow: auto !important;
        }
        
        pre code {
            font-family: 'Menlo', 'Monaco', 'Consolas', 'Courier New', monospace !important;
            font-size: 0.9em !important;
            line-height: 1.5 !important;
            display: block !important;
        }
        
        .copy-button-container {
            position: absolute !important;
            top: 5px !important;
            right: 5px !important;
            /* 移除透明度，使按钮始终显示 */
            opacity: 1;
            z-index: 10 !important;
        }
        
        .copy-button {
            background: rgba(240, 240, 240, 0.8) !important;
            border: none !important;
            border-radius: 4px !important;
            color: #555 !important;
            cursor: pointer !important;
            font-size: 12px !important;
            padding: 5px !important;
            transition: all 0.2s !important;
            box-shadow: 0 1px 3px rgba(0,0,0,0.12) !important;
            width: 28px !important;
            height: 28px !important;
            display: flex !important;
            align-items: center !important;
            justify-content: center !important;
        }
        
        .copy-button:hover {
            background: rgba(255, 255, 255, 0.95) !important;
            box-shadow: 0 2px 5px rgba(0,0,0,0.15) !important;
            color: #000 !important;
        }
        
        .copy-button.copy-success {
            background: rgba(73, 204, 144, 0.8) !important;
            color: #fff !important;
        }
        
        .copy-button.copy-error {
            background: rgba(255, 59, 48, 0.8) !important;
            color: #fff !important;
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
        console.log('加载对话列表...');
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
                
                // 按照创建时间倒序排列对话列表
                data.sort((a, b) => {
                    // 如果有created_at字段，按时间排序
                    if (a.created_at && b.created_at) {
                        return new Date(b.created_at) - new Date(a.created_at);
                    }
                    // 如果没有时间字段，保持原有顺序
                    return 0;
                });
                
                // 更新state中的对话列表
                state.conversations = data;
                
                // 更新UI
                updateConversationsList();
                
                // 确保在加载完后更新活动状态
                if (state.currentConversationId) {
                    setTimeout(() => {
                        updateActiveConversationInSidebar(state.currentConversationId);
                    }, 100);
                }

                console.log('对话列表加载完成，共', data.length, '个对话');
            })
            .catch(error => {
                console.error('加载对话列表失败:', error);
                showError('加载对话列表失败: ' + error.message);
            });
    }

    // 移除这行单独的调用，避免重复加载
    // loadConversationList();

    // 获取模型图片名称
    function getModelImageName(modelName) {
        // 使用正确的大小写形式
        const modelMap = {
            'deepseek-r1': 'DeepSeek-R1',
            'deepseek-v3': 'DeepSeek-V3',
            'doubao-1.5-lite': 'Doubao-1.5-lite',
            'doubao-1.5-pro': 'Doubao-1.5-pro',
            'doubao-1.5-pro-256k': 'Doubao-1.5-pro-256k',
            'doubao-1.5-vision-pro': 'Doubao-1.5-vision-pro',
            'gemini-2.5-pro': 'Gemini-2.5-pro',
            'gemini-2.5-flash': 'Gemini-2.5-flash',
            'gemini-2.0-flash': 'Gemini-2.0-flash',
            'qwen3': 'Qwen3',
            'qwen2.5-instruct': 'Qwen2.5-Instruct',
            'qvq': 'QvQ',
            'qwq': 'QwQ',
            'qwq-preview': 'QwQ-Preview',
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
                console.error(`保存消息失败(尝试 ${attempt + 1}/3):`, error);
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

    // 添加异步获取对话标题的函数
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

    // 添加重命名对话框函数
    function showRenameDialog(conversationId, currentTitle) {
        const dialog = document.createElement('div');
        dialog.className = 'confirm-dialog rename-dialog';
        
        const content = document.createElement('div');
        content.className = 'confirm-content';
        
        content.innerHTML = `
            <div class="confirm-message">重命名对话</div>
            <input type="text" class="rename-input" value="${currentTitle || '新对话'}" maxlength="100">
            <div class="confirm-buttons">
                <button class="confirm-cancel">取消</button>
                <button class="confirm-ok">确定</button>
            </div>
        `;
        
        dialog.appendChild(content);
        document.body.appendChild(dialog);
        
        // 添加样式
        const input = content.querySelector('.rename-input');
        input.style.width = '100%';
        input.style.padding = '8px 12px';
        input.style.marginBottom = '20px';
        input.style.border = '1px solid #ddd';
        input.style.borderRadius = '6px';
        input.style.fontSize = '14px';
        
        // 显示对话框并聚焦输入框
        setTimeout(() => {
            dialog.classList.add('show');
            input.focus();
            input.select(); // 全选文本，方便编辑
        }, 10);
        
        // 取消按钮
        const cancelBtn = content.querySelector('.confirm-cancel');
        cancelBtn.onclick = () => {
            dialog.classList.remove('show');
            setTimeout(() => dialog.remove(), 300);
        };
        
        // 确认按钮
        const okBtn = content.querySelector('.confirm-ok');
        okBtn.onclick = () => {
            const newTitle = input.value.trim();
            if (newTitle) {
                updateConversationTitle(conversationId, newTitle);
            }
            dialog.classList.remove('show');
            setTimeout(() => dialog.remove(), 300);
        };
        
        // 按Enter键确认
        input.addEventListener('keypress', (e) => {
            if (e.key === 'Enter') {
                okBtn.click();
            }
        });
    }

    // 新增函数：更新侧边栏中的活动对话项
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
            let pending = JSON.parse(localStorage.getItem('pending_ai_messages') || '[]');
            for (const item of pending) {
                const { messageData } = item;
                const mid = messageData.message_id;
                if (active[mid]) {
                    // DOM 中如果还没创建加载条则先创建
                    createLoadingMessage(mid, messageData.model);
                    // 续流
                    await getAIResponse(messageData, state.currentConversationId, mid);
                    // 移除 pending
                    pending = JSON.parse(localStorage.getItem('pending_ai_messages') || '[]')
                        .filter(i => i.messageData.message_id !== mid);
                    localStorage.setItem('pending_ai_messages', JSON.stringify(pending));
                }
            }
        } catch (e) {
            console.error('续流失败:', e);
        }
    }

    // 初始化页面
    document.addEventListener('DOMContentLoaded', init);

    // 全局复制按钮添加函数，可以从控制台调用
    window.addCopyButtonsToAllCodeBlocks = function () {
        console.log('手动添加复制按钮到所有代码块...');
        const allContainers = document.querySelectorAll('.message-content');
        console.log('找到消息内容容器数量:', allContainers.length);
        
        allContainers.forEach((container, index) => {
            console.log(`处理第${index + 1}个消息容器`);
            addCopyButtonsToCodeBlocks(container);
        });
        
        console.log('复制按钮添加完成');
    };

    // 在页面完全加载后运行复制按钮添加
    window.addEventListener('load', function () {
        console.log('页面完全加载，运行复制按钮添加...');
        setTimeout(window.addCopyButtonsToAllCodeBlocks, 500);
    });

    // 加载侧边栏状态
    async function loadSidebarState() {
        try {
            const response = await fetch('/get-sidebar-state');
            if (!response.ok) {
                throw new Error('获取侧边栏状态失败');
            }
            
            const data = await response.json();
            
            // 根据服务器返回状态设置侧边栏
            state.isSidebarCollapsed = !data.isOpen;
            
            if (state.isSidebarCollapsed) {
                elements.sidebar.classList.add('collapsed');
                elements.collapseBtn.classList.add('collapsed');
            } else {
                elements.sidebar.classList.remove('collapsed');
                elements.collapseBtn.classList.remove('collapsed');
            }
            
            console.log('已加载侧边栏状态:', data.isOpen ? '打开' : '关闭');
        } catch (error) {
            console.error('加载侧边栏状态时出错:', error);
            // 默认保持现有状态或使用默认状态
        }
    }

    // ====================== 用户资料模态窗口 ======================
    function setupUserProfileModal() {
        // 当用户资料模态框打开时，获取会员信息和余额信息
        const userProfileModal = document.getElementById('user-profile-modal');
        if (userProfileModal) {
            userProfileModal.addEventListener('show', () => {
                fetchUserMembershipInfo();
                fetchUserBalanceInfo();
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
            const moneyRedeemBtn = document.getElementById('money-redeem-btn');
            const moneyCodeInput = document.getElementById('money-code-input');
            const moneyRedeemResult = document.getElementById('money-redeem-result');
            
            if (moneyRedeemBtn && moneyCodeInput && moneyRedeemResult) {
                moneyRedeemBtn.addEventListener('click', async () => {
                    // 调用统一的余额充值码处理函数
                    redeemMoneyCode();
                });
                
                // 支持回车键提交
                moneyCodeInput.addEventListener('keypress', (e) => {
                    if (e.key === 'Enter') {
                        moneyRedeemBtn.click();
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
        // 当用户资料模态框打开时，获取会员信息和余额信息
        const userProfileModal = document.getElementById('user-profile-modal');
        if (userProfileModal) {
            userProfileModal.addEventListener('show', () => {
                fetchUserMembershipInfo();
                fetchUserBalanceInfo();
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
            const moneyRedeemBtn = document.getElementById('money-redeem-btn');
            const moneyCodeInput = document.getElementById('money-code-input');
            const moneyRedeemResult = document.getElementById('money-redeem-result');
            
            if (moneyRedeemBtn && moneyCodeInput && moneyRedeemResult) {
                moneyRedeemBtn.addEventListener('click', async () => {
                    // 调用统一的余额充值码处理函数
                    redeemMoneyCode();
                });
                
                // 支持回车键提交
                moneyCodeInput.addEventListener('keypress', (e) => {
                    if (e.key === 'Enter') {
                        moneyRedeemBtn.click();
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
        const currentUsername = document.getElementById('profile-username').textContent;

        if (displayEl && editEl && usernameInput) {
            displayEl.style.display = 'none';
            editEl.style.display = 'flex';
            usernameInput.value = currentUsername;
            usernameInput.focus();
            usernameInput.select();
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

    // 显示/隐藏密码修改表单
    function togglePasswordForm() {
        const passwordForm = document.getElementById('password-change-form');
        const changePasswordBtn = document.getElementById('change-password-btn');

        if (passwordForm.style.display === 'none' || !passwordForm.style.display) {
            passwordForm.style.display = 'block';
            changePasswordBtn.style.display = 'none';

            // 清空表单
            document.getElementById('current-password').value = '';
            document.getElementById('new-password').value = '';
            document.getElementById('confirm-password').value = '';
        } else {
            passwordForm.style.display = 'none';
            changePasswordBtn.style.display = 'block';
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
     * @param {string} currentTitle - 当前标题内容
     */
    function makeConversationTitleEditable(conversationId, titleElement, currentTitle) {
        // 保存原始标题内容和样式
        const originalTitle = currentTitle;
        const originalDisplay = titleElement.style.display;
        
        // 创建输入框
        const inputElement = document.createElement('input');
        inputElement.type = 'text';
        inputElement.value = originalTitle;
        inputElement.className = 'conversation-title-edit';
        inputElement.style.width = '100%';
        inputElement.style.boxSizing = 'border-box';
        inputElement.style.padding = '4px 8px';
        inputElement.style.border = '1px solid #ccc';
        inputElement.style.borderRadius = '4px';
        inputElement.style.fontSize = '14px';
        
        // 隐藏原标题元素
        titleElement.style.display = 'none';
        // 将输入框插入到标题元素后面
        titleElement.parentNode.insertBefore(inputElement, titleElement.nextSibling);
        // 自动聚焦输入框并选择全部文本
        inputElement.focus();
        inputElement.select();
        
        // 处理回车键提交
        inputElement.addEventListener('keydown', function(e) {
            if (e.key === 'Enter') {
                submitTitleEdit();
            } else if (e.key === 'Escape') {
                cancelTitleEdit();
            }
        });
        
        // 处理失去焦点时提交
        inputElement.addEventListener('blur', function() {
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
                console.log('生成的权益HTML:', privilegesHTML);
            
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
        const existingModal = document.getElementById('confirmDialog');
        if (existingModal) {
            document.body.removeChild(existingModal);
        }
        
        // 创建模态对话框
        const modalHTML = `
        <div class="modal fade" id="confirmDialog" tabindex="-1" role="dialog" aria-labelledby="confirmDialogLabel" aria-hidden="true">
            <div class="modal-dialog" role="document">
                <div class="modal-content">
                    <div class="modal-header">
                        <h5 class="modal-title" id="confirmDialogLabel">确认操作</h5>
                        <button type="button" class="close" data-dismiss="modal" aria-label="Close">
                            <span aria-hidden="true">&times;</span>
                        </button>
                    </div>
                    <div class="modal-body">
                        ${message}
                    </div>
                    <div class="modal-footer">
                        <button type="button" class="btn btn-secondary" data-dismiss="modal">取消</button>
                        <button type="button" class="btn btn-primary" id="confirmDialogConfirmBtn">确认</button>
                    </div>
                </div>
            </div>
        </div>
        `;
        
        // 添加到文档
        const modalContainer = document.createElement('div');
        modalContainer.innerHTML = modalHTML;
        document.body.appendChild(modalContainer.firstElementChild);
        
        // 获取对话框元素
        const modalElement = document.getElementById('confirmDialog');
        const confirmBtn = document.getElementById('confirmDialogConfirmBtn');
        
        // 设置显示样式
        modalElement.style.display = 'flex';
        modalElement.style.backgroundColor = 'rgba(0, 0, 0, 0.5)';
        modalElement.style.zIndex = '9999';
        
        // 添加show类
        modalElement.classList.add('show');
        
        // 输出调试信息
        console.log('模态框显示状态:', {
            display: getComputedStyle(modalElement).display,
            zIndex: getComputedStyle(modalElement).zIndex,
            classList: [...modalElement.classList]
        });
        
        // 点击确认按钮执行回调
        confirmBtn.addEventListener('click', function() {
            console.log('点击确认按钮');
            closeModal();
            if (typeof confirmCallback === 'function') {
                confirmCallback();
            }
        });
        
        // 点击关闭按钮关闭对话框
        const closeBtn = modalElement.querySelector('.close');
        if (closeBtn) {
            closeBtn.addEventListener('click', closeModal);
        }
        
        // 点击取消按钮关闭对话框
        const cancelBtn = modalElement.querySelector('.btn-secondary');
        if (cancelBtn) {
            cancelBtn.addEventListener('click', closeModal);
        }
        
        // 点击模态框外部关闭对话框
        modalElement.addEventListener('click', function(event) {
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
    document.addEventListener('DOMContentLoaded', function() {
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
        
        // 余额充值按钮
        document.getElementById('money-redeem-btn')?.addEventListener('click', redeemMoneyCode);
        
        // 注销账号按钮
        elements.deactivateAccountBtn?.addEventListener('click', openDeactivateModal);
        
        // 关闭注销弹窗按钮
        elements.closeDeactivateModalBtn?.addEventListener('click', closeDeactivateModal);
        
        // 取消注销按钮
        elements.cancelDeactivateBtn?.addEventListener('click', closeDeactivateModal);
        
        // 确认注销按钮
        elements.confirmDeactivateBtn?.addEventListener('click', deactivateAccount);
    }

    // 获取用户余额信息函数
    async function fetchUserBalanceInfo() {
        if (!state.currentUser || !state.currentUser.id) {
            console.error('获取余额信息失败：用户未登录');
            return {
                success: false,
                balance: 0,
                formatted_balance: "¥0.00"
            };
        }
        
        try {
            const response = await fetch(`/money/get_balance/${state.currentUser.id}`);
            
            if (!response.ok) {
                throw new Error('获取余额信息失败');
            }
            
            const balanceData = await response.json();
            
            if (balanceData.success) {
                // 更新余额显示
                const balanceDisplay = document.getElementById('balance-display');
                if (balanceDisplay) {
                    balanceDisplay.innerHTML = `
                        <div class="balance-card">
                            <div class="balance-header">
                                <span>我的余额</span>
                            </div>
                            <div class="balance-amount">${balanceData.formatted_balance}</div>
                        </div>
                    `;
                }
                
                // 如果余额不足，禁用发送按钮
                if (balanceData.balance <= 0) {
                    const sendButton = document.getElementById('send-button');
                    if (sendButton) {
                        sendButton.disabled = true;
                        sendButton.title = '余额不足，请充值后使用';
                    }
                    
                    // 余额不足时不弹提示，提示仅在发送时显示
                } else {
                    // 确保发送按钮启用
                    const sendButton = document.getElementById('send-button');
                    if (sendButton && sendButton.title === '余额不足，请充值后使用') {
                        sendButton.disabled = false;
                        sendButton.title = '';
                    }
                }
                
                return balanceData;
            } else {
                throw new Error(balanceData.message || '获取余额信息失败');
            }
            
        } catch (error) {
            console.error('获取余额信息时出错:', error);
            
            // 显示错误信息
            const balanceDisplay = document.getElementById('balance-display');
            if (balanceDisplay) {
                balanceDisplay.innerHTML = '<div class="error-message">获取余额信息失败</div>';
            }
            
            return {
                success: false,
                balance: 0,
                formatted_balance: "¥0.00"
            };
        }
    }
    
    // 在发送消息前检查余额
    async function checkBalanceBeforeSend() {
        if (!state.currentUser || !state.currentUser.id) {
            return true; // 匿名用户不检查余额
        }
        
        try {
            // 获取当前选择的模型
            const currentModel = getSelectedModel();
            
            // 检查模型免费次数
            const modelUsage = await fetchModelFreeUsageInfo(currentModel);
            console.log('模型使用信息:', modelUsage);
            
            // 如果是无限次数（SVIP），直接允许发送
            if (modelUsage.limit === -1 || modelUsage.remaining === -1) {
                return true;
            }
            
            // 如果还有免费次数，直接允许发送
            if (modelUsage.remaining > 0) {
                return true;
            }
            
            // 没有免费次数，检查余额
            const balanceData = await fetchUserBalanceInfo();
            if (!balanceData.success || balanceData.balance <= 0) {
                showToast('您今日免费使用次数已用完，且余额不足，请充值后继续使用', 'danger');
                return false;
            }
            return true;
        } catch (error) {
            console.error('检查余额和免费次数时出错:', error);
            return true; // 出错时允许发送，后端会再次检查
        }
    }

    // 获取模型的免费使用次数信息
    async function fetchModelFreeUsageInfo(modelName) {
        try {
            // 构建请求URL，包含用户ID
            let url = `/api/model/free_usage?model=${encodeURIComponent(modelName)}`;
            
            // 如果有当前用户信息，添加user_id参数
            if (state.currentUser && state.currentUser.id) {
                url += `&user_id=${state.currentUser.id}`;
            }
            
            const response = await fetch(url);
            if (!response.ok) {
                throw new Error('获取模型免费使用次数信息失败');
            }
            const data = await response.json();
            
            if (!data.success) {
                throw new Error(data.message || '获取模型免费使用次数信息失败');
            }
            
            return {
                current: data.current,
                limit: data.limit,
                remaining: data.remaining
            };
        } catch (error) {
            console.error('获取模型免费使用次数信息失败:', error);
            return {
                current: 0,
                limit: 0,
                remaining: 0
            };
        }
    }
    
    // 更新所有模型的免费使用次数显示
    async function updateAllModelsFreeUsage() {
        const modelOptions = document.querySelectorAll('.model-option');
        for (const option of modelOptions) {
            const modelName = option.getAttribute('data-value');
            try {
                const usageInfo = await fetchModelFreeUsageInfo(modelName);
                
                // 查找或创建免费次数显示元素
                let freeUsageDisplay = option.querySelector('.free-usage-display');
                if (!freeUsageDisplay) {
                    freeUsageDisplay = document.createElement('div');
                    freeUsageDisplay.className = 'free-usage-display';
                    option.appendChild(freeUsageDisplay);
                }
                
                // 创建无穷符号SVG
                const infinitySvg = `
                    <svg class="infinity-icon" width="24" height="14" viewBox="0 0 24 14" fill="none" xmlns="http://www.w3.org/2000/svg" style="vertical-align: middle;">
                        <path d="M9.12 13.8C7.36 13.8 5.832 13.172 4.536 11.916C3.24 10.62 2.592 9.092 2.592 7.332C2.592 5.572 3.24 4.064 4.536 2.808C5.832 1.512 7.36 0.863999 9.12 0.863999C10.88 0.863999 12.368 1.512 13.584 2.808L12.096 4.296C11.2 3.32 10.176 2.832 9.024 2.832C7.872 2.832 6.892 3.24 6.084 4.056C5.316 4.832 4.932 5.852 4.932 7.116C4.932 8.38 5.316 9.42 6.084 10.236C6.892 11.012 7.872 11.4 9.024 11.4C10.176 11.4 11.2 10.912 12.096 9.936L13.584 11.424C12.368 12.68 10.88 13.8 9.12 13.8Z" fill="currentColor"/>
                        <path d="M14.88 13.8C13.12 13.8 11.592 13.172 10.296 11.916C9 10.62 8.352 9.092 8.352 7.332C8.352 5.572 9 4.064 10.296 2.808C11.592 1.512 13.12 0.863999 14.88 0.863999C16.64 0.863999 18.128 1.512 19.344 2.808L17.856 4.296C16.96 3.32 15.936 2.832 14.784 2.832C13.632 2.832 12.652 3.24 11.844 4.056C11.076 4.832 10.692 5.852 10.692 7.116C10.692 8.38 11.076 9.42 11.844 10.236C12.652 11.012 13.632 11.4 14.784 11.4C15.936 11.4 16.96 10.912 17.856 9.936L19.344 11.424C18.128 12.68 16.64 13.8 14.88 13.8Z" fill="currentColor"/>
                    </svg>
                `;
                
                // 更新显示内容
                const isInfinite = usageInfo.limit === -1;
                freeUsageDisplay.innerHTML = isInfinite ? 
                    `<span class="free-usage-remaining"><img src="/static/icons/infinity.svg" alt="无限" style="height: 20px; vertical-align: middle;"></span>` : 
                    `<span class="free-usage-remaining">${usageInfo.remaining}</span>/<span class="free-usage-limit">${usageInfo.limit}</span>`;
                
                // 添加样式
                if (isInfinite) {
                    freeUsageDisplay.style.color = '#4CAF50'; // 使用绿色表示无限
                    freeUsageDisplay.style.display = 'inline-flex';
                    freeUsageDisplay.style.alignItems = 'center';
                    freeUsageDisplay.style.gap = '2px';
                }
                
                // 如果剩余次数为0且不是无限次数，添加警告样式
                if (!isInfinite && usageInfo.remaining <= 0) {
                    freeUsageDisplay.classList.add('depleted');
                } else {
                    freeUsageDisplay.classList.remove('depleted');
                }
            } catch (error) {
                console.error(`获取模型${modelName}免费使用次数失败:`, error);
            }
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
        showConfirmDialog('您确定要注销账号吗？此操作不可撤销，所有数据将被永久删除。', async function() {
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
        document.getElementById('vip-code-input')?.addEventListener('keypress', function(e) {
            if (e.key === 'Enter') {
                e.preventDefault();
                redeemVIPCode();
            }
        });
        
        // 余额充值码输入框回车键处理
        document.getElementById('money-code-input')?.addEventListener('keypress', function(e) {
            if (e.key === 'Enter') {
                e.preventDefault();
                redeemMoneyCode();
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
    
    // 余额充值码兑换函数
    async function redeemMoneyCode() {
        const codeInput = document.getElementById('money-code-input');
        const resultDisplay = document.getElementById('money-redeem-result');
        const redeemButton = document.getElementById('money-redeem-btn');
        
        if (!codeInput || !resultDisplay || !redeemButton) {
            console.error('余额充值码相关元素未找到');
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
            
            const response = await fetch('/money/redeem', {
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
                
                // 刷新余额信息
                await fetchUserBalanceInfo();
                
                // 显示成功提示
                showToast('余额充值成功！', 'success');
            } else {
                resultDisplay.textContent = data.message || '充值失败，请检查充值码是否有效';
                resultDisplay.className = 'redeem-result error';
            }
        } catch (error) {
            console.error('处理余额充值码时出错:', error);
            resultDisplay.textContent = '充值过程中发生错误，请稍后重试';
            resultDisplay.className = 'redeem-result error';
        } finally {
            // 恢复按钮状态
            redeemButton.disabled = false;
        }
    }
});