'use client'

import { useActionState, useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { Plus, Trash2, X, AlertTriangle } from 'lucide-react'
import {
  createSubject,
  deleteSubject,
  type SubjectActionState,
} from '@/app/actions/subjects'

type Teacher = {
  id: string
  name: string
  email: string
}

type Group = {
  id: number
  name: string
  academicYear: string
  section: string
}

type Subject = {
  subjectName: string
  subjectCode: string
}

const initialState: SubjectActionState = { ok: false, message: '' }

const fieldClass =
  'h-10 w-full border border-neutral-200 bg-white px-3 text-sm outline-none focus:border-neutral-500'

export function AddSubjectButton({
  teachers,
  groups,
}: {
  teachers: Teacher[]
  groups: Group[]
}) {
  const [open, setOpen] = useState(false)
  const [state, action, pending] = useActionState(createSubject, initialState)
  const router = useRouter()

  useEffect(() => {
    if (state.ok) {
      setOpen(false)
      router.refresh()
    }
  }, [state, router])

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="inline-flex h-10 shrink-0 items-center justify-center gap-2 bg-neutral-950 px-4 text-sm text-white transition hover:bg-neutral-800"
      >
        <Plus size={16} />
        Add subject
      </button>

      {open && (
        <div className="fixed inset-0 z-50 flex items-center justify-center overflow-y-auto bg-black/40 p-4">
          <div
            role="dialog"
            aria-modal="true"
            aria-labelledby="add-subject-title"
            className="my-auto w-full max-w-xl border border-neutral-200 bg-white shadow-xl"
          >
            <div className="flex items-start justify-between border-b border-neutral-200 p-5">
              <div>
                <p className="font-mono text-[10px] uppercase tracking-[0.16em] text-neutral-500">
                  Academic directory
                </p>
                <h2
                  id="add-subject-title"
                  className="mt-2 font-display text-2xl text-neutral-950"
                >
                  Add subject
                </h2>
                <p className="mt-1 text-sm text-neutral-600">
                  Assign a subject to a class group and timetable slot.
                </p>
              </div>
              <button
                type="button"
                onClick={() => setOpen(false)}
                aria-label="Close dialog"
                className="p-1 text-neutral-500 hover:text-neutral-950"
              >
                <X size={19} />
              </button>
            </div>

            <form action={action} className="space-y-4 p-5">
              <div className="grid gap-4 sm:grid-cols-2">
                <label className="block text-sm text-neutral-700">
                  Subject name
                  <input
                    name="subjectName"
                    required
                    maxLength={150}
                    placeholder="e.g. Database Management Systems"
                    className={`${fieldClass} mt-1.5`}
                  />
                </label>
                <label className="block text-sm text-neutral-700">
                  Subject code
                  <input
                    name="subjectCode"
                    required
                    maxLength={30}
                    placeholder="e.g. DBMS"
                    className={`${fieldClass} mt-1.5 uppercase`}
                  />
                </label>
              </div>

              <label className="block text-sm text-neutral-700">
                Class group
                <select
                  name="classGroupId"
                  required
                  defaultValue=""
                  className={`${fieldClass} mt-1.5`}
                >
                  <option value="" disabled>
                    Select class group
                  </option>
                  {groups.map((group) => (
                    <option key={group.id} value={group.id}>
                      {group.name}
                      {group.section ? ` · ${group.section}` : ''}
                      {group.academicYear ? ` · ${group.academicYear}` : ''}
                    </option>
                  ))}
                </select>
              </label>

              <label className="block text-sm text-neutral-700">
                Assigned teacher
                <select
                  name="teacherId"
                  required
                  defaultValue=""
                  className={`${fieldClass} mt-1.5`}
                >
                  <option value="" disabled>
                    Select teacher
                  </option>
                  {teachers.map((teacher) => (
                    <option key={teacher.id} value={teacher.id}>
                      {teacher.name} ({teacher.email})
                    </option>
                  ))}
                </select>
              </label>

              <div className="grid gap-4 sm:grid-cols-3">
                <label className="block text-sm text-neutral-700">
                  Day
                  <select
                    name="dayOfWeek"
                    defaultValue="1"
                    required
                    className={`${fieldClass} mt-1.5`}
                  >
                    <option value="1">Monday</option>
                    <option value="2">Tuesday</option>
                    <option value="3">Wednesday</option>
                    <option value="4">Thursday</option>
                    <option value="5">Friday</option>
                    <option value="6">Saturday</option>
                  </select>
                </label>
                <label className="block text-sm text-neutral-700">
                  Start time
                  <input
                    type="time"
                    name="startTime"
                    required
                    defaultValue="09:00"
                    className={`${fieldClass} mt-1.5`}
                  />
                </label>
                <label className="block text-sm text-neutral-700">
                  End time
                  <input
                    type="time"
                    name="endTime"
                    required
                    defaultValue="10:00"
                    className={`${fieldClass} mt-1.5`}
                  />
                </label>
              </div>

              <label className="block text-sm text-neutral-700">
                Room (optional)
                <input
                  name="room"
                  maxLength={80}
                  placeholder="e.g. Room 204 or Lab 1"
                  className={`${fieldClass} mt-1.5`}
                />
              </label>

              {state.message && (
                <p
                  role="status"
                  className={`text-sm ${state.ok ? 'text-emerald-700' : 'text-red-700'}`}
                >
                  {state.message}
                </p>
              )}

              <div className="flex justify-end gap-3 border-t border-neutral-200 pt-4">
                <button
                  type="button"
                  onClick={() => setOpen(false)}
                  className="h-10 border border-neutral-300 px-4 text-sm text-neutral-700 hover:bg-neutral-50"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={pending || groups.length === 0 || teachers.length === 0}
                  className="h-10 bg-neutral-950 px-5 text-sm text-white hover:bg-neutral-800 disabled:cursor-not-allowed disabled:opacity-50"
                >
                  {pending ? 'Adding…' : 'Add assignment'}
                </button>
              </div>

              {(groups.length === 0 || teachers.length === 0) && (
                <p className="text-xs text-amber-700">
                  {groups.length === 0
                    ? 'Create a class group before adding a subject.'
                    : 'Add a teacher account before assigning a subject.'}
                </p>
              )}
            </form>
          </div>
        </div>
      )}
    </>
  )
}

