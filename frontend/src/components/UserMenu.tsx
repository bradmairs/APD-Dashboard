import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { Link, useNavigate } from "react-router-dom";
import { useAuth } from "../auth/AuthContext";
import { updateDigestPreference } from "../api";
import { useTheme } from "../theme/ThemeContext";
import ChangePasswordModal from "./ChangePasswordModal";
import TwoFactorModal from "./TwoFactorModal";
import GlobalSearch from "./GlobalSearch";
import NotificationBell from "./NotificationBell";
import { Icon } from "./icons";
import { useMenuKeys } from "../useMenuKeys";

// ---- Table density (Comfortable / Compact), remembered in this browser ----
const DENSITY_KEY = "apd.density";
export type Density = "comfortable" | "compact";

function loadDensity(): Density {
  try {
    return localStorage.getItem(DENSITY_KEY) === "compact" ? "compact" : "comfortable";
  } catch {
    return "comfortable";
  }
}

export function applyDensity(density: Density = loadDensity()) {
  document.documentElement.classList.toggle("density-compact", density === "compact");
}

// Asks the page frame to show the keyboard shortcuts list.
export const SHOW_SHORTCUTS_EVENT = "apd:show-shortcuts";

function initials(name: string) {
  const parts = name.trim().split(/[\s.]+/).filter(Boolean);
  return ((parts[0]?.[0] ?? "") + (parts.length > 1 ? parts[parts.length - 1][0] : "")).toUpperCase() || "?";
}

