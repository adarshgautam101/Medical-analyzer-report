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
    <div className="min-h-screen bg-[#edf6f5] flex flex-col justify-center items-center py-12 px-4 sm:px-6 lg:px-8">
      <div className="w-full max-w-xl space-y-7">
        {/* Product Brand Header */}
        <div className="text-center flex flex-col items-center">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-teal-700 text-white shadow-md mb-3.5">
            <Activity className="w-8 h-8" />
          </div>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900 tracking-tight">
            Medical Report Analyzer
          </h1>
          <p className="text-sm sm:text-base font-medium text-slate-600 mt-1">
            Healthcare Clinical Portal
          </p>
        </div>

        {/* Elevated Form Card */}
        <div className="bg-white border-2 border-slate-200/90 rounded-2xl shadow-[0_20px_50px_-12px_rgba(15,118,110,0.12),0_8px_24px_-4px_rgba(0,0,0,0.06)] p-8 sm:p-11 space-y-7">
          {/* Card Title & Subtitle */}
          <div className="border-b-2 border-slate-100 pb-5 text-center">
            <h2 className="text-2xl sm:text-3xl font-extrabold text-slate-900 tracking-tight">
              Create an account
            </h2>
            <p className="text-sm sm:text-base font-medium text-slate-600 mt-1.5">
              Enter your details to register for your health portal
            </p>
          </div>

          {/* Error Message */}
          {error && (
            <div className="bg-rose-50 border-2 border-rose-300 text-rose-900 text-sm sm:text-base font-medium px-4 py-3.5 rounded-xl flex items-center gap-3">
              <AlertCircle className="w-5 h-5 text-rose-600 flex-shrink-0" />
              <span>{error}</span>
            </div>
          )}

          {/* Form */}
          <form className="space-y-6" onSubmit={handleSubmit}>
            {/* Role Selection Segmented Options */}
            <div>
              <label className="block text-sm sm:text-base font-bold text-slate-900 mb-2.5">
                Select Account Role
              </label>
              <div className="grid grid-cols-2 gap-4">
                <button
                  type="button"
                  onClick={() =>
                    setFormData({
                      ...formData,
                      role: 'patient',
                      doctor_category_id: '',
                    })
                  }
                  className={`flex items-center justify-center gap-3 py-4 px-4 rounded-xl border-2 text-base font-bold transition-all ${
                    formData.role === 'patient'
                      ? 'border-teal-700 bg-teal-50/90 text-teal-950 shadow-sm ring-1 ring-teal-700'
                      : 'border-slate-300 bg-white text-slate-700 hover:border-slate-400 hover:bg-slate-50'
                  }`}
                >
                  <HeartPulse
                    className={`w-6 h-6 ${
                      formData.role === 'patient' ? 'text-teal-700' : 'text-slate-500'
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
                  className={`flex items-center justify-center gap-3 py-4 px-4 rounded-xl border-2 text-base font-bold transition-all ${
                    formData.role === 'doctor'
                      ? 'border-teal-700 bg-teal-50/90 text-teal-950 shadow-sm ring-1 ring-teal-700'
                      : 'border-slate-300 bg-white text-slate-700 hover:border-slate-400 hover:bg-slate-50'
                  }`}
                >
                  <Stethoscope
                    className={`w-6 h-6 ${
                      formData.role === 'doctor' ? 'text-teal-700' : 'text-slate-500'
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
                className="block text-sm sm:text-base font-bold text-slate-900 mb-2"
              >
                Full Name
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none text-slate-500">
                  <User className="w-5 h-5" />
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
                  className="w-full pl-12 pr-4 py-4 bg-white border-2 border-slate-300 rounded-xl text-base text-slate-900 placeholder:text-slate-500 focus:outline-none focus:ring-4 focus:ring-teal-500/20 focus:border-teal-700 transition-all disabled:opacity-50"
                />
              </div>
            </div>

            {/* Email Field */}
            <div>
              <label
                htmlFor="email"
                className="block text-sm sm:text-base font-bold text-slate-900 mb-2"
              >
                Email Address
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none text-slate-500">
                  <Mail className="w-5 h-5" />
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
                  className="w-full pl-12 pr-4 py-4 bg-white border-2 border-slate-300 rounded-xl text-base text-slate-900 placeholder:text-slate-500 focus:outline-none focus:ring-4 focus:ring-teal-500/20 focus:border-teal-700 transition-all disabled:opacity-50"
                />
              </div>
            </div>

            {/* Password Field */}
            <div>
              <label
                htmlFor="password"
                className="block text-sm sm:text-base font-bold text-slate-900 mb-2"
              >
                Password
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none text-slate-500">
                  <Lock className="w-5 h-5" />
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
                  className="w-full pl-12 pr-12 py-4 bg-white border-2 border-slate-300 rounded-xl text-base text-slate-900 placeholder:text-slate-500 focus:outline-none focus:ring-4 focus:ring-teal-500/20 focus:border-teal-700 transition-all disabled:opacity-50"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute inset-y-0 right-0 pr-4 flex items-center text-slate-500 hover:text-slate-800 focus:outline-none"
                  tabIndex={-1}
                >
                  {showPassword ? (
                    <EyeOff className="w-5 h-5" />
                  ) : (
                    <Eye className="w-5 h-5" />
                  )}
                </button>
              </div>
            </div>

            {/* Doctor Specialty Category Field (Conditional) */}
            {formData.role === 'doctor' && (
              <div className="bg-teal-50/90 border-2 border-teal-200 rounded-xl p-5 space-y-2.5">
                <label
                  htmlFor="doctor_category_id"
                  className="block text-sm sm:text-base font-bold text-teal-950"
                >
                  Clinical Specialty Category <span className="text-rose-600">*</span>
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
                  className="w-full px-4 py-3.5 bg-white border-2 border-teal-300 rounded-xl text-base text-slate-900 font-medium focus:outline-none focus:ring-4 focus:ring-teal-500/20 focus:border-teal-700 disabled:opacity-50"
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
            <div className="pt-3">
              <button
                type="submit"
                disabled={loading}
                className="w-full flex items-center justify-center gap-3 py-4 px-6 bg-teal-700 hover:bg-teal-800 active:bg-teal-900 text-white rounded-xl text-base sm:text-lg font-bold shadow-md hover:shadow-lg transition-all focus:outline-none focus:ring-4 focus:ring-teal-600/30 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {loading ? (
                  <>
                    <Loader2 className="w-6 h-6 animate-spin text-white" />
                    <span>Creating account...</span>
                  </>
                ) : (
                  <>
                    <span>Create account</span>
                    <ArrowRight className="w-6 h-6" />
                  </>
                )}
              </button>
            </div>
          </form>

          {/* Secondary Link */}
          <div className="pt-3 border-t-2 border-slate-100 text-center">
            <p className="text-sm sm:text-base font-medium text-slate-600">
              Already have an account?{' '}
              <Link
                to="/login"
                className="font-bold text-teal-700 hover:text-teal-900 underline underline-offset-4 transition-colors"
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
