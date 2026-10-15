import { createContext, ReactNode, useCallback, useContext, useRef, useState } from "react";

interface UndoEntry {
  id: number;
  message: string;
  onUndo: () => Promise<void>;
}

interface UndoContextValue {
  // Shows a brief "<message> Undo" toast. onUndo runs the action that
  // reverses the change (typically re-creating a just-deleted row) if the
  // user clicks Undo before the toast dismisses itself.
  notifyUndo: (message: string, onUndo: () => Promise<void>) => void;
}

const UndoContext = createContext<UndoContextValue | null>(null);

const DISMISS_AFTER_MS = 8000;

// A small stack of dismissible "Undo" toasts, mounted once at the app root
// (see App.tsx) so any page can call useUndoToast() without threading a
// prop down through every panel. Deleting several rows in a row stacks a
// toast for each — every delete gets its own undo window rather than the
// newest one silently replacing the last.
export function UndoToastProvider({ children }: { children: ReactNode }) {
  const [entries, setEntries] = useState<UndoEntry[]>([]);
  const nextId = useRef(0);

  const dismiss = useCallback((id: number) => {
    setEntries((prev) => prev.filter((entry) => entry.id !== id));
  }, []);

  const notifyUndo = useCallback(
    (message: string, onUndo: () => Promise<void>) => {
      const id = nextId.current++;
      setEntries((prev) => [...prev, { id, message, onUndo }]);
      setTimeout(() => dismiss(id), DISMISS_AFTER_MS);
    },
    [dismiss]
  );

  async function handleUndo(entry: UndoEntry) {
    dismiss(entry.id);
    await entry.onUndo();
  }

  return (
    <UndoContext.Provider value={{ notifyUndo }}>
      {children}
      {entries.length > 0 && (
        <div className="fixed bottom-4 inset-x-0 z-50 flex flex-col items-center gap-2 px-4 pointer-events-none">
          {entries.map((entry) => (
            <div
              key={entry.id}
              className="pointer-events-auto flex items-center gap-3 bg-slate-900 dark:bg-slate-700 text-white text-sm rounded-lg shadow-lg px-4 py-2.5 max-w-full"
            >
              <span className="truncate">{entry.message}</span>
              <button
                onClick={() => handleUndo(entry)}
                className="shrink-0 font-medium text-blue-300 hover:text-blue-200 underline underline-offset-2"
              >
                Undo
              </button>
              <button
                onClick={() => dismiss(entry.id)}
                aria-label="Dismiss"
                className="shrink-0 text-slate-400 hover:text-slate-200 leading-none"
              >
                ×
              </button>
            </div>
          ))}
        </div>
      )}
    </UndoContext.Provider>
  );
}

export function useUndoToast(): UndoContextValue {
  const ctx = useContext(UndoContext);
  if (!ctx) throw new Error("useUndoToast must be used within an UndoToastProvider");
  return ctx;
}
