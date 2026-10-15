import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import {
  createUser,
  deleteUser,
  getUsers,
  resetUserTwoFactor,
  setUserActive,
  updateUserRole,
} from "../api";
import { Role, User } from "../types";
import { formatDate } from "../format";
import { useAuth } from "../auth/AuthContext";
import { useConfirm } from "../confirm/ConfirmContext";
import CreateUserModal from "../components/CreateUserModal";
import UserMenu from "../components/UserMenu";
import GvwLogo from "../components/GvwLogo";

export default function AdminUsersPage() {
  const { user: currentUser } = useAuth();
  const confirm = useConfirm();
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showCreateModal, setShowCreateModal] = useState(false);

  async function load() {
    setLoading(true);
    setError(null);
    try {
      setUsers(await getUsers());
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load users");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load();
  }, []);

  async function handleRoleChange(user: User, role: Role) {
    try {
      await updateUserRole(user.id, role);
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to update role");
    }
  }

  async function handleActiveToggle(user: User) {
    try {
      await setUserActive(user.id, !user.active);
      await load();
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Failed to update account status"
      );
    }
  }

  async function handleDelete(user: User) {
    const ok = await confirm(
      `Permanently delete ${user.name} (${user.email})? They'll lose access immediately. ` +
        `Records they created are kept and still show their name. This can't be undone — ` +
        `use Deactivate instead if you may want them back.`
    );
    if (!ok) return;
    try {
      await deleteUser(user.id);
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to delete user");
    }
  }

  async function handleResetTwoFactor(user: User) {
    if (
      !window.confirm(
        `Turn off two-factor authentication for ${user.name}? They'll be able to sign in with just their password until they set it up again.`
      )
    ) {
      return;
    }
    try {
      await resetUserTwoFactor(user.id);
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to reset two-factor authentication");
    }
  }

  return (
    <div className="min-h-screen">
      <header className="sticky top-0 z-30 bg-white dark:bg-slate-800 border-b border-slate-200 dark:border-slate-700">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 py-5">
          <Link
            to="/"
            className="text-sm text-blue-600 dark:text-blue-400 hover:underline"
          >
            ← Back to dashboard
          </Link>
          <div className="flex flex-wrap items-center justify-between gap-y-3 mt-2">
            <div className="flex items-center gap-4">
              <Link to="/" className="hover:opacity-90">
                <GvwLogo className="h-14" />
              </Link>
              <div>
                <h1 className="text-xl font-semibold text-slate-900 dark:text-slate-100">
                  Users
                </h1>
                <p className="text-sm text-slate-500 dark:text-slate-400">
                  Manage team accounts and roles
                </p>
              </div>
            </div>
            <div className="flex flex-wrap items-center gap-3">
              <button
                onClick={() => setShowCreateModal(true)}
                className="px-4 py-2 text-sm rounded bg-blue-600 text-white hover:bg-blue-700"
              >
                + New User
              </button>
              <UserMenu />
            </div>
          </div>
        </div>
      </header>

      <main className="max-w-4xl mx-auto px-4 sm:px-6 py-6">
        {error && (
          <div className="bg-red-50 dark:bg-red-900/30 text-red-700 dark:text-red-400 text-sm rounded p-3 mb-4">
            {error}
          </div>
        )}

        {loading ? (
          <div className="text-center text-slate-500 dark:text-slate-400 py-12">
            Loading…
          </div>
        ) : (
          <div className="bg-white dark:bg-slate-800 rounded-lg border border-slate-200 dark:border-slate-700 shadow-sm overflow-hidden">
            <table className="min-w-full divide-y divide-slate-200 dark:divide-slate-700 text-sm">
              <thead className="bg-slate-50 dark:bg-slate-900/50">
                <tr>
                  <th className="px-4 py-3 text-left font-medium text-slate-600 dark:text-slate-400">
                    Name
                  </th>
                  <th className="px-4 py-3 text-left font-medium text-slate-600 dark:text-slate-400">
                    Email
                  </th>
                  <th className="px-4 py-3 text-left font-medium text-slate-600 dark:text-slate-400">
                    Role
                  </th>
                  <th className="px-4 py-3 text-left font-medium text-slate-600 dark:text-slate-400">
                    Status
                  </th>
                  <th className="px-4 py-3 text-left font-medium text-slate-600 dark:text-slate-400">
                    2FA
                  </th>
                  <th className="px-4 py-3 text-left font-medium text-slate-600 dark:text-slate-400">
                    Joined
                  </th>
                  <th className="px-4 py-3"></th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-700">
                {users.map((user) => (
                  <tr
                    key={user.id}
                    className={user.active ? "" : "bg-slate-50 dark:bg-slate-900/50"}
                  >
                    <td
                      className={`px-4 py-3 font-medium ${
                        user.active
                          ? "text-slate-900 dark:text-slate-100"
                          : "text-slate-400 dark:text-slate-500"
                      }`}
                    >
                      {user.name}
                      {user.id === currentUser?.id && (
                        <span className="ml-2 text-xs text-slate-400 dark:text-slate-500">
                          (you)
                        </span>
                      )}
                    </td>
                    <td
                      className={`px-4 py-3 ${
                        user.active
                          ? "text-slate-700 dark:text-slate-300"
                          : "text-slate-400 dark:text-slate-500"
                      }`}
                    >
                      {user.email}
                    </td>
                    <td className="px-4 py-3">
                      <select
                        value={user.role}
                        disabled={user.id === currentUser?.id || !user.active}
                        onChange={(e) =>
                          handleRoleChange(user, e.target.value as Role)
                        }
                        className="text-sm rounded border border-slate-300 dark:border-slate-600 dark:bg-slate-700 dark:text-slate-100 px-2 py-1 disabled:opacity-50"
                      >
                        <option value="MEMBER">Member</option>
                        <option value="ADMIN">Admin</option>
                        <option value="VIEWER">Viewer (read-only)</option>
                      </select>
                    </td>
                    <td className="px-4 py-3">
                      {user.active ? (
                        <span className="text-xs text-green-700 dark:text-green-400 bg-green-50 dark:bg-green-900/30 px-2 py-0.5 rounded-full">
                          Active
                        </span>
                      ) : (
                        <span className="text-xs text-slate-500 dark:text-slate-400 bg-slate-100 dark:bg-slate-700 px-2 py-0.5 rounded-full">
                          Deactivated
                        </span>
                      )}
                    </td>
                    <td className="px-4 py-3">
                      {user.twoFactorEnabled ? (
                        <span className="inline-flex items-center gap-2">
                          <span className="text-xs text-green-700 dark:text-green-400 bg-green-50 dark:bg-green-900/30 px-2 py-0.5 rounded-full">
                            On
                          </span>
                          <button
                            onClick={() => handleResetTwoFactor(user)}
                            className="text-xs text-red-600 dark:text-red-400 hover:underline"
                            title="Switch off two-factor auth for someone who lost their authenticator and recovery codes"
                          >
                            Reset
                          </button>
                        </span>
                      ) : (
                        <span className="text-xs text-slate-400 dark:text-slate-500">Off</span>
                      )}
                    </td>
                    <td
                      className={`px-4 py-3 ${
                        user.active
                          ? "text-slate-700 dark:text-slate-300"
                          : "text-slate-400 dark:text-slate-500"
                      }`}
                    >
                      {formatDate(user.createdAt)}
                    </td>
                    <td className="px-4 py-3 text-right">
                      <button
                        onClick={() => handleActiveToggle(user)}
                        disabled={user.id === currentUser?.id}
                        title={
                          user.id === currentUser?.id
                            ? "You can't deactivate your own account"
                            : undefined
                        }
                        className={`text-xs hover:underline disabled:opacity-40 disabled:no-underline disabled:cursor-not-allowed ${
                          user.active
                            ? "text-red-600 dark:text-red-400"
                            : "text-blue-600 dark:text-blue-400"
                        }`}
                      >
                        {user.active ? "Deactivate" : "Reactivate"}
                      </button>
                      <button
                        onClick={() => handleDelete(user)}
                        disabled={user.id === currentUser?.id}
                        title={
                          user.id === currentUser?.id
                            ? "You can't delete your own account"
                            : "Permanently delete this account"
                        }
                        className="ml-3 text-xs text-red-600 dark:text-red-400 hover:underline disabled:opacity-40 disabled:no-underline disabled:cursor-not-allowed"
                      >
                        Delete
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </main>

      {showCreateModal && (
        <CreateUserModal
          onClose={() => setShowCreateModal(false)}
          onCreate={async (data) => {
            const user = await createUser(data);
            await load();
            return user;
          }}
        />
      )}
    </div>
  );
}
