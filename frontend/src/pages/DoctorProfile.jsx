import { useState, useEffect } from 'react'
import api from '../utils/api'
import { Save, User, GraduationCap, Briefcase, Building, FileText, Eye, EyeOff, Shield } from 'lucide-react'

const VISIBILITY_FIELD_LABELS = {
  licenseNumber: 'License Number',
  licenseIssuingAuthority: 'Issuing Authority',
  clinicName: 'Clinic Name',
  clinicAddress: 'Clinic Address',
  clinicPhone: 'Clinic Phone',
  clinicEmail: 'Clinic Email',
  bio: 'Bio',
}

export default function DoctorProfile() {
  const [categories, setCategories] = useState([])
  const [profile, setProfile] = useState({
    doctor_category_id: '',
    other_category_name: '',
    degrees: '',
    experience_years: '',
    license_number: '',
    license_issuing_authority: '',
    clinic_name: '',
    clinic_address: '',
    clinic_phone: '',
    clinic_email: '',
    bio: ''
  })
  const [visibleFields, setVisibleFields] = useState({
    licenseNumber: false,
    licenseIssuingAuthority: false,
    clinicName: false,
    clinicAddress: false,
    clinicPhone: false,
    clinicEmail: false,
    bio: false,
  })
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [message, setMessage] = useState('')

  useEffect(() => {
    const loadCategories = async () => {
      try {
        const res = await api.get('/api/categories')
        setCategories(res.data)
      } catch (e) {
        console.error('Error loading categories:', e)
      }
    }
    loadCategories()
    fetchProfile()
  }, [])

  const fetchProfile = async () => {
    try {
      const response = await api.get('/api/doctor/profile')
      setProfile((prev) => ({
        ...prev,
        doctor_category_id: response.data.doctor_category_id || '',
        degrees: response.data.degrees || '',
        experience_years: response.data.experience_years || '',
        license_number: response.data.license_number || '',
        license_issuing_authority: response.data.license_issuing_authority || '',
        clinic_name: response.data.clinic_name || '',
        clinic_address: response.data.clinic_address || '',
        clinic_phone: response.data.clinic_phone || '',
        clinic_email: response.data.clinic_email || '',
        bio: response.data.bio || ''
      }))
      if (response.data.visible_fields) {
        setVisibleFields((prev) => ({ ...prev, ...response.data.visible_fields }))
      }
      setLoading(false)
    } catch (error) {
      console.error('Error fetching profile:', error)
      setLoading(false)
    }
  }

  const selectedCat = categories.find((c) => c.id === profile.doctor_category_id)
  const isOthersSelected = selectedCat?.name?.toLowerCase() === 'others'

  const handleSubmit = async (e) => {
    e.preventDefault()
    setSaving(true)
    setMessage('')

    try {
      const payload = {
        ...profile,
        doctor_category_id: profile.doctor_category_id,
        other_category_name: isOthersSelected ? profile.other_category_name : '',
        experience_years: profile.experience_years ? parseInt(profile.experience_years) : null,
        visible_fields: visibleFields,
      }
      const response = await api.put('/api/doctor/profile', payload)
      if (response.data) {
        setProfile((prev) => ({
          ...prev,
          doctor_category_id: response.data.doctor_category_id || prev.doctor_category_id,
          other_category_name: '',
        }))
        const resCat = await api.get('/api/categories')
        setCategories(resCat.data)
      }
      setMessage('Profile updated successfully!')
      setTimeout(() => setMessage(''), 3000)
    } catch (error) {
      setMessage('Error updating profile. Please try again.')
      console.error('Error updating profile:', error)
    } finally {
      setSaving(false)
    }
  }

  const toggleVisibility = (field) => {
    setVisibleFields((prev) => ({ ...prev, [field]: !prev[field] }))
  }

  if (loading) {
    return <div className="text-center py-12">Loading profile...</div>
  }

  return (
    <div className="px-4 py-6 bg-gray-50 min-h-screen">
      <div className="max-w-4xl mx-auto">
        <div className="bg-gradient-to-r from-blue-600 to-indigo-600 rounded-xl shadow-lg p-6 mb-6 text-white">
          <h1 className="text-3xl font-bold mb-2">Doctor Profile</h1>
          <p className="text-blue-100">Manage your professional information, clinic details, and visibility settings</p>
        </div>

        {message && (
          <div className={`mb-4 p-4 rounded-lg ${
            message.includes('success') ? 'bg-green-50 text-green-800 border border-green-200' : 'bg-red-50 text-red-800 border border-red-200'
          }`}>
            {message}
          </div>
        )}

        
        <div className="bg-white rounded-xl shadow-md p-6 mb-6 border border-amber-100">
          <div className="flex items-center mb-4">
            <Shield className="w-6 h-6 text-amber-500 mr-2" />
            <h2 className="text-xl font-semibold text-gray-900">Profile Visibility Settings</h2>
          </div>
          <p className="text-sm text-gray-600 mb-4">
            Control which fields are visible to patients when they view your profile. Toggle each field on or off.
          </p>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {Object.entries(VISIBILITY_FIELD_LABELS).map(([field, label]) => (
              <button
                type="button"
                key={field}
                onClick={() => toggleVisibility(field)}
                className={`flex items-center justify-between px-4 py-3 rounded-lg border transition-all duration-200 ${
                  visibleFields[field]
                    ? 'border-green-200 bg-green-50 text-green-800'
                    : 'border-gray-200 bg-gray-50 text-gray-500'
                }`}
              >
                <span className="text-sm font-medium">{label}</span>
                {visibleFields[field] ? (
                  <Eye className="w-4 h-4 text-green-600" />
                ) : (
                  <EyeOff className="w-4 h-4 text-gray-400" />
                )}
              </button>
            ))}
          </div>
        </div>

        <form onSubmit={handleSubmit} className="bg-white rounded-xl shadow-md p-6">
          
          <div className="mb-8">
            <div className="flex items-center mb-4">
              <GraduationCap className="w-6 h-6 text-blue-500 mr-2" />
              <h2 className="text-xl font-semibold text-gray-900">Professional Information</h2>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="md:col-span-2">
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Category / Primary Specialty
                </label>
                <select
                  className="w-full px-3 py-2 border border-gray-300 bg-white rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  value={profile.doctor_category_id}
                  onChange={(e) => setProfile({ ...profile, doctor_category_id: e.target.value })}
                >
                  <option value="">Select category…</option>
                  {categories.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.name}
                    </option>
                  ))}
                </select>
              </div>

              {isOthersSelected && (
                <div className="md:col-span-2">
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Specify Custom Category / Specialty Name
                  </label>
                  <input
                    type="text"
                    required
                    className="w-full px-3 py-2 border border-blue-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    placeholder="e.g., Pediatric Cardiology, Sports Physiotherapist"
                    value={profile.other_category_name}
                    onChange={(e) => setProfile({ ...profile, other_category_name: e.target.value })}
                  />
                </div>
              )}

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Degrees
                </label>
                <input
                  type="text"
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="e.g., MBBS, MD, PhD"
                  value={profile.degrees}
                  onChange={(e) => setProfile({ ...profile, degrees: e.target.value })}
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Years of Experience
                </label>
                <input
                  type="number"
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  value={profile.experience_years}
                  onChange={(e) => setProfile({ ...profile, experience_years: e.target.value })}
                />
              </div>
            </div>
          </div>

          
          <div className="mb-8">
            <div className="flex items-center mb-4">
              <FileText className="w-6 h-6 text-blue-500 mr-2" />
              <h2 className="text-xl font-semibold text-gray-900">License Information</h2>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  License Number
                </label>
                <input
                  type="text"
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  value={profile.license_number}
                  onChange={(e) => setProfile({ ...profile, license_number: e.target.value })}
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Issuing Authority
                </label>
                <input
                  type="text"
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="e.g., Medical Council"
                  value={profile.license_issuing_authority}
                  onChange={(e) => setProfile({ ...profile, license_issuing_authority: e.target.value })}
                />
              </div>
            </div>
          </div>

          
          <div className="mb-8">
            <div className="flex items-center mb-4">
              <Building className="w-6 h-6 text-blue-500 mr-2" />
              <h2 className="text-xl font-semibold text-gray-900">Clinic Information</h2>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Clinic Name
                </label>
                <input
                  type="text"
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  value={profile.clinic_name}
                  onChange={(e) => setProfile({ ...profile, clinic_name: e.target.value })}
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Clinic Phone
                </label>
                <input
                  type="text"
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  value={profile.clinic_phone}
                  onChange={(e) => setProfile({ ...profile, clinic_phone: e.target.value })}
                />
              </div>

              <div className="md:col-span-2">
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Clinic Address
                </label>
                <textarea
                  rows="3"
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  value={profile.clinic_address}
                  onChange={(e) => setProfile({ ...profile, clinic_address: e.target.value })}
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Clinic Email
                </label>
                <input
                  type="email"
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  value={profile.clinic_email}
                  onChange={(e) => setProfile({ ...profile, clinic_email: e.target.value })}
                />
              </div>
            </div>
          </div>

          
          <div className="mb-8">
            <div className="flex items-center mb-4">
              <User className="w-6 h-6 text-blue-500 mr-2" />
              <h2 className="text-xl font-semibold text-gray-900">Bio</h2>
            </div>
            
            <textarea
              rows="6"
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="Write about your professional background, expertise, and approach to patient care..."
              value={profile.bio}
              onChange={(e) => setProfile({ ...profile, bio: e.target.value })}
            />
          </div>

          <div className="flex justify-end">
            <button
              type="submit"
              disabled={saving}
              className="inline-flex items-center px-6 py-3 border border-transparent text-base font-medium rounded-lg text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50 transition-all duration-200"
            >
              <Save className="w-5 h-5 mr-2" />
              {saving ? 'Saving...' : 'Save Profile'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
