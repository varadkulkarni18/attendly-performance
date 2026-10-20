
export function DashboardLoading({ label }: { label: string }) {
  return (
    <section
      role="status"
      aria-live="polite"
      aria-busy="true"
      aria-label={`Loading ${label}`}
      className="mx-auto max-w-6xl"
    >
      <span className="sr-only">Loading {label}…</span>

      <div className="motion-safe:animate-pulse">
        <div className="border-b border-neutral-200 pb-7">
          <div className="h-3 w-36 bg-neutral-200" />
          <div className="mt-5 h-10 w-2/3 max-w-xl bg-neutral-200 sm:h-12" />
          <div className="mt-4 h-4 w-full max-w-2xl bg-neutral-100" />
        </div>

        <div className="mt-8 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          {Array.from({ length: 4 }, (_, index) => (
            <div
              key={index}
              className="border border-neutral-200 p-5 sm:p-6"
            >
              <div className="h-3 w-24 bg-neutral-200" />
              <div className="mt-6 h-9 w-20 bg-neutral-200" />
              <div className="mt-3 h-3 w-32 bg-neutral-100" />
            </div>
          ))}
        </div>

        <div className="mt-10 space-y-3">
          <div className="h-4 w-40 bg-neutral-200" />
          <div className="h-14 w-full bg-neutral-100" />
          <div className="h-14 w-full bg-neutral-100" />
          <div className="h-14 w-full bg-neutral-100" />
        </div>
      </div>
    </section>
  )
}
