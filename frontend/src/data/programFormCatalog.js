/** Shared catalog for program add forms (ProgramManagement + inline modals). */

export const DEGREE_LEVEL_TO_KEY = {
  Undergraduate: 'undergraduate',
  'Graduate (MS/M.Phil)': 'graduate',
  'Postgraduate (PhD)': 'postgraduate'
}

export const PROGRAM_CATEGORIES = {
  Engineering: {
    undergraduate: [
      'BE Electrical',
      'BE Mechanical',
      'BE Civil',
      'BE Software',
      'BE Mechatronics',
      'BE Chemical',
      'BE Petroleum'
    ],
    graduate: ['ME Renewable Energy', 'ME Electrical Engineering'],
    postgraduate: []
  },
  'Medicine & Health': {
    undergraduate: [
      'MBBS',
      'BDS',
      'Pharm-D',
      'DPT',
      'BS Nursing',
      'BS Medical Technology',
      'BS Radiography'
    ],
    graduate: [],
    postgraduate: []
  },
  'Computer Science': {
    undergraduate: [
      'BS Computer Science',
      'BS Software Engineering',
      'BS AI',
      'BS Data Science',
      'BS Cyber Security'
    ],
    graduate: ['MS Computer Science'],
    postgraduate: ['PhD Computer Science']
  },
  'Business / Management': {
    undergraduate: ['BBA', 'BS Accounting & Finance', 'BS Supply Chain'],
    graduate: ['MBA (2 Years)', 'MS Management Sciences'],
    postgraduate: ['PhD Management Sciences']
  },
  Education: {
    undergraduate: [
      'B.Ed (Hons) 4-Year',
      'B.Ed 1.5-Year',
      'B.Ed 2.5-Year',
      'ADE (Associate Degree in Education)'
    ],
    graduate: ['MS Education'],
    postgraduate: ['PhD Education']
  },
  'Social Sciences': {
    undergraduate: [
      'BS Psychology',
      'BS International Relations',
      'BS Sociology',
      'BS English',
      'LLB (5-Year)'
    ],
    graduate: [],
    postgraduate: []
  },
  'Basic Sciences': {
    undergraduate: [
      'BS Mathematics',
      'BS Physics',
      'BS Chemistry',
      'BS Microbiology',
      'BS Biotechnology'
    ],
    graduate: [],
    postgraduate: []
  }
}

export const DEGREE_LEVELS = ['Undergraduate', 'Graduate (MS/M.Phil)', 'Postgraduate (PhD)']

export const DURATION_OPTIONS = [1, 1.5, 2, 2.5, 3, 3.5, 4, 5]
