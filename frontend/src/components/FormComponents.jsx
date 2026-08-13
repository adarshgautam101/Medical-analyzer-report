import { useState } from 'react'
import { motion } from 'framer-motion'
import { Eye, EyeOff, Check, X, AlertCircle } from 'lucide-react'


export const FormInput = ({
  label,
  type = 'text',
  value,
  onChange,
  error,
  success,
  required,
  placeholder,
  disabled,
  className = "",
  ...props
}) => {
  const [isFocused, setIsFocused] = useState(false)
  const [showPassword, setShowPassword] = useState(false)

  const inputType = type === 'password' && showPassword ? 'text' : type

  return (
    <motion.div
      className={`space-y-1 ${className}`}
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3 }}
    >
      {label && (
        <label className="block text-sm font-medium text-gray-700">
          {label} {required && <span className="text-red-500">*</span>}
        </label>
      )}
      <div className="relative">
        <motion.input
          type={inputType}
          value={value}
          onChange={onChange}
          onFocus={() => setIsFocused(true)}
          onBlur={() => setIsFocused(false)}
          placeholder={placeholder}
          disabled={disabled}
          className={`w-full px-3 py-2 pr-10 border rounded-lg transition-all duration-200 ${
            error
              ? 'border-red-300 focus:border-red-500 focus:ring-red-200 bg-red-50'
              : success
              ? 'border-green-300 focus:border-green-500 focus:ring-green-200 bg-green-50'
              : isFocused
              ? 'border-blue-500 focus:ring-blue-200'
              : 'border-gray-300 focus:border-blue-500 focus:ring-blue-200'
          } focus:ring-2 focus:outline-none disabled:opacity-50 disabled:cursor-not-allowed`}
          {...props}
        />

        
        <div className="absolute right-3 top-2.5 flex items-center gap-1">
          {error && <X className="w-5 h-5 text-red-500" />}
          {success && <Check className="w-5 h-5 text-green-500" />}
          {type === 'password' && (
            <button
              type="button"
              onClick={() => setShowPassword(!showPassword)}
              className="text-gray-400 hover:text-gray-600 transition-colors"
            >
              {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
            </button>
          )}
        </div>
      </div>

      
      {error && (
        <motion.div
          initial={{ opacity: 0, y: -10, scale: 0.95 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          className="flex items-center gap-2 text-sm text-red-600"
        >
          <AlertCircle className="w-4 h-4 flex-shrink-0" />
          <span>{error}</span>
        </motion.div>
      )}

      
      {success && !error && (
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          className="flex items-center gap-2 text-sm text-green-600"
        >
          <Check className="w-4 h-4 flex-shrink-0" />
          <span>{success}</span>
        </motion.div>
      )}
    </motion.div>
  )
}


export const FormTextarea = ({
  label,
  value,
  onChange,
  error,
  success,
  required,
  placeholder,
  rows = 4,
  disabled,
  className = "",
  ...props
}) => {
  const [isFocused, setIsFocused] = useState(false)

  return (
    <motion.div
      className={`space-y-1 ${className}`}
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3 }}
    >
      {label && (
        <label className="block text-sm font-medium text-gray-700">
          {label} {required && <span className="text-red-500">*</span>}
        </label>
      )}
      <div className="relative">
        <motion.textarea
          value={value}
          onChange={onChange}
          onFocus={() => setIsFocused(true)}
          onBlur={() => setIsFocused(false)}
          placeholder={placeholder}
          rows={rows}
          disabled={disabled}
          className={`w-full px-3 py-2 border rounded-lg transition-all duration-200 resize-none ${
            error
              ? 'border-red-300 focus:border-red-500 focus:ring-red-200'
              : success
              ? 'border-green-300 focus:border-green-500 focus:ring-green-200'
              : isFocused
              ? 'border-blue-500 focus:ring-blue-200'
              : 'border-gray-300 focus:border-blue-500 focus:ring-blue-200'
          } focus:ring-2 focus:outline-none disabled:opacity-50 disabled:cursor-not-allowed`}
          {...props}
        />
        {error && <X className="absolute right-3 top-2.5 w-5 h-5 text-red-500" />}
        {success && <Check className="absolute right-3 top-2.5 w-5 h-5 text-green-500" />}
      </div>

      {error && (
        <motion.div
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          className="flex items-center gap-2 text-sm text-red-600"
        >
          <AlertCircle className="w-4 h-4 flex-shrink-0" />
          <span>{error}</span>
        </motion.div>
      )}
    </motion.div>
  )
}


export const FormSelect = ({
  label,
  value,
  onChange,
  options = [],
  error,
  success,
  required,
  placeholder = "Select an option",
  disabled,
  className = "",
  ...props
}) => {
  const [isFocused, setIsFocused] = useState(false)

  return (
    <motion.div
      className={`space-y-1 ${className}`}
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3 }}
    >
      {label && (
        <label className="block text-sm font-medium text-gray-700">
          {label} {required && <span className="text-red-500">*</span>}
        </label>
      )}
      <div className="relative">
        <motion.select
          value={value}
          onChange={onChange}
          onFocus={() => setIsFocused(true)}
          onBlur={() => setIsFocused(false)}
          disabled={disabled}
          className={`w-full px-3 py-2 pr-10 border rounded-lg transition-all duration-200 appearance-none bg-white ${
            error
              ? 'border-red-300 focus:border-red-500 focus:ring-red-200'
              : success
              ? 'border-green-300 focus:border-green-500 focus:ring-green-200'
              : isFocused
              ? 'border-blue-500 focus:ring-blue-200'
              : 'border-gray-300 focus:border-blue-500 focus:ring-blue-200'
          } focus:ring-2 focus:outline-none disabled:opacity-50 disabled:cursor-not-allowed`}
          {...props}
        >
          <option value="" disabled>{placeholder}</option>
          {options.map((option) => (
            <option key={option.value} value={option.value}>
              {option.label}
            </option>
          ))}
        </motion.select>

        
        <div className="absolute right-3 top-2.5 pointer-events-none">
          <svg className="w-5 h-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
          </svg>
        </div>

        {error && <X className="absolute right-10 top-2.5 w-5 h-5 text-red-500" />}
        {success && <Check className="absolute right-10 top-2.5 w-5 h-5 text-green-500" />}
      </div>

      {error && (
        <motion.div
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          className="flex items-center gap-2 text-sm text-red-600"
        >
          <AlertCircle className="w-4 h-4 flex-shrink-0" />
          <span>{error}</span>
        </motion.div>
      )}
    </motion.div>
  )
}


export const FormFieldGroup = ({ title, description, children, className = "" }) => (
  <motion.div
    className={`space-y-4 ${className}`}
    initial={{ opacity: 0, y: 20 }}
    animate={{ opacity: 1, y: 0 }}
    transition={{ duration: 0.4 }}
  >
    {(title || description) && (
      <div className="border-b border-gray-200 pb-4">
        {title && <h3 className="text-lg font-medium text-gray-900">{title}</h3>}
        {description && <p className="text-sm text-gray-600 mt-1">{description}</p>}
      </div>
    )}
    {children}
  </motion.div>
)


export const FormActions = ({ children, className = "" }) => (
  <motion.div
    className={`flex gap-3 pt-6 border-t border-gray-200 ${className}`}
    initial={{ opacity: 0, y: 10 }}
    animate={{ opacity: 1, y: 0 }}
    transition={{ duration: 0.3, delay: 0.2 }}
  >
    {children}
  </motion.div>
)