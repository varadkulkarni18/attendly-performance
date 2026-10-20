'use client'

import { Fragment, useActionState, useEffect, useState } from 'react'
import {
  CalendarDays,
  Clock3,
  MapPin,
  Pencil,
  Plus,
  Trash2,
  X,
} from 'lucide-react'
import {
  createTimetableEntry,
  updateTimetableEntry,
  deleteTimetableEntry,
  type TimetableActionState,
} from '@/app/admin/timetable/actions'

type Group = {
  id: number
  name: string
  academicYear: string
  section: string
}

type Teacher = {
  id: string
  name: string
  email: string
}

type Entry = {
  id: number
  classGroupId: number
  groupName: string
  academicYear: string
  section: string
  subjectName: string
  subjectCode: string
  teacherId: string
  teacherName: string
  teacherEmail: string
  dayOfWeek: number
  startTime: string
  endTime: string
  room: string | null
  active: boolean
}

const days = [
  { value: 1, label: 'Monday' },
  { value: 2, label: 'Tuesday' },
  { value: 3, label: 'Wednesday' },
  { value: 4, label: 'Thursday' },
  { value: 5, label: 'Friday' },
  { value: 6, label: 'Saturday' },
]

const initialState: TimetableActionState = {
  success: false,
  message: '',
}

const inputClass =
  'mt-1 h-10 w-full border border-neutral-200 bg-white px-3 text-sm font-normal text-neutral-900 outline-none transition focus:border-neutral-400 focus:ring-2 focus:ring-neutral-100'

/**
 * Display-only demo teacher assignment for the admin timetable.
 *
 * The result is deterministic: the same subject and class group will
 * consistently display the same demo teacher.
 *
 * This function does not modify database records. The edit form continues
 * to use the actual saved teacher assignment.
 */
function getDemoTeacher(
  entry: Entry,
  teachers: Teacher[],
): Teacher | undefined {
  if (teachers.length === 0) return undefined

  const key = [
    entry.subjectCode.trim().toLowerCase(),
    entry.subjectName.trim().toLowerCase(),
    entry.classGroupId,
  ].join('::')

  let hash = 0

  for (let index = 0; index < key.length; index++) {
    hash = (hash * 31 + key.charCodeAt(index)) >>> 0
  }

  return teachers[hash % teachers.length]
}

function getDisplayEntries(
  entries: Entry[],
  teachers: Teacher[],
): Entry[] {
  return entries.map((entry) => {
    const demoTeacher = getDemoTeacher(entry, teachers)

    if (!demoTeacher) return entry

    return {
      ...entry,
      teacherName: demoTeacher.name,
      teacherEmail: demoTeacher.email,
    }
  })
}

