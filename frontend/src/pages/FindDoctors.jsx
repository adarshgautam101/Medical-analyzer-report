import { useState, useEffect, useCallback } from 'react'
import api from '../utils/api'
import { Search, User, Stethoscope, Loader, HeartHandshake, Eye, X, Clock, CheckCircle, XCircle, ChevronLeft, ChevronRight } from 'lucide-react'

const PAGE_SIZE = 8

export default function FindDoctors() {
  const [doctors, setDoctors] = useState([])
  const [categories, setCategories] = useState([])
  const [specialties, setSpecialties] = useState([])
  const [accessMap, setAccessMap] = useState({}) 
  const [doctorAccessList, setDoctorAccessList] = useState([])
  const [name, setName] = useState('')
  const [categoryId, setCategoryId] = useState('')
  const [specialtyId, setSpecialtyId] = useState('')
  const [loading, setLoading] = useState(true)
  const [listLoading, setListLoading] = useState(false)
  const [hasSearched, setHasSearched] = useState(false)
  const [error, setError] = useState('')
  const [actionMsg, setActionMsg] = useState({})
  const [actionBusy, setActionBusy] = useState({})
  const [page, setPage] = useState(1)

  
  const [viewDoctor, setViewDoctor] = useState(null)
  const [viewLoading, setViewLoading] = useState(false)

  const loadAccessList = useCallback(async () => {
    try {
      const res = await api.get('/api/patient/doctor-access')
      setDoctorAccessList(res.data || [])
      const map = {}
      ;(res.data || []).forEach((a) => {
        const status = a.status === 'accepted' ? 'approved' : a.status
        map[a.doctor_id] = status
      })
      setAccessMap(map)
    } catch (e) {
      console.error('Failed to load doctor access list:', e)
    }
  }, [])

  useEffect(() => {
    const loadMeta = async () => {
      try {
        const catRes = await api.get('/api/categories')
        setCategories(catRes.data)
        await loadAccessList()
      } catch (e) {
        console.error(e)
        setError('Could not load initial data.')
      } finally {
        setLoading(false)
      }
    }
    loadMeta()
  }, [loadAccessList])

  useEffect(() => {
    const loadSpec = async () => {
      if (!categoryId) {
        setSpecialties([])
        setSpecialtyId('')
        return
      }
      try {
        const res = await api.get('/api/specialties', {
          params: { category_id: categoryId },
        })
        setSpecialties(res.data)
        setSpecialtyId('')
      } catch (e) {
        console.error(e)
      }
    }
    loadSpec()
  }, [categoryId])

  const fetchDoctors = useCallback(async () => {
    setListLoading(true)
    setError('')
    setHasSearched(true)
    setPage(1)
    try {
      const params = {}
      if (name.trim()) params.name = name.trim()
      if (categoryId) params.category_id = categoryId
      if (specialtyId) params.specialty_id = specialtyId
      const res = await api.get('/api/doctors', { params })
      setDoctors(res.data)
    } catch (e) {
      console.error(e)
      setError(e.response?.data?.detail || 'Could not load doctors.')
      setDoctors([])
    } finally {
      setListLoading(false)
    }
  }, [name, categoryId, specialtyId])

  const requestAccess = async (doctorId) => {
    setActionBusy((b) => ({ ...b, [doctorId]: true }))
    setActionMsg((m) => ({ ...m, [doctorId]: '' }))
    try {
      await api.post('/api/patient/doctor-access', { doctor_id: doctorId })
      setActionMsg((m) => ({ ...m, [doctorId]: 'Request sent' }))
      setAccessMap((prev) => ({ ...prev, [doctorId]: 'pending' }))
      await loadAccessList()
    } catch (e) {
      const d = e.response?.data?.detail
      setActionMsg((m) => ({
        ...m,
        [doctorId]: typeof d === 'string' ? d : 'Request failed',
      }))
    } finally {
      setActionBusy((b) => ({ ...b, [doctorId]: false }))
    }
  }

  const revokeAccess = async (accessId, doctorId) => {
    if (doctorId) {
      setActionBusy((b) => ({ ...b, [doctorId]: true }))
    }
    try {
      await api.post(`/api/patient/doctor-access/${accessId}/revoke`)
      await loadAccessList()
    } catch (e) {
      console.error('Failed to revoke access:', e)
    } finally {
      if (doctorId) {
        setActionBusy((b) => ({ ...b, [doctorId]: false }))
      }
    }
  }

  const openDoctorInfo = async (doctorId) => {
    setViewLoading(true)
    setViewDoctor(null)
    try {
      const res = await api.get(`/api/doctor/public/${doctorId}`)
      setViewDoctor(res.data)
    } catch (e) {
      console.error(e)
      setViewDoctor({ id: doctorId, error: 'Could not load doctor info.' })
    } finally {
      setViewLoading(false)
    }
  }

  const getStatusBadge = (doctorId) => {
    const status = accessMap[doctorId]
    if (!status) return null

    const styles = {
      pending: { bg: 'bg-yellow-100 text-yellow-800', icon: Clock, label: 'Pending' },
      approved: { bg: 'bg-green-100 text-green-800', icon: CheckCircle, label: 'Accepted' },
      rejected: { bg: 'bg-red-100 text-red-800', icon: XCircle, label: 'Declined' },
      revoked: { bg: 'bg-gray-100 text-gray-700', icon: XCircle, label: 'Revoked' },
    }
    const s = styles[status] || styles.revoked
    const Icon = s.icon
    return (
      <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded text-xs font-medium ${s.bg}`}>
        <Icon className="w-3 h-3" />
        {s.label}
      </span>
    )
  }

  
  const totalPages = Math.ceil(doctors.length / PAGE_SIZE)
  const paginatedDoctors = doctors.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE)

  if (loading) {
    return (
      <div className="text-center py-12 flex flex-col items-center gap-2">
        <Loader className="w-8 h-8 text-blue-500 animate-spin" />
        Loading…
      </div>
    )
  }

  const FIELD_LABELS = {
    category_name: 'Category',
    degrees: 'Degrees',
    experienceYears: 'Experience',
    licenseNumber: 'License No.',
    licenseIssuingAuthority: 'License Authority',
    clinicName: 'Clinic',
    clinicAddress: 'Address',
    clinicPhone: 'Phone',
    clinicEmail: 'Email',
    bio: 'Bio',
  }

  return (
    <div className="px-4 py-6 max-w-5xl mx-auto">
      <h1 className="text-3xl font-bold text-gray-900 mb-2">Find & Manage Doctors</h1>
      <p className="text-gray-600 mb-6">
        Manage active doctor permissions or search for new doctors on the platform.
      </p>

      
      <div className="bg-white rounded-xl shadow-md p-6 mb-8">
        <h2 className="text-xl font-semibold text-gray-900 mb-2">
          Doctor Access Management
        </h2>
        <p className="text-sm text-gray-600 mb-4">
          Doctors can only view your reports, lab values, and notes while access
          is <span className="font-medium text-gray-700">approved</span>. If you revoke access,
          they lose visibility immediately.
        </p>

        {doctorAccessList.length === 0 ? (
          <p className="text-sm text-gray-500 py-2">No active or pending doctor access requests yet.</p>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {doctorAccessList.map((row) => {
              const status = row.status === 'accepted' ? 'approved' : row.status
              const badgeClass =
                status === 'approved'
                  ? 'bg-green-100 text-green-800'
                  : status === 'pending'
                  ? 'bg-yellow-100 text-yellow-800'
                  : status === 'revoked'
                  ? 'bg-red-100 text-red-800'
                  : 'bg-gray-100 text-gray-700'

              return (
                <div
                  key={row.id}
                  className="flex items-center justify-between border border-gray-150 rounded-lg p-4 bg-gray-50 animate-fade-in"
                >
                  <div>
                    <p className="font-semibold text-gray-900">
                      {row.doctor_name || `Doctor #${row.doctor_id}`}
                    </p>
                    <p className="text-xs text-gray-500 mt-1">
                      Status:{' '}
                      <span className={`px-2 py-0.5 rounded text-xs font-semibold ${badgeClass}`}>
                        {status}
                      </span>
                    </p>
                  </div>

                  <div className="flex gap-2">
                    <button
                      type="button"
                      onClick={() => openDoctorInfo(row.doctor_id)}
                      className="inline-flex items-center text-sm px-3 py-1.5 rounded-md border border-gray-300 text-gray-700 hover:bg-gray-50 transition-colors"
                      title="View doctor profile"
                    >
                      <Eye className="w-4 h-4 mr-1" />
                      View
                    </button>

                    {(status === 'approved' || status === 'pending') && (
                      <button
                        type="button"
                        disabled={actionBusy[row.doctor_id]}
                        onClick={() => revokeAccess(row.id, row.doctor_id)}
                        className="px-3 py-1.5 rounded-md text-sm font-medium bg-red-600 text-white hover:bg-red-700 disabled:opacity-50 transition-colors"
                      >
                        {actionBusy[row.doctor_id] ? 'Revoking...' : 'Revoke'}
                      </button>
                    )}

                    {(status === 'rejected' || status === 'revoked') && (
                      <button
                        type="button"
                        disabled={actionBusy[row.doctor_id]}
                        onClick={() => requestAccess(row.doctor_id)}
                        className="px-3 py-1.5 rounded-md text-sm font-medium bg-indigo-600 text-white hover:bg-indigo-700 disabled:opacity-50 transition-colors"
                      >
                        {actionBusy[row.doctor_id]
                          ? 'Requesting...'
                          : 'Grant Access'}
                      </button>
                    )}
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </div>

      <div className="bg-white rounded-lg shadow p-6 mb-8 space-y-4">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1">Doctor name</label>
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
              <input
                type="search"
                className="w-full pl-9 pr-3 py-2 border border-gray-300 rounded-md text-sm"
                placeholder="Search…"
                value={name}
                onChange={(e) => setName(e.target.value)}
              />
            </div>
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1">Category</label>
            <select
              className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm bg-white"
              value={categoryId}
              onChange={(e) => setCategoryId(e.target.value)}
            >
              <option value="">All categories</option>
              {categories.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1">Specialty</label>
            <select
              className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm bg-white disabled:bg-gray-100"
              value={specialtyId}
              onChange={(e) => setSpecialtyId(e.target.value)}
              disabled={!categoryId}
            >
              <option value="">All specialties{categoryId ? '' : ' (pick category)'}</option>
              {specialties.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.name}
                </option>
              ))}
            </select>
          </div>
        </div>
        <button
          type="button"
          onClick={fetchDoctors}
          disabled={listLoading}
          className="inline-flex items-center px-4 py-2 bg-blue-600 text-white rounded-md text-sm font-medium hover:bg-blue-700 disabled:opacity-50"
        >
          {listLoading && <Loader className="w-4 h-4 mr-2 animate-spin" />}
          Search
        </button>
      </div>

      {error && (
        <div className="mb-4 rounded-md bg-red-50 border border-red-200 text-red-800 px-4 py-3 text-sm">
          {error}
        </div>
      )}

      {!hasSearched ? (
        <div className="text-center py-16 text-gray-500">
          <Search className="w-12 h-12 mx-auto mb-4 text-gray-300" />
          <p className="text-lg font-medium">Use the filters above to search for doctors</p>
          <p className="text-sm mt-1">Results will appear here after you click Search.</p>
        </div>
      ) : (
        <>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {paginatedDoctors.length === 0 && !listLoading ? (
              <p className="text-gray-500 col-span-full text-center py-12">No doctors match your filters.</p>
            ) : (
              paginatedDoctors.map((d) => (
                <div
                  key={d.id}
                  className="bg-white rounded-lg border border-gray-200 shadow-sm p-5 flex flex-col gap-3"
                >
                  <div className="flex items-start gap-3">
                    <div className="p-2 bg-blue-50 rounded-lg">
                      <User className="w-6 h-6 text-blue-600" />
                    </div>
                    <div className="flex-1">
                      <div className="flex items-center gap-2 flex-wrap">
                        <h2 className="text-lg font-semibold text-gray-900">{d.full_name}</h2>
                        {getStatusBadge(d.id)}
                      </div>
                      <div className="flex items-center gap-2 text-sm text-gray-600 mt-1">
                        <Stethoscope className="w-4 h-4" />
                        <span>{d.category_name || '—'}</span>
                        <span className="text-gray-400">·</span>
                        <span>{d.specialty_name || '—'}</span>
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center gap-2 pt-2 border-t border-gray-100">
                    <button
                      type="button"
                      onClick={() => openDoctorInfo(d.id)}
                      className="inline-flex items-center text-sm px-3 py-2 rounded-md border border-gray-300 text-gray-700 hover:bg-gray-50"
                      title="View doctor info"
                    >
                      <Eye className="w-4 h-4 mr-1" />
                      View
                    </button>
                    {(!accessMap[d.id] || accessMap[d.id] === 'rejected' || accessMap[d.id] === 'revoked') && (
                      <button
                        type="button"
                        onClick={() => requestAccess(d.id)}
                        disabled={actionBusy[d.id]}
                        className="inline-flex items-center text-sm px-3 py-2 rounded-md bg-indigo-600 text-white hover:bg-indigo-700 disabled:opacity-50"
                      >
                        <HeartHandshake className="w-4 h-4 mr-2" />
                        {actionBusy[d.id] ? 'Sending…' : 'Request access'}
                      </button>
                    )}
                    {actionMsg[d.id] && (
                      <span className="text-xs text-gray-600">{actionMsg[d.id]}</span>
                    )}
                  </div>
                </div>
              ))
            )}
          </div>

          
          {totalPages > 1 && (
            <div className="flex items-center justify-center gap-3 mt-6">
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
        </>
      )}

      
      {(viewDoctor || viewLoading) && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
          <div className="bg-white rounded-xl shadow-2xl max-w-md w-full mx-4 p-6 relative">
            <button
              type="button"
              onClick={() => { setViewDoctor(null); setViewLoading(false) }}
              className="absolute top-3 right-3 p-1 rounded-full hover:bg-gray-100"
            >
              <X className="w-5 h-5 text-gray-500" />
            </button>
            {viewLoading ? (
              <div className="text-center py-8">
                <Loader className="w-8 h-8 text-blue-500 animate-spin mx-auto" />
                <p className="mt-2 text-gray-500">Loading doctor info…</p>
              </div>
            ) : viewDoctor?.error ? (
              <p className="text-red-600 text-center py-8">{viewDoctor.error}</p>
            ) : (
              <>
                <div className="flex items-center gap-3 mb-4">
                  <div className="p-3 bg-blue-50 rounded-full">
                    <User className="w-8 h-8 text-blue-600" />
                  </div>
                  <h3 className="text-xl font-bold text-gray-900">{viewDoctor.full_name}</h3>
                </div>
                <div className="space-y-3">
                  {Object.entries(FIELD_LABELS).map(([key, label]) => {
                    const val = viewDoctor[key]
                    if (!val && val !== 0) return null
                    return (
                      <div key={key} className="flex gap-2">
                        <span className="text-sm font-medium text-gray-500 min-w-[110px]">{label}:</span>
                        <span className="text-sm text-gray-900">{key === 'experienceYears' ? `${val} years` : val}</span>
                      </div>
                    )
                  })}
                  {Object.entries(FIELD_LABELS).every(([key]) => !viewDoctor[key]) && (
                    <p className="text-sm text-gray-500 text-center py-4">No additional information shared by this doctor.</p>
                  )}
                </div>
              </>
            )}
          </div>
        </div>
      )}
    </div>
  )
}
