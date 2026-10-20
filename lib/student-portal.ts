import "server-only";

import { eq, sql } from "drizzle-orm";
import { db } from "@/lib/db";
import { classGroups, groupStudents } from "@/lib/db/schema";

export async function getLinkedStudent(email: string) {
  const normalizedEmail = email.trim().toLowerCase();

  if (!normalizedEmail) return null;

  const [student] = await db
    .select({
      id: groupStudents.id,
      name: groupStudents.studentName,
      email: groupStudents.studentEmail,
      rollNo: groupStudents.rollNo,
      groupId: classGroups.id,
      groupName: classGroups.name,
      academicYear: classGroups.academicYear,
      section: classGroups.section,
    })
    .from(groupStudents)
    .innerJoin(
      classGroups,
      eq(groupStudents.classGroupId, classGroups.id),
    )
    .where(
      sql`lower(${groupStudents.studentEmail}) = ${normalizedEmail}`,
    )
    .limit(1);

  return student ?? null;
}