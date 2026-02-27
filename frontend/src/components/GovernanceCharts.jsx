import { useState } from 'react'
import { BarChart3, Info } from 'lucide-react'

// Shared helper: faculty-to-staff ratio and recommendation (used by chart hover and by Resource Comparison insight card)
export function getResourceInsightForItem(item) {
  const staff = item?.staff ?? 0
  const faculties = item?.faculties ?? 0
  if (staff === 0 && faculties === 0) return { ratio: null, insight: 'No staff or faculty data yet. Add data for ratio insights.' }
  if (faculties === 0) return { ratio: null, insight: 'No faculty count reported. Add faculty data to see staff-per-faculty ratio.' }
  if (staff === 0) return { ratio: null, insight: 'No staff count reported. Add staff data to compare with faculty.' }
  const staffPerFaculty = staff / faculties
  const ratioLabel = staffPerFaculty.toFixed(1)
  let recommendation = ''
  if (staffPerFaculty > 50) recommendation = 'High staff per faculty — consider expanding faculty or reviewing workload.'
  else if (staffPerFaculty >= 25) recommendation = 'Moderate ratio. Monitor capacity as enrollment grows.'
  else if (staffPerFaculty >= 15) recommendation = 'Healthy faculty-to-staff ratio for governance oversight.'
  else recommendation = 'Low staff per faculty — adequate faculty coverage; focus on staff recruitment if needed.'
  return { ratio: `1 faculty : ${ratioLabel} staff`, insight: recommendation }
}

