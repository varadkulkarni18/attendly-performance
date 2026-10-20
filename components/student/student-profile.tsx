
"use client";

import { useState } from "react";
import {
  AlertCircle,
  BookOpen,
  Check,
  GraduationCap,
  IdCard,
  LogOut,
  Mail,
  School,
  ShieldCheck,
  UserRound,
  X,
} from "lucide-react";
import { authClient } from "@/lib/auth-client";

interface StudentProfileProps {
  name: string;
  email: string;
  accountId: string;
  collegeName: string;
  semester: string;
  rollNo: string | null;
  department: string | null;
  academicYear: string | null;
  section: string | null;
  isLinked: boolean;
}

function Detail({
  label,
  value,
  icon: Icon,
}: {
  label: string;
  value: string;
  icon: typeof UserRound;
}) {
  return (
    <div className="min-w-0 border-b border-neutral-200 py-4 last:border-b-0 sm:px-4">
      <div className="flex items-start gap-3">
        <div className="mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center border border-neutral-200 bg-neutral-50">
          <Icon size={16} strokeWidth={1.6} className="text-neutral-600" />
        </div>

        <div className="min-w-0 flex-1">
          <p className="font-mono text-[10px] uppercase tracking-[0.14em] text-neutral-500">
            {label}
          </p>
          <p className="mt-1.5 break-words text-sm font-medium text-neutral-900">
            {value || "Not available"}
          </p>
        </div>
      </div>
    </div>
  );
}

