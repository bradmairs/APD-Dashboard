import { useEffect, useMemo, useRef, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { searchAll } from "../api";
import { SearchResult } from "../types";
import { useAuth } from "../auth/AuthContext";
import { useTheme } from "../theme/ThemeContext";
import { openQuickAdd, QuickAddKind } from "./QuickAdd";
import { Icon } from "./icons";

interface Command {
  id: string;
  label: string;
  group: "Go to" | "Add" | "Settings";
  keywords?: string;
  run: () => void;
}

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
  tender: "procurement",
  task: "schedule",
  milestone: "schedule",
  eot: "schedule",
  delay: "schedule",
  checklist: "schedule",
  procurementChecklist: "procurement",
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
  const navigate = useNavigate();
  const { user, isViewer, logout } = useAuth();
  const { theme, toggleTheme } = useTheme();
  const [active, setActive] = useState(0);
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<SearchResult[]>([]);
  const [loading, setLoading] = useState(false);
  const [open, setOpen] = useState(false);
  const requestId = useRef(0);
  const inputRef = useRef<HTMLInputElement>(null);
  const rootRef = useRef<HTMLDivElement>(null);
  // Close when clicking anywhere else on the page.
  useEffect(() => {
    if (!open) return;
    const onDown = (e: MouseEvent) => {
      if (rootRef.current && !rootRef.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("mousedown", onDown);
    return () => document.removeEventListener("mousedown", onDown);
  }, [open]);

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
  const showDropdown = open;
  const searching = trimmed.length >= MIN_QUERY_LENGTH;

  const grouped: { typeLabel: string; items: SearchResult[] }[] = [];
  for (const result of results) {
    const group = grouped.find((g) => g.typeLabel === result.typeLabel);
    if (group) group.items.push(result);
    else grouped.push({ typeLabel: result.typeLabel, items: [result] });
  }

  function close() {
    setOpen(false);
  }

  // The command menu: pages to jump to and things to do, matched against
  // what's typed (all shown when the box is empty), above search results.
  const commands = useMemo<Command[]>(() => {
    const go = (label: string, to: string, keywords = ""): Command => ({
      id: `go-${to}`,
      label,
      group: "Go to",
      keywords,
      run: () => navigate(to),
    });
    const add = (label: string, kind: QuickAddKind): Command => ({
      id: `add-${kind}`,
      label: `New ${label}`,
      group: "Add",
      keywords: "add create new",
      run: () => openQuickAdd(kind),
    });
    return [
      go("Dashboard", "/?tab=projects", "home projects"),
      go("Today & Upcoming", "/?tab=today", "due tasks actions"),
      go("My week", "/?tab=week", "mine due expiring claims"),
      go("Alerts", "/?tab=alerts"),
      go("Charts", "/?tab=charts", "spend budget"),
      go("Activity", "/?tab=activity", "history recent"),
      go("TRIM & GVW Links", "/?tab=trim", "links"),
      go("Lessons Learned", "/lessons-learned"),
      go("Tool Suggestions", "/tool-suggestions", "ideas feedback"),
      go("Reports", "/reports", "portfolio"),
      go("Approvals", "/approvals", "approve reject sign off"),
      go("Capital works by financial year", "/capital-works", "fy budget program phasing"),
      go("Task Templates", "/task-templates"),
      ...(user?.role === "ADMIN" ? [go("Users", "/admin/users", "admin accounts")] : []),
      ...(isViewer
        ? []
        : [
            {
              id: "add-project",
              label: "New project",
              group: "Add" as const,
              keywords: "add create",
              run: () => navigate("/?tab=projects&new=project"),
            },
            add("task", "task"),
            add("action", "action"),
            add("risk", "risk"),
            add("defect", "defect"),
            add("site visit", "site-visit"),
          ]),
      {
        id: "theme",
        label: theme === "dark" ? "Switch to light mode" : "Switch to dark mode",
        group: "Settings",
        keywords: "theme dark light",
        run: toggleTheme,
      },
      {
        id: "logout",
        label: "Log out",
        group: "Settings",
        keywords: "sign out",
        run: () => logout().then(() => navigate("/login")),
      },
    ];
  }, [navigate, user?.role, isViewer, theme, toggleTheme, logout]);

  const q = trimmed.toLowerCase();
  const matchedCommands = commands
    .filter((c) => !q || `${c.label} ${c.keywords ?? ""}`.toLowerCase().includes(q))
    .slice(0, q ? 6 : 12);
  const flat: { key: string; run: () => void }[] = [
    ...matchedCommands.map((c) => ({ key: c.id, run: c.run })),
    ...results.map((r) => ({ key: `${r.type}-${r.id}`, run: () => navigate(resultHref(r)) })),
  ];
  const activeKey = flat[Math.min(active, flat.length - 1)]?.key;

  useEffect(() => setActive(0), [query, results.length]);

  function runAt(index: number) {
    const item = flat[index];
    if (!item) return;
    close();
    setQuery("");
    inputRef.current?.blur();
    item.run();
  }

  return (
    <div className="relative" ref={rootRef}>
      <input
        ref={inputRef}
        type="search"
        spellCheck={false}
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
          } else if (e.key === "ArrowDown") {
            e.preventDefault();
            setActive((i) => Math.min(i + 1, flat.length - 1));
          } else if (e.key === "ArrowUp") {
            e.preventDefault();
            setActive((i) => Math.max(i - 1, 0));
          } else if (e.key === "Enter") {
            e.preventDefault();
            runAt(Math.min(active, flat.length - 1));
          }
        }}
        placeholder="Search or jump to…"
        role="combobox"
        aria-expanded={showDropdown}
        title={`Search (${SHORTCUT_LABEL})`}
        aria-label="Search across projects and registers"
        className="w-40 sm:w-64 rounded-full border border-slate-200 bg-slate-100/80 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100 pl-9 pr-12 py-1.5 text-sm placeholder:text-slate-400 focus:bg-white dark:focus:bg-slate-900"
      />
      <Icon name="search" className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-500 pointer-events-none" />
      <kbd className="hidden sm:block absolute right-3 top-1/2 -translate-y-1/2 text-[10px] font-medium text-slate-600 dark:text-slate-300 border border-slate-300 dark:border-slate-600 rounded px-1 pointer-events-none">
        {SHORTCUT_LABEL}
      </kbd>

      {showDropdown && (
        <>
          <div className="menu-panel absolute right-0 sm:left-0 sm:right-auto top-full mt-2 w-80 max-h-[28rem] overflow-y-auto z-20">
            {(["Go to", "Add", "Settings"] as const).map((group) => {
              const items = matchedCommands.filter((c) => c.group === group);
              if (items.length === 0) return null;
              return (
                <div key={group}>
                  <div className="px-4 pt-2 pb-1 text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wide">
                    {group}
                  </div>
                  {items.map((c) => (
                    <button
                      key={c.id}
                      type="button"
                      onMouseDown={(e) => e.preventDefault()}
                      onClick={() => runAt(flat.findIndex((f) => f.key === c.id))}
                      className={`block w-full text-left px-4 py-1.5 text-sm text-slate-800 dark:text-slate-200 ${
                        activeKey === c.id ? "bg-blue-50 dark:bg-slate-700" : "hover:bg-slate-50 dark:hover:bg-slate-700"
                      }`}
                    >
                      {c.label}
                    </button>
                  ))}
                </div>
              );
            })}
            {!searching ? null : loading ? (
              <p className="px-4 py-3 text-sm text-slate-500 dark:text-slate-400">Searching…</p>
            ) : results.length === 0 ? (
              matchedCommands.length === 0 && (
                <p className="px-4 py-3 text-sm text-slate-500 dark:text-slate-400">
                  No matches for "{trimmed}"
                </p>
              )
            ) : (
              grouped.map((group) => (
                <div key={group.typeLabel}>
                  <div className="px-4 pt-2 pb-1 text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wide">
                    {group.typeLabel}
                  </div>
                  {group.items.map((item) => (
                    <Link
                      key={`${item.type}-${item.id}`}
                      to={resultHref(item)}
                      onClick={() => {
                        close();
                        setQuery("");
                      }}
                      className={`block px-4 py-2 ${
                        activeKey === `${item.type}-${item.id}` ? "bg-blue-50 dark:bg-slate-700" : "hover:bg-slate-50 dark:hover:bg-slate-700"
                      }`}
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
