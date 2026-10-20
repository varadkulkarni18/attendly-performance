
"use client";

import { useMemo, useState } from "react";
import {
  CalendarDays,
  CheckCircle2,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  Clock3,
  Search,
  SlidersHorizontal,
  X,
} from "lucide-react";

type AttendanceRecord = {
  id: number;
  status: string;
  date: string;
  subjectName: string;
  subjectCode: string;
  startTime: string;
  endTime: string;
  groupName: string;
};

type AttendanceViewProps = {
  records: AttendanceRecord[];
};

const LOW_ATTENDANCE_THRESHOLD = 75;
const RECORDS_PER_PAGE = 10;

function formatDate(value: string) {
  if (!value) return "Date unavailable";

  const date = new Date(`${value.slice(0, 10)}T12:00:00+05:30`);

  if (Number.isNaN(date.getTime())) return value;

  return new Intl.DateTimeFormat("en-IN", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    timeZone: "Asia/Kolkata",
  }).format(date);
}

function formatTime(value: string) {
  if (!value) return "";

  const match = value.match(/^(\d{1,2}):(\d{2})/);
  if (!match) return value;

  const hours = Number(match[1]);
  const minutes = Number(match[2]);

  if (hours > 23 || minutes > 59) return value;

  const date = new Date();
  date.setHours(hours, minutes, 0, 0);

  return new Intl.DateTimeFormat("en-IN", {
    hour: "numeric",
    minute: "2-digit",
    hour12: true,
  }).format(date);
}

function getStatusLabel(status: string) {
  switch (status.toLowerCase()) {
    case "present":
      return "Present";
    case "absent":
      return "Absent";
    case "late":
      return "Late";
    case "excused":
      return "Excused";
    default:
      return status;
  }
}

function getStatusClasses(status: string) {
  switch (status.toLowerCase()) {
    case "present":
      return "border-emerald-200 bg-emerald-50 text-emerald-800";
    case "absent":
      return "border-red-200 bg-red-50 text-red-700";
    case "late":
      return "border-amber-200 bg-amber-50 text-amber-800";
    case "excused":
      return "border-neutral-200 bg-neutral-50 text-neutral-500";
    default:
      return "border-neutral-200 bg-white text-neutral-600";
  }
}

function getSubjectKey(record: AttendanceRecord) {
  return `${record.subjectCode}::${record.subjectName}`;
}

