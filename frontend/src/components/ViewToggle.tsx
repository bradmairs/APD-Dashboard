import { Icon } from "./icons";

export type BoardView = "list" | "board";

export function loadView(key: string): BoardView {
  try {
    return localStorage.getItem(`apd.view.${key}`) === "board" ? "board" : "list";
  } catch {
    return "list";
  }
}

export function saveView(key: string, view: BoardView) {
  try {
    localStorage.setItem(`apd.view.${key}`, view);
  } catch {
    // not remembered
  }
}

// List / Board switch for a register (remembered in this browser).
export default function ViewToggle({ view, onChange }: { view: BoardView; onChange: (v: BoardView) => void }) {
  return (
    <div role="group" aria-label="Show as" className="inline-flex rounded-lg bg-slate-100 dark:bg-slate-800 p-0.5 text-xs mb-3">
      {(
        [
          { id: "list", label: "List", icon: "rows" },
          { id: "board", label: "Board", icon: "board" },
        ] as const
      ).map((v) => (
        <button
          key={v.id}
          type="button"
          aria-pressed={view === v.id}
          onClick={() => onChange(v.id)}
          className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-md ${
            view === v.id ? "bg-white dark:bg-slate-950 shadow-sm text-slate-900 dark:text-slate-100" : "text-slate-600 dark:text-slate-300"
          }`}
        >
          <Icon name={v.icon} className="w-3.5 h-3.5" />
          {v.label}
        </button>
      ))}
    </div>
  );
}
