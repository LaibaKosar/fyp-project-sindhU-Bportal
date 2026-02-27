import React, { useState, useEffect, Suspense, lazy } from 'react'

// Dynamic import with lazy loading to prevent hook call conflicts
const ComplianceChart = lazy(() => import('./ComplianceChart'))

// Error Boundary Component
class ChartErrorBoundary extends React.Component {
  constructor(props) {
    super(props)
    this.state = { hasError: false, error: null }
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, error }
  }

  componentDidCatch(error, errorInfo) {
    console.error('Chart rendering error:', error, errorInfo)
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="h-[400px] flex items-center justify-center bg-white/5 rounded-2xl border border-white/10">
          <div className="text-center p-6">
            <p className="text-red-400 font-semibold mb-2">Analytics Temporarily Unavailable</p>
            <p className="text-slate-400 text-sm">
              Unable to load the analytics chart. Please try refreshing the page.
            </p>
            <button
              onClick={() => {
                this.setState({ hasError: false, error: null })
                window.location.reload()
              }}
              className="mt-4 px-4 py-2 bg-cyan-500/20 text-cyan-400 rounded-lg text-sm hover:bg-cyan-500/30 transition-colors"
            >
              Retry
            </button>
          </div>
        </div>
      )
    }

    return this.props.children
  }
}

const ComplianceAnalytics = ({ chartData = [], activeFaculty = null, enrollmentTotal = 0, isPresentationMode = false }) => {
  const [isMounted, setIsMounted] = useState(false)

  // Ensure component only renders after mount to fix useContext errors
  useEffect(() => {
    setIsMounted(true)
  }, [])

  // Filter chart data by active faculty if selected
  const filteredData = activeFaculty
    ? chartData.filter(item => item.faculty_id === activeFaculty.id)
    : chartData

  // Calculate max ratio for Y-axis scaling with buffer
  const maxRatio = filteredData.length > 0
    ? Math.max(...filteredData.map(item => item.ratio || 0))
    : 0
  
  // Set Y-axis domain - normalize to 100 in presentation mode for better readability
  // In presentation mode, the 20:1 and 30:1 reference lines will be clearly visible
  const yAxisDomain = isPresentationMode 
    ? [0, 100] 
    : (maxRatio > 0 ? [0, maxRatio + 20] : [0, 'auto'])

  // Custom tooltip component
  const CustomTooltip = ({ active, payload }) => {
    if (active && payload && payload.length) {
      const data = payload[0].payload
      const isCompliant = data.ratio <= data.threshold
      
      return (
        <div className="bg-slate-800/95 backdrop-blur-md p-3 rounded-lg border border-white/20 shadow-xl">
          <p className="text-white font-semibold mb-2">{data.name}</p>
          <div className="space-y-1 text-sm">
            <p className="text-slate-300">
              Ratio: <span className={`font-bold ${isCompliant ? 'text-cyan-400' : 'text-red-400'}`}>
                {data.ratio}:1
              </span>
            </p>
            <p className="text-slate-400">
              Threshold: <span className="text-slate-300">{data.threshold}:1</span>
            </p>
            <p className={isCompliant ? 'text-cyan-400' : 'text-red-400'}>
              {isCompliant ? '✓ Compliant' : '⚠ Violation'}
            </p>
          </div>
        </div>
      )
    }
    return null
  }

  // Custom label formatter for X-axis - shorter truncation for cleaner UI
  const formatXAxisLabel = (label) => {
    if (!label) return ''
    // Truncate long department names to 12 characters for cleaner display
    return label.length > 12 ? `${label.substring(0, 12)}...` : label
  }

  // Strict client-side guard - must be first check
  if (!isMounted) {
    return <div className='h-[300px] flex items-center justify-center text-slate-500'>Loading Analytics Engine...</div>
  }

  // Handle empty data
  if (!filteredData || filteredData.length === 0) {
    return (
      <div className="h-[400px] flex items-center justify-center bg-white/5 rounded-2xl border border-white/10">
        <div className="text-center p-6">
          <p className="text-slate-400 text-sm">
            {activeFaculty 
              ? `No department data available for ${activeFaculty.name}`
              : 'No department data available for analysis'
            }
          </p>
        </div>
      </div>
    )
  }

  // Loading spinner component for Suspense fallback
  const LoadingSpinner = () => (
    <div className="h-[300px] flex items-center justify-center bg-white/5 rounded-2xl border border-white/10">
      <div className="flex flex-col items-center gap-3">
        <div className="w-8 h-8 border-4 border-cyan-500/30 border-t-cyan-500 rounded-full animate-spin"></div>
        <p className="text-slate-400 text-sm">Loading chart...</p>
      </div>
    </div>
  )

  return (
    <div className="w-full h-full">
      <ChartErrorBoundary>
        <Suspense fallback={<LoadingSpinner />}>
          <div className="w-full h-[500px]">
            <ComplianceChart
              filteredData={filteredData}
              yAxisDomain={yAxisDomain}
              formatXAxisLabel={formatXAxisLabel}
              CustomTooltip={CustomTooltip}
              isClientReady={isMounted}
              isAnimationActive={isPresentationMode}
            />
          </div>
        </Suspense>
      </ChartErrorBoundary>
      
      {/* Custom Legend */}
      <div className="flex items-center justify-center gap-6 mt-4">
        <div className="flex items-center gap-2">
          <div className="w-4 h-4 rounded bg-cyan-500"></div>
          <span className="text-sm text-slate-300">Compliant (≤ Threshold)</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-4 h-4 rounded bg-red-500"></div>
          <span className="text-sm text-slate-300">Violation (Threshold)</span>
        </div>
      </div>
    </div>
  )
}

export default ComplianceAnalytics
