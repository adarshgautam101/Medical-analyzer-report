import React, { useState, useEffect } from 'react'
import { useQuery } from '@tanstack/react-query'
import { X, Filter, RotateCcw, Search, User, Calendar, FileText, ChevronRight, Users } from 'lucide-react'
import Skeleton from 'react-loading-skeleton'
import 'react-loading-skeleton/dist/skeleton.css'

import ParameterCard from '../components/ParameterCard'
import TrendChart from '../components/TrendChart'
import InsightsPanel from '../components/InsightsPanel'
import RiskBadge from '../components/RiskBadge'
import PatientAiChat from '../components/PatientAiChat'
import { getDashboardData } from '../services/dashboardService'
import { useAuth } from '../contexts/AuthContext'
import { getPatients } from '../services/userService'


export default function MedicalDashboard() {
  const { user } = useAuth()
  const isDoctor = user?.role === 'doctor'

  const [selectedParameter, setSelectedParameter] = useState(null)
  const [filterParameter, setFilterParameter] = useState('')
  const [allParameters, setAllParameters] = useState([])

  
  const [selectedPatientId, setSelectedPatientId] = useState(null)
  const [selectedPatientName, setSelectedPatientName] = useState('')
  const [searchTerm, setSearchTerm] = useState('')

  
  const { data: patients = [], isLoading: patientsLoading, error: patientsError } = useQuery({
    queryKey: ['patients', searchTerm],
    queryFn: () => getPatients({ search: searchTerm }),
    enabled: isDoctor && !selectedPatientId,
    staleTime: 1000 * 60 * 5, 
  })

  
  const { data, isLoading, error, refetch } = useQuery({
    queryKey: ['dashboard', filterParameter, selectedPatientId],
    queryFn: () => getDashboardData(filterParameter, selectedPatientId),
    enabled: !isDoctor || !!selectedPatientId,
    staleTime: 1000 * 60 * 5, 
  })

  
  useEffect(() => {
    if (data?.parameters) {
      const params = data.parameters.map((p) => p.parameter)
      setAllParameters(params)
    }
  }, [data])

  const parameters = data?.parameters || []
  const selectedData = parameters.find((p) => p.parameter === selectedParameter)

  
  const getLatestValue = (analytics) => {
    if (analytics?.values && analytics.values.length > 0) {
      return analytics.values[analytics.values.length - 1]?.value
    }
    return null
  }

  
  const getUnit = (analytics) => {
    return ''
  }

  const handleCloseDetail = () => {
    setSelectedParameter(null)
  }

  const handleReset = () => {
    setFilterParameter('')
    handleCloseDetail()
  }

  
  if (isDoctor && !selectedPatientId) {
    return (
      <div className="min-h-screen bg-gray-50">
        
        <div className="sticky top-0 z-10 bg-white border-b border-gray-200 shadow-sm">
          <div className="max-w-7xl mx-auto px-6 py-6">
            <h1 className="text-3xl font-bold text-gray-900">Health Analytics</h1>
            <p className="text-gray-600 mt-1">
              Select a patient to monitor their medical parameters and track health trends
            </p>
          </div>
        </div>

        
        <div className="max-w-7xl mx-auto px-6 py-8">
          
          <div className="mb-6 flex gap-4 items-center justify-between">
            <div className="relative flex-1 max-w-md">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
              <input
                type="text"
                placeholder="Search patients by name or email..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-10 pr-4 py-2.5 border border-gray-300 rounded-xl bg-white shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-sm transition-all"
              />
            </div>
          </div>

          
          {patientsLoading && (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {Array.from({ length: 6 }).map((_, i) => (
                <div key={i} className="bg-white rounded-xl border border-gray-200 p-6 shadow-sm">
                  <Skeleton height={24} width="60%" className="mb-4" />
                  <Skeleton height={20} width="40%" className="mb-2" />
                  <Skeleton height={20} width="80%" />
                </div>
              ))}
            </div>
          )}

          
          {patientsError && (
            <div className="bg-red-50 border border-red-200 rounded-lg p-6 text-center">
              <p className="text-red-700 font-medium">Failed to load patients list.</p>
              <p className="text-red-600 text-sm mt-1">{patientsError.message}</p>
            </div>
          )}

          
          {!patientsLoading && !patientsError && (
            <>
              {patients.length === 0 ? (
                <div className="text-center bg-white border border-gray-200 rounded-xl p-12 shadow-sm">
                  <Users className="w-16 h-16 text-gray-300 mx-auto mb-4" />
                  <h3 className="text-lg font-semibold text-gray-800 mb-1">No Patients Found</h3>
                  <p className="text-gray-500 text-sm">
                    {searchTerm ? 'Try adjusting your search criteria.' : 'You do not have any approved patients yet.'}
                  </p>
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                  {patients.map((patient) => (
                    <div
                      key={patient.id}
                      className="bg-white hover:bg-gray-55/50 border border-gray-200 hover:border-blue-300 rounded-xl p-6 shadow-sm hover:shadow-md transition-all duration-300 flex flex-col justify-between"
                    >
                      <div>
                        
                        <div className="flex items-start justify-between mb-4">
                          <div className="flex items-center gap-3">
                            <div className="w-10 h-10 rounded-full bg-blue-50 flex items-center justify-center text-blue-600 font-semibold">
                              {patient.full_name?.charAt(0).toUpperCase() || 'P'}
                            </div>
                            <div>
                              <h3 className="font-semibold text-gray-900 leading-tight">{patient.full_name}</h3>
                              <p className="text-xs text-gray-500 mt-0.5">{patient.email}</p>
                            </div>
                          </div>
                        </div>

                        
                        <div className="grid grid-cols-2 gap-y-2 gap-x-4 py-3 border-t border-b border-gray-100 my-4 text-xs">
                          <div className="flex flex-col">
                            <span className="text-gray-400 font-medium">Age / Gender</span>
                            <span className="text-gray-700 font-semibold mt-0.5">
                              {patient.age ? `${patient.age} yrs` : '—'} / {patient.gender ? patient.gender.charAt(0).toUpperCase() + patient.gender.slice(1) : '—'}
                            </span>
                          </div>
                          <div className="flex flex-col">
                            <span className="text-gray-400 font-medium">Blood Group</span>
                            <span className="text-gray-700 font-semibold mt-0.5">{patient.blood_group || '—'}</span>
                          </div>
                          <div className="flex flex-col">
                            <span className="text-gray-400 font-medium">Reports</span>
                            <span className="text-gray-700 font-semibold mt-0.5 flex items-center gap-1">
                              <FileText className="w-3.5 h-3.5 text-gray-400" />
                              {patient.report_count ?? 0} reports
                            </span>
                          </div>
                          <div className="flex flex-col">
                            <span className="text-gray-400 font-medium">Last Update</span>
                            <span className="text-gray-700 font-semibold mt-0.5 flex items-center gap-1">
                              <Calendar className="w-3.5 h-3.5 text-gray-400" />
                              {patient.last_report_date ? new Date(patient.last_report_date).toLocaleDateString() : 'No reports'}
                            </span>
                          </div>
                        </div>
                      </div>

                      <button
                        onClick={() => {
                          setSelectedPatientId(patient.id)
                          setSelectedPatientName(patient.full_name)
                        }}
                        className="w-full mt-2 inline-flex items-center justify-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-sm font-semibold shadow-sm hover:shadow transition-all duration-200"
                      >
                        View Analytics
                        <ChevronRight className="w-4 h-4" />
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </>
          )}
        </div>
      </div>
    )
  }

  
  if (isLoading && parameters.length === 0) {
    return (
      <div className="min-h-screen bg-gray-50 p-6">
        <div className="max-w-7xl mx-auto">
          <div className="mb-8 flex justify-between items-start">
            <div>
              <Skeleton height={40} width="200px" className="mb-4" />
              <Skeleton height={20} width="400px" />
            </div>
            {isDoctor && (
              <button
                onClick={() => {
                  setSelectedPatientId(null)
                  setSelectedPatientName('')
                }}
                className="inline-flex items-center gap-2 px-4 py-2 border border-gray-300 text-gray-700 rounded-lg font-medium text-sm transition-all"
              >
                <Users className="w-4 h-4" />
                Change Patient
              </button>
            )}
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {Array.from({ length: 6 }).map((_, i) => (
              <div key={i} className="bg-white rounded-lg border border-gray-200 p-6">
                <Skeleton height={24} width="50%" className="mb-4" />
                <Skeleton height={32} width="60%" className="mb-4" />
                <Skeleton height={20} width="40%" />
              </div>
            ))}
          </div>
        </div>
      </div>
    )
  }

  
  if (error) {
    return (
      <div className="min-h-screen bg-gray-50 p-6">
        <div className="max-w-7xl mx-auto">
          <div className="bg-red-50 border border-red-200 rounded-lg p-6">
            <h2 className="text-lg font-semibold text-red-800 mb-2">Error Loading Dashboard</h2>
            <p className="text-red-700 mb-4">
              {error?.message || 'Failed to load dashboard data'}
            </p>
            <div className="flex gap-4">
              {isDoctor && (
                <button
                  onClick={() => {
                    setSelectedPatientId(null)
                    setSelectedPatientName('')
                  }}
                  className="inline-flex items-center gap-2 bg-gray-600 hover:bg-gray-700 text-white px-4 py-2 rounded-lg font-medium transition-colors"
                >
                  <Users className="w-4 h-4" />
                  Select Different Patient
                </button>
              )}
              <button
                onClick={() => refetch()}
                className="inline-flex items-center gap-2 bg-red-600 hover:bg-red-700 text-white px-4 py-2 rounded-lg font-medium transition-colors"
              >
                <RotateCcw className="w-4 h-4" />
                Try Again
              </button>
            </div>
          </div>
        </div>
      </div>
    )
  }

  
  if (!isLoading && parameters.length === 0 && !isDoctor) {
    return (
      <div className="min-h-screen bg-gray-50 p-6">
        <div className="max-w-7xl mx-auto">
          <div className="text-center py-12">
            <h2 className="text-2xl font-semibold text-gray-800 mb-2">No Data Available</h2>
            <p className="text-gray-600 mb-6">
              {isDoctor
                ? 'This patient has not uploaded any medical reports yet.'
                : 'Upload medical reports to see your health analytics and insights.'}
            </p>
            <div className="flex justify-center gap-4">
              {isDoctor && (
                <button
                  onClick={() => {
                    setSelectedPatientId(null)
                    setSelectedPatientName('')
                  }}
                  className="inline-flex items-center gap-2 bg-gray-600 hover:bg-gray-700 text-white px-6 py-2 rounded-lg font-medium transition-colors"
                >
                  <Users className="w-4 h-4" />
                  Select Different Patient
                </button>
              )}
              <button
                onClick={() => handleReset()}
                className="inline-flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white px-6 py-2 rounded-lg font-medium transition-colors"
              >
                <RotateCcw className="w-4 h-4" />
                Refresh
              </button>
            </div>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50">
      
      <div className="sticky top-0 z-10 bg-white border-b border-gray-200 shadow-sm">
        <div className="max-w-7xl mx-auto px-6 py-6">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-4">
            <div>
              <div className="flex items-center gap-3 flex-wrap">
                <h1 className="text-3xl font-bold text-gray-900">Health Dashboard</h1>
                {isDoctor && selectedPatientId && (
                  <span className="px-3 py-1 bg-blue-50 border border-blue-200 text-blue-800 text-xs font-semibold rounded-full flex items-center gap-1.5 shadow-sm">
                    <User className="w-3.5 h-3.5" />
                    Patient: {selectedPatientName}
                  </span>
                )}
              </div>
              <p className="text-gray-600 mt-1">
                {isDoctor && selectedPatientId
                  ? `Monitoring medical parameters and tracking health trends for ${selectedPatientName}`
                  : 'Monitor your medical parameters and track health trends'}
              </p>
            </div>
            
            <div className="flex items-center gap-3">
              {isDoctor && selectedPatientId && (
                <button
                  onClick={() => {
                    setSelectedPatientId(null)
                    setSelectedPatientName('')
                    setSelectedParameter(null)
                  }}
                  className="inline-flex items-center gap-2 px-4 py-2 border border-gray-300 hover:border-gray-400 text-gray-700 hover:bg-gray-50 rounded-lg font-medium text-sm transition-all"
                >
                  <Users className="w-4 h-4" />
                  Change Patient
                </button>
              )}
              <button
                onClick={() => refetch()}
                className="inline-flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg font-medium transition-colors text-sm shadow-sm"
                title="Refresh data"
              >
                <RotateCcw className="w-4 h-4" />
                Refresh
              </button>
            </div>
          </div>

          
          <div className="flex gap-3 items-center">
            <Filter className="w-5 h-5 text-gray-600" />
            <select
              value={filterParameter}
              onChange={(e) => {
                setFilterParameter(e.target.value)
                setSelectedParameter(null)
              }}
              className="px-3 py-2 border border-gray-300 rounded-lg bg-white text-gray-700 text-sm font-medium hover:border-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="">All Parameters</option>
              {allParameters.map((param) => (
                <option key={param} value={param}>
                  {param}
                </option>
              ))}
            </select>

            {filterParameter && (
              <button
                onClick={() => handleReset()}
                className="inline-flex items-center gap-2 text-gray-600 hover:text-gray-800 text-sm font-medium"
              >
                <X className="w-4 h-4" />
                Clear filter
              </button>
            )}
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-6 py-8">
        
        {parameters.length === 0 ? (
          <div className="bg-white rounded-xl border border-gray-200 p-12 text-center shadow-sm mb-8">
            <FileText className="w-12 h-12 text-gray-300 mx-auto mb-3" />
            <h3 className="text-lg font-semibold text-gray-800">No Parameters Recorded</h3>
            <p className="text-sm text-gray-500 mt-1 max-w-sm mx-auto">
              This patient has no uploaded medical reports or analyzed lab values yet.
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mb-8">
            {parameters.map((item) => (
              <ParameterCard
                key={item.parameter}
                parameter={item.parameter}
                latestValue={getLatestValue(item.analytics)}
                unit={getUnit(item.analytics)}
                trend={item.analytics?.trend}
                riskLevel={item.risk?.risk_level}
                confidence={item.risk?.confidence}
                isLoading={false}
                onClick={() => setSelectedParameter(item.parameter)}
              />
            ))}
          </div>
        )}

        {isDoctor && selectedPatientId && (
          <PatientAiChat
            key={selectedPatientId}
            patientId={selectedPatientId}
            patientName={selectedPatientName}
          />
        )}

        
        {selectedData && (
          <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center p-4">
            <div className="bg-white rounded-lg shadow-xl max-w-4xl w-full max-h-[90vh] overflow-y-auto">
              
              <div className="sticky top-0 bg-white border-b border-gray-200 px-6 py-4 flex justify-between items-center">
                <div>
                  <h2 className="text-2xl font-bold text-gray-900">{selectedData.parameter}</h2>
                  <p className="text-sm text-gray-600 mt-1">Detailed analysis and insights</p>
                </div>
                <button
                  onClick={handleCloseDetail}
                  className="text-gray-500 hover:text-gray-700 transition-colors"
                >
                  <X className="w-6 h-6" />
                </button>
              </div>

              
              <div className="p-6 space-y-8">
                
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  <div className="bg-blue-50 rounded-lg p-4 border border-blue-200">
                    <p className="text-xs font-medium text-blue-600 uppercase tracking-wide">Latest</p>
                    <p className="text-2xl font-bold text-blue-900 mt-1">
                      {getLatestValue(selectedData.analytics)?.toFixed(2) || 'N/A'}
                    </p>
                  </div>

                  <div className="bg-green-50 rounded-lg p-4 border border-green-200">
                    <p className="text-xs font-medium text-green-600 uppercase tracking-wide">Average</p>
                    <p className="text-2xl font-bold text-green-900 mt-1">
                      {selectedData.analytics?.avg?.toFixed(2) || 'N/A'}
                    </p>
                  </div>

                  <div className="bg-purple-50 rounded-lg p-4 border border-purple-200">
                    <p className="text-xs font-medium text-purple-600 uppercase tracking-wide">Trend</p>
                    <p className="text-lg font-bold text-purple-900 mt-1">
                      {selectedData.analytics?.trend || 'Unknown'}
                    </p>
                  </div>

                  <div className="bg-gray-50 rounded-lg p-4 border border-gray-200">
                    <p className="text-xs font-medium text-gray-600 uppercase tracking-wide">Risk Level</p>
                    <div className="mt-1">
                      <RiskBadge
                        riskLevel={selectedData.risk?.risk_level}
                        confidence={selectedData.risk?.confidence}
                        size="md"
                      />
                    </div>
                  </div>
                </div>

                
                <div>
                  <TrendChart
                    data={selectedData.analytics?.values || []}
                    parameter={selectedData.parameter}
                    unit={getUnit(selectedData.analytics)}
                    height={400}
                  />
                </div>

                
                <div>
                  <InsightsPanel
                    insights={selectedData.insights}
                    parameter={selectedData.parameter}
                  />
                </div>

                
                {selectedData.risk?.reason && (
                  <div className="bg-amber-50 border border-amber-200 rounded-lg p-4">
                    <h4 className="font-semibold text-amber-900 mb-2">Risk Analysis</h4>
                    <p className="text-sm text-amber-800">{selectedData.risk.reason}</p>
                  </div>
                )}
              </div>

              
              <div className="border-t border-gray-200 bg-gray-50 px-6 py-4">
                <button
                  onClick={handleCloseDetail}
                  className="w-full bg-gray-600 hover:bg-gray-700 text-white px-4 py-2 rounded-lg font-medium transition-colors"
                >
                  Close
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
