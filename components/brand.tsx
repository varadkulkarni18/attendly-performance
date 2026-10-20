import Link from 'next/link'
import type { AttendanceStatus } from '@/lib/attendance'
import { cn } from '@/lib/utils'

export const PRODUCT_NAME = 'Attendly'

export function AttendlyMark({
  className,
}: {
  className?: string
}) {
  return (
    <span
      aria-hidden="true"
      className={cn(
        'grid size-[25px] shrink-0 grid-cols-2 grid-rows-2 gap-[2px] border border-black p-[3px]',
        className,
      )}
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

export function Wordmark({
  inverse = false,
  className,
}: {
  inverse?: boolean
  className?: string
}) {
  return (
    <Link
      href="/#main"
      className={cn(
        'inline-flex items-center gap-2.5 font-display text-2xl font-semibold tracking-tight',
        inverse ? 'focus-ring-inverse' : 'focus-ring',
        className,
      )}
    >
      <AttendlyMark
        className={inverse ? 'border-white' : undefined}
      />
      {PRODUCT_NAME}
    </Link>
  )
}

export function StatusGlyph({
  status,
  className,
}: {
  status: AttendanceStatus
  className?: string
}) {
  return (
    <span
      aria-hidden="true"
      className={cn(
        'relative inline-block size-3 shrink-0 border border-current',
        className,
      )}
    >
      {status === 'present' && (
        <span className="absolute inset-0 bg-current" />
      )}
      {status === 'late' && (
        <span className="absolute inset-y-0 left-0 w-1/2 bg-current" />
      )}
      {status === 'absent' && (
        <span className="absolute left-1/2 top-1/2 h-px w-[140%] -translate-x-1/2 -translate-y-1/2 -rotate-45 bg-current" />
      )}
      {status === 'excused' && (
        <span className="absolute inset-[3px] border border-dashed border-current" />
      )}
    </span>
  )
}

export function SectionLabel({
  index,
  children,
  inverse = false,
}: {
  index: string
  children: React.ReactNode
  inverse?: boolean
}) {
  return (
    <p
      className={cn(
        'flex items-center gap-3 font-mono text-xs uppercase tracking-[0.2em]',
        inverse ? 'text-white/70' : 'text-muted-foreground',
      )}
    >
      <span
        className={cn(
          'border px-1.5 py-0.5',
          inverse
            ? 'border-white/60 text-white'
            : 'border-black text-black',
        )}
      >
        {index}
      </span>
      {children}
    </p>
  )
}