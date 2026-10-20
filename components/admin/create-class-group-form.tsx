
'use client'

import { useActionState, useEffect, useRef, useState } from 'react'
import { Download, FileSpreadsheet, Plus, Upload, X } from 'lucide-react'

import {
  createClassGroup,
  type CreateClassGroupState,
} from '@/app/admin/classes/actions'

const initialState: CreateClassGroupState = {
  success: false,
  message: '',
}

const academicYears = [
  'First Year',
  'Second Year',
  'Third Year',
  'Fourth Year',
  'Other',
]

const inputClass =
  'mt-1 h-11 w-full rounded-xl border border-neutral-200 bg-white px-3 text-sm text-neutral-900 outline-none transition placeholder:text-neutral-400 focus:border-neutral-400 focus:ring-2 focus:ring-neutral-100'

const CSV_TEMPLATE =
  'studentName,rollNo,studentEmail\nAarav Patil,CS001,aarav@example.com\nPriya Shah,CS002,priya@example.com\nRahul More,CS003,\n'

function downloadCsvTemplate() {
  const blob = new Blob([CSV_TEMPLATE], {
    type: 'text/csv;charset=utf-8;',
  })

  const url = URL.createObjectURL(blob)
  const link = document.createElement('a')

  link.href = url
  link.download = 'attendly-students-template.csv'
  document.body.appendChild(link)
  link.click()
  link.remove()

  URL.revokeObjectURL(url)
}

