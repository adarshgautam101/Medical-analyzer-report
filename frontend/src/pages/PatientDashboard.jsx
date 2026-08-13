import { Link } from 'react-router-dom'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { Heart, Pill, AlertCircle, TrendingUp, FileText, Activity, Loader, Stethoscope, UserCheck, Search } from 'lucide-react'
import { useNavigate } from 'react-router-dom'
import { useToast } from '../components/Toast'
import {
  getProfile,
  getMedicines,
  getDiscoveryStats,
  getDoctorAccess,
  grantDoctorAccess,
  revokeDoctorAccess
} from '../services/userService'

import { getReportsSummary } from '../services/reportService'

export default function PatientDashboard() {
  const navigate = useNavigate()
  const { showToast } = useToast()
  const queryClient = useQueryClient()

  
  const { data: profile, isLoading: profileLoading } = useQuery({
    queryKey: ['profile'],
    queryFn: getProfile,
    staleTime: 5 * 60 * 1000, 
    onError: (error) => {
      showToast(error.response?.data?.detail || 'Failed to load profile', 'error')
    }
  })

  
  const { data: medicines, isLoading: medicinesLoading } = useQuery({
    queryKey: ['medicines'],
    queryFn: getMedicines,
    staleTime: 5 * 60 * 1000, 
    onError: (error) => {
      showToast('Failed to load medicines', 'error')
    }
  })

  
  const { data: reportsSummary, isLoading: reportsLoading } = useQuery({
    queryKey: ['reports-summary'],
    queryFn: getReportsSummary,
    staleTime: 5 * 60 * 1000, 
    onError: (error) => {
      showToast(error.response?.data?.detail || 'Failed to load reports', 'error')
    }
  })

  
  const { data: discovery = { total_doctors_on_platform: 0, your_active_doctors: 0 }, isLoading: discoveryLoading } = useQuery({
    queryKey: ['discovery-stats'],
    queryFn: getDiscoveryStats,
    staleTime: 5 * 60 * 1000, 
    onError: (error) => {
      console.error('Discovery stats error:', error)
    }
  })

  
  const { data: doctorAccess = [], isLoading: doctorAccessLoading, refetch: refetchDoctorAccess } = useQuery({
    queryKey: ['doctor-access'],
    queryFn: getDoctorAccess,
    staleTime: 5 * 60 * 1000, 
    onError: (error) => {
      showToast('Failed to load doctor access', 'error')
    }
  })

  
  const grantAccessMutation = useMutation({
    mutationFn: grantDoctorAccess,
    onSuccess: () => {
      showToast('Access request sent successfully', 'success')
      queryClient.invalidateQueries(['doctor-access'])
      queryClient.invalidateQueries(['discovery-stats'])
    },
    onError: (error) => {
      showToast(error.response?.data?.detail || 'Failed to request access', 'error')
    }
  })

  const revokeAccessMutation = useMutation({
    mutationFn: revokeDoctorAccess,
    onSuccess: () => {
      showToast('Access revoked successfully', 'success')
      queryClient.invalidateQueries(['doctor-access'])
      queryClient.invalidateQueries(['discovery-stats'])
    },
    onError: (error) => {
      showToast(error.response?.data?.detail || 'Failed to revoke access', 'error')
    }
  })

  
  const isLoading = profileLoading || medicinesLoading || reportsLoading || discoveryLoading || doctorAccessLoading

  
  const stats = {
    activeMedicines: medicines?.filter((m) => m.status === 'current').length || 0,
    abnormalValues: reportsSummary?.abnormal_count || 0,
    totalReports: reportsSummary?.total_reports || 0,
    recentReports: reportsSummary?.recent_reports || [],
  }

  const approvedCount = doctorAccess?.filter(
    (row) => row.status === 'accepted' || row.status === 'approved'
  ).length || 0

  const pendingCount = doctorAccess?.filter(
    (row) => row.status === 'pending'
  ).length || 0

  
  const handleGrantAccess = (doctorId) => {
    grantAccessMutation.mutate(doctorId)
  }

  const handleRevokeAccess = (accessId) => {
    revokeAccessMutation.mutate(accessId)
  }



  if (isLoading) {
    return (
      <div className="p-6 flex items-center justify-center w-full flex-grow">
        <div className="max-w-7xl mx-auto text-center">
          <h1 className="text-3xl font-bold text-gray-900 mb-8">Patient Dashboard</h1>
          <p className="text-gray-600">Loading dashboard...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="px-4 py-6 w-full">
      <div className="max-w-7xl mx-auto">
        <div className="mb-6">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">Your Health Dashboard</h1>
          <p className="text-gray-600">Welcome back! Here&apos;s your health overview</p>
        </div>

        
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          <Link to="/find-doctors" className="bg-white p-6 rounded-lg shadow-md hover:shadow-lg">
            <div className="flex items-center">
              <Search className="h-8 w-8 text-blue-600" />
              <div className="ml-4">
                <h3 className="text-lg font-semibold text-gray-900">Find Doctors</h3>
                <p className="text-sm text-gray-600">Search by name, category, and specialty</p>
              </div>
            </div>
          </Link>
          <Link to="/reports" className="bg-white p-6 rounded-lg shadow-md hover:shadow-lg">
            <div className="flex items-center">
              <FileText className="h-8 w-8 text-green-600" />
              <div className="ml-4">
                <h3 className="text-lg font-semibold text-gray-900">View Reports</h3>
                <p className="text-sm text-gray-600">See all your medical reports and lab results</p>
              </div>
            </div>
          </Link>
          <Link to="/medicines" className="bg-white p-6 rounded-lg shadow-md hover:shadow-lg">
            <div className="flex items-center">
              <Pill className="h-8 w-8 text-purple-600" />
              <div className="ml-4">
                <h3 className="text-lg font-semibold text-gray-900">Manage Medicines</h3>
                <p className="text-sm text-gray-600">Track your current and past medications</p>
              </div>
            </div>
          </Link>
          <Link to="/profile" className="bg-white p-6 rounded-lg shadow-md hover:shadow-lg">
            <div className="flex items-center">
              <Heart className="h-8 w-8 text-red-600" />
              <div className="ml-4">
                <h3 className="text-lg font-semibold text-gray-900">Update Profile</h3>
                <p className="text-sm text-gray-600">Keep your health information up to date</p>
              </div>
            </div>
          </Link>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
          <div className="bg-white p-6 rounded-lg shadow-md">
            <div className="flex items-center">
              <Stethoscope className="h-8 w-8 text-teal-600" />
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-600">Total doctors available</p>
                <p className="text-2xl font-bold text-gray-900">{discovery.total_doctors_on_platform}</p>
                <p className="text-xs text-gray-500">On the platform</p>
              </div>
            </div>
          </div>
          <Link to="/find-doctors" className="bg-white p-6 rounded-lg shadow-md hover:shadow-lg transition-all duration-200 block">
            <div className="flex items-center">
              <UserCheck className="h-8 w-8 text-green-600" />
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-600">Your active doctors</p>
                <div className="flex items-baseline gap-2">
                  <p className="text-2xl font-bold text-gray-900">{approvedCount}</p>
                  {pendingCount > 0 && (
                    <span className="text-xs font-semibold bg-amber-100 text-amber-800 px-2 py-0.5 rounded-full animate-pulse">
                      {pendingCount} pending
                    </span>
                  )}
                </div>
                <p className="text-xs text-gray-500 mt-1">Manage access permissions</p>
              </div>
            </div>
          </Link>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
          <Link to="/medicines" className="bg-white p-6 rounded-lg shadow-md hover:shadow-lg transition-all duration-200 block">
            <div className="flex items-center">
              <Pill className="h-8 w-8 text-green-600" />
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-600">Active Medicines</p>
                <p className="text-2xl font-bold text-gray-900">{stats.activeMedicines}</p>
              </div>
            </div>
          </Link>

          <div className="bg-white p-6 rounded-lg shadow-md">
            <div className="flex items-center">
              <AlertCircle className={`h-8 w-8 ${stats.abnormalValues > 0 ? 'text-red-600 animate-pulse' : 'text-green-600'}`} />
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-600">Abnormal Values</p>
                <p className={`text-base font-bold mt-1 ${stats.abnormalValues > 0 ? 'text-red-600' : 'text-green-600'}`}>
                  {stats.abnormalValues === 0 
                    ? 'No abnormalities detected' 
                    : `${stats.abnormalValues} require attention`}
                </p>
                <p className="text-xs text-gray-500 mt-1">Across all reports</p>
              </div>
            </div>
          </div>

          <Link to="/reports" className="bg-white p-6 rounded-lg shadow-md hover:shadow-lg transition-all duration-200 block">
            <div className="flex items-center">
              <FileText className="h-8 w-8 text-blue-600" />
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-600">Total Reports</p>
                <p className="text-2xl font-bold text-gray-900">{stats.totalReports}</p>
              </div>
            </div>
          </Link>

          {profile && profile.bmi && (
            <div className="bg-white p-6 rounded-lg shadow-md">
              <div className="flex items-center">
                <Activity className="h-8 w-8 text-purple-600" />
                <div className="ml-4">
                  <p className="text-sm font-medium text-gray-600">BMI</p>
                  <p className="text-2xl font-bold text-gray-900">{profile.bmi.toFixed(1)}</p>
                  <p className="text-xs text-gray-500">
                    {profile.bmi < 18.5
                      ? 'Underweight'
                      : profile.bmi < 25
                      ? 'Normal'
                      : profile.bmi < 30
                      ? 'Overweight'
                      : 'Obese'}
                  </p>
                </div>
              </div>
            </div>
          )}
        </div>

        
        <div className="bg-white rounded-xl shadow-md mb-8">
          <div className="px-6 py-4 border-b border-gray-200 flex justify-between items-center">
            <h2 className="text-xl font-semibold text-gray-900">Recent Reports</h2>
            <Link
              to="/reports"
              className="text-blue-600 hover:text-blue-800 text-sm font-medium"
            >
              View All →
            </Link>
          </div>
          <div className="divide-y divide-gray-200">
            {stats.recentReports.length === 0 ? (
              <div className="px-6 py-12 text-center text-gray-500">
                <FileText className="w-12 h-12 mx-auto mb-4 text-gray-400" />
                <p>No reports yet.</p>
                <Link to="/reports" className="text-blue-600 hover:underline mt-2 inline-block">
                  Upload your first report
                </Link>
              </div>
            ) : (
              stats.recentReports.map((report) => (
                <Link
                  key={report.id}
                  to={`/reports/${report.id}`}
                  className="block px-6 py-4 hover:bg-blue-50 transition-colors"
                >
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="font-medium text-gray-900">{report.file_name}</p>
                      <p className="text-sm text-gray-500">
                        {new Date(report.upload_date).toLocaleDateString()}
                      </p>
                      {report.ai_summary && (
                        <p className="text-sm text-gray-600 mt-1 line-clamp-1">
                          {report.ai_summary}
                        </p>
                      )}
                    </div>
                    <span
                      className={`px-3 py-1 text-xs rounded-full ${
                        report.ocr_status === 'completed'
                          ? 'bg-green-100 text-green-800'
                          : report.ocr_status === 'failed'
                          ? 'bg-red-100 text-red-800'
                          : 'bg-yellow-100 text-yellow-800'
                      }`}
                    >
                      {report.ocr_status}
                    </span>
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
