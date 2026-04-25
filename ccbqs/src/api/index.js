const API_BASE = '/api'

//  Core Fetch 
export async function apiFetch(path, options = {}) {
  const token = localStorage.getItem('cq_token')
  const headers = { ...options.headers }

  if (!(options.body instanceof FormData)) {
    headers['Content-Type'] = 'application/json'
  }
  if (token) headers['Authorization'] = `Bearer ${token}`

  let res
  try {
    res = await fetch(`${API_BASE}${path}`, { ...options, headers })
  } catch {
    throw new Error('Network error — is the server running?')
  }

  if (res.status === 401) {
    localStorage.removeItem('cq_token')
    localStorage.removeItem('cq_user')
    if (!window.location.pathname.includes('/login')) {
      window.location.href = '/login'
    }
    return
  }

  if (res.status === 204) return null

  let data = {}
  try { data = await res.json() } catch { /* empty body */ }

  if (!res.ok) {
    let msg
    if (Array.isArray(data.detail)) {
      msg = data.detail.map(e => e.msg || e.message || JSON.stringify(e)).join(', ')
    } else {
      msg = data.detail || data.message || `HTTP ${res.status}`
    }
    if (res.status === 403) msg = msg || 'Access denied.'
    if (res.status === 404) msg = msg || 'Resource not found.'
    if (res.status === 409) msg = msg || 'Conflict — resource already exists.'
    if (res.status === 413) msg = msg || 'File too large.'
    if (res.status === 422) msg = msg || 'Validation error. Please check your input.'
    if (res.status === 500) msg = msg || 'Server error. Please try again later.'
    if (res.status === 503) msg = msg || 'Service unavailable.'
    throw new Error(msg)
  }

  return data
}

//  Auth 
export const AuthAPI = {
  async login(email, password) {
    let res, data = {}
    try {
      res = await fetch(`${API_BASE}/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password }),
      })
      try { data = await res.json() } catch { /* empty */ }
    } catch {
      throw new Error('Network error — is the server running?')
    }
    if (!res.ok) {
      const msg = Array.isArray(data.detail)
        ? data.detail.map(e => e.msg || e.message).join(', ')
        : data.detail || data.message || 'Invalid email or password.'
      throw new Error(msg)
    }
    return data
  },

  signup: (fullName, email, password) =>
    apiFetch('/auth/signup', {
      method: 'POST',
      body: JSON.stringify({ full_name: fullName, email, password }),
    }),

  getMe: () => apiFetch('/auth/me'),

  forgotPassword: (email) =>
    apiFetch('/auth/forgot-password', {
      method: 'POST',
      body: JSON.stringify({ email }),
    }),

  resetPassword: (email, otp, new_password, confirm_password) =>
    apiFetch('/auth/reset-password', {
      method: 'POST',
      body: JSON.stringify({ email, otp, new_password, confirm_password }),
    }),
}

//  Dashboard 
export const DashboardAPI = {
  getStats: () => apiFetch('/dashboard/stats'),
  getUpcomingQuizzes: (limit = 6) => apiFetch(`/dashboard/upcoming-quizzes?limit=${limit}`),
  getActiveQuizzes: () => apiFetch('/dashboard/active-quizzes'),
}

//  Quizzes 
export const QuizAPI = {
  list: (search = '', status = '') => {
    const p = new URLSearchParams()
    if (search) p.set('search', search)
    if (status) p.set('status', status)
    return apiFetch(`/quizzes?${p}`)
  },
  get: (id) => apiFetch(`/quizzes/${id}`),
  create: (payload) => apiFetch('/quizzes', { method: 'POST', body: JSON.stringify(payload) }),
  update: (id, payload) => apiFetch(`/quizzes/${id}`, { method: 'PATCH', body: JSON.stringify(payload) }),
  delete: (id) => apiFetch(`/quizzes/${id}`, { method: 'DELETE' }),
  take: (id) => apiFetch(`/quizzes/${id}/take`),
  submit: (id, answers) => apiFetch(`/quizzes/${id}/submit`, {
    method: 'POST',
    body: JSON.stringify({ answers }),
  }),
}

//  Enrollment 
export const EnrollAPI = {
  enroll: (quizId, user_ids) => apiFetch(`/quizzes/${quizId}/enroll`, {
    method: 'POST',
    body: JSON.stringify({ user_ids }),
  }),
  removeEnrollment: (quizId, uid) => apiFetch(`/quizzes/${quizId}/enroll/${uid}`, { method: 'DELETE' }),
  getStudents: (quizId) => apiFetch(`/quizzes/${quizId}/students`),
}

//  Analytics 
export const AnalyticsAPI = {
  get: () => apiFetch('/analytics'),
}

//  Leaderboard 
export const LeaderboardAPI = {
  get: (quizId) => apiFetch(`/leaderboard/${quizId}`),
}

//  Notifications 
export const NotificationsAPI = {
  list: (unreadOnly = false) => apiFetch(`/notifications?unread_only=${unreadOnly}`),
  markRead: (id) => apiFetch(`/notifications/${id}/read`, { method: 'PATCH' }),
  markAllRead: () => apiFetch('/notifications/mark-all-read', { method: 'POST' }),
  delete: (id) => apiFetch(`/notifications/${id}`, { method: 'DELETE' }),
}

//  Settings 
export const SettingsAPI = {
  getProfile: () => apiFetch('/settings/profile'),
  updateProfile: (payload) => apiFetch('/settings/profile', { method: 'PATCH', body: JSON.stringify(payload) }),
  uploadAvatar: (formData) => apiFetch('/settings/profile/avatar', { method: 'POST', body: formData }),
  requestOtp: () => apiFetch('/settings/security/request-otp', { method: 'POST' }),
  verifyOtp: (otp, new_password, confirm_password) =>
    apiFetch('/settings/security/verify-otp', {
      method: 'POST',
      body: JSON.stringify({ otp, new_password, confirm_password }),
    }),
  changePassword: (current_password, new_password, confirm_password) =>
    apiFetch('/settings/security/change-password', {
      method: 'POST',
      body: JSON.stringify({ current_password, new_password, confirm_password }),
    }),
  updateNotificationPrefs: (email_digests, push_alerts) =>
    apiFetch('/settings/notifications', {
      method: 'PATCH',
      body: JSON.stringify({ email_digests, push_alerts }),
    }),
}

//  Admin 
export const AdminAPI = {
  listUsers: (role) => apiFetch(`/admin/users${role ? `?role=${role}` : ''}`),
  listStudents: () => apiFetch('/admin/users/students'),
  updateRole: (id, role) => apiFetch(`/admin/users/${id}/role`, { method: 'PATCH', body: JSON.stringify({ role }) }),
  toggleActive: (id) => apiFetch(`/admin/users/${id}/activate`, { method: 'PATCH' }),
  deleteUser: (id) => apiFetch(`/admin/users/${id}`, { method: 'DELETE' }),
}
