import { Navigate } from 'react-router-dom'
import { useAuth } from '../contexts/AuthContext'

export default function RoleRoute({ children, requiredRole }) {
  const { user, loading } = useAuth()

  if (loading) {
    return null 
  }

  if (!user) {
    return <Navigate to="/login" replace />
  }

  if (user.role !== requiredRole) {
    return <Navigate to="/dashboard" replace />
  }

  return children
}