// The right of the top bar: search, notifications, and your avatar, whose
// menu holds the theme, table density, account settings and log out.
export default function UserMenu() {
  const { user, logout, refreshUser } = useAuth();
  const { theme, toggleTheme } = useTheme();
  const navigate = useNavigate();
  const [menuOpen, setMenuOpen] = useState(false);
  const [showPasswordModal, setShowPasswordModal] = useState(false);
  const [showTwoFactorModal, setShowTwoFactorModal] = useState(false);
  const [togglingDigest, setTogglingDigest] = useState(false);
  const [density, setDensity] = useState<Density>(loadDensity);
  const ref = useRef<HTMLDivElement>(null);
  const menuRef = useRef<HTMLDivElement>(null);
  useMenuKeys(menuRef, menuOpen);

  useEffect(() => applyDensity(density), [density]);

  useEffect(() => {
    if (!menuOpen) return;
    const onDown = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setMenuOpen(false);
    };
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && setMenuOpen(false);
    document.addEventListener("mousedown", onDown);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onDown);
      document.removeEventListener("keydown", onKey);
    };
  }, [menuOpen]);

  async function handleLogout() {
    await logout();
    navigate("/login", { replace: true });
  }

  async function handleToggleDigest() {
    if (!user) return;
    setTogglingDigest(true);
    try {
      await updateDigestPreference(!user.emailDigestOptIn);
      await refreshUser();
    } finally {
      setTogglingDigest(false);
    }
  }

  function changeDensity(next: Density) {
    setDensity(next);
    try {
      localStorage.setItem(DENSITY_KEY, next);
    } catch {
      // not remembered
    }
  }

  if (!user) return null;

  const close = () => setMenuOpen(false);

  return (
    <div className="flex items-center gap-2 text-sm">
      <GlobalSearch />
      <NotificationBell />

      <div className="relative" ref={ref}>
        <button
          onClick={() => setMenuOpen((open) => !open)}
          aria-haspopup="menu"
          aria-expanded={menuOpen}
          aria-label={`Account menu for ${user.name}`}
          title={user.name}
          className="flex items-center gap-1 rounded-full p-0.5 pr-1.5 hover:bg-slate-100 dark:hover:bg-slate-800"
        >
          <span className="w-8 h-8 rounded-full bg-gradient-to-br from-blue-500 to-navy-600 text-white text-xs font-semibold flex items-center justify-center ring-2 ring-white dark:ring-slate-900">
            {initials(user.name)}
          </span>
          <Icon name="chevronDown" className="w-3.5 h-3.5 text-slate-500" />
        </button>

        {menuOpen && (
          <div role="menu" ref={menuRef} className="menu-panel absolute right-0 top-full mt-2 w-72 z-40">
            <div className="px-3 py-2.5 border-b border-slate-100 dark:border-slate-700">
              <div className="font-medium text-slate-900 dark:text-slate-100 truncate">{user.name}</div>
              <div className="text-xs text-slate-500 dark:text-slate-400 truncate">{user.email}</div>
              <span className="inline-block mt-1.5 text-[11px] font-medium rounded-full px-2 py-0.5 bg-blue-50 text-blue-700 dark:bg-blue-500/15 dark:text-blue-200">
                {user.role === "ADMIN" ? "Admin" : user.role === "VIEWER" ? "Viewer" : "Member"}
              </span>
            </div>

            <div className="py-1 border-b border-slate-100 dark:border-slate-700">
              <button role="menuitem" onClick={toggleTheme} className="menu-item">
                <Icon name={theme === "dark" ? "sun" : "moon"} className="w-4 h-4 text-slate-500" />
                {theme === "dark" ? "Light mode" : "Dark mode"}
              </button>
              <div className="px-3 py-2 flex items-center gap-2.5 text-sm text-slate-700 dark:text-slate-200">
                <Icon name="rows" className="w-4 h-4 text-slate-500" />
                <span className="flex-1">Density</span>
                <div role="group" aria-label="Table density" className="inline-flex rounded-lg bg-slate-100 dark:bg-slate-700/60 p-0.5 text-xs">
                  {(["comfortable", "compact"] as Density[]).map((d) => (
                    <button
                      key={d}
                      type="button"
                      aria-pressed={density === d}
                      onClick={() => changeDensity(d)}
                      className={`px-2 py-0.5 rounded-md capitalize ${
                        density === d ? "bg-white dark:bg-slate-900 shadow-sm text-slate-900 dark:text-slate-100" : "text-slate-600 dark:text-slate-300"
                      }`}
                    >
                      {d}
                    </button>
                  ))}
                </div>
              </div>
              <button
                role="menuitem"
                onClick={() => {
                  close();
                  window.dispatchEvent(new Event(SHOW_SHORTCUTS_EVENT));
                }}
                className="menu-item"
              >
                <Icon name="sliders" className="w-4 h-4 text-slate-500" />
                Keyboard shortcuts
                <kbd className="ml-auto text-[11px] text-slate-500">?</kbd>
              </button>
            </div>

            <div className="py-1 border-b border-slate-100 dark:border-slate-700">
              <button role="menuitem" onClick={() => { setShowPasswordModal(true); close(); }} className="menu-item">
                <Icon name="key" className="w-4 h-4 text-slate-500" />
                Change password
              </button>
              <button
                role="menuitem"
                onClick={() => { setShowTwoFactorModal(true); close(); }}
                className="menu-item"
                title="Require a code from an authenticator app when you sign in"
              >
                <Icon name="shield" className="w-4 h-4 text-slate-500" />
                Two-factor sign-in
                <span className="ml-auto text-xs text-slate-500">{user.twoFactorEnabled ? "On" : "Off"}</span>
              </button>
              <button
                role="menuitem"
                onClick={handleToggleDigest}
                disabled={togglingDigest}
                className="menu-item disabled:opacity-50"
                title="Daily email of overdue/due-soon tasks, RFIs, permits and insurance — requires the server to have email sending configured"
              >
                <Icon name="mail" className="w-4 h-4 text-slate-500" />
                Email digest
                <span className="ml-auto text-xs text-slate-500">{user.emailDigestOptIn ? "On" : "Off"}</span>
              </button>
              <Link role="menuitem" to="/task-templates" onClick={close} className="menu-item">
                <Icon name="template" className="w-4 h-4 text-slate-500" />
                Task templates
              </Link>
              {user.role === "ADMIN" && (
                <Link role="menuitem" to="/admin/users" onClick={close} className="menu-item">
                  <Icon name="users" className="w-4 h-4 text-slate-500" />
                  Manage users
                </Link>
              )}
            </div>

            <div className="py-1">
              <button role="menuitem" onClick={handleLogout} className="menu-item text-red-600 dark:text-red-400">
                <Icon name="logout" className="w-4 h-4" />
                Log out
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Rendered at the page root: the top bar's blur would otherwise trap them. */}
      {showPasswordModal && createPortal(<ChangePasswordModal onClose={() => setShowPasswordModal(false)} />, document.body)}
      {showTwoFactorModal && createPortal(<TwoFactorModal onClose={() => setShowTwoFactorModal(false)} />, document.body)}
    </div>
  );
}
