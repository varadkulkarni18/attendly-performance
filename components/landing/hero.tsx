import Link from 'next/link'
import { ArrowRight } from 'lucide-react'
import { RosterPreview } from './roster-preview'

export function Hero() {
  return (
    <section className="texture-lines overflow-hidden">
      <div className="mx-auto max-w-6xl px-6 pb-20 pt-16 md:px-8 md:pt-24 lg:px-12 lg:pb-28">
        <p className="font-mono text-xs uppercase tracking-[0.2em] text-muted-foreground">
          Attendance management for schools &amp; colleges
        </p>

        <h1 className="mt-6 font-display text-[18vw] font-medium leading-[0.85] tracking-tighter sm:text-8xl md:text-[8rem] lg:text-[10rem]">
          Present<span className="italic">.</span>
        </h1>

        <div className="mt-6 flex items-center gap-4" aria-hidden="true">
          <span className="h-1 flex-1 bg-black" />
          <span className="size-4 border-2 border-black" />
        </div>

        <div className="mt-12 grid gap-14 lg:grid-cols-[1fr_1.1fr] lg:gap-16">
          <div className="flex flex-col">
            <h2 className="font-display text-4xl leading-[1.05] tracking-tight text-balance md:text-5xl">
              Every class, every student, <em>accounted for.</em>
            </h2>
            <p className="mt-6 max-w-md text-lg leading-relaxed text-muted-foreground">
              Teachers mark attendance in seconds. Percentages calculate themselves. Admins see the whole
              institution, and students always know where they stand.
            </p>
            <div className="mt-10 flex flex-wrap items-center gap-6">
              <Link
                href="/signup"
                className="focus-ring group inline-flex items-center gap-3 border-2 border-black bg-black px-8 py-4 font-mono text-sm uppercase tracking-widest text-white transition-none hover:bg-white hover:text-black"
              >
                Sign up
                <ArrowRight size={18} strokeWidth={1.5} aria-hidden="true" />
              </Link>
              <a
                href="#product"
                className="focus-ring font-mono text-sm uppercase tracking-widest underline underline-offset-[6px] hover:decoration-2"
              >
                See how it works
              </a>
            </div>

            <dl className="mt-auto hidden grid-cols-3 border-t border-black pt-6 lg:grid">
              {[
                ['Roles', 'Admin · Teacher · Student'],
                ['Statuses', 'P · A · L · E'],
                ['Threshold', 'Default 75%'],
              ].map(([term, detail]) => (
                <div key={term} className="border-r border-border-light pr-4 last:border-r-0 [&:not(:first-child)]:pl-4">
                  <dt className="font-mono text-[11px] uppercase tracking-widest text-muted-foreground">{term}</dt>
                  <dd className="mt-1 text-sm">{detail}</dd>
                </div>
              ))}
            </dl>
          </div>

          <div>
            <RosterPreview />
            <p className="mt-3 font-mono text-[11px] uppercase tracking-widest text-muted-foreground">
              Interactive — change a status and watch the percentage update.
            </p>
          </div>
        </div>
      </div>
    </section>
  )
}
