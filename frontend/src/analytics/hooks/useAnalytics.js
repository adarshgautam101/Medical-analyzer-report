import { useQuery } from '@tanstack/react-query'
import { getStructuredHealthData } from '../services/analyticsService'


export const useStructuredHealthData = () => {
  return useQuery({
    queryKey: ['structured-health-data'],
    queryFn: getStructuredHealthData,
    enabled: false, 
    staleTime: 1000 * 60 * 5, 
  })
}


export const useHealthSummary = () => {
  return useQuery({
    queryKey: ['health-summary'],
    queryFn: () => getStructuredHealthData(), 
    staleTime: 1000 * 60 * 5,
  })
}