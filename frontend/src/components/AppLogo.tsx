// A brand-neutral app mark used on the login page.
// Plain SVG on a tinted chip, so it's theme-aware for free (no white-PNG
// dark-mode problem to work around).
export default function AppLogo({ className = "h-16" }: { className?: string }) {
  return (
    <div
      className={`${className} aspect-square rounded-lg bg-blue-50 dark:bg-blue-500/10 text-blue-600 dark:text-blue-400 p-3 flex items-center justify-center`}
    >
      <svg viewBox="0 0 24 24" fill="currentColor" className="h-full w-full" aria-hidden="true">
        <rect x="3" y="3" width="7" height="9" rx="1.5" />
        <rect x="12" y="3" width="9" height="5" rx="1.5" />
        <rect x="12" y="10" width="9" height="11" rx="1.5" />
        <rect x="3" y="14" width="7" height="7" rx="1.5" />
      </svg>
    </div>
  );
}
