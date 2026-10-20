
'use client'

import { useMemo, useState } from 'react'
import { Search, Users, X } from 'lucide-react'

type Account = {
  id: string
  name: string
  email: string
  role: string
  emailVerified: boolean
  createdAt: Date
}

type RoleFilter = 'all' | 'teacher' | 'student' | 'admin'

function formatDate(value: Date) {
  return new Intl.DateTimeFormat('en-IN', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  }).format(new Date(value))
}

function roleLabel(role: string) {
  return role.charAt(0).toUpperCase() + role.slice(1)
}

export function UsersTable({
  accounts,
}: {
  accounts: Account[]
}) {
  const [query, setQuery] = useState('')
  const [role, setRole] = useState<RoleFilter>('all')

  const filteredAccounts = useMemo(() => {
    const search = query.trim().toLowerCase()

    return accounts.filter((account) => {
      const matchesRole =
        role === 'all' || account.role === role

      const matchesSearch =
        !search ||
        account.name.toLowerCase().includes(search) ||
        account.email.toLowerCase().includes(search)

      return matchesRole && matchesSearch
    })
  }, [accounts, query, role])

  return (
    <div className="border border-neutral-200 bg-white">
      <div className="flex flex-col gap-3 border-b border-neutral-200 p-4 sm:p-5">
        <div className="flex flex-col gap-3 sm:flex-row">
          <label className="relative block flex-1">
            <span className="sr-only">Search accounts</span>
            <Search
              size={16}
              className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-neutral-400"
            />
            <input
              type="search"
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder="Search by name or email..."
              className="h-11 w-full border border-neutral-200 bg-white pl-9 pr-9 text-sm outline-none transition-colors placeholder:text-neutral-400 focus:border-black"
            />
            {query && (
              <button
                type="button"
                onClick={() => setQuery('')}
                aria-label="Clear search"
                className="absolute right-3 top-1/2 -translate-y-1/2 text-neutral-400 hover:text-black"
              >
                <X size={15} />
              </button>
            )}
          </label>

          <label className="block sm:w-48">
            <span className="sr-only">Filter by role</span>
            <select
              value={role}
              onChange={(event) =>
                setRole(event.target.value as RoleFilter)
              }
              className="h-11 w-full border border-neutral-200 bg-white px-3 text-sm outline-none focus:border-black"
            >
              <option value="all">All roles</option>
              <option value="teacher">Teachers</option>
              <option value="student">Students</option>
              <option value="admin">Administrators</option>
            </select>
          </label>
        </div>

        <p className="text-xs text-neutral-500" aria-live="polite">
          Showing {filteredAccounts.length} of {accounts.length} accounts
        </p>
      </div>

      {filteredAccounts.length === 0 ? (
        <div className="flex flex-col items-center px-5 py-16 text-center">
          <Users size={25} className="text-neutral-400" />
          <h3 className="mt-4 text-sm font-medium">
            No accounts found
          </h3>
          <p className="mt-1 max-w-sm text-sm text-neutral-500">
            Try a different name, email address, or role filter.
          </p>
          {(query || role !== 'all') && (
            <button
              type="button"
              onClick={() => {
                setQuery('')
                setRole('all')
              }}
              className="mt-4 border border-neutral-300 px-4 py-2 text-sm hover:border-black"
            >
              Clear filters
            </button>
          )}
        </div>
      ) : (
        <>
          <div className="divide-y divide-neutral-200 md:hidden">
            {filteredAccounts.map((account) => (
              <article key={account.id} className="space-y-3 p-4">
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <p className="break-words text-sm font-medium">
                      {account.name}
                    </p>
                    <p className="mt-1 break-all text-xs text-neutral-500">
                      {account.email}
                    </p>
                  </div>
                  <RoleBadge role={account.role} />
                </div>

                <div className="flex flex-wrap items-center justify-between gap-2 text-xs text-neutral-500">
                  <span>{formatDate(account.createdAt)}</span>
                  <VerificationBadge verified={true} />
                </div>
              </article>
            ))}
          </div>

          <div className="hidden overflow-x-auto md:block">
            <table className="w-full text-left">
              <thead>
                <tr className="border-b border-neutral-200 bg-neutral-50">
                  <th className="px-5 py-3 font-mono text-[10px] font-normal uppercase tracking-[0.15em] text-neutral-500">
                    Account
                  </th>
                  <th className="px-5 py-3 font-mono text-[10px] font-normal uppercase tracking-[0.15em] text-neutral-500">
                    Role
                  </th>
                  <th className="px-5 py-3 font-mono text-[10px] font-normal uppercase tracking-[0.15em] text-neutral-500">
                    Email status
                  </th>
                  <th className="px-5 py-3 font-mono text-[10px] font-normal uppercase tracking-[0.15em] text-neutral-500">
                    Registered
                  </th>
                </tr>
              </thead>

              <tbody className="divide-y divide-neutral-100">
                {filteredAccounts.map((account) => (
                  <tr
                    key={account.id}
                    className="transition-colors hover:bg-neutral-50"
                  >
                    <td className="px-5 py-4">
                      <p className="text-sm font-medium">
                        {account.name}
                      </p>
                      <p className="mt-1 text-xs text-neutral-500">
                        {account.email}
                      </p>
                    </td>
                    <td className="px-5 py-4">
                      <RoleBadge role={account.role} />
                    </td>
                    <td className="px-5 py-4">
                      <VerificationBadge verified={account.emailVerified} />
                    </td>
                    <td className="whitespace-nowrap px-5 py-4 text-sm text-neutral-500">
                      {formatDate(account.createdAt)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </>
      )}

      <footer className="border-t border-neutral-200 bg-neutral-50 px-4 py-3 text-xs leading-5 text-neutral-500 sm:px-5">
        Account creation and role changes should be performed through
        authorized administrator actions.
      </footer>
    </div>
  )
}

function RoleBadge({ role }: { role: string }) {
  return (
    <span className="inline-flex items-center border border-neutral-200 px-2 py-1 text-[10px] uppercase tracking-[0.1em] text-neutral-700">
      {roleLabel(role)}
    </span>
  )
}


function VerificationBadge({ verified }: { verified: boolean }) {
  return (
    <span className="inline-flex items-center gap-1.5 text-xs text-neutral-700">
      <span className="h-1.5 w-1.5 rounded-full bg-neutral-800" />
      Verified
    </span>
  )
}

