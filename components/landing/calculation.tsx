import { SectionLabel } from '@/components/brand'
import { formatPercentage, summarizeCounts } from '@/lib/attendance'

const example = { present: 26, late: 2, absent: 4, excused: 1 }

export function Calculation() {
  const summary = summarizeCounts(example)

  return (
    <section className="texture-vertical-inverse bg-black text-white">
      <div className="mx-auto max-w-6xl px-6 py-24 md:px-8 md:py-32 lg:px-12">
        <SectionLabel index="03" inverse>
          The calculation
        </SectionLabel>

        <div className="mt-10 grid gap-14 lg:grid-cols-[1.2fr_0.8fr] lg:items-end">
          <div>
            <p className="font-display text-5xl leading-[1] tracking-tight md:text-7xl">
              (P + L) <span className="text-white/50">÷</span> Eligible
            </p>
            <div className="my-6 h-1 w-full bg-white" aria-hidden="true" />
            <p className="max-w-xl text-lg leading-relaxed text-white/75">
              Present and Late both count as attended. Excused sessions are removed from the total, so a medical
              leave never drags a student down. If there are no eligible sessions yet, you see “—”, not a false 0%.
            </p>
          </div>

          <dl className="grid grid-cols-2 border-l border-t border-white/40">
            {[
              ['Present', example.present],
              ['Late', example.late],
              ['Absent', example.absent],
              ['Excused', example.excused],
            ].map(([label, value]) => (
              <div key={label} className="border-b border-r border-white/40 p-5">
                <dt className="font-mono text-[11px] uppercase tracking-widest text-white/60">{label}</dt>
                <dd className="mt-2 font-display text-4xl leading-none">{value}</dd>
              </div>
            ))}
            <div className="col-span-2 border-b border-r border-white/40 bg-white p-5 text-black">
              
              <dt className="font-mono text-sm tracking-widest">
                <span className="inline-flex items-center gap-3 normal-case">
                  <span className="inline-flex flex-col items-center leading-tight">
                    <span>{summary.attended}</span>
                    <span className="my-1 h-px w-full bg-black" />
                    <span>{summary.eligible}</span>
                  </span>
                  <span>× 100</span>
                </span>
              </dt>

              <dd className="mt-2 font-display text-6xl leading-none tracking-tight">
                {formatPercentage(summary.percentage)}
              </dd>
            </div>
          </dl>
        </div>
      </div>
    </section>
  )
}
