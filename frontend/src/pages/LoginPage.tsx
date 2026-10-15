import { FormEvent, useState } from "react";
import { Navigate, useLocation, useNavigate } from "react-router-dom";
import { useAuth } from "../auth/AuthContext";
import ThemeToggle from "../components/ThemeToggle";
import AppLogo from "../components/AppLogo";

export default function LoginPage() {
  const { user, loading, login, completeTwoFactor } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [challengeToken, setChallengeToken] = useState<string | null>(null);
  const [code, setCode] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  if (!loading && user) {
    const from = (location.state as { from?: string })?.from || "/";
    return <Navigate to={from} replace />;
  }

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setSubmitting(true);
    setError(null);
    try {
      if (challengeToken) {
        await completeTwoFactor(challengeToken, code);
        navigate("/", { replace: true });
      } else {
        const challenge = await login(email, password);
        if (challenge) {
          setChallengeToken(challenge.challengeToken);
          setCode("");
        } else {
          navigate("/", { replace: true });
        }
      }
    } catch (err) {
      const message = err instanceof Error ? err.message : "Login failed";
      setError(message);
      // An expired challenge means the password step has to be redone.
      if (challengeToken && /expired/i.test(message)) {
        setChallengeToken(null);
        setPassword("");
      }
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-slate-50 dark:bg-slate-900 px-4 relative">
      <div className="absolute top-4 right-4">
        <ThemeToggle />
      </div>
      <div className="w-full max-w-sm bg-white dark:bg-slate-800 rounded-lg border border-slate-200 dark:border-slate-700 shadow-sm p-6">
        <div className="flex flex-col items-center mb-6">
          <AppLogo className="h-16 mb-3" />
          <h1 className="text-lg font-semibold text-slate-900 dark:text-slate-100">
            APD Project Management Dashboard
          </h1>
          <p className="text-sm text-slate-500 dark:text-slate-400">
            {challengeToken ? "Two-factor authentication" : "Sign in to continue"}
          </p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          {error && (
            <div className="bg-red-50 dark:bg-red-900/30 text-red-700 dark:text-red-400 text-sm rounded p-2">
              {error}
            </div>
          )}

          {challengeToken ? (
            <div>
              <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">
                Authentication code
              </label>
              <input
                type="text"
                required
                autoFocus
                autoComplete="one-time-code"
                inputMode="text"
                value={code}
                onChange={(e) => setCode(e.target.value)}
                placeholder="6-digit code"
                className="w-full rounded border border-slate-300 dark:border-slate-600 dark:bg-slate-700 dark:text-slate-100 px-3 py-2 text-sm tracking-widest"
              />
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
                Open your authenticator app and enter the current code, or use one
                of your recovery codes.
              </p>
              <button
                type="button"
                onClick={() => {
                  setChallengeToken(null);
                  setCode("");
                  setPassword("");
                  setError(null);
                }}
                className="text-xs text-blue-600 dark:text-blue-400 hover:underline mt-2"
              >
                Back to sign in
              </button>
            </div>
          ) : (
            <>
              <div>
                <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">
                  Email
                </label>
                <input
                  type="email"
                  required
                  autoFocus
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full rounded border border-slate-300 dark:border-slate-600 dark:bg-slate-700 dark:text-slate-100 px-3 py-2 text-sm"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">
                  Password
                </label>
                <input
                  type="password"
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full rounded border border-slate-300 dark:border-slate-600 dark:bg-slate-700 dark:text-slate-100 px-3 py-2 text-sm"
                />
              </div>
            </>
          )}

          <button
            type="submit"
            disabled={submitting}
            className="w-full px-4 py-2 text-sm rounded bg-blue-600 text-white hover:bg-blue-700 disabled:opacity-50"
          >
            {submitting ? (challengeToken ? "Verifying…" : "Signing in…") : challengeToken ? "Verify" : "Sign in"}
          </button>
        </form>
      </div>
    </div>
  );
}