function EntryForm({
  groups,
  teachers,
  entry,
  onCancel,
}: {
  groups: Group[]
  teachers: Teacher[]
  entry?: Entry
  onCancel: () => void
}) {
  const action = entry ? updateTimetableEntry : createTimetableEntry
  const [state, formAction, pending] = useActionState(
    action,
    initialState,
  )

  useEffect(() => {
    if (state.success) onCancel()
  }, [state.success, state.message, onCancel])

  return (
    <form action={formAction} className="space-y-5">
      {entry && <input type="hidden" name="id" value={entry.id} />}

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
        <label className="text-sm text-neutral-700">
          Class group
          <select
            name="classGroupId"
            required
            defaultValue={String(entry?.classGroupId ?? '')}
            className={inputClass}
          >
            <option value="" disabled>
              Select class group
            </option>
            {groups.map((group) => (
              <option key={group.id} value={group.id}>
                {group.name} · {group.academicYear} · {group.section}
              </option>
            ))}
          </select>
        </label>

        <label className="text-sm text-neutral-700">
          Teacher
          <select
            name="teacherId"
            required
            defaultValue={entry?.teacherId ?? ''}
            className={inputClass}
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

        <label className="text-sm text-neutral-700">
          Subject name
          <input
            name="subjectName"
            required
            maxLength={100}
            defaultValue={entry?.subjectName ?? ''}
            placeholder="e.g. Database Systems"
            className={inputClass}
          />
        </label>

        <label className="text-sm text-neutral-700">
          Subject code
          <input
            name="subjectCode"
            required
            maxLength={30}
            defaultValue={entry?.subjectCode ?? ''}
            placeholder="e.g. CS301"
            className={inputClass}
          />
        </label>

        <label className="text-sm text-neutral-700">
          Day
          <select
            name="dayOfWeek"
            required
            defaultValue={String(entry?.dayOfWeek ?? 1)}
            className={inputClass}
          >
            {days.map((day) => (
              <option key={day.value} value={day.value}>
                {day.label}
              </option>
            ))}
          </select>
        </label>

        <label className="text-sm text-neutral-700">
          Room (optional)
          <input
            name="room"
            maxLength={50}
            defaultValue={entry?.room ?? ''}
            placeholder="e.g. Lab 2"
            className={inputClass}
          />
        </label>

        <label className="text-sm text-neutral-700">
          Start time
          <input
            type="time"
            name="startTime"
            required
            defaultValue={entry?.startTime ?? '09:00'}
            className={inputClass}
          />
        </label>

        <label className="text-sm text-neutral-700">
          End time
          <input
            type="time"
            name="endTime"
            required
            defaultValue={entry?.endTime ?? '10:00'}
            className={inputClass}
          />
        </label>
      </div>

      {state.message && (
        <p
          role="status"
          className={`border px-3 py-2 text-sm ${
            state.success
              ? 'border-neutral-200 bg-neutral-50 text-neutral-700'
              : 'border-red-200 bg-red-50 text-red-700'
          }`}
        >
          {state.message}
        </p>
      )}

      <div className="flex justify-end gap-2 border-t border-neutral-100 pt-4">
        <button
          type="button"
          onClick={onCancel}
          className="h-10 border border-neutral-200 px-4 text-sm text-neutral-700 transition hover:bg-neutral-50"
        >
          Cancel
        </button>

        <button
          type="submit"
          disabled={
            pending || groups.length === 0 || teachers.length === 0
          }
          className="h-10 bg-neutral-950 px-4 text-sm text-white transition hover:bg-neutral-800 disabled:opacity-50"
        >
          {pending
            ? 'Saving…'
            : entry
              ? 'Save changes'
              : 'Add timetable slot'}
        </button>
      </div>
    </form>
  )
}

function DeleteButton({ entry }: { entry: Entry }) {
  const [confirm, setConfirm] = useState(false)
  const [state, action, pending] = useActionState(
    deleteTimetableEntry,
    initialState,
  )

  return (
    <div className="relative">
      {!confirm ? (
        <button
          type="button"
          onClick={() => setConfirm(true)}
          title="Deactivate entry"
          aria-label={`Deactivate ${entry.subjectName}`}
          className="p-2 text-neutral-500 transition hover:bg-red-50 hover:text-red-700"
        >
          <Trash2 size={15} strokeWidth={1.5} />
        </button>
      ) : (
        <div className="min-w-48 space-y-2 border border-red-200 bg-white p-3 shadow-sm">
          <p className="text-xs leading-5 text-neutral-700">
            Deactivate this timetable entry?
          </p>

          <form action={action} className="flex gap-2">
            <input type="hidden" name="id" value={entry.id} />

            <button
              type="submit"
              disabled={pending}
              className="bg-red-700 px-3 py-1.5 text-xs text-white disabled:opacity-50"
            >
              {pending ? 'Working…' : 'Confirm'}
            </button>

            <button
              type="button"
              onClick={() => setConfirm(false)}
              className="border border-neutral-200 px-3 py-1.5 text-xs text-neutral-700"
            >
              Cancel
            </button>
          </form>

          {state.message && (
            <p
              role="status"
              className={`text-xs ${
                state.success ? 'text-neutral-600' : 'text-red-700'
              }`}
            >
              {state.message}
            </p>
          )}
        </div>
      )}
    </div>
  )
}

