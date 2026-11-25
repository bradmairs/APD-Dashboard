import { useEffect, useState } from "react";
import { Link, useLocation } from "react-router-dom";
import { getProjects, getUpcomingTasks } from "../api";
import { useAuth } from "../auth/AuthContext";
import { APP_VERSION } from "../version";
import { isTaskDueSoon, isTaskOverdue } from "../taskMeta";
import { loadRecentProjects, onRecentProjectsChange, RecentProject } from "../layout/navMemory";
import GvwLogo from "./GvwLogo";

// Stroke icons (24px viewBox) for the menu.
export const ICONS: Record<string, string> = {
  home: "M3 11l9-7 9 7M5 10v10h14V10",
  clock: "M12 7v5l3 2M21 12a9 9 0 11-18 0 9 9 0 0118 0z",
  alert: "M12 9v4M12 17h.01M10.3 3.9L2 18a2 2 0 001.7 3h16.6a2 2 0 001.7-3L13.7 3.9a2 2 0 00-3.4 0z",
  chart: "M4 20V10M10 20V4M16 20v-7M22 20H2",
  activity: "M22 12h-4l-3 9L9 3l-3 9H2",
  link: "M10 14a5 5 0 007 0l3-3a5 5 0 00-7-7l-1 1M14 10a5 5 0 00-7 0l-3 3a5 5 0 007 7l1-1",
  book: "M4 19.5A2.5 2.5 0 016.5 17H20V3H6.5A2.5 2.5 0 004 5.5zM4 19.5V21h16",
  idea: "M9 18h6M10 22h4M12 2a7 7 0 00-4 12.7V17h8v-2.3A7 7 0 0012 2z",
  report: "M14 3H6a2 2 0 00-2 2v14a2 2 0 002 2h12a2 2 0 002-2V9zM14 3v6h6M8 13h8M8 17h5",
  users: "M17 21v-2a4 4 0 00-4-4H5a4 4 0 00-4 4v2M9 11a4 4 0 100-8 4 4 0 000 8zM23 21v-2a4 4 0 00-3-3.9M16 3.1a4 4 0 010 7.8",
  template: "M4 4h16v6H4zM4 14h7v6H4zM15 14h5v6h-5z",
  folder: "M3 7a2 2 0 012-2h4l2 2h8a2 2 0 012 2v8a2 2 0 01-2 2H5a2 2 0 01-2-2z",
  chevronLeft: "M15 6l-6 6 6 6",
  chevronRight: "M9 6l6 6-6 6",
};

export function Icon({ name, className = "w-[18px] h-[18px]" }: { name: string; className?: string }) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={1.8}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      className={`${className} shrink-0`}
    >
      <path d={ICONS[name]} />
    </svg>
  );
}

// Counts shown beside menu items, fetched at most once a minute however
// many pages are opened.
let countsCache: { at: number; promise: Promise<{ projects: number; due: number }> } | null = null;

function loadCounts() {
  if (!countsCache || Date.now() - countsCache.at > 60_000) {
    countsCache = {
      at: Date.now(),
      promise: Promise.all([getProjects(), getUpcomingTasks()])
        .then(([projects, tasks]) => ({
          projects: projects.length,
          due: tasks.filter((t) => isTaskOverdue(t) || isTaskDueSoon(t)).length,
        }))
        .catch(() => ({ projects: 0, due: 0 })),
    };
  }
  return countsCache.promise;
}

interface NavItem {
  label: string;
  icon: string;
  to: string;
  // Dashboard tab this item opens (for the active highlight).
  tab?: string;
  badge?: number;
  shortcut?: string;
}

interface Props {
  collapsed: boolean;
  onToggleCollapsed: () => void;
  // Called after following a link (closes the phone menu).
  onNavigate?: () => void;
  // The phone menu is always shown full width.
  mobile?: boolean;
}

