import { createContext, useContext, useState, useEffect, useCallback } from 'react'
import { authService } from '../services/authService'

const AuthContext = createContext(null)

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const token = localStorage.getItem('docmind_token')
    if (!token) {
      setLoading(false)
      return
    }

    authService
      .getMe()
      .then((data) => setUser(data.user))
      .catch(() => {
        localStorage.removeItem('docmind_token')
      })
      .finally(() => setLoading(false))
  }, [])

  const login = useCallback(async (email, password) => {
    const data = await authService.login(email, password)
    localStorage.setItem('docmind_token', data.token)
    setUser(data.user)
    return data
  }, [])

  const register = useCallback(async (name, email, password) => {
    const data = await authService.register(name, email, password)
    localStorage.setItem('docmind_token', data.token)
    setUser(data.user)
    return data
  }, [])

  const logout = useCallback(() => {
    localStorage.removeItem('docmind_token')
    setUser(null)
  }, [])

  const updateUser = useCallback((updatedUser) => {
    setUser(updatedUser)
  }, [])

  const value = { user, loading, login, register, logout, updateUser }

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}

export function useAuth() {
  const ctx = useContext(AuthContext)
  if (!ctx) {
    throw new Error('useAuth must be used within an AuthProvider')
  }
  return ctx
}
