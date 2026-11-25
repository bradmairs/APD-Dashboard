// Grey placeholder shapes shown while a page or section loads, so the
// layout appears straight away instead of a "Loading…" line that jumps.

const BAR = "rounded bg-slate-200/80 dark:bg-slate-700/60";

export function SkeletonCard({ lines = 3 }: { lines?: number }) {
  return (
    <div
      aria-hidden="true"
      className="bg-white dark:bg-slate-800 rounded-lg border border-slate-200 dark:border-slate-700 shadow-sm p-4 animate-pulse"
    >
      <div className={`${BAR} h-4 w-40 mb-4`} />
      {Array.from({ length: lines }, (_, i) => (
        <div key={i} className={`${BAR} h-3 mb-2.5`} style={{ width: `${92 - ((i * 17) % 40)}%` }} />
      ))}
    </div>
  );
}

export function SkeletonTable({ rows = 5 }: { rows?: number }) {
  return (
    <div
      aria-hidden="true"
      className="bg-white dark:bg-slate-800 rounded-lg border border-slate-200 dark:border-slate-700 shadow-sm animate-pulse"
    >
      <div className="px-4 py-3 border-b border-slate-200 dark:border-slate-700 flex gap-6">
        {[30, 12, 10, 14, 12].map((w, i) => (
          <div key={i} className={`${BAR} h-3`} style={{ width: `${w}%` }} />
        ))}
      </div>
      {Array.from({ length: rows }, (_, r) => (
        <div key={r} className="px-4 py-4 border-b last:border-b-0 border-slate-100 dark:border-slate-700/60 flex gap-6">
          {[30, 12, 10, 14, 12].map((w, i) => (
            <div key={i} className={`${BAR} h-3`} style={{ width: `${w - ((r + i) % 3) * 2}%` }} />
          ))}
        </div>
      ))}
    </div>
  );
}

// A page-sized placeholder: stat tiles then a table.
export function SkeletonPage() {
  return (
    <div className="space-y-6" role="status" aria-label="Loading">
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {[0, 1, 2, 3].map((i) => (
          <div key={i} className="h-24 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 p-4 animate-pulse">
            <div className={`${BAR} h-3 w-24 mb-3`} />
            <div className={`${BAR} h-6 w-16`} />
          </div>
        ))}
      </div>
      <SkeletonTable rows={6} />
    </div>
  );
}

// Placeholder for a project page's sections.
export function SkeletonSections({ count = 3 }: { count?: number }) {
  return (
    <div className="space-y-6" role="status" aria-label="Loading">
      {Array.from({ length: count }, (_, i) => (
        <SkeletonCard key={i} lines={3 + (i % 2)} />
      ))}
    </div>
  );
}
