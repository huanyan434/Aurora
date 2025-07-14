<template>
	<n-config-provider :theme-overrides="themeOverrides">
		<!-- 加载中的Logo -->
		<div class="loading-logo-container" id="loading-logo-container" ref="loadingLogoContainer">
			<img src="/static/icon.png" alt="Aurora Logo" class="loading-logo">
			<img src="/static/icon_dark.png" alt="Aurora Logo" class="loading-logo-dark">
		</div>

		<div class="app-container hide-on-load" id="app-container" ref="appContainer">
			<!-- 遮罩层 -->
			<div class="sidebar-overlay" ref="sidebarOverlay"></div>


			<!-- 侧边栏 -->
			<div class="conversation-sidebar" ref="conversationSidebar">
				<div class="sidebar-header">
					<div class="aurora-title">
						<img src="/static/icon.png" alt="Aurora Logo" class="aurora-logo light-mode-logo">
						<span>Aurora</span>
					</div>
					<button id="new-chat-btn" class="new-chat-btn" ref="newChatBtn">
						<i class="iconfont icon-plus"></i>
						<span>新建对话</span>
					</button>
					<!-- 移动端侧边栏内部切换按钮 -->
					<button class="sidebar-toggle-inside" aria-label="切换侧边栏" ref="sidebarToggleInsideBtn">
						<i class="iconfont sidebar-toggle-icon"></i>
					</button>
				</div>

				<!-- 对话列表 -->
				<div class="conversation-list" id="conversations-list" ref="conversationListContainer">
					<!-- 对话列表项会通过 JavaScript 动态添加 -->
				</div>

				<!-- 用户信息 -->
				<div class="user-profile-container" ref="userProfileContainer">
					<div @click="openUserProfileModal" class="user-profile">
						<div v-if="current_user.is_authenticated" class="user-avatar">
							{{ current_user.username_upper }}
						</div>
						<div v-else class="user-avatar">
							<i class="bi bi-person"></i>
						</div>
						<div class="user-info">
							<div v-if="current_user.is_authenticated" class="user-name" id="user-name-display">
								{{ current_user.username }}
							</div>
							<div v-else class="user-name" id="user-name-display">
								游客
							</div>
							<div v-if="current_user.is_authenticated" class="user-status">
								在线
							</div>
							<div v-else class="user-status">
								未登录
							</div>
						</div>
					</div>
				</div>
			</div>

			<!-- 侧边栏切换按钮 -->
			<button class="sidebar-toggle" ref="sidebarToggleBtn">
				<i class="iconfont sidebar-toggle-icon"></i>
			</button>

			<!-- 主聊天区域 -->
			<ChatMain :onlineSearch="onlineSearch" :onlineSearchDisabled="onlineSearchDisabled"
				:onlineSearchActive="onlineSearchActive" />

			<!-- 用户弹窗 -->
			<div id="user-profile-modal" class="user-modal" ref="userProfileModal" @click="closeUserProfileModal">
				<div class="user-modal-content">
					<div class="user-modal-header">
						<h3>个人信息</h3>
						<span class="close-modal" ref="userProfileModalClose"
							@click="closeUserProfileModal">&times;</span>
					</div>
					<div class="user-modal-body">
						<n-layout has-sider>
							<n-layout-sider width="130px" style="background-color: transparent;">
								<n-menu :value="activeKeyUser" :options="menuOptionsUser"
									@update:value="handleUpdateValue" />
							</n-layout-sider>
							<n-layout-content v-if="activeKeyUser === 'account'" class="user-modal-body-content">
								<!-- 用户名修改 -->
								<div class="user-info-section">
									<h4>用户信息</h4>
									<div class="username-display">
										<span v-if="current_user.is_authenticated" id="profile-username">
											{{ current_user.username }}
										</span>
										<span v-else id="profile-username">
											游客
										</span>

										<div v-if="current_user.is_authenticated" class="user-buttons">
											<button class="edit-username-btn">
												<i class="bi bi-pencil"></i>
											</button>
											<button id="change-password-btn" class="edit-password-btn">
												<i class="bi bi-key"></i>
											</button>
										</div>
									</div>
									<div v-if="current_user.is_authenticated" class="username-edit"
										style="display: none;">
										<input type="text" id="username-input" value="{{ current_user.username }}">
										<button id="save-username-btn">保存</button>
										<button id="cancel-username-btn">取消</button>
									</div>
									<div v-else class="login-prompt">
										<p>请先登录以使用完整功能</p>
										<button onclick="window.location.href='/auth/login'" class="login-btn">
											<i class="bi bi-box-arrow-in-right"></i> 登录
										</button>
										<button onclick="window.location.href='/auth/signup'" class="signup-btn">
											<i class="bi bi-person-plus"></i> 注册
										</button>
									</div>
									<!-- 注销账号 -->
									<div v-if="current_user.is_authenticated" class="user-info-section">
										<div class="account-actions">
											<button type="button" id="deactivate-account-btn" class="danger-button"
												ref="deactivateAccountBtn">
												<i class="bi bi-exclamation-triangle"></i> 注销账号
											</button>
										</div>
									</div>
								</div>
							</n-layout-content>
							<n-layout-content v-if="activeKeyUser === 'vip'" class="user-modal-body-content">
								<!-- 获取兑换码链接 -->
								<div class="get-code-section">
									<a href="https://afdian.com/a/mchyj" target="_blank" class="get-code-link">
										<i class="bi bi-gift"></i> 赞助 & 获取兑换码
									</a>
								</div>
								<!-- 会员信息 -->
								<div v-if="current_user.is_authenticated" class="user-info-section">
									<h4>会员状态</h4>
									<div id="membership-info">
										<div class="loading-spinner">加载中...</div>
									</div>
								</div>

								<!-- 会员权益 -->
								<div v-if="current_user.is_authenticated" class="user-info-section">
									<h4>会员权益</h4>
									<div id="membership-privileges">
										<!-- 会员权益列表将通过JavaScript动态添加 -->
									</div>
								</div>

								<!-- 会员兑换 -->
								<div v-if="current_user.is_authenticated" class="user-info-section">
									<h4>会员兑换</h4>
									<div class="redeem-section">
										<div class="redeem-form">
											<input type="text" id="vip-code-input" placeholder="输入会员兑换码"
												class="redeem-input" />
											<button type="button" id="vip-redeem-btn" class="redeem-button">兑换</button>
										</div>
										<div id="vip-redeem-result" class="redeem-result"></div>
									</div>
								</div>
							</n-layout-content>
							<n-layout-content v-if="activeKeyUser === 'points'" class="user-modal-body-content">
								<!-- 积分信息 -->
								<div v-if="current_user.is_authenticated" class="user-info-section" id="points-section">
									<h4>积分信息</h4>
									<div id="points-display">
										<div class="loading-spinner">加载中...</div>
									</div>
									<div class="sign-container">
										<button id="sign-btn">签到</button>
									</div>
								</div>
								<div v-if="current_user.is_authenticated" class="user-info-section" id="points-section">
									<!-- 积分充值 -->
									<div class="redeem-section">
										<h4>充值码兑换</h4>
										<div class="redeem-form">
											<input type="text" id="points-code-input" placeholder="输入充值码"
												class="redeem-input" />
											<button type="button" id="points-redeem-btn"
												class="redeem-button">充值</button>
										</div>
										<div id="points-redeem-result" class="redeem-result"></div>
									</div>
								</div>
							</n-layout-content>
						</n-layout>
					</div>
				</div>
			</div>

			<!-- 密码修改弹窗 -->
			<div id="password-modal" class="user-modal" ref="passwordModal">
				<div class="user-modal-content">
					<div class="user-modal-header">
						<h3>修改密码</h3>
						<span class="close-password-modal">&times;</span>
					</div>
					<div class="user-modal-body">
						<div id="password-form">
							<div class="password-field">
								<label for="current-password">当前密码</label>
								<input type="password" id="current-password" placeholder="请输入当前密码">
							</div>
							<div class="password-field">
								<label for="new-password">新密码</label>
								<input type="password" id="new-password" placeholder="请输入新密码">
							</div>
							<div class="password-field">
								<label for="confirm-password">确认新密码</label>
								<input type="password" id="confirm-password" placeholder="请再次输入新密码">
							</div>
							<div class="password-notice">
								<p>· 密码长度不能少于6个字符</p>
								<p>· 建议使用字母、数字和符号的组合</p>
							</div>
							<div class="password-buttons">
								<button id="save-password-btn" ref="savePasswordBtn">保存</button>
								<button id="cancel-password-btn" ref="cancelPasswordBtn">取消</button>
							</div>
						</div>
					</div>
				</div>
			</div>

			<!-- 注销账号确认弹窗 -->
			<div id="deactivate-modal" class="user-modal" ref="deactivateModal">
				<div class="user-modal-content">
					<div class="user-modal-header">
						<h3>注销账号确认</h3>
						<span class="close-deactivate-modal">&times;</span>
					</div>
					<div class="user-modal-body">
						<div class="deactivate-warning">
							<i class="bi bi-exclamation-triangle-fill text-danger"></i>
							<p class="warning-text">请注意：注销账号将会<strong>永久删除</strong>您的所有数据和会话历史，此操作<strong>不可撤销</strong>。
							</p>
						</div>
						<div class="deactivate-info">
							<p>注销后，您将丢失以下内容：</p>
							<ul>
								<li>所有聊天记录和会话历史</li>
								<li>账号关联的会员状态</li>
								<li>账号中剩余的积分</li>
							</ul>
						</div>
						<div class="countdown-section">
							<p>为确保您理解此操作的严重性，请等待 <span id="countdown-timer">5</span> 秒后再确认。</p>
						</div>
						<div class="deactivate-buttons">
							<button id="confirm-deactivate-btn" class="danger-button" disabled
								ref="confirmDeactivateBtn">确定注销</button>
							<button id="cancel-deactivate-btn" ref="cancelDeactivateBtn">取消</button>
						</div>
					</div>
				</div>
			</div>
		</div>
	</n-config-provider>
