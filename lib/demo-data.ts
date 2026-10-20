import type { AttendanceStatus } from './attendance'

export const heroRoster: { id: string; name: string; rollNo: string; status: AttendanceStatus }[] = [
  { id: 's1', name: 'Aarav Mehta', rollNo: 'CS-2101', status: 'present' },
  { id: 's2', name: 'Diya Kapoor', rollNo: 'CS-2102', status: 'present' },
  { id: 's3', name: 'Kabir Sethi', rollNo: 'CS-2103', status: 'absent' },
  { id: 's4', name: 'Meera Iyer', rollNo: 'CS-2104', status: 'late' },
  { id: 's5', name: 'Rohan Das', rollNo: 'CS-2105', status: 'present' },
  { id: 's6', name: 'Sana Qureshi', rollNo: 'CS-2106', status: 'excused' },
]

export const classComparison = [
  { className: 'B.Sc CS — Year 2, Sec A', present: 412, late: 31, absent: 57, excused: 14 },
  { className: 'B.Sc CS — Year 2, Sec B', present: 368, late: 22, absent: 104, excused: 9 },
  { className: 'B.Com — Year 1, Sec A', present: 455, late: 18, absent: 41, excused: 6 },
  { className: 'BA English — Year 3', present: 289, late: 40, absent: 121, excused: 12 },
]

export const studentSubjects = [
  { code: 'CS201', subject: 'Data Structures', present: 26, late: 2, absent: 4, excused: 1 },
  { code: 'CS204', subject: 'Database Systems', present: 19, late: 3, absent: 9, excused: 0 },
  { code: 'MA210', subject: 'Discrete Mathematics', present: 24, late: 1, absent: 3, excused: 2 },
  { code: 'HS102', subject: 'Technical Writing', present: 12, late: 0, absent: 6, excused: 1 },
]

export const demoAccounts = [
  { role: 'admin', label: 'Admin', email: 'admin@attendly.demo', password: 'admin123' },
  { role: 'teacher', label: 'Teacher', email: 'teacher@attendly.demo', password: 'teacher123' },
  { role: 'student', label: 'Student', email: 'student@attendly.demo', password: 'student123' },
] as const

export type DemoRole = (typeof demoAccounts)[number]['role']
