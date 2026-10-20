import { Plus } from 'lucide-react'
import { SectionLabel } from '@/components/brand'

const faqs = [
  {
    q: 'How is the attendance percentage calculated?',
    a: 'Present plus Late, divided by eligible sessions, times 100. Excused sessions are excluded from eligible sessions. If a student has no eligible sessions yet, the percentage shows “—” instead of 0%.',
  },
  {
    q: 'Can a teacher edit attendance after saving?',
    a: 'Yes, for their own sessions. Editing a saved session asks for confirmation, and the session is clearly marked as edited.',
  },
  {
    q: 'What can students see?',
    a: 'Only their own records: overall percentage, subject-wise breakdown, recent sessions and the status of any correction requests they have raised.',
  },
  {
    q: 'What if a record is wrong?',
    a: 'Students raise a correction request with a reason. A teacher or admin reviews it, and any change is recorded with the reason given.',
  },
  {
    q: 'Can the 75% threshold be changed?',
    a: 'Yes. The admin sets the low-attendance threshold in settings, and every warning and report uses the new value.',
  },
  {
    q: 'Can I export reports?',
    a: 'Filtered reports — daily, monthly, subject-wise or student-wise — can be downloaded as CSV.',
  },
]

export function Faq() {
  return (
    <section id="faq" className="scroll-mt-16 border-t-4 border-black">
      <div className="mx-auto grid max-w-6xl gap-12 px-6 py-24 md:px-8 md:py-32 lg:grid-cols-[0.8fr_1.2fr] lg:px-12">
        <div>
          <SectionLabel index="06">FAQ</SectionLabel>
          <h2 className="mt-6 font-display text-4xl leading-[1.05] tracking-tight md:text-6xl">
            Questions, <em>answered.</em>
          </h2>
        </div>

        <div className="border-t-2 border-black">
          {faqs.map((item) => (
            <details key={item.q} className="group border-b border-black">
              <summary className="focus-ring flex cursor-pointer list-none items-center justify-between gap-6 py-6 font-display text-xl leading-snug md:text-2xl [&::-webkit-details-marker]:hidden">
                {item.q}
                <Plus
                  size={22}
                  strokeWidth={1.5}
                  aria-hidden="true"
                  className="shrink-0 transition-transform duration-100 group-open:rotate-45"
                />
              </summary>
              <p className="max-w-xl pb-6 text-lg leading-relaxed text-muted-foreground">{item.a}</p>
            </details>
          ))}
        </div>
      </div>
    </section>
  )
}
