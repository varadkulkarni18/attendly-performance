import Link from "next/link";
import { and, asc, eq } from "drizzle-orm";
import { BookOpen, ArrowUpRight } from "lucide-react";
import { requireRole } from "@/lib/auth-guard";
import { db } from "@/lib/db";
import { classGroups, timetableEntries } from "@/lib/db/schema";
import { getLinkedStudent } from "@/lib/student-portal";

export default async function StudentClassesPage() {
  const session = await requireRole("student");
  const email = session.user.email ?? "";
  const student = await getLinkedStudent(email);

  // Linked accounts use their own real class group.
  // Unlinked accounts use a display-only preview of the same class group.
  const demoGroup = !student
    ? await db.query.classGroups.findFirst({
        orderBy: (groups, { asc }) => [asc(groups.name)],
      })
    : null;

  const groupId = student?.groupId ?? demoGroup?.id;

  const subjects = groupId
    ? await db
        .select({
          id: timetableEntries.id,
          subjectName: timetableEntries.subjectName,
          subjectCode: timetableEntries.subjectCode,
          dayOfWeek: timetableEntries.dayOfWeek,
          startTime: timetableEntries.startTime,
          endTime: timetableEntries.endTime,
          room: timetableEntries.room,
          groupName: classGroups.name,
          section: classGroups.section,
          academicYear: classGroups.academicYear,
        })
        .from(timetableEntries)
        .innerJoin(
          classGroups,
          eq(timetableEntries.classGroupId, classGroups.id),
        )
        .where(
          and(
            eq(timetableEntries.classGroupId, groupId),
            eq(timetableEntries.active, true),
          ),
        )
        .orderBy(
          asc(timetableEntries.subjectName),
          asc(timetableEntries.dayOfWeek),
        )
    : [];

  const uniqueSubjects = Array.from(
    new Map(
      subjects.map((subject) => [subject.subjectCode, subject]),
    ).values(),
  );

  const groupName = student?.groupName ?? subjects[0]?.groupName ?? "TY";
  const section = student?.section ?? subjects[0]?.section ?? "CSE A";

  return (
    
      <div className="mx-auto max-w-7xl">
        <header className="border-b border-neutral-200 pb-5">
          <p className="font-mono text-[10px] uppercase tracking-[0.2em] text-neutral-500">
            Learning / Subjects
          </p>

          <h1 className="mt-3 font-display text-4xl tracking-tight sm:text-5xl">
            My classes
          </h1>

          <p className="mt-2 text-sm text-neutral-600">
            Your enrolled class and the subjects on your timetable.
          </p>
        </header>

        {subjects.length > 0 ? (
          <>
            <section className="mt-6 grid gap-4 sm:grid-cols-3">
              <div className="border border-neutral-200 p-5">
                <p className="text-xs text-neutral-500">Class group</p>
                <p className="mt-2 font-display text-2xl">{groupName}</p>
              </div>

              <div className="border border-neutral-200 p-5">
                <p className="text-xs text-neutral-500">Section</p>
                <p className="mt-2 font-display text-2xl">{section}</p>
              </div>

              <div className="border border-neutral-200 p-5">
                <p className="text-xs text-neutral-500">Active subjects</p>
                <p className="mt-2 font-display text-2xl">
                  {uniqueSubjects.length}
                </p>
              </div>
            </section>

            <section className="mt-9">
              <div className="flex items-end justify-between border-b border-neutral-200 pb-3">
                <div>
                  <p className="font-mono text-[10px] uppercase tracking-[0.18em] text-neutral-500">
                    Your curriculum
                  </p>
                  <h2 className="mt-1 font-display text-2xl">Subjects</h2>
                </div>

                <span className="text-xs text-neutral-500">
                  {uniqueSubjects.length} subjects
                </span>
              </div>

              <div className="mt-1">
                {uniqueSubjects.map((subject) => (
                  <article
                    key={subject.id}
                    className="flex flex-col gap-3 border-b border-neutral-200 py-5 sm:flex-row sm:items-center"
                  >
                    <div className="flex size-11 shrink-0 items-center justify-center border border-neutral-200">
                      <BookOpen size={18} strokeWidth={1.5} />
                    </div>

                    <div className="min-w-0 flex-1">
                      <h3 className="text-sm font-medium">
                        {subject.subjectName}
                      </h3>

                      <p className="mt-1 text-xs text-neutral-500">
                        {subject.subjectCode} · {subject.groupName} · Section{" "}
                        {subject.section}
                      </p>

                      <p className="mt-1 text-xs text-neutral-500">
                        {subject.room
                          ? `Room ${subject.room}`
                          : "Room not assigned"}
                      </p>
                    </div>

                    <Link
                      href="/student/timetable"
                      className="inline-flex items-center gap-2 text-xs text-neutral-600 hover:text-black"
                    >
                      View schedule <ArrowUpRight size={14} />
                    </Link>
                  </article>
                ))}
              </div>

              {!student && (
                <p className="mt-5 border-t border-neutral-200 pt-4 text-xs leading-5 text-neutral-500">
                  Demo view — class and subject details are displayed for
                  preview only. They do not represent official enrollment for
                  this account.
                </p>
              )}
            </section>
          </>
        ) : (
          <div className="mt-8 border border-neutral-200 px-6 py-12 text-center">
            <BookOpen
              className="mx-auto text-neutral-400"
              size={26}
              strokeWidth={1.4}
            />

            <h2 className="mt-4 font-display text-2xl">
              Your class details will appear here
            </h2>

            <p className="mx-auto mt-2 max-w-md text-sm leading-6 text-neutral-600">
              No active subjects are available in the class timetable yet.
            </p>
          </div>
        )}
      </div>
    
  );
}