export function AttendanceView({ records }: AttendanceViewProps) {
  const [search, setSearch] = useState("");
  const [selectedSubject, setSelectedSubject] = useState("all");
  const [selectedStatus, setSelectedStatus] = useState("all");
  const [fromDate, setFromDate] = useState("");
  const [toDate, setToDate] = useState("");
  const [filtersOpen, setFiltersOpen] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);

  const subjects = useMemo(() => {
    const uniqueSubjects = new Map<string, string>();

    records.forEach((record) => {
      uniqueSubjects.set(
        getSubjectKey(record),
        `${record.subjectCode} — ${record.subjectName}`,
      );
    });

    return Array.from(uniqueSubjects.entries())
      .map(([key, label]) => ({ key, label }))
      .sort((a, b) => a.label.localeCompare(b.label));
  }, [records]);

  const subjectSummaries = useMemo(() => {
    const grouped = new Map<
      string,
      {
        key: string;
        subjectName: string;
        subjectCode: string;
        attended: number;
        absent: number;
        late: number;
        excused: number;
        total: number;
      }
    >();

    records.forEach((record) => {
      const key = getSubjectKey(record);

      if (!grouped.has(key)) {
        grouped.set(key, {
          key,
          subjectName: record.subjectName,
          subjectCode: record.subjectCode,
          attended: 0,
          absent: 0,
          late: 0,
          excused: 0,
          total: 0,
        });
      }

      const summary = grouped.get(key)!;
      const status = record.status.toLowerCase();

      if (status === "excused") {
        summary.excused += 1;
        return;
      }

      if (status === "present") {
        summary.attended += 1;
        summary.total += 1;
      } else if (status === "late") {
        summary.attended += 1;
        summary.late += 1;
        summary.total += 1;
      } else if (status === "absent") {
        summary.absent += 1;
        summary.total += 1;
      }
    });

    return Array.from(grouped.values())
      .map((subject) => ({
        ...subject,
        rate: subject.total
          ? Math.round((subject.attended / subject.total) * 100)
          : null,
      }))
      .sort((a, b) => a.subjectName.localeCompare(b.subjectName));
  }, [records]);

  const filteredRecords = useMemo(() => {
    const normalizedSearch = search.trim().toLowerCase();

    return records.filter((record) => {
      const matchesSearch =
        !normalizedSearch ||
        record.subjectName.toLowerCase().includes(normalizedSearch) ||
        record.subjectCode.toLowerCase().includes(normalizedSearch) ||
        record.groupName.toLowerCase().includes(normalizedSearch);

      const matchesSubject =
        selectedSubject === "all" ||
        getSubjectKey(record) === selectedSubject;

      const matchesStatus =
        selectedStatus === "all" ||
        record.status.toLowerCase() === selectedStatus;

      const recordDate = record.date.slice(0, 10);
      const matchesFromDate = !fromDate || recordDate >= fromDate;
      const matchesToDate = !toDate || recordDate <= toDate;

      return (
        matchesSearch &&
        matchesSubject &&
        matchesStatus &&
        matchesFromDate &&
        matchesToDate
      );
    });
  }, [
    records,
    search,
    selectedSubject,
    selectedStatus,
    fromDate,
    toDate,
  ]);

  const activeFilterCount = [
    selectedSubject !== "all",
    selectedStatus !== "all",
    Boolean(fromDate),
    Boolean(toDate),
  ].filter(Boolean).length;

  const hasActiveFilters = activeFilterCount > 0 || Boolean(search.trim());

  const totalPages = Math.max(
    1,
    Math.ceil(filteredRecords.length / RECORDS_PER_PAGE),
  );
  const safeCurrentPage = Math.min(currentPage, totalPages);
  const pageStart = (safeCurrentPage - 1) * RECORDS_PER_PAGE;
  const paginatedRecords = filteredRecords.slice(
    pageStart,
    pageStart + RECORDS_PER_PAGE,
  );

  const firstVisibleRecord = filteredRecords.length ? pageStart + 1 : 0;
  const lastVisibleRecord = Math.min(
    pageStart + RECORDS_PER_PAGE,
    filteredRecords.length,
  );

  function resetPage() {
    setCurrentPage(1);
  }

  function clearFilters() {
    setSearch("");
    setSelectedSubject("all");
    setSelectedStatus("all");
    setFromDate("");
    setToDate("");
    setCurrentPage(1);
  }

  function clearSubject() {
    setSelectedSubject("all");
    resetPage();
  }

  function clearStatus() {
    setSelectedStatus("all");
    resetPage();
  }

  function clearFromDate() {
    setFromDate("");
    resetPage();
  }

  function clearToDate() {
    setToDate("");
    resetPage();
  }

  function changeFromDate(value: string) {
    setFromDate(value);
    if (value && toDate && value > toDate) setToDate("");
    resetPage();
  }

  function changeToDate(value: string) {
    setToDate(value);
    if (value && fromDate && value < fromDate) setFromDate("");
    resetPage();
  }

  return (
    <div className="space-y-8">
      <section aria-labelledby="subject-summary-heading">
        <div className="mb-3 flex flex-wrap items-end justify-between gap-3">
          <div>
            <h3
              id="subject-summary-heading"
              className="font-display text-xl"
            >
              Subject overview
            </h3>
            <p className="mt-1 text-sm text-neutral-600">
              See how you're doing in each subject at a glance.
            </p>
          </div>

          <p className="text-xs text-neutral-500">
            {subjectSummaries.length}{" "}
            {subjectSummaries.length === 1 ? "subject" : "subjects"}
          </p>
        </div>

        {subjectSummaries.length ? (
          <div className="grid grid-cols-1 gap-x-8 xl:grid-cols-2">
            {subjectSummaries.map((subject) => (
              <article
                key={subject.key}
                className="min-w-0 border-t border-neutral-200 py-3"
              >
                <div className="flex items-center justify-between gap-4">
                  <div className="min-w-0 flex-1">
                    <p
                      className="truncate text-sm font-medium"
                      title={subject.subjectName}
                    >
                      {subject.subjectName}
                    </p>
                    <p className="mt-0.5 text-xs text-neutral-500">
                      {subject.subjectCode}
                    </p>
                  </div>

                  <div className="shrink-0 text-right">
                    <p className="font-display text-xl tabular-nums leading-tight">
                      {subject.rate === null ? "—" : `${subject.rate}%`}
                    </p>
                    <p className="mt-0.5 text-[11px] text-neutral-500">
                      {subject.total
                        ? `${subject.attended} of ${subject.total} attended`
                        : "No applicable records"}
                    </p>
                  </div>
                </div>

                <div
                  className="mt-2 h-1 overflow-hidden bg-neutral-100"
                  role="progressbar"
                  aria-label={`${subject.subjectName} attendance rate`}
                  aria-valuemin={0}
                  aria-valuemax={100}
                  aria-valuenow={subject.rate ?? 0}
                >
                  <div
                    className={`h-full ${
                      subject.rate !== null &&
                      subject.rate < LOW_ATTENDANCE_THRESHOLD
                        ? "bg-red-600"
                        : "bg-neutral-900"
                    }`}
                    style={{ width: `${subject.rate ?? 0}%` }}
                  />
                </div>

                <div className="mt-2 flex flex-wrap items-center gap-x-3 gap-y-1 text-[11px] text-neutral-500">
                  <span>{subject.attended} attended</span>
                  <span>{subject.absent} absent</span>
                  <span>{subject.late} late</span>
                  {subject.excused > 0 && (
                    <span>{subject.excused} excused</span>
                  )}
                  {subject.rate !== null &&
                    subject.rate < LOW_ATTENDANCE_THRESHOLD && (
                      <span className="inline-flex items-center gap-1 text-red-700">
                        <span
                          aria-hidden="true"
                          className="size-1.5 rounded-full bg-red-600"
                        />
                        Below {LOW_ATTENDANCE_THRESHOLD}% reference
                      </span>
                    )}
                </div>
              </article>
            ))}
          </div>
        ) : (
          <div className="border-y border-neutral-200 px-4 py-6">
            <p className="text-sm font-medium">
              Subject summaries will appear here
            </p>
            <p className="mt-1 text-sm text-neutral-600">
              No finalized attendance marks are available yet.
            </p>
          </div>
        )}

        <p className="mt-2 text-xs leading-5 text-neutral-500">
          Present and late count as attended. Excused records are excluded
          from percentages. The 75% line is a reference, not a statement of
          your college&apos;s official policy.
        </p>
      </section>

      <section aria-labelledby="attendance-history-heading">
        <div className="mb-4">
          <h3
            id="attendance-history-heading"
            className="font-display text-xl"
          >
            Attendance history
          </h3>
          <p className="mt-1 text-sm text-neutral-600">
            Search your records or filter by subject, status or date.
          </p>
        </div>

        <div className="space-y-3">
          <div className="flex flex-col gap-2 sm:flex-row">
            <label className="flex h-11 min-w-0 flex-1 items-center gap-2 border border-neutral-200 bg-white px-3 focus-within:border-neutral-500">
              <Search
                size={16}
                aria-hidden="true"
                className="shrink-0 text-neutral-400"
              />
              <input
                type="search"
                value={search}
                onChange={(event) => {
                  setSearch(event.target.value);
                  resetPage();
                }}
                placeholder="Search subjects, codes or classes"
                className="min-w-0 flex-1 bg-transparent text-sm outline-none placeholder:text-neutral-400"
                aria-label="Search attendance records"
              />
              {search && (
                <button
                  type="button"
                  onClick={() => {
                    setSearch("");
                    resetPage();
                  }}
                  aria-label="Clear search"
                  className="text-neutral-400 hover:text-black"
                >
                  <X size={15} />
                </button>
              )}
            </label>

            <div className="relative">
              <button
                type="button"
                aria-expanded={filtersOpen}
                aria-controls="attendance-filter-panel"
                onClick={() => setFiltersOpen((open) => !open)}
                className={`inline-flex h-11 w-full items-center justify-center gap-2 border px-4 text-sm transition-colors sm:w-auto ${
                  filtersOpen || activeFilterCount > 0
                    ? "border-neutral-900 bg-neutral-50 text-neutral-900"
                    : "border-neutral-200 bg-white hover:border-neutral-400"
                }`}
              >
                <SlidersHorizontal size={15} />
                Filters
                {activeFilterCount > 0 && (
                  <span className="inline-flex size-5 items-center justify-center rounded-full bg-neutral-900 text-[10px] text-white">
                    {activeFilterCount}
                  </span>
                )}
                <ChevronDown
                  size={14}
                  className={`transition-transform ${filtersOpen ? "rotate-180" : ""}`}
                />
              </button>

              {filtersOpen && (
                <div
                  id="attendance-filter-panel"
                  className="absolute right-0 top-full z-30 mt-2 w-[min(340px,calc(100vw-2rem))] border border-neutral-200 bg-white p-4 shadow-lg"
                >
                  <div className="mb-4 flex items-center justify-between">
                    <p className="text-sm font-medium">Filter records</p>
                    <button
                      type="button"
                      onClick={() => setFiltersOpen(false)}
                      aria-label="Close filters"
                      className="text-neutral-500 hover:text-black"
                    >
                      <X size={16} />
                    </button>
                  </div>

                  <div className="space-y-4">
                    <label className="block">
                      <span className="mb-1.5 block text-xs text-neutral-600">
                        Subject
                      </span>
                      <select
                        value={selectedSubject}
                        onChange={(event) => {
                          setSelectedSubject(event.target.value);
                          resetPage();
                        }}
                        className="h-10 w-full border border-neutral-200 bg-white px-3 text-sm outline-none focus:border-neutral-500"
                      >
                        <option value="all">All subjects</option>
                        {subjects.map((subject) => (
                          <option key={subject.key} value={subject.key}>
                            {subject.label}
                          </option>
                        ))}
                      </select>
                    </label>

                    <label className="block">
                      <span className="mb-1.5 block text-xs text-neutral-600">
                        Attendance status
                      </span>
                      <select
                        value={selectedStatus}
                        onChange={(event) => {
                          setSelectedStatus(event.target.value);
                          resetPage();
                        }}
                        className="h-10 w-full border border-neutral-200 bg-white px-3 text-sm outline-none focus:border-neutral-500"
                      >
                        <option value="all">All statuses</option>
                        <option value="present">Present</option>
                        <option value="late">Late</option>
                        <option value="absent">Absent</option>
                        <option value="excused">Excused</option>
                      </select>
                    </label>

                    <div className="grid grid-cols-2 gap-3">
                      <label className="block min-w-0">
                        <span className="mb-1.5 block text-xs text-neutral-600">
                          From date
                        </span>
                        <input
                          type="date"
                          value={fromDate}
                          max={toDate || undefined}
                          onChange={(event) =>
                            changeFromDate(event.target.value)
                          }
                          className="h-10 w-full min-w-0 border border-neutral-200 bg-white px-2 text-xs outline-none focus:border-neutral-500"
                        />
                      </label>

                      <label className="block min-w-0">
                        <span className="mb-1.5 block text-xs text-neutral-600">
                          To date
                        </span>
                        <input
                          type="date"
                          value={toDate}
                          min={fromDate || undefined}
                          onChange={(event) =>
                            changeToDate(event.target.value)
                          }
                          className="h-10 w-full min-w-0 border border-neutral-200 bg-white px-2 text-xs outline-none focus:border-neutral-500"
                        />
                      </label>
                    </div>
                  </div>

                  <div className="mt-5 flex items-center justify-between border-t border-neutral-100 pt-3">
                    <button
                      type="button"
                      onClick={clearFilters}
                      disabled={activeFilterCount === 0}
                      className="text-xs text-neutral-600 underline underline-offset-4 hover:text-black disabled:cursor-not-allowed disabled:opacity-40"
                    >
                      Clear all
                    </button>
                    <button
                      type="button"
                      onClick={() => setFiltersOpen(false)}
                      className="bg-neutral-900 px-4 py-2 text-xs text-white hover:bg-neutral-700"
                    >
                      Done
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>

          {hasActiveFilters && (
            <div className="flex flex-wrap items-center gap-2">
              {search.trim() && (
                <button
                  type="button"
                  onClick={() => {
                    setSearch("");
                    resetPage();
                  }}
                  className="inline-flex max-w-full items-center gap-1.5 border border-neutral-200 bg-white px-2.5 py-1.5 text-xs text-neutral-700 hover:border-neutral-400"
                >
                  <span className="max-w-48 truncate">
                    Search: {search.trim()}
                  </span>
                  <X size={12} />
                </button>
              )}

              {selectedSubject !== "all" && (
                <button
                  type="button"
                  onClick={clearSubject}
                  className="inline-flex max-w-full items-center gap-1.5 border border-neutral-200 bg-white px-2.5 py-1.5 text-xs text-neutral-700 hover:border-neutral-400"
                >
                  <span className="max-w-48 truncate">
                    {subjects.find((subject) => subject.key === selectedSubject)
                      ?.label ?? "Subject"}
                  </span>
                  <X size={12} />
                </button>
              )}

              {selectedStatus !== "all" && (
                <button
                  type="button"
                  onClick={clearStatus}
                  className="inline-flex items-center gap-1.5 border border-neutral-200 bg-white px-2.5 py-1.5 text-xs text-neutral-700 hover:border-neutral-400"
                >
                  {getStatusLabel(selectedStatus)}
                  <X size={12} />
                </button>
              )}

              {fromDate && (
                <button
                  type="button"
                  onClick={clearFromDate}
                  className="inline-flex items-center gap-1.5 border border-neutral-200 bg-white px-2.5 py-1.5 text-xs text-neutral-700 hover:border-neutral-400"
                >
                  From {formatDate(fromDate)}
                  <X size={12} />
                </button>
              )}

              {toDate && (
                <button
                  type="button"
                  onClick={clearToDate}
                  className="inline-flex items-center gap-1.5 border border-neutral-200 bg-white px-2.5 py-1.5 text-xs text-neutral-700 hover:border-neutral-400"
                >
                  To {formatDate(toDate)}
                  <X size={12} />
                </button>
              )}

              <button
                type="button"
                onClick={clearFilters}
                className="px-1 py-1 text-xs text-neutral-500 underline underline-offset-4 hover:text-black"
              >
                Clear all
              </button>
            </div>
          )}
        </div>

        <div className="mt-4 flex flex-wrap items-center justify-between gap-2 border-y border-neutral-200 py-3">
          <p className="text-xs text-neutral-600">
            <span className="font-medium text-neutral-900">
              {filteredRecords.length}
            </span>{" "}
            {filteredRecords.length === 1 ? "record" : "records"}
            {hasActiveFilters ? " matching your filters" : ""}
          </p>
          <p className="text-xs text-neutral-500">Newest records first</p>
        </div>

        {paginatedRecords.length ? (
          <>
            <div className="hidden md:block">
              <table className="w-full table-fixed border-collapse text-left">
                <thead>
                  <tr className="border-b border-neutral-200 text-[10px] uppercase tracking-[0.12em] text-neutral-500">
                    <th className="w-[16%] py-3 pr-3 font-medium">Date</th>
                    <th className="w-[42%] px-3 py-3 font-medium">Subject</th>
                    <th className="w-[22%] px-3 py-3 font-medium">Time</th>
                    <th className="w-[20%] py-3 pl-3 text-right font-medium">
                      Status
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {paginatedRecords.map((record) => {
                    const status = record.status.toLowerCase();
                    const timeRange = [
                      formatTime(record.startTime),
                      formatTime(record.endTime),
                    ]
                      .filter(Boolean)
                      .join(" – ");

                    return (
                      <tr
                        key={record.id}
                        className="border-b border-neutral-100 transition-colors last:border-b-0 hover:bg-neutral-50/70"
                      >
                        <td className="py-3.5 pr-3 align-middle text-xs text-neutral-600">
                          {formatDate(record.date)}
                        </td>
                        <td className="px-3 py-3.5 align-middle">
                          <p
                            className="truncate text-sm font-medium text-neutral-900"
                            title={record.subjectName}
                          >
                            {record.subjectName}
                          </p>
                          <p className="mt-1 truncate text-xs text-neutral-500">
                            {record.subjectCode} · {record.groupName}
                          </p>
                        </td>
                        <td className="px-3 py-3.5 align-middle text-xs text-neutral-600">
                          {timeRange || "—"}
                        </td>
                        <td className="py-3.5 pl-3 text-right align-middle">
                          <span
                            className={`inline-flex items-center border px-2 py-1 text-[11px] ${getStatusClasses(status)}`}
                          >
                            {getStatusLabel(status)}
                          </span>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

            <div className="divide-y divide-neutral-100 md:hidden">
              {paginatedRecords.map((record) => {
                const status = record.status.toLowerCase();
                const timeRange = [
                  formatTime(record.startTime),
                  formatTime(record.endTime),
                ]
                  .filter(Boolean)
                  .join(" – ");

                return (
                  <article
                    key={record.id}
                    className="flex items-center gap-3 py-3.5"
                  >
                    <div className="flex size-9 shrink-0 items-center justify-center border border-neutral-200">
                      {status === "present" ? (
                        <CheckCircle2
                          size={16}
                          className="text-emerald-700"
                          strokeWidth={1.5}
                        />
                      ) : status === "late" ? (
                        <Clock3
                          size={16}
                          className="text-amber-700"
                          strokeWidth={1.5}
                        />
                      ) : (
                        <CalendarDays
                          size={16}
                          className="text-neutral-500"
                          strokeWidth={1.5}
                        />
                      )}
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-medium">
                        {record.subjectName}
                      </p>
                      <p className="mt-1 truncate text-xs text-neutral-500">
                        {record.subjectCode} · {record.groupName}
                      </p>
                      <p className="mt-1 text-xs text-neutral-500">
                        {formatDate(record.date)}
                        {timeRange ? ` · ${timeRange}` : ""}
                      </p>
                    </div>
                    <span
                      className={`shrink-0 border px-2 py-1 text-[10px] ${getStatusClasses(status)}`}
                    >
                      {getStatusLabel(status)}
                    </span>
                  </article>
                );
              })}
            </div>

            <div className="mt-2 flex flex-wrap items-center justify-between gap-3 border-t border-neutral-200 py-3">
              <p className="text-xs text-neutral-500">
                Showing {firstVisibleRecord}–{lastVisibleRecord} of{" "}
                {filteredRecords.length}
              </p>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() =>
                    setCurrentPage((page) => Math.max(1, page - 1))
                  }
                  disabled={safeCurrentPage === 1}
                  aria-label="Previous page"
                  className="inline-flex h-8 items-center gap-1 border border-neutral-200 px-2.5 text-xs transition-colors hover:border-neutral-500 disabled:cursor-not-allowed disabled:opacity-40"
                >
                  <ChevronLeft size={14} />
                  Previous
                </button>

                <span className="min-w-12 text-center font-mono text-xs text-neutral-600">
                  {safeCurrentPage} / {totalPages}
                </span>

                <button
                  type="button"
                  onClick={() =>
                    setCurrentPage((page) => Math.min(totalPages, page + 1))
                  }
                  disabled={safeCurrentPage === totalPages}
                  aria-label="Next page"
                  className="inline-flex h-8 items-center gap-1 border border-neutral-200 px-2.5 text-xs transition-colors hover:border-neutral-500 disabled:cursor-not-allowed disabled:opacity-40"
                >
                  Next
                  <ChevronRight size={14} />
                </button>
              </div>
            </div>
          </>
        ) : (
          <div className="py-12 text-center">
            <Search
              size={22}
              strokeWidth={1.4}
              className="mx-auto text-neutral-400"
            />
            <h4 className="mt-3 text-sm font-medium">
              No matching attendance records
            </h4>
            <p className="mt-1 text-sm text-neutral-600">
              Try changing your search or clearing one or more filters.
            </p>
            {hasActiveFilters && (
              <button
                type="button"
                onClick={clearFilters}
                className="mt-4 border border-neutral-300 px-3 py-2 text-xs font-medium transition-colors hover:bg-neutral-50"
              >
                Clear all filters
              </button>
            )}
          </div>
        )}
      </section>
    </div>
  );
}
