import { BellRing, BookOpenCheck, Calculator, ClipboardCheck, FileBarChart, FolderTree, UserRound } from 'lucide-react'
import { SectionLabel } from '@/components/brand'

const features = [
  {
    icon: ClipboardCheck,
    title: 'One-tap marking',
    body: 'Pick class, subject and period. Mark all present, then change only the exceptions.',
  },
  {
    icon: FolderTree,
    title: 'Classes & subjects',
    body: 'Sections, academic years and teacher assignments kept in one tidy structure.',
  },
  {
    icon: Calculator,
    title: 'Automatic percentages',
    body: 'Late counts as attended, excused is left out. No spreadsheet formulas to break.',
  },
  {
    icon: FileBarChart,
    title: 'Reports that agree',
    body: 'Daily, monthly, subject-wise and student-wise — all drawn from the same records. Export to CSV.',
  },
  {
    icon: UserRound,
    title: 'Student self-service',
    body: 'Students check their own record any time, instead of asking the office.',
  },
  {
    icon: BellRing,
    title: 'Low-attendance alerts',
    body: 'A configurable threshold — 75% by default — flags students and classes early.',
  },
  {
    icon: BookOpenCheck,
    title: 'Controlled corrections',
    body: 'Changes need a reason and a confirmation, and every correction stays on the record.',
  },
]

export function Features() {
  return (
    <section id="features" className="scroll-mt-16 border-t-4 border-black">
      <div className="mx-auto max-w-6xl px-6 py-24 md:px-8 md:py-32 lg:px-12">
        <div className="flex flex-col justify-between gap-6 md:flex-row md:items-end">
          <div>
            <SectionLabel index="02">Features</SectionLabel>
            <h2 className="mt-6 max-w-2xl font-display text-4xl leading-[1.05] tracking-tight md:text-6xl">
              Less paperwork. <em>Fewer mistakes.</em>
            </h2>
          </div>
          <p className="max-w-xs text-lg leading-relaxed text-muted-foreground">
            Everything a register does, without the arithmetic.
          </p>
        </div>

        <ul className="mt-16 grid border-l border-t border-black sm:grid-cols-2 lg:grid-cols-4">
          {features.map(({ icon: Icon, title, body }, index) => (
            <li
              key={title}
              className="group border-b border-r border-black bg-white p-8 transition-colors duration-100 hover:bg-black hover:text-white"
            >
              <div className="flex items-start justify-between">
                <span className="grid size-12 place-items-center rounded-full border border-current">
                  <Icon size={20} strokeWidth={1.5} aria-hidden="true" />
                </span>
                <span className="font-mono text-xs text-muted-foreground group-hover:text-white/60">
                  {String(index + 1).padStart(2, '0')}
                </span>
              </div>
              <h3 className="mt-10 font-display text-2xl leading-tight">{title}</h3>
              <p className="mt-3 leading-relaxed text-muted-foreground group-hover:text-white/75">{body}</p>
            </li>
          ))}
          <li className="flex flex-col justify-end border-b border-r border-black bg-black p-8 text-white">
            <p className="font-display text-3xl italic leading-tight">“Did they come to class?”</p>
            <p className="mt-3 font-mono text-xs uppercase tracking-widest text-white/60">
              The only question it needs to answer.
            </p>
          </li>
        </ul>
      </div>
    </section>
  )
}
