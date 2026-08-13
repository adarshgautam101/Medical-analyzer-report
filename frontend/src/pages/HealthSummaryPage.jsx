import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import api from '../utils/api'
import { ArrowLeft, Loader, AlertCircle, TrendingUp, Activity } from 'lucide-react'
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  Cell,
} from 'recharts'
import { useToast } from '../components/Toast'

const STATUS_COLORS = {
  normal: '#378ADD',
  borderline: '#EF9F27',
  abnormal: '#E24B4A',
  unknown: '#999999',
}

export default function HealthSummaryPage() {
  const navigate = useNavigate()
  const { showToast } = useToast()
  const [selectedReport, setSelectedReport] = useState('all')

  const {
    data,
    isLoading,
    error,
    refetch,
  } = useQuery({
    queryKey: ['healthSummaryJson'],
    queryFn: () => api.get('/api/analytics/health-summary-json').then((res) => res.data),
    staleTime: 5 * 60 * 1000,
  })

  if (error) {
    showToast('Error loading health summary: ' + (error?.message || 'Unknown error'), 'error')
  }

  
  const chartData = data?.parameters
    ? selectedReport === 'all'
      ? data.parameters.map((p) => ({
          name: p.name,
          score: p.score || 0,
          status: p.status,
        }))
      : data.parameters
          .filter((p) => p.report_name === selectedReport)
          .map((p) => ({
            name: p.name,
            score: p.score || 0,
            status: p.status,
          }))
    : []

  
  const reportNames =
    data?.reports?.map((r) => r.report_name) || []
  const uniqueReports = [...new Set(reportNames)]

  
  if (!isLoading && (!data?.reports || data.reports.length === 0)) {
    return (
      <div className="px-4 py-6 bg-gradient-to-br from-blue-50 to-indigo-50 min-h-screen">
        <div className="max-w-6xl mx-auto">
          <button
            onClick={() => navigate('/dashboard')}
            className="flex items-center gap-2 text-blue-600 hover:text-blue-800 font-medium mb-4"
          >
            <ArrowLeft className="w-4 h-4" />
            Back to Dashboard
          </button>
          <div className="flex items-center gap-3 mb-2">
            <TrendingUp className="w-8 h-8 text-blue-500" />
            <h1 className="text-3xl font-bold text-gray-900">Health Summary</h1>
          </div>

          <div className="bg-white rounded-xl shadow-md p-12 text-center mt-8">
            <Activity className="w-12 h-12 text-gray-400 mx-auto mb-4" />
            <p className="text-gray-600 mb-4">No health summary data available yet</p>
            <p className="text-sm text-gray-500">
              Upload some medical reports to see your health analysis.
            </p>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="px-4 py-6 bg-gradient-to-br from-blue-50 to-indigo-50 min-h-screen">
      <div className="max-w-6xl mx-auto">
        
        <button
          onClick={() => navigate('/dashboard')}
          className="flex items-center gap-2 text-blue-600 hover:text-blue-800 font-medium mb-4"
        >
          <ArrowLeft className="w-4 h-4" />
          Back to Dashboard
        </button>

        <div className="flex items-center gap-3 mb-2">
          <TrendingUp className="w-8 h-8 text-blue-500" />
          <h1 className="text-3xl font-bold text-gray-900">Health Summary</h1>
        </div>
        <p className="text-gray-600 mb-6">
          Detailed overview of your health metrics and trends from your medical reports.
        </p>

        
        {!isLoading && data && (
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-8">
            <div className="bg-white rounded-lg shadow-md p-6">
              <div className="text-sm text-gray-600 mb-1">Overall Score</div>
              <div className="text-4xl font-bold text-blue-600">
                {data.overall_score !== null ? data.overall_score : 'N/A'}
              </div>
              <div className="text-xs text-gray-500 mt-2">Health Score</div>
            </div>

            <div className="bg-white rounded-lg shadow-md p-6">
              <div className="text-sm text-gray-600 mb-1">Reports Analysed</div>
              <div className="text-4xl font-bold text-purple-600">{data.reports?.length || 0}</div>
              <div className="text-xs text-gray-500 mt-2">Total Reports</div>
            </div>

            <div className="bg-white rounded-lg shadow-md p-6">
              <div className="text-sm text-gray-600 mb-1">Flagged Values</div>
              <div className="text-4xl font-bold text-red-600">{data.flagged_count || 0}</div>
              <div className="text-xs text-gray-500 mt-2">Abnormal Results</div>
            </div>

            <div className="bg-white rounded-lg shadow-md p-6">
              <div className="text-sm text-gray-600 mb-1">Normal Values</div>
              <div className="text-4xl font-bold text-green-600">{data.normal_count || 0}</div>
              <div className="text-xs text-gray-500 mt-2">Normal Results</div>
            </div>
          </div>
        )}

        
        {isLoading && (
          <div className="bg-white rounded-xl shadow-md p-12 text-center">
            <Loader className="w-8 h-8 text-blue-500 animate-spin mx-auto mb-4" />
            <p className="text-gray-600">Loading your health summary...</p>
          </div>
        )}

        
        {error && !isLoading && (
          <div className="bg-white rounded-xl shadow-md p-8 mb-8">
            <div className="flex items-start gap-4">
              <AlertCircle className="w-6 h-6 text-red-500 flex-shrink-0 mt-1" />
              <div>
                <h3 className="text-lg font-semibold text-red-800 mb-2">Unable to Load Summary</h3>
                <p className="text-red-700">{error.message}</p>
              </div>
            </div>
          </div>
        )}

        
        {!isLoading && data?.reports && data.reports.length > 0 && (
          <div className="mb-6 flex flex-wrap gap-2">
            <button
              onClick={() => setSelectedReport('all')}
              className={`px-4 py-2 rounded-lg font-medium transition-colors ${
                selectedReport === 'all'
                  ? 'bg-blue-600 text-white'
                  : 'bg-white text-gray-700 border border-gray-300 hover:bg-gray-50'
              }`}
            >
              All Reports
            </button>
            {uniqueReports.map((name) => (
              <button
                key={name}
                onClick={() => setSelectedReport(name)}
                className={`px-4 py-2 rounded-lg font-medium transition-colors ${
                  selectedReport === name
                    ? 'bg-blue-600 text-white'
                    : 'bg-white text-gray-700 border border-gray-300 hover:bg-gray-50'
                }`}
              >
                {name}
              </button>
            ))}
          </div>
        )}

        
        {!isLoading && chartData && chartData.length > 0 && (
          <div className="bg-white rounded-xl shadow-md p-6 mb-8">
            <h2 className="text-xl font-semibold text-gray-900 mb-6">
              {selectedReport === 'all' ? 'All Parameters' : `${selectedReport} Parameters`}
            </h2>
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={chartData} layout="vertical" margin={{ top: 5, right: 30, left: 150, bottom: 5 }}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis type="number" domain={[0, 100]} />
                <YAxis dataKey="name" type="category" width={140} tick={{ fontSize: 12 }} />
                <Tooltip />
                <Bar dataKey="score" radius={[0, 8, 8, 0]}>
                  {chartData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={STATUS_COLORS[entry.status] || STATUS_COLORS.unknown} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        )}

        
        {!isLoading && data?.parameters && (
          <>
            {data.parameters.some((p) => p.is_abnormal) && (
              <div className="mb-8">
                <h2 className="text-xl font-semibold text-gray-900 mb-4">Flagged Parameters</h2>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {data.parameters
                    .filter((p) => p.is_abnormal)
                    .map((param, idx) => (
                      <div key={idx} className="bg-white border-l-4 border-red-500 rounded-lg shadow-md p-4">
                        <div className="flex justify-between items-start mb-2">
                          <h3 className="font-semibold text-gray-900">{param.name}</h3>
                          <span className="text-xs bg-red-100 text-red-800 px-2 py-1 rounded">Abnormal</span>
                        </div>
                        <div className="grid grid-cols-3 gap-2 text-sm">
                          <div>
                            <span className="text-gray-600">Value:</span>
                            <p className="font-semibold">{param.value}</p>
                          </div>
                          <div>
                            <span className="text-gray-600">Unit:</span>
                            <p className="font-semibold">{param.unit}</p>
                          </div>
                          <div>
                            <span className="text-gray-600">Score:</span>
                            <p className="font-semibold text-red-600">{param.score || 'N/A'}</p>
                          </div>
                        </div>
                      </div>
                    ))}
                </div>
              </div>
            )}
          </>
        )}

        
        <div className="flex justify-center mt-8">
          <button
            onClick={() => refetch()}
            disabled={isLoading}
            className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50"
          >
            {isLoading ? 'Refreshing...' : 'Refresh Data'}
          </button>
        </div>
      </div>
    </div>
  )
}
