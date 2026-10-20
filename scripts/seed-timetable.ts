
import 'dotenv/config'
import { and, eq } from 'drizzle-orm'
import { db, pool } from '../lib/db'
import {
  classGroups,
  groupStudents,
  timetableEntries,
  timetableExceptions,
  user,
} from '../lib/db/schema'

const TEACHER_EMAIL = 'neha.kulkarni@attendly.demo'

const TY_A = [
  'Aarav Patil', 'Aditya Sharma', 'Ananya Deshmukh', 'Sneha Kulkarni',
  'Rohan Joshi', 'Priya Shah', 'Om Bondarde', 'Sakshi More',
  'Atharva Pawar', 'Isha Kulkarni', 'Vedant Shinde', 'Tanvi Patil',
  'Siddharth Kadam', 'Riya Chavan', 'Soham Desai', 'Neha Gaikwad',
  'Akash Bhosale', 'Pooja Mane', 'Nikhil Sawant', 'Mrunal Patil',
]

const TY_B = [
  'Rudra Pawar', 'Kavya Deshmukh', 'Vivek Patil', 'Sanjana Joshi',
  'Kunal Shinde', 'Aditi More', 'Harsh Vaidya', 'Mansi Jadhav',
  'Yash Kulkarni', 'Shruti Chavan', 'Pranav Bhosale', 'Pallavi Mane',
  'Saurabh Kadam', 'Diya Shah', 'Niranjan Gaikwad', 'Vaishnavi Desai',
  'Abhishek Sawant', 'Rutuja Patil', 'Sahil Pawar', 'Amruta Kulkarni',
]

const SY_A = [
  'Ishaan Desai', 'Myra Kulkarni', 'Arjun Shinde', 'Sara Patil',
  'Reyansh Joshi', 'Anvi Pawar', 'Atharv More', 'Aarohi Shah',
  'Kabir Jadhav', 'Saanvi Bhosale', 'Vihaan Chavan', 'Kiara Mane',
  'Dhruv Gaikwad', 'Pari Sawant', 'Krish Kadam', 'Navya Deshmukh',
  'Ritvik Vaidya', 'Ira Kulkarni', 'Dev Patil', 'Prisha Joshi',
]

const SY_B = [
  'Advik Pawar', 'Anaya Patil', 'Shaurya Deshmukh', 'Aadhya More',
  'Ayaan Kulkarni', 'Ishita Shinde', 'Rudransh Joshi', 'Samaira Shah',
  'Manav Jadhav', 'Avni Chavan', 'Darsh Bhosale', 'Tara Gaikwad',
  'Yug Sawant', 'Siya Kadam', 'Parth Mane', 'Reva Desai',
  'Nivaan Vaidya', 'Meera Pawar', 'Om Deshmukh', 'Rhea Patil',
]

type Subject = {
  subjectName: string
  subjectCode: string
  dayOfWeek: number
  startTime: string
  endTime: string
  room: string
}

type GroupSeed = {
  name: string
  academicYear: string
  section: string
  students: string[]
  subjects: Subject[]
}

const GROUPS: GroupSeed[] = [
  {
    name: 'TY CSE',
    academicYear: 'Third Year',
    section: 'A',
    students: TY_A,
    subjects: [
      { subjectName: 'Database Management Systems', subjectCode: 'DBMS', dayOfWeek: 1, startTime: '09:00', endTime: '10:00', room: 'Room 204' },
      { subjectName: 'Computer Networks', subjectCode: 'CN', dayOfWeek: 2, startTime: '10:00', endTime: '11:00', room: 'Room 204' },
      { subjectName: 'Operating Systems', subjectCode: 'OS', dayOfWeek: 3, startTime: '11:00', endTime: '12:00', room: 'Lab 2' },
      { subjectName: 'Chapter 3 - Database Normalization', subjectCode: 'DBMS-CH3', dayOfWeek: 4, startTime: '09:00', endTime: '10:00', room: 'Lab 3' },
      { subjectName: 'Software Engineering', subjectCode: 'SE', dayOfWeek: 5, startTime: '09:00', endTime: '10:00', room: 'Room 204' },
      { subjectName: 'Database Management Systems', subjectCode: 'DBMS', dayOfWeek: 4, startTime: '11:00', endTime: '12:00', room: 'Room 204' },
    ],
  },
  {
    name: 'TY CSE',
    academicYear: 'Third Year',
    section: 'B',
    students: TY_B,
    subjects: [
      { subjectName: 'Computer Networks', subjectCode: 'CN-B', dayOfWeek: 1, startTime: '10:00', endTime: '11:00', room: 'Room 205' },
      { subjectName: 'Operating Systems', subjectCode: 'OS-B', dayOfWeek: 2, startTime: '11:00', endTime: '12:00', room: 'Lab 2' },
      { subjectName: 'Software Engineering', subjectCode: 'SE-B', dayOfWeek: 3, startTime: '09:00', endTime: '10:00', room: 'Room 205' },
      { subjectName: 'Chapter 3 - Database Normalization', subjectCode: 'DBMS-CH3-B', dayOfWeek: 4, startTime: '13:00', endTime: '14:00', room: 'Room 205' },
      { subjectName: 'Database Management Systems', subjectCode: 'DBMS-B', dayOfWeek: 5, startTime: '11:00', endTime: '12:00', room: 'Room 205' },
    ],
  },
  {
    name: 'SY CSE',
    academicYear: 'Second Year',
    section: 'A',
    students: SY_A,
    subjects: [
      { subjectName: 'Object Oriented Programming', subjectCode: 'OOP-SY-A', dayOfWeek: 1, startTime: '11:00', endTime: '12:00', room: 'Room 101' },
      { subjectName: 'Data Structures', subjectCode: 'DS-SY-A', dayOfWeek: 2, startTime: '09:00', endTime: '10:00', room: 'Lab 1' },
      { subjectName: 'Digital Electronics', subjectCode: 'DE-SY-A', dayOfWeek: 3, startTime: '10:00', endTime: '11:00', room: 'Room 101' },
      { subjectName: 'Discrete Mathematics', subjectCode: 'DM-SY-A', dayOfWeek: 4, startTime: '10:00', endTime: '11:00', room: 'Room 101' },
      { subjectName: 'Data Structures Lab', subjectCode: 'DSL-SY-A', dayOfWeek: 5, startTime: '13:00', endTime: '14:00', room: 'Lab 1' },
    ],
  },
  {
    name: 'SY CSE',
    academicYear: 'Second Year',
    section: 'B',
    students: SY_B,
    subjects: [
      { subjectName: 'Data Structures', subjectCode: 'DS-SY-B', dayOfWeek: 1, startTime: '13:00', endTime: '14:00', room: 'Lab 1' },
      { subjectName: 'Digital Electronics', subjectCode: 'DE-SY-B', dayOfWeek: 2, startTime: '13:00', endTime: '14:00', room: 'Room 102' },
      { subjectName: 'Discrete Mathematics', subjectCode: 'DM-SY-B', dayOfWeek: 3, startTime: '13:00', endTime: '14:00', room: 'Room 102' },
      { subjectName: 'Object Oriented Programming', subjectCode: 'OOP-SY-B', dayOfWeek: 4, startTime: '14:00', endTime: '15:00', room: 'Room 102' },
      { subjectName: 'OOP Programming Lab', subjectCode: 'OOPL-SY-B', dayOfWeek: 5, startTime: '10:00', endTime: '11:00', room: 'Lab 1' },
    ],
  },
]

