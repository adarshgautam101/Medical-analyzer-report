import { motion } from 'framer-motion'
import { ArrowRight, RefreshCw } from 'lucide-react'


export const AnalyticsCard = ({
  icon: Icon,
  title,
  description,
  onClick,
  variant = 'default',
  className = ""
}) => {
  const variants = {
    default: 'border-transparent hover:border-blue-500',
    success: 'border-transparent hover:border-green-500',
    warning: 'border-transparent hover:border-yellow-500',
    danger: 'border-transparent hover:border-red-500'
  }

  return (
    <motion.div
      whileHover={{
        y: -4,
        scale: 1.02,
        transition: { duration: 0.2, ease: "easeOut" }
      }}
      whileTap={{ scale: 0.98 }}
      onClick={onClick}
      className={`cursor-pointer bg-white rounded-xl shadow-md p-6 border-2 ${variants[variant]} hover:shadow-xl transition-all duration-200 group ${className}`}
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3 }}
    >
      <div className="flex items-center mb-3">
        <motion.div
          whileHover={{ rotate: 5, scale: 1.1 }}
          transition={{ duration: 0.2 }}
        >
          <Icon className="w-6 h-6 text-blue-500 group-hover:text-blue-600 transition-colors duration-200" />
        </motion.div>
        <h2 className="text-lg font-semibold text-gray-900 ml-2">{title}</h2>
      </div>
      <p className="text-sm text-gray-600 mb-3">{description}</p>
      <motion.div
        initial={{ opacity: 0, x: -10 }}
        whileHover={{ opacity: 1, x: 0 }}
        className="flex items-center text-blue-600 text-sm font-medium group-hover:text-blue-700"
      >
        Explore
        <ArrowRight className="w-4 h-4 ml-1 group-hover:translate-x-1 transition-transform duration-200" />
      </motion.div>
    </motion.div>
  )
}


export const MetricCard = ({
  title,
  value,
  subtitle,
  icon: Icon,
  color = 'blue',
  trend,
  className = ""
}) => {
  const colorClasses = {
    blue: 'border-blue-500 bg-blue-50',
    green: 'border-green-500 bg-green-50',
    red: 'border-red-500 bg-red-50',
    yellow: 'border-yellow-500 bg-yellow-50',
    purple: 'border-purple-500 bg-purple-50'
  }

  return (
    <motion.div
      className={`bg-white rounded-xl shadow-md p-6 border-l-4 ${colorClasses[color]} ${className}`}
      whileHover={{ scale: 1.02 }}
      transition={{ duration: 0.2 }}
    >
      <div className="flex items-center justify-between">
        <div className="flex-1">
          <p className="text-sm font-medium text-gray-600">{title}</p>
          <motion.p
            className="text-3xl font-bold text-gray-900 mt-2"
            initial={{ scale: 0.8 }}
            animate={{ scale: 1 }}
            transition={{ duration: 0.3, delay: 0.1 }}
          >
            {value}
          </motion.p>
          {subtitle && (
            <p className="text-xs text-gray-500 mt-1">{subtitle}</p>
          )}
          {trend && (
            <motion.div
              className={`flex items-center mt-2 text-xs ${
                trend.type === 'up' ? 'text-green-600' : 'text-red-600'
              }`}
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.4 }}
            >
              {trend.icon}
              <span className="ml-1">{trend.value}</span>
            </motion.div>
          )}
        </div>
        <motion.div
          whileHover={{ rotate: 10, scale: 1.1 }}
          transition={{ duration: 0.2 }}
        >
          <Icon className={`w-12 h-12 text-${color}-500`} />
        </motion.div>
      </div>
    </motion.div>
  )
}


export const ActionCard = ({
  icon: Icon,
  title,
  description,
  onClick,
  to,
  variant = 'default',
  className = ""
}) => {
  const variants = {
    default: 'hover:border-blue-500 hover:bg-blue-50',
    success: 'hover:border-green-500 hover:bg-green-50',
    warning: 'hover:border-yellow-500 hover:bg-yellow-50',
    danger: 'hover:border-red-500 hover:bg-red-50'
  }

  const CardComponent = to ? 'a' : 'div'
  const props = to ? { href: to } : { onClick }

  return (
    <motion.div
      whileHover={{ y: -2 }}
      whileTap={{ scale: 0.95 }}
      className={`bg-white rounded-xl shadow-md p-6 hover:shadow-lg transition-all duration-200 border-2 border-transparent ${variants[variant]} cursor-pointer group ${className}`}
      {...props}
    >
      <Icon className="w-8 h-8 text-blue-500 mb-4 group-hover:scale-110 transition-transform duration-200" />
      <h3 className="text-lg font-semibold text-gray-900 mb-2">{title}</h3>
      <p className="text-sm text-gray-600">{description}</p>
    </motion.div>
  )
}


export const ChartContainer = ({
  title,
  children,
  isLoading,
  error,
  onRefresh,
  className = ""
}) => (
  <motion.div
    className={`bg-white rounded-xl shadow-md p-6 ${className}`}
    initial={{ opacity: 0, y: 20 }}
    animate={{ opacity: 1, y: 0 }}
    transition={{ duration: 0.3 }}
  >
    <div className="flex items-center justify-between mb-4">
      <h3 className="text-lg font-semibold text-gray-900">{title}</h3>
      {onRefresh && (
        <motion.button
          onClick={onRefresh}
          className="p-2 hover:bg-gray-100 rounded-lg transition-colors disabled:opacity-50"
          disabled={isLoading}
          whileHover={{ scale: 1.1 }}
          whileTap={{ scale: 0.9 }}
        >
          <RefreshCw className={`w-4 h-4 ${isLoading ? 'animate-spin text-blue-500' : 'text-gray-500'}`} />
        </motion.button>
      )}
    </div>

    {isLoading && <ChartSkeleton />}
    {error && (
      <motion.div
        className="text-center py-8"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
      >
        <p className="text-red-600 mb-4">{error}</p>
        {onRefresh && (
          <button
            onClick={onRefresh}
            className="px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition-colors"
          >
            Try Again
          </button>
        )}
      </motion.div>
    )}
    {!isLoading && !error && children}
  </motion.div>
)