</template>

<script setup>
import { ref, onMounted } from 'vue'
import ChatMain from './components/ChatMain.vue'
import axios from 'axios'
import { computed } from 'vue'

// --- 响应式数据 ---
const current_user = ref({
	username: "",
	username_upper: "",
	is_authenticated: false
})

const onlineSearchDisabled = ref(false)
const onlineSearchActive = ref(false)
const activeKeyUser = ref("account")

const menuOptionsUser = [
	{
		label: '账户管理',
		key: 'account'
	},
	{
		label: '会员中心',
		key: 'vip'
	},
	{
		label: '积分中心',
		key: 'points'
	},
	{
		label: '退出登录',
		key: 'logout',
		style: {
			color: '#ff4d4f'
		}
	}
]

const themeOverrides = computed(() => ({
	common: {
		primaryColor: '#4361ee',
		primaryColorHover: '#5c77f2',
		primaryColorPressed: '#324bc2',
		primaryColorSuppl: '#5c77f2'
	}
}))

// --- 元素引用 ---

// 主
const loadingLogoContainer = ref(null)
const appContainer = ref(null)

// 侧边栏元素
const conversationSidebar = ref(null)
const sidebarOverlay = ref(null)
const newChatBtn = ref(null)
const sidebarToggleBtn = ref(null)
const sidebarToggleInsideBtn = ref(null)
const conversationListContainer = ref(null)
const userProfileContainer = ref(null)

