import { and, asc, eq, isNull, or } from "drizzle-orm";
import { CalendarDays, Clock3 } from "lucide-react";
import { requireRole } from "@/lib/auth-guard";
import { db } from "@/lib/db";
import { timetableEntries, timetableExceptions } from "@/lib/db/schema";
import { getLinkedStudent } from "@/lib/student-portal";

const DAYS = [
  { label: "Monday", short: "MON", value: 1 },
  { label: "Tuesday", short: "TUE", value: 2 },
  { label: "Wednesday", short: "WED", value: 3 },
  { label: "Thursday", short: "THU", value: 4 },
  { label: "Friday", short: "FRI", value: 5 },
  { label: "Saturday", short: "SAT", value: 6 },
];

const EMPHASIZED_DAYS = new Set([1, 3, 5]);
const PIXELS_PER_MINUTE = 1.05;
const LUNCH_START = 13 * 60;
const LUNCH_END = 14 * 60;

type CalendarEntry = {
  id: string;
  subjectName: string;
  subjectCode: string;
  dayOfWeek: number;
  startTime: string;
  endTime: string;
  room: string | null;
  isSample: boolean;
};

const SAMPLE_SUBJECTS = [
  { name: "Data Structures", code: "DS" },
  { name: "Computer Networks", code: "CN" },
  { name: "Operating Systems", code: "OS" },
  { name: "Software Engineering", code: "SE" },
  { name: "Database Management Systems", code: "DBMS" },
];

const SAMPLE_SLOTS = [
  { start: "09:00", end: "10:00" },
  { start: "10:00", end: "11:00" },
  { start: "11:00", end: "12:00" },
  { start: "12:00", end: "13:00" },
  { start: "14:00", end: "16:00" },
];

function toMinutes(value: string): number | null {
  const match = value.match(/^(\d{1,2}):(\d{2})/);
  if (!match) return null;

  const hours = Number(match[1]);
  const minutes = Number(match[2]);

  if (hours > 23 || minutes > 59) return null;

  return hours * 60 + minutes;
}

function formatTime(value: string): string {
  const minutes = toMinutes(value);
  if (minutes === null) return value;

  const date = new Date();
  date.setHours(Math.floor(minutes / 60), minutes % 60, 0, 0);

  return new Intl.DateTimeFormat("en-IN", {
    hour: "numeric",
    minute: "2-digit",
    hour12: true,
  }).format(date);
}

function formatDate(value: string): string {
  const date = new Date(`${String(value).slice(0, 10)}T12:00:00+05:30`);
  if (Number.isNaN(date.getTime())) return String(value);

  return new Intl.DateTimeFormat("en-IN", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    timeZone: "Asia/Kolkata",
  }).format(date);
}

function getIndiaDate(): string {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Kolkata",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(new Date());
}

function getIndiaWeekday(): number {
  const weekday = new Intl.DateTimeFormat("en-US", {
    timeZone: "Asia/Kolkata",
    weekday: "short",
  }).format(new Date());

  const weekdays: Record<string, number> = {
    Sun: 0,
    Mon: 1,
    Tue: 2,
    Wed: 3,
    Thu: 4,
    Fri: 5,
    Sat: 6,
  };

  return weekdays[weekday] ?? 1;
}

function getIndiaMinutesNow(): number {
  const parts = new Intl.DateTimeFormat("en-GB", {
    timeZone: "Asia/Kolkata",
    hour: "2-digit",
    minute: "2-digit",
    hourCycle: "h23",
  }).formatToParts(new Date());

  const hours = Number(
    parts.find((part) => part.type === "hour")?.value ?? 0,
  );
  const minutes = Number(
    parts.find((part) => part.type === "minute")?.value ?? 0,
  );

  return hours * 60 + minutes;
}

