import { ReactNode, useEffect, useRef, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import Sidebar, { Icon } from "./Sidebar";
import UserMenu from "./UserMenu";
import QuickAddMenu from "./QuickAdd";
import { loadSidebarCollapsed, saveSidebarCollapsed } from "../layout/navMemory";

interface Props {
  // Page title in the top bar, with an optional line under it.
  title: ReactNode;
  subtitle?: ReactNode;
  // Page buttons shown before the search / bell / user menu.
  actions?: ReactNode;
  // A second menu column beside the main one on wide screens (the project's
  // section menu). Pages provide their own phone fallback.
  secondaryNav?: ReactNode;
  children: ReactNode;
}

// Keyboard shortcuts: "G" then a letter jumps to a page; "[" collapses the
// menu; "?" lists them. Ignored while typing in a field.
export const SHORTCUTS: { keys: string; label: string; to?: string }[] = [
  { keys: "G D", label: "Dashboard", to: "/?tab=projects" },
  { keys: "G T", label: "Today & Upcoming", to: "/?tab=today" },
  { keys: "G W", label: "My week", to: "/?tab=week" },
  { keys: "G A", label: "Alerts", to: "/?tab=alerts" },
  { keys: "G C", label: "Charts", to: "/?tab=charts" },
  { keys: "G V", label: "Activity", to: "/?tab=activity" },
  { keys: "G K", label: "TRIM & GVW Links", to: "/?tab=trim" },
  { keys: "G L", label: "Lessons Learned", to: "/lessons-learned" },
  { keys: "G S", label: "Tool Suggestions", to: "/tool-suggestions" },
  { keys: "G R", label: "Reports", to: "/reports" },
  { keys: "Ctrl K", label: "Search everything" },
  { keys: "[", label: "Collapse or expand the menu" },
  { keys: "?", label: "Show these shortcuts" },
];

function isTyping(target: EventTarget | null) {
  const el = target as HTMLElement | null;
  if (!el) return false;
  return (
    el.isContentEditable ||
    el.tagName === "INPUT" ||
    el.tagName === "TEXTAREA" ||
    el.tagName === "SELECT"
  );
}

// The frame of every signed-in page: the left menu, a top bar with the page
// title, page buttons, search, theme switch, notifications and user menu,
// then the page itself using the full width of the screen.
export default function AppLayout({ title, subtitle, actions, secondaryNav, children }: Props) {
  const navigate = useNavigate();
  const location = useLocation();
  const [collapsed, setCollapsed] = useState(loadSidebarCollapsed);
  const [mobileOpen, setMobileOpen] = useState(false);
  const [showShortcuts, setShowShortcuts] = useState(false);
  const pendingG = useRef<number | null>(null);

  function toggleCollapsed() {
    setCollapsed((c) => {
      saveSidebarCollapsed(!c);
      return !c;
    });
  }

  // Publish the top bar's height (it wraps on narrower screens) as
  // --app-header-h, so table headers can pin just below it.
  const headerRef = useRef<HTMLElement>(null);
  useEffect(() => {
    const header = headerRef.current;
    if (!header) return;
    const update = () =>
      document.documentElement.style.setProperty(
        "--app-header-h",
        getComputedStyle(header).position === "sticky" ? `${header.getBoundingClientRect().height}px` : "0px"
      );
    update();
    const observer = new ResizeObserver(update);
    observer.observe(header);
    window.addEventListener("resize", update);
    return () => {
      observer.disconnect();
      window.removeEventListener("resize", update);
    };
  }, []);

  // Close the phone menu whenever the page changes.
  useEffect(() => setMobileOpen(false), [location.pathname, location.search]);

  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.ctrlKey || e.metaKey || e.altKey || isTyping(e.target)) return;
      const key = e.key.toLowerCase();
      if (pendingG.current !== null) {
        window.clearTimeout(pendingG.current);
        pendingG.current = null;
        const match = SHORTCUTS.find((s) => s.to && s.keys === `G ${key.toUpperCase()}`);
        if (match?.to) {
          e.preventDefault();
          navigate(match.to);
        }
        return;
      }
      if (key === "g") {
        pendingG.current = window.setTimeout(() => (pendingG.current = null), 1200);
      } else if (e.key === "[") {
        toggleCollapsed();
      } else if (e.key === "?") {
        setShowShortcuts((s) => !s);
      } else if (e.key === "Escape") {
        setShowShortcuts(false);
        setMobileOpen(false);
      }
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [navigate]);

  return (
    <div className="min-h-screen lg:flex">
      <div className="hidden lg:block shrink-0 sticky top-0 h-screen z-40">
        <Sidebar collapsed={collapsed} onToggleCollapsed={toggleCollapsed} />
      </div>

      {mobileOpen && (
        <div className="lg:hidden fixed inset-0 z-50 flex">
          <div className="w-72 max-w-[85vw] h-full shadow-xl">
            <Sidebar collapsed={false} mobile onToggleCollapsed={toggleCollapsed} onNavigate={() => setMobileOpen(false)} />
          </div>
          <button
            type="button"
            aria-label="Close the menu"
            onClick={() => setMobileOpen(false)}
            className="flex-1 bg-black/40"
          />
        </div>
      )}

      {secondaryNav && (
        <div className="hidden lg:block shrink-0 sticky top-0 h-screen z-30">{secondaryNav}</div>
      )}

      <div className="flex-1 min-w-0 flex flex-col">
        <header ref={headerRef} className="lg:sticky top-0 z-30 bg-white/95 dark:bg-slate-900/95 backdrop-blur border-b border-slate-200 dark:border-slate-800">
          <div className="px-4 sm:px-6 lg:px-8 py-3 flex flex-wrap items-center gap-x-4 gap-y-3">
            <button
              type="button"
              onClick={() => setMobileOpen(true)}
              aria-label="Open the menu"
              className="lg:hidden p-2 -ml-2 rounded-lg text-slate-600 hover:bg-slate-100 dark:text-slate-300 dark:hover:bg-slate-800"
            >
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8} strokeLinecap="round" aria-hidden="true" className="w-6 h-6">
                <path d="M4 6h16M4 12h16M4 18h16" />
              </svg>
            </button>
            <div className="flex-1 min-w-[12rem]">
              <h1 className="text-lg font-semibold text-slate-900 dark:text-slate-100 leading-tight">{title}</h1>
              {subtitle && <div className="text-sm text-slate-500 dark:text-slate-400 mt-0.5">{subtitle}</div>}
            </div>
            {actions && <div className="flex flex-wrap items-center gap-2">{actions}</div>}
            <QuickAddMenu />
            <UserMenu />
            <button
              type="button"
              onClick={() => setShowShortcuts(true)}
              className="hidden sm:inline-flex items-center justify-center w-8 h-8 rounded-lg text-sm text-slate-500 hover:bg-slate-100 dark:text-slate-400 dark:hover:bg-slate-800"
              aria-label="Keyboard shortcuts"
              title="Keyboard shortcuts (?)"
            >
              ?
            </button>
          </div>
        </header>

        <main className="flex-1 px-4 sm:px-6 lg:px-8 py-6">{children}</main>
      </div>

      {showShortcuts && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center p-4 z-50" onClick={() => setShowShortcuts(false)}>
          <div
            role="dialog"
            aria-label="Keyboard shortcuts"
            className="bg-white dark:bg-slate-800 rounded-lg shadow-xl w-full max-w-md p-6"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-semibold text-slate-900 dark:text-slate-100">Keyboard shortcuts</h2>
              <button
                type="button"
                onClick={() => setShowShortcuts(false)}
                className="text-sm text-slate-500 hover:text-slate-900 dark:text-slate-400 dark:hover:text-slate-100"
              >
                Close
              </button>
            </div>
            <ul className="divide-y divide-slate-100 dark:divide-slate-700">
              {SHORTCUTS.map((s) => (
                <li key={s.keys} className="flex items-center justify-between py-2 text-sm">
                  <span className="text-slate-700 dark:text-slate-300">{s.label}</span>
                  <span className="flex gap-1">
                    {s.keys.split(" ").map((k) => (
                      <kbd
                        key={k}
                        className="min-w-[1.75rem] text-center px-1.5 py-0.5 rounded border border-slate-300 dark:border-slate-600 bg-slate-50 dark:bg-slate-900 text-xs font-mono text-slate-700 dark:text-slate-200"
                      >
                        {k}
                      </kbd>
                    ))}
                  </span>
                </li>
              ))}
            </ul>
          </div>
        </div>
      )}
    </div>
  );
}

export { Icon };
