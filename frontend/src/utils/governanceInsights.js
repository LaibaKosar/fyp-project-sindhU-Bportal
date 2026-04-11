/**
 * Human-readable staff/faculty summaries for governance dashboards.
 * Avoids misleading "1 faculty : 5.3 staff" style decimals.
 */
export function getResourceInsightForItem(item) {
  const staff = item?.staff ?? 0
  const faculties = item?.faculties ?? 0
  if (staff === 0 && faculties === 0) {
    return {
      summary: null,
      ratio: null,
      insight: 'No staff or faculty data yet. Add data for staffing insights.',
      densityBand: null,
    }
  }
  if (faculties === 0) {
    return {
      summary: `${staff} staff`,
      ratio: null,
      insight: 'No faculty count reported. Add faculty data to compare staffing density.',
      densityBand: null,
    }
  }
  if (staff === 0) {
    return {
      summary: `${faculties} faculties`,
      ratio: null,
      insight: 'No staff count reported. Add staff data to compare with faculty.',
      densityBand: null,
    }
  }

  const perFaculty = staff / faculties
  const rounded = Math.round(perFaculty)
  const summary = `${staff} staff · ${faculties} faculties`
  const ratio =
    rounded >= 1
      ? `About ${rounded} staff per faculty on average`
      : 'Fewer than one staff member per faculty on average'

  let recommendation = ''
  /** For quick visual scan on dashboard cards (border accent). */
  let densityBand = 'lean'
  if (perFaculty > 50) {
    densityBand = 'high'
    recommendation = 'High staff per faculty — consider expanding faculty or reviewing workload distribution.'
  } else if (perFaculty >= 25) {
    densityBand = 'moderate'
    recommendation = 'Moderate density. Monitor capacity as enrollment grows.'
  } else if (perFaculty >= 15) {
    densityBand = 'balanced'
    recommendation = 'Balanced staffing relative to faculty count for typical oversight.'
  } else {
    densityBand = 'lean'
    recommendation = 'Lower staff per faculty — adequate faculty coverage; consider staff recruitment if operations are stretched.'
  }

  return { summary, ratio, insight: recommendation, densityBand }
}