function buildDisplayEntries(
  realEntries: Omit<CalendarEntry, "isSample">[],
): CalendarEntry[] {
  const result: CalendarEntry[] = realEntries.map((entry) => ({
    ...entry,
    isSample: false,
  }));

  for (const day of DAYS) {
    let dayEntries = result.filter(
      (entry) => entry.dayOfWeek === day.value,
    );

    if (dayEntries.length >= 5) continue;

    const usedTimes = dayEntries
      .map((entry) => ({
        start: toMinutes(entry.startTime),
        end: toMinutes(entry.endTime),
      }))
      .filter(
        (time): time is { start: number; end: number } =>
          time.start !== null &&
          time.end !== null &&
          time.end > time.start,
      );

    let sampleIndex = 0;

    for (const slot of SAMPLE_SLOTS) {
      dayEntries = result.filter(
        (entry) => entry.dayOfWeek === day.value,
      );

      if (dayEntries.length >= 5) break;

      const start = toMinutes(slot.start)!;
      const end = toMinutes(slot.end)!;

      const overlaps = usedTimes.some(
        (time) => start < time.end && end > time.start,
      );

      if (overlaps) continue;

      const subject =
        sampleIndex === 4
          ? { name: "Programming Lab", code: "LAB" }
          : SAMPLE_SUBJECTS[
              (day.value + sampleIndex) % SAMPLE_SUBJECTS.length
            ];

      result.push({
        id: `sample-${day.value}-${sampleIndex}`,
        subjectName: subject.name,
        subjectCode: subject.code,
        dayOfWeek: day.value,
        startTime: slot.start,
        endTime: slot.end,
        room: sampleIndex === 4 ? "Computer Lab" : "Room 203",
        isSample: true,
      });

      usedTimes.push({ start, end });
      sampleIndex += 1;
    }
  }

  return result.sort((a, b) => {
    if (a.dayOfWeek !== b.dayOfWeek) {
      return a.dayOfWeek - b.dayOfWeek;
    }

    return (
      (toMinutes(a.startTime) ?? 0) -
      (toMinutes(b.startTime) ?? 0)
    );
  });
}

