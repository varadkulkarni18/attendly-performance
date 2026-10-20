
'use client'

import { useActionState, useState } from 'react'
import { createClass, type ActionResult } from '@/app/actions/attendance'
import { Plus, X } from 'lucide-react'

const initialState: ActionResult | null = null

export function CreateClassForm() {
  const [state, action, pending] = useActionState(createClass, initialState)
  const [open, setOpen] = useState(false)

  if (!open) {
    return (
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="inline-flex h-11 items-center gap-2 bg-black px-4 text-sm text-white hover:bg-neutral-800"
      >
        <Plus size={16} />
        Create class
      </button>
    )
  }

  return (
    <section className="border border-neutral-300 bg-white p-5 sm:p-6">
      <div className="mb-5 flex items-start justify-between gap-4">
        <div>
          <p className="font-mono text-[10px] uppercase tracking-[0.2em] text-neutral-500">
            New class
          </p>
          <h2 className="mt-2 font-display text-2xl">Create a class</h2>
        </div>

        <button
          type="button"
          onClick={() => setOpen(false)}
          aria-label="Close create class form"
          className="flex size-9 items-center justify-center hover:bg-neutral-100"
        >
          <X size={18} />
        </button>
      </div>

      <form action={action} className="space-y-4">
        <div>
          <label htmlFor="class-name" className="mb-1.5 block text-sm">
            Subject or class name *
          </label>
          <input
            id="class-name"
            name="name"
            required
            maxLength={120}
            placeholder="e.g. Database Management Systems"
            className="h-11 w-full border border-neutral-300 px-3 text-sm outline-none focus:border-black"
          />
        </div>

        <div className="grid gap-4 sm:grid-cols-2">
          <div>
            <label htmlFor="class-code" className="mb-1.5 block text-sm">
              Class code *
            </label>
            <input
              id="class-code"
              name="code"
              required
              maxLength={20}
              placeholder="e.g. DBMS-01"
              className="h-11 w-full border border-neutral-300 px-3 text-sm uppercase outline-none focus:border-black"
            />
          </div>

          <div>
            <label htmlFor="class-section" className="mb-1.5 block text-sm">
              Section (optional)
            </label>
            <input
              id="class-section"
              name="section"
              maxLength={40}
              placeholder="e.g. TY-CSE-A"
              className="h-11 w-full border border-neutral-300 px-3 text-sm outline-none focus:border-black"
            />
          </div>
        </div>

        {state && (
          <p
            role="status"
            className={`border px-3 py-2 text-sm ${
              state.ok
                ? 'border-neutral-300 text-neutral-700'
                : 'border-red-300 text-red-700'
            }`}
          >
            {state.ok ? state.message ?? 'Class created.' : state.error}
          </p>
        )}

        <div className="flex flex-wrap gap-3 pt-1">
          <button
            type="submit"
            disabled={pending}
            className="inline-flex h-11 items-center justify-center bg-black px-5 text-sm text-white hover:bg-neutral-800 disabled:opacity-50"
          >
            {pending ? 'Creating…' : 'Create class'}
          </button>

          <button
            type="button"
            onClick={() => setOpen(false)}
            className="h-11 border border-neutral-300 px-4 text-sm hover:bg-neutral-50"
          >
            Cancel
          </button>
        </div>
      </form>
    </section>
  )
}
