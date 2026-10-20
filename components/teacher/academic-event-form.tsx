
'use client'

import { useActionState } from 'react'
import {
  createAcademicEvent,
  type CalendarActionResult,
} from '@/app/actions/academic-calendar'

const initialState: CalendarActionResult | null = null

function getLocalDate() {
  const now = new Date()
  const year = now.getFullYear()
  const month = String(now.getMonth() + 1).padStart(2, '0')
  const day = String(now.getDate()).padStart(2, '0')

  return `${year}-${month}-${day}`
}

export function AcademicEventForm() {
  const [state, action, pending] = useActionState(
    createAcademicEvent,
    initialState,
  )

  return (
    <section className="border border-neutral-300 bg-white p-5 sm:p-6">
      <div className="mb-5">
        <p className="font-mono text-[10px] uppercase tracking-[0.18em] text-neutral-500">
          Academic calendar
        </p>
        <h2 className="mt-2 font-display text-2xl">
          Add an event or holiday
        </h2>
        <p className="mt-2 max-w-xl text-sm leading-relaxed text-neutral-600">
          Add college events, examination notices, seminars, submissions, or
          holidays. Entries will also appear on the teacher overview.
        </p>
      </div>

      <form action={action} className="space-y-4">
        <div className="grid gap-4 sm:grid-cols-2">
          <div>
            <label htmlFor="calendar-date" className="mb-1.5 block text-sm">
              Date *
            </label>
            <input
              id="calendar-date"
              name="date"
              type="date"
              required
              defaultValue={getLocalDate()}
              className="h-11 w-full border border-neutral-300 bg-white px-3 text-sm outline-none focus:border-black"
            />
          </div>

          <div>
            <label htmlFor="calendar-type" className="mb-1.5 block text-sm">
              Entry type *
            </label>
            <select
              id="calendar-type"
              name="type"
              required
              defaultValue="event"
              className="h-11 w-full border border-neutral-300 bg-white px-3 text-sm outline-none focus:border-black"
            >
              <option value="event">Academic event / notice</option>
              <option value="holiday">College holiday</option>
            </select>
          </div>
        </div>

        <div>
          <label htmlFor="calendar-note" className="mb-1.5 block text-sm">
            Title or description *
          </label>
          <input
            id="calendar-note"
            name="note"
            required
            minLength={3}
            maxLength={160}
            placeholder="e.g. TY CSE project review"
            className="h-11 w-full border border-neutral-300 px-3 text-sm outline-none focus:border-black"
          />
        </div>

        {state && (
          <p
            role="status"
            className={`border px-3 py-2 text-sm ${
              state.ok
                ? 'border-neutral-300 text-neutral-800'
                : 'border-red-300 text-red-700'
            }`}
          >
            {state.ok ? state.message : state.error}
          </p>
        )}

        <button
          type="submit"
          disabled={pending}
          className="inline-flex h-11 items-center justify-center bg-black px-4 text-sm text-white hover:bg-neutral-800 disabled:cursor-not-allowed disabled:opacity-60"
        >
          {pending ? 'Saving…' : 'Add to calendar'}
        </button>
      </form>
    </section>
  )
}
