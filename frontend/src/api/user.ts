// 用户登录
export interface LoginRequest {
  email: string
  password: string
}

export interface LoginResponseSuccess {
  message: string
  success: true
}

export interface LoginResponseFailed {
  message: string
  success: false
}

export const login = async (data: LoginRequest) => {
  const response = await fetch('/api/login', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(data),
  })

  if (!response.ok) {
    throw new Error(`HTTP error! status: ${response.status}`)
  }

  const responseData = await response.json()
  return {
    data: responseData
  }
}

// 用户注册
export interface SignupRequest {
  username: string
  email: string
  password: string
  verifyCode: string
}

export interface SignupUser {
  id: string
  username: string
  email: string
}

export interface SignupResponseSuccess {
  message: string
  success: true
  user: SignupUser
}

export interface SignupResponseFailed {
  message: string
  success: false
}

export const signup = async (data: SignupRequest) => {
  const response = await fetch('/api/signup', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(data),
  })

  if (!response.ok) {
    throw new Error(`HTTP error! status: ${response.status}`)
  }

  const responseData = await response.json()
  return {
    data: responseData
  }
}

// 发送验证码
export interface SendVerifyCodeRequest {
  email: string
}

export interface SendVerifyCodeResponseSuccess {
  message: string
  success: true
}

export interface SendVerifyCodeResponseFailed {
  message: string
  success: false
}

export const sendVerifyCode = async (data: SendVerifyCodeRequest) => {
  const response = await fetch('/api/send_verify_code', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(data),
  })

  if (!response.ok) {
    throw new Error(`HTTP error! status: ${response.status}`)
  }

  const responseData = await response.json()
  return {
    data: responseData
  }
}

// 获取当前用户信息
export interface CurrentUserResponseSuccess {
  email: string
  id: string
  isMember: boolean
  memberLevel: string
  points: number
  success: true
  username: string
}

export interface CurrentUserResponseFailed {
  success: false
}

export const getCurrentUser = async () => {
  const response = await fetch('/api/current_user')

  if (!response.ok) {
    throw new Error(`HTTP error! status: ${response.status}`)
  }

  const responseData = await response.json()
  return {
    data: responseData
  }
}

// 获取签到状态
export interface HasSignedResponseSuccess {
  signed: boolean
  success: true
}

export interface HasSignedResponseFailed {
  error: string
  success: false
}

export const getHasSigned = async () => {
  const response = await fetch('/api/has_signed')

  if (!response.ok) {
    throw new Error(`HTTP error! status: ${response.status}`)
  }

  const responseData = await response.json()
  return {
    data: responseData
  }
}

// 用户签到
export interface SignResponseSuccess {
  data: any
  message: string
  success: true
}

export interface SignResponseFailed {
  message: string
  success: false
}

export const sign = async () => {
  const response = await fetch('/api/sign', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
  })

  if (!response.ok) {
    throw new Error(`HTTP error! status: ${response.status}`)
  }

  const responseData = await response.json()
  return {
    data: responseData
  }
}

// 验证积分充值
export interface VerifyPointsRequest {
  orderID: string
}

export interface VerifyPointsResponseSuccess {
  success: true
}

export interface VerifyPointsResponseFailed {
  message: string
  success: false
}

export const verifyPoints = async (data: VerifyPointsRequest) => {
  const response = await fetch('/api/verify_points', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(data),
  })

  if (!response.ok) {
    throw new Error(`HTTP error! status: ${response.status}`)
  }

  const responseData = await response.json()
  return {
    data: responseData
  }
}

// 验证VIP会员
export interface VerifyVipRequest {
  orderID: string
  force: boolean
}

export interface VerifyVipResponseSuccess {
  success: true
}

export interface VerifyVipResponseFailed {
  message: string
  success: false
}

export const verifyVip = async (data: VerifyVipRequest) => {
  const response = await fetch('/api/verify_vip', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(data),
  })

  if (!response.ok) {
    throw new Error(`HTTP error! status: ${response.status}`)
  }

  const responseData = await response.json()
  return {
    data: responseData
  }
}

// 用户退出登录
export interface LogoutResponseSuccess {
  message: string
  success: true
}

export interface LogoutResponseFailed {
  message: string
  success: false
}

export const logout = async () => {
  const response = await fetch('/api/logout', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
  })

  if (!response.ok) {
    throw new Error(`HTTP error! status: ${response.status}`)
  }

  const responseData = await response.json()
  return {
    data: responseData
  }
}