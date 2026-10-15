import { useEffect, useRef, useState } from "react";
import { Link } from "react-router-dom";
import { searchAll } from "../api";
import { SearchResult } from "../types";

const MIN_QUERY_LENGTH = 2;
const DEBOUNCE_MS = 250;
const IS_MAC = typeof navigator !== "undefined" && /Mac|iPhone|iPad/.test(navigator.platform);
const SHORTCUT_LABEL = IS_MAC ? "⌘K" : "Ctrl+K";

// Which project tab each result type lives on, so a result opens that tab.
// A type left out defaults to "overview" (stakeholders, actions, meeting
// minutes all live there).
const RESULT_TAB: Record<string, string> = {
  risk: "quality",
  action: "overview",
  rfi: "quality",
  defect: "quality",
  variation: "budget",
  document: "quality",
  correspondence: "quality",
  subcontractor: "budget",
  tender: "budget",
  task: "schedule",
  milestone: "schedule",
  eot: "schedule",
  delay: "schedule",
  checklist: "schedule",
  contract: "budget",
  paymentClaim: "budget",
  insurance: "budget",
  permit: "budget",
  performanceReview: "budget",
  environmentalMonitoring: "quality",
  safetyInspection: "quality",
  sqe: "quality",
  siteVisit: "site",
  enquiry: "site",
  archiveLink: "site",
  lessonLearned: "site",
  trainingRecord: "site",
  toolboxTalk: "site",
};

function resultHref(item: SearchResult): string {
  const tab = RESULT_TAB[item.type];
  return tab && tab !== "overview"
    ? `/projects/${item.projectId}?tab=${tab}`
    : `/projects/${item.projectId}`;
}

// Self-contained like NotificationBell — no props, fetches on its own as
// the user types. Debounced rather than fired on every keystroke since
// each query fans out across ~10 tables server-side.
export default function GlobalSearch() {
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<SearchResult[]>([]);
  const [loading, setLoading] = useState(false);
  const [open, setOpen] = useState(false);
  const requestId = useRef(0);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    function onKeyDown(e: KeyboardEvent) {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "k") {
        e.preventDefault();
        inputRef.current?.focus();
        inputRef.current?.select();
      }
    }
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, []);

  useEffect(() => {
    const trimmed = query.trim();
    if (trimmed.length < MIN_QUERY_LENGTH) {
      setResults([]);
      setLoading(false);
      return;
    }

    setLoading(true);
    const thisRequest = ++requestId.current;
    const timer = setTimeout(() => {
      searchAll(trimmed)
        .then((data) => {
          if (requestId.current === thisRequest) {
            setResults(data.results);
            setLoading(false);
          }
        })
        .catch(() => {
          if (requestId.current === thisRequest) {
            setResults([]);
            setLoading(false);
          }
        });
    }, DEBOUNCE_MS);

    return () => clearTimeout(timer);
  }, [query]);

  const trimmed = query.trim();
  const showDropdown = open && trimmed.length >= MIN_QUERY_LENGTH;

  const grouped: { typeLabel: string; items: SearchResult[] }[] = [];
  for (const result of results) {
    const group = grouped.find((g) => g.typeLabel === result.typeLabel);
    if (group) group.items.push(result);
    else grouped.push({ typeLabel: result.typeLabel, items: [result] });
  }

  function close() {
    setOpen(false);
  }

  return (
    <div className="relative">
      <input
        ref={inputRef}
        type="search"
        value={query}
        onChange={(e) => {
          setQuery(e.target.value);
          setOpen(true);
        }}
        onFocus={() => setOpen(true)}
        onKeyDown={(e) => {
          if (e.key === "Escape") {
            close();
            inputRef.current?.blur();
          }
        }}
        placeholder={`Search… (${SHORTCUT_LABEL})`}
        title={`Search (${SHORTCUT_LABEL})`}
        aria-label="Search across projects and registers"
        className="w-40 sm:w-56 rounded border border-slate-300 dark:border-slate-600 dark:bg-slate-700 dark:text-slate-100 px-3 py-1.5 text-sm"
      />

      {showDropdown && (
        <>
          <div className="fixed inset-0 z-10" onClick={close} />
          <div className="absolute left-0 top-full mt-2 w-80 max-h-96 overflow-y-auto bg-white dark:bg-slate-800 rounded-md border border-slate-200 dark:border-slate-700 shadow-lg z-20 py-1">
            {loading ? (
              <p className="px-4 py-3 text-sm text-slate-500 dark:text-slate-400">Searching…</p>
            ) : results.length === 0 ? (
              <p className="px-4 py-3 text-sm text-slate-500 dark:text-slate-400">
                No matches for "{trimmed}"
              </p>
            ) : (
              grouped.map((group) => (
                <div key={group.typeLabel}>
                  <div className="px-4 pt-2 pb-1 text-xs font-semibold text-slate-400 dark:text-slate-500 uppercase tracking-wide">
                    {group.typeLabel}
                  </div>
                  {group.items.map((item) => (
                    <Link
                      key={`${item.type}-${item.id}`}
                      to={resultHref(item)}
                      onClick={close}
                      className="block px-4 py-2 hover:bg-slate-50 dark:hover:bg-slate-700"
                    >
                      <div className="text-sm text-slate-900 dark:text-slate-100 truncate">
                        {item.title}
                      </div>
                      <div className="text-xs text-slate-500 dark:text-slate-400 truncate">
                        {item.type === "project" ? item.subtitle : item.projectName}
                      </div>
                    </Link>
                  ))}
                </div>
              ))
            )}
          </div>
        </>
      )}
    </div>
  );
}