// Dates are sample academic-calendar data for the demo, not official notices.
const ACADEMIC_EVENTS = [
  { date: '2026-10-19', type: 'event', note: 'Sample event: Department seminar' },
  { date: '2026-10-24', type: 'holiday', note: 'Sample holiday: College closed' },
  { date: '2026-10-28', type: 'event', note: 'Sample event: Internal assessment notice' },
  { date: '2026-11-02', type: 'event', note: 'Sample event: Project review submissions' },
]

async function main() {
  const [teacher] = await db
    .select({ id: user.id, name: user.name })
    .from(user)
    .where(and(eq(user.email, TEACHER_EMAIL), eq(user.role, 'teacher')))

  if (!teacher) {
    throw new Error(`Teacher ${TEACHER_EMAIL} was not found. Check the seeded accounts first.`)
  }

  console.log(`Setting up weekly timetable for ${teacher.name}`)

  for (const groupData of GROUPS) {
    let [group] = await db
      .select()
      .from(classGroups)
      .where(and(
        eq(classGroups.name, groupData.name),
        eq(classGroups.academicYear, groupData.academicYear),
        eq(classGroups.section, groupData.section),
      ))

    if (!group) {
      ;[group] = await db
        .insert(classGroups)
        .values({
          name: groupData.name,
          academicYear: groupData.academicYear,
          section: groupData.section,
        })
        .returning()
    }

    for (let i = 0; i < groupData.students.length; i++) {
      const rollNo = `${groupData.academicYear === 'Second Year' ? 'SY' : 'TY'}${groupData.section}-${String(i + 1).padStart(3, '0')}`
      const studentName = groupData.students[i]

      const [existingStudent] = await db
        .select({ id: groupStudents.id, studentName: groupStudents.studentName })
        .from(groupStudents)
        .where(and(
          eq(groupStudents.classGroupId, group.id),
          eq(groupStudents.rollNo, rollNo),
        ))

      if (!existingStudent) {
        await db.insert(groupStudents).values({
          classGroupId: group.id,
          studentName,
          rollNo,
        })
      } else if (existingStudent.studentName !== studentName) {
        await db.update(groupStudents)
          .set({ studentName })
          .where(eq(groupStudents.id, existingStudent.id))
      }
    }

    for (const subject of groupData.subjects) {
      const [existingEntry] = await db
        .select({ id: timetableEntries.id })
        .from(timetableEntries)
        .where(and(
          eq(timetableEntries.classGroupId, group.id),
          eq(timetableEntries.subjectCode, subject.subjectCode),
          eq(timetableEntries.teacherId, teacher.id),
          eq(timetableEntries.dayOfWeek, subject.dayOfWeek),
          eq(timetableEntries.startTime, subject.startTime),
        ))

      if (!existingEntry) {
        await db.insert(timetableEntries).values({
          classGroupId: group.id,
          subjectName: subject.subjectName,
          subjectCode: subject.subjectCode,
          teacherId: teacher.id,
          dayOfWeek: subject.dayOfWeek,
          startTime: subject.startTime,
          endTime: subject.endTime,
          room: subject.room,
        })
      }
    }

    console.log(`Ready: ${groupData.name} ${groupData.section} — ${groupData.students.length} students`)
  }

  for (const event of ACADEMIC_EVENTS) {
    const [existingEvent] = await db
      .select({ id: timetableExceptions.id })
      .from(timetableExceptions)
      .where(and(
        eq(timetableExceptions.date, event.date),
        eq(timetableExceptions.type, event.type),
        eq(timetableExceptions.note, event.note),
      ))

    if (!existingEvent) {
      await db.insert(timetableExceptions).values({
        date: event.date,
        timetableEntryId: null,
        type: event.type,
        note: event.note,
        createdBy: teacher.id,
      })
    }
  }

  console.log('Weekly timetable and sample academic calendar seeded without deleting existing data.')
}

main()
  .catch((error) => {
    console.error(error)
    process.exitCode = 1
  })
  .finally(async () => {
    await pool.end()
  })
