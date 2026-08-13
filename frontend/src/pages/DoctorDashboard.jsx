import { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import api from '../utils/api'
import { Users, FileText, AlertTriangle, Calendar, Activity, TrendingUp, UserCheck, MessageCircle } from 'lucide-react'

export default function DoctorDashboard() {
  const [assignmentStats, setAssignmentStats] = useState({
    total_patients_on_platform: 0,
    your_assigned_patients: 0,
  })
  const [pendingAccess, setPendingAccess] = useState([])
  const [stats, setStats] = useState({
    total_patients: 0,
    recent_patients: 0,
    weekly_consultations: 0,
    critical_cases: 0,
    total_reports: 0,
  })
  const [recentPatients, setRecentPatients] = useState([])
  const [loading, setLoading] = useState(true)
  const [statsError, setStatsError] = useState('')

  useEffect(() => {
    let cancelled = false

    const load = async () => {
      setStatsError('')
      setLoading(true)
      try {
        const [statsRes, patientsRes] = await Promise.all([
          api.get('/api/doctor/statistics'),
          api.get('/api/users/patients'),
        ])
        if (cancelled) return
        setStats(statsRes.data)
        setRecentPatients(patientsRes.data.slice(0, 5))
        try {
          const assignRes = await api.get('/api/doctor/assignment-stats')
          if (!cancelled) setAssignmentStats(assignRes.data)
        } catch (e) {
          console.error('Assignment stats:', e)
        }
        try {
          const pend = await api.get('/api/doctor/patient-access-requests', {
            params: { status: 'pending' },
          })
          if (!cancelled) setPendingAccess(pend.data)
        } catch (e) {
          console.error('Access requests:', e)
        }
      } catch (error) {
        if (cancelled) return
        console.error('Error fetching dashboard data:', error)
        setStatsError(
          error.response?.data?.detail || 'Failed to load doctor dashboard.'
        )
      } finally {
        if (!cancelled) setLoading(false)
      }
    }

    load()
    return () => {
      cancelled = true
    }
  }, [])

  const respondToRequest = async (requestId, action) => {
    try {
      await api.post(`/api/doctor/patient-access-requests/${requestId}/${action}`)
      const pend = await api.get('/api/doctor/patient-access-requests', {
        params: { status: 'pending' },
      })
      setPendingAccess(pend.data)
      const assignRes = await api.get('/api/doctor/assignment-stats')
      setAssignmentStats(assignRes.data)
    } catch (e) {
      console.error(e)
      alert(e.response?.data?.detail || 'Action failed')
    }
  }

  if (loading) {
    return (
      <div className="p-6 flex items-center justify-center w-full flex-grow">
        <p className="text-gray-600 font-medium">Loading dashboard...</p>
      </div>
    )
  }

  return (
    <div className="px-4 py-6 w-full">
      <div className="max-w-7xl mx-auto">
        <div className="mb-6">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">Doctor Dashboard</h1>
          <p className="text-gray-600">Welcome back! Here&apos;s your practice overview</p>
        </div>

        {statsError && (
          <div className="mb-6 rounded-md bg-red-50 border border-red-200 text-red-800 px-4 py-3 text-sm">
            {statsError}
          </div>
        )}

        
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          <Link to="/doctor/patients" className="bg-white p-6 rounded-lg shadow-md hover:shadow-lg transition-all duration-200 block">
            <div className="flex items-center">
              <Users className="h-8 w-8 text-blue-600" />
              <div className="ml-4">
                <h3 className="text-lg font-semibold text-gray-900">View Patients</h3>
                <p className="text-sm text-gray-600">Browse and search patient database</p>
              </div>
            </div>
          </Link>
          <Link to="/medical-dashboard" className="bg-white p-6 rounded-lg shadow-md hover:shadow-lg transition-all duration-200 block">
            <div className="flex items-center">
              <Activity className="h-8 w-8 text-green-600" />
              <div className="ml-4">
                <h3 className="text-lg font-semibold text-gray-900">Health Analytics</h3>
                <p className="text-sm text-gray-600">View health parameters and trends</p>
              </div>
            </div>
          </Link>
          <Link to="/chat" className="bg-white p-6 rounded-lg shadow-md hover:shadow-lg transition-all duration-200 block">
            <div className="flex items-center">
              <MessageCircle className="h-8 w-8 text-purple-600" />
              <div className="ml-4">
                <h3 className="text-lg font-semibold text-gray-900">Messages</h3>
                <p className="text-sm text-gray-600">Chat with patients and consult online</p>
              </div>
            </div>
          </Link>
          <Link to="/doctor/profile" className="bg-white p-6 rounded-lg shadow-md hover:shadow-lg transition-all duration-200 block">
            <div className="flex items-center">
              <UserCheck className="h-8 w-8 text-red-600" />
              <div className="ml-4">
                <h3 className="text-lg font-semibold text-gray-900">Edit Profile</h3>
                <p className="text-sm text-gray-600">Update your professional information</p>
              </div>
            </div>
          </Link>
        </div>

        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
          <div className="bg-white p-6 rounded-lg shadow-md">
            <div className="flex items-center">
              <Users className="h-8 w-8 text-teal-600" />
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-600">Total patients</p>
                <p className="text-2xl font-bold text-gray-900">{assignmentStats.total_patients_on_platform}</p>
                <p className="text-xs text-gray-500 mt-1">Registered on the platform</p>
              </div>
            </div>
          </div>

          <Link to="/doctor/patients" className="bg-white p-6 rounded-lg shadow-md hover:shadow-lg transition-all duration-200 block">
            <div className="flex items-center">
              <UserCheck className="h-8 w-8 text-green-600" />
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-600">Your patients</p>
                <div className="flex items-baseline gap-2">
                  <p className="text-2xl font-bold text-gray-900">{assignmentStats.your_assigned_patients}</p>
                  {pendingAccess.length > 0 && (
                    <span className="text-xs font-semibold bg-amber-100 text-amber-800 px-2 py-0.5 rounded-full animate-pulse">
                      {pendingAccess.length} pending
                    </span>
                  )}
                </div>
                <p className="text-xs text-gray-500 mt-1">Approved access requests</p>
              </div>
            </div>
          </Link>
        </div>

        
        {pendingAccess.length > 0 && (
          <div className="bg-white rounded-lg shadow-md mb-8 border border-amber-200">
            <div className="px-6 py-4 border-b border-gray-200">
              <h2 className="text-xl font-semibold text-gray-900">Pending patient access requests</h2>
            </div>
            <ul className="divide-y divide-gray-250">
              {pendingAccess.map((req) => (
                <li key={req.id} className="px-6 py-4 flex flex-wrap items-center justify-between gap-3 animate-fade-in">
                  <div>
                    <p className="font-medium text-gray-900">{req.patient_name}</p>
                    <p className="text-xs text-gray-500">Request #{req.id}</p>
                  </div>
                  <div className="flex gap-2">
                    <button
                      type="button"
                      onClick={() => respondToRequest(req.id, 'accept')}
                      className="px-3 py-1.5 rounded-md text-sm font-medium bg-green-600 text-white hover:bg-green-700 transition-colors"
                    >
                      Accept
                    </button>
                    <button
                      type="button"
                      onClick={() => respondToRequest(req.id, 'reject')}
                      className="px-3 py-1.5 rounded-md text-sm font-medium border border-gray-300 text-gray-700 hover:bg-gray-50 transition-colors"
                    >
                      Reject
                    </button>
                  </div>
                </li>
              ))}
            </ul>
          </div>
        )}

        
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
          <Link to="/doctor/patients" className="bg-white p-6 rounded-lg shadow-md hover:shadow-lg transition-all duration-200 block">
            <div className="flex items-center">
              <TrendingUp className="h-8 w-8 text-green-600" />
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-600">Recent patients</p>
                <p className="text-2xl font-bold text-gray-900">{stats.recent_patients}</p>
                <p className="text-xs text-gray-500 mt-1">Last 7 days (new accounts)</p>
              </div>
            </div>
          </Link>

          <div className="bg-white p-6 rounded-lg shadow-md">
            <div className="flex items-center">
              <Calendar className="h-8 w-8 text-purple-600" />
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-600">Weekly Consultations</p>
                <p className="text-2xl font-bold text-gray-900">{stats.weekly_consultations}</p>
                <p className="text-xs text-gray-500 mt-1">This week</p>
              </div>
            </div>
          </div>

          <div className="bg-white p-6 rounded-lg shadow-md">
            <div className="flex items-center">
              <AlertTriangle className={`h-8 w-8 ${stats.critical_cases > 0 ? 'text-red-600 animate-pulse' : 'text-green-600'}`} />
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-600">Critical Cases</p>
                <p className={`text-base font-bold mt-1 ${stats.critical_cases > 0 ? 'text-red-600' : 'text-green-600'}`}>
                  {stats.critical_cases === 0
                    ? 'No critical cases'
                    : `${stats.critical_cases} require attention`}
                </p>
                <p className="text-xs text-gray-500 mt-1">Abnormal values</p>
              </div>
            </div>
          </div>
        </div>

        
        <div className="bg-white rounded-xl shadow-md mb-8">
          <div className="px-6 py-4 border-b border-gray-200 flex justify-between items-center">
            <h2 className="text-xl font-semibold text-gray-900">Recent Patients</h2>
            <Link
              to="/doctor/patients"
              className="text-blue-600 hover:text-blue-800 text-sm font-medium"
            >
              View All →
            </Link>
          </div>
          <div className="divide-y divide-gray-200">
            {recentPatients.length === 0 ? (
              <div className="px-6 py-12 text-center text-gray-500">
                <Users className="w-12 h-12 mx-auto mb-4 text-gray-400" />
                <p>No patients yet</p>
              </div>
            ) : (
              recentPatients.map((patient) => (
                <Link
                  key={patient.id}
                  to={`/doctor/patient/${patient.id}`}
                  className="block px-6 py-4 hover:bg-blue-50 transition-colors"
                >
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="font-medium text-gray-900">{patient.full_name}</p>
                      <p className="text-sm text-gray-500">{patient.email}</p>
                      {patient.age && (
                        <p className="text-xs text-gray-400 mt-1">
                          {patient.age} years • {patient.gender ? patient.gender.charAt(0).toUpperCase() + patient.gender.slice(1) : ''} • {patient.blood_group || '—'}
                        </p>
                      )}
                    </div>
                    <Activity className="w-5 h-5 text-gray-400" />
                  </div>
                </Link>
              ))
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
