'use client'

import { GrainGradient } from '@paper-design/shaders-react'
import { ArrowLeft } from 'lucide-react'
import Link from 'next/link'
import { StatusGlyph } from '@/components/brand'
import { ATTENDANCE_STATUSES } from '@/lib/attendance'

export function AuthPanel() {
  return (
    <div className="relative flex min-h-[560px] overflow-hidden bg-black p-8 text-white sm:p-12 lg:min-h-0">
      <GrainGradient
        speed={0.6}
        scale={1}
        rotation={0}
        offsetX={0}
        offsetY={0}
        softness={0.5}
        intensity={0.5}
        noise={0.3}
        shape="corners"
        colors={['#FFFFFF', '#737373', '#262626', '#FFFFFF']}
        colorBack="#00000000"
        className="absolute inset-0 bg-black"
      />

      <div className="relative z-10 flex h-full w-full flex-col justify-between gap-16">
        <div>
          <Link
            href="/"
            className="focus-ring-inverse inline-flex items-center gap-2 font-mono text-xs uppercase tracking-widest text-white/80 hover:text-white hover:underline"
          >
            <ArrowLeft size={14} strokeWidth={1.5} aria-hidden="true" />
            Back to site
          </Link>
          <h2 className="mt-10 max-w-[620px] font-display text-5xl font-medium leading-[0.95] tracking-tighter sm:text-6xl lg:mt-16 xl:text-[5.5rem]">
            Mark it once,
            <br />
            <em>know it always.</em>
          </h2>
        </div>

        <ul className="inline-flex max-w-full flex-wrap self-start border border-white/40 bg-black/40 backdrop-blur-sm xl:mb-24">
          {ATTENDANCE_STATUSES.map((status) => (
            <li
              key={status.value}
              className="flex items-center gap-2.5 border-r border-white/25 px-4 py-3 font-mono text-xs uppercase tracking-widest text-white/85 last:border-r-0 xl:px-6 xl:text-sm"
            >
              <StatusGlyph status={status.value} />
              {status.label}
            </li>
          ))}
        </ul>
      </div>
    </div>
  )
}
