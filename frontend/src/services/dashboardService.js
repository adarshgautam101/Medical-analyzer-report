import api from '../utils/api'


export const getDashboardData = (parameter = null, patientId = null) => {
  const params = new URLSearchParams()
  if (parameter) {
    params.append('parameter', parameter)
  }
  if (patientId) {
    params.append('patient_id', patientId)
  }
  
  return api.get(`/api/dashboard${params.toString() ? '?' + params.toString() : ''}`).then((res) => res.data)
}

export const getDashboardParameter = (parameter, patientId = null) => {
  return getDashboardData(parameter, patientId)
}

export const sendPatientChatMessage = (patientId, messages) => {
  return api.post(`/api/analytics/patients/${patientId}/ai-chat`, { messages }).then((res) => res.data)
}
