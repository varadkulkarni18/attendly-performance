
import Link from "next/link";
import { desc, eq } from "drizzle-orm";
import {
  ArrowUpRight,
  ClipboardCheck,
} from "lucide-react";
import { AttendanceView } from "@/components/student/attendance-view";
import { AttendanceContribution } from "@/components/student/attendance-contribution";
import { requireRole } from "@/lib/auth-guard";
import { db } from "@/lib/db";
import {
  classGroups,
  groupStudents,
  lectureAttendance,
  lectureSessions,
  timetableEntries,
} from "@/lib/db/schema";
import { getLinkedStudent } from "@/lib/student-portal";

type AttendanceRecord = {
  id: number;
  status: string;
  date: string;
  subjectName: string;
  subjectCode: string;
  startTime: string;
  endTime: string;
  groupName: string;
};

function getDemoAttendance(): AttendanceRecord[] {
  const today = new Date();

  const demoSubjects = [
    {
      subjectName: "Database Management Systems",
      subjectCode: "DBMS",
      startTime: "09:00",
      endTime: "10:00",
      groupName: "TY Computer Science",
    },
    {
      subjectName: "Operating Systems",
      subjectCode: "OS",
      startTime: "10:00",
      endTime: "11:00",
      groupName: "TY Computer Science",
    },
    {
      subjectName: "Computer Networks",
      subjectCode: "CN",
      startTime: "11:15",
      endTime: "12:15",
      groupName: "TY Computer Science",
    },
    {
      subjectName: "Software Engineering",
      subjectCode: "SE",
      startTime: "13:00",
      endTime: "14:00",
      groupName: "TY Computer Science",
    },
    {
      subjectName: "Web Technology",
      subjectCode: "WT",
      startTime: "14:00",
      endTime: "15:00",
      groupName: "TY Computer Science",
    },
  ];

  const demoStatuses = [
    "present",
    "present",
    "late",
    "absent",
    "present",
    "present",
    "present",
    "excused",
    "present",
    "absent",
    "present",
    "late",
    "present",
    "present",
    "absent",
    "present",
    "present",
    "present",
    "late",
    "present",
    "present",
    "absent",
    "present",
    "present",
    "present",
  ];

  return demoStatuses.map((status, index) => {
    const lectureDate = new Date(today);
    lectureDate.setDate(today.getDate() - (index + 1));

    const subject = demoSubjects[index % demoSubjects.length];

    return {
      // Negative IDs distinguish demo records from database records.
      id: -(index + 1),
      status,
      date: [
        lectureDate.getFullYear(),
        String(lectureDate.getMonth() + 1).padStart(2, "0"),
        String(lectureDate.getDate()).padStart(2, "0"),
      ].join("-"),
      subjectName: subject.subjectName,
      subjectCode: subject.subjectCode,
      startTime: subject.startTime,
      endTime: subject.endTime,
      groupName: subject.groupName,
    };
  });
}

