
import { AdminProfileActions } from '@/components/admin/admin-profile-actions'
import { requireRole } from '@/lib/auth-guard'

export default async function AdminProfilePage() {
  const session = await requireRole('admin')

  const name = session.user.name?.trim() || 'Administrator'
  const email = session.user.email || 'No email available'

  const initials =
    name
      .split(/\s+/)
      .filter(Boolean)
      .slice(0, 2)
      .map((part) => part[0]?.toUpperCase())
      .join('') || 'A'

  return (
    
      <main className="mx-auto w-full max-w-7xl space-y-8 pb-10">
        {/* Page heading */}
        <header className="border-b border-neutral-200 pb-7">
          <p className="font-mono text-[10px] uppercase tracking-[0.2em] text-neutral-500">
            Administration / Account
          </p>

          <h1 className="mt-4 font-display text-4xl tracking-tight text-neutral-950 sm:text-5xl">
            My profile<span className="italic">.</span>
          </h1>

          <p className="mt-3 max-w-2xl text-base leading-7 text-neutral-600">
            Manage your account details and sign-in settings.
          </p>
        </header>

        {/* Account overview */}
        <section
          aria-labelledby="account-overview-heading"
          className="overflow-hidden border border-neutral-200 bg-white"
        >
          <div className="border-b border-neutral-200 px-5 py-5 sm:px-7">
            <h2
              id="account-overview-heading"
              className="font-display text-2xl tracking-tight text-neutral-950"
            >
              Account overview
            </h2>

            <p className="mt-1 text-sm leading-6 text-neutral-600">
              Information associated with your Attendly account.
            </p>
          </div>

          {/* Identity */}
          <div className="flex flex-col gap-5 px-5 py-7 sm:flex-row sm:items-center sm:px-7 sm:py-8">
            <div className="flex size-20 shrink-0 items-center justify-center border border-neutral-200 bg-neutral-50 font-display text-2xl text-neutral-950">
              {initials}
            </div>

            <div className="min-w-0 flex-1">
              <h3 className="break-words font-display text-2xl tracking-tight text-neutral-950 sm:text-3xl">
                {name}
              </h3>

              <p className="mt-1 break-all text-base text-neutral-600">
                {email}
              </p>

              <span className="mt-3 inline-flex items-center gap-2 border border-neutral-200 px-3 py-1.5 text-sm text-neutral-700">
                <span className="size-1.5 shrink-0 rounded-full bg-emerald-600" />
                Administrator
              </span>
            </div>
          </div>

          {/* Account details */}
          <div className="grid gap-px border-t border-neutral-200 bg-neutral-200 sm:grid-cols-2">
            <div className="min-w-0 bg-white px-5 py-5 sm:px-7 sm:py-6">
              <p className="font-mono text-[10px] uppercase tracking-[0.16em] text-neutral-500">
                Full name
              </p>

              <p className="mt-2 break-words text-base leading-6 text-neutral-950">
                {name}
              </p>
            </div>

            <div className="min-w-0 bg-white px-5 py-5 sm:px-7 sm:py-6">
              <p className="font-mono text-[10px] uppercase tracking-[0.16em] text-neutral-500">
                Email address
              </p>

              <p className="mt-2 break-all text-base leading-6 text-neutral-950">
                {email}
              </p>
            </div>

            <div className="min-w-0 bg-white px-5 py-5 sm:col-span-2 sm:px-7 sm:py-6">
              <p className="font-mono text-[10px] uppercase tracking-[0.16em] text-neutral-500">
                Account role
              </p>

              <p className="mt-2 text-base leading-6 text-neutral-950">
                Administrator
                <span className="text-neutral-500">
                  {' '}· Manage your Attendly workspace
                </span>
              </p>
            </div>
          </div>

          {/* Sign out */}
          <div className="flex flex-col gap-5 border-t border-neutral-200 px-5 py-5 sm:flex-row sm:items-center sm:justify-between sm:px-7 sm:py-6">
            <div>
              <h3 className="font-display text-xl text-neutral-950">
                Sign out
              </h3>

              <p className="mt-1 text-sm leading-6 text-neutral-600">
                End your current session on this device.
              </p>
            </div>

            <div className="shrink-0">
              <AdminProfileActions />
            </div>
          </div>
        </section>
      </main>
    
  )
}
