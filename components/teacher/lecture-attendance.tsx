'use client'

import { useEffect, useMemo, useState } from 'react'
import { useRouter } from 'next/navigation'
import { Check, CheckCheck, Users } from 'lucide-react'
import {
  saveLectureAttendance,
  type ActionResult,
} from '@/app/actions/attendance'
import type { AttendanceStatus } from '@/lib/attendance'
import { ATTENDANCE_STATUSES } from '@/lib/attendance'

interface Student {
  id: number
  studentName: string
  rollNo: string
}

interface Props {
  entryId: number
  students: Student[]
  initialDate: string
  maxDate: string
  initialMarks: {
    groupStudentId: number
    status: AttendanceStatus
  }[]
  blockedReason?: string | null
}

type Marks = Record<number, AttendanceStatus>

function marksFromRows(rows: Props['initialMarks']): Marks {
  return Object.fromEntries(
    rows.map((mark) => [mark.groupStudentId, mark.status]),
  )
}

function sameMarks(
  left: Marks,
  right: Marks,
  studentIds: number[],
) {
  return (
    studentIds.every((id) => left[id] === right[id]) &&
    Object.keys(left).length === Object.keys(right).length
  )
}

export function LectureAttendance({
  entryId,
  students,
  initialDate,
  initialMarks,
  blockedReason,
}: Props) {
  const router = useRouter()

  const studentIds = useMemo(
    () => students.map((student) => student.id),
    [students],
  )

  const initial = useMemo(
    () => marksFromRows(initialMarks),
    [initialMarks],
  )

  // The date comes from the selected lecture URL.
  // No second date picker is needed on this page.
  const date = initialDate

  const [marks, setMarks] = useState<Marks>(initial)
  const [savedMarks, setSavedMarks] = useState<Marks>(initial)
  const [result, setResult] = useState<ActionResult | null>(null)
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    const nextMarks = marksFromRows(initialMarks)

    setMarks(nextMarks)
    setSavedMarks(nextMarks)
    setResult(null)
  }, [entryId, initialDate, initialMarks])

  const isDirty = !sameMarks(marks, savedMarks, studentIds)

  const hasSavedRegister =
    studentIds.length > 0 &&
    studentIds.every((id) => savedMarks[id] !== undefined)

  function setStudentStatus(
    studentId: number,
    status: AttendanceStatus,
  ) {
    setMarks((current) => ({
      ...current,
      [studentId]: status,
    }))

    setResult(null)
  }

  function markAll(status: AttendanceStatus) {
    setMarks(
      Object.fromEntries(
        students.map((student) => [student.id, status]),
      ),
    )

    setResult(null)
  }

  async function handleSave() {
    if (students.some((student) => !marks[student.id])) {
      setResult({
        ok: false,
        error: 'Select a status for every student before saving.',
      })
      return
    }

    setSaving(true)
    setResult(null)

    try {
      const response = await saveLectureAttendance(
        entryId,
        date,
        students.map((student) => ({
          groupStudentId: student.id,
          status: marks[student.id],
        })),
      )

      setResult(response)

      if (response.ok) {
        const persisted = { ...marks }

        setSavedMarks(persisted)
        router.refresh()
      }
    } catch {
      setResult({
        ok: false,
        error: 'Unable to save attendance. Please try again.',
      })
    } finally {
      setSaving(false)
    }
  }

  return (
    <section className="mt-8">
      <div className="border-b border-neutral-200 pb-4">
        <p className="font-mono text-[10px] uppercase tracking-[0.2em] text-neutral-500">
          Lecture register
        </p>

        <h2 className="mt-2 font-display text-2xl">
          Mark attendance
        </h2>

        <p className="mt-2 text-sm text-neutral-600">
          Record attendance for this lecture on{' '}
          {new Intl.DateTimeFormat('en-IN', {
            day: '2-digit',
            month: 'short',
            year: 'numeric',
            timeZone: 'UTC',
          }).format(new Date(`${date}T12:00:00Z`))}.
        </p>
      </div>

      {blockedReason ? (
        <p className="mt-5 border border-neutral-300 p-4 text-sm text-neutral-600">
          {blockedReason}
        </p>
      ) : students.length === 0 ? (
        <p className="py-8 text-sm text-neutral-600">
          No students are assigned to this class group.
        </p>
      ) : (
        <>
          <div className="mt-5 flex flex-wrap items-center justify-between gap-3">
            <span className="inline-flex items-center gap-2 text-sm text-neutral-600">
              <Users size={16} />
              {students.length} students
            </span>

            <div className="flex flex-wrap gap-2">
              <button
                type="button"
                onClick={() => markAll('present')}
                className="border border-neutral-300 px-3 py-2 text-xs hover:border-black"
              >
                Mark all present
              </button>

              <button
                type="button"
                onClick={() => markAll('absent')}
                className="border border-neutral-300 px-3 py-2 text-xs hover:border-black"
              >
                Mark all absent
              </button>
            </div>
          </div>

          <div className="mt-4 divide-y divide-neutral-200 border-y border-neutral-200">
            {students.map((student) => (
              <div
                key={student.id}
                className="flex flex-col gap-3 py-3 sm:flex-row sm:items-center sm:justify-between"
              >
                <div>
                  <p className="text-sm font-medium">
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
                        onClick={() =>
                          setStudentStatus(student.id, status.value)
                        }
                        aria-pressed={selected}
                        className={`min-w-[43px] border px-3 py-2 text-xs ${
                          selected
                            ? 'border-black bg-black text-white'
                            : 'border-neutral-300 text-neutral-600 hover:border-black'
                        }`}
                        title={status.label}
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
            P = Present · A = Absent · L = Late · E = Excused
          </p>

          <div className="mt-5 flex flex-col gap-3 border-t border-neutral-200 pt-4 sm:flex-row sm:items-center sm:justify-between">
            <p
              aria-live="polite"
              className={`inline-flex items-center gap-2 text-sm ${
                isDirty
                  ? 'text-amber-800'
                  : hasSavedRegister
                    ? 'text-neutral-700'
                    : 'text-neutral-500'
              }`}
            >
              {isDirty ? (
                <>
                  <span className="h-2 w-2 rounded-full bg-amber-600" />
                  Unsaved changes
                </>
              ) : hasSavedRegister ? (
                <>
                  <CheckCheck size={16} />
                  Saved
                </>
              ) : (
                <>No saved attendance for this date</>
              )}
            </p>

            <button
              type="button"
              onClick={handleSave}
              disabled={
                saving ||
                !date ||
                Boolean(blockedReason) ||
                !isDirty
              }
              className="inline-flex h-11 items-center justify-center gap-2 bg-black px-5 text-sm text-white hover:bg-neutral-800 disabled:cursor-not-allowed disabled:opacity-40"
            >
              <Check size={16} />
              {saving
                ? 'Saving attendance…'
                : isDirty
                  ? 'Save attendance'
                  : 'Attendance saved'}
            </button>
          </div>

          {result && (
            <p
              role={result.ok ? 'status' : 'alert'}
              className={`mt-4 border px-3 py-3 text-sm ${
                result.ok
                  ? 'border-neutral-300 text-neutral-700'
                  : 'border-red-300 text-red-700'
              }`}
            >
              {result.ok
                ? result.message || 'Attendance saved successfully.'
                : result.error}
            </p>
          )}
        </>
      )}
    </section>
  )
}