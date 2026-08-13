import React from 'react'
import { Lightbulb, AlertTriangle, TrendingUp, Clipboard } from 'lucide-react'


export default function InsightsPanel({ insights = {}, parameter }) {
  const {
    summary,
    trend_insight,
    risk_insight,
    recommendation,
  } = insights

  return (
    <div className="w-full bg-white rounded-lg border border-gray-200 p-6">
      <h3 className="text-lg font-semibold text-gray-800 mb-6 flex items-center gap-2">
        <Lightbulb className="w-5 h-5 text-blue-600" />
        Medical Insights
        {parameter && <span className="text-sm font-normal text-gray-600">({parameter})</span>}
      </h3>

      <div className="space-y-6">
        
        {summary && (
          <div className="pb-4 border-b border-gray-200">
            <h4 className="text-sm font-semibold text-gray-700 mb-2 flex items-center gap-2">
              <Clipboard className="w-4 h-4 text-gray-600" />
              Summary
            </h4>
            <p className="text-sm text-gray-700 leading-relaxed">{summary}</p>
          </div>
        )}

        
        {trend_insight && (
          <div className="pb-4 border-b border-gray-200">
            <h4 className="text-sm font-semibold text-gray-700 mb-2 flex items-center gap-2">
              <TrendingUp className="w-4 h-4 text-blue-600" />
              Trend Analysis
            </h4>
            <p className="text-sm text-gray-700 leading-relaxed">{trend_insight}</p>
          </div>
        )}

        
        {risk_insight && (
          <div className="pb-4 border-b border-gray-200">
            <h4 className="text-sm font-semibold text-gray-700 mb-2 flex items-center gap-2">
              <AlertTriangle className="w-4 h-4 text-red-600" />
              Risk Assessment
            </h4>
            <p className="text-sm text-gray-700 leading-relaxed">{risk_insight}</p>
          </div>
        )}

        
        {recommendation && (
          <div>
            <h4 className="text-sm font-semibold text-gray-700 mb-2 flex items-center gap-2">
              <Lightbulb className="w-4 h-4 text-amber-600" />
              Recommendation
            </h4>
            <div className="bg-amber-50 border border-amber-200 rounded-lg p-3">
              <p className="text-sm text-amber-900 leading-relaxed">{recommendation}</p>
            </div>
          </div>
        )}

        
        {!summary && !trend_insight && !risk_insight && !recommendation && (
          <p className="text-sm text-gray-500 italic">No insights available at this time.</p>
        )}
      </div>
    </div>
  )
}
