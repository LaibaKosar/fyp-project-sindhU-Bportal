/** Preset department lists by faculty name (DepartmentManagement + inline add from faculty). */

export const DEPARTMENT_MAPPING = {
  'Faculty of Arts & Social Sciences': [
    'Department of Economics',
    'Department of Psychology',
    'Department of International Relations',
    'Department of Political Science',
    'Department of Sociology',
    'Department of Criminology',
    'Department of Media & Communication Studies',
    'Department of History',
    'Department of Social Work',
    'Department of Gender Studies',
    'Department of Fine Arts'
  ],
  'Faculty of Engineering & Technology': [
    'Department of Civil Engineering',
    'Department of Electrical Engineering',
    'Department of Mechanical Engineering',
    'Department of Software Engineering',
    'Department of Chemical Engineering',
    'Department of Electronics Engineering',
    'Department of Computer Engineering',
    'Department of Telecommunication Engineering'
  ],
  'Faculty of Management Sciences': [
    'Department of Business Administration',
    'Department of Commerce',
    'Department of Finance',
    'Department of Accounting',
    'Department of Public Administration',
    'Department of Marketing',
    'Department of Human Resource Management',
    'Department of Hospitality & Tourism Management'
  ],
  'Faculty of Computer Science & IT': [
    'Department of Computer Science',
    'Department of Information Technology',
    'Department of Software Engineering',
    'Department of Data Science',
    'Department of Artificial Intelligence',
    'Department of Cyber Security'
  ],
  'Faculty of Science': [
    'Department of Physics',
    'Department of Chemistry',
    'Department of Biology',
    'Department of Mathematics',
    'Department of Statistics',
    'Department of Environmental Sciences',
    'Department of Biotechnology',
    'Department of Zoology',
    'Department of Botany',
    'Department of Microbiology'
  ],
  'Faculty of Education': [
    'Department of Teacher Education',
    'Department of Special Education',
    'Department of Educational Leadership & Management',
    'Department of Early Childhood Education'
  ],
  'Faculty of Law': ['Department of Law', 'Department of Shariah & Law'],
  'Faculty of Pharmacy': [
    'Department of Pharmaceutics',
    'Department of Pharmaceutical Chemistry',
    'Department of Pharmacology',
    'Department of Pharmacognosy',
    'Department of Pharmacy Practice'
  ]
}

export function generateDepartmentCode(departmentName) {
  if (!departmentName) return ''
  let name = departmentName.replace(/^Department of /i, '').trim()
  const specialCases = {
    'Computer Science': 'CS',
    'Information Technology': 'IT',
    'Software Engineering': 'SE',
    'Data Science': 'DS',
    'Artificial Intelligence': 'AI',
    'Cyber Security': 'CYBER',
    'Civil Engineering': 'CE',
    'Electrical Engineering': 'EE',
    'Mechanical Engineering': 'ME',
    'Chemical Engineering': 'CHE',
    'Electronics Engineering': 'ECE',
    'Computer Engineering': 'COE',
    'Telecommunication Engineering': 'TE',
    'Business Administration': 'BA',
    'Public Administration': 'PA',
    'Human Resource Management': 'HRM',
    'Hospitality & Tourism Management': 'HTM',
    'Media & Communication Studies': 'MCS',
    'International Relations': 'IR',
    'Political Science': 'PS',
    'Social Work': 'SW',
    'Gender Studies': 'GS',
    'Fine Arts': 'FA',
    'Teacher Education': 'TE',
    'Special Education': 'SPED',
    'Educational Leadership & Management': 'ELM',
    'Early Childhood Education': 'ECE',
    'Shariah & Law': 'SL'
  }
  if (specialCases[name]) return specialCases[name]
  const words = name.split(' ')
  if (words.length === 1) return name.substring(0, 3).toUpperCase()
  const significantWords = words.filter((w) => !['of', 'and', 'the', '&'].includes(w.toLowerCase()))
  if (significantWords.length >= 2) {
    return significantWords.map((w) => w[0]).join('').toUpperCase().substring(0, 4)
  }
  return name.substring(0, 4).toUpperCase()
}
