
import StudentNotesContent from "@/components/student/student-notes-content";
import { requireRole } from "@/lib/auth-guard";

export default async function StudentNotesPage() {
  const session = await requireRole("student");
  const user = session.user;

  return (
    
      <StudentNotesContent />
    
  );
}
