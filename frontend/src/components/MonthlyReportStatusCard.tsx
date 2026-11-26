import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { draftAllReports, getReportStatus } from "../api";
import { ReportStatus } from "../types";
import { useAuth } from "../auth/AuthContext";
import { useConfirm } from "../confirm/ConfirmContext";
import { Icon } from "./icons";

function monthOptions() {
  const out: { key: string; label: string }[] = [];
  const d = new Date();
  for (let i = -1; i < 6; i++) {
    const m = new Date(d.getFullYear(), d.getMonth() - i, 1);
    out.push({
      key: `${m.getFullYear()}-${String(m.getMonth() + 1).padStart(2, "0")}`,
      label: m.toLocaleDateString("en-AU", { month: "long", year: "numeric" }),
    });
  }
  return out;
}

// Monthly reports for a month: which active projects have one (and whether
// it's been logged to the workbook), and for admins, "Draft every missing
// report", which starts each one from the project and last month.
export default function MonthlyReportStatusCard() {
  const { user } = useAuth();
  const confirm = useConfirm();
  const options = monthOptions();
  const [month, setMonth] = useState(options[1].key);
  const [rows, setRows] = useState<ReportStatus[] | null>(null);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  async function load(m = month) {
    setRows(null);
    setRows(await getReportStatus(m).catch(() => []));
  }
  useEffect(() => {
    load(month);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [month]);

  const missing = (rows ?? []).filter((r) => !r.hasReport);
  const label = options.find((o) => o.key === month)?.label ?? month;

  async function draftAll() {
    if (!(await confirm(`Start a ${label} report for the ${missing.length} project(s) without one? Each is filled from the project and last month, like "New month". Existing reports aren't touched.`))) return;
    setBusy(true);
    setMessage(null);
    try {
      const result = await draftAllReports(month);
      setMessage(`Drafted ${result.created.length} report${result.created.length === 1 ? "" : "s"}.${result.skipped.filter((s) => s.reason !== "already has one").length ? " Some couldn't be drafted." : ""}`);
      await load();
    } catch (err) {
      setMessage(err instanceof Error ? err.message : "Couldn't draft the reports");
    } finally {
      setBusy(false);
    }
  }

  return (
    <section className="card p-4" aria-labelledby="mr-status">
      <div className="flex items-center justify-between gap-3 flex-wrap mb-3">
        <h2 id="mr-status" className="text-sm font-semibold text-slate-900 dark:text-slate-100">
          Monthly reports
        </h2>
        <div className="flex items-center gap-2">
          <select
            value={month}
            onChange={(e) => setMonth(e.target.value)}
            aria-label="Reporting month"
            className="text-sm rounded border border-slate-300 dark:border-slate-600 dark:bg-slate-800 dark:text-slate-100 px-2 py-1"
          >
            {options.map((o) => (
              <option key={o.key} value={o.key}>
                {o.label}
              </option>
            ))}
          </select>
          {user?.role === "ADMIN" && missing.length > 0 && (
            <button
              type="button"
              onClick={draftAll}
              disabled={busy}
              className="px-3 py-1.5 text-sm rounded-lg bg-blue-600 text-white hover:bg-blue-700 disabled:opacity-50"
            >
              {busy ? "Drafting…" : `Draft ${missing.length} missing`}
            </button>
          )}
        </div>
      </div>
      {message && <p className="text-sm text-slate-700 dark:text-slate-300 mb-2">{message}</p>}
      {rows === null ? (
        <p className="text-sm text-slate-500">Loading…</p>
      ) : (
        <>
          <p className="text-xs text-slate-500 dark:text-slate-400 mb-2">
            {rows.length - missing.length} of {rows.length} active projects have a {label} report. Project managers are reminded in the app and the email digest from the 22nd.
          </p>
          <ul className="divide-y divide-slate-100 dark:divide-slate-800">
            {rows.map((r) => (
              <li key={r.projectId} className="py-2 flex items-center gap-3 text-sm">
                <Icon
                  name={r.hasReport ? "checkCircle" : "clock"}
                  className={`w-4 h-4 ${r.hasReport ? "text-emerald-600 dark:text-emerald-400" : "text-amber-500"}`}
                />
                <Link to={`/projects/${r.projectId}?tab=monthly-reporting`} className="flex-1 min-w-0 truncate text-slate-800 dark:text-slate-200 hover:underline">
                  {r.projectName}
                </Link>
                <span className="text-xs text-slate-500 dark:text-slate-400 truncate">{r.projectManager ?? "No manager"}</span>
                <span className="text-xs w-24 text-right text-slate-600 dark:text-slate-300">
                  {r.hasReport ? (r.logged ? "Logged" : "Started") : "Not started"}
                </span>
              </li>
            ))}
          </ul>
        </>
      )}
    </section>
  );
}
