
import {
  boolean,
  date,
  index,
  integer,
  pgTable,
  serial,
  text,
  timestamp,
  unique,
} from 'drizzle-orm/pg-core'

export const user = pgTable('user', {
  id: text('id').primaryKey(),
  name: text('name').notNull(),
  email: text('email').notNull().unique(),
  emailVerified: boolean('emailVerified').notNull().default(false),
  image: text('image'),
  role: text('role').notNull().default('student'),
  createdAt: timestamp('createdAt').notNull().defaultNow(),
  updatedAt: timestamp('updatedAt').notNull().defaultNow(),
})


export const session = pgTable(
  'session',
  {
    id: text('id').primaryKey(),
    expiresAt: timestamp('expiresAt').notNull(),
    token: text('token').notNull().unique(),
    createdAt: timestamp('createdAt').notNull().defaultNow(),
    updatedAt: timestamp('updatedAt').notNull().defaultNow(),
    ipAddress: text('ipAddress'),
    userAgent: text('userAgent'),
    userId: text('userId')
      .notNull()
      .references(() => user.id, { onDelete: 'cascade' }),
  },
  (t) => [index('session_userId_idx').on(t.userId)],
)


export const account = pgTable(
  'account',
  {
    id: text('id').primaryKey(),
    accountId: text('accountId').notNull(),
    providerId: text('providerId').notNull(),
    userId: text('userId')
      .notNull()
      .references(() => user.id, { onDelete: 'cascade' }),
    accessToken: text('accessToken'),
    refreshToken: text('refreshToken'),
    idToken: text('idToken'),
    accessTokenExpiresAt: timestamp('accessTokenExpiresAt'),
    refreshTokenExpiresAt: timestamp('refreshTokenExpiresAt'),
    scope: text('scope'),
    password: text('password'),
    createdAt: timestamp('createdAt').notNull().defaultNow(),
    updatedAt: timestamp('updatedAt').notNull().defaultNow(),
  },
  (t) => [index('account_userId_idx').on(t.userId)],
)


export const verification = pgTable('verification', {
  id: text('id').primaryKey(),
  identifier: text('identifier').notNull(),
  value: text('value').notNull(),
  expiresAt: timestamp('expiresAt').notNull(),
  createdAt: timestamp('createdAt').defaultNow(),
  updatedAt: timestamp('updatedAt').defaultNow(),
})

export const classes = pgTable(
  'classes',
  {
    id: serial('id').primaryKey(),
    name: text('name').notNull(),
    code: text('code').notNull(),
    section: text('section'),
    teacherId: text('teacherId')
      .notNull()
      .references(() => user.id, { onDelete: 'restrict' }),
    createdAt: timestamp('createdAt').notNull().defaultNow(),
  },
  (t) => [index('classes_teacherId_idx').on(t.teacherId)],
)

export const enrollments = pgTable(
  'enrollments',
  {
    id: serial('id').primaryKey(),
    classId: integer('classId')
      .notNull()
      .references(() => classes.id, { onDelete: 'cascade' }),
    studentName: text('studentName').notNull(),
    rollNo: text('rollNo').notNull(),
    studentEmail: text('studentEmail'),
    createdAt: timestamp('createdAt').notNull().defaultNow(),
  },
  (t) => [
    unique().on(t.classId, t.rollNo),
    index('enrollments_classId_idx').on(t.classId),
    index('enrollments_studentEmail_idx').on(t.studentEmail),
  ],
)

export const classSessions = pgTable(
  'class_sessions',
  {
    id: serial('id').primaryKey(),
    classId: integer('classId')
      .notNull()
      .references(() => classes.id, { onDelete: 'cascade' }),
    date: date('date').notNull(),
    createdBy: text('createdBy')
      .notNull()
      .references(() => user.id, { onDelete: 'restrict' }),
    createdAt: timestamp('createdAt').notNull().defaultNow(),
  },
  (t) => [
    unique().on(t.classId, t.date),
    index('class_sessions_classId_idx').on(t.classId),
  ],
)

export const attendanceRecords = pgTable(
  'attendance_records',
  {
    id: serial('id').primaryKey(),
    sessionId: integer('sessionId')
      .notNull()
      .references(() => classSessions.id, { onDelete: 'cascade' }),
    enrollmentId: integer('enrollmentId')
      .notNull()
      .references(() => enrollments.id, { onDelete: 'cascade' }),
    status: text('status').notNull(),
    updatedAt: timestamp('updatedAt').notNull().defaultNow(),
  },
  (t) => [
    unique().on(t.sessionId, t.enrollmentId),
    index('attendance_records_enrollmentId_idx').on(t.enrollmentId),
  ],
)

