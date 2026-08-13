import React from 'react'
import { AlertCircle, TrendingUp, TrendingDown, Minus } from 'lucide-react'


export default function RiskBadge({ riskLevel, confidence, size = 'md' }) {
  
  const getRiskColor = () => {
    switch (riskLevel?.toUpperCase()) {
      case 'LOW':
        return 'bg-green-100 text-green-800 border-green-300'
      case 'MEDIUM':
        return 'bg-yellow-100 text-yellow-800 border-yellow-300'
      case 'HIGH':
        return 'bg-red-100 text-red-800 border-red-300'
      default:
        return 'bg-gray-100 text-gray-800 border-gray-300'
    }
  }

  const getSizeClass = () => {
    switch (size) {
      case 'sm':
        return 'px-2 py-1 text-xs'
      case 'lg':
        return 'px-4 py-2 text-lg'
      case 'md':
      default:
        return 'px-3 py-1.5 text-sm'
    }
  }

  const getIconSize = () => {
    switch (size) {
      case 'sm':
        return 'w-3 h-3'
      case 'lg':
        return 'w-5 h-5'
      case 'md':
      default:
        return 'w-4 h-4'
    }
  }

  return (
    <div className={`inline-flex items-center gap-2 rounded-full border font-semibold ${getSizeClass()} ${getRiskColor()}`}>
      {riskLevel?.toUpperCase() === 'HIGH' && <AlertCircle className={getIconSize()} />}
      {riskLevel?.toUpperCase() === 'MEDIUM' && <TrendingUp className={getIconSize()} />}
      {riskLevel?.toUpperCase() === 'LOW' && <TrendingDown className={getIconSize()} />}
      
      <span>{riskLevel}</span>
      
      {confidence !== undefined && (
        <span className="text-xs opacity-75">
          {confidence}%
        </span>
      )}
    </div>
  )
}
