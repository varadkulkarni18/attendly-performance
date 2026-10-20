import { SectionLabel } from '@/components/brand'

const steps = [
  { title: 'Set up the structure', body: 'Admin adds classes, sections, subjects and the current academic year.' },
  { title: 'Assign teachers', body: 'Each teacher is linked to the classes and subjects they actually teach.' },
  { title: 'Mark each session', body: 'Teachers open today’s period, mark the roster and save. Edits need a reason.' },
  { title: 'Review the reports', body: 'Percentages update everywhere at once — for admins, teachers and students.' },
]

export function HowItWorks() {
  return (
    <section id="how-it-works" className="texture-diagonal scroll-mt-16 border-t-4 border-black">
      <div className="mx-auto max-w-6xl px-6 py-24 md:px-8 md:py-32 lg:px-12">
        <SectionLabel index="04">How it works</SectionLabel>
        <h2 className="mt-6 max-w-2xl font-display text-4xl leading-[1.05] tracking-tight md:text-6xl">
          From timetable to report in four steps.
        </h2>

        <ol className="mt-16 border-t-2 border-black">
          {steps.map((step, index) => (
            <li
              key={step.title}
              className="group grid gap-4 border-b border-black bg-white/80 py-8 transition-colors duration-100 hover:bg-black hover:text-white md:grid-cols-[8rem_1fr_1.2fr] md:items-baseline md:gap-8 md:px-6"
            >
              <span className="font-display text-6xl leading-none italic md:text-7xl">{index + 1}</span>
              <h3 className="font-display text-2xl md:text-3xl">{step.title}</h3>
              <p className="text-lg leading-relaxed text-muted-foreground group-hover:text-white/75">{step.body}</p>
            </li>
          ))}
        </ol>
      </div>
    </section>
  )
}
