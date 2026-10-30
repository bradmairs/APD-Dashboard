import { createContext, ReactNode, useCallback, useContext, useState } from "react";

// A project section's list shows this many items until "Show all" is
// clicked. Only lists longer than this get the button.
export const COLLAPSE_THRESHOLD = 5;

// Sections the user has expanded, remembered in this browser per section
// (e.g. "risks"), so a list you open stays open on every project until you
// click Show less. (A new key: the old one stored whole-panel collapses.)
const STORAGE_KEY = "apd.expandedSections";

function loadExpanded(): Set<string> {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return new Set(raw ? (JSON.parse(raw) as string[]) : []);
  } catch {
    return new Set();
  }
}

function saveExpanded(ids: Set<string>) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(Array.from(ids)));
  } catch {
    // Storage unavailable (private mode etc.) — the choice just isn't remembered.
  }
}

export function useExpandedSections() {
  const [expanded, setExpandedState] = useState<Set<string>>(loadExpanded);

  const setExpanded = useCallback((ids: string[], value: boolean) => {
    setExpandedState((prev) => {
      const next = new Set(prev);
      for (const id of ids) {
        if (value) next.add(id);
        else next.delete(id);
      }
      saveExpanded(next);
      return next;
    });
  }, []);

  return { expanded, setExpanded };
}

interface ShowMoreContextValue {
  expanded: boolean;
  setExpanded: (value: boolean) => void;
}

const ShowMoreContext = createContext<ShowMoreContextValue | null>(null);

interface Props {
  id: string;
  expanded: boolean;
  onExpandedChange: (expanded: boolean) => void;
  className?: string;
  children: ReactNode;
}

// Wraps one project panel. It keeps the id the Jump-to links scroll to, and
// tells the panel's list (through useShowMore) whether to show everything or
// just the first few items. Everything else in the panel — charts, totals,
// filters — is always shown.
export default function CollapsibleSection({
  id,
  expanded,
  onExpandedChange,
  className,
  children,
}: Props) {
  return (
    <div id={id} className={className}>
      <ShowMoreContext.Provider value={{ expanded, setExpanded: onExpandedChange }}>
        {children}
      </ShowMoreContext.Provider>
    </div>
  );
}

export interface ShowMoreState<T> {
  visible: T[];
  total: number;
  hiddenCount: number;
  expanded: boolean;
  setExpanded: (value: boolean) => void;
  // False outside a project section, where lists are never limited.
  limitable: boolean;
}

// Which of a panel's items to render. Inside a project section with more
// than COLLAPSE_THRESHOLD items it returns just the first few (or, with
// `pickCollapsed`, a chosen few — e.g. the cash flow months nearest today)
// until the section is expanded. Outside a project section (e.g. the same
// panel on the dashboard) it always returns everything.
export function useShowMore<T>(
  items: T[],
  pickCollapsed?: (items: T[], limit: number) => T[]
): ShowMoreState<T> {
  const ctx = useContext(ShowMoreContext);
  const limited = !!ctx && !ctx.expanded && items.length > COLLAPSE_THRESHOLD;
  const visible = limited
    ? pickCollapsed
      ? pickCollapsed(items, COLLAPSE_THRESHOLD)
      : items.slice(0, COLLAPSE_THRESHOLD)
    : items;
  return {
    visible,
    total: items.length,
    hiddenCount: items.length - visible.length,
    expanded: ctx?.expanded ?? true,
    setExpanded: ctx?.setExpanded ?? (() => {}),
    limitable: !!ctx,
  };
}

// The "Show all N" / "Show less" control under a limited list. Renders
// nothing for a list that fits.
export function ShowMoreButton<T>({
  state,
  noun = "items",
}: {
  state: ShowMoreState<T>;
  noun?: string;
}) {
  if (!state.limitable || state.total <= COLLAPSE_THRESHOLD) return null;
  if (!state.expanded && state.hiddenCount <= 0) return null;
  return (
    <div className="pt-2 flex justify-center">
      <button
        type="button"
        onClick={() => state.setExpanded(!state.expanded)}
        aria-expanded={state.expanded}
        className="text-xs px-3 py-1 rounded-full border border-slate-200 dark:border-slate-700 text-blue-600 dark:text-blue-400 hover:bg-slate-50 dark:hover:bg-slate-700"
      >
        {state.expanded
          ? "Show less ▴"
          : `Show more — all ${state.total} ${noun} (${state.hiddenCount} hidden) ▾`}
      </button>
    </div>
  );
}
