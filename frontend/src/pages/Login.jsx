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
              Welcome back
            </h2>
            <p className="text-sm sm:text-base font-medium text-slate-600 mt-1.5">
              Sign in to access your health portal
            </p>
          </div>

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
                  onClick={() => setSelectedRole('patient')}
                  className={`flex items-center justify-center gap-3 py-4 px-4 rounded-xl border-2 text-base font-bold transition-all ${
                    selectedRole === 'patient'
                      ? 'border-teal-700 bg-teal-50/90 text-teal-950 shadow-sm ring-1 ring-teal-700'
                      : 'border-slate-300 bg-white text-slate-700 hover:border-slate-400 hover:bg-slate-50'
                  }`}
                >
                  <HeartPulse
                    className={`w-6 h-6 ${
                      selectedRole === 'patient' ? 'text-teal-700' : 'text-slate-500'
                    }`}
                  />
                  <span>Patient</span>
                </button>
                <button
                  type="button"
                  onClick={() => setSelectedRole('doctor')}
                  className={`flex items-center justify-center gap-3 py-4 px-4 rounded-xl border-2 text-base font-bold transition-all ${
                    selectedRole === 'doctor'
                      ? 'border-teal-700 bg-teal-50/90 text-teal-950 shadow-sm ring-1 ring-teal-700'
                      : 'border-slate-300 bg-white text-slate-700 hover:border-slate-400 hover:bg-slate-50'
                  }`}
                >
                  <Stethoscope
                    className={`w-6 h-6 ${
                      selectedRole === 'doctor' ? 'text-teal-700' : 'text-slate-500'
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
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="name@example.com"
                  required
                  disabled={loading}
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
                  autoComplete="current-password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Enter your password"
                  required
                  disabled={loading}
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
                    <span>Signing in...</span>
                  </>
                ) : (
                  <>
                    <span>
                      Sign in as {selectedRole === 'doctor' ? 'Doctor' : 'Patient'}
                    </span>
                    <ArrowRight className="w-6 h-6" />
                  </>
                )}
              </button>
            </div>
          </form>

          {/* Secondary Link */}
          <div className="pt-3 border-t-2 border-slate-100 text-center">
            <p className="text-sm sm:text-base font-medium text-slate-600">
              Don&apos;t have an account?{' '}
              <Link
                to="/register"
                className="font-bold text-teal-700 hover:text-teal-900 underline underline-offset-4 transition-colors"
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