export default async function StudentTimetablePage() {
  const session = await requireRole("student");
  const email = session.user.email ?? "";
  const student = await getLinkedStudent(email);

  const records = student
    ? await db
        .select({
          id: timetableEntries.id,
          subjectName: timetableEntries.subjectName,
          subjectCode: timetableEntries.subjectCode,
          dayOfWeek: timetableEntries.dayOfWeek,
          startTime: timetableEntries.startTime,
          endTime: timetableEntries.endTime,
          room: timetableEntries.room,
        })
        .from(timetableEntries)
        .where(
          and(
            eq(timetableEntries.classGroupId, student.groupId),
            eq(timetableEntries.active, true),
          ),
        )
        .orderBy(
          asc(timetableEntries.dayOfWeek),
          asc(timetableEntries.startTime),
        )
    : [];

 
  const exceptions = student
    ? await db
        .select({
          id: timetableExceptions.id,
          date: timetableExceptions.date,
          timetableEntryId: timetableExceptions.timetableEntryId,
          type: timetableExceptions.type,
          note: timetableExceptions.note,
        })
        .from(timetableExceptions)
        .where(
          or(
            isNull(timetableExceptions.timetableEntryId),
            ...records.map((entry) =>
              eq(timetableExceptions.timetableEntryId, entry.id)
            )
          )
        )
        .orderBy(asc(timetableExceptions.date))
    : [];

  const realEntries: Omit<CalendarEntry, "isSample">[] = records
    .filter((entry) => DAYS.some((day) => day.value === entry.dayOfWeek))
    .map((entry) => ({
      ...entry,
      id: String(entry.id),
      startTime: String(entry.startTime),
      endTime: String(entry.endTime),
    }));

  const displayEntries = buildDisplayEntries(realEntries);
  const today = getIndiaDate();
  const todayDay = getIndiaWeekday();
  const nowMinutes = getIndiaMinutesNow();

  // A date-specific holiday overrides the recurring timetable for today's sessions.
  const todayHoliday = exceptions.find(
    (event) =>
      String(event.date).slice(0, 10) === today &&
      String(event.type).toLowerCase().includes("holiday"),
  );

  const todayLabel = new Intl.DateTimeFormat("en-IN", {
    timeZone: "Asia/Kolkata",
    weekday: "long",
  }).format(new Date());

  const todayEntries = todayHoliday
    ? []
    : displayEntries
        .filter((entry) => entry.dayOfWeek === todayDay)
        .map((entry) => {
          const start = toMinutes(entry.startTime);
          const end = toMinutes(entry.endTime);

          return {
            ...entry,
            start: start ?? 0,
            end: end ?? 0,
          };
        })
        .filter((entry) => entry.end > nowMinutes)
        .sort((a, b) => a.start - b.start);

  const inProgressEntry = todayEntries.find(
    (entry) => entry.start <= nowMinutes && entry.end > nowMinutes,
  );
  const nextUpcomingEntry = todayEntries.find(
    (entry) => entry.start > nowMinutes,
  );
  const sidebarEntries = [inProgressEntry, nextUpcomingEntry].filter(
    (entry, index, entries): entry is NonNullable<typeof entry> =>
      Boolean(entry) && entries.findIndex((candidate) => candidate?.id === entry?.id) === index,
  );

  const upcomingExceptions = exceptions.filter(
    (event) => String(event.date).slice(0, 10) >= today,
  );

  const validTimes = displayEntries.flatMap((entry) => {
    const start = toMinutes(entry.startTime);
    const end = toMinutes(entry.endTime);

    return start !== null && end !== null && end > start
      ? [{ start, end }]
      : [];
  });

  const firstHour = validTimes.length
    ? Math.floor(Math.min(...validTimes.map((time) => time.start)) / 60)
    : 9;

  const lastHour = validTimes.length
    ? Math.ceil(Math.max(...validTimes.map((time) => time.end)) / 60)
    : 16;

  const calendarStart = Math.max(0, firstHour * 60);
  const calendarEnd = Math.min(
    1440,
    Math.max(calendarStart + 60, lastHour * 60),
  );

  const calendarHeight =
    (calendarEnd - calendarStart) * PIXELS_PER_MINUTE;

  const hourMarkers = Array.from(
    {
      length: Math.ceil((calendarEnd - calendarStart) / 60) + 1,
    },
    (_, index) => calendarStart + index * 60,
  ).filter((minutes) => minutes <= calendarEnd);

  const totalMinutes = validTimes.reduce(
    (total, time) => total + time.end - time.start,
    0,
  );

  const totalHours = totalMinutes / 60;

  return (
    
      <div className="mx-auto w-full max-w-7xl min-w-0">
        <header className="border-b border-neutral-300 pb-5">
          <p className="font-mono text-[10px] uppercase tracking-[0.2em] text-neutral-500">
            Academic schedule / Weekly calendar
          </p>
          <h1 className="mt-3 font-display text-4xl tracking-tight sm:text-5xl">
            My timetable<span className="italic">.</span>
          </h1>
          <p className="mt-2 max-w-2xl text-sm leading-6 text-neutral-600">
            Your weekly class calendar, lecture timings and lab sessions.
          </p>
        </header>

        {!student ? (
          <div className="mt-8 border border-neutral-300 px-6 py-12 text-center">
            <CalendarDays
              size={26}
              strokeWidth={1.4}
              className="mx-auto text-neutral-400"
            />
            <h2 className="mt-4 font-display text-2xl">
              No timetable available yet
            </h2>
            <p className="mx-auto mt-2 max-w-md text-sm leading-6 text-neutral-600">
              Your timetable will appear when your account is linked to a class
              group with active timetable entries.
            </p>
          </div>
        ) : (
          <>
                          <section className="mt-6 grid grid-cols-2 border border-neutral-300 sm:grid-cols-3">
                              <div className="p-4 sm:p-5">
                                  <p className="text-xs text-neutral-500">Weekly sessions</p>
                                  <p className="mt-2 font-display text-3xl tabular-nums">
                                      {displayEntries.length}
                                  </p>
                              </div>

                              <div className="border-l border-neutral-300 p-4 sm:p-5">
                                  <p className="text-xs text-neutral-500">Scheduled hours</p>
                                  <p className="mt-2 font-display text-3xl tabular-nums">
                                      {Number.isInteger(totalHours) ? totalHours : totalHours.toFixed(1)}
                                  </p>
                              </div>

                              <div className="col-span-2 border-t border-neutral-300 p-4 sm:col-span-1 sm:border-l sm:border-t-0 sm:p-5">
                                  <p className="text-xs text-neutral-500">Today's sessions</p>
                                  <p className="mt-2 font-display text-3xl tabular-nums">
                                      {todayEntries.length}
                                  </p>
                              </div>
                          </section>

            <div className="mt-9 grid min-w-0 gap-9 xl:grid-cols-[minmax(0,1fr)_280px]">
              <section className="min-w-0">
                <div className="flex flex-wrap items-end justify-between gap-3 border-b border-neutral-300 pb-4">
                  <div className="min-w-0">
                    <p className="font-mono text-[10px] uppercase tracking-[0.18em] text-neutral-500">
                      Weekly calendar
                    </p>
                    <h2 className="mt-1 font-display text-2xl">
                      {student.groupName} · Section {student.section}
                    </h2>
                  </div>
                  <p className="text-xs text-neutral-500">
                    Monday – Saturday
                  </p>
                </div>

                {displayEntries.length > 0 && validTimes.length > 0 ? (
                  <div className="mt-4 w-full min-w-0 overflow-hidden border border-neutral-400">
                    <div className="w-full min-w-0">
                      <div className="grid grid-cols-[48px_repeat(6,minmax(0,1fr))] border-b border-neutral-400">
                        <div className="border-r border-neutral-400 bg-neutral-50 px-1 py-3">
                          <span className="font-mono text-[8px] tracking-wider text-neutral-600">
                            IST
                          </span>
                        </div>

                        {DAYS.map((day) => (
                          <div
                            key={day.value}
                            className={`min-w-0 border-r border-neutral-300 px-0.5 py-3 text-center last:border-r-0 ${
                              EMPHASIZED_DAYS.has(day.value)
                                ? "bg-stone-200"
                                : "bg-neutral-50"
                            }`}
                          >
                            <p className="font-mono text-[8px] tracking-wider text-neutral-600">
                              {day.short}
                            </p>
                            <p className="mt-1 text-[10px] font-normal text-neutral-900 sm:text-xs">
                              {day.label}
                            </p>
                          </div>
                        ))}
                      </div>

                      <div className="grid grid-cols-[48px_repeat(6,minmax(0,1fr))]">
                        <div
                          className="relative min-w-0 border-r border-neutral-400 bg-neutral-50"
                          style={{ height: calendarHeight }}
                        >
                          {hourMarkers.map((minutes) => (
                            <div
                              key={minutes}
                              className="absolute right-0 left-0 z-10 -translate-y-1/2 pr-1 text-right"
                              style={{
                                top:
                                  (minutes - calendarStart) *
                                  PIXELS_PER_MINUTE,
                              }}
                            >
                              <span className="whitespace-nowrap bg-neutral-50 px-0.5 font-mono text-[7px] tabular-nums text-neutral-700 sm:text-[9px]">
                                {formatTime(
                                  `${String(Math.floor(minutes / 60)).padStart(2, "0")}:${String(minutes % 60).padStart(2, "0")}`,
                                )}
                              </span>
                            </div>
                          ))}
                        </div>

                        {DAYS.map((day) => {
                          const dayEntries = displayEntries.filter(
                            (entry) => entry.dayOfWeek === day.value,
                          );

                          return (
                            <div
                              key={day.value}
                              className={`relative min-w-0 border-r border-neutral-300 last:border-r-0 ${
                                EMPHASIZED_DAYS.has(day.value)
                                  ? "bg-stone-50"
                                  : "bg-white"
                              }`}
                              style={{ height: calendarHeight }}
                            >
                              {hourMarkers.map((minutes) => (
                                <div
                                  key={minutes}
                                  className="pointer-events-none absolute right-0 left-0 border-t border-neutral-300"
                                  style={{
                                    top:
                                      (minutes - calendarStart) *
                                      PIXELS_PER_MINUTE,
                                  }}
                                />
                              ))}

                              {dayEntries.map((entry) => {
                                const start = toMinutes(entry.startTime);
                                const end = toMinutes(entry.endTime);

                                if (
                                  start === null ||
                                  end === null ||
                                  end <= start
                                ) {
                                  return null;
                                }

                                const top =
                                  (start - calendarStart) *
                                  PIXELS_PER_MINUTE;
                                const height =
                                  (end - start) * PIXELS_PER_MINUTE;
                                const isLab =
                                  end - start >= 90 ||
                                  /lab|practical/i.test(entry.subjectName);

                                return (
                                  <article
                                    key={entry.id}
                                    title={`${entry.subjectName} · ${formatTime(entry.startTime)}–${formatTime(entry.endTime)}`}
                                    className={`absolute right-0.5 left-0.5 z-10 min-w-0 overflow-hidden border px-1 py-1 ${
                                      entry.isSample
                                        ? "border-neutral-400 bg-neutral-100"
                                        : isLab
                                          ? "border-stone-500 bg-stone-200"
                                          : "border-neutral-500 bg-white"
                                    }`}
                                    style={{
                                      top,
                                      height: Math.max(height, 36),
                                    }}
                                  >
                                    <p className="break-words text-[9px] font-normal leading-[1.2] text-neutral-950 sm:text-[10px]">
                                      {entry.subjectName}
                                    </p>
                                    <p className="mt-1 truncate text-[8px] leading-3 text-neutral-700 sm:text-[9px]">
                                      {entry.subjectCode}
                                    </p>
                                  </article>
                                );
                              })}

                              {LUNCH_START >= calendarStart &&
                                LUNCH_END <= calendarEnd &&
                                !dayEntries.some((entry) => {
                                  const start = toMinutes(entry.startTime);
                                  const end = toMinutes(entry.endTime);

                                  return (
                                    start !== null &&
                                    end !== null &&
                                    start < LUNCH_END &&
                                    end > LUNCH_START
                                  );
                                }) && (
                                  <div
                                    className="pointer-events-none absolute right-0 left-0 flex items-center justify-center border-y border-neutral-200 bg-neutral-50/80"
                                    style={{
                                      top:
                                        (LUNCH_START - calendarStart) *
                                        PIXELS_PER_MINUTE,
                                      height:
                                        (LUNCH_END - LUNCH_START) *
                                        PIXELS_PER_MINUTE,
                                    }}
                                  >
                                    <span className="text-center text-[8px] text-neutral-500 sm:text-[9px]">
                                      Lunch
                                    </span>
                                  </div>
                                )}
                            </div>
                          );
                        })}
                      </div>

                      <div className="flex flex-wrap items-center gap-x-3 gap-y-2 border-t border-neutral-400 bg-neutral-50 px-2 py-3 sm:gap-x-5 sm:px-3">
                        <span className="inline-flex items-center gap-1.5 text-[9px] text-neutral-600 sm:gap-2 sm:text-[10px]">
                          <span className="size-3 shrink-0 border border-neutral-500 bg-white" />
                          Lecture
                        </span>
                        <span className="inline-flex items-center gap-1.5 text-[9px] text-neutral-600 sm:gap-2 sm:text-[10px]">
                          <span className="size-3 shrink-0 border border-stone-500 bg-stone-200" />
                          Lab / practical
                        </span>
                        <span className="text-[9px] text-neutral-500 sm:text-[10px]">
                          Times shown in IST
                        </span>
                      </div>
                    </div>
                  </div>
                ) : (
                  <p className="py-10 text-sm text-neutral-600">
                    No timetable entries have valid times to display.
                  </p>
                )}
              </section>

              <aside className="min-w-0">
                <section className="border-b border-neutral-300 pb-4">
                  <p className="font-mono text-[10px] uppercase tracking-[0.18em] text-neutral-500">
                    Coming up today
                  </p>
                  <h2 className="mt-1 font-display text-2xl">
                    {todayLabel}
                  </h2>
                  <p className="mt-1 text-sm text-neutral-500">
                    {formatDate(today)}
                  </p>
                </section>

                
                {todayHoliday ? (
                  <p className="border-b border-neutral-300 py-5 text-sm leading-6 text-neutral-600">
                    Today is marked as a holiday
                    {todayHoliday.note ? `: ${todayHoliday.note}` : "."} No
                    lectures are scheduled for today.
                  </p>
                ) : sidebarEntries.length > 0 ? (
                  sidebarEntries.map((entry) => {
                    const isInProgress =
                      entry.start <= nowMinutes && entry.end > nowMinutes

                    return (
                      <article
                        key={entry.id}
                        className="border-b border-neutral-300 py-4"
                      >
                        <div className="flex items-start gap-3">
                          <Clock3
                            size={16}
                            className="mt-0.5 shrink-0 text-neutral-600"
                          />
                          <div className="min-w-0 flex-1">
                            <p className="text-sm font-medium">
                              {entry.subjectName}
                            </p>
                            <p className="mt-1 text-xs text-neutral-600">
                              {entry.subjectCode}
                            </p>
                            <p className="mt-2 text-xs tabular-nums text-neutral-700">
                              {formatTime(entry.startTime)} – {formatTime(entry.endTime)}
                            </p>
                            <p className="mt-2 font-mono text-[10px] font-medium uppercase tracking-wide text-neutral-500">
                              {isInProgress ? 'In progress' : 'Upcoming'}
                            </p>
                          </div>
                        </div>
                      </article>
                    )
                  })
                ) : (
                  <p className="border-b border-neutral-300 py-5 text-sm leading-6 text-neutral-600">
                    No more lectures scheduled for today.
                  </p>
                )}

                <section className="mt-8 border-b border-neutral-300 pb-3">
                  <p className="font-mono text-[10px] uppercase tracking-[0.18em] text-neutral-500">
                    Academic calendar
                  </p>
                  <h2 className="mt-1 font-display text-2xl">
                    Upcoming events
                  </h2>
                </section>

                {upcomingExceptions.length > 0 ? (
                  upcomingExceptions.map((event) => (
                    <article
                      key={event.id}
                      className="border-b border-neutral-300 py-4"
                    >
                      <p className="font-mono text-xs text-neutral-600">
                        {formatDate(String(event.date))}
                      </p>
                      <p className="mt-1 text-sm font-medium">
                        {event.note || event.type.replaceAll("_", " ")}
                      </p>
                      <p className="mt-1 text-xs capitalize text-neutral-600">
                        {event.type.replaceAll("_", " ")}
                      </p>
                    </article>
                  ))
                ) : (
                  <p className="py-5 text-sm leading-6 text-neutral-600">
                    No upcoming calendar events have been recorded for your
                    timetable.
                  </p>
                )}

                <p className="mt-6 border-t border-neutral-300 pt-4 text-xs leading-5 text-neutral-600">
                  Sample timetable entries are for layout preview only and are
                  not saved to official attendance records.
                </p>
              </aside>
            </div>
          </>
        )}
      </div>
    
  );
}