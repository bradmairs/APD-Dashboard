import { downloadCsv } from "../csvExport";

interface Props {
  filename: string;
  columns: { header: string; key: string }[];
  rows: Record<string, unknown>[];
  className?: string;
}

// A small "Export CSV" action dropped next to a panel's "+ New X" button.
// Exports whatever rows are currently loaded in the panel (already filtered/
// sorted the same way the panel renders them) — there's no separate backend
// export endpoint since every register's full list is already fetched
// client-side for the panel itself.
export default function ExportCsvButton({ filename, columns, rows, className }: Props) {
  return (
    <button
      onClick={() => downloadCsv(filename, columns, rows)}
      disabled={rows.length === 0}
      className={
        className ||
        "px-3 py-1.5 text-sm rounded border border-slate-300 dark:border-slate-600 text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-700 disabled:opacity-40 disabled:cursor-not-allowed"
      }
      title={rows.length === 0 ? "Nothing to export yet" : `Export ${rows.length} row(s) as CSV`}
    >
      Export CSV
    </button>
  );
}