export default async function StudentAttendancePage() {
  const session = await requireRole("student");
  const email = session.user.email ?? "";
  const student = await getLinkedStudent(email);

  const databaseRecords = student
    ? await db
        .select({
          id: lectureAttendance.id,
          status: lectureAttendance.status,
          date: lectureSessions.date,
          sessionStatus: lectureSessions.status,
          subjectName: timetableEntries.subjectName,
          subjectCode: timetableEntries.subjectCode,
          startTime: timetableEntries.startTime,
          endTime: timetableEntries.endTime,
          groupName: classGroups.name,
        })
        .from(lectureAttendance)
        .innerJoin(
          lectureSessions,
          eq(lectureAttendance.lectureSessionId, lectureSessions.id),
        )
        .innerJoin(
          timetableEntries,
          eq(lectureSessions.timetableEntryId, timetableEntries.id),
        )
        .innerJoin(
          classGroups,
          eq(timetableEntries.classGroupId, classGroups.id),
        )
        .innerJoin(
          groupStudents,
          eq(lectureAttendance.groupStudentId, groupStudents.id),
        )
        .where(eq(groupStudents.id, student.id))
        .orderBy(desc(lectureSessions.date))
    : [];

  // Count only finalized attendance registers with recognized statuses.
  const markedDatabaseRecords = databaseRecords.filter(
    (record) =>
      record.sessionStatus === "completed" &&
      ["present", "absent", "late", "excused"].includes(
        record.status.toLowerCase(),
      ),
  );

  const realAttendanceRecords: AttendanceRecord[] =
    markedDatabaseRecords.map((record) => ({
      id: record.id,
      status: record.status.toLowerCase(),
      date: String(record.date).slice(0, 10),
      subjectName: record.subjectName,
      subjectCode: record.subjectCode,
      startTime: String(record.startTime ?? ""),
      endTime: String(record.endTime ?? ""),
      groupName: record.groupName,
    }));

  const attendanceRecords: AttendanceRecord[] = student
    ? realAttendanceRecords
    : getDemoAttendance();

  const countableRecords = attendanceRecords.filter((record) =>
    ["present", "absent", "late"].includes(record.status),
  );

  const present = countableRecords.filter(
    (record) => record.status === "present",
  ).length;

  const late = countableRecords.filter(
    (record) => record.status === "late",
  ).length;

  const attended = present + late;

  const absent = countableRecords.filter(
    (record) => record.status === "absent",
  ).length;

  const excused = attendanceRecords.filter(
    (record) => record.status === "excused",
  ).length;

  const rate = countableRecords.length
    ? Math.round((attended / countableRecords.length) * 100)
    : null;

  return (
    
      <div className="mx-auto max-w-7xl">
        <header className="border-b border-neutral-200 pb-5">
          <p className="font-mono text-[10px] uppercase tracking-[0.2em] text-neutral-500">
            Academic record / Attendance
          </p>

          <h1 className="mt-3 font-display text-4xl tracking-tight sm:text-5xl">
            My attendance<span className="italic">.</span>
          </h1>

          <p className="mt-2 max-w-2xl text-sm leading-6 text-neutral-600">
            Review your overall attendance, compare individual subjects and
            find any lecture record using the filters below.
          </p>

          {!student && (
            <p className="mt-4 border-l-2 border-neutral-300 pl-3 text-xs leading-5 text-neutral-500">
              Demo preview — these are sample attendance records for display
              only. They are not official academic records.
            </p>
          )}
        </header>

        {attendanceRecords.length === 0 ? (
          <div className="mt-8 border border-neutral-200 px-6 py-12 text-center">
            <ClipboardCheck
              size={26}
              strokeWidth={1.4}
              className="mx-auto text-neutral-400"
            />

            <h2 className="mt-4 font-display text-2xl">
              No attendance records yet
            </h2>

            <p className="mx-auto mt-2 max-w-md text-sm leading-6 text-neutral-600">
              Attendance will appear after completed registers have been saved
              for your linked class roster.
            </p>
          </div>
        ) : (
          <>
            <section
              aria-label="Attendance summary"
              className="mt-6 grid grid-cols-2 border border-neutral-200 sm:grid-cols-3 lg:grid-cols-5"
            >
              <div className="p-4 sm:p-5">
                <p className="text-xs text-neutral-500">Attendance rate</p>
                <p className="mt-2 font-display text-3xl tabular-nums">
                  {rate === null ? "—" : `${rate}%`}
                </p>
                <p className="mt-1 text-xs text-neutral-500">
                  Excused records excluded
                </p>
              </div>

              <div className="border-l border-neutral-200 p-4 sm:p-5">
                <p className="text-xs text-neutral-500">Present</p>
                <p className="mt-2 font-display text-3xl tabular-nums">
                  {present}
                </p>
                <p className="mt-1 text-xs text-neutral-500">
                  Marked present
                </p>
              </div>

              <div className="border-t border-neutral-200 p-4 sm:border-l sm:border-t-0 sm:p-5">
                <p className="text-xs text-neutral-500">Late</p>
                <p className="mt-2 font-display text-3xl tabular-nums">
                  {late}
                </p>
                <p className="mt-1 text-xs text-neutral-500">Marked late</p>
              </div>

              <div className="border-l border-t border-neutral-200 p-4 sm:p-5 lg:border-t-0">
                <p className="text-xs text-neutral-500">Absent</p>
                <p className="mt-2 font-display text-3xl tabular-nums">
                  {absent}
                </p>
                <p className="mt-1 text-xs text-neutral-500">
                  Marked absent
                </p>
              </div>

              <div className="col-span-2 border-t border-neutral-200 p-4 sm:col-span-1 sm:border-l sm:p-5">
                <p className="text-xs text-neutral-500">Recorded lectures</p>
                <p className="mt-2 font-display text-3xl tabular-nums">
                  {countableRecords.length}
                </p>
                <p className="mt-1 text-xs text-neutral-500">
                  {attended} attended · {excused} excused
                </p>
              </div>
            </section>

            {rate !== null && (
              <section className="mt-5 border border-neutral-200 p-5">
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <div>
                    <p className="font-mono text-[10px] uppercase tracking-[0.15em] text-neutral-500">
                      Overall progress
                    </p>
                    <h2 className="mt-2 font-display text-2xl">
                      {rate}% attendance
                    </h2>
                  </div>

                  <p className="text-sm text-neutral-600">
                    {attended} attended of {countableRecords.length} applicable
                    records
                  </p>
                </div>

                <div
                  className="mt-4 h-2 overflow-hidden bg-neutral-100"
                  role="progressbar"
                  aria-label="Overall attendance rate"
                  aria-valuemin={0}
                  aria-valuemax={100}
                  aria-valuenow={rate}
                >
                  <div
                    className="h-full bg-neutral-900 transition-[width]"
                    style={{ width: `${rate}%` }}
                  />
                </div>

                <p className="mt-2 text-xs text-neutral-500">
                  Excused records are excluded from the attendance percentage.
                  Only completed registers count for linked students.
                </p>
              </section>
            )}

            <section className="mt-9">
              <div className="flex items-end justify-between border-b border-neutral-200 pb-3">
                <div>
                  <p className="font-mono text-[10px] uppercase tracking-[0.18em] text-neutral-500">
                    Register history
                  </p>
                  <h2 className="mt-1 font-display text-2xl">
                    Attendance by subject
                  </h2>
                  <p className="mt-1 text-sm text-neutral-600">
                    Compare your attendance across subjects.
                  </p>
                </div>

                <span className="text-xs text-neutral-500">
                  {attendanceRecords.length} records
                </span>
              </div>

              
                <AttendanceView
                  records={attendanceRecords.map((record) => ({
                    ...record,
                    id: Number(record.id),
                  }))}
                />

                <AttendanceContribution
                  records={attendanceRecords.map((record) => ({
                    date: record.date,
                    status: record.status,
                  }))}
                  isDemo={!student}
                />

                <div className="mt-8 border-t border-neutral-200 pt-5">
                  <Link
                    href="/student/timetable"
                    className="inline-flex items-center gap-2 text-xs text-neutral-600 hover:text-black"
                  >
                    View your timetable <ArrowUpRight size={14} />
                  </Link>
                </div>



            </section>
          </>
        )}
      </div>
    
  );
}