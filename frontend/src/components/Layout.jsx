import { Outlet, Link, useLocation, useNavigate } from 'react-router-dom'
import { useAuth } from '../contexts/AuthContext'
import { FileText, Home, User, LogOut, Stethoscope, Search, TrendingUp, MessageCircle } from 'lucide-react'

export default function Layout() {
  const { user, logout } = useAuth()
  const location = useLocation()
  const navigate = useNavigate()

  const handleLogout = () => {
    logout()
    navigate('/login')
  }

  const navItems = user?.role === 'doctor'
    ? [
      { path: '/dashboard', label: 'Dashboard', icon: Home },
      { path: '/doctor/patients', label: 'Patients', icon: User },
      { path: '/medical-dashboard', label: 'Analytics', icon: TrendingUp },
      { path: '/chat', label: 'Messages', icon: MessageCircle },
      { path: '/doctor/profile', label: 'Profile', icon: Stethoscope },
    ]
    : [
      { path: '/dashboard', label: 'Dashboard', icon: Home },
      { path: '/find-doctors', label: 'Find Doctors', icon: Search },
      { path: '/reports', label: 'Reports', icon: FileText },
      { path: '/chat', label: 'Messages', icon: MessageCircle },
      { path: '/profile', label: 'Profile', icon: User },
    ]

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-50 flex flex-col">
      <nav className="bg-white shadow-sm border-b sticky top-0 z-40">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16 gap-4">
            
            {/* Brand Logo & Title */}
            <a
              href="/dashboard"
              className="flex-shrink-0 flex items-center hover:opacity-80 transition-opacity cursor-pointer"
              title="Go to Home Dashboard"
            >
              <h1 className="text-lg lg:text-xl font-bold text-blue-600 whitespace-nowrap">
                Medical Report Analyzer
              </h1>
            </a>

            {/* Center Navigation Links */}
            <div className="hidden md:flex items-center space-x-2 lg:space-x-6 flex-1 justify-center max-w-3xl">
              {navItems.map((item) => {
                const Icon = item.icon
                const isActive = location.pathname === item.path
                return (
                  <Link
                    key={item.path}
                    to={item.path}
                    className={`inline-flex items-center px-2.5 lg:px-3.5 py-2 text-sm font-medium whitespace-nowrap border-b-2 transition-colors ${
                      isActive
                        ? 'border-blue-500 text-blue-600 font-semibold'
                        : 'border-transparent text-gray-600 hover:border-gray-300 hover:text-gray-900'
                    }`}
                  >
                    <Icon className="w-4 h-4 mr-1.5 shrink-0" />
                    <span>{item.label}</span>
                  </Link>
                )
              })}
            </div>

            {/* Right User Info & Logout */}
            <div className="flex items-center space-x-3 shrink-0">
              <div className="hidden sm:flex items-center space-x-1.5 text-sm text-gray-700">
                <User className="w-4 h-4 text-gray-500 shrink-0" />
                <span className="max-w-[140px] lg:max-w-[190px] truncate font-medium text-gray-800" title={user?.full_name || user?.email}>
                  {user?.full_name || user?.email || 'User'}
                </span>
                <span className="text-xs text-gray-400 capitalize">({user?.role || 'user'})</span>
              </div>
              <button
                onClick={handleLogout}
                className="inline-flex items-center px-3 py-1.5 border border-transparent text-xs sm:text-sm font-medium rounded-md text-white bg-red-600 hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500 transition-colors shrink-0"
              >
                <LogOut className="w-4 h-4 mr-1.5" />
                Logout
              </button>
            </div>

          </div>
        </div>
      </nav>

      <main className="max-w-7xl mx-auto py-6 sm:px-6 lg:px-8 flex-1 w-full">
        <Outlet />
      </main>
    </div>
  )
}
