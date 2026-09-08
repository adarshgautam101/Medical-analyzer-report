import { useState } from 'react'
import { useNavigate, Link } from 'react-router-dom'
import { useAuth } from '../contexts/AuthContext'
import { useToast } from '../components/Toast'
import { Activity, HeartPulse, Stethoscope, Mail, Lock, Eye, EyeOff, Loader2 } from 'lucide-react'

export default function Login() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [selectedRole, setSelectedRole] = useState('patient')
  const [showPassword, setShowPassword] = useState(false)
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
        showToast(`Role mismatch: You attempted to log in as a ${roleLabel}, but your account is registered as a ${expectedLabel}.`, 'error')
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
    <div className="min-h-screen bg-slate-50/70 relative flex flex-col justify-center py-10 sm:py-14 px-4 sm:px-6 lg:px-8">
      {/* Soft ambient healthcare background wash */}
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-teal-50/60 via-slate-50 to-slate-100 pointer-events-none" />

      <div className="relative max-w-md w-full mx-auto space-y-6">
        {/* Branding & Header */}
        <div className="text-center space-y-2">
          <div className="inline-flex items-center justify-center gap-2 px-3 py-1.5 rounded-full bg-teal-50 border border-teal-200/70 text-teal-800 shadow-sm mb-1">
            <Activity className="w-4 h-4 text-teal-600 shrink-0" />
            <span className="text-xs font-semibold tracking-wide uppercase">Medical Report Analyzer</span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-slate-900">
            Welcome back
          </h1>
          <p className="text-sm text-slate-500 max-w-xs mx-auto">
            Sign in to access your clinical dashboard and health reports
          </p>
        </div>

        {/* Elevated Form Card */}
        <div className="bg-white rounded-2xl shadow-sm border border-slate-200/80 p-6 sm:p-8">
          {/* Segmented Role Selector */}
          <div className="mb-6">
            <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-2">
              Sign In As
            </label>
            <div className="grid grid-cols-2 gap-2 p-1 bg-slate-100/90 rounded-xl border border-slate-200/70">
              <button
                type="button"
                onClick={() => setSelectedRole('patient')}
                className={`flex items-center justify-center gap-2 py-2.5 px-3 rounded-lg text-sm font-medium transition-all ${
                  selectedRole === 'patient'
                    ? 'bg-white text-teal-800 shadow-sm font-semibold border border-slate-200/70'
                    : 'text-slate-600 hover:text-slate-900 hover:bg-white/60'
                }`}
              >
                <HeartPulse className={`w-4 h-4 shrink-0 ${selectedRole === 'patient' ? 'text-teal-600' : 'text-slate-400'}`} />
                <span>Patient</span>
              </button>
              <button
                type="button"
                onClick={() => setSelectedRole('doctor')}
                className={`flex items-center justify-center gap-2 py-2.5 px-3 rounded-lg text-sm font-medium transition-all ${
                  selectedRole === 'doctor'
                    ? 'bg-white text-teal-800 shadow-sm font-semibold border border-slate-200/70'
                    : 'text-slate-600 hover:text-slate-900 hover:bg-white/60'
                }`}
              >
                <Stethoscope className={`w-4 h-4 shrink-0 ${selectedRole === 'doctor' ? 'text-teal-600' : 'text-slate-400'}`} />
                <span>Doctor</span>
              </button>
            </div>
          </div>

          {/* Form */}
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label htmlFor="email" className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1.5">
                Email address
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
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="name@example.com"
                  className="block w-full pl-10 pr-3.5 py-2.5 text-sm bg-white border border-slate-300 rounded-lg text-slate-900 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-teal-500/20 focus:border-teal-600 transition-colors disabled:bg-slate-50 disabled:text-slate-500"
                />
              </div>
            </div>

            <div>
              <label htmlFor="password" className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1.5">
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
                  required
                  disabled={loading}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  className="block w-full pl-10 pr-10 py-2.5 text-sm bg-white border border-slate-300 rounded-lg text-slate-900 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-teal-500/20 focus:border-teal-600 transition-colors disabled:bg-slate-50 disabled:text-slate-500"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  disabled={loading}
                  className="absolute inset-y-0 right-0 pr-3 flex items-center text-slate-400 hover:text-slate-600 transition-colors focus:outline-none"
                  aria-label={showPassword ? 'Hide password' : 'Show password'}
                >
                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full mt-2 py-2.5 px-4 border border-transparent rounded-lg shadow-sm text-sm font-semibold text-white bg-teal-600 hover:bg-teal-700 active:bg-teal-800 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-teal-500 disabled:opacity-50 disabled:cursor-not-allowed transition-all flex items-center justify-center gap-2"
            >
              {loading ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  <span>Signing in...</span>
                </>
              ) : (
                <span>Sign in as {selectedRole === 'doctor' ? 'Doctor' : 'Patient'}</span>
              )}
            </button>
          </form>
        </div>

        {/* Secondary Navigation */}
        <p className="text-center text-sm text-slate-600">
          Don't have an account?{' '}
          <Link to="/register" className="font-semibold text-teal-600 hover:text-teal-700 transition-colors">
            Create an account
          </Link>
        </p>
      </div>
    </div>
  )
}
