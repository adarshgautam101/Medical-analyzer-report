import { useState, useEffect, useCallback, useRef } from 'react'
import { useDropzone } from 'react-dropzone'
import { Link, useNavigate } from 'react-router-dom'
import api from '../utils/api'
import { useAuth } from '../contexts/AuthContext'
import { Upload, FileText, Trash2, Loader, AlertCircle, BarChart2, TrendingUp, Activity, ChevronLeft, ChevronRight, X } from 'lucide-react'

const PAGE_SIZE = 10

export default function Reports() {
  const { user } = useAuth()
  const navigate = useNavigate()
  const [reports, setReports] = useState([])
  const [categories, setCategories] = useState([])
  const [categoryFilter, setCategoryFilter] = useState('')
  const [categoriesLoading, setCategoriesLoading] = useState(true)
  const [loading, setLoading] = useState(true)
  const [listError, setListError] = useState('')
  const [uploading, setUploading] = useState(false)
  const [uploadProgress, setUploadProgress] = useState(0)
  const [page, setPage] = useState(1)
  const [invalidReportModal, setInvalidReportModal] = useState({
    isOpen: false,
    title: 'Invalid Report',
    message: '',
  })
  const pollingRef = useRef(null)
  const alertedReportIdsRef = useRef(new Set())

  const fetchReports = useCallback(async () => {
    try {
      const response = await api.get('/api/reports')
      const rawReports = response.data || []

      const invalidReports = rawReports.filter(
        (r) => r.ocr_status === 'invalid' || r.code === 'INVALID_MEDICAL_REPORT'
      )

      invalidReports.forEach((invReport) => {
        if (!alertedReportIdsRef.current.has(invReport.id)) {
          alertedReportIdsRef.current.add(invReport.id)
          setInvalidReportModal({
            isOpen: true,
            title: 'Invalid Report',
            message:
              invReport.rejection_reason ||
              'This file is not a valid medical report and cannot be uploaded. Please upload a valid medical report.',
          })
          api.delete(`/api/reports/${invReport.id}`).catch(() => {})
        }
      })

      const validReports = rawReports.filter((r) => r.ocr_status !== 'invalid')
      setReports(validReports)
      setListError('')
    } catch (error) {
      console.error('Error fetching reports:', error)
      setListError(
        error.response?.data?.detail || error.message || 'Failed to load reports.'
      )
    }
  }, [])

  useEffect(() => {
    let cancelled = false
    const load = async () => {
      setLoading(true)
      await fetchReports()
      if (!cancelled) setLoading(false)
    }
    load()
    return () => {
      cancelled = true
    }
  }, [fetchReports])

  useEffect(() => {
    const loadCategories = async () => {
      try {
        const res = await api.get('/api/report-categories')
        setCategories(res.data)
      } catch (e) {
        console.error('Error loading categories:', e)
      } finally {
        setCategoriesLoading(false)
      }
    }
    loadCategories()
  }, [])

  useEffect(() => {
    const needsPoll = reports.some(
      (r) => r.ocr_status === 'pending' || r.ocr_status === 'processing'
    )
    if (!needsPoll) {
      if (pollingRef.current) {
        clearInterval(pollingRef.current)
        pollingRef.current = null
      }
      return
    }
    if (pollingRef.current) return
    pollingRef.current = setInterval(() => {
      fetchReports()
    }, 3000)
    return () => {
      if (pollingRef.current) {
        clearInterval(pollingRef.current)
        pollingRef.current = null
      }
    }
  }, [reports, fetchReports])

  const onDrop = useCallback(async (acceptedFiles) => {
    if (acceptedFiles.length === 0) return

    const file = acceptedFiles[0]

    const existingNames = reports.map((r) => r.file_name.toLowerCase())
    if (existingNames.includes(file.name.toLowerCase())) {
      alert('This file has already been uploaded. Please choose a different file.')
      return
    }

    setUploading(true)
    setUploadProgress(0)

    try {
      const formData = new FormData()
      formData.append('file', file)

      const response = await api.post('/api/reports/upload', formData, {
        onUploadProgress: (progressEvent) => {
          const total = progressEvent.total || 1
          const percentCompleted = Math.round((progressEvent.loaded * 100) / total)
          setUploadProgress(percentCompleted)
        },
      })

      if (response.data && (response.data.ocr_status === 'invalid' || response.data.code === 'INVALID_MEDICAL_REPORT')) {
        setInvalidReportModal({
          isOpen: true,
          title: 'Invalid Report',
          message:
            response.data.rejection_reason ||
            'This file is not a valid medical report and cannot be uploaded. Please upload a valid medical report.',
        })
      }

      await fetchReports()
    } catch (error) {
      console.error('Error uploading file:', error)
      const errData = error.response?.data
      const isInvalidMedical =
        errData?.code === 'INVALID_MEDICAL_REPORT' ||
        errData?.error?.code === 'INVALID_MEDICAL_REPORT' ||
        (error.response?.status === 400 &&
          (errData?.detail?.toLowerCase().includes('medical report') ||
           errData?.message?.toLowerCase().includes('medical report')))

      if (isInvalidMedical) {
        setInvalidReportModal({
          isOpen: true,
          title: 'Invalid Report',
          message:
            errData?.message ||
            errData?.detail ||
            'This file is not a valid medical report and cannot be uploaded. Please upload a valid medical report.',
        })
      } else {
        alert(
          errData?.detail || errData?.message || 'Error uploading file. Please try again.'
        )
      }
    } finally {
      setUploading(false)
      setUploadProgress(0)
    }
  }, [fetchReports, reports])

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: {
      'image/*': ['.png', '.jpg', '.jpeg'],
      'application/pdf': ['.pdf'],
    },
    maxFiles: 1,
  })

  const handleDelete = async (reportId) => {
    if (!window.confirm('Are you sure you want to delete this report?')) {
      return
    }

    try {
      await api.delete(`/api/reports/${reportId}`)
      setReports((prev) => prev.filter((r) => r.id !== reportId))
    } catch (error) {
      console.error('Error deleting report:', error)
      alert(
        error.response?.data?.detail || 'Error deleting report. Please try again.'
      )
    }
  }



  const filteredReports = categoryFilter
    ? reports.filter((r) => (r.category || '') === categoryFilter)
    : reports


  const totalPages = Math.ceil(filteredReports.length / PAGE_SIZE)
  const paginatedReports = filteredReports.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE)


  useEffect(() => {
    setPage(1)
  }, [categoryFilter])

  if (loading) {
    return <div className="text-center py-12">Loading reports...</div>
  }

  return (
    <div className="px-4 py-6">
      <div className="flex flex-wrap justify-between items-center gap-4 mb-6">
        <h1 className="text-3xl font-bold text-gray-900">Reports</h1>
        <div className="flex flex-wrap items-center gap-3">
          <label className="flex items-center gap-2 text-sm text-gray-600">
            <span>Category</span>
            <select
              className="border border-gray-300 rounded-md px-3 py-2 bg-white"
              value={categoryFilter}
              onChange={(e) => setCategoryFilter(e.target.value)}
              disabled={categoriesLoading}
            >
              <option value="">All categories</option>
              {categories.map((c) => (
                <option key={c.id} value={c.name}>
                  {c.name}
                </option>
              ))}
            </select>
          </label>
          <Link
            to="/analytics/health-summary"
            className="inline-flex items-center px-4 py-2 border border-blue-300 text-sm font-medium rounded-md text-blue-700 bg-blue-50 hover:bg-blue-100"
          >
            <TrendingUp className="w-4 h-4 mr-2" />
            Health Summary
          </Link>
          <Link
            to="/analytics/correlation"
            className="inline-flex items-center px-4 py-2 border border-purple-300 text-sm font-medium rounded-md text-purple-700 bg-purple-50 hover:bg-purple-100"
          >
            <Activity className="w-4 h-4 mr-2" />
            Lab Correlation
          </Link>
        </div>
      </div>

      {listError && (
        <div className="mb-4 rounded-md bg-red-50 border border-red-200 text-red-800 px-4 py-3 text-sm">
          {listError}
        </div>
      )}


      {user?.role === 'patient' && (
        <div
          {...getRootProps()}
          className={`border-2 border-dashed rounded-lg p-12 text-center cursor-pointer transition-colors ${isDragActive
              ? 'border-blue-500 bg-blue-50'
              : 'border-gray-300 hover:border-gray-400'
            } ${uploading ? 'opacity-50 pointer-events-none' : ''}`}
        >
          <input {...getInputProps()} />
          {uploading ? (
            <div>
              <Loader className="w-12 h-12 mx-auto mb-4 text-blue-500 animate-spin" />
              <p className="text-gray-600">Uploading... {uploadProgress}%</p>
            </div>
          ) : (
            <div>
              <Upload className="w-12 h-12 mx-auto mb-4 text-gray-400" />
              <p className="text-lg font-medium text-gray-700 mb-2">
                {isDragActive ? 'Drop the file here' : 'Drag & drop a report file here'}
              </p>
              <p className="text-sm text-gray-500">or click to select (PDF, PNG, JPG)</p>
            </div>
          )}
        </div>
      )}


      <div className="mt-8 bg-white rounded-lg shadow">
        <div className="px-6 py-4 border-b border-gray-200 flex justify-between items-center">
          <h2 className="text-xl font-semibold text-gray-900">All Reports</h2>
          <span className="text-sm text-gray-500">
            {filteredReports.length} report{filteredReports.length !== 1 ? 's' : ''}
            {categoryFilter ? ` in "${categoryFilter}"` : ''}
          </span>
        </div>
        <div className="divide-y divide-gray-200">
          {paginatedReports.length === 0 ? (
            <div className="px-6 py-12 text-center text-gray-500">
              <FileText className="w-12 h-12 mx-auto mb-4 text-gray-400" />
              <p>
                {reports.length === 0
                  ? 'No reports uploaded yet.'
                  : 'No reports match this category.'}
              </p>
              {reports.length === 0 && user?.role === 'patient' && (
                <p className="text-sm mt-2">Upload your first medical report above.</p>
              )}
            </div>
          ) : (
            paginatedReports.map((report) => (
              <div
                key={report.id}
                className="px-6 py-4 hover:bg-gray-50 transition-colors"
              >
                <div className="flex items-center justify-between">
                  <Link
                    to={`/reports/${report.id}`}
                    className="flex-1 flex items-center space-x-4"
                  >
                    <FileText className="w-8 h-8 text-blue-500" />
                    <div className="flex-1">
                      <p className="font-medium text-gray-900">{report.file_name}</p>
                      <p className="text-sm text-gray-500">
                        {new Date(report.upload_date).toLocaleDateString()} •{' '}
                        {report.category || 'Uncategorized'}
                      </p>
                      {report.ai_summary && (
                        <p className="text-sm text-gray-600 mt-1 line-clamp-2">
                          {report.ai_summary}
                        </p>
                      )}
                    </div>
                  </Link>
                  <div className="flex items-center space-x-2">
                    <span
                      className={`px-2 py-1 text-xs rounded ${report.ocr_status === 'completed'
                          ? 'bg-green-100 text-green-800'
                          : report.ocr_status === 'processing' || report.ocr_status === 'pending'
                            ? 'bg-yellow-100 text-yellow-800'
                            : report.ocr_status === 'failed'
                              ? 'bg-red-100 text-red-800'
                              : 'bg-gray-100 text-gray-800'
                        }`}
                    >
                      {report.ocr_status}
                    </span>

                    {user?.role === 'patient' && (
                      <button
                        type="button"
                        onClick={(e) => {
                          e.preventDefault()
                          handleDelete(report.id)
                        }}
                        className="p-2 text-gray-400 hover:text-red-600 transition-colors"
                        title="Delete"
                      >
                        <Trash2 className="w-5 h-5" />
                      </button>
                    )}
                  </div>
                </div>
              </div>
            ))
          )}
        </div>


        {totalPages > 1 && (
          <div className="px-6 py-4 border-t border-gray-200 flex items-center justify-center gap-3">
            <button
              type="button"
              onClick={() => setPage((p) => Math.max(1, p - 1))}
              disabled={page === 1}
              className="inline-flex items-center px-3 py-2 rounded-md border border-gray-300 text-sm text-gray-700 hover:bg-gray-50 disabled:opacity-50"
            >
              <ChevronLeft className="w-4 h-4 mr-1" /> Prev
            </button>
            <span className="text-sm text-gray-600">
              Page {page} of {totalPages}
            </span>
            <button
              type="button"
              onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
              disabled={page === totalPages}
              className="inline-flex items-center px-3 py-2 rounded-md border border-gray-300 text-sm text-gray-700 hover:bg-gray-50 disabled:opacity-50"
            >
              Next <ChevronRight className="w-4 h-4 ml-1" />
            </button>
          </div>
        )}
      </div>

      {invalidReportModal.isOpen && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-[9999] flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-2xl border border-gray-100 p-6 max-w-md w-full relative animate-in fade-in zoom-in-95 duration-200">
            <button
              onClick={() => setInvalidReportModal({ isOpen: false, title: 'Invalid Report', message: '' })}
              className="absolute top-4 right-4 text-gray-400 hover:text-gray-600 transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
            <div className="flex items-start gap-4">
              <div className="w-12 h-12 rounded-xl bg-red-50 flex items-center justify-center text-red-600 flex-shrink-0 border border-red-100">
                <AlertCircle className="w-6 h-6" />
              </div>
              <div className="flex-1">
                <h3 className="font-bold text-gray-900 text-lg">{invalidReportModal.title}</h3>
                <p className="text-sm text-gray-600 mt-2 leading-relaxed">
                  {invalidReportModal.message}
                </p>
              </div>
            </div>
            <div className="mt-6 flex justify-end">
              <button
                type="button"
                onClick={() => setInvalidReportModal({ isOpen: false, title: 'Invalid Report', message: '' })}
                className="px-5 py-2.5 bg-red-600 hover:bg-red-700 text-white rounded-xl text-sm font-semibold shadow-sm transition-colors"
              >
                OK
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
