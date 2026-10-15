import { useSearchParams } from "react-router-dom";

// Keeps a page's active tab in the URL (?tab=schedule) so refresh and Back
// return to the same tab, and links can open a specific one. The default tab
// is left out of the URL to keep it clean; unknown values fall back to it.
export function useTabParam<T extends string>(
  tabs: readonly { id: T }[],
  defaultTab: T
): [T, (tab: T) => void] {
  const [searchParams, setSearchParams] = useSearchParams();
  const raw = searchParams.get("tab");
  const active = tabs.some((t) => t.id === raw) ? (raw as T) : defaultTab;

  function setActive(tab: T) {
    setSearchParams(
      (prev) => {
        const next = new URLSearchParams(prev);
        if (tab === defaultTab) next.delete("tab");
        else next.set("tab", tab);
        return next;
      },
      { preventScrollReset: true }
    );
  }

  return [active, setActive];
}