// Pure CSS-based charts - NO HOOKS, NO RECHARTS (except useState for hover tooltip)
// sections: which blocks to render ('boards' | 'resources'). Default both.
// resourceLayout: 'horizontal' (default) or 'vertical' for Resource Comparison.
function GovernanceCharts({ data, presentationMode = false, sections = ['boards', 'resources'], resourceLayout = 'horizontal' }) {
  const showBoards = sections.includes('boards')
  const showResources = sections.includes('resources')
  const [hoveredResourceIndex, setHoveredResourceIndex] = useState(null)

  // Filter and prepare data for display
  let activeBoardsData = data
    .filter(u => u && u.active_boards && u.active_boards > 0)
    .sort((a, b) => (b.active_boards || 0) - (a.active_boards || 0))
    .slice(0, 5)
    .map(u => ({
      name: u.university_short_name || u.university_name?.substring(0, 20) || 'Unknown',
      fullName: u.university_name || 'Unknown',
      value: u.active_boards || 0
    }))

  // Presentation Mode: Fill with simulated data
  if (presentationMode && activeBoardsData.length < 5) {
    const simulated = [
      { name: 'Aror University', fullName: 'Aror University of Art, Architecture, Design & Heritage', value: 8 },
      { name: 'Sukkur IBA', fullName: 'Sukkur IBA University', value: 7 },
      { name: 'BNB Women', fullName: 'Begum Nusrat Bhutto Women University', value: 6 },
      { name: 'University of Sindh', fullName: 'University of Sindh', value: 5 },
      { name: 'Mehran UET', fullName: 'Mehran University of Engineering & Technology', value: 4 }
    ]
    activeBoardsData = simulated.slice(0, 5)
  }

  let resourceData = data
    .filter(u => u && u.total_staff !== undefined)
    .sort((a, b) => (b.total_staff || 0) - (a.total_staff || 0))
    .slice(0, 5)
    .map(u => ({
      university: u.university_short_name || u.university_name?.substring(0, 15) || 'Unknown',
      staff: u.total_staff || 0,
      faculties: u.total_faculties || 0
    }))

  // Presentation Mode: When showing resources, always use simulated data so chart is filled with values and hover shows insights
  if (presentationMode && showResources) {
    const simulated = [
      { university: 'Sukkur IBA Univ', staff: 21, faculties: 4 },
      { university: 'University of K', staff: 18, faculties: 3 },
      { university: 'Aror University', staff: 14, faculties: 3 },
      { university: 'Shaheed Benazir', staff: 12, faculties: 2 },
      { university: 'DOW University', staff: 10, faculties: 2 }
    ]
    resourceData = simulated
  }

  // Find max value for scaling
  const maxBoards = activeBoardsData.length > 0 ? Math.max(...activeBoardsData.map(d => d.value)) : 1
  const maxStaff = resourceData.length > 0 ? Math.max(...resourceData.map(d => d.staff)) : 1

  // Derived insight for Resource Comparison hover: faculty-to-staff ratio and recommendation (exported for reuse)
  const getResourceInsight = getResourceInsightForItem

  return (
    <div className="space-y-6">
      {/* CSS-based Bar Chart for Active Boards */}
      {showBoards && (
      <div className="bg-white border border-slate-200 rounded-xl p-6 shadow-sm">
        <h3 className="text-xl font-semibold text-slate-900 mb-2 flex items-center gap-2">
          <BarChart3 className="w-5 h-5 text-blue-600" />
          Top 5 Universities - Active Boards Compliance
        </h3>
        <div className="flex items-start gap-2 px-4 py-3 mb-4 bg-blue-50 border border-blue-200 rounded-lg">
          <Info className="w-4 h-4 text-blue-600 flex-shrink-0 mt-0.5" />
          <div className="text-sm text-slate-700">
            <p className="font-medium text-slate-800 mb-0.5">What this chart shows</p>
            <p className="text-slate-600">
              Ranks the top 5 universities by number of active governing boards (e.g. Senate, Syndicate, Academic Council). Use it to compare governance and compliance activity across institutions. Data appears here once universities report their board counts through the portal; if you see &quot;Data unavailable&quot;, no board data has been submitted yet.
            </p>
          </div>
        </div>
        <div className="space-y-4">
          {activeBoardsData.length > 0 ? (
            activeBoardsData.map((item, index) => {
              const percentage = (item.value / maxBoards) * 100
              return (
                <div key={index} className="space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-medium text-slate-700 truncate flex-1">
                      {item.fullName}
                    </span>
                    <span className="text-sm font-bold text-slate-900 ml-2">
                      {item.value}
                    </span>
                  </div>
                  <div className="w-full bg-slate-100 rounded-full h-6 overflow-hidden">
                    <div
                      className="h-full bg-gradient-to-r from-emerald-500 via-teal-500 to-cyan-500 rounded-full transition-all duration-500 flex items-center justify-end pr-2"
                      style={{ width: `${percentage}%` }}
                    >
                      <span className="text-xs font-semibold text-white">
                        {item.value}
                      </span>
                    </div>
                  </div>
                </div>
              )
            })
          ) : (
            <div className="h-[300px] flex items-center justify-center text-slate-400">
              <div className="text-center">
                <BarChart3 className="w-12 h-12 mx-auto mb-2 opacity-50" />
                <p className="font-medium">Data unavailable</p>
                <p className="text-xs mt-1">No board data available from analytics</p>
              </div>
            </div>
          )}
        </div>
      </div>
      )}

      {/* CSS-based Resource Comparison List - horizontal or vertical layout */}
      {showResources && (
      <div className={`bg-white border border-slate-200 rounded-xl shadow-sm ${resourceLayout === 'vertical' ? 'p-4' : 'p-6'}`}>
        <h3 className={`text-slate-900 font-semibold flex items-center gap-2 ${resourceLayout === 'vertical' ? 'text-sm mb-3' : 'text-xl mb-4'}`}>
          <BarChart3 className={resourceLayout === 'vertical' ? 'w-4 h-4 text-purple-600' : 'w-5 h-5 text-purple-600'} />
          Resource Comparison
          {presentationMode && (
            <span className="text-[10px] font-medium px-1.5 py-0.5 rounded bg-amber-100 text-amber-800 border border-amber-200">
              Presentation mode
            </span>
          )}
        </h3>
        <div className={resourceLayout === 'vertical' ? 'space-y-2' : 'space-y-4'}>
          {resourceData.length > 0 ? (
            resourceData.map((item, index) => {
              const staffPercentage = (item.staff / maxStaff) * 100
              const facultiesPercentage = item.faculties > 0 ? Math.min((item.faculties / 50) * 100, 100) : 0
              const insight = getResourceInsight(item)
              const isHovered = hoveredResourceIndex === index

              if (resourceLayout === 'vertical') {
                return (
                  <div
                    key={index}
                    className="relative p-2 bg-slate-50 rounded-md border border-slate-100 cursor-help"
                    onMouseEnter={() => setHoveredResourceIndex(index)}
                    onMouseLeave={() => setHoveredResourceIndex(null)}
                  >
                    <div className="font-medium text-slate-800 text-xs truncate mb-2">
                      {item.university}
                    </div>
                    <div className="flex gap-3">
                      <div className="flex-1 flex flex-col items-center min-w-0">
                        <span className="text-[10px] text-slate-500 uppercase tracking-wide mb-0.5">Staff</span>
                        <div className="w-full h-10 bg-slate-200 rounded flex flex-col justify-end overflow-hidden">
                          <div
                            className="w-full bg-blue-500 rounded-t transition-all duration-500 min-h-[1px]"
                            style={{ height: `${Math.max(staffPercentage, 2)}%` }}
                          />
                        </div>
                        <span className="text-[10px] font-semibold text-slate-700 mt-0.5">{item.staff}</span>
                      </div>
                      <div className="flex-1 flex flex-col items-center min-w-0">
                        <span className="text-[10px] text-slate-500 uppercase tracking-wide mb-0.5">Faculties</span>
                        <div className="w-full h-10 bg-slate-200 rounded flex flex-col justify-end overflow-hidden">
                          <div
                            className="w-full bg-emerald-500 rounded-t transition-all duration-500 min-h-[1px]"
                            style={{ height: `${Math.max(facultiesPercentage, 2)}%` }}
                          />
                        </div>
                        <span className="text-[10px] font-semibold text-slate-700 mt-0.5">{item.faculties}</span>
                      </div>
                    </div>
                    {isHovered && (
                      <div className="absolute left-0 right-0 top-full z-20 mt-1 p-2 bg-slate-800 text-white text-xs rounded shadow-lg border border-slate-600">
                        {presentationMode && (
                          <p className="text-amber-300 font-medium mb-1">Presentation mode – sample data</p>
                        )}
                        {insight.ratio && <p className="font-semibold mb-1">{insight.ratio}</p>}
                        <p className="text-slate-200">{insight.insight}</p>
                      </div>
                    )}
                  </div>
                )
              }

              return (
                <div
                  key={index}
                  className="relative p-3 bg-slate-50 rounded-lg border border-slate-200 cursor-help"
                  onMouseEnter={() => setHoveredResourceIndex(index)}
                  onMouseLeave={() => setHoveredResourceIndex(null)}
                >
                  <div className="font-semibold text-slate-900 mb-2 text-sm">
                    {item.university}
                  </div>
                  <div className="space-y-2">
                    <div>
                      <div className="flex items-center justify-between mb-1">
                        <span className="text-xs text-slate-600">Staff</span>
                        <span className="text-xs font-semibold text-slate-900">{item.staff}</span>
                      </div>
                      <div className="w-full bg-slate-200 rounded-full h-2">
                        <div
                          className="h-full bg-blue-500 rounded-full transition-all duration-500"
                          style={{ width: `${staffPercentage}%` }}
                        />
                      </div>
                    </div>
                    <div>
                      <div className="flex items-center justify-between mb-1">
                        <span className="text-xs text-slate-600">Faculties</span>
                        <span className="text-xs font-semibold text-slate-900">{item.faculties}</span>
                      </div>
                      <div className="w-full bg-slate-200 rounded-full h-2">
                        <div
                          className="h-full bg-emerald-500 rounded-full transition-all duration-500"
                          style={{ width: `${facultiesPercentage}%` }}
                        />
                      </div>
                    </div>
                  </div>
                  {isHovered && (
                    <div className="absolute left-0 right-0 top-full z-20 mt-1 p-3 bg-slate-800 text-white text-xs rounded-lg shadow-lg border border-slate-600">
                      {presentationMode && (
                        <p className="text-amber-300 font-medium mb-1">Presentation mode – sample data</p>
                      )}
                      {insight.ratio && <p className="font-semibold mb-1">{insight.ratio}</p>}
                      <p className="text-slate-200">{insight.insight}</p>
                    </div>
                  )}
                </div>
              )
            })
          ) : (
            <div className={`${resourceLayout === 'vertical' ? 'h-32 py-4' : 'h-[300px]'} flex items-center justify-center text-slate-400`}>
              <div className="text-center">
                <BarChart3 className={`mx-auto mb-1 opacity-50 ${resourceLayout === 'vertical' ? 'w-8 h-8' : 'w-12 h-12'}`} />
                <p className={`font-medium ${resourceLayout === 'vertical' ? 'text-xs' : ''}`}>Data unavailable</p>
                <p className="text-xs mt-0.5">No resource data available from analytics</p>
              </div>
            </div>
          )}
        </div>
      </div>
      )}
    </div>
  )
}

export default GovernanceCharts
