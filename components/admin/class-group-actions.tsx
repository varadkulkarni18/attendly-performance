
'use client'

import { useActionState, useEffect, useState } from 'react'
import { Pencil, Save, Trash2, X } from 'lucide-react'

import {
  updateClassGroup,
  deleteClassGroup,
  type CreateClassGroupState,
} from '@/app/admin/classes/actions'

type ClassGroup = {
  id: number
  name: string
  academicYear: string
  section: string
}

const initialState: CreateClassGroupState = {
  success: false,
  message: '',
}

const inputClass =
  'mt-1 h-10 w-full rounded-xl border border-neutral-200 bg-white px-3 text-sm outline-none focus:border-neutral-500 focus:ring-2 focus:ring-neutral-100'

const years = [
  'First Year',
  'Second Year',
  'Third Year',
  'Fourth Year',
  'Other',
]

export function ClassGroupActions({ group }: { group: ClassGroup }) {
  const [editing, setEditing] = useState(false)
  const [confirmingDelete, setConfirmingDelete] = useState(false)

  const [editState, editAction, editPending] = useActionState(
    updateClassGroup,
    initialState,
  )

  const [deleteState, deleteAction, deletePending] = useActionState(
    deleteClassGroup,
    initialState,
  )

  useEffect(() => {
    if (editState.success) {
      setEditing(false)
    }
  }, [editState.success, editState.message])

  useEffect(() => {
    if (deleteState.success) {
      setConfirmingDelete(false)
    }
  }, [deleteState.success, deleteState.message])

  return (
    <div className="flex flex-wrap items-center justify-end gap-2">
      <button
        type="button"
        onClick={() => {
          setEditing((value) => !value)
          setConfirmingDelete(false)
        }}
        className="inline-flex h-9 items-center gap-1.5 rounded-lg border border-neutral-200 px-3 text-sm font-medium text-neutral-700 hover:bg-neutral-50"
      >
        {editing ? <X size={14} /> : <Pencil size={14} />}
        {editing ? 'Cancel' : 'Edit'}
      </button>

      <button
        type="button"
        onClick={() => {
          setConfirmingDelete((value) => !value)
          setEditing(false)
        }}
        className="inline-flex h-9 items-center gap-1.5 rounded-lg border border-red-200 px-3 text-sm font-medium text-red-700 hover:bg-red-50"
      >
        {confirmingDelete ? <X size={14} /> : <Trash2 size={14} />}
        {confirmingDelete ? 'Cancel' : 'Delete'}
      </button>

      {editing && (
        <form
          action={editAction}
          className="mt-2 grid w-full grid-cols-1 gap-3 rounded-xl border border-neutral-200 bg-neutral-50 p-4 sm:grid-cols-3"
        >
          <input type="hidden" name="id" value={group.id} />

          <label className="text-xs font-medium text-neutral-700">
            Class name
            <input
              name="name"
              required
              maxLength={100}
              defaultValue={group.name}
              className={inputClass}
            />
          </label>

          <label className="text-xs font-medium text-neutral-700">
            Academic year
            <select
              name="academicYear"
              required
              defaultValue={group.academicYear}
              className={inputClass}
            >
              {years.map((year) => (
                <option key={year} value={year}>
                  {year}
                </option>
              ))}

              {!years.includes(group.academicYear) && (
                <option value={group.academicYear}>
                  {group.academicYear}
                </option>
              )}
            </select>
          </label>

          <label className="text-xs font-medium text-neutral-700">
            Section
            <input
              name="section"
              required
              maxLength={30}
              defaultValue={group.section}
              className={inputClass}
            />
          </label>

          {editState.message && (
            <p
              role="status"
              className={`text-sm sm:col-span-3 ${
                editState.success ? 'text-neutral-700' : 'text-red-700'
              }`}
            >
              {editState.message}
            </p>
          )}

          <div className="flex justify-end sm:col-span-3">
            <button
              type="submit"
              disabled={editPending}
              className="inline-flex h-9 items-center gap-2 rounded-lg bg-neutral-950 px-4 text-sm font-medium text-white hover:bg-neutral-800 disabled:opacity-60"
            >
              <Save size={14} />
              {editPending ? 'Saving...' : 'Save changes'}
            </button>
          </div>
        </form>
      )}

      {confirmingDelete && (
        <div className="mt-2 w-full rounded-xl border border-red-200 bg-red-50 p-4">
          <p className="text-sm font-semibold text-red-900">
            Delete {group.name}, Section {group.section}?
          </p>

          <p className="mt-1 text-sm leading-5 text-red-800">
            Student membership and timetable data may also be removed. Groups
            with lecture or attendance history cannot be deleted.
          </p>

          <form action={deleteAction} className="mt-3 flex flex-wrap gap-2">
            <input type="hidden" name="id" value={group.id} />

            <button
              type="submit"
              disabled={deletePending}
              className="inline-flex h-9 items-center gap-2 rounded-lg bg-red-700 px-3 text-sm font-medium text-white hover:bg-red-800 disabled:opacity-60"
            >
              <Trash2 size={14} />
              {deletePending ? 'Checking...' : 'Confirm delete'}
            </button>

            <button
              type="button"
              onClick={() => setConfirmingDelete(false)}
              className="h-9 rounded-lg border border-neutral-200 bg-white px-3 text-sm text-neutral-700"
            >
              Keep group
            </button>
          </form>

          {deleteState.message && (
            <p
              role="status"
              className={`mt-3 text-sm ${
                deleteState.success ? 'text-neutral-800' : 'text-red-800'
              }`}
            >
              {deleteState.message}
            </p>
          )}
        </div>
      )}
    </div>
  )
}
