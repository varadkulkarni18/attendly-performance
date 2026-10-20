
"use client";
import { createPortal } from "react-dom";
import { useState } from "react";
import { useRouter } from "next/navigation";
import {
  UserRound,
  Mail,
  ShieldCheck,
  GraduationCap,
  Building2,
  IdCard,
  LogOut,
  X,
  AlertTriangle,
} from "lucide-react";
import { authClient } from "@/lib/auth-client";

type Props = {
  name: string;
  email: string;
  accountId: string;
  image?: string | null;
};

function ProfileField({
  label,
  value,
  icon: Icon,
}: {
  label: string;
  value: string;
  icon: typeof UserRound;
}) {
  return (
    <div className="flex min-w-0 gap-3 border-b border-neutral-200 py-4 last:border-b-0">
      <Icon
        size={17}
        strokeWidth={1.6}
        className="mt-0.5 shrink-0 text-neutral-500"
        aria-hidden="true"
      />
      <div className="min-w-0 flex-1">
        <p className="font-mono text-[10px] uppercase tracking-[0.13em] text-neutral-500">
          {label}
        </p>
        <p className="mt-1 break-words text-sm text-neutral-900">{value}</p>
      </div>
    </div>
  );
}

export default function TeacherProfile({
  name,
  email,
  accountId,
  image = null,
}: Props) {
  const router = useRouter();
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [signingOut, setSigningOut] = useState(false);
  const [error, setError] = useState("");

  const initials =
    name
      .trim()
      .split(/\s+/)
      .slice(0, 2)
      .map((part) => part[0]?.toUpperCase())
      .join("") || "T";

  async function handleSignOut() {
    setSigningOut(true);
    setError("");

    try {
      const { error: signOutError } = await authClient.signOut();

      if (signOutError) {
        setError(
          signOutError.message || "Unable to sign out. Please try again."
        );
        setSigningOut(false);
        return;
      }

      router.replace("/login");
      router.refresh();
    } catch {
      setError("Unable to sign out. Check your connection and try again.");
      setSigningOut(false);
    }
  }

  return (
    <>
      <div className="mt-7 space-y-8">
        {/* Profile identity */}
        <section className="flex flex-col gap-5 border-b border-neutral-200 pb-7 sm:flex-row sm:items-center">
          <div className="flex size-24 shrink-0 items-center justify-center overflow-hidden border border-neutral-300 bg-neutral-50 font-display text-3xl">
            {image ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={image}
                alt={`${name}'s profile`}
                className="size-full object-cover"
              />
            ) : (
              initials
            )}
          </div>

          <div className="min-w-0 flex-1">
            <p className="font-mono text-[10px] uppercase tracking-[0.18em] text-neutral-500">
              Professor account
            </p>
            <h2 className="mt-2 break-words font-display text-3xl tracking-tight">
              {name}
            </h2>
            <p className="mt-1 break-words text-sm text-neutral-600">
              {email}
            </p>
            <span className="mt-3 inline-flex items-center gap-1.5 border border-neutral-200 px-2 py-1 font-mono text-[10px] uppercase tracking-wider text-neutral-600">
              <ShieldCheck size={12} />
              Professor
            </span>
          </div>
        </section>

        {/* Personal details */}
        <section>
          <div className="border-b border-neutral-200 pb-3">
            <p className="font-mono text-[10px] uppercase tracking-[0.18em] text-neutral-500">
              01 / Personal
            </p>
            <h3 className="mt-1 font-display text-2xl">
              Personal information
            </h3>
          </div>

          <div className="grid gap-x-10 sm:grid-cols-2">
            <ProfileField
              label="Full name"
              value={name}
              icon={UserRound}
            />
            <ProfileField
              label="Sign-in email"
              value={email}
              icon={Mail}
            />
          </div>
        </section>

        {/* Professional details */}
        <section>
          <div className="border-b border-neutral-200 pb-3">
            <p className="font-mono text-[10px] uppercase tracking-[0.18em] text-neutral-500">
              02 / Professional
            </p>
            <h3 className="mt-1 font-display text-2xl">
              College &amp; employment
            </h3>
          </div>

          <div className="grid gap-x-10 sm:grid-cols-2">
            <ProfileField
              label="Designation"
              value="Assistant Professor"
              icon={GraduationCap}
            />
            <ProfileField
              label="Qualifications"
              value="B.Sc., M.Tech."
              icon={GraduationCap}
            />
            <ProfileField
              label="Specialization"
              value="Computer Science"
              icon={Building2}
            />
            <ProfileField
              label="Department"
              value="Computer Science"
              icon={Building2}
            />
            <ProfileField
              label="College / Institute"
              value="Not configured"
              icon={Building2}
            />
            <ProfileField
              label="College employee ID"
              value="Not configured"
              icon={IdCard}
            />
          </div>

          <p className="mt-3 text-xs leading-relaxed text-neutral-500">
            Update the sample qualifications and specialization to match the
            professor’s actual professional details. Profile editing and
            database-backed professional fields are not implemented yet.
          </p>
        </section>

        {/* Account details */}
        <section>
          <div className="border-b border-neutral-200 pb-3">
            <p className="font-mono text-[10px] uppercase tracking-[0.18em] text-neutral-500">
              03 / Account
            </p>
            <h3 className="mt-1 font-display text-2xl">
              Account information
            </h3>
          </div>

          <div>
            <ProfileField
              label="Account ID"
              value={accountId}
              icon={IdCard}
            />
            <ProfileField
              label="Account role"
              value="Teacher"
              icon={ShieldCheck}
            />
            <ProfileField
              label="Authentication"
              value="Better Auth"
              icon={ShieldCheck}
            />
          </div>
        </section>

        {/* Sign out */}
        <section className="border-t border-neutral-200 pt-5">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <h3 className="text-sm font-medium">Sign out of Attendly</h3>
              <p className="mt-1 text-xs leading-relaxed text-neutral-500">
                End your current session on this device.
              </p>
            </div>

            <button
              type="button"
              onClick={() => {
                setError("");
                setConfirmOpen(true);
              }}
              className="inline-flex h-10 shrink-0 items-center justify-center gap-2 border border-neutral-300 px-4 text-sm transition-colors hover:border-black hover:bg-neutral-50"
            >
              <LogOut size={15} />
              Sign out
            </button>
          </div>

          {error && (
            <p role="alert" className="mt-3 text-sm text-red-700">
              {error}
            </p>
          )}
        </section>
      </div>

      {/* Render outside the animated page container so centering uses the viewport. */}
      {confirmOpen &&
        createPortal(
          <div
            className="fixed inset-0 z-[100] flex items-center justify-center bg-neutral-950/30 p-4 backdrop-blur-[3px]"
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
            className="fixed left-1/2 top-1/2 z-[101] w-[calc(100%-2rem)] max-w-md -translate-x-1/2 -translate-y-1/2 border border-neutral-200 bg-white p-6 shadow-2xl ring-1 ring-black/5"
          >
            <div className="flex items-start justify-between gap-4">
              <div className="flex size-10 items-center justify-center border border-neutral-200">
                <AlertTriangle size={19} strokeWidth={1.5} />
              </div>

              <button
                type="button"
                onClick={() => setConfirmOpen(false)}
                disabled={signingOut}
                aria-label="Close confirmation"
                className="flex size-8 items-center justify-center text-neutral-500 hover:bg-neutral-100 hover:text-black disabled:opacity-50"
              >
                <X size={17} />
              </button>
            </div>

            <h3
              id="signout-title"
              className="mt-5 font-display text-2xl tracking-tight"
            >
              Sign out of Attendly?
            </h3>

            <p
              id="signout-description"
              className="mt-2 text-sm leading-relaxed text-neutral-600"
            >
              You will need to sign in again to access your teaching workspace.
            </p>

            <div className="mt-6 flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
              <button
                type="button"
                disabled={signingOut}
                onClick={() => setConfirmOpen(false)}
                className="h-10 border border-neutral-300 px-4 text-sm hover:border-black disabled:opacity-50"
              >
                Cancel
              </button>

              <button
                type="button"
                disabled={signingOut}
                onClick={handleSignOut}
                className="inline-flex h-10 items-center justify-center gap-2 bg-black px-4 text-sm text-white hover:bg-neutral-800 disabled:cursor-not-allowed disabled:opacity-60"
              >
                <LogOut size={14} />
                {signingOut ? "Signing out..." : "Confirm sign out"}
              </button>
            </div>
          </section>
          </div>,
          document.body,
        )}
    </>
  );
}
