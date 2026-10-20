
import { requireRole } from "@/lib/auth-guard";
import TeacherProfile from "@/components/teacher/teacher-profile";

export default async function TeacherProfilePage() {
  const session = await requireRole("teacher");
  const user = session.user;

  return (
    
      <div className="mx-auto max-w-5xl">
        <header className="border-b border-neutral-200 pb-5">
          <p className="font-mono text-[10px] uppercase tracking-[0.2em] text-neutral-500">
            Teaching workspace / Account
          </p>

          <h1 className="mt-3 font-display text-4xl tracking-tight sm:text-5xl">
            My profile
          </h1>

          <p className="mt-2 text-sm text-neutral-600">
            Your personal details, professional information and account settings.
          </p>
        </header>

        <TeacherProfile
          name={user.name || "Teacher"}
          email={user.email}
          accountId={user.id}
        />
      </div>
    
  );
}