// The app's left-hand menu, on every signed-in page: the GVW logo (back to
// the dashboard, as before), the dashboard's views, the knowledge pages,
// admin pages, and recently viewed projects. Collapses to icons.
export default function Sidebar({ collapsed: collapsedPref, onToggleCollapsed, onNavigate, mobile }: Props) {
  const collapsed = collapsedPref && !mobile;
  const { user } = useAuth();
  const location = useLocation();
  const [counts, setCounts] = useState<{ projects: number; due: number } | null>(null);
  const [recent, setRecent] = useState<RecentProject[]>(() => (user ? loadRecentProjects(user.id) : []));

  useEffect(() => {
    let active = true;
    loadCounts().then((c) => active && setCounts(c));
    return () => {
      active = false;
    };
  }, []);

  useEffect(() => {
    if (!user) return;
    setRecent(loadRecentProjects(user.id));
    return onRecentProjectsChange(() => setRecent(loadRecentProjects(user.id)));
  }, [user]);

  const params = new URLSearchParams(location.search);
  const onDashboard = location.pathname === "/";
  const dashboardTab = params.get("tab") ?? "projects";

  function isActive(item: NavItem) {
    if (item.tab) return onDashboard && dashboardTab === item.tab;
    return location.pathname === item.to || location.pathname.startsWith(`${item.to}/`);
  }

  const groups: { heading?: string; items: NavItem[] }[] = [
    {
      items: [
        { label: "Dashboard", icon: "home", to: "/?tab=projects", tab: "projects", badge: counts?.projects, shortcut: "G D" },
        { label: "Today & Upcoming", icon: "clock", to: "/?tab=today", tab: "today", badge: counts?.due, shortcut: "G T" },
        { label: "Alerts", icon: "alert", to: "/?tab=alerts", tab: "alerts", shortcut: "G A" },
        { label: "Charts", icon: "chart", to: "/?tab=charts", tab: "charts", shortcut: "G C" },
        { label: "Activity", icon: "activity", to: "/?tab=activity", tab: "activity", shortcut: "G V" },
      ],
    },
    {
      heading: "Knowledge",
      items: [
        { label: "TRIM & GVW Links", icon: "link", to: "/?tab=trim", tab: "trim", shortcut: "G K" },
        { label: "Lessons Learned", icon: "book", to: "/lessons-learned", shortcut: "G L" },
        { label: "Tool Suggestions", icon: "idea", to: "/tool-suggestions", shortcut: "G S" },
        { label: "Reports", icon: "report", to: "/reports", shortcut: "G R" },
      ],
    },
    {
      heading: user?.role === "ADMIN" ? "Admin" : "Settings",
      items: [
        { label: "Task Templates", icon: "template", to: "/task-templates" },
        ...(user?.role === "ADMIN" ? [{ label: "Users", icon: "users", to: "/admin/users" }] : []),
      ],
    },
  ];

  const itemClass = (active: boolean) =>
    `flex items-center gap-3 min-h-[40px] rounded-lg text-sm ${collapsed ? "justify-center px-0" : "px-3"} ${
      active
        ? "bg-blue-50 text-blue-700 font-medium dark:bg-blue-500/15 dark:text-blue-200"
        : "text-slate-600 hover:bg-slate-100 hover:text-slate-900 dark:text-slate-300 dark:hover:bg-slate-800 dark:hover:text-slate-100"
    }`;

  return (
    <nav
      aria-label="Main menu"
      className={`flex flex-col h-full bg-white dark:bg-slate-900 border-r border-slate-200 dark:border-slate-800 ${
        collapsed ? "w-[72px]" : mobile ? "w-full" : "w-64"
      }`}
    >
      <Link
        to="/"
        onClick={onNavigate}
        className={`flex items-center gap-3 px-3 pt-4 pb-3 hover:opacity-90 ${collapsed ? "justify-center" : ""}`}
        title={`Project Management Dashboard version ${APP_VERSION} — back to the dashboard`}
      >
        <GvwLogo className={collapsed ? "h-10" : "h-14"} />
        {!collapsed && (
          <div className="min-w-0 leading-tight">
            <div className="text-sm font-semibold text-slate-900 dark:text-slate-100">
              Project Management Dashboard
            </div>
            <div className="text-xs text-slate-500 dark:text-slate-400">
              Asset &amp; Project Delivery <span className="text-slate-400 dark:text-slate-500">v{APP_VERSION}</span>
            </div>
          </div>
        )}
      </Link>

      <div className="flex-1 overflow-y-auto px-3 pb-3 space-y-4">
        {groups.map((group, gi) => (
          <div key={gi} className="space-y-0.5">
            {group.heading && !collapsed && (
              <div className="px-3 pt-2 pb-1 text-[11px] font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400">
                {group.heading}
              </div>
            )}
            {group.heading && collapsed && <div className="mx-3 my-2 border-t border-slate-200 dark:border-slate-800" />}
            {group.items.map((item) => {
              const active = isActive(item);
              return (
                <Link
                  key={item.label}
                  to={item.to}
                  onClick={onNavigate}
                  aria-current={active ? "page" : undefined}
                  title={collapsed ? item.label : item.shortcut ? `${item.label} (${item.shortcut})` : undefined}
                  className={itemClass(active)}
                >
                  <Icon name={item.icon} />
                  {!collapsed && <span className="flex-1 min-w-0 truncate">{item.label}</span>}
                  {!collapsed && item.badge !== undefined && item.badge > 0 && (
                    <span className="text-[11px] font-semibold rounded-full px-2 py-0.5 bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-200">
                      {item.badge}
                    </span>
                  )}
                </Link>
              );
            })}
          </div>
        ))}

        {recent.length > 0 && (
          <div className="space-y-0.5">
            {!collapsed ? (
              <div className="px-3 pt-2 pb-1 text-[11px] font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400">
                Recent projects
              </div>
            ) : (
              <div className="mx-3 my-2 border-t border-slate-200 dark:border-slate-800" />
            )}
            {recent.map((p) => {
              const to = `/projects/${p.id}`;
              const active = location.pathname === to;
              return (
                <Link
                  key={p.id}
                  to={to}
                  onClick={onNavigate}
                  title={p.name}
                  aria-current={active ? "page" : undefined}
                  className={itemClass(active)}
                >
                  <Icon name="folder" />
                  {!collapsed && <span className="flex-1 min-w-0 truncate">{p.name}</span>}
                </Link>
              );
            })}
          </div>
        )}
      </div>

      {!mobile && (
        <div className="p-3 border-t border-slate-200 dark:border-slate-800">
          <button
            type="button"
            onClick={onToggleCollapsed}
            className={`w-full ${itemClass(false)}`}
            aria-label={collapsed ? "Expand the menu" : "Collapse the menu"}
            title={collapsed ? "Expand the menu ( [ )" : "Collapse the menu ( [ )"}
          >
            <Icon name={collapsed ? "chevronRight" : "chevronLeft"} />
            {!collapsed && <span>Collapse menu</span>}
          </button>
        </div>
      )}
    </nav>
  );
}
