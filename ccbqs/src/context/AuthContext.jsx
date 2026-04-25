import { createContext, useContext, useState, useEffect, useCallback } from 'react'
import { AuthAPI } from '../api'

const AuthContext = createContext(null)

export function AuthProvider({ children }) {
  const [user, setUser] = useState(() => {
    try {
      const u = localStorage.getItem('cq_user')
      return u ? JSON.parse(u) : null
    } catch { return null }
  })
  const [loading, setLoading] = useState(false)

  // Apply theme & lang from user prefs
  useEffect(() => {
    applyTheme(user)
  }, [user])

  function applyTheme(u) {
    const dark = u?.dark_mode === true || localStorage.getItem('cq_dark') === 'true'
    document.documentElement.setAttribute('data-theme', dark ? 'dark' : 'light')
    const lang = u?.display_language || localStorage.getItem('cq_lang') || 'English'
    const codes = { English:'en', Hindi:'hi', Spanish:'es', French:'fr', German:'de', Japanese:'ja' }
    document.documentElement.setAttribute('lang', codes[lang] || 'en')
  }

  function setSession(token, userData) {
    localStorage.setItem('cq_token', token)
    localStorage.setItem('cq_user', JSON.stringify(userData))
    if (userData?.dark_mode !== undefined)
      localStorage.setItem('cq_dark', String(userData.dark_mode))
    if (userData?.display_language)
      localStorage.setItem('cq_lang', userData.display_language)
    setUser(userData)
  }

  function clearSession() {
    localStorage.removeItem('cq_token')
    localStorage.removeItem('cq_user')
    setUser(null)
  }

  const login = useCallback(async (email, password) => {
    setLoading(true)
    try {
      const data = await AuthAPI.login(email, password)
      setSession(data.access_token, data.user)
      return data
    } finally {
      setLoading(false)
    }
  }, [])

  const signup = useCallback(async (fullName, email, password) => {
    setLoading(true)
    try {
      const data = await AuthAPI.signup(fullName, email, password)
      setSession(data.access_token, data.user)
      return data
    } finally {
      setLoading(false)
    }
  }, [])

  const logout = useCallback(() => {
    clearSession()
  }, [])

  const updateUser = useCallback((updatedUser) => {
    localStorage.setItem('cq_user', JSON.stringify(updatedUser))
    setUser(updatedUser)
  }, [])

  const setDark = useCallback((val) => {
    localStorage.setItem('cq_dark', String(val))
    document.documentElement.setAttribute('data-theme', val ? 'dark' : 'light')
    if (user) updateUser({ ...user, dark_mode: val })
  }, [user, updateUser])

  const isLoggedIn = !!localStorage.getItem('cq_token')
  const isAdmin = user?.role === 'admin'
  const isTeacher = user?.role === 'teacher' || user?.role === 'admin'
  const isStudent = user?.role === 'student'

  return (
    <AuthContext.Provider value={{
      user, loading, login, signup, logout, updateUser, setDark,
      isLoggedIn, isAdmin, isTeacher, isStudent,
    }}>
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth() {
  const ctx = useContext(AuthContext)
  if (!ctx) throw new Error('useAuth must be used within AuthProvider')
  return ctx
}
