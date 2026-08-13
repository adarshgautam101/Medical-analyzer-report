import { createContext, useContext, useState, useEffect } from 'react'
import { useQueryClient } from '@tanstack/react-query'
import api from '../utils/api'

const AuthContext = createContext()

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null)
  const [loading, setLoading] = useState(true)
  const queryClient = useQueryClient()

  
  useEffect(() => {
    try {
      const token = sessionStorage.getItem('token')
      const userData = sessionStorage.getItem('user')

      if (token && userData) {
        setUser(JSON.parse(userData))
      }
    } catch (err) {
      
      sessionStorage.removeItem('token')
      sessionStorage.removeItem('user')
      setUser(null)
    } finally {
      setLoading(false)
    }
  }, [])

  
  const login = async (email, password) => {
    try {
      queryClient.clear()
      const response = await api.post('/api/auth/login', { email, password })
      const { access_token, user: userData } = response.data

      sessionStorage.setItem('token', access_token)
      sessionStorage.setItem('user', JSON.stringify(userData))

      setUser(userData)
      return { success: true, user: userData }
    } catch (error) {
      return {
        success: false,
        error: error.response?.data?.detail || 'Login failed'
      }
    }
  }

  
  const register = async (email, password, fullName, role, doctorPayload = null) => {
    try {
      queryClient.clear()
      const body = {
        email,
        password,
        full_name: fullName,
        role,
      }

      if (role === 'doctor' && doctorPayload) {
        Object.assign(body, doctorPayload)
      }

      const response = await api.post('/api/auth/register', body)
      const { access_token, user: userData } = response.data

      sessionStorage.setItem('token', access_token)
      sessionStorage.setItem('user', JSON.stringify(userData))

      setUser(userData)
      return { success: true }
    } catch (error) {
      return {
        success: false,
        error: error.response?.data?.detail || 'Registration failed'
      }
    }
  }

  
  const logout = () => {
    queryClient.clear()
    sessionStorage.removeItem('token')
    sessionStorage.removeItem('user')
    setUser(null)
  }

  return (
    <AuthContext.Provider value={{ user, loading, login, register, logout }}>
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth() {
  return useContext(AuthContext)
}