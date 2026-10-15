import { ChangeEvent, useRef, useState } from "react";
import { parseCsv } from "../csvImport";

interface RowResult {
  rowNumber: number;
  error?: string;
}

interface Props<T> {
  entityLabel: string; // e.g. "risk" — used in "Import 3 risks"
  expectedHeaders: string[]; // shown to the user so they know what a row needs
  parseRow: (row: Record<string, string>) => T;
  onImportRow: (item: T) => Promise<void>;
  onImported: () => Promise<void>;
}

// A generic "Import CSV" button — the counterpart to ExportCsvButton.
// Parses the chosen file entirely client-side, shows a confirmation step
// (so pasting the wrong file doesn't silently create garbage rows), then
// creates each row through the same create-one API call the panel's own
// "+ New X" form already uses — no bulk-import endpoint on the backend, so
// existing per-field validation is what actually accepts or rejects a row.
// A bad row fails with that field's own error message rather than aborting
// the whole import; good rows still land.
export default function ImportCsvButton<T>({
  entityLabel,
  expectedHeaders,
  parseRow,
  onImportRow,
  onImported,
}: Props<T>) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [pending, setPending] = useState<{ row: Record<string, string>; rowNumber: number }[] | null>(
    null
  );
  const [parseError, setParseError] = useState<string | null>(null);
  const [importing, setImporting] = useState(false);
  const [results, setResults] = useState<RowResult[] | null>(null);

  function handleFile(e: ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      const rows = parseCsv(String(reader.result));
      if (rows.length === 0) {
        setParseError("No data rows found in that file.");
        return;
      }
      setParseError(null);
      // +2: the header row, then 1-indexed rather than 0-indexed.
      setPending(rows.map((row, i) => ({ row, rowNumber: i + 2 })));
      setResults(null);
    };
    reader.readAsText(file);
  }

  async function handleConfirm() {
    if (!pending) return;
    setImporting(true);
    const newResults: RowResult[] = [];
    for (const { row, rowNumber } of pending) {
      try {
        const item = parseRow(row);
        await onImportRow(item);
        newResults.push({ rowNumber });
      } catch (err) {
        newResults.push({
          rowNumber,
          error: err instanceof Error ? err.message : "Unknown error",
        });
      }
    }
    setImporting(false);
    setResults(newResults);
    setPending(null);
    await onImported();
  }

  const failedCount = results?.filter((r) => r.error).length ?? 0;

  return (
    <>
      <input ref={inputRef} type="file" accept=".csv,text/csv" className="hidden" onChange={handleFile} />
      <button
        onClick={() => inputRef.current?.click()}
        className="px-3 py-1.5 text-sm rounded border border-slate-300 dark:border-slate-600 text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-700"
      >
        Import CSV
      </button>

      {parseError && !pending && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4">
          <div className="bg-white dark:bg-slate-800 rounded-lg shadow-xl w-full max-w-md p-5 space-y-4">
            <p className="text-sm text-red-600 dark:text-red-400">{parseError}</p>
            <div className="flex justify-end">
              <button
                onClick={() => setParseError(null)}
                className="px-4 py-2 text-sm rounded bg-blue-600 text-white hover:bg-blue-700"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {pending && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4">
          <div className="bg-white dark:bg-slate-800 rounded-lg shadow-xl w-full max-w-lg max-h-[90vh] overflow-y-auto p-5 space-y-4">
            <h2 className="text-lg font-semibold text-slate-900 dark:text-slate-100">
              Import {pending.length} {entityLabel}
              {pending.length === 1 ? "" : "s"}
            </h2>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              Expected columns: {expectedHeaders.join(", ")}
            </p>
            <div className="max-h-48 overflow-y-auto border border-slate-200 dark:border-slate-700 rounded text-xs divide-y divide-slate-100 dark:divide-slate-700">
              {pending.slice(0, 5).map(({ row, rowNumber }) => (
                <div key={rowNumber} className="px-2 py-1.5 flex gap-2">
                  <span className="text-slate-400 shrink-0">{rowNumber}</span>
                  <span className="text-slate-700 dark:text-slate-300 truncate">
                    {Object.values(row).slice(0, 3).filter(Boolean).join(" · ")}
                  </span>
                </div>
              ))}
              {pending.length > 5 && (
                <div className="px-2 py-1.5 text-slate-400">…and {pending.length - 5} more</div>
              )}
            </div>
            <div className="flex justify-end gap-2">
              <button
                onClick={() => setPending(null)}
                className="px-4 py-2 text-sm rounded border border-slate-300 dark:border-slate-600 text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-700"
              >
                Cancel
              </button>
              <button
                onClick={handleConfirm}
                disabled={importing}
                className="px-4 py-2 text-sm rounded bg-blue-600 text-white hover:bg-blue-700 disabled:opacity-50"
              >
                {importing ? "Importing…" : `Import ${pending.length}`}
              </button>
            </div>
          </div>
        </div>
      )}

      {results && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4">
          <div className="bg-white dark:bg-slate-800 rounded-lg shadow-xl w-full max-w-lg max-h-[90vh] overflow-y-auto p-5 space-y-4">
            <h2 className="text-lg font-semibold text-slate-900 dark:text-slate-100">Import results</h2>
            <p className="text-sm text-slate-600 dark:text-slate-300">
              {results.length - failedCount} imported, {failedCount} failed.
            </p>
            {failedCount > 0 && (
              <ul className="max-h-48 overflow-y-auto text-xs space-y-1">
                {results
                  .filter((r) => r.error)
                  .map((r) => (
                    <li key={r.rowNumber} className="text-red-600 dark:text-red-400">
                      Row {r.rowNumber}: {r.error}
                    </li>
                  ))}
              </ul>
            )}
            <div className="flex justify-end">
              <button
                onClick={() => setResults(null)}
                className="px-4 py-2 text-sm rounded bg-blue-600 text-white hover:bg-blue-700"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
