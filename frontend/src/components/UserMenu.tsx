import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useAuth } from "../auth/AuthContext";
import { updateDigestPreference } from "../api";
import ChangePasswordModal from "./ChangePasswordModal";
import TwoFactorModal from "./TwoFactorModal";
import GlobalSearch from "./GlobalSearch";
import NotificationBell from "./NotificationBell";
import ThemeToggle from "./ThemeToggle";

export default function UserMenu() {
  const { user, logout, refreshUser } = useAuth();
  const navigate = useNavigate();
  const [menuOpen, setMenuOpen] = useState(false);
  const [showPasswordModal, setShowPasswordModal] = useState(false);
  const [showTwoFactorModal, setShowTwoFactorModal] = useState(false);
  const [togglingDigest, setTogglingDigest] = useState(false);

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

  if (!user) return null;

  return (
    <div className="flex flex-wrap items-center gap-3 text-sm">
      <GlobalSearch />
      <ThemeToggle />
      <NotificationBell />

      <div className="relative">
        <button
          onClick={() => setMenuOpen((open) => !open)}
          className="text-slate-600 hover:text-slate-900 dark:text-slate-300 dark:hover:text-slate-100"
        >
          {user.name}
          {user.role === "ADMIN" && (
            <span className="ml-1.5 text-xs text-blue-600 dark:text-blue-400 font-medium">
              Admin
            </span>
          )}
        </button>

        {menuOpen && (
          <>
            <div
              className="fixed inset-0 z-10"
              onClick={() => setMenuOpen(false)}
            />
            <div className="absolute right-0 top-full mt-2 w-48 bg-white dark:bg-slate-800 rounded-md border border-slate-200 dark:border-slate-700 shadow-lg z-20 py-1">
              <button
                onClick={() => {
                  setShowPasswordModal(true);
                  setMenuOpen(false);
                }}
                className="w-full text-left px-4 py-2 text-sm text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-700"
              >
                Change Password
              </button>
              <button
                onClick={() => {
                  setShowTwoFactorModal(true);
                  setMenuOpen(false);
                }}
                className="w-full text-left px-4 py-2 text-sm text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-700"
                title="Require a code from an authenticator app when you sign in"
              >
                Two-Factor Auth: {user.twoFactorEnabled ? "On" : "Off"}
              </button>
              <button
                onClick={handleToggleDigest}
                disabled={togglingDigest}
                className="w-full text-left px-4 py-2 text-sm text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-700 disabled:opacity-50"
                title="Daily email of overdue/due-soon tasks, RFIs, permits and insurance — requires the server to have email sending configured"
              >
                Email Digest: {user.emailDigestOptIn ? "On" : "Off"}
              </button>
              <Link
                to="/task-templates"
                onClick={() => setMenuOpen(false)}
                className="block px-4 py-2 text-sm text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-700"
              >
                Task Templates
              </Link>
              {user.role === "ADMIN" && (
                <Link
                  to="/admin/users"
                  onClick={() => setMenuOpen(false)}
                  className="block px-4 py-2 text-sm text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-700"
                >
                  Manage Users
                </Link>
              )}
            </div>
          </>
        )}
      </div>

      <button
        onClick={handleLogout}
        className="px-3 py-1.5 rounded border border-slate-300 dark:border-slate-600 text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-700"
      >
        Log out
      </button>

      {showPasswordModal && (
        <ChangePasswordModal onClose={() => setShowPasswordModal(false)} />
      )}
      {showTwoFactorModal && (
        <TwoFactorModal onClose={() => setShowTwoFactorModal(false)} />
      )}
    </div>
  );
}