export default function StudentProfile({
  name,
  email,
  accountId,
  collegeName,
  semester,
  rollNo,
  department,
  academicYear,
  section,
  isLinked,
}: StudentProfileProps) {
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [signingOut, setSigningOut] = useState(false);
  const [error, setError] = useState("");

  const initials =
    name
      .trim()
      .split(/\s+/)
      .slice(0, 2)
      .map((part) => part[0])
      .join("")
      .toUpperCase() || "S";

  async function handleSignOut() {
    if (signingOut) return;

    setSigningOut(true);
    setError("");

    try {
      const result = await authClient.signOut();

      if (result.error) {
        setError(
          result.error.message || "Unable to sign out. Please try again.",
        );
        setSigningOut(false);
        return;
      }

      // The app's login page is /login, not /sign-in.
      window.location.replace("/login");
    } catch {
      setError("Something went wrong while signing out. Please try again.");
      setSigningOut(false);
    }
  }

  return (
    <>
      <div className="grid gap-6 lg:grid-cols-[minmax(0,1.6fr)_minmax(260px,0.8fr)]">
        <div className="min-w-0">
          {/* Student identity */}
          <section className="border border-neutral-200 bg-white">
            <div className="flex items-center gap-4 p-5 sm:p-7">
              <div className="flex h-16 w-16 shrink-0 items-center justify-center rounded-full border border-neutral-300 bg-neutral-100 font-display text-2xl">
                {initials}
              </div>

              <div className="min-w-0 flex-1">
                <p className="font-mono text-[10px] uppercase tracking-[0.16em] text-neutral-500">
                  Student account
                </p>
                <h2 className="mt-2 break-words font-display text-2xl tracking-tight sm:text-3xl">
                  {name}
                </h2>
                <p className="mt-1 break-all text-sm text-neutral-600">
                  {email}
                </p>
              </div>

              <div className="hidden shrink-0 items-center gap-1.5 border border-neutral-200 px-2.5 py-1.5 sm:flex">
                <Check size={13} />
                <span className="font-mono text-[10px] uppercase tracking-wide">
                  Signed in
                </span>
              </div>
            </div>

            <div className="border-t border-neutral-200 bg-neutral-50 px-5 py-3 sm:px-7">
              <p className="text-xs leading-relaxed text-neutral-600">
                Your account details are managed through your authenticated
                Attendly account.
              </p>
            </div>
          </section>

          {/* Personal information */}
          <section className="mt-6 border border-neutral-200 bg-white">
            <div className="border-b border-neutral-200 px-5 py-4 sm:px-6">
              <div className="flex items-center gap-2">
                <UserRound size={16} strokeWidth={1.7} />
                <h2 className="font-sans text-sm font-medium tracking-normal">
                  Personal information
                </h2>
              </div>
              <p className="mt-1 text-xs text-neutral-500">
                Your registered account details.
              </p>
            </div>

            <div className="grid gap-x-4 px-5 sm:grid-cols-2 sm:px-2">
              <Detail label="Full name" value={name} icon={UserRound} />
              <Detail label="Email address" value={email} icon={Mail} />
              <div className="sm:col-span-2">
                <Detail
                  label="Account ID"
                  value={accountId}
                  icon={IdCard}
                />
              </div>
            </div>
          </section>

          {/* Academic information */}
          <section className="mt-6 border border-neutral-200 bg-white">
            <div className="border-b border-neutral-200 px-5 py-4 sm:px-6">
              <div className="flex items-center gap-2">
                <GraduationCap size={17} strokeWidth={1.7} />
                <h2 className="font-sans text-sm font-medium tracking-normal">
                  Academic information
                </h2>
              </div>
              <p className="mt-1 text-xs text-neutral-500">
                Information from your class roster and institution settings.
              </p>
            </div>

            <div className="grid gap-x-4 px-5 sm:grid-cols-2 sm:px-2">
              <div className="sm:col-span-2">
                <Detail
                  label="College / Institution"
                  value={collegeName}
                  icon={School}
                />
              </div>

              <Detail
                label="Roll number"
                value={rollNo || "Not linked to a class roster"}
                icon={IdCard}
              />

              <Detail
                label="Department / Class"
                value={department || "Not linked to a class roster"}
                icon={BookOpen}
              />

              <Detail
                label="Studying year"
                value={academicYear || "Not available"}
                icon={GraduationCap}
              />

              <Detail
                label="Semester"
                value={semester}
                icon={BookOpen}
              />

              <div className="sm:col-span-2">
                <Detail
                  label="Section"
                  value={section || "Not linked to a class roster"}
                  icon={School}
                />
              </div>
            </div>

            {!isLinked && (
              <div className="flex items-start gap-3 border-t border-neutral-200 bg-neutral-50 p-4 sm:p-5">
                <AlertCircle
                  size={17}
                  className="mt-0.5 shrink-0 text-neutral-500"
                />
                <div>
                  <p className="text-sm font-medium">
                    Academic record not linked
                  </p>
                  <p className="mt-1 text-xs leading-relaxed text-neutral-600">
                    Your account is working, but no matching student roster
                    record was found for this email address. Ask your teacher
                    or administrator to link your student record.
                  </p>
                </div>
              </div>
            )}
          </section>
        </div>

        {/* Account settings */}
        <aside className="min-w-0">
          <section className="border border-neutral-200 bg-white">
            <div className="border-b border-neutral-200 p-5">
              <div className="flex h-10 w-10 items-center justify-center border border-neutral-200 bg-neutral-50">
                <ShieldCheck size={19} strokeWidth={1.6} />
              </div>
              <h2 className="mt-4 font-display text-xl">Account settings</h2>
              <p className="mt-2 text-sm leading-relaxed text-neutral-600">
                Manage your current session and keep your account secure.
              </p>
            </div>

            <div className="p-5">
              <div className="flex items-start gap-3">
                <div className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center bg-neutral-100">
                  <Check size={15} />
                </div>
                <div>
                  <p className="text-sm font-medium">Account active</p>
                  <p className="mt-1 text-xs leading-relaxed text-neutral-500">
                    You are signed in to Attendly.
                  </p>
                </div>
              </div>

              <div className="mt-5 border-t border-neutral-200 pt-5">
                <p className="text-sm font-medium">Sign out</p>
                <p className="mt-1 text-xs leading-relaxed text-neutral-500">
                  End your current session on this device.
                </p>

                <button
                  type="button"
                  onClick={() => {
                    setError("");
                    setConfirmOpen(true);
                  }}
                  className="mt-4 flex w-full items-center justify-center gap-2 border border-neutral-300 px-4 py-3 text-sm font-medium transition-colors hover:border-neutral-900 hover:bg-neutral-900 hover:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-neutral-900 focus-visible:ring-offset-2"
                >
                  <LogOut size={16} strokeWidth={1.7} />
                  Sign out
                </button>
              </div>
            </div>
          </section>

          <div className="mt-4 flex items-start gap-3 border border-neutral-200 p-4">
            <ShieldCheck
              size={16}
              className="mt-0.5 shrink-0 text-neutral-500"
            />
            <p className="text-xs leading-relaxed text-neutral-500">
              Never share your password or account credentials with anyone.
            </p>
          </div>
        </aside>
      </div>

      {/* Sign-out confirmation dialog */}
      {confirmOpen && (
        <div
          className="fixed inset-0 z-[100] flex items-center justify-center bg-black/35 px-4 py-6 backdrop-blur-md"
          onMouseDown={(event) => {
            if (event.target === event.currentTarget && !signingOut) {
              setConfirmOpen(false);
            }
          }}
        >
          <section
            role="alertdialog"
            aria-modal="true"
            aria-labelledby="signout-title"
            aria-describedby="signout-description"
            className="w-full max-w-md border border-neutral-200 bg-white p-6 shadow-2xl sm:p-8"
          >
            <div className="flex items-start justify-between gap-4">
              <div className="flex h-11 w-11 items-center justify-center border border-neutral-200 bg-neutral-50">
                <LogOut size={19} strokeWidth={1.7} />
              </div>

              <button
                type="button"
                aria-label="Close confirmation"
                disabled={signingOut}
                onClick={() => setConfirmOpen(false)}
                className="p-2 text-neutral-500 transition-colors hover:bg-neutral-100 hover:text-neutral-900 disabled:opacity-40"
              >
                <X size={18} />
              </button>
            </div>

            <h2
              id="signout-title"
              className="mt-6 font-display text-2xl tracking-tight"
            >
              Sign out of Attendly?
            </h2>

            <p
              id="signout-description"
              className="mt-2 text-sm leading-relaxed text-neutral-600"
            >
              You will be signed out of your student account on this device.
              You can sign in again whenever you need to.
            </p>

            {error && (
              <div
                role="alert"
                className="mt-5 flex items-start gap-2 border border-red-200 bg-red-50 p-3 text-sm text-red-800"
              >
                <AlertCircle size={17} className="mt-0.5 shrink-0" />
                <p>{error}</p>
              </div>
            )}

            <div className="mt-7 flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
              <button
                type="button"
                disabled={signingOut}
                onClick={() => {
                  setConfirmOpen(false);
                  setError("");
                }}
                className="border border-neutral-300 px-5 py-3 text-sm font-medium transition-colors hover:bg-neutral-50 disabled:opacity-50"
              >
                Cancel
              </button>

              <button
                type="button"
                disabled={signingOut}
                onClick={handleSignOut}
                className="flex items-center justify-center gap-2 bg-neutral-900 px-5 py-3 text-sm font-medium text-white transition-colors hover:bg-neutral-700 disabled:cursor-not-allowed disabled:opacity-60"
              >
                <LogOut size={15} />
                {signingOut ? "Signing out..." : "Yes, sign out"}
              </button>
            </div>
          </section>
        </div>
      )}
    </>
  );
}