export function TimetableManager({
  groups,
  teachers,
  entries,
}: {
  groups: Group[]
  teachers: Teacher[]
  entries: Entry[]
}) {
  const [creating, setCreating] = useState(false)
  const [editing, setEditing] = useState<Entry | null>(null)
  const [selectedDay, setSelectedDay] = useState('all')
  const [selectedGroup, setSelectedGroup] = useState('all')
  const [showInactive, setShowInactive] = useState(false)

  const filtered = entries.filter(
    (entry) =>
      (showInactive || entry.active) &&
      (selectedDay === 'all' ||
        entry.dayOfWeek === Number(selectedDay)) &&
      (selectedGroup === 'all' ||
        entry.classGroupId === Number(selectedGroup)),
  )

  // Only the admin-facing display uses demo teachers.
  // The original entries remain unchanged for editing and saving.
  const displayEntries = getDisplayEntries(filtered, teachers)

  // Group the visible entries by weekday so the full timetable is easier to scan.
  // Each group remains sorted by start time, while all existing filters still apply.
  const groupedEntries = days
    .map((day) => ({
      ...day,
      entries: displayEntries
        .filter((entry) => entry.dayOfWeek === day.value)
        .sort((a, b) => a.startTime.localeCompare(b.startTime)),
    }))
    .filter((day) => day.entries.length > 0)

  function startEditing(entryId: number) {
    const originalEntry = entries.find((entry) => entry.id === entryId)

    if (!originalEntry || !originalEntry.active) return

    setEditing(originalEntry)
    setCreating(false)
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-end">
        <div>
          <p className="font-mono text-[10px] uppercase tracking-[0.18em] text-neutral-500">
            Schedule management
          </p>

          <h2 className="mt-2 font-display text-2xl tracking-tight text-neutral-950">
            Weekly schedule
          </h2>

          <p className="mt-2 max-w-xl text-sm leading-6 text-neutral-600">
            Manage recurring class slots, assigned teachers, rooms, and
            timings. Demo teacher names are shown in this admin preview;
            saved assignments are preserved.
          </p>
        </div>

        <button
          type="button"
          onClick={() => {
            setCreating((value) => !value)
            setEditing(null)
          }}
          className="inline-flex h-10 shrink-0 items-center justify-center gap-2 bg-neutral-950 px-4 text-sm text-white transition hover:bg-neutral-800"
        >
          {creating ? (
            <X size={16} strokeWidth={1.5} />
          ) : (
            <Plus size={16} strokeWidth={1.5} />
          )}
          {creating ? 'Cancel' : 'Add timetable slot'}
        </button>
      </div>

      {(creating || editing) && (
        <section className="border border-neutral-200 bg-white p-5 sm:p-6">
          <div className="mb-5 border-b border-neutral-100 pb-4">
            <p className="font-mono text-[10px] uppercase tracking-[0.16em] text-neutral-500">
              {editing ? 'Update assignment' : 'New assignment'}
            </p>

            <h3 className="mt-2 font-display text-xl text-neutral-950">
              {editing ? 'Edit timetable slot' : 'Create timetable slot'}
            </h3>

            <p className="mt-1 text-sm text-neutral-500">
              {editing
                ? 'The form uses the saved assignment, not the demo teacher shown in the list.'
                : 'Choose the class group, teacher, subject, and weekly time.'}
            </p>
          </div>

          <EntryForm
            groups={groups}
            teachers={teachers}
            entry={editing ?? undefined}
            onCancel={() => {
              setCreating(false)
              setEditing(null)
            }}
          />
        </section>
      )}

      {/* Filters */}
      <section className="border border-neutral-200 bg-white p-4 sm:p-5">
        <div className="mb-4 flex items-center justify-between gap-3">
          <div>
            <h3 className="font-display text-lg text-neutral-950">
              Find a class slot
            </h3>
            <p className="mt-1 text-xs leading-5 text-neutral-500">
              Narrow the schedule by weekday or class group.
            </p>
          </div>

          <span className="shrink-0 font-mono text-[10px] uppercase tracking-[0.12em] text-neutral-500">
            {filtered.length} results
          </span>
        </div>

        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-[180px_minmax(220px,280px)_1fr] xl:items-end">
          <label className="block text-xs text-neutral-600">
            Day of week
            <select
              value={selectedDay}
              onChange={(event) => setSelectedDay(event.target.value)}
              className={inputClass}
            >
              <option value="all">All days</option>
              {days.map((day) => (
                <option key={day.value} value={day.value}>
                  {day.label}
                </option>
              ))}
            </select>
          </label>

          <label className="block text-xs text-neutral-600">
            Class group
            <select
              value={selectedGroup}
              onChange={(event) => setSelectedGroup(event.target.value)}
              className={inputClass}
            >
              <option value="all">All groups</option>
              {groups.map((group) => (
                <option key={group.id} value={group.id}>
                  {group.name} · {group.section}
                </option>
              ))}
            </select>
          </label>

          <div className="flex flex-wrap items-center justify-between gap-3 sm:col-span-2 xl:col-span-1">
            <label className="inline-flex min-h-10 items-center gap-2 text-sm text-neutral-600">
              <input
                type="checkbox"
                checked={showInactive}
                onChange={(event) => setShowInactive(event.target.checked)}
                className="h-4 w-4 accent-neutral-950"
              />
              Show inactive slots
            </label>

            {(selectedDay !== 'all' ||
              selectedGroup !== 'all' ||
              showInactive) && (
              <button
                type="button"
                onClick={() => {
                  setSelectedDay('all')
                  setSelectedGroup('all')
                  setShowInactive(false)
                }}
                className="text-xs text-neutral-500 underline underline-offset-4 transition hover:text-neutral-950"
              >
                Clear filters
              </button>
            )}
          </div>
        </div>
      </section>

      {/* Schedule table */}
      <section className="overflow-hidden border border-neutral-200 bg-white">
        <div className="flex flex-col gap-2 border-b border-neutral-200 px-4 py-4 sm:flex-row sm:items-center sm:justify-between sm:px-5">
          <div>
            <h3 className="font-display text-xl text-neutral-950">
              Timetable entries
            </h3>
            <p className="mt-1 text-xs leading-5 text-neutral-500">
              Entries are grouped by weekday and sorted by start time for quicker scanning.
            </p>
          </div>

          <span className="inline-flex w-fit items-center gap-2 border border-neutral-200 px-2.5 py-1.5 font-mono text-[10px] uppercase tracking-[0.12em] text-neutral-600">
            <CalendarDays size={13} strokeWidth={1.5} />
            {displayEntries.length}{' '}
            {displayEntries.length === 1 ? 'slot' : 'slots'}
          </span>
        </div>

        {/* Desktop table */}
        <div className="hidden overflow-x-auto md:block">
          <table className="w-full min-w-[900px] border-collapse text-left">
            <thead className="border-b border-neutral-200 bg-neutral-50">
              <tr>
                {[
                  'Day & time',
                  'Subject',
                  'Class group',
                  'Assigned teacher',
                  'Room',
                  'Status',
                  'Actions',
                ].map((heading) => (
                  <th
                    key={heading}
                    className="px-4 py-3 font-mono text-[10px] font-normal uppercase tracking-[0.14em] text-neutral-500"
                  >
                    {heading}
                  </th>
                ))}
              </tr>
            </thead>

            <tbody className="divide-y divide-neutral-100">
              {groupedEntries.map((dayGroup) => (
                <Fragment key={`desktop-day-${dayGroup.value}`}>
                  <tr className="border-y border-neutral-200 bg-neutral-50/80">
                    <td colSpan={7} className="px-4 py-2.5">
                      <div className="flex items-center justify-between gap-3">
                        <div className="flex items-center gap-2.5">
                          <span className="h-1.5 w-1.5 rounded-full bg-neutral-950" aria-hidden="true" />
                          <p className="font-mono text-[10px] uppercase tracking-[0.16em] text-neutral-700">
                            {dayGroup.label}
                          </p>
                        </div>
                        <p className="text-xs text-neutral-500">
                          {dayGroup.entries.length} {dayGroup.entries.length === 1 ? 'class' : 'classes'}
                        </p>
                      </div>
                    </td>
                  </tr>
                  {dayGroup.entries.map((entry) => (
                    <tr
                      key={entry.id}
                      className="align-middle transition-colors hover:bg-neutral-50/70"
                    >
                  <td className="whitespace-nowrap px-4 py-4">
                    <p className="text-sm text-neutral-900">
                      {days.find((day) => day.value === entry.dayOfWeek)
                        ?.label ?? `Day ${entry.dayOfWeek}`}
                    </p>

                    <p className="mt-1 flex items-center gap-1.5 text-xs tabular-nums text-neutral-500">
                      <Clock3 size={12} strokeWidth={1.5} />
                      {entry.startTime}–{entry.endTime}
                    </p>
                  </td>

                  <td className="max-w-[220px] px-4 py-4">
                    <p className="break-words text-sm text-neutral-950">
                      {entry.subjectName}
                    </p>
                    <p className="mt-1 font-mono text-[10px] tracking-wide text-neutral-500">
                      {entry.subjectCode}
                    </p>
                  </td>

                  <td className="px-4 py-4">
                    <p className="text-sm text-neutral-800">
                      {entry.groupName}
                      {entry.section ? ` · ${entry.section}` : ''}
                    </p>
                    <p className="mt-1 text-xs text-neutral-500">
                      {entry.academicYear}
                    </p>
                  </td>

                  <td className="max-w-[230px] px-4 py-4">
                    <p className="truncate text-sm text-neutral-800">
                      {entry.teacherName || 'Unassigned'}
                    </p>
                    <p className="mt-1 truncate text-xs text-neutral-500">
                      {entry.teacherEmail || 'No email available'}
                    </p>
                  </td>

                  <td className="px-4 py-4">
                    <span className="inline-flex items-center gap-1.5 text-sm text-neutral-600">
                      {entry.room ? (
                        <>
                          <MapPin
                            size={13}
                            strokeWidth={1.5}
                            className="shrink-0 text-neutral-400"
                          />
                          {entry.room}
                        </>
                      ) : (
                        <span className="text-neutral-400">Not set</span>
                      )}
                    </span>
                  </td>

                  <td className="px-4 py-4">
                    <span
                      className={`inline-flex items-center gap-1.5 whitespace-nowrap border px-2 py-1 text-xs ${
                        entry.active
                          ? 'border-emerald-200 bg-emerald-50/60 text-emerald-800'
                          : 'border-neutral-200 bg-neutral-50 text-neutral-500'
                      }`}
                    >
                      <span
                        className={`h-1.5 w-1.5 rounded-full ${
                          entry.active
                            ? 'bg-emerald-600'
                            : 'bg-neutral-400'
                        }`}
                      />
                      {entry.active ? 'Active' : 'Inactive'}
                    </span>
                  </td>

                  <td className="px-4 py-4">
                    <div className="flex items-center gap-1">
                      <button
                        type="button"
                        disabled={!entry.active}
                        onClick={() => startEditing(entry.id)}
                        title="Edit slot"
                        aria-label={`Edit ${entry.subjectName}`}
                        className="p-2 text-neutral-500 transition hover:bg-neutral-100 hover:text-neutral-950 disabled:cursor-not-allowed disabled:opacity-30"
                      >
                        <Pencil size={15} strokeWidth={1.5} />
                      </button>

                      {entry.active && <DeleteButton entry={entry} />}
                    </div>
                  </td>
                    </tr>
                  ))}
                </Fragment>
              ))}
            </tbody>
          </table>
        </div>

        {/* Mobile schedule list */}
        <div className="divide-y divide-neutral-100 md:hidden">
          {groupedEntries.map((dayGroup) => (
            <section key={`mobile-day-${dayGroup.value}`}>
              <div className="flex items-center justify-between border-y border-neutral-200 bg-neutral-50/80 px-4 py-2.5">
                <div className="flex items-center gap-2.5">
                  <span className="h-1.5 w-1.5 rounded-full bg-neutral-950" aria-hidden="true" />
                  <p className="font-mono text-[10px] uppercase tracking-[0.16em] text-neutral-700">
                    {dayGroup.label}
                  </p>
                </div>
                <p className="text-xs text-neutral-500">
                  {dayGroup.entries.length} {dayGroup.entries.length === 1 ? 'class' : 'classes'}
                </p>
              </div>
              {dayGroup.entries.map((entry) => (
                <article key={entry.id} className="space-y-4 p-4">
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <p className="flex flex-wrap items-center gap-1.5 text-xs text-neutral-500">
                    <CalendarDays size={13} strokeWidth={1.5} />
                    {days.find((day) => day.value === entry.dayOfWeek)
                      ?.label ?? `Day ${entry.dayOfWeek}`}
                    <span aria-hidden="true">·</span>
                    <span className="tabular-nums">
                      {entry.startTime}–{entry.endTime}
                    </span>
                  </p>

                  <h4 className="mt-2 break-words font-display text-lg leading-snug text-neutral-950">
                    {entry.subjectName}
                  </h4>

                  <p className="mt-1 font-mono text-[10px] tracking-wide text-neutral-500">
                    {entry.subjectCode}
                  </p>
                </div>

                <span
                  className={`inline-flex shrink-0 items-center gap-1.5 border px-2 py-1 text-[10px] ${
                    entry.active
                      ? 'border-emerald-200 bg-emerald-50/60 text-emerald-800'
                      : 'border-neutral-200 bg-neutral-50 text-neutral-500'
                  }`}
                >
                  <span
                    className={`h-1.5 w-1.5 rounded-full ${
                      entry.active ? 'bg-emerald-600' : 'bg-neutral-400'
                    }`}
                  />
                  {entry.active ? 'Active' : 'Inactive'}
                </span>
              </div>

              <div className="grid grid-cols-2 gap-4 border-t border-neutral-100 pt-3">
                <div className="min-w-0">
                  <p className="font-mono text-[9px] uppercase tracking-[0.13em] text-neutral-500">
                    Class group
                  </p>
                  <p className="mt-1 break-words text-sm text-neutral-800">
                    {entry.groupName} · {entry.section}
                  </p>
                  <p className="mt-1 text-xs text-neutral-500">
                    {entry.academicYear}
                  </p>
                </div>

                <div className="min-w-0">
                  <p className="font-mono text-[9px] uppercase tracking-[0.13em] text-neutral-500">
                    Teacher
                  </p>
                  <p className="mt-1 break-words text-sm text-neutral-800">
                    {entry.teacherName || 'Unassigned'}
                  </p>
                  <p className="mt-1 break-all text-xs text-neutral-500">
                    {entry.teacherEmail || 'No email available'}
                  </p>
                </div>
              </div>

              <p className="flex items-center gap-2 text-xs text-neutral-500">
                <MapPin size={13} strokeWidth={1.5} />
                {entry.room || 'Room not set'}
              </p>

              <div className="flex items-center gap-2 border-t border-neutral-100 pt-3">
                <button
                  type="button"
                  disabled={!entry.active}
                  onClick={() => startEditing(entry.id)}
                  className="inline-flex h-9 items-center gap-2 border border-neutral-200 px-3 text-sm text-neutral-700 transition hover:bg-neutral-50 disabled:cursor-not-allowed disabled:opacity-30"
                >
                  <Pencil size={14} strokeWidth={1.5} />
                  Edit
                </button>

                {entry.active && <DeleteButton entry={entry} />}
              </div>
                </article>
              ))}
            </section>
          ))}
        </div>

        {/* Empty state */}
        {displayEntries.length === 0 && (
          <div className="px-6 py-14 text-center">
            <div className="mx-auto flex h-11 w-11 items-center justify-center border border-neutral-200 bg-neutral-50">
              <CalendarDays
                className="text-neutral-500"
                size={20}
                strokeWidth={1.4}
              />
            </div>

            <h4 className="mt-4 font-display text-xl text-neutral-950">
              No timetable entries found
            </h4>

            <p className="mx-auto mt-2 max-w-sm text-sm leading-6 text-neutral-500">
              Try changing the day or class group filters. You can also add
              a timetable slot if no schedule has been created yet.
            </p>

            <button
              type="button"
              onClick={() => {
                setSelectedDay('all')
                setSelectedGroup('all')
                setShowInactive(false)
                setCreating(true)
                setEditing(null)
              }}
              className="mt-5 inline-flex h-10 items-center gap-2 bg-neutral-950 px-4 text-sm text-white transition hover:bg-neutral-800"
            >
              <Plus size={15} strokeWidth={1.5} />
              Add timetable slot
            </button>
          </div>
        )}

        <div className="flex flex-col gap-2 border-t border-neutral-200 bg-neutral-50/60 px-4 py-3 text-xs text-neutral-500 sm:flex-row sm:items-center sm:justify-between sm:px-5">
          <span>
            Showing {displayEntries.length}{' '}
            {displayEntries.length === 1 ? 'entry' : 'entries'}
          </span>

          <span className="font-mono text-[9px] uppercase tracking-[0.12em]">
            Demo teacher display · Saved assignments unchanged
          </span>
        </div>
      </section>
    </div>
  )
}