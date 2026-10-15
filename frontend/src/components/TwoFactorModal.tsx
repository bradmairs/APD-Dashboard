import { FormEvent, useState } from "react";
import {
  disableTwoFactor,
  enableTwoFactor,
  regenerateRecoveryCodes,
  startTwoFactorSetup,
  TwoFactorSetup,
} from "../api";
import { useAuth } from "../auth/AuthContext";

type Step = "intro" | "scan" | "codes" | "manage" | "disable" | "regenerate";

const inputClass =
  "w-full rounded border border-slate-300 dark:border-slate-600 dark:bg-slate-700 dark:text-slate-100 px-3 py-2 text-sm";
const labelClass = "block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1";
const primaryButton =
  "px-4 py-2 text-sm rounded bg-blue-600 text-white hover:bg-blue-700 disabled:opacity-50";
const secondaryButton =
  "px-4 py-2 text-sm rounded border border-slate-300 dark:border-slate-600 text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-700";

export default function TwoFactorModal({ onClose }: { onClose: () => void }) {
  const { user, refreshUser } = useAuth();
  const [step, setStep] = useState<Step>(user?.twoFactorEnabled ? "manage" : "intro");
  const [password, setPassword] = useState("");
  const [code, setCode] = useState("");
  const [setup, setSetup] = useState<TwoFactorSetup | null>(null);
  const [recoveryCodes, setRecoveryCodes] = useState<string[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [copied, setCopied] = useState(false);

  async function run(action: () => Promise<void>) {
    setBusy(true);
    setError(null);
    try {
      await action();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong");
    } finally {
      setBusy(false);
    }
  }

  function handleStart(e: FormEvent) {
    e.preventDefault();
    run(async () => {
      setSetup(await startTwoFactorSetup(password));
      setPassword("");
      setCode("");
      setStep("scan");
    });
  }

  function handleEnable(e: FormEvent) {
    e.preventDefault();
    run(async () => {
      const result = await enableTwoFactor(code);
      setRecoveryCodes(result.recoveryCodes);
      setSetup(null);
      setCode("");
      setStep("codes");
      await refreshUser();
    });
  }

  function handleDisable(e: FormEvent) {
    e.preventDefault();
    run(async () => {
      await disableTwoFactor(password, code);
      await refreshUser();
      onClose();
    });
  }

  function handleRegenerate(e: FormEvent) {
    e.preventDefault();
    run(async () => {
      const result = await regenerateRecoveryCodes(password, code);
      setRecoveryCodes(result.recoveryCodes);
      setPassword("");
      setCode("");
      setStep("codes");
    });
  }

  async function copyCodes() {
    try {
      await navigator.clipboard.writeText(recoveryCodes.join("\n"));
      setCopied(true);
    } catch {
      setCopied(false);
    }
  }

  function downloadCodes() {
    const blob = new Blob(
      [
        `APD Project Management Dashboard recovery codes for ${user?.email}\n` +
          "Each code works once. Keep them somewhere safe.\n\n" +
          recoveryCodes.join("\n") +
          "\n",
      ],
      { type: "text/plain" }
    );
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "apd-pm-recovery-codes.txt";
    a.click();
    URL.revokeObjectURL(url);
  }

  function passwordAndCodeFields() {
    return (
      <>
        <div>
          <label className={labelClass}>Password</label>
          <input
            type="password"
            required
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className={inputClass}
          />
        </div>
        <div>
          <label className={labelClass}>Authentication or recovery code</label>
          <input
            type="text"
            required
            autoComplete="one-time-code"
            value={code}
            onChange={(e) => setCode(e.target.value)}
            className={inputClass}
          />
        </div>
      </>
    );
  }

  const errorBox = error && (
    <div className="bg-red-50 dark:bg-red-900/30 text-red-700 dark:text-red-400 text-sm rounded p-2">
      {error}
    </div>
  );

  return (
    <div className="fixed inset-0 bg-black/40 flex items-center justify-center p-4 z-50">
      <div className="bg-white dark:bg-slate-800 rounded-lg shadow-xl w-full max-w-sm max-h-[90vh] overflow-y-auto">
        {step === "intro" && (
          <form onSubmit={handleStart} className="p-6 space-y-4">
            <h2 className="text-lg font-semibold text-slate-900 dark:text-slate-100">
              Turn on two-factor authentication
            </h2>
            <p className="text-sm text-slate-600 dark:text-slate-400">
              After your password you'll also enter a 6-digit code from an
              authenticator app (Google Authenticator, Microsoft Authenticator,
              Authy, 1Password…). Confirm your password to begin.
            </p>
            {errorBox}
            <div>
              <label className={labelClass}>Password</label>
              <input
                type="password"
                required
                autoFocus
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className={inputClass}
              />
            </div>
            <div className="flex justify-end gap-3 pt-2">
              <button type="button" onClick={onClose} className={secondaryButton}>
                Cancel
              </button>
              <button type="submit" disabled={busy} className={primaryButton}>
                {busy ? "Checking…" : "Continue"}
              </button>
            </div>
          </form>
        )}

        {step === "scan" && setup && (
          <form onSubmit={handleEnable} className="p-6 space-y-4">
            <h2 className="text-lg font-semibold text-slate-900 dark:text-slate-100">
              Scan the QR code
            </h2>
            <p className="text-sm text-slate-600 dark:text-slate-400">
              Scan this with your authenticator app, then enter the 6-digit code
              it shows to finish.
            </p>
            <div className="flex justify-center">
              {/* white background so the QR stays scannable in dark mode */}
              <img
                src={setup.qrDataUrl}
                alt="Two-factor setup QR code"
                className="bg-white p-2 rounded border border-slate-200"
                width={220}
                height={220}
              />
            </div>
            <details className="text-xs text-slate-500 dark:text-slate-400">
              <summary className="cursor-pointer">Can't scan? Enter the key manually</summary>
              <code className="block mt-2 break-all select-all text-slate-800 dark:text-slate-200">
                {setup.secret}
              </code>
            </details>
            {errorBox}
            <div>
              <label className={labelClass}>6-digit code</label>
              <input
                type="text"
                required
                autoFocus
                inputMode="numeric"
                autoComplete="one-time-code"
                value={code}
                onChange={(e) => setCode(e.target.value)}
                className={`${inputClass} tracking-widest`}
              />
            </div>
            <div className="flex justify-end gap-3 pt-2">
              <button type="button" onClick={onClose} className={secondaryButton}>
                Cancel
              </button>
              <button type="submit" disabled={busy} className={primaryButton}>
                {busy ? "Verifying…" : "Turn on"}
              </button>
            </div>
          </form>
        )}

        {step === "codes" && (
          <div className="p-6 space-y-4">
            <h2 className="text-lg font-semibold text-slate-900 dark:text-slate-100">
              Save your recovery codes
            </h2>
            <p className="text-sm text-slate-600 dark:text-slate-400">
              If you lose your phone, each of these codes lets you sign in once.
              They're shown only now — store them somewhere safe (a password
              manager is ideal).
            </p>
            <ul className="grid grid-cols-2 gap-1 font-mono text-sm bg-slate-50 dark:bg-slate-900/50 rounded border border-slate-200 dark:border-slate-700 p-3 text-slate-800 dark:text-slate-200 select-all">
              {recoveryCodes.map((c) => (
                <li key={c}>{c}</li>
              ))}
            </ul>
            <div className="flex gap-3">
              <button type="button" onClick={copyCodes} className={secondaryButton}>
                {copied ? "Copied" : "Copy"}
              </button>
              <button type="button" onClick={downloadCodes} className={secondaryButton}>
                Download
              </button>
            </div>
            <div className="flex justify-end pt-2">
              <button type="button" onClick={onClose} className={primaryButton}>
                I've saved them
              </button>
            </div>
          </div>
        )}

        {step === "manage" && (
          <div className="p-6 space-y-4">
            <h2 className="text-lg font-semibold text-slate-900 dark:text-slate-100">
              Two-factor authentication is on
            </h2>
            <p className="text-sm text-slate-600 dark:text-slate-400">
              Signing in needs your password and a code from your authenticator
              app.
            </p>
            <div className="flex flex-col gap-2">
              <button
                type="button"
                onClick={() => {
                  setError(null);
                  setPassword("");
                  setCode("");
                  setStep("regenerate");
                }}
                className={secondaryButton}
              >
                Get new recovery codes
              </button>
              <button
                type="button"
                onClick={() => {
                  setError(null);
                  setPassword("");
                  setCode("");
                  setStep("disable");
                }}
                className="px-4 py-2 text-sm rounded border border-red-300 dark:border-red-700 text-red-700 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20"
              >
                Turn off two-factor authentication
              </button>
            </div>
            <div className="flex justify-end pt-2">
              <button type="button" onClick={onClose} className={secondaryButton}>
                Close
              </button>
            </div>
          </div>
        )}

        {(step === "disable" || step === "regenerate") && (
          <form
            onSubmit={step === "disable" ? handleDisable : handleRegenerate}
            className="p-6 space-y-4"
          >
            <h2 className="text-lg font-semibold text-slate-900 dark:text-slate-100">
              {step === "disable" ? "Turn off two-factor authentication" : "Get new recovery codes"}
            </h2>
            <p className="text-sm text-slate-600 dark:text-slate-400">
              {step === "disable"
                ? "Confirm with your password and a current code."
                : "This replaces your old recovery codes. Confirm with your password and a current code."}
            </p>
            {errorBox}
            {passwordAndCodeFields()}
            <div className="flex justify-end gap-3 pt-2">
              <button type="button" onClick={() => setStep("manage")} className={secondaryButton}>
                Back
              </button>
              <button type="submit" disabled={busy} className={primaryButton}>
                {busy ? "Working…" : step === "disable" ? "Turn off" : "Generate"}
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
}
