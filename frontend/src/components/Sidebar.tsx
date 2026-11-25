import { useEffect, useState } from "react";
import { Link, useLocation } from "react-router-dom";
import { getProjects, getUpcomingTasks } from "../api";
import { batched } from "../batch";
import { useAuth } from "../auth/AuthContext";
import { APP_VERSION } from "../version";
import { isTaskDueSoon, isTaskOverdue } from "../taskMeta";
import { loadRecentProjects, onRecentProjectsChange, RecentProject } from "../layout/navMemory";
import GvwLogo from "./GvwLogo";
import { Icon } from "./icons";

export { Icon, ICONS } from "./icons";

// Counts shown beside menu items, fetched at most once a minute however
// many pages are opened.
let countsCache: { at: number; promise: Promise<{ projects: number; due: number }> } | null = null;

function loadCounts() {
  if (!countsCache || Date.now() - countsCache.at > 60_000) {
    countsCache = {
      at: Date.now(),
      promise: batched(() => Promise.all([getProjects(), getUpcomingTasks()]), { preferCache: true })
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
        { label: "My week", icon: "calendar", to: "/?tab=week", tab: "week", shortcut: "G W" },
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