function CreateClassGroupFormComponent() {
  const [open, setOpen] = useState(false)
  const [state, formAction, pending] = useActionState(
    createClassGroup,
    initialState,
  )

  const formRef = useRef<HTMLFormElement>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)

  const [fileName, setFileName] = useState('')
  const [studentCount, setStudentCount] = useState<number | null>(null)
  const [fileError, setFileError] = useState('')

  useEffect(() => {
    if (state.success) {
      formRef.current?.reset()
      setFileName('')
      setStudentCount(null)
      setFileError('')
      setOpen(false)
    }
  }, [state.success, state.message])

  function resetForm() {
    formRef.current?.reset()
    setFileName('')
    setStudentCount(null)
    setFileError('')
  }

  async function handleFileChange(
    event: React.ChangeEvent<HTMLInputElement>,
  ) {
    const file = event.target.files?.[0]

    setFileName('')
    setStudentCount(null)
    setFileError('')

    if (!file) return

    if (!file.name.toLowerCase().endsWith('.csv')) {
      setFileError('Please select a .csv file.')
      event.target.value = ''
      return
    }

    if (file.size > 2 * 1024 * 1024) {
      setFileError('The CSV file must be smaller than 2 MB.')
      event.target.value = ''
      return
    }

    setFileName(file.name)

    try {
      const text = (await file.text()).replace(/^\uFEFF/, '')
      const lines = text.split(/\r\n|\n|\r/).filter((line) => line.trim())

      if (lines.length < 2) {
        setFileError(
          'Your CSV needs a header row and at least one student.',
        )
        return
      }

      // Count non-empty data rows for a quick preview.
      // The server performs the authoritative CSV validation.
      setStudentCount(lines.length - 1)
    } catch {
      setFileError('Unable to read this file. Please try another CSV.')
    }
  }

  return (
    <section className="w-full">
      {!open ? (
        <div className="flex justify-end">
          <button
            type="button"
            onClick={() => setOpen(true)}
            className="inline-flex h-10 items-center justify-center gap-2 rounded-xl bg-neutral-950 px-4 text-sm font-medium text-white transition hover:bg-neutral-800"
          >
            <Plus size={16} />
            Create class group
          </button>
        </div>
      ) : (
        <div className="overflow-hidden rounded-2xl border border-neutral-200 bg-white">
          <div className="flex items-start justify-between gap-4 border-b border-neutral-100 px-5 py-4 sm:px-6">
            <div>
              <h2 className="text-base font-semibold text-neutral-950">
                Create class group
              </h2>
              <p className="mt-1 text-sm text-neutral-500">
                Set up a class and optionally import its students.
              </p>
            </div>

            <button
              type="button"
              onClick={() => {
                setOpen(false)
                resetForm()
              }}
              aria-label="Close create class group form"
              className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg border border-neutral-200 text-neutral-500 transition hover:bg-neutral-50 hover:text-neutral-900"
            >
              <X size={16} />
            </button>
          </div>

          <form
            ref={formRef}
            action={formAction}
          >
            <div className="space-y-6 px-5 py-5 sm:px-6">
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
                <div>
                  <label
                    htmlFor="new-class-group-name"
                    className="text-sm font-medium text-neutral-700"
                  >
                    Class name
                  </label>
                  <input
                    id="new-class-group-name"
                    name="name"
                    required
                    maxLength={100}
                    placeholder="e.g. TY CSE"
                    className={inputClass}
                  />
                </div>

                <div>
                  <label
                    htmlFor="new-class-group-year"
                    className="text-sm font-medium text-neutral-700"
                  >
                    Academic year
                  </label>
                  <select
                    id="new-class-group-year"
                    name="academicYear"
                    required
                    defaultValue=""
                    className={inputClass}
                  >
                    <option value="" disabled>
                      Select academic year
                    </option>
                    {academicYears.map((year) => (
                      <option key={year} value={year}>
                        {year}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label
                    htmlFor="new-class-group-section"
                    className="text-sm font-medium text-neutral-700"
                  >
                    Section
                  </label>
                  <input
                    id="new-class-group-section"
                    name="section"
                    required
                    maxLength={30}
                    placeholder="e.g. A"
                    className={inputClass}
                  />
                </div>
              </div>

              <div className="border-t border-neutral-100 pt-5">
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div>
                    <h3 className="flex items-center gap-2 text-sm font-semibold text-neutral-900">
                      <FileSpreadsheet
                        size={17}
                        className="text-neutral-600"
                      />
                      Import students
                      <span className="rounded-md bg-neutral-100 px-2 py-0.5 text-xs font-medium text-neutral-500">
                        Optional
                      </span>
                    </h3>
                    <p className="mt-1 text-sm leading-5 text-neutral-500">
                      Upload a CSV to add students to this group immediately.
                    </p>
                  </div>

                  <button
                    type="button"
                    onClick={downloadCsvTemplate}
                    className="inline-flex h-9 shrink-0 items-center gap-2 rounded-lg border border-neutral-200 bg-white px-3 text-sm font-medium text-neutral-700 transition hover:bg-neutral-50"
                  >
                    <Download size={15} />
                    Download template
                  </button>
                </div>

                <input
                  ref={fileInputRef}
                  id="students-csv"
                  name="studentsCsv"
                  type="file"
                  accept=".csv,text/csv"
                  onChange={handleFileChange}
                  className="sr-only"
                  aria-describedby="students-csv-help"
                />

                <label
                  htmlFor="students-csv"
                  className="mt-4 flex cursor-pointer flex-col items-center justify-center rounded-xl border border-dashed border-neutral-300 bg-neutral-50/70 px-4 py-7 text-center transition hover:border-neutral-400 hover:bg-neutral-50"
                >
                  <span className="flex h-10 w-10 items-center justify-center rounded-xl border border-neutral-200 bg-white text-neutral-700">
                    <Upload size={18} />
                  </span>

                  <span className="mt-3 text-sm font-medium text-neutral-900">
                    {fileName || 'Choose a CSV file'}
                  </span>

                  <span className="mt-1 text-xs text-neutral-500">
                    Click to browse · Maximum file size 2 MB
                  </span>
                </label>

                <p
                  id="students-csv-help"
                  className="mt-3 text-xs leading-5 text-neutral-500"
                >
                  Required columns:{' '}
                  <code className="rounded bg-neutral-100 px-1 py-0.5 text-neutral-700">
                    studentName
                  </code>
                  ,{' '}
                  <code className="rounded bg-neutral-100 px-1 py-0.5 text-neutral-700">
                    rollNo
                  </code>
                  .{' '}
                  <code className="rounded bg-neutral-100 px-1 py-0.5 text-neutral-700">
                    studentEmail
                  </code>{' '}
                  is optional. Maximum 500 students per import.
                </p>

                {studentCount !== null && !fileError && (
                  <div className="mt-3 flex items-center gap-2 rounded-lg border border-neutral-200 bg-white px-3 py-2.5 text-sm text-neutral-700">
                    <FileSpreadsheet
                      size={16}
                      className="shrink-0 text-neutral-500"
                    />
                    <span>
                      {studentCount} student{' '}
                      {studentCount === 1 ? 'row' : 'rows'} detected.
                      <span className="text-neutral-500">
                        {' '}
                        The server will validate the file before saving.
                      </span>
                    </span>
                    <button
                      type="button"
                      onClick={() => {
                        if (fileInputRef.current) {
                          fileInputRef.current.value = ''
                        }
                        setFileName('')
                        setStudentCount(null)
                        setFileError('')
                      }}
                      aria-label="Remove selected CSV"
                      className="ml-auto rounded-md p-1 text-neutral-500 hover:bg-neutral-100 hover:text-neutral-900"
                    >
                      <X size={15} />
                    </button>
                  </div>
                )}

                {fileError && (
                  <p
                    role="alert"
                    className="mt-3 rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700"
                  >
                    {fileError}
                  </p>
                )}
              </div>

              {state.message && (
                <p
                  role="status"
                  className={`rounded-lg px-3 py-2 text-sm ${
                    state.success
                      ? 'bg-neutral-50 text-neutral-700'
                      : 'bg-red-50 text-red-700'
                  }`}
                >
                  {state.message}
                </p>
              )}
            </div>

            <div className="flex flex-wrap justify-end gap-2 border-t border-neutral-100 bg-neutral-50/70 px-5 py-4 sm:px-6">
              <button
                type="button"
                onClick={() => {
                  setOpen(false)
                  resetForm()
                }}
                disabled={pending}
                className="h-10 rounded-xl border border-neutral-200 bg-white px-4 text-sm font-medium text-neutral-700 transition hover:bg-neutral-50 disabled:opacity-50"
              >
                Cancel
              </button>

              <button
                type="submit"
                disabled={pending || Boolean(fileError)}
                className="inline-flex h-10 items-center justify-center gap-2 rounded-xl bg-neutral-950 px-4 text-sm font-medium text-white transition hover:bg-neutral-800 disabled:cursor-not-allowed disabled:opacity-60"
              >
                <Plus size={15} />
                {pending
                  ? 'Creating group...'
                  : studentCount !== null
                    ? `Create group & import ${studentCount}`
                    : 'Create group'}
              </button>
            </div>
          </form>
        </div>
      )}

      {!open && state.message && (
        <p
          role="status"
          className={`mt-3 rounded-lg px-3 py-2 text-sm ${
            state.success
              ? 'bg-neutral-50 text-neutral-700'
              : 'bg-red-50 text-red-700'
          }`}
        >
          {state.message}
        </p>
      )}
    </section>
  )
}

export { CreateClassGroupFormComponent as CreateClassGroupForm }
export default CreateClassGroupFormComponent
