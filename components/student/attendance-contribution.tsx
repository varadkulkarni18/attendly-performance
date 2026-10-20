"use client";

import * as React from "react";
import ContributionSkyline, {
  type ContributionDay,
} from "@/components/ui/contribution-skyline";

export type AttendanceContributionRecord = {
  date: string;
  status: string;
};

type AttendanceContributionProps = {
  records: AttendanceContributionRecord[];
  isDemo?: boolean;
};

function toDateKey(value: string) {
  return value.slice(0, 10);
}

/** Builds chart data only from records passed by the existing attendance page. */
export function AttendanceContribution({
  records,
  isDemo = false,
}: AttendanceContributionProps) {
  const data = React.useMemo<ContributionDay[]>(() => {
    const byDate = new Map<string, number>();

    for (const record of records) {
      const date = toDateKey(record.date);
      if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) continue;

      const status = record.status.toLowerCase();
      if (status === "present" || status === "late") {
        byDate.set(date, (byDate.get(date) ?? 0) + 1);
      } else if (!byDate.has(date)) {
        // Keep finalized dates with no attended lectures visible as zero.
        byDate.set(date, 0);
      }
    }

    return Array.from(byDate, ([date, count]) => ({ date, count })).sort(
      (a, b) => a.date.localeCompare(b.date),
    );
  }, [records]);

  return (
    <section className="mt-10" aria-labelledby="attendance-pattern-heading">
      <div className="mb-4 border-b border-neutral-200 pb-3">
        <p className="font-mono text-[10px] uppercase tracking-[0.18em] text-neutral-500">
          Attendance patterns
        </p>
        <h2
          id="attendance-pattern-heading"
          className="mt-1 font-display text-2xl tracking-tight"
        >
          Your year in attendance
        </h2>
        <p className="mt-1 max-w-2xl text-sm leading-6 text-neutral-600">
          Explore attended lectures in a calendar view, or raise the same calendar
          into a 3D skyline. Each cell reflects records already available on this page.
        </p>
      </div>

      <ContributionSkyline
        data={data}
        defaultView="2d"
        showToggle
        showStats={false}
        showLegend
        orbit
        title="Daily attended lectures"
        unit="attended lecture"
        unitPlural="attended lectures"
        palette="github"
        className="rounded-none"
        footer={
          <span>
            {isDemo
              ? "Demo preview · sample records, not official academic data."
              : "Based on recorded attendance. Days without records are not evidence of absence."}
          </span>
        }
      />
    </section>
  );
}
