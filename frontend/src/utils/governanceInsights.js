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

const HEALTH_WEIGHTS = {
  profile: 20,
  staffIntegrity: 30,
  governance: 30,
  academicDepth: 20,
}

function toBand(score) {
  if (score <= 40) return 'critical'
  if (score <= 75) return 'improving'
  return 'excellent'
}

export function calculateInstitutionalHealth(input) {
  const university = input?.university || {}
  const staff = Array.isArray(input?.staff) ? input.staff : []
  const boards = Array.isArray(input?.boards) ? input.boards : []
  const facultySummary = Array.isArray(input?.facultySummary) ? input.facultySummary : []
  const nowDate = input?.now ? new Date(input.now) : new Date()
  const nowTime = nowDate.getTime()

  const missingItems = []

  const profileFields = ['logo_url', 'website_url', 'address']
  const profilePresent = profileFields.filter((field) => Boolean(university?.[field]))
  const profileRatio = profilePresent.length / profileFields.length
  const profileScore = profileRatio * HEALTH_WEIGHTS.profile

  profileFields.forEach((field) => {
    if (!university?.[field]) {
      missingItems.push({
        category: 'profile',
        message: `University ${field.replace('_', ' ')} is missing`,
      })
    }
  })

  const appointmentFieldAvailable = staff.some((member) =>
    Object.prototype.hasOwnProperty.call(member || {}, 'appointment_letter_url')
  )
  const staffEligible = staff.length
  const compliantStaff = staff.filter((member) => {
    if (!member?.profile_photo_url) return false
    if (appointmentFieldAvailable) return Boolean(member?.appointment_letter_url)
    return true
  })
  const staffRatio = staffEligible > 0 ? compliantStaff.length / staffEligible : 0
  const staffScore = staffRatio * HEALTH_WEIGHTS.staffIntegrity
  const staffMissingPhoto = staff.filter((member) => !member?.profile_photo_url)
  const staffMissingLetter = appointmentFieldAvailable
    ? staff.filter((member) => member?.profile_photo_url && !member?.appointment_letter_url)
    : []

  if (staffMissingPhoto.length > 0) {
    missingItems.push({
      category: 'staff',
      message: `${staffMissingPhoto.length} staff member(s) missing profile photos`,
    })
  }
  if (staffMissingLetter.length > 0) {
    missingItems.push({
      category: 'staff',
      message: `${staffMissingLetter.length} staff member(s) missing appointment letters`,
    })
  }

  staff
    .filter((member) => {
      if (!member?.profile_photo_url) return true
      if (appointmentFieldAvailable && !member?.appointment_letter_url) return true
      return false
    })
    .slice(0, 15)
    .forEach((member) => {
      const reasons = []
      if (!member?.profile_photo_url) reasons.push('profile photo')
      if (appointmentFieldAvailable && !member?.appointment_letter_url) reasons.push('appointment letter')
      missingItems.push({
        category: 'staff',
        id: member?.id || null,
        name: member?.full_name || 'Unknown staff',
        message: `Staff Member ${member?.full_name || 'Unknown'} is missing ${reasons.join(' and ')}`,
      })
    })

  const activeBoardTypes = new Set(
    boards
      .filter((board) => {
        if (!board?.board_type || !board?.term_start) return false
        const termStart = new Date(board.term_start).getTime()
        const termEnd = board?.term_end ? new Date(board.term_end).getTime() : Number.POSITIVE_INFINITY
        return !Number.isNaN(termStart) && !Number.isNaN(termEnd) && termStart <= nowTime && nowTime <= termEnd
      })
      .map((board) => board.board_type)
  )
  const hasBoardOfFaculty = activeBoardTypes.has('Board of Faculty')
  const hasBoardOfStudies = activeBoardTypes.has('Board of Studies')
  const governanceScore =
    hasBoardOfFaculty && hasBoardOfStudies ? HEALTH_WEIGHTS.governance : 0

  if (!hasBoardOfFaculty) {
    missingItems.push({
      category: 'governance',
      message: 'No active Board of Faculty found within valid term dates',
    })
  }
  if (!hasBoardOfStudies) {
    missingItems.push({
      category: 'governance',
      message: 'No active Board of Studies found within valid term dates',
    })
  }

  const facultyTotal = facultySummary.length
  const compliantFaculties = facultySummary.filter(
    (row) => (row?.departments_count || 0) >= 1 && (row?.programs_count || 0) >= 1
  )
  const academicRatio = facultyTotal > 0 ? compliantFaculties.length / facultyTotal : 0
  const academicScore = academicRatio * HEALTH_WEIGHTS.academicDepth
  const nonCompliantFaculties = facultySummary.filter(
    (row) => (row?.departments_count || 0) < 1 || (row?.programs_count || 0) < 1
  )

  if (facultyTotal === 0) {
    missingItems.push({
      category: 'academic',
      message: 'No faculties available for academic depth evaluation',
    })
  } else if (nonCompliantFaculties.length > 0) {
    missingItems.push({
      category: 'academic',
      message: `${nonCompliantFaculties.length} faculty record(s) missing required departments/programs`,
    })
  }

  nonCompliantFaculties
    .slice(0, 15)
    .forEach((row) => {
      const reasons = []
      if ((row?.departments_count || 0) < 1) reasons.push('department')
      if ((row?.programs_count || 0) < 1) reasons.push('program')
      missingItems.push({
        category: 'academic',
        id: row?.faculty_id || null,
        name: row?.faculty_name || null,
        message: `Faculty ${row?.faculty_name || row?.faculty_id || 'Unknown'} is missing ${reasons.join(' and ')}`,
      })
    })

  const rawScore = profileScore + staffScore + governanceScore + academicScore
  const score = Math.max(0, Math.min(100, Math.round(rawScore)))
  const band = toBand(score)

  return {
    score,
    band,
    segmentScores: {
      profile: Number(profileScore.toFixed(2)),
      staffIntegrity: Number(staffScore.toFixed(2)),
      governance: Number(governanceScore.toFixed(2)),
      academicDepth: Number(academicScore.toFixed(2)),
    },
    missingItems,
    meta: {
      profilePresent: profilePresent.length,
      profileRequired: profileFields.length,
      staffCompliant: compliantStaff.length,
      staffTotal: staffEligible,
      appointmentFieldAvailable,
      activeBoardTypes: Array.from(activeBoardTypes),
      facultyCompliant: compliantFaculties.length,
      facultyTotal,
    },
  }
}
