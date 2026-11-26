import { ReactNode, useState } from "react";

interface Column<S extends string> {
  status: S;
  label: string;
}

// A small board: one column per status, a card per item. Drag a card to
// another column to change its status (shown straight away while it saves),
// or use the arrow buttons on a focused card from the keyboard.
export default function StatusBoard<T extends { id: string }, S extends string>({
  items,
  columns,
  statusOf,
  renderCard,
  onMove,
  readOnly,
}: {
  items: T[];
  columns: Column<S>[];
  statusOf: (item: T) => S;
  renderCard: (item: T) => ReactNode;
  onMove: (item: T, status: S) => Promise<void>;
  readOnly?: boolean;
}) {
  const [dragId, setDragId] = useState<string | null>(null);
  const [over, setOver] = useState<S | null>(null);
  const [moved, setMoved] = useState<Record<string, S>>({});
  const current = (i: T) => moved[i.id] ?? statusOf(i);

  async function move(item: T, status: S) {
    if (current(item) === status) return;
    setMoved((m) => ({ ...m, [item.id]: status }));
    try {
      await onMove(item, status);
    } finally {
      setMoved((m) => {
        const next = { ...m };
        delete next[item.id];
        return next;
      });
    }
  }

  return (
    <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
      {columns.map((col, ci) => {
        const list = items.filter((i) => current(i) === col.status);
        return (
          <section
            key={col.status}
            aria-label={`${col.label} (${list.length})`}
            onDragOver={(e) => {
              if (!dragId || readOnly) return;
              e.preventDefault();
              setOver(col.status);
            }}
            onDragLeave={() => setOver((o) => (o === col.status ? null : o))}
            onDrop={(e) => {
              e.preventDefault();
              setOver(null);
              const item = items.find((i) => i.id === dragId);
              setDragId(null);
              if (item) move(item, col.status);
            }}
            className={`rounded-xl p-2 min-h-[6rem] transition-colors ${
              over === col.status ? "bg-blue-50 ring-2 ring-blue-300 dark:bg-blue-500/10 dark:ring-blue-700" : "bg-slate-100/70 dark:bg-slate-900/60"
            }`}
          >
            <header className="px-2 py-1.5 text-xs font-semibold text-slate-600 dark:text-slate-300">
              {col.label} <span className="font-normal text-slate-500 tabular-nums">{list.length}</span>
            </header>
            <ul className="space-y-2">
              {list.map((item) => (
                <li
                  key={item.id}
                  draggable={!readOnly}
                  onDragStart={(e) => {
                    setDragId(item.id);
                    e.dataTransfer.effectAllowed = "move";
                  }}
                  onDragEnd={() => {
                    setDragId(null);
                    setOver(null);
                  }}
                  tabIndex={0}
                  onKeyDown={(e) => {
                    if (readOnly) return;
                    if (e.key === "ArrowRight" && ci < columns.length - 1) {
                      e.preventDefault();
                      move(item, columns[ci + 1].status);
                    } else if (e.key === "ArrowLeft" && ci > 0) {
                      e.preventDefault();
                      move(item, columns[ci - 1].status);
                    }
                  }}
                  aria-label={readOnly ? undefined : "Use left and right arrow keys to move between columns"}
                  className={`card p-2.5 text-sm ${readOnly ? "" : "cursor-grab active:cursor-grabbing"} ${dragId === item.id ? "opacity-50" : ""}`}
                >
                  {renderCard(item)}
                </li>
              ))}
            </ul>
          </section>
        );
      })}
    </div>
  );
}
