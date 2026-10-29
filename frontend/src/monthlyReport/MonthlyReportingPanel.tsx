import { useEffect, useMemo, useRef, useState } from "react";
import { Link } from "react-router-dom";
import {
  createMonthlyReport,
  deleteMonthlyReport,
  disconnectSharePoint,
  getMonthlyReportDraft,
  getMonthlyReportWorkbook,
  getSharePointStatus,
  linkSharePointWorkbook,
  listSharePointReportFiles,
  monthlyReportWorkbookDownloadUrl,
  pollSharePointConnect,
  pullSharePointWorkbook,
  refreshMonthlyReport,
  startSharePointConnect,
  syncMonthlyReport,
  unlinkMonthlyReportWorkbook,
  updateMonthlyReport,
  uploadMonthlyReportWorkbook,
  getMonthlyReports,
} from "../api";
import {
  MonthlyReport,
  MonthlyReportWorkbook,
  Project,
  SharePointFile,
  SharePointStatus,
  User,
  WorkbookImportSummary,
} from "../types";
import { canModifyReport } from "../permissions";
import { useConfirm } from "../confirm/ConfirmContext";
import { downloadElementAsPdf } from "../pdfExport";
import { formatDateTime } from "../format";
import MonthlyReportSheet from "./MonthlyReportSheet";
import { MonthlyReportContent, monthLabel } from "./model";

interface Props {
  project: Project;
  reports: MonthlyReport[];
  currentUser: User | null;
  onReportsChange: (reports: MonthlyReport[]) => void;
}

type Selection =
  | { kind: "saved"; id: string }
  | { kind: "draft"; month: string };

function currentMonth(): string {
  return new Date().toISOString().slice(0, 7);
}

function addMonth(month: string, delta: number): string {
  const [y, m] = month.split("-").map(Number);
  const d = new Date(Date.UTC(y, m - 1 + delta, 1));
  return d.toISOString().slice(0, 7);
}

const btn =
  "px-3 py-1.5 text-sm rounded border border-slate-300 dark:border-slate-600 text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-700 disabled:opacity-50";
const primary = "px-3 py-1.5 text-sm rounded bg-blue-600 text-white hover:bg-blue-700 disabled:opacity-50";

function summaryText(s: WorkbookImportSummary): string {
  const parts = [];
  if (s.created.length) parts.push(`added ${s.created.join(", ")}`);
  if (s.updated.length) parts.push(`updated ${s.updated.join(", ")}`);
  if (s.skipped.length) parts.push(`kept the dashboard's ${s.skipped.join(", ")}`);
  return parts.length ? `Imported: ${parts.join("; ")}.` : "Nothing to import.";
}

