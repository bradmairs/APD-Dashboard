import gvwLogo from "../assets/gvw-logo.png";

// gvw-logo.png is a flat white PNG (no transparency), so on the dark-mode
// header it would show as a stark white square. Keeping it on a small
// rounded white card looks intentional in both themes instead — invisible
// against the light header, a neat chip against the dark one.
export default function GvwLogo({ className = "h-16" }: { className?: string }) {
  return (
    <div className={`${className} w-auto rounded-lg bg-white p-1.5 dark:shadow-sm`}>
      <img src={gvwLogo} alt="Goulburn Valley Water" className="h-full w-auto" />
    </div>
  );
}
