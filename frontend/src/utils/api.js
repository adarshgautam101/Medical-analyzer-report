import axios from 'axios'
import logger from './logger'

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:8000'

const api = axios.create({
  baseURL: API_BASE_URL,
})


api.interceptors.request.use(
  (config) => {
    const token = sessionStorage.getItem('token')

    if (token) {
      config.headers.Authorization = `Bearer ${token}`
    }

    
    const reqId = (typeof crypto !== 'undefined' && crypto.randomUUID)
      ? crypto.randomUUID()
      : Math.random().toString(36).substring(2, 15) + Math.random().toString(36).substring(2, 15)
    
    config.headers['x-request-id'] = reqId
    config.metadata = { startTime: new Date(), requestId: reqId }

    if (config.data instanceof FormData) {
      delete config.headers['Content-Type']
    } else if (
      config.data &&
      typeof config.data === 'object' &&
      !(config.data instanceof ArrayBuffer) &&
      !(config.data instanceof URLSearchParams)
    ) {
      config.headers['Content-Type'] = 'application/json'
    }

    
    if (config.url && !config.url.includes('/api/logs')) {
      logger.debug(`[API Request] ${config.method.toUpperCase()} ${config.url}`, {
        requestId: reqId,
      })
    }

    return config
  },
  (error) => Promise.reject(error)
)


api.interceptors.response.use(
  (response) => {
    const { startTime, requestId } = response.config.metadata || {}
    const duration = startTime ? new Date() - startTime : null

    if (response.config.url && !response.config.url.includes('/api/logs')) {
      logger.info(`[API Response] ${response.config.method.toUpperCase()} ${response.config.url} - Status: ${response.status} (${duration}ms)`, {
        requestId,
        statusCode: response.status,
        duration: `${duration}ms`,
      })
    }

    if (
      response.data &&
      typeof response.data === 'object' &&
      response.data.success === true &&
      response.data.data !== undefined
    ) {
      const unwrapped = response.data.data
      return {
        ...response,
        data: unwrapped,
        rawResponse: response.data,
      }
    }
    return response
  },
  (error) => {
    const { startTime, requestId } = error.config?.metadata || {}
    const duration = startTime ? new Date() - startTime : null
    const status = error.response?.status
    const errorMsg = error.response?.data?.error?.message || error.message

    if (error.config && error.config.url && !error.config.url.includes('/api/logs')) {
      logger.error(`[API Error] ${error.config.method.toUpperCase()} ${error.config.url} - Status: ${status || 'Network Error'} (${duration || 0}ms)`, error, {
        requestId,
        statusCode: status,
        duration: `${duration}ms`,
        errorMessage: errorMsg,
      })
    }

    if (error.response?.status === 401) {
      sessionStorage.removeItem('token')
      sessionStorage.removeItem('user')

      
      if (window.location.pathname !== '/login') {
        window.location.replace('/login')
      }
    }

    if (error.response?.data?.error?.message) {
      error.response.data.detail = error.response.data.error.message
    }

    return Promise.reject(error)
  }
)

export default api