export default function MonthlyReportingPanel({ project, reports, currentUser, onReportsChange }: Props) {
  const confirm = useConfirm();
  const sorted = useMemo(
    () => [...reports].sort((a, b) => b.reportingMonth.localeCompare(a.reportingMonth)),
    [reports]
  );
  const [selection, setSelection] = useState<Selection | null>(
    sorted[0] ? { kind: "saved", id: sorted[0].id } : null
  );
  const [content, setContent] = useState<MonthlyReportContent | null>(null);
  const [autoFields, setAutoFields] = useState<Set<string>>(new Set());
  const [dirty, setDirty] = useState(false);
  const [busy, setBusy] = useState<string | null>(null);
  const [message, setMessage] = useState<{ tone: "ok" | "error"; text: string } | null>(null);
  const [newMonth, setNewMonth] = useState(() =>
    sorted[0] ? addMonth(sorted[0].reportingMonth.slice(0, 7), 1) : currentMonth()
  );
  const [workbook, setWorkbook] = useState<MonthlyReportWorkbook | null>(null);
  const [sharePoint, setSharePoint] = useState<SharePointStatus | null>(null);
  const [deviceCode, setDeviceCode] = useState<{ userCode: string; verificationUri: string } | null>(null);
  const [files, setFiles] = useState<SharePointFile[] | null>(null);
  const [logOnSync, setLogOnSync] = useState(true);
  const fileInput = useRef<HTMLInputElement>(null);

  const saved = selection?.kind === "saved" ? reports.find((r) => r.id === selection.id) ?? null : null;
  const reportingMonth = selection?.kind === "draft" ? selection.month : saved?.reportingMonth.slice(0, 7) ?? null;
  const canEdit = selection?.kind === "draft" || (saved ? canModifyReport(saved, currentUser) : false);
  const isViewer = currentUser?.role === "VIEWER";

  useEffect(() => {
    getMonthlyReportWorkbook(project.id).then(setWorkbook).catch(() => setWorkbook(null));
    getSharePointStatus().then(setSharePoint).catch(() => setSharePoint(null));
  }, [project.id]);

  // Load the selected month's content.
  // (Messages are cleared by the user's own actions, not here, so "Saved"
  // survives the switch from the draft to the saved report.)
  useEffect(() => {
    if (!selection) {
      setContent(null);
      return;
    }
    if (selection.kind === "saved") {
      const r = reports.find((x) => x.id === selection.id);
      setContent(r ? r.content : null);
      setAutoFields(new Set());
      setDirty(false);
      return;
    }
    setBusy("Filling from the project…");
    getMonthlyReportDraft(project.id, selection.month)
      .then((d) => {
        setContent(d.content);
        setAutoFields(new Set(d.autoFields));
        setDirty(true);
      })
      .catch((e) => setMessage({ tone: "error", text: e.message }))
      .finally(() => setBusy(null));
    // Only when the selection itself changes.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selection?.kind === "saved" ? selection.id : selection?.month, selection?.kind]);

  async function reloadReports(selectId?: string) {
    const fresh = await getMonthlyReports(project.id);
    onReportsChange(fresh);
    if (selectId) setSelection({ kind: "saved", id: selectId });
    else if (!fresh.find((r) => selection?.kind === "saved" && r.id === selection.id)) {
      setSelection(fresh[0] ? { kind: "saved", id: fresh[0].id } : null);
    }
    return fresh;
  }

  async function run<T>(label: string, fn: () => Promise<T>): Promise<T | undefined> {
    setBusy(label);
    setMessage(null);
    try {
      return await fn();
    } catch (e) {
      setMessage({ tone: "error", text: (e as Error).message });
      return undefined;
    } finally {
      setBusy(null);
    }
  }

  async function confirmDiscard(): Promise<boolean> {
    return !dirty || (await confirm("Discard your unsaved changes to this report?"));
  }

  async function startNewMonth() {
    if (!(await confirmDiscard())) return;
    const existing = reports.find((r) => r.reportingMonth.slice(0, 7) === newMonth);
    if (existing) {
      setSelection({ kind: "saved", id: existing.id });
      setMessage({ tone: "ok", text: `${monthLabel(newMonth)} already has a report — opened it.` });
      return;
    }
    setSelection({ kind: "draft", month: newMonth });
  }

  async function save() {
    if (!content || !reportingMonth) return;
    await run("Saving…", async () => {
      if (selection?.kind === "draft") {
        const created = await createMonthlyReport(project.id, { reportingMonth, content });
        setDirty(false);
        await reloadReports(created.id);
        setMessage({ tone: "ok", text: `${monthLabel(reportingMonth)} report saved.` });
      } else if (saved) {
        await updateMonthlyReport(saved.id, { content });
        setDirty(false);
        await reloadReports(saved.id);
        setMessage({ tone: "ok", text: "Saved." });
      }
    });
  }

  async function refreshFromProject() {
    if (!saved) return;
    if (dirty && !(await confirm("Refresh from the project? Unsaved edits to cells the project fills will be replaced."))) return;
    const d = await run("Refreshing from the project…", () => refreshMonthlyReport(saved.id));
    if (!d) return;
    setContent(d.content);
    setAutoFields(new Set(d.autoFields));
    setDirty(true);
    setMessage({ tone: "ok", text: "Refreshed from the project. Review the blue-cornered cells, then save." });
  }

  async function remove() {
    if (!saved) return;
    if (!(await confirm(`Delete the ${monthLabel(saved.reportingMonth.slice(0, 7))} report? This cannot be undone.`))) return;
    await run("Deleting…", async () => {
      await deleteMonthlyReport(saved.id);
      setSelection(null);
      await reloadReports();
    });
  }

  async function uploadWorkbook(file: File) {
    if (!(await confirmDiscard())) return;
    const result = await run("Importing the workbook…", () => uploadMonthlyReportWorkbook(project.id, file));
    if (!result) return;
    setWorkbook(result.workbook);
    setDirty(false);
    await reloadReports();
    setMessage({ tone: "ok", text: summaryText(result) });
  }

  async function syncToWorkbook() {
    if (!saved || !workbook?.source) return;
    if (dirty) {
      setMessage({ tone: "error", text: "Save the report before writing it to the workbook." });
      return;
    }
    const result = await run(
      workbook.source === "sharepoint" ? "Writing to SharePoint…" : "Writing to the workbook…",
      () => syncMonthlyReport(saved.id, logOnSync)
    );
    if (!result) return;
    await reloadReports(saved.id);
    const where = result.target === "sharepoint" ? "SharePoint" : "the workbook";
    const logged = result.logged ? ` and ${result.logged === "replaced" ? "updated" : "added"} it on the Reporting Log` : "";
    setMessage({ tone: "ok", text: `Wrote ${result.cellsChanged} changed cell${result.cellsChanged === 1 ? "" : "s"} to ${where}${logged}.` });
  }

  async function pull() {
    if (!(await confirmDiscard())) return;
    const result = await run("Pulling from SharePoint…", () => pullSharePointWorkbook(project.id));
    if (!result) return;
    setDirty(false);
    await reloadReports();
    setMessage({ tone: "ok", text: summaryText(result) });
  }

  async function connect() {
    const code = await run("Starting Microsoft sign-in…", startSharePointConnect);
    if (!code) return;
    setDeviceCode(code);
    const started = Date.now();
    const poll = async (): Promise<void> => {
      if (Date.now() - started > code.expiresIn * 1000) {
        setDeviceCode(null);
        setMessage({ tone: "error", text: "The sign-in code expired. Try again." });
        return;
      }
      try {
        const { status } = await pollSharePointConnect();
        if (status === "connected") {
          setDeviceCode(null);
          setSharePoint(await getSharePointStatus());
          setMessage({ tone: "ok", text: "Connected to SharePoint." });
          return;
        }
        if (status === "expired") {
          setDeviceCode(null);
          return;
        }
      } catch (e) {
        setDeviceCode(null);
        setMessage({ tone: "error", text: (e as Error).message });
        return;
      }
      setTimeout(poll, code.interval * 1000);
    };
    setTimeout(poll, code.interval * 1000);
  }

  async function chooseFile() {
    const result = await run("Listing the reports folder…", () => listSharePointReportFiles(project.id));
    if (result) setFiles(result.files);
  }

  async function link(file: SharePointFile) {
    const info = await run("Linking…", () => linkSharePointWorkbook(project.id, file));
    if (!info) return;
    setWorkbook(info);
    setFiles(null);
    setMessage({ tone: "ok", text: `Linked ${info.fileName}. Pull to bring its months in.` });
  }

  async function unlink() {
    if (!(await confirm("Unlink this project's workbook? The workbook itself isn't changed or deleted."))) return;
    await run("Unlinking…", () => unlinkMonthlyReportWorkbook(project.id));
    setWorkbook({ source: null, fileName: null, webUrl: null });
  }

  async function pdf() {
    if (!reportingMonth) return;
    await run("Generating PDF…", () =>
      downloadElementAsPdf("monthly-report-sheet", `Monthly Report - ${project.name} - ${monthLabel(reportingMonth)}`)
    );
  }

  const spReady = sharePoint?.configured && sharePoint.connected;

  return (
    <div className="space-y-4">
      {/* Month picker and report actions */}
      <div className="bg-white dark:bg-slate-800 rounded-lg border border-slate-200 dark:border-slate-700 shadow-sm p-4">
        <div className="flex flex-wrap items-end gap-3">
          <label className="text-sm">
            <span className="block text-xs text-slate-500 dark:text-slate-400 mb-1">Report</span>
            <select
              className="rounded border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-900 px-2 py-1.5 text-sm"
              value={selection?.kind === "saved" ? selection.id : selection?.kind === "draft" ? "__draft" : ""}
              onChange={async (e) => {
                if (!(await confirmDiscard())) return;
                const id = e.target.value;
                setMessage(null);
                if (id && id !== "__draft") setSelection({ kind: "saved", id });
              }}
            >
              {!selection && <option value="">No reports yet</option>}
              {selection?.kind === "draft" && <option value="__draft">{monthLabel(selection.month)} (new, unsaved)</option>}
              {sorted.map((r) => (
                <option key={r.id} value={r.id}>
                  {monthLabel(r.reportingMonth.slice(0, 7))}
                  {r.loggedAt ? " ✓ logged" : ""}
                </option>
              ))}
            </select>
          </label>
          {!isViewer && (
            <div className="flex items-end gap-2">
              <label className="text-sm">
                <span className="block text-xs text-slate-500 dark:text-slate-400 mb-1">New month</span>
                <input
                  type="month"
                  className="rounded border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-900 px-2 py-1 text-sm"
                  value={newMonth}
                  onChange={(e) => setNewMonth(e.target.value)}
                />
              </label>
              <button className={btn} onClick={startNewMonth} disabled={!!busy || !newMonth}>
                + Start report
              </button>
            </div>
          )}
          <div className="ml-auto flex flex-wrap items-center gap-2">
            {canEdit && content && (
              <button className={primary} onClick={save} disabled={!!busy || !dirty}>
                {selection?.kind === "draft" ? "Save report" : dirty ? "Save changes" : "Saved"}
              </button>
            )}
            {saved && canEdit && (
              <button className={btn} onClick={refreshFromProject} disabled={!!busy}>
                Refresh from project
              </button>
            )}
            {content && (
              <button className={btn} onClick={pdf} disabled={!!busy}>
                Download PDF
              </button>
            )}
            {saved && (
              <Link to={`/projects/${project.id}/reports/${saved.id}`} className={btn}>
                Print view
              </Link>
            )}
            {saved && canEdit && (
              <button className={`${btn} text-red-600 dark:text-red-400`} onClick={remove} disabled={!!busy}>
                Delete
              </button>
            )}
          </div>
        </div>
        {(busy || message) && (
          <p
            className={`mt-3 text-sm ${
              busy ? "text-slate-500 dark:text-slate-400" : message?.tone === "error" ? "text-red-600 dark:text-red-400" : "text-green-700 dark:text-green-400"
            }`}
            role="status"
          >
            {busy ?? message?.text}
          </p>
        )}
        {autoFields.size > 0 && (
          <p className="mt-2 text-xs text-slate-500 dark:text-slate-400">
            <span
              className="inline-block align-middle mr-1"
              style={{ width: 0, height: 0, borderStyle: "solid", borderWidth: "8px 8px 0 0", borderColor: "#2F75B5 transparent transparent transparent" }}
            />
            Blue-cornered cells were filled from this project's details, milestones, cash flow, risks and tasks. Everything else
            carries on from the previous month. Grey cells are the workbook's formulas.
          </p>
        )}
      </div>

      {/* Workbook sync */}
      <div className="bg-white dark:bg-slate-800 rounded-lg border border-slate-200 dark:border-slate-700 shadow-sm p-4">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div className="min-w-0">
            <h2 className="text-sm font-semibold text-slate-900 dark:text-slate-100">Monthly report workbook</h2>
            <p className="text-sm text-slate-600 dark:text-slate-300 mt-0.5">
              {workbook?.source === "sharepoint" ? (
                <>
                  SharePoint:{" "}
                  <a href={workbook.webUrl ?? undefined} target="_blank" rel="noreferrer" className="text-blue-600 dark:text-blue-400 hover:underline">
                    {workbook.fileName}
                  </a>
                </>
              ) : workbook?.source === "upload" ? (
                <>Uploaded copy: {workbook.fileName}</>
              ) : (
                <>No workbook linked. Upload the project's .xlsm, or link it in SharePoint, to import past months and write each new month back.</>
              )}
            </p>
            {saved?.syncedAt && (
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                This month last synced {formatDateTime(saved.syncedAt)}
                {saved.loggedAt ? ` · logged ${formatDateTime(saved.loggedAt)}` : ""}
              </p>
            )}
          </div>
          {!isViewer && (
            <div className="flex flex-wrap items-center gap-2">
              <input
                ref={fileInput}
                type="file"
                accept=".xlsm,.xlsx"
                className="hidden"
                onChange={(e) => {
                  const f = e.target.files?.[0];
                  e.target.value = "";
                  if (f) uploadWorkbook(f);
                }}
              />
              <button className={btn} onClick={() => fileInput.current?.click()} disabled={!!busy}>
                {workbook?.source === "upload" ? "Re-upload / import" : "Upload workbook"}
              </button>
              {workbook?.source && (
                <a className={btn} href={monthlyReportWorkbookDownloadUrl(project.id)}>
                  Download workbook
                </a>
              )}
              {workbook?.source === "sharepoint" && (
                <button className={btn} onClick={pull} disabled={!!busy || !spReady}>
                  Pull from SharePoint
                </button>
              )}
              {workbook?.source && saved && canEdit && (
                <>
                  <label className="flex items-center gap-1.5 text-sm text-slate-600 dark:text-slate-300">
                    <input type="checkbox" checked={logOnSync} onChange={(e) => setLogOnSync(e.target.checked)} />
                    Log month
                  </label>
                  <button
                    className={primary}
                    onClick={syncToWorkbook}
                    disabled={!!busy || (workbook.source === "sharepoint" && !spReady)}
                  >
                    {workbook.source === "sharepoint" ? "Push to SharePoint" : "Write to workbook"}
                  </button>
                </>
              )}
              {workbook?.source && (
                <button className={btn} onClick={unlink} disabled={!!busy}>
                  Unlink
                </button>
              )}
            </div>
          )}
        </div>

        {/* SharePoint connection */}
        {!isViewer && (
          <div className="mt-3 border-t border-slate-100 dark:border-slate-700 pt-3 text-sm">
            {!sharePoint?.configured ? (
              <p className="text-xs text-slate-500 dark:text-slate-400">
                SharePoint sync isn't set up on this server yet (needs a Microsoft app registration — see the README's
                "Monthly Reporting" section). Upload and download work in the meantime.
              </p>
            ) : (
              <div className="flex flex-wrap items-center gap-2">
                <span className="text-slate-600 dark:text-slate-300">
                  SharePoint:{" "}
                  {sharePoint.mode === "app"
                    ? "connected (server account)"
                    : sharePoint.connected
                      ? `connected as ${sharePoint.account}`
                      : "not connected"}
                </span>
                {sharePoint.mode === "user" && !sharePoint.connected && !deviceCode && (
                  <button className={btn} onClick={connect} disabled={!!busy}>
                    Connect Microsoft account
                  </button>
                )}
                {sharePoint.mode === "user" && sharePoint.connected && (
                  <button
                    className={btn}
                    onClick={async () => {
                      await disconnectSharePoint();
                      setSharePoint(await getSharePointStatus());
                    }}
                  >
                    Disconnect
                  </button>
                )}
                {spReady && (
                  <button className={btn} onClick={chooseFile} disabled={!!busy}>
                    {workbook?.source === "sharepoint" ? "Change SharePoint workbook" : "Choose SharePoint workbook"}
                  </button>
                )}
              </div>
            )}
            {deviceCode && (
              <div className="mt-3 rounded border border-blue-200 dark:border-blue-800 bg-blue-50 dark:bg-blue-950/40 p-3">
                Open{" "}
                <a href={deviceCode.verificationUri} target="_blank" rel="noreferrer" className="text-blue-700 dark:text-blue-300 underline">
                  {deviceCode.verificationUri}
                </a>{" "}
                and enter the code <span className="font-mono font-semibold text-base tracking-wider">{deviceCode.userCode}</span>, then sign in with
                your GVW account. This page will update once you're signed in.
              </div>
            )}
            {files && (
              <div className="mt-3">
                <p className="text-xs text-slate-500 dark:text-slate-400 mb-1">
                  Workbooks in the Project Monthly Reports folder — best match for this project first:
                </p>
                <ul className="max-h-64 overflow-y-auto divide-y divide-slate-100 dark:divide-slate-700 rounded border border-slate-200 dark:border-slate-700">
                  {files.map((f) => (
                    <li key={f.itemId} className="flex items-center justify-between gap-3 px-3 py-2">
                      <span className="min-w-0 truncate">
                        {f.score >= 10 && <span className="mr-2 rounded bg-green-100 dark:bg-green-900/40 px-1.5 py-0.5 text-xs text-green-800 dark:text-green-300">Match</span>}
                        {f.folder ? `${f.folder} / ` : ""}
                        {f.name}
                      </span>
                      <button className={btn} onClick={() => link(f)} disabled={!!busy}>
                        Link
                      </button>
                    </li>
                  ))}
                  {files.length === 0 && <li className="px-3 py-2 text-slate-500">No .xlsm workbooks found in the folder.</li>}
                </ul>
                <button className="mt-2 text-xs text-slate-500 hover:underline" onClick={() => setFiles(null)}>
                  Cancel
                </button>
              </div>
            )}
          </div>
        )}
      </div>

      {/* The report itself */}
      {content && reportingMonth ? (
        // Wider than the page column: the workbook's grid needs the room.
        // Centred on the column, capped to the window.
        <div
          id="monthly-report-sheet"
          className="relative left-1/2 -translate-x-1/2 print:static print:translate-x-0"
          style={{ width: "min(1180px, calc(100vw - 2rem))" }}
        >
          <MonthlyReportSheet
            content={content}
            reportingMonth={reportingMonth}
            autoFields={autoFields}
            onChange={
              canEdit
                ? (c) => {
                    setContent(c);
                    setDirty(true);
                  }
                : undefined
            }
          />
        </div>
      ) : (
        !busy && (
          <div className="bg-white dark:bg-slate-800 rounded-lg border border-slate-200 dark:border-slate-700 p-8 text-center text-sm text-slate-500 dark:text-slate-400">
            No monthly reports yet. Pick a month and choose <b>Start report</b> to fill one from this project, or upload the
            project's existing workbook to bring its months in.
          </div>
        )
      )}
    </div>
  );
}
