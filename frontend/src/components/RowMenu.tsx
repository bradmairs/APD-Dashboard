import { useEffect, useLayoutEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { Icon } from "./icons";

export interface RowMenuItem {
  label: string;
  icon: string;
  onClick: () => void;
  danger?: boolean;
}

// A row's ⋯ button and its menu of actions. The button is faint until the
// row is hovered (rows carry the "group" class) or the button is focused.
export default function RowMenu({ label, items }: { label: string; items: RowMenuItem[] }) {
  const [open, setOpen] = useState(false);
  const [pos, setPos] = useState({ top: 0, left: 0 });
  const buttonRef = useRef<HTMLButtonElement>(null);
  const menuRef = useRef<HTMLDivElement>(null);

  useLayoutEffect(() => {
    if (!open) return;
    const r = buttonRef.current!.getBoundingClientRect();
    setPos({ top: r.bottom + 4, left: Math.max(8, r.right - 176) });
  }, [open]);

  useEffect(() => {
    if (!open) return;
    const onDown = (e: MouseEvent) => {
      const t = e.target as Node;
      if (!menuRef.current?.contains(t) && !buttonRef.current?.contains(t)) setOpen(false);
    };
    const close = () => setOpen(false);
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && close();
    document.addEventListener("mousedown", onDown);
    document.addEventListener("keydown", onKey);
    window.addEventListener("scroll", close, true);
    return () => {
      document.removeEventListener("mousedown", onDown);
      document.removeEventListener("keydown", onKey);
      window.removeEventListener("scroll", close, true);
    };
  }, [open]);

  return (
    <>
      <button
        ref={buttonRef}
        type="button"
        onClick={(e) => {
          e.stopPropagation();
          setOpen((o) => !o);
        }}
        aria-haspopup="menu"
        aria-expanded={open}
        aria-label={label}
        title="Actions"
        className="icon-btn opacity-60 group-hover:opacity-100 focus:opacity-100"
      >
        <Icon name="more" className="w-5 h-5" />
      </button>
      {open &&
        createPortal(
          <div ref={menuRef} role="menu" style={{ top: pos.top, left: pos.left }} className="menu-panel fixed z-[60] w-44">
            {items.map((item) => (
              <button
                key={item.label}
                type="button"
                role="menuitem"
                onClick={(e) => {
                  e.stopPropagation();
                  setOpen(false);
                  item.onClick();
                }}
                className={`menu-item ${item.danger ? "!text-red-600 dark:!text-red-400" : ""}`}
              >
                <Icon name={item.icon} className="w-4 h-4 opacity-70" />
                {item.label}
              </button>
            ))}
          </div>,
          document.body
        )}
    </>
  );
}
