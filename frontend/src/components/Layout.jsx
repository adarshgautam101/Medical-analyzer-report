import { useState } from 'react'
import { Outlet, Link, useLocation, useNavigate } from 'react-router-dom'
import { useAuth } from '../contexts/AuthContext'
import { FileText, Home, User, LogOut, Stethoscope, Search, TrendingUp, MessageCircle, Menu, X } from 'lucide-react'

export default function Layout() {
  const { user, logout } = useAuth()
  const location = useLocation()
  const navigate = useNavigate()
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false)

  const handleLogout = () => {
    setIsMobileMenuOpen(false)
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

            {/* Center Navigation Links (Desktop) */}
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

            {/* Right User Info & Logout (Desktop + Mobile Toggle) */}
            <div className="flex items-center space-x-3 shrink-0">
              <button
                onClick={handleLogout}
                className="inline-flex items-center px-3 py-1.5 border border-transparent text-xs sm:text-sm font-medium rounded-md text-white bg-red-600 hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500 transition-colors shrink-0"
              >
                <LogOut className="w-4 h-4 mr-1.5" />
                Logout
              </button>

              {/* Mobile Hamburger Toggle Button */}
              <button
                type="button"
                onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
                className="md:hidden inline-flex items-center justify-center p-2 rounded-md text-gray-600 hover:text-gray-900 hover:bg-gray-100 focus:outline-none focus:ring-2 focus:ring-inset focus:ring-blue-500 transition-colors"
                aria-expanded={isMobileMenuOpen}
                aria-label="Toggle navigation menu"
              >
                {isMobileMenuOpen ? (
                  <X className="w-6 h-6 shrink-0" />
                ) : (
                  <Menu className="w-6 h-6 shrink-0" />
                )}
              </button>
            </div>

          </div>
        </div>

        {/* Mobile Collapsible Navigation Menu */}
        {isMobileMenuOpen && (
          <div className="md:hidden border-t border-gray-200 bg-white px-4 pt-2 pb-4 space-y-1 shadow-lg">
            {navItems.map((item) => {
              const Icon = item.icon
              const isActive = location.pathname === item.path
              return (
                <Link
                  key={item.path}
                  to={item.path}
                  onClick={() => setIsMobileMenuOpen(false)}
                  className={`flex items-center px-3 py-2.5 rounded-md text-base font-medium transition-colors ${
                    isActive
                      ? 'bg-blue-50 text-blue-600 font-semibold'
                      : 'text-gray-700 hover:bg-gray-50 hover:text-gray-900'
                  }`}
                >
                  <Icon className="w-5 h-5 mr-3 shrink-0" />
                  <span>{item.label}</span>
                </Link>
              )
            })}
          </div>
        )}
      </nav>

      <main className="max-w-7xl mx-auto py-6 sm:px-6 lg:px-8 flex-1 w-full">
        <Outlet />
      </main>
    </div>
  )
}
