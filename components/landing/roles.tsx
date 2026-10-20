import { SectionLabel } from '@/components/brand'

const roles = [
  {
    role: 'Admin',
    lead: 'Runs the structure.',
    points: [
      'Manage students, teachers, classes and subjects',
      'Compare attendance across the institution',
      'Approve corrections and set the threshold',
    ],
  },
  {
    role: 'Teacher',
    lead: 'Marks the register.',
    points: [
      'See today’s assigned periods at a glance',
      'Mark a full roster in under a minute',
      'Reports limited to their own classes',
    ],
  },
  {
    role: 'Student',
    lead: 'Knows where they stand.',
    points: [
      'Overall and subject-wise percentage',
      'Early warning below the threshold',
      'Request a correction — never edit records',
    ],
  },
]

export function Roles() {
  return (
    <section id="roles" className="scroll-mt-16 border-t-4 border-black">
      <div className="mx-auto max-w-6xl px-6 py-24 md:px-8 md:py-32 lg:px-12">
        <SectionLabel index="05">Built for every role</SectionLabel>
        <h2 className="mt-6 max-w-2xl font-display text-4xl leading-[1.05] tracking-tight md:text-6xl">
          Three people. <em>One register.</em>
        </h2>

        <div className="mt-16 grid border-2 border-black md:grid-cols-3">
          {roles.map((r, index) => (
            <article
              key={r.role}
              className={
                index === 1
                  ? 'bg-black p-8 text-white md:-my-6 md:py-14'
                  : 'border-black bg-white p-8 max-md:border-b-2 md:[&:last-child]:border-l-0'
              }
            >
              <p
                className={
                  index === 1
                    ? 'font-mono text-xs uppercase tracking-widest text-white/60'
                    : 'font-mono text-xs uppercase tracking-widest text-muted-foreground'
                }
              >
                {String(index + 1).padStart(2, '0')} / {r.role}
              </p>
              <h3 className="mt-6 font-display text-4xl leading-none tracking-tight md:text-5xl">{r.role}</h3>
              <p className="mt-3 font-display text-xl italic">{r.lead}</p>
              <ul className={index === 1 ? 'mt-8 border-t border-white/40' : 'mt-8 border-t border-black'}>
                {r.points.map((point) => (
                  <li
                    key={point}
                    className={
                      index === 1
                        ? 'border-b border-white/20 py-3 leading-relaxed'
                        : 'border-b border-border-light py-3 leading-relaxed'
                    }
                  >
                    {point}
                  </li>
                ))}
              </ul>
            </article>
          ))}
        </div>
      </div>
    </section>
  )
}
