import { useState, useEffect } from 'react'
import { useNavigate, Link } from 'react-router-dom'
import { useAuth } from '../contexts/AuthContext'
import api from '../utils/api'
import {
  Activity,
  HeartPulse,
  Stethoscope,
  User,
  Mail,
  Lock,
  Eye,
  EyeOff,
  ArrowRight,
  Loader2,
  AlertCircle,
} from 'lucide-react'

export default function Register() {
  const [formData, setFormData] = useState({
    email: '',
    password: '',
    fullName: '',
    role: 'patient',
    doctor_category_id: '',
  })
  const [showPassword, setShowPassword] = useState(false)
  const [categories, setCategories] = useState([])
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const { register } = useAuth()
  const navigate = useNavigate()

  useEffect(() => {
    const loadCategories = async () => {
      try {
        const res = await api.get('/api/categories')
        setCategories(res.data)
      } catch (e) {
        console.error(e)
      }
    }
    loadCategories()
  }, [])

  const handleSubmit = async (e) => {
    e.preventDefault()
    setError('')
    setLoading(true)

    let doctorPayload = null
    if (formData.role === 'doctor') {
      if (!formData.doctor_category_id) {
        setError('Please select a clinical specialty category.')
        setLoading(false)
        return
      }
      doctorPayload = {
        doctor_category_id: formData.doctor_category_id,
      }
    }

    const result = await register(
      formData.email,
      formData.password,
      formData.fullName,
      formData.role,
      doctorPayload
    )
    setLoading(false)

    if (result.success) {
      navigate('/dashboard')
    } else {
      setError(result.error || 'Registration failed. Please try again.')
    }
  }

  return (
    <div className="min-h-screen bg-[#f8fafb] flex flex-col justify-center items-center py-10 px-4 sm:px-6 lg:px-8">
      <div className="w-full max-w-md space-y-6">
        {/* Product Brand Header */}
        <div className="text-center">
          <div className="inline-flex items-center justify-center w-11 h-11 rounded-2xl bg-teal-50 border border-teal-100 text-teal-700 shadow-sm mb-3">
            <Activity className="w-5 h-5" />
          </div>
          <h1 className="text-base font-bold text-slate-900 tracking-tight">
            Medical Report Analyzer
          </h1>
        </div>

        {/* Elevated Form Card */}
        <div className="bg-white border border-slate-200/80 rounded-2xl shadow-sm p-6 sm:p-8 space-y-6">
          {/* Card Title & Subtitle */}
          <div className="border-b border-slate-100 pb-4 text-center">
            <h2 className="text-xl font-bold text-slate-900 tracking-tight">
              Create an account
            </h2>
            <p className="text-xs text-slate-500 mt-1">
              Enter your details to register for your health portal
            </p>
          </div>

          {/* Error Message */}
          {error && (
            <div className="bg-rose-50 border border-rose-200 text-rose-800 text-xs px-3.5 py-2.5 rounded-xl flex items-center gap-2">
              <AlertCircle className="w-4 h-4 text-rose-600 flex-shrink-0" />
              <span>{error}</span>
            </div>
          )}

          {/* Form */}
          <form className="space-y-4" onSubmit={handleSubmit}>
            {/* Role Selection Segmented Options */}
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                Select Account Role
              </label>
              <div className="grid grid-cols-2 gap-3">
                <button
                  type="button"
                  onClick={() =>
                    setFormData({
                      ...formData,
                      role: 'patient',
                      doctor_category_id: '',
                    })
                  }
                  className={`flex items-center justify-center gap-2 py-2.5 px-3 rounded-xl border text-xs font-semibold transition-all ${
                    formData.role === 'patient'
                      ? 'border-teal-600 bg-teal-50/70 text-teal-900 shadow-xs'
                      : 'border-slate-200 bg-white text-slate-600 hover:border-slate-300 hover:bg-slate-50'
                  }`}
                >
                  <HeartPulse
                    className={`w-4 h-4 ${
                      formData.role === 'patient' ? 'text-teal-700' : 'text-slate-400'
                    }`}
                  />
                  <span>Patient</span>
                </button>
                <button
                  type="button"
                  onClick={() =>
                    setFormData({
                      ...formData,
                      role: 'doctor',
                      doctor_category_id: '',
                    })
                  }
                  className={`flex items-center justify-center gap-2 py-2.5 px-3 rounded-xl border text-xs font-semibold transition-all ${
                    formData.role === 'doctor'
                      ? 'border-teal-600 bg-teal-50/70 text-teal-900 shadow-xs'
                      : 'border-slate-200 bg-white text-slate-600 hover:border-slate-300 hover:bg-slate-50'
                  }`}
                >
                  <Stethoscope
                    className={`w-4 h-4 ${
                      formData.role === 'doctor' ? 'text-teal-700' : 'text-slate-400'
                    }`}
                  />
                  <span>Doctor</span>
                </button>
              </div>
            </div>

            {/* Full Name Field */}
            <div>
              <label
                htmlFor="fullName"
                className="block text-xs font-semibold text-slate-700 mb-1.5"
              >
                Full Name
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400">
                  <User className="w-4 h-4" />
                </div>
                <input
                  id="fullName"
                  name="fullName"
                  type="text"
                  required
                  disabled={loading}
                  placeholder="e.g. Jane Doe"
                  value={formData.fullName}
                  onChange={(e) =>
                    setFormData({ ...formData, fullName: e.target.value })
                  }
                  className="w-full pl-10 pr-3.5 py-2.5 bg-white border border-slate-200 rounded-xl text-xs sm:text-sm text-slate-800 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-teal-500/20 focus:border-teal-600 transition-all disabled:opacity-50"
                />
              </div>
            </div>

            {/* Email Field */}
            <div>
              <label
                htmlFor="email"
                className="block text-xs font-semibold text-slate-700 mb-1.5"
              >
                Email Address
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400">
                  <Mail className="w-4 h-4" />
                </div>
                <input
                  id="email"
                  name="email"
                  type="email"
                  autoComplete="email"
                  required
                  disabled={loading}
                  placeholder="name@example.com"
                  value={formData.email}
                  onChange={(e) =>
                    setFormData({ ...formData, email: e.target.value })
                  }
                  className="w-full pl-10 pr-3.5 py-2.5 bg-white border border-slate-200 rounded-xl text-xs sm:text-sm text-slate-800 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-teal-500/20 focus:border-teal-600 transition-all disabled:opacity-50"
                />
              </div>
            </div>

            {/* Password Field */}
            <div>
              <label
                htmlFor="password"
                className="block text-xs font-semibold text-slate-700 mb-1.5"
              >
                Password
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400">
                  <Lock className="w-4 h-4" />
                </div>
                <input
                  id="password"
                  name="password"
                  type={showPassword ? 'text' : 'password'}
                  autoComplete="new-password"
                  required
                  disabled={loading}
                  placeholder="Create a secure password"
                  value={formData.password}
                  onChange={(e) =>
                    setFormData({ ...formData, password: e.target.value })
                  }
                  className="w-full pl-10 pr-10 py-2.5 bg-white border border-slate-200 rounded-xl text-xs sm:text-sm text-slate-800 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-teal-500/20 focus:border-teal-600 transition-all disabled:opacity-50"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute inset-y-0 right-0 pr-3.5 flex items-center text-slate-400 hover:text-slate-600 focus:outline-none"
                  tabIndex={-1}
                >
                  {showPassword ? (
                    <EyeOff className="w-4 h-4" />
                  ) : (
                    <Eye className="w-4 h-4" />
                  )}
                </button>
              </div>
            </div>

            {/* Doctor Specialty Category Field (Conditional) */}
            {formData.role === 'doctor' && (
              <div className="bg-teal-50/50 border border-teal-100/80 rounded-xl p-3.5 space-y-2">
                <label
                  htmlFor="doctor_category_id"
                  className="block text-xs font-semibold text-teal-900"
                >
                  Clinical Specialty Category <span className="text-rose-500">*</span>
                </label>
                <select
                  id="doctor_category_id"
                  name="doctor_category_id"
                  required
                  disabled={loading}
                  value={formData.doctor_category_id}
                  onChange={(e) =>
                    setFormData({
                      ...formData,
                      doctor_category_id: e.target.value,
                    })
                  }
                  className="w-full px-3 py-2 bg-white border border-slate-200 rounded-lg text-xs text-slate-800 focus:outline-none focus:ring-2 focus:ring-teal-500/20 focus:border-teal-600 disabled:opacity-50"
                >
                  <option value="">Select specialty category…</option>
                  {categories.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.name}
                    </option>
                  ))}
                </select>
              </div>
            )}

            {/* Submit Button */}
            <div className="pt-2">
              <button
                type="submit"
                disabled={loading}
                className="w-full flex items-center justify-center gap-2 py-2.5 px-4 bg-teal-700 hover:bg-teal-800 active:bg-teal-900 text-white rounded-xl text-xs sm:text-sm font-semibold shadow-sm transition-all focus:outline-none focus:ring-2 focus:ring-teal-600 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {loading ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin text-white" />
                    <span>Creating account...</span>
                  </>
                ) : (
                  <>
                    <span>Create account</span>
                    <ArrowRight className="w-4 h-4" />
                  </>
                )}
              </button>
            </div>
          </form>

          {/* Secondary Link */}
          <div className="pt-2 border-t border-slate-100 text-center">
            <p className="text-xs text-slate-500">
              Already have an account?{' '}
              <Link
                to="/login"
                className="font-semibold text-teal-700 hover:text-teal-800 hover:underline transition-colors"
              >
                Sign in
              </Link>
            </p>
          </div>
        </div>
      </div>
    </div>
  )
}
