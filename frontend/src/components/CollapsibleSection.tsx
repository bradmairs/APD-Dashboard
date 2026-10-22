import { ReactNode, useCallback, useState } from "react";

// A project section only becomes collapsible once it lists more than this
// many items — shorter ones are left as they are.
export const COLLAPSE_THRESHOLD = 5;

const STORAGE_KEY = "apd.collapsedSections";

function loadCollapsed(): Set<string> {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return new Set(raw ? (JSON.parse(raw) as string[]) : []);
  } catch {
    return new Set();
  }
}

function saveCollapsed(ids: Set<string>) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(Array.from(ids)));
  } catch {
    // Storage unavailable (private mode etc.) — the choice just isn't remembered.
  }
}

// Which project sections are collapsed. Remembered in this browser per
// section (e.g. "risks"), so a section you collapse stays collapsed on
// every project until you expand it again.
export function useCollapsedSections() {
  const [collapsed, setCollapsed] = useState<Set<string>>(loadCollapsed);

  const update = useCallback((ids: string[], value: boolean) => {
    setCollapsed((prev) => {
      const next = new Set(prev);
      for (const id of ids) {
        if (value) next.add(id);
        else next.delete(id);
      }
      saveCollapsed(next);
      return next;
    });
  }, []);

  return { collapsed, setCollapsed: update };
}

interface Props {
  id: string;
  label: string;
  count: number;
  collapsed: boolean;
  onToggle: (collapsed: boolean) => void;
  className?: string;
  children: ReactNode;
}

// Wraps one project panel. With more than COLLAPSE_THRESHOLD items it gets a
// Collapse control, and when collapsed shows a one-line summary in place of
// the panel. The id stays on the wrapper so the Jump-to links still work.
export default function CollapsibleSection({
  id,
  label,
  count,
  collapsed,
  onToggle,
  className,
  children,
}: Props) {
  if (count <= COLLAPSE_THRESHOLD) {
    return (
      <div id={id} className={className}>
        {children}
      </div>
    );
  }

  if (collapsed) {
    return (
      <div id={id}>
        <button
          type="button"
          onClick={() => onToggle(false)}
          aria-expanded={false}
          className="w-full flex items-center justify-between gap-3 bg-white dark:bg-slate-800 rounded-lg border border-slate-200 dark:border-slate-700 shadow-sm px-4 py-3 text-left hover:bg-slate-50 dark:hover:bg-slate-700/50"
        >
          <span className="text-sm font-semibold text-slate-900 dark:text-slate-100">
            {label}
            <span className="ml-2 text-xs font-normal text-slate-500 dark:text-slate-400">
              {count} items
            </span>
          </span>
          <span className="text-xs text-blue-600 dark:text-blue-400 shrink-0">Expand ▾</span>
        </button>
      </div>
    );
  }

  return (
    <div id={id} className={className}>
      <div className="flex justify-end -mb-1">
        <button
          type="button"
          onClick={() => onToggle(true)}
          aria-expanded={true}
          className="text-xs text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-slate-200 px-1"
        >
          Collapse {label} ({count}) ▴
        </button>
      </div>
      {children}
    </div>
  );
}
