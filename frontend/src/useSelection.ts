import { useState } from "react";

// Tracks a set of selected row ids for a register panel's bulk-action
// toolbar. Selection is by id rather than by object identity so it survives
// a data reload (e.g. after another row's edit refetches the whole list).
export function useSelection() {
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());

  function toggle(id: string) {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  function toggleAll(ids: string[]) {
    setSelectedIds((prev) => (prev.size === ids.length ? new Set() : new Set(ids)));
  }

  function clear() {
    setSelectedIds(new Set());
  }

  return {
    selectedIds,
    isSelected: (id: string) => selectedIds.has(id),
    toggle,
    toggleAll,
    clear,
    count: selectedIds.size,
  };
}
