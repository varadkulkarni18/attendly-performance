import { eq } from "drizzle-orm";
import StudentProfile from "@/components/student/student-profile";
import { requireRole } from "@/lib/auth-guard";
import { db } from "@/lib/db";
import { classGroups, groupStudents } from "@/lib/db/schema";

export default async function StudentProfilePage() {
  const session = await requireRole("student");
  const user = session.user;
  const email = user.email.trim().toLowerCase();

  const [student] = await db
    .select({
      studentName: groupStudents.studentName,
      rollNo: groupStudents.rollNo,
      groupName: classGroups.name,
      academicYear: classGroups.academicYear,
      section: classGroups.section,
    })
    .from(groupStudents)
    .innerJoin(
      classGroups,
      eq(groupStudents.classGroupId, classGroups.id),
    )
    .where(eq(groupStudents.studentEmail, email))
    .limit(1);

  const collegeName =
    process.env.NEXT_PUBLIC_COLLEGE_NAME ||
    "ISBM College of Engineering";

  const className = student?.groupName?.toLowerCase() ?? "";
  const yearName = student?.academicYear?.toLowerCase() ?? "";

  const semester =
    /ty|third year/.test(className) ||
    /ty|third year/.test(yearName)
      ? "Semester 5 / 6"
      : /sy|second year/.test(className) ||
          /sy|second year/.test(yearName)
        ? "Semester 3 / 4"
        : /fy|first year/.test(className) ||
            /fy|first year/.test(yearName)
          ? "Semester 1 / 2"
          : "Not assigned";

  const displayName =
    user.name || student?.studentName || "Student";

  return (
    
      <main className="mx-auto max-w-5xl">
        <header className="border-b border-neutral-200 pb-6">
          <p className="font-mono text-[10px] uppercase tracking-[0.2em] text-neutral-500">
            Learning workspace / Account
          </p>

          <h1 className="mt-3 font-display text-4xl tracking-tight sm:text-5xl">
            My profile<span className="italic">.</span>
          </h1>

          <p className="mt-3 max-w-2xl text-sm leading-relaxed text-neutral-600">
            Your personal details, academic information and account settings
            in one place.
          </p>
        </header>

        <div className="mt-7">
          <StudentProfile
            name={displayName}
            email={user.email}
            accountId={user.id}
            collegeName={collegeName}
            semester={semester}
            rollNo={student?.rollNo ?? null}
            department={student?.groupName ?? null}
            academicYear={student?.academicYear ?? null}
            section={student?.section ?? null}
            isLinked={Boolean(student)}
          />
        </div>
      </main>
    
  );
}