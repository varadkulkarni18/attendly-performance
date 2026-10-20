
'use client'

import { useEffect, useState, type ReactNode } from 'react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import {
  BookOpen,
  CalendarDays,
  ClipboardCheck,
  NotebookText,
  GraduationCap,
  LayoutDashboard,
  Menu,
  PanelLeftClose,
  PanelLeftOpen,
  Users,
  UserRound,
  X,
} from 'lucide-react'

export type DashboardRole = 'admin' | 'teacher' | 'student'

interface DashboardShellProps {
  role: DashboardRole
  name: string
  email: string
  children: ReactNode
}

const sidebarPreferences: Partial<Record<DashboardRole, boolean>> = {}

const ROLE_DETAILS: Record<DashboardRole, { label: string }> = {
  admin: { label: 'Administrator' },
  teacher: { label: 'Teacher' },
  student: { label: 'Student' },
}

const ROLE_HOME: Record<DashboardRole, string> = {
  admin: '/admin/dashboard',
  teacher: '/teacher/dashboard',
  student: '/student/dashboard',
}

const NAVIGATION = {
  admin: [
    { label: 'Overview', href: '/admin/dashboard', icon: LayoutDashboard },
    { label: 'Users', href: '/admin/users', icon: Users },
    { label: 'Classes & Groups', href: '/admin/classes', icon: GraduationCap },
    { label: 'Subjects', href: '/admin/subjects', icon: BookOpen },
    { label: 'Timetable', href: '/admin/timetable', icon: CalendarDays },
    { label: 'Attendance', href: '/admin/attendance', icon: ClipboardCheck },
    { label: 'Profile', href: '/admin/profile', icon: UserRound },
  ],
  teacher: [
    { label: 'Overview', href: '/teacher/dashboard', icon: LayoutDashboard },
    { label: 'My classes', href: '/teacher/classes', icon: BookOpen },
    { label: 'Attendance', href: '/teacher/attendance', icon: ClipboardCheck },
    { label: 'Timetable', href: '/teacher/timetable', icon: CalendarDays },
    { label: 'Notes & materials', href: '/teacher/notes', icon: NotebookText },
    { label: 'My profile', href: '/teacher/profile', icon: UserRound },
  ],
  student: [
    { label: 'Overview', href: '/student/dashboard', icon: LayoutDashboard },
    { label: 'My classes', href: '/student/classes', icon: BookOpen },
    { label: 'My attendance', href: '/student/attendance', icon: ClipboardCheck },
    { label: 'Timetable', href: '/student/timetable', icon: CalendarDays },
    { label: 'Notes & materials', href: '/student/notes', icon: NotebookText },
    { label: 'My profile', href: '/student/profile', icon: UserRound },
  ],
} satisfies Record<
  DashboardRole,
  { label: string; href: string; icon: typeof LayoutDashboard }[]
>

/** Compact attendance-inspired brand mark. */
function AttendlyMark() {
  return (
    <span
      aria-hidden="true"
      className="grid size-[25px] shrink-0 grid-cols-2 grid-rows-2 gap-[2px] border border-black p-[3px]"
    >
      {/* Present */}
      <span className="border border-black bg-black" />

      {/* Absent */}
      <span className="relative overflow-hidden border border-black">
        <span className="absolute left-[-2px] top-1/2 h-px w-[12px] -translate-y-1/2 -rotate-45 bg-black" />
      </span>

      {/* Late */}
      <span className="relative overflow-hidden border border-black">
        <span className="absolute inset-y-0 left-0 w-1/2 bg-black" />
      </span>

      {/* Excused */}
      <span className="flex items-center justify-center border border-black">
        <span className="size-[4px] border border-black" />
      </span>
    </span>
  )
}

function BrandWordmark({ compact }: { compact: boolean }) {
  return (
    <span
      className={`grid min-w-0 transition-[grid-template-columns,opacity] duration-200 ease-out ${
        compact ? 'grid-cols-[0fr] opacity-0' : 'grid-cols-[1fr] opacity-100'
      }`}
      aria-hidden={compact}
    >
      <span className="min-w-0 overflow-visible">
        <span
          className="block whitespace-nowrap text-[25px] leading-none tracking-[-0.055em] text-black"
          style={{ fontFamily: 'var(--font-display), Georgia, serif' }}
        >
          Attendly
        </span>
        <span className="mt-[5px] block whitespace-nowrap font-mono text-[9px] leading-[15px] tracking-[0.13em] text-neutral-500">
          LEARNING WORKSPACE
        </span>
      </span>
    </span>
  )
}

