interface Tab<T extends string> {
  id: T;
  label: string;
}

interface Props<T extends string> {
  tabs: Tab<T>[];
  active: T;
  onChange: (id: T) => void;
}

// An underline tab bar — shared by any page that needs to split a long
// stack of panels into sections (ProjectDetailPage, DashboardPage) rather
// than reinventing the same button row per page. On a narrow screen the
// tabs wrap onto a second line instead of scrolling, so there are never
// scroll bars on the bar itself.
export default function Tabs<T extends string>({ tabs, active, onChange }: Props<T>) {
  return (
    <div className="border-b border-slate-200 dark:border-slate-700">
      <nav className="flex flex-wrap gap-x-1" aria-label="Tabs">
        {tabs.map((tab) => (
          <button
            key={tab.id}
            onClick={() => onChange(tab.id)}
            className={`px-4 py-2.5 text-sm font-medium border-b-2 whitespace-nowrap -mb-px ${
              active === tab.id
                ? "border-blue-600 text-blue-600 dark:border-blue-400 dark:text-blue-400"
                : "border-transparent text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 hover:border-slate-300 dark:hover:border-slate-600"
            }`}
          >
            {tab.label}
          </button>
        ))}
      </nav>
    </div>
  );
}
