
export default function Loading() {
  return (
    <main
      className="grid min-h-screen place-items-center bg-white p-6 text-black"
      role="status"
      aria-live="polite"
    >
      <div className="w-full max-w-sm">
        <div className="flex items-center gap-3">
          <div className="size-3 animate-pulse bg-black" />
          <p className="font-mono text-xs uppercase tracking-[0.2em]">
            Attendly
          </p>
        </div>

        <div className="mt-6 h-1 w-full overflow-hidden bg-neutral-200">
          <div className="h-full w-1/3 animate-[loading_1.2s_ease-in-out_infinite] bg-black" />
        </div>

        <p className="mt-4 text-sm text-neutral-600">
          Loading your workspace...
        </p>

        <style>{`
          @keyframes loading {
            from { transform: translateX(-100%); }
            to { transform: translateX(300%); }
          }
        `}</style>
      </div>
    </main>
  )
}