export function DashboardShell({
  role,
  name,
  email,
  children,
}: DashboardShellProps) {
  const pathname = usePathname()

  const [collapsed, setCollapsed] = useState(
    () => sidebarPreferences[role] ?? true,
  )
  const [mobileOpen, setMobileOpen] = useState(false)

  const navigation = NAVIGATION[role]
  const details = ROLE_DETAILS[role]
  const initials = name.trim().charAt(0).toUpperCase() || 'U'

  // Load the preference once. During client-side route transitions,
  // the in-memory preference prevents a collapse/reopen flash.
  useEffect(() => {
    if (sidebarPreferences[role] !== undefined) return

    try {
      const saved = window.localStorage.getItem(
        `attendly-sidebar-collapsed-${role}`,
      )

      if (saved !== null) {
        const value = saved === 'true'
        sidebarPreferences[role] = value
        setCollapsed(value)
      } else {
        sidebarPreferences[role] = collapsed
      }
    } catch {
      sidebarPreferences[role] = collapsed
    }
    // Initial restoration only.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [role])

  function toggleSidebar() {
    setCollapsed((current) => {
      const next = !current

      // Store before navigation can remount the shell.
      sidebarPreferences[role] = next

      try {
        window.localStorage.setItem(
          `attendly-sidebar-collapsed-${role}`,
          String(next),
        )
      } catch {
        // In-memory preference still works during this session.
      }

      return next
    })
  }

  // Mobile drawer state is separate from desktop collapsed state.
  useEffect(() => {
    setMobileOpen(false)
  }, [pathname])

  useEffect(() => {
    if (!mobileOpen) return

    const oldOverflow = document.body.style.overflow
    document.body.style.overflow = 'hidden'

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') setMobileOpen(false)
    }

    window.addEventListener('keydown', handleKeyDown)

    return () => {
      document.body.style.overflow = oldOverflow
      window.removeEventListener('keydown', handleKeyDown)
    }
  }, [mobileOpen])

  function SidebarContent({ mobile = false }: { mobile?: boolean }) {
    const compact = collapsed && !mobile

    const profileHref =
      role === 'teacher'
        ? '/teacher/profile'
        : role === 'student'
          ? '/student/profile'
          : '/admin/profile'

    return (
      <div className="flex h-full min-h-0 flex-col">
        <div
          className={`relative flex h-[76px] shrink-0 items-center border-b border-neutral-200 ${
            compact ? 'justify-center px-2' : 'justify-between px-5'
          }`}
        >
          <Link
            href={ROLE_HOME[role]}
            aria-label="Attendly home"
            title={compact ? 'Attendly home' : undefined}
            onClick={() => setMobileOpen(false)}
            className={`flex min-w-0 items-center ${
              compact ? 'justify-center' : 'gap-3'
            }`}
          >
            <AttendlyMark />
            <BrandWordmark compact={compact} />
          </Link>

          {!mobile && (
            <button
              type="button"
              onClick={toggleSidebar}
              aria-label={compact ? 'Expand sidebar' : 'Collapse sidebar'}
              aria-expanded={!compact}
              title={compact ? 'Expand sidebar' : 'Collapse sidebar'}
              className={`flex size-8 shrink-0 items-center justify-center text-neutral-600 transition-colors duration-150 hover:bg-neutral-100 hover:text-black ${
                compact
                  ? 'absolute bottom-[-16px] left-1/2 z-20 -translate-x-1/2 border border-neutral-200 bg-white shadow-sm'
                  : ''
              }`}
            >
              {compact ? (
                <PanelLeftOpen size={17} strokeWidth={1.7} />
              ) : (
                <PanelLeftClose size={17} strokeWidth={1.7} />
              )}
            </button>
          )}

          {mobile && (
            <button
              type="button"
              onClick={() => setMobileOpen(false)}
              aria-label="Close navigation"
              className="flex size-9 shrink-0 items-center justify-center hover:bg-neutral-100"
            >
              <X size={20} strokeWidth={1.6} />
            </button>
          )}
        </div>

        <div
          className={`min-h-0 flex-1 overflow-x-hidden overflow-y-auto py-7 ${
            compact ? 'px-2 pt-8' : 'px-[18px]'
          }`}
        >
          {!compact && (
            <p className="mb-4 h-4 whitespace-nowrap px-3 font-mono text-[10px] tracking-[0.25em] text-neutral-500">
              WORKSPACE
            </p>
          )}

          <nav aria-label="Main navigation" className="space-y-1">
            {navigation.map((item) => {
              const Icon = item.icon
              const active =
                pathname === item.href ||
                (item.href !== ROLE_HOME[role] &&
                  pathname.startsWith(`${item.href}/`))

              return (
                <Link
                  key={item.href}
                  href={item.href}
                  title={compact ? item.label : undefined}
                  aria-label={compact ? item.label : undefined}
                  aria-current={active ? 'page' : undefined}
                  onClick={() => setMobileOpen(false)}
                  className={`group relative flex h-12 min-w-0 items-center overflow-hidden transition-colors duration-150 ease-out ${
                    compact ? 'justify-center px-0' : 'gap-3 px-3'
                  } ${
                    active
                      ? 'bg-neutral-100 text-black'
                      : 'text-neutral-600 hover:bg-neutral-50 hover:text-black'
                  }`}
                >
                  {active && (
                    <span className="absolute inset-y-0 left-0 w-[2px] bg-black" />
                  )}

                  <Icon
                    size={19}
                    strokeWidth={active ? 1.9 : 1.6}
                    className="shrink-0"
                  />

                  {!compact && (
                    <span className="min-w-0 flex-1 truncate whitespace-nowrap text-[15px]">
                      {item.label}
                    </span>
                  )}

                  {active && !compact && (
                    <span className="size-[7px] shrink-0 bg-black" />
                  )}

                  {compact && (
                    <span className="pointer-events-none absolute left-full z-50 ml-3 whitespace-nowrap border border-neutral-200 bg-white px-3 py-2 font-mono text-[10px] tracking-wide text-black opacity-0 shadow-sm transition-opacity duration-150 group-hover:opacity-100 group-focus-visible:opacity-100">
                      {item.label}
                    </span>
                  )}
                </Link>
              )
            })}
          </nav>
        </div>

        <div
          className={`shrink-0 overflow-hidden border-t border-neutral-200 py-4 ${
            compact ? 'px-2' : 'px-[18px]'
          }`}
        >
          <Link
            href={
              role === 'teacher'
                ? '/teacher/profile'
                : role === 'student'
                  ? '/student/profile'
                  : '/admin/profile'
            }
            onClick={() => setMobileOpen(false)}
            title={compact ? `${name} — ${email}` : 'Open profile'}
            aria-label={compact ? 'Open profile' : undefined}
            className={`group flex min-w-0 items-center hover:bg-neutral-50 ${
              compact ? 'justify-center' : 'gap-3 px-2 py-1'
            }`}
          >
            <span className="flex size-[38px] shrink-0 items-center justify-center border border-neutral-300 font-serif text-lg">
              {initials}
            </span>

            {!compact && (
              <span className="min-w-0 flex-1">
                <span className="block truncate whitespace-nowrap font-serif text-base">
                  {name}
                </span>
                <span className="block truncate whitespace-nowrap text-xs text-neutral-500">
                  {email}
                </span>
              </span>
            )}
          </Link>

          {!compact && (
            <div className="mb-1 mt-4 border-t border-neutral-200 pt-3">
              <span className="whitespace-nowrap font-mono text-[10px] tracking-[0.2em] text-neutral-500">
                {details.label.toUpperCase()}
              </span>
            </div>
          )}
        </div>
      </div>
    )
  }

  return (
    <div
      className={`min-h-screen overflow-x-clip bg-white text-black md:grid ${
        collapsed
          ? 'md:grid-cols-[76px_minmax(0,1fr)]'
          : 'md:grid-cols-[248px_minmax(0,1fr)]'
      }`}
      style={{
        transition: 'grid-template-columns 200ms ease-out',
      }}
    >
      <aside
        className="sticky top-0 hidden h-screen min-h-0 w-full flex-col overflow-visible border-r border-neutral-200 bg-white md:flex"
      >
        <SidebarContent />
      </aside>

      <div className="min-w-0">
        <header className="sticky top-0 z-20 flex h-[60px] items-center gap-3 border-b border-neutral-200 bg-white/95 px-4 backdrop-blur-sm sm:px-5 md:hidden">
          <button
            type="button"
            onClick={() => setMobileOpen(true)}
            aria-label="Open navigation"
            aria-expanded={mobileOpen}
            className="flex size-9 shrink-0 items-center justify-center hover:bg-neutral-100"
          >
            <Menu size={21} strokeWidth={1.6} />
          </button>

          <Link
            href={ROLE_HOME[role]}
            aria-label="Attendly home"
            className="flex min-w-0 items-center gap-2.5"
          >
            <AttendlyMark />
            <span
              className="whitespace-nowrap text-[23px] leading-none tracking-[-0.055em] text-black"
              style={{ fontFamily: 'var(--font-display), Georgia, serif' }}
            >
              Attendly
            </span>
          </Link>

          <span className="ml-auto min-w-0 truncate text-right font-mono text-[9px] tracking-[0.1em] text-neutral-500">
            {details.label.toUpperCase()}
          </span>
        </header>

        <main className="min-w-0 px-4 py-6 sm:px-8 sm:py-8 md:px-10 md:py-12">
          {children}
        </main>
      </div>

      {mobileOpen && (
        <div className="fixed inset-0 z-50 md:hidden">
          <button
            type="button"
            aria-label="Close navigation overlay"
            onClick={() => setMobileOpen(false)}
            className="absolute inset-0 bg-black/35 animate-in fade-in duration-150"
          />

          <aside className="absolute inset-y-0 left-0 flex w-[min(300px,88vw)] animate-in slide-in-from-left flex-col border-r border-neutral-200 bg-white shadow-xl duration-150">
            <SidebarContent mobile />
          </aside>
        </div>
      )}
    </div>
  )
}
