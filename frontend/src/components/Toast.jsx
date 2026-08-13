import { createContext, useContext, useState, useCallback } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { CheckCircle, XCircle, AlertTriangle, Info, X } from 'lucide-react'
import toast, { Toaster } from 'react-hot-toast'


const ToastContext = createContext()

export const ToastProvider = ({ children }) => {
  const showToast = useCallback((message, type = 'info', duration = 4000) => {
    const toastOptions = {
      duration,
      style: {
        background: type === 'success' ? '#10b981' :
                   type === 'error' ? '#ef4444' :
                   type === 'warning' ? '#f59e0b' : '#3b82f6',
        color: '#ffffff',
        borderRadius: '8px',
        padding: '12px 16px',
        fontSize: '14px',
        fontWeight: '500',
        boxShadow: '0 10px 15px -3px rgba(0, 0, 0, 0.1), 0 4px 6px -2px rgba(0, 0, 0, 0.05)',
      },
      icon: type === 'success' ? '✅' :
            type === 'error' ? '❌' :
            type === 'warning' ? '⚠️' : 'ℹ️',
    }

    toast(message, toastOptions)
  }, [])

  return (
    <ToastContext.Provider value={{ showToast }}>
      {children}
      <Toaster
        position="top-right"
        toastOptions={{
          duration: 4000,
          style: {
            background: '#363636',
            color: '#fff',
          },
        }}
      />
    </ToastContext.Provider>
  )
}

export const useToast = () => {
  const context = useContext(ToastContext)
  if (!context) {
    throw new Error('useToast must be used within a ToastProvider')
  }
  return context
}


export const Toast = ({ id, message, type = 'info', onClose, duration = 4000 }) => {
  const [isVisible, setIsVisible] = useState(true)

  const icons = {
    success: CheckCircle,
    error: XCircle,
    warning: AlertTriangle,
    info: Info
  }

  const colors = {
    success: {
      bg: 'bg-green-50',
      border: 'border-green-200',
      text: 'text-green-800',
      icon: 'text-green-600'
    },
    error: {
      bg: 'bg-red-50',
      border: 'border-red-200',
      text: 'text-red-800',
      icon: 'text-red-600'
    },
    warning: {
      bg: 'bg-yellow-50',
      border: 'border-yellow-200',
      text: 'text-yellow-800',
      icon: 'text-yellow-600'
    },
    info: {
      bg: 'bg-blue-50',
      border: 'border-blue-200',
      text: 'text-blue-800',
      icon: 'text-blue-600'
    }
  }

  const Icon = icons[type]
  const colorScheme = colors[type]

  React.useEffect(() => {
    const timer = setTimeout(() => {
      setIsVisible(false)
      setTimeout(() => onClose(id), 300) 
    }, duration)

    return () => clearTimeout(timer)
  }, [id, onClose, duration])

  return (
    <AnimatePresence>
      {isVisible && (
        <motion.div
          initial={{ opacity: 0, x: 300, scale: 0.8 }}
          animate={{ opacity: 1, x: 0, scale: 1 }}
          exit={{ opacity: 0, x: 300, scale: 0.8 }}
          transition={{ duration: 0.3, ease: "easeOut" }}
          className={`fixed top-4 right-4 z-50 p-4 rounded-lg border shadow-lg max-w-sm ${colorScheme.bg} ${colorScheme.border}`}
        >
          <div className="flex items-start gap-3">
            <Icon className={`w-5 h-5 flex-shrink-0 mt-0.5 ${colorScheme.icon}`} />
            <div className="flex-1">
              <p className={`text-sm font-medium ${colorScheme.text}`}>{message}</p>
            </div>
            <button
              onClick={() => {
                setIsVisible(false)
                setTimeout(() => onClose(id), 300)
              }}
              className={`flex-shrink-0 p-1 rounded hover:bg-black/10 transition-colors ${colorScheme.icon}`}
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  )
}


export const ToastManager = () => {
  const [toasts, setToasts] = useState([])

  const addToast = useCallback((message, type, duration) => {
    const id = Date.now() + Math.random()
    setToasts(prev => [...prev, { id, message, type, duration }])
  }, [])

  const removeToast = useCallback((id) => {
    setToasts(prev => prev.filter(toast => toast.id !== id))
  }, [])

  return (
    <>
      {toasts.map(toast => (
        <Toast
          key={toast.id}
          id={toast.id}
          message={toast.message}
          type={toast.type}
          duration={toast.duration}
          onClose={removeToast}
        />
      ))}
    </>
  )
}


export const toastSuccess = (message, duration) => toast.success(message, { duration })
export const toastError = (message, duration) => toast.error(message, { duration })
export const toastWarning = (message, duration) => toast(message, {
  duration,
  icon: '⚠️',
  style: { background: '#f59e0b', color: '#fff' }
})
export const toastInfo = (message, duration) => toast(message, {
  duration,
  icon: 'ℹ️',
  style: { background: '#3b82f6', color: '#fff' }
})