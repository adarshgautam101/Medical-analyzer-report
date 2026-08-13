import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import api from '../utils/api'
import { ArrowLeft, Loader, AlertCircle, Activity } from 'lucide-react'
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  ReferenceLine,
  Cell,
} from 'recharts'
import { useToast } from '../components/Toast'


const getCorrelationColor = (value) => {
  const absValue = Math.abs(value)
  if (absValue >= 0.7) {
    
    return value > 0 ? '#185FA5' : '#D85A30'
  }
  if (absValue >= 0.4) {
    
    return value > 0 ? '#4A90E2' : '#F07C52'
  }
  if (absValue >= 0.15) {
    
    return value > 0 ? '#A8D8FF' : '#F5B8A5'
  }
  
  return '#F1EFE8'
}

export default function CorrelationPage() {
  const navigate = useNavigate()
  const { showToast } = useToast()

  const {
    data,
    isLoading,
    error,
    refetch,
  } = useQuery({
    queryKey: ['correlationJson'],
    queryFn: () => api.get('/api/analytics/correlation-json').then((res) => res.data),
    staleTime: 5 * 60 * 1000,
  })

  if (error) {
    showToast('Error loading correlation data: ' + (error?.message || 'Unknown error'), 'error')
  }

  
  if (!isLoading && (!data?.parameters || data.parameters.length < 2)) {
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
            <Activity className="w-8 h-8 text-purple-500" />
            <h1 className="text-3xl font-bold text-gray-900">Lab Correlation</h1>
          </div>

          <div className="bg-white rounded-xl shadow-md p-12 text-center mt-8">
            <Activity className="w-12 h-12 text-gray-400 mx-auto mb-4" />
            <p className="text-gray-600 mb-4">Insufficient data for correlation analysis</p>
            <p className="text-sm text-gray-500">
              Upload multiple medical reports with lab values to see parameter correlations.
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
          <Activity className="w-8 h-8 text-purple-500" />
          <h1 className="text-3xl font-bold text-gray-900">Lab Correlation</h1>
        </div>
        <p className="text-gray-600 mb-6">
          Analysis of relationships between laboratory parameters from your medical reports.
        </p>

        
        {isLoading && (
          <div className="bg-white rounded-xl shadow-md p-12 text-center">
            <Loader className="w-8 h-8 text-purple-500 animate-spin mx-auto mb-4" />
            <p className="text-gray-600">Loading correlation data...</p>
          </div>
        )}

        
        {error && !isLoading && (
          <div className="bg-white rounded-xl shadow-md p-8 mb-8">
            <div className="flex items-start gap-4">
              <AlertCircle className="w-6 h-6 text-red-500 flex-shrink-0 mt-1" />
              <div>
                <h3 className="text-lg font-semibold text-red-800 mb-2">Unable to Load Correlation Data</h3>
                <p className="text-red-700">{error.message}</p>
              </div>
            </div>
          </div>
        )}

        
        {!isLoading && data?.parameters && data.parameters.length >= 2 && (
          <div className="bg-white rounded-xl shadow-md p-6 mb-8 overflow-x-auto">
            <h2 className="text-xl font-semibold text-gray-900 mb-6">Correlation Matrix</h2>
            <div
              style={{
                display: 'grid',
                gridTemplateColumns: `80px repeat(${data.parameters.length}, 1fr)`,
                gap: '0',
                border: '1px solid #e5e7eb',
              }}
            >
              
              <div
                style={{
                  padding: '12px 8px',
                  fontWeight: '600',
                  backgroundColor: '#f3f4f6',
                  borderRight: '1px solid #e5e7eb',
                  fontSize: '12px',
                }}
              >
                Param
              </div>
              {data.parameters.map((param) => (
                <div
                  key={`header-${param}`}
                  style={{
                    padding: '12px 8px',
                    fontWeight: '600',
                    backgroundColor: '#f3f4f6',
                    borderRight: '1px solid #e5e7eb',
                    fontSize: '12px',
                    writingMode: 'vertical-rl',
                    textOrientation: 'mixed',
                    whiteSpace: 'nowrap',
                    minHeight: '100px',
                    display: 'flex',
                    alignItems: 'flex-end',
                    justifyContent: 'center',
                  }}
                >
                  {param}
                </div>
              ))}

              
              {data.parameters.map((rowParam, rowIdx) => (
                <div key={`row-${rowIdx}`} style={{ display: 'contents' }}>
                  
                  <div
                    style={{
                      padding: '12px 8px',
                      fontWeight: '600',
                      backgroundColor: '#f3f4f6',
                      borderRight: '1px solid #e5e7eb',
                      borderBottom: '1px solid #e5e7eb',
                      fontSize: '12px',
                  display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                    }}
                  >
                    {rowParam}
                  </div>

                  
                  {data.parameters.map((colParam, colIdx) => {
                    const value = data.matrix[rowIdx][colIdx]
                    return (
                      <div
                        key={`cell-${rowIdx}-${colIdx}`}
                        style={{
                          padding: '12px 8px',
                          backgroundColor: getCorrelationColor(value),
                          borderRight: '1px solid #e5e7eb',
                          borderBottom: '1px solid #e5e7eb',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          fontSize: '12px',
                          fontWeight: '500',
                          cursor: 'default',
                          color: Math.abs(value) > 0.5 ? '#fff' : '#000',
                        }}
                        title={`${rowParam} ↔ ${colParam}: ${value.toFixed(2)}`}
                      >
                        {value.toFixed(2)}
                      </div>
                    )
                  })}
                </div>
              ))}
            </div>

            
            <div className="mt-6 pt-6 border-t border-gray-200">
              <h3 className="text-sm font-semibold text-gray-900 mb-3">Color Scale</h3>
              <div className="grid grid-cols-2 md:grid-cols-5 gap-4 text-sm">
                <div className="flex items-center gap-2">
                  <div
                    style={{
                      width: '24px',
                      height: '24px',
                      backgroundColor: '#185FA5',
                    }}
                  />
                  <span>Strong +</span>
                </div>
                <div className="flex items-center gap-2">
                  <div
                    style={{
                      width: '24px',
                      height: '24px',
                      backgroundColor: '#4A90E2',
                    }}
                  />
                  <span>Moderate +</span>
                </div>
                <div className="flex items-center gap-2">
                  <div
                    style={{
                      width: '24px',
                      height: '24px',
                      backgroundColor: '#F1EFE8',
                      border: '1px solid #d1d5db',
                    }}
                  />
                  <span>Neutral</span>
                </div>
                <div className="flex items-center gap-2">
                  <div
                    style={{
                      width: '24px',
                      height: '24px',
                      backgroundColor: '#F07C52',
                    }}
                  />
                  <span>Moderate −</span>
                </div>
                <div className="flex items-center gap-2">
                  <div
                    style={{
                      width: '24px',
                      height: '24px',
                      backgroundColor: '#D85A30',
                    }}
                  />
                  <span>Strong −</span>
                </div>
              </div>
            </div>
          </div>
        )}

        
        {!isLoading && data?.pairs && data.pairs.length > 0 && (
          <div className="bg-white rounded-xl shadow-md p-6 mb-8">
            <h2 className="text-xl font-semibold text-gray-900 mb-6">Top Correlations</h2>
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={data.pairs} margin={{ top: 5, right: 30, left: 200, bottom: 5 }}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis type="number" domain={[-1, 1]} />
                <YAxis dataKey="label" type="category" width={190} tick={{ fontSize: 12 }} />
                <Tooltip />
                <ReferenceLine x={0} stroke="#666" />
                <Bar dataKey="value" radius={[0, 8, 8, 0]}>
                  {data.pairs.map((entry, index) => (
                    <Cell
                      key={`cell-${index}`}
                      fill={entry.value > 0 ? '#378ADD' : '#D85A30'}
                    />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        )}

        
        <div className="flex justify-center mb-8">
          <button
            onClick={() => refetch()}
            disabled={isLoading}
            className="px-6 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 disabled:opacity-50"
          >
            {isLoading ? 'Refreshing...' : 'Refresh Data'}
          </button>
        </div>
      </div>
    </div>
  )
}
