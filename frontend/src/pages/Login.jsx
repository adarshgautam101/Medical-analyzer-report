import { useState } from 'react'
import { useNavigate, Link } from 'react-router-dom'
import { useAuth } from '../contexts/AuthContext'
import { useToast } from '../components/Toast'
import {
  Activity,
  HeartPulse,
  Stethoscope,
  Mail,
  Lock,
  Eye,
  EyeOff,
  ArrowRight,
  Loader2,
} from 'lucide-react'

export default function Login() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [selectedRole, setSelectedRole] = useState('patient')
  const [loading, setLoading] = useState(false)
  const { login, logout } = useAuth()
  const navigate = useNavigate()
  const { showToast } = useToast()

  const handleSubmit = async (e) => {
    e.preventDefault()
    setLoading(true)

    const result = await login(email, password)

    if (result.success) {
      if (result.user.role !== selectedRole) {
        logout()
        setLoading(false)
        const roleLabel = selectedRole === 'doctor' ? 'Doctor' : 'Patient'
        const expectedLabel = result.user.role === 'doctor' ? 'Doctor' : 'Patient'
        showToast(
          `Role mismatch: You attempted to log in as a ${roleLabel}, but your account is registered as a ${expectedLabel}.`,
          'error'
        )
        return
      }
      setLoading(false)
      showToast('Welcome back! Login successful.', 'success')
      navigate('/dashboard')
    } else {
      setLoading(false)
      showToast(result.error || 'Login failed. Please try again.', 'error')
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
              Welcome back
            </h2>
            <p className="text-xs text-slate-500 mt-1">
              Sign in to access your health portal
            </p>
          </div>

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
                  onClick={() => setSelectedRole('patient')}
                  className={`flex items-center justify-center gap-2 py-2.5 px-3 rounded-xl border text-xs font-semibold transition-all ${
                    selectedRole === 'patient'
                      ? 'border-teal-600 bg-teal-50/70 text-teal-900 shadow-xs'
                      : 'border-slate-200 bg-white text-slate-600 hover:border-slate-300 hover:bg-slate-50'
                  }`}
                >
                  <HeartPulse
                    className={`w-4 h-4 ${
                      selectedRole === 'patient' ? 'text-teal-700' : 'text-slate-400'
                    }`}
                  />
                  <span>Patient</span>
                </button>
                <button
                  type="button"
                  onClick={() => setSelectedRole('doctor')}
                  className={`flex items-center justify-center gap-2 py-2.5 px-3 rounded-xl border text-xs font-semibold transition-all ${
                    selectedRole === 'doctor'
                      ? 'border-teal-600 bg-teal-50/70 text-teal-900 shadow-xs'
                      : 'border-slate-200 bg-white text-slate-600 hover:border-slate-300 hover:bg-slate-50'
                  }`}
                >
                  <Stethoscope
                    className={`w-4 h-4 ${
                      selectedRole === 'doctor' ? 'text-teal-700' : 'text-slate-400'
                    }`}
                  />
                  <span>Doctor</span>
                </button>
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
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="name@example.com"
                  required
                  disabled={loading}
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
                  autoComplete="current-password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Enter your password"
                  required
                  disabled={loading}
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
                    <span>Signing in...</span>
                  </>
                ) : (
                  <>
                    <span>
                      Sign in as {selectedRole === 'doctor' ? 'Doctor' : 'Patient'}
                    </span>
                    <ArrowRight className="w-4 h-4" />
                  </>
                )}
              </button>
            </div>
          </form>

          {/* Secondary Link */}
          <div className="pt-2 border-t border-slate-100 text-center">
            <p className="text-xs text-slate-500">
              Don&apos;t have an account?{' '}
              <Link
                to="/register"
                className="font-semibold text-teal-700 hover:text-teal-800 hover:underline transition-colors"
              >
                Create account
              </Link>
            </p>
          </div>
        </div>
      </div>
    </div>
  )
}