/* ─────────────────────────────────────────────
   TIMETABLE-DRIVEN ATTENDANCE
   New tables; existing data remains untouched.
───────────────────────────────────────────── */

export const classGroups = pgTable(
  'class_groups',
  {
    id: serial('id').primaryKey(),
    name: text('name').notNull(),
    academicYear: text('academicYear').notNull(),
    section: text('section').notNull(),
    createdAt: timestamp('createdAt').notNull().defaultNow(),
  },
  (t) => [
    unique().on(t.name, t.academicYear, t.section),
  ],
)

export const groupStudents = pgTable(
  'group_students',
  {
    id: serial('id').primaryKey(),
    classGroupId: integer('classGroupId')
      .notNull()
      .references(() => classGroups.id, { onDelete: 'cascade' }),
    studentName: text('studentName').notNull(),
    rollNo: text('rollNo').notNull(),
    studentEmail: text('studentEmail'),
    createdAt: timestamp('createdAt').notNull().defaultNow(),
  },
  (t) => [
    unique().on(t.classGroupId, t.rollNo),
    index('group_students_classGroupId_idx').on(t.classGroupId),
  ],
)

export const timetableEntries = pgTable(
  'timetable_entries',
  {
    id: serial('id').primaryKey(),
    classGroupId: integer('classGroupId')
      .notNull()
      .references(() => classGroups.id, { onDelete: 'cascade' }),
    subjectName: text('subjectName').notNull(),
    subjectCode: text('subjectCode').notNull(),
    teacherId: text('teacherId')
      .notNull()
      .references(() => user.id, { onDelete: 'restrict' }),
    dayOfWeek: integer('dayOfWeek').notNull(),
    startTime: text('startTime').notNull(),
    endTime: text('endTime').notNull(),
    room: text('room'),
    active: boolean('active').notNull().default(true),
    createdAt: timestamp('createdAt').notNull().defaultNow(),
  },
  (t) => [
    index('timetable_entries_teacher_day_idx').on(
      t.teacherId,
      t.dayOfWeek,
    ),
    index('timetable_entries_classGroupId_idx').on(t.classGroupId),
  ],
)

export const timetableExceptions = pgTable(
  'timetable_exceptions',
  {
    id: serial('id').primaryKey(),
    date: date('date').notNull(),
    timetableEntryId: integer('timetableEntryId').references(
      () => timetableEntries.id,
      { onDelete: 'cascade' },
    ),
    type: text('type').notNull(),
    note: text('note'),
    createdBy: text('createdBy')
      .notNull()
      .references(() => user.id, { onDelete: 'restrict' }),
    createdAt: timestamp('createdAt').notNull().defaultNow(),
  },
  (t) => [
    index('timetable_exceptions_date_idx').on(t.date),
    index('timetable_exceptions_entry_date_idx').on(
      t.timetableEntryId,
      t.date,
    ),
  ],
)

export const lectureSessions = pgTable(
  'lecture_sessions',
  {
    id: serial('id').primaryKey(),
    timetableEntryId: integer('timetableEntryId')
      .notNull()
      .references(() => timetableEntries.id, { onDelete: 'restrict' }),
    date: date('date').notNull(),
    status: text('status').notNull().default('scheduled'),
    createdBy: text('createdBy')
      .notNull()
      .references(() => user.id, { onDelete: 'restrict' }),
    createdAt: timestamp('createdAt').notNull().defaultNow(),
  },
  (t) => [
    unique().on(t.timetableEntryId, t.date),
    index('lecture_sessions_date_idx').on(t.date),
  ],
)

export const lectureAttendance = pgTable(
  'lecture_attendance',
  {
    id: serial('id').primaryKey(),
    lectureSessionId: integer('lectureSessionId')
      .notNull()
      .references(() => lectureSessions.id, { onDelete: 'cascade' }),
    groupStudentId: integer('groupStudentId')
      .notNull()
      .references(() => groupStudents.id, { onDelete: 'cascade' }),
    status: text('status').notNull(),
    updatedAt: timestamp('updatedAt').notNull().defaultNow(),
  },
  (t) => [
    unique().on(t.lectureSessionId, t.groupStudentId),
    index('lecture_attendance_student_idx').on(t.groupStudentId),
  ],
)
