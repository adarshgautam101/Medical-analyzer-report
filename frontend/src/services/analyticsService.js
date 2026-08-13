import api from '../utils/api'


export const getHealthSummary = () =>
  api.get('/api/analytics/health-summary', { responseType: 'blob' }).then((res) => res.data)

export const getCorrelation = () =>
  api.get('/api/analytics/correlation', { responseType: 'blob' }).then((res) => res.data)


export const getHealthSummaryJson = () =>
  api.get('/api/analytics/health-summary-json').then((res) => res.data)

export const getCorrelationJson = () =>
  api.get('/api/analytics/correlation-json').then((res) => res.data)

export const getStructuredHealthData = () =>
  api.get('/api/analytics/structured-health-data').then((res) => res.data)