// 预制弹窗
const userProfileModal = ref(null)
const userProfileModalClose = ref(null)
const passwordModal = ref(null)
const deactivateModal = ref(null)

const deactivateAccountBtn = ref(null)
const savePasswordBtn = ref(null)
const cancelPasswordBtn = ref(null)
const confirmDeactivateBtn = ref(null)
const cancelDeactivateBtn = ref(null)

// --- 状态对象（reactive）---
const state = ref({
	currentConversationId: null,
	isSending: false,
	isLoading: false,
	conversations: [],  // 存储对话列表
	isSidebarCollapsed: conversationSidebar.value?.classList.contains('collapsed') || false,
	currentModel: localStorage.getItem('selectedModel') || 'DeepSeek-R1',  // 从localStorage中获取模型
	isNearBottom: false,
	abortController: null,  // 添加中断控制器
	selectedImage: null,    // 存储选择的图片
	currentUser: {          // 当前用户信息
		id: null,
		username: null,
		email: null,
		member_level: null
	}
})

// --- 方法定义 ---
async function init() {
	try {
		const res = await axios.get('/api/user/current')
		current_user.value.username = res.data.username
		current_user.value.username_upper = res.data.username[0].toUpperCase()
		if (current_user.value.username) {
			current_user.value.is_authenticated = true
		}
		state.value.currentUser.id = res.data.id
		state.value.currentUser.username = res.data.username
		state.value.currentUser.email = res.data.email
		state.value.currentUser.member_level = res.data.member_level
	} catch (err) {
		console.error(err)
	}

	// 显示 app-container
	if (appContainer.value) {
		appContainer.value.className = 'app-container'
	}

	// 加载完成后隐藏 loadingLogoContainer
	if (loadingLogoContainer.value) {
		loadingLogoContainer.value.style.display = 'none'
	}
}

function onlineSearch() {
	onlineSearchActive.value = !onlineSearchActive.value
}

function openUserProfileModal() {
	if (userProfileModal.value) {
		userProfileModal.value.className = 'user-modal show'
	}
}

function closeUserProfileModal(event) {
	if (event.target === userProfileModal.value || event.target === userProfileModalClose.value && userProfileModal.value) {
		userProfileModal.value.className = 'user-modal'
	}
}

function handleUpdateValue(key) {
	if (key === 'logout') {
		window.location.href = '/auth/logout'
	} else {
		activeKeyUser.value = key
	}
}

// --- 生命周期钩子 ---
onMounted(() => {
	init()
})
</script>

<style>
.loading-logo-container {
	position: fixed;
	top: 0;
	left: 0;
	width: 100%;
	height: 100%;
	display: flex;
	justify-content: center;
	align-items: center;
	background: #f8f9fa;
	z-index: 9999;
}

.loading-logo {
	width: 150px;
	height: auto;
	animation: pulse 1.5s infinite ease-in-out;
}

.loading-logo-dark {
	width: 150px;
	height: auto;
	animation: pulse 1.5s infinite ease-in-out;
	display: none;
}

@keyframes pulse {
	0% {
		transform: scale(1);
	}

	50% {
		transform: scale(1.05);
	}

	100% {
		transform: scale(1);
	}
}

.hide-on-load {
	display: none;
}

@media (prefers-color-scheme: dark) {
	.loading-logo-container {
		background: #121212;
	}

	.loading-logo {
		display: none;
	}

	.loading-logo-dark {
		display: block !important;
	}
}
</style>