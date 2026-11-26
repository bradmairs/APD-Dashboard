import { RefObject, useEffect } from "react";

// Keyboard support for a pop-up menu: when it opens, focus moves to the
// first item; Up/Down (and Home/End) move between items. Escape is handled
// by each menu.
export function useMenuKeys(menuRef: RefObject<HTMLElement>, open: boolean) {
  useEffect(() => {
    if (!open) return;
    const menu = menuRef.current;
    if (!menu) return;
    const items = () => Array.from(menu.querySelectorAll<HTMLElement>('[role="menuitem"]:not([disabled])'));
    requestAnimationFrame(() => items()[0]?.focus());
    const onKey = (e: KeyboardEvent) => {
      const list = items();
      if (list.length === 0) return;
      const i = list.indexOf(document.activeElement as HTMLElement);
      if (e.key === "ArrowDown") {
        e.preventDefault();
        list[(i + 1) % list.length].focus();
      } else if (e.key === "ArrowUp") {
        e.preventDefault();
        list[(i - 1 + list.length) % list.length].focus();
      } else if (e.key === "Home") {
        e.preventDefault();
        list[0].focus();
      } else if (e.key === "End") {
        e.preventDefault();
        list[list.length - 1].focus();
      }
    };
    menu.addEventListener("keydown", onKey);
    return () => menu.removeEventListener("keydown", onKey);
  }, [menuRef, open]);
}
