import React from 'react'
import { ChevronRight, TrendingUp, TrendingDown, Minus } from 'lucide-react'
import RiskBadge from './RiskBadge'
import Skeleton from 'react-loading-skeleton'
import 'react-loading-skeleton/dist/skeleton.css'


export default function ParameterCard({
  parameter,
  latestValue,
  unit,
  trend,
  riskLevel,
  confidence,
  isLoading = false,
  onClick,
}) {
  const getTrendIcon = () => {
    switch (trend) {
      case 'Increasing':
        return <TrendingUp className="w-5 h-5 text-red-500" />
      case 'Decreasing':
        return <TrendingDown className="w-5 h-5 text-green-500" />
      case 'Stable':
      default:
        return <Minus className="w-5 h-5 text-blue-500" />
    }
  }

  if (isLoading) {
    return (
      <div className="bg-white rounded-lg border border-gray-200 p-6 hover:shadow-md transition-shadow">
        <Skeleton height={24} width="50%" className="mb-4" />
        <Skeleton height={32} width="60%" className="mb-4" />
        <Skeleton height={20} width="40%" />
      </div>
    )
  }

  return (
    <button
      onClick={onClick}
      className="w-full text-left bg-white rounded-lg border border-gray-200 p-6 hover:shadow-lg transition-shadow hover:border-gray-300 cursor-pointer"
    >
      
      <div className="flex justify-between items-start mb-4">
        <div>
          <p className="text-sm font-medium text-gray-600">{parameter}</p>
        </div>
        <ChevronRight className="w-5 h-5 text-gray-400" />
      </div>

      
      <div className="mb-4">
        <div className="flex items-baseline gap-1">
          <span className="text-3xl font-bold text-gray-900">{latestValue?.toFixed(2) || 'N/A'}</span>
          {unit && <span className="text-sm text-gray-600">{unit}</span>}
        </div>
      </div>

      
      <div className="flex justify-between items-center">
        <div className="flex items-center gap-2">
          {getTrendIcon()}
          <span className="text-sm font-medium text-gray-700">{trend || 'Unknown'}</span>
        </div>
        <RiskBadge riskLevel={riskLevel} confidence={confidence} size="sm" />
      </div>
    </button>
  )
}
