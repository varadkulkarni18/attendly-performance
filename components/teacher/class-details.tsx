
'use client'

import { useActionState, useState } from 'react'
import {
  addStudent,
  removeStudent,
  saveAttendance,
  type ActionResult,
} from '@/app/actions/attendance'
import type { AttendanceStatus } from '@/lib/attendance'
import { ATTENDANCE_STATUSES } from '@/lib/attendance'
import { CalendarDays, Check, Trash2, UserPlus } from 'lucide-react'

interface Student {
  id: number
  studentName: string
  rollNo: string
  studentEmail: string | null
}

interface ClassDetailsProps {
  classId: number
  students: Student[]
  initialDate: string
  initialMarks: { enrollmentId: number; status: AttendanceStatus }[]
}

const emptyResult: ActionResult | null = null

export function ClassDetails({
  classId,
  students,
  initialDate,
  initialMarks,
}: ClassDetailsProps) {
  const [addState, addAction, adding] = useActionState(
    addStudent.bind(null, classId),
    emptyResult,
  )
  const [date, setDate] = useState(initialDate)
  const [marks, setMarks] = useState<Record<number, AttendanceStatus>>(
    Object.fromEntries(
      initialMarks.map((mark) => [mark.enrollmentId, mark.status]),
    ),
  )
  const [saveState, setSaveState] = useState<ActionResult | null>(null)
  const [saving, setSaving] = useState(false)
  const [removingId, setRemovingId] = useState<number | null>(null)
  const [removeState, setRemoveState] = useState<string | null>(null)

  function setStudentStatus(id: number, status: AttendanceStatus) {
    setMarks((current) => ({ ...current, [id]: status }))
    setSaveState(null)
  }

  async function handleSave() {
    setSaving(true)
    setSaveState(null)

    try {
      const selectedMarks = Object.entries(marks).map(([id, status]) => ({
        enrollmentId: Number(id),
        status,
      }))

      const result = await saveAttendance(classId, date, selectedMarks)
      setSaveState(result)
    } catch {
      setSaveState({
        ok: false,
        error: 'Unable to save attendance. Please try again.',
      })
    } finally {
      setSaving(false)
    }
  }

  async function handleRemove(student: Student) {
    const confirmed = window.confirm(
      `Remove ${student.studentName} (${student.rollNo}) from this class? Their attendance records will also be deleted.`,
    )
    if (!confirmed) return

    setRemovingId(student.id)
    setRemoveState(null)

    try {
      const result = await removeStudent(classId, student.id)

      if (result.ok) {
        window.location.reload()
      } else {
        setRemoveState(result.error)
      }
    } catch {
      setRemoveState('Unable to remove this student. Please try again.')
    } finally {
      setRemovingId(null)
    }
  }

  return (
    <div className="space-y-10">
      <section>
        <div className="flex items-end justify-between gap-4 border-b border-neutral-200 pb-4">
          <div>
            <p className="font-mono text-[10px] uppercase tracking-[0.2em] text-neutral-500">
              Class roster
            </p>
            <h2 className="mt-2 font-display text-2xl">
              Students
            </h2>
          </div>
          <span className="border border-neutral-300 px-3 py-2 font-mono text-xs">
            {students.length.toString().padStart(2, '0')} ENROLLED
          </span>
        </div>

        <form action={addAction} className="mt-5 border border-neutral-300 p-4 sm:p-5">
          <div className="mb-4 flex items-center gap-2">
            <UserPlus size={17} strokeWidth={1.6} />
            <h3 className="text-sm font-medium">Add a student</h3>
          </div>

          <div className="grid gap-3 sm:grid-cols-3">
            <input
              name="studentName"
              required
              maxLength={120}
              placeholder="Student full name"
              aria-label="Student full name"
              className="h-11 min-w-0 border border-neutral-300 px-3 text-sm outline-none focus:border-black"
            />
            <input
              name="rollNo"
              required
              maxLength={30}
              placeholder="Roll number"
              aria-label="Roll number"
              className="h-11 min-w-0 border border-neutral-300 px-3 text-sm outline-none focus:border-black"
            />
            <input
              name="studentEmail"
              type="email"
              maxLength={160}
              placeholder="Email (optional)"
              aria-label="Student email (optional)"
              className="h-11 min-w-0 border border-neutral-300 px-3 text-sm outline-none focus:border-black"
            />
          </div>

          {addState && (
            <p
              role="status"
              className={`mt-3 text-sm ${addState.ok ? 'text-neutral-600' : 'text-red-700'}`}
            >
              {addState.ok ? addState.message : addState.error}
            </p>
          )}

          <button
            type="submit"
            disabled={adding}
            className="mt-4 inline-flex h-10 items-center gap-2 bg-black px-4 text-sm text-white hover:bg-neutral-800 disabled:opacity-50"
          >
            <UserPlus size={15} />
            {adding ? 'Adding…' : 'Add student'}
          </button>
        </form>

        {removeState && (
          <p role="alert" className="mt-3 text-sm text-red-700">
            {removeState}
          </p>
        )}

        {students.length === 0 ? (
          <div className="border-b border-neutral-200 py-10 text-center">
            <p className="font-display text-xl">No students enrolled</p>
            <p className="mt-2 text-sm text-neutral-600">
              Add students above to start taking attendance.
            </p>
          </div>
        ) : (
          <div className="mt-5 overflow-x-auto border border-neutral-200">
            <table className="w-full min-w-[540px] text-left text-sm">
              <thead className="bg-neutral-50 font-mono text-[10px] uppercase tracking-wider text-neutral-500">
                <tr>
                  <th className="px-4 py-3 font-normal">Student</th>
                  <th className="px-4 py-3 font-normal">Roll number</th>
                  <th className="px-4 py-3 font-normal">Email</th>
                  <th className="px-4 py-3 text-right font-normal">Action</th>
                </tr>
              </thead>
              <tbody>
                {students.map((student) => (
                  <tr key={student.id} className="border-t border-neutral-200">
                    <td className="px-4 py-3 font-medium">{student.studentName}</td>
                    <td className="px-4 py-3">{student.rollNo}</td>
                    <td className="px-4 py-3 text-neutral-600">
                      {student.studentEmail || '—'}
                    </td>
                    <td className="px-4 py-3 text-right">
                      <button
                        type="button"
                        onClick={() => handleRemove(student)}
                        disabled={removingId === student.id}
                        aria-label={`Remove ${student.studentName}`}
                        title="Remove student"
                        className="inline-flex size-9 items-center justify-center text-neutral-500 hover:bg-neutral-100 hover:text-red-700 disabled:opacity-50"
                      >
                        <Trash2 size={16} />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>

      <section>
        <div className="flex flex-col gap-4 border-b border-neutral-200 pb-4 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <p className="font-mono text-[10px] uppercase tracking-[0.2em] text-neutral-500">
              Daily register
            </p>
            <h2 className="mt-2 font-display text-2xl">Mark attendance</h2>
            <p className="mt-2 text-sm text-neutral-600">
              Select a date and choose a status for each student.
            </p>
          </div>

          <label className="flex h-11 items-center gap-2 border border-neutral-300 px-3">
            <CalendarDays size={16} />
            <span className="sr-only">Attendance date</span>
            <input
              type="date"
              value={date}
              max={initialDate}
                          onChange={(event) => {
                              setDate(event.target.value)
                              setMarks({})
                              setSaveState(null)
                          }}
              className="min-w-0 bg-transparent text-sm outline-none"
            />
          </label>
        </div>

        {students.length === 0 ? (
          <p className="py-8 text-sm text-neutral-600">
            Enroll students before recording attendance.
          </p>
        ) : (
          <>
            <div className="mt-5 space-y-3">
              {students.map((student) => (
                <div
                  key={student.id}
                  className="flex flex-col gap-3 border border-neutral-200 p-4 sm:flex-row sm:items-center sm:justify-between"
                >
                  <div className="min-w-0">
                    <p className="truncate text-sm font-medium">
                      {student.studentName}
                    </p>
                    <p className="mt-1 font-mono text-[10px] text-neutral-500">
                      {student.rollNo}
                    </p>
                  </div>

                  <div className="flex flex-wrap gap-1.5">
                    {ATTENDANCE_STATUSES.map((status) => {
                      const selected = marks[student.id] === status.value

                      return (
                        <button
                          key={status.value}
                          type="button"
                          onClick={() => setStudentStatus(student.id, status.value)}
                          aria-pressed={selected}
                          title={status.label}
                          className={`min-w-[43px] border px-3 py-2 text-xs transition-colors ${
                            selected
                              ? 'border-black bg-black text-white'
                              : 'border-neutral-300 text-neutral-600 hover:border-black hover:text-black'
                          }`}
                        >
                          {status.short}
                        </button>
                      )
                    })}
                  </div>
                </div>
              ))}
            </div>

            <p className="mt-3 text-xs text-neutral-500">
              P = Present · A = Absent · L = Late · E = Excused. Select a status for every student before saving.
            </p>

            {saveState && (
              <p
                role="status"
                className={`mt-4 border px-3 py-3 text-sm ${
                  saveState.ok
                    ? 'border-neutral-300 text-neutral-700'
                    : 'border-red-300 text-red-700'
                }`}
              >
                {saveState.ok ? saveState.message : saveState.error}
              </p>
            )}

            <div className="mt-5 flex justify-end">
              <button
                type="button"
                onClick={handleSave}
                disabled={
                  saving ||
                  !date ||
                  students.some((student) => !marks[student.id])
                }
                className="inline-flex h-11 items-center gap-2 bg-black px-5 text-sm text-white hover:bg-neutral-800 disabled:cursor-not-allowed disabled:opacity-40"
              >
                <Check size={16} />
                {saving ? 'Saving attendance…' : 'Save attendance'}
              </button>
            </div>
          </>
        )}
      </section>
    </div>
  )
}