export function DeleteSubjectButton({ subject }: { subject: Subject }) {
  const [state, action, pending] = useActionState(deleteSubject, initialState)
  const [open, setOpen] = useState(false)
  const router = useRouter()

  useEffect(() => {
    if (state.ok) {
      setOpen(false)
      router.refresh()
    }
  }, [state, router])

  const needsHistoryConfirmation = state.requiresConfirmation === true

  return (
    <>
      <button
        type="button"
        onClick={() => {
          setOpen(true)
        }}
        title={`Delete ${subject.subjectName}`}
        aria-label={`Delete ${subject.subjectName}`}
        className="inline-flex h-9 items-center justify-center gap-2 border border-neutral-200 px-3 text-xs text-neutral-600 transition hover:border-red-200 hover:bg-red-50 hover:text-red-700"
      >
        <Trash2 size={14} />
        Delete
      </button>

      {open && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
          <div
            role="dialog"
            aria-modal="true"
            aria-labelledby="delete-subject-title"
            className="w-full max-w-md border border-neutral-200 bg-white p-5 shadow-xl"
          >
            <div className="flex items-start gap-3">
              <div className="flex h-10 w-10 shrink-0 items-center justify-center border border-red-100 bg-red-50 text-red-700">
                <AlertTriangle size={19} />
              </div>
              <div>
                <h2
                  id="delete-subject-title"
                  className="font-display text-xl text-neutral-950"
                >
                  {needsHistoryConfirmation
                    ? 'Attendance history found'
                    : 'Delete this subject?'}
                </h2>
                <p className="mt-2 break-words text-sm leading-6 text-neutral-600">
                  {needsHistoryConfirmation
                    ? `Attendance sessions exist for ${subject.subjectName}. Continuing will deactivate its timetable assignments, not erase the attendance history.`
                    : `Delete ${subject.subjectName} (${subject.subjectCode}) and its timetable assignments? This cannot be undone.`}
                </p>
              </div>
            </div>

            {state.message && (
              <p
                role="alert"
                className="mt-4 border border-amber-200 bg-amber-50 p-3 text-sm leading-5 text-amber-900"
              >
                {state.message}
              </p>
            )}

            <form action={action} className="mt-5">
              <input type="hidden" name="subjectName" value={subject.subjectName} />
              <input type="hidden" name="subjectCode" value={subject.subjectCode} />
              <input
                type="hidden"
                name="confirmWithHistory"
                value={needsHistoryConfirmation ? 'true' : 'false'}
              />

              <div className="flex justify-end gap-3">
                <button
                  type="button"
                  onClick={() => {
                    setOpen(false)
                  }}
                  className="h-10 border border-neutral-300 px-4 text-sm text-neutral-700 hover:bg-neutral-50"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={pending}
                  className="h-10 bg-red-700 px-4 text-sm text-white hover:bg-red-800 disabled:opacity-50"
                >
                  {pending
                    ? 'Processing…'
                    : needsHistoryConfirmation
                      ? 'Deactivate and preserve history'
                      : 'Confirm delete'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </>
  )
}