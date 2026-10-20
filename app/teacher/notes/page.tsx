
import { requireRole } from "@/lib/auth-guard";
import MaterialUploadForm from "@/components/teacher/material-upload-form";

export default async function TeacherNotesPage() {
  const session = await requireRole("teacher");

  return (
    
      <div className="mx-auto max-w-7xl">
        <header className="border-b border-neutral-200 pb-5">
          <p className="font-mono text-[10px] uppercase tracking-[0.2em] text-neutral-500">
            Teaching workspace / Resources
          </p>

          <h1 className="mt-3 font-display text-4xl tracking-tight sm:text-5xl">
            Notes & Materials
          </h1>

          <p className="mt-2 text-sm text-neutral-600">
            Upload and organize learning resources for each class and subject.
          </p>
        </header>

        <div className="mt-7">
          <MaterialUploadForm />
        </div>
      </div>
    
  );
}
