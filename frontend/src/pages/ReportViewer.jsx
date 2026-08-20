import { useState, useEffect, useCallback, useMemo } from 'react'
import { useParams, Link } from 'react-router-dom'
import api from '../utils/api'
import { ArrowLeft, Loader, BarChart2 } from 'lucide-react'

export default function ReportViewer() {
  const { id } = useParams()
  const [report, setReport] = useState(null)
  const [loading, setLoading] = useState(true)
  const [loadError, setLoadError] = useState('')
  const [trendChart, setTrendChart] = useState(null)
  const [trendLoading, setTrendLoading] = useState(null)
  const [trendError, setTrendError] = useState('')


  const [filterParam, setFilterParam] = useState('')
  const [startDate, setStartDate] = useState('')
  const [endDate, setEndDate] = useState('')
  const [filteredLabs, setFilteredLabs] = useState([])
  const [filteredLoading, setFilteredLoading] = useState(false)
  const [filteredError, setFilteredError] = useState('')
  const [historyParams, setHistoryParams] = useState([])

  const [comparisonSelection, setComparisonSelection] = useState(new Set())
  const [comparisonUrl, setComparisonUrl] = useState(null)
  const [comparisonLoading, setComparisonLoading] = useState(false)
  const [comparisonError, setComparisonError] = useState('')

  const fetchReport = useCallback(async () => {
    setLoadError('')
    try {
      const response = await api.get(`/api/reports/${id}`)
      console.log('[UI] route reportId =', id)
      console.log('[UI] API response report.id =', response.data?.id)
      console.log('[UI] API response lab_values.length =', response.data?.lab_values?.length)
      setReport(response.data)
    } catch (error) {
      console.error('Error fetching report:', error)
      setLoadError(
        error.response?.data?.detail || error.message || 'Failed to load report.'
      )
      setReport(null)
    } finally {
      setLoading(false)
    }
  }, [id])

  useEffect(() => {
    setLoading(true)
    fetchReport()
  }, [fetchReport])

  useEffect(() => {
    const fetchHistory = async () => {
      try {
        const response = await api.get('/api/lab-values')
        const unique = [...new Set((response.data || []).map((lv) => lv.parameter_name))]
        setHistoryParams(unique)
      } catch (error) {
        console.error('Error fetching lab history params:', error)
      }
    }
    fetchHistory()
  }, [])

  useEffect(() => {
    return () => {
      if (trendChart?.url) URL.revokeObjectURL(trendChart.url)
      if (comparisonUrl) URL.revokeObjectURL(comparisonUrl)
    }
  }, [trendChart, comparisonUrl])

  const labValues = useMemo(() => {
    return report?.lab_values ?? report?.labValues ?? []
  }, [report])

  const parameterNames = useMemo(
    () => [...new Set(labValues.map((lv) => lv?.parameter_name || lv?.parameterName).filter(Boolean))],
    [labValues]
  )

  useEffect(() => {
    if (report) {
      console.log('[UI] normalized labValues.length =', labValues.length)
      console.log('[UI] parameterNames =', parameterNames)
    }
  }, [report, labValues, parameterNames])

  const allParameterNames = useMemo(() => {
    const fromReport = labValues.map((lv) => lv?.parameter_name || lv?.parameterName).filter(Boolean)
    const combined = [...new Set([
      ...fromReport,
      ...historyParams,
      'HbA1c',
      'Total Cholesterol',
      'HDL Cholesterol',
      'LDL Cholesterol',
      'Triglycerides',
      'Haemoglobin',
      'WBC',
      'RBC',
      'Platelets',
      'Glucose',
      'TSH',
      'Creatinine'
    ])]
    return combined.filter(Boolean).sort()
  }, [labValues, historyParams])

  const toggleComparisonParam = (name) => {
    setComparisonSelection((prev) => {
      const next = new Set(prev)
      if (next.has(name)) next.delete(name)
      else next.add(name)
      return next
    })
  }

  const loadComparisonChart = async () => {
    const names = [...comparisonSelection]
    if (names.length < 1) {
      setComparisonError('Select at least one parameter to view.')
      return
    }
    setComparisonError('')
    setComparisonLoading(true)
    if (comparisonUrl) {
      URL.revokeObjectURL(comparisonUrl)
      setComparisonUrl(null)
    }
    try {
      const response = await api.get('/api/analytics/comparison', {
        params: { parameter_names: names.join(',') },
        responseType: 'blob',
      })
      const blob =
        response.data instanceof Blob
          ? response.data
          : new Blob([response.data], { type: 'image/png' })
      setComparisonUrl(URL.createObjectURL(blob))
    } catch (error) {
      console.error('Comparison chart error:', error)
      setComparisonError(
        error.response?.data?.detail || 'Could not load comparison chart.'
      )
    } finally {
      setComparisonLoading(false)
    }
  }

  const applyLabFilters = async () => {
    setFilteredError('')
    setFilteredLoading(true)
    try {
      const params = {}
      if (filterParam) params.parameter_name = filterParam
      if (startDate) params.start_date = startDate
      if (endDate) params.end_date = endDate
      const response = await api.get('/api/lab-values', { params })
      setFilteredLabs(response.data)
    } catch (error) {
      console.error('Lab values filter error:', error)
      setFilteredError(
        error.response?.data?.detail || 'Could not load filtered lab values.'
      )
      setFilteredLabs([])
    } finally {
      setFilteredLoading(false)
    }
  }



  const loadTrendChart = async (parameterName) => {
    setTrendError('')
    setTrendLoading(parameterName)
    if (trendChart?.url) {
      URL.revokeObjectURL(trendChart.url)
    }
    try {
      const response = await api.get(
        `/api/analytics/trend/${encodeURIComponent(parameterName)}`,
        { responseType: 'blob' }
      )
      const blob =
        response.data instanceof Blob
          ? response.data
          : new Blob([response.data], { type: 'image/png' })
      const imageUrl = URL.createObjectURL(blob)
      setTrendChart({ parameter: parameterName, url: imageUrl })
    } catch (error) {
      console.error('Error loading trend chart:', error)
      setTrendChart(null)
      setTrendError(
        error.response?.data?.detail || 'Could not load trend chart for this parameter.'
      )
    } finally {
      setTrendLoading(null)
    }
  }



  if (loading) {
    return <div className="text-center py-12">Loading report...</div>
  }

  if (!report) {
    return (
      <div className="text-center py-12 px-4">
        {loadError && (
          <p className="text-red-600 mb-4 bg-red-50 border border-red-200 rounded-md px-4 py-3 inline-block">
            {loadError}
          </p>
        )}
        {!loadError && <p className="text-gray-500">Report not found</p>}
        <Link to="/reports" className="text-blue-600 hover:underline mt-4 inline-block">
          Back to Reports
        </Link>
      </div>
    )
  }

  const getCleanAiSummary = () => {
    if (!report || !report.ai_summary) return null;

    let summaryText = report.ai_summary || '';
    let summaryData = report.ai_summary_data || null;

    if (typeof summaryText === 'string' && summaryText.trim().startsWith('{')) {
      try {
        const parsed = JSON.parse(summaryText.trim());
        if (parsed && typeof parsed === 'object') {
          if (parsed.summary) summaryText = parsed.summary;
          if (!summaryData) summaryData = parsed;
        }
      } catch (e) { }
    }

    if (summaryData && typeof summaryData.summary === 'string' && summaryData.summary.trim().startsWith('{')) {
      try {
        const inner = JSON.parse(summaryData.summary.trim());
        if (inner && typeof inner === 'object' && inner.summary) {
          summaryText = inner.summary;
          summaryData = { ...summaryData, ...inner, summary: inner.summary };
        }
      } catch (e) { }
    }

    summaryText = summaryText
      .replace(/^\{[\s\S]*"summary"\s*:\s*"/i, '')
      .replace(/"\s*,\s*"overallStatus"[\s\S]*$/i, '')
      .replace(/^"/, '')
      .replace(/"$/, '')
      .trim();

    const rawObs = Array.isArray(summaryData?.observations) ? summaryData.observations : [];
    const cleanObs = rawObs.map((obs) => {
      if (typeof obs === 'string') {
        return { text: obs.replace(/^\{\s*"text"\s*:\s*"/, '').replace(/"\s*,\s*".*$/, '').trim() };
      }
      return {
        text: obs.text || '',
        parameterName: obs.parameterName || '',
        value: obs.value || '',
        unit: obs.unit || '',
        referenceRange: obs.referenceRange || '',
        sourceText: obs.sourceText || '',
      };
    }).filter(o => o.text && o.text.trim().length > 0);

    return {
      summary: summaryText,
      overallStatus: summaryData?.overallStatus || 'Needs Review',
      observations: cleanObs,
    };
  };

  const aiData = getCleanAiSummary();

  return (
    <div className="px-4 py-6">
      <div className="flex flex-wrap items-center justify-between gap-4 mb-6">
        <div className="flex items-center space-x-4">
          <Link
            to="/reports"
            className="p-2 text-gray-400 hover:text-gray-600 transition-colors"
          >
            <ArrowLeft className="w-5 h-5" />
          </Link>
          <div>
            <h1 className="text-3xl font-bold text-gray-900">{report.file_name}</h1>
            <p className="text-sm text-gray-500 mt-1">
              Uploaded on {new Date(report.upload_date).toLocaleDateString()}
            </p>
          </div>
        </div>
      </div>


      {aiData && aiData.summary && (
        <div className="bg-gradient-to-r from-blue-50 to-indigo-50 border border-blue-200 rounded-xl p-6 mb-6 shadow-sm">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-bold text-gray-900 flex items-center gap-2">
              <span className="text-xl">🤖</span> Document AI Analysis
            </h2>
            {aiData.overallStatus && (
              <span
                className={`px-3 py-1 text-xs font-semibold rounded-full border ${aiData.overallStatus === 'Normal'
                    ? 'bg-emerald-100 text-emerald-800 border-emerald-300'
                    : aiData.overallStatus === 'Needs Review'
                      ? 'bg-amber-100 text-amber-800 border-amber-300'
                      : 'bg-gray-100 text-gray-800 border-gray-300'
                  }`}
              >
                Status: {aiData.overallStatus}
              </span>
            )}
          </div>

          <p className="text-gray-800 leading-relaxed font-medium text-base mb-4 bg-white/80 backdrop-blur-xs p-4 rounded-lg border border-blue-100 shadow-2xs">
            {aiData.summary}
          </p>

          {aiData.observations && aiData.observations.length > 0 && (
            <div className="mt-4 pt-4 border-t border-blue-200/60">
              <h3 className="text-xs font-bold uppercase tracking-wider text-blue-900 mb-3">
                Key Clinical Observations ({aiData.observations.length})
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                {aiData.observations.map((obs, idx) => (
                  <div key={idx} className="bg-white p-4 rounded-lg border border-blue-100 shadow-2xs hover:border-blue-300 transition-all">
                    <div className="text-gray-900 text-sm font-semibold leading-snug">{obs.text}</div>
                    {obs.parameterName && (
                      <div className="mt-2.5 flex flex-wrap gap-2 text-xs">
                        <span className="bg-blue-50 text-blue-700 font-medium px-2 py-0.5 rounded border border-blue-100">
                          {obs.parameterName}
                        </span>
                        {obs.value && (
                          <span className="bg-gray-100 text-gray-700 px-2 py-0.5 rounded">
                            Val: {obs.value} {obs.unit || ''}
                          </span>
                        )}
                      </div>
                    )}
                    {obs.sourceText && (
                      <div className="text-xs text-gray-500 mt-2.5 pt-2 border-t border-gray-100 italic truncate">
                        Source OCR: &quot;{obs.sourceText}&quot;
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}


      {/* 2. Universal Standard Range Comparison */}
      <div className="bg-white rounded-lg shadow mb-6 p-6">
        <h2 className="text-xl font-semibold text-gray-900 mb-2 flex items-center gap-2">
          <BarChart2 className="w-5 h-5 text-indigo-600" />
          Universal Standard Range Comparison
        </h2>
        {parameterNames.length > 0 ? (
          <>
            <p className="text-sm text-gray-600 mb-3">
              Select one or more parameters to compare patient values against the universal standard ranges.
            </p>
            <div className="flex flex-wrap gap-2 mb-4">
              {parameterNames.map((name) => (
                <label
                  key={name}
                  className="inline-flex items-center gap-2 text-sm border rounded-md px-3 py-1 cursor-pointer hover:bg-gray-50 transition-colors"
                >
                  <input
                    type="checkbox"
                    checked={comparisonSelection.has(name)}
                    onChange={() => toggleComparisonParam(name)}
                  />
                  {name}
                </label>
              ))}
            </div>
            <button
              type="button"
              onClick={loadComparisonChart}
              disabled={comparisonLoading}
              className="inline-flex items-center px-4 py-2 rounded-md text-white bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 text-sm font-medium shadow-xs"
            >
              {comparisonLoading && <Loader className="w-4 h-4 mr-2 animate-spin" />}
              Show range comparison
            </button>
            {comparisonError && (
              <p className="mt-2 text-sm text-red-700">{comparisonError}</p>
            )}
            {comparisonUrl && (
              <div className="mt-4">
                <img src={comparisonUrl} alt="Parameter comparison" className="w-full max-w-4xl rounded border shadow-xs" />
              </div>
            )}
          </>
        ) : (
          <p className="text-sm text-gray-500 italic bg-gray-50 p-4 rounded-md border border-gray-200">
            No structured laboratory measurements available in this report for standard range comparison.
          </p>
        )}
      </div>

      {/* 3. Lab Values Section */}
      <div className="bg-white rounded-lg shadow mb-6">
        <div className="px-6 py-4 border-b border-gray-200 flex justify-between items-center">
          <h2 className="text-xl font-semibold text-gray-900">Lab Values</h2>
          {labValues.length > 0 && (
            <span className="text-xs font-semibold bg-blue-50 text-blue-700 border border-blue-200 px-2.5 py-1 rounded-full">
              {labValues.length} Extracted {labValues.length === 1 ? 'Parameter' : 'Parameters'}
            </span>
          )}
        </div>
        {labValues.length > 0 ? (
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Parameter
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Value
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Reference Range
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Status
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {labValues.map((lv) => {
                  const paramName = lv.parameter_name || lv.parameterName || '';
                  const refRange = lv.reference_range || lv.referenceRange || '—';
                  const isAbnormal = lv.is_abnormal ?? lv.isAbnormal;
                  const refStatus = lv.reference_status || lv.referenceStatus || (isAbnormal ? 'outside' : 'within');

                  return (
                    <tr
                      key={lv.id || paramName}
                      className={isAbnormal ? 'bg-red-50/70 text-red-700' : ''}
                    >
                      <td
                        className={`px-6 py-4 whitespace-nowrap text-sm font-medium ${isAbnormal ? 'text-red-700' : 'text-gray-900'}`}
                      >
                        {paramName}
                      </td>
                      <td
                        className={`px-6 py-4 whitespace-nowrap text-sm font-semibold ${isAbnormal ? 'text-red-700' : 'text-emerald-700'}`}
                      >
                        {lv.value} {lv.unit || ''}
                      </td>
                      <td
                        className={`px-6 py-4 whitespace-nowrap text-sm ${isAbnormal ? 'text-red-600' : 'text-gray-500'}`}
                      >
                        {refRange}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span
                          className={`px-2.5 py-1 text-xs font-semibold rounded-full border ${refStatus === 'outside' || isAbnormal
                              ? 'bg-red-100 text-red-800 border-red-200'
                              : refStatus === 'within'
                                ? 'bg-emerald-100 text-emerald-800 border-emerald-200'
                                : 'bg-gray-100 text-gray-800 border-gray-200'
                            }`}
                        >
                          {refStatus === 'outside' || isAbnormal
                            ? 'Abnormal / Outside'
                            : refStatus === 'within'
                              ? 'Within Range'
                              : 'Unknown Range'}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm">
                        <button
                          type="button"
                          onClick={() => loadTrendChart(paramName)}
                          disabled={trendLoading === paramName}
                          className="text-blue-600 hover:text-blue-800 disabled:opacity-50 inline-flex items-center gap-1 font-medium"
                        >
                          {trendLoading === paramName && (
                            <Loader className="w-3 h-3 animate-spin" />
                          )}
                          View Trend
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="p-8 text-center bg-gray-50/50 rounded-b-lg">
            <p className="text-gray-700 font-medium text-base">
              No structured laboratory measurements were found in this report.
            </p>
            <p className="text-sm text-gray-500 mt-1">
              This document may be a narrative report, pathology report, or imaging finding without discrete numeric lab parameters.
            </p>
          </div>
        )}
      </div>

      {trendError && (
        <div className="mb-6 text-sm text-red-700 bg-red-50 border border-red-200 rounded-md px-4 py-3">
          {trendError}
        </div>
      )}


      {trendChart && (
        <div className="bg-white rounded-lg shadow p-6 mb-6">
          <h2 className="text-xl font-semibold text-gray-900 mb-4">
            Trend: {trendChart.parameter}
          </h2>
          <img src={trendChart.url} alt={`Trend for ${trendChart.parameter}`} className="w-full" />
        </div>
      )}


      <div className="bg-white rounded-lg shadow mb-6">
        <div className="px-6 py-4 border-b border-gray-200">
          <h2 className="text-xl font-semibold text-gray-900">Lab history & filters</h2>
          <p className="text-sm text-gray-500 mt-1">
            Query all of your lab values with optional filters (same data as the API).
          </p>
        </div>
        <div className="p-6 space-y-4">
          <div className="flex flex-wrap gap-4 items-end">
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">Parameter</label>
              <select
                className="border border-gray-300 rounded-md px-3 py-2 text-sm min-w-[180px]"
                value={filterParam}
                onChange={(e) => setFilterParam(e.target.value)}
              >
                <option value="">All parameters</option>
                {allParameterNames.map((name) => (
                  <option key={name} value={name}>
                    {name}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">Start date</label>
              <input
                type="date"
                className="border border-gray-300 rounded-md px-3 py-2 text-sm"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">End date</label>
              <input
                type="date"
                className="border border-gray-300 rounded-md px-3 py-2 text-sm"
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
              />
            </div>
            <button
              type="button"
              onClick={applyLabFilters}
              disabled={filteredLoading}
              className="px-4 py-2 rounded-md bg-gray-800 text-white text-sm hover:bg-gray-900 disabled:opacity-50"
            >
              {filteredLoading ? 'Loading…' : 'Apply filters'}
            </button>
          </div>
          {filteredError && (
            <p className="text-sm text-red-700">{filteredError}</p>
          )}
          {filteredLabs.length > 0 && (
            <div className="overflow-x-auto border rounded-md">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">
                      Parameter
                    </th>
                    <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">
                      Value
                    </th>
                    <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">
                      Report date
                    </th>
                    <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">
                      Status
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200">
                  {filteredLabs.map((lv) => (
                    <tr
                      key={lv.id}
                      className={lv.is_abnormal ? 'bg-red-50 text-red-700' : ''}
                    >
                      <td className="px-4 py-2 text-sm">{lv.parameter_name}</td>
                      <td className="px-4 py-2 text-sm font-medium">
                        {lv.value} {lv.unit}
                      </td>
                      <td className="px-4 py-2 text-sm text-gray-600">
                        {lv.report_date
                          ? new Date(lv.report_date).toLocaleDateString()
                          : '—'}
                      </td>
                      <td className="px-4 py-2 text-sm">
                        {lv.is_abnormal ? 'Abnormal' : 'Normal'}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>


    </div>
  )
}
