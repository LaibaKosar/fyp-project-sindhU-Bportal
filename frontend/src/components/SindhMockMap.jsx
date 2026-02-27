import { useState, useMemo } from 'react'

/**
 * SindhMockMap: Professional Digital Node Edition
 * Keeps all stats, glow effects, and tooltips but removes the geographic 
 * border for a clean, professional network layout.
 */
function SindhMockMap({ data, searchQuery = '', simulationMode = false }) {
  const [hoveredUniversity, setHoveredUniversity] = useState(null)

  // Generate random but stable positions for each university inside the rectangle
  const universityNodes = useMemo(() => {
    if (!data) return []
    return data.map((uni) => ({
      ...uni,
      // Spreading circles randomly inside the 100x100 rectangle space
      x: 10 + (Math.random() * 80),
      y: 15 + (Math.random() * 70),
    }))
  }, [data])

  if (!data || !Array.isArray(data) || data.length === 0) {
    return (
      <div className="h-full flex items-center justify-center text-slate-400 bg-slate-900 rounded-lg">
        <p>No university data available</p>
      </div>
    )
  }

  return (
    <div className="h-full w-full relative bg-[#0f172a] rounded-lg overflow-hidden border border-slate-800">
      <svg
        viewBox="0 0 100 100"
        className="w-full h-full"
        preserveAspectRatio="xMidYMid meet"
      >
        <defs>
          <pattern id="grid" width="5" height="5" patternUnits="userSpaceOnUse">
            <path d="M 5 0 L 0 0 0 5" fill="none" stroke="#1e293b" strokeWidth="0.3" opacity="0.3"/>
          </pattern>
          <filter id="glow">
            <feGaussianBlur stdDeviation="2" result="coloredBlur"/>
            <feMerge>
              <feMergeNode in="coloredBlur"/>
              <feMergeNode in="SourceGraphic"/>
            </feMerge>
          </filter>
        </defs>

        {/* Grid Background Overlay */}
        <rect width="100" height="100" fill="url(#grid)" />

        {/* University Markers - Logic preserved exactly from your original */}
        {universityNodes.map((uni) => {
          const isActive = simulationMode || uni.hasFocalPerson || uni.setup_status === 'Active'
          const isHovered = hoveredUniversity?.id === (uni.university_id || uni.id)
          const matchesSearch = searchQuery && 
            uni.university_name?.toLowerCase().includes(searchQuery.toLowerCase())

          return (
            <g key={uni.university_id || uni.id || uni.university_name}>
              {/* Active University: Glowing Halo Effects - EXACTLY as you liked them */}
              {isActive && (
                <g style={{ isolation: 'isolate' }}>
                  <circle
                    cx={uni.x} cy={uni.y}
                    r="3.5"
                    fill="none"
                    stroke="#10b981"
                    strokeWidth="0.4"
                    opacity="0.5"
                    className="animate-ping"
                    style={{
                      filter: 'drop-shadow(0 0 4px rgba(16, 185, 129, 0.6))',
                      transformOrigin: `${uni.x}px ${uni.y}px`
                    }}
                  />
                  <circle
                    cx={uni.x} cy={uni.y}
                    r="2.5"
                    fill="none"
                    stroke="#34d399"
                    strokeWidth="0.3"
                    opacity="0.4"
                    style={{
                      animation: 'ping 2s cubic-bezier(0, 0, 0.2, 1) infinite',
                      filter: 'drop-shadow(0 0 3px rgba(52, 211, 153, 0.5))',
                      transformOrigin: `${uni.x}px ${uni.y}px`
                    }}
                  />
                  <circle
                    cx={uni.x} cy={uni.y}
                    r="1.8"
                    fill="#10b981"
                    stroke="#34d399"
                    strokeWidth="0.2"
                    className="cursor-pointer"
                    onMouseEnter={() => setHoveredUniversity(uni)}
                    onMouseLeave={() => setHoveredUniversity(null)}
                    style={{
                      transition: 'all 0.2s ease-in-out',
                      filter: 'drop-shadow(0 0 6px rgba(16, 185, 129, 0.9))',
                      transformOrigin: `${uni.x}px ${uni.y}px`
                    }}
                  />
                </g>
              )}

              {/* Pending University Circle */}
              {!isActive && (
                <circle
                  cx={uni.x} cy={uni.y}
                  r="2"
                  fill="none"
                  stroke="#64748b"
                  strokeWidth="0.5"
                  opacity="0.6"
                  className="cursor-pointer"
                  onMouseEnter={() => setHoveredUniversity(uni)}
                  onMouseLeave={() => setHoveredUniversity(null)}
                  style={{
                    transition: 'all 0.2s ease-in-out',
                    filter: matchesSearch ? 'drop-shadow(0 0 6px rgba(245, 158, 11, 0.8))' : 'none',
                    animation: matchesSearch ? 'pulse 2s infinite' : 'none'
                  }}
                />
              )}

              {/* PERMANENT LABEL for Active ones as requested */}
              {(isActive || isHovered) && (
                <g className="pointer-events-none">
                  <rect
                    x={uni.x + 3} y={uni.y - 7}
                    width={Math.min(uni.university_name.length * 3.5, 45)} height="7"
                    rx="1.5" fill="rgba(15, 23, 42, 0.9)"
                  />
                  <text
                    x={uni.x + 4.5} y={uni.y - 2.2}
                    className="fill-white font-bold"
                    fontSize="3"
                  >
                    {uni.university_name.length > 20 ? uni.university_name.substring(0, 18) + '...' : uni.university_name}
                  </text>
                </g>
              )}
            </g>
          )
        })}
      </svg>

      {/* Stats Overlay - Kept EXACTLY in top-right position as you liked it */}
      <div className="absolute top-4 right-4 bg-white/95 backdrop-blur-sm rounded-lg p-3 shadow-xl border border-slate-300 z-20">
        <div className="text-xs text-slate-700 space-y-1">
          <div className="flex items-center gap-2">
            <div className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></div>
            <span className="font-semibold">
              Active: {universityNodes.filter(u => simulationMode || u.hasFocalPerson || u.setup_status === 'Active').length}
            </span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-2 h-2 rounded-full bg-slate-400"></div>
            <span className="font-semibold">
              Pending: {universityNodes.filter(u => !simulationMode && !u.hasFocalPerson && u.setup_status !== 'Active').length}
            </span>
          </div>
        </div>
      </div>

      {/* Hover Tooltip (Glassmorphism) - Kept EXACTLY as original */}
      {hoveredUniversity && (
        <div
          className="absolute rounded-xl px-4 py-3 shadow-2xl z-50 pointer-events-none border border-white/30"
          style={{
            left: '50%',
            top: '20px',
            transform: 'translateX(-50%)',
            background: 'rgba(15, 23, 42, 0.8)',
            backdropFilter: 'blur(12px)',
            WebkitBackdropFilter: 'blur(12px)',
          }}
        >
          <div className="font-semibold text-sm text-white mb-1">{hoveredUniversity.university_name}</div>
          <div className="text-xs text-slate-300 flex items-center gap-2">
            <span>Staff: {hoveredUniversity.total_staff || 0}</span>
            <span className="text-emerald-400 font-bold">• Live</span>
          </div>
        </div>
      )}
    </div>
  )
}

export default SindhMockMap