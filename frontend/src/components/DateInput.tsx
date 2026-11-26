import { useEffect, useLayoutEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { Icon } from "./icons";

interface Props {
  // "yyyy-mm-dd", or "" for no date — the same as an <input type="date">.
  value: string;
  // Same shape as an input's onChange as the forms use it, so this is a
  // drop-in replacement: `onChange={(e) => setDue(e.target.value)}`.
  onChange?: (e: { target: { value: string } }) => void;
  onBlur?: () => void;
  className?: string;
  id?: string;
  required?: boolean;
  disabled?: boolean;
  min?: string;
  max?: string;
  title?: string;
  placeholder?: string;
  "aria-label"?: string;
}

const WEEKDAYS = ["Mo", "Tu", "We", "Th", "Fr", "Sa", "Su"];

function pad(n: number) {
  return String(n).padStart(2, "0");
}
function toIso(d: Date) {
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}
function parseIso(value: string): Date | null {
  const m = /^(\d{4})-(\d{2})-(\d{2})/.exec(value);
  return m ? new Date(Number(m[1]), Number(m[2]) - 1, Number(m[3])) : null;
}

// A date field with a pop-up calendar (month view, Today and Clear) in the
// app's own style, instead of each browser's built-in date box. Values are
// the same "yyyy-mm-dd" strings, so forms didn't need to change.
export default function DateInput({
  value,
  onChange,
  onBlur,
  className = "",
  id,
  required,
  disabled,
  min,
  max,
  title,
  placeholder = "Pick a date",
  "aria-label": ariaLabel,
}: Props) {
  const selected = parseIso(value);
  const [open, setOpen] = useState(false);
  const [month, setMonth] = useState<Date>(() => {
    const base = selected ?? new Date();
    return new Date(base.getFullYear(), base.getMonth(), 1);
  });
  const [pos, setPos] = useState<{ top: number; left: number }>({ top: 0, left: 0 });
  const buttonRef = useRef<HTMLButtonElement>(null);
  const popRef = useRef<HTMLDivElement>(null);

  function place() {
    const r = buttonRef.current?.getBoundingClientRect();
    if (!r) return;
    const width = 272;
    const height = 330;
    const left = Math.min(Math.max(8, r.left), window.innerWidth - width - 8);
    const below = r.bottom + 6;
    const top = below + height > window.innerHeight && r.top - height - 6 > 0 ? r.top - height - 6 : below;
    setPos({ top, left });
  }

  useLayoutEffect(() => {
    if (open) place();
  }, [open]);

  useEffect(() => {
    if (!open) return;
    const onDown = (e: MouseEvent) => {
      const t = e.target as Node;
      if (!popRef.current?.contains(t) && !buttonRef.current?.contains(t)) close();
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        e.stopPropagation();
        close();
        buttonRef.current?.focus();
      }
    };
    const onMove = () => place();
    document.addEventListener("mousedown", onDown);
    document.addEventListener("keydown", onKey, true);
    window.addEventListener("resize", onMove);
    window.addEventListener("scroll", onMove, true);
    return () => {
      document.removeEventListener("mousedown", onDown);
      document.removeEventListener("keydown", onKey, true);
      window.removeEventListener("resize", onMove);
      window.removeEventListener("scroll", onMove, true);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  function close() {
    setOpen(false);
    onBlur?.();
  }

  function pick(iso: string) {
    onChange?.({ target: { value: iso } });
    close();
  }

  function openPicker() {
    if (disabled) return;
    const base = selected ?? new Date();
    setMonth(new Date(base.getFullYear(), base.getMonth(), 1));
    setOpen((o) => !o);
  }

  // The month grid, Monday first, padded with the neighbouring months' days.
  const firstWeekday = (month.getDay() + 6) % 7;
  const start = new Date(month.getFullYear(), month.getMonth(), 1 - firstWeekday);
  const days = Array.from({ length: 42 }, (_, i) => new Date(start.getFullYear(), start.getMonth(), start.getDate() + i));
  const todayIso = toIso(new Date());
  const outOfRange = (iso: string) => (!!min && iso < min) || (!!max && iso > max);

  const label = selected
    ? selected.toLocaleDateString("en-AU", { day: "numeric", month: "short", year: "numeric" })
    : "";

  // Width classes (w-full, flex-1, sm:w-40…) size the wrapper, so the
  // picker takes exactly the space the old date box did.
  const widthClasses = className
    .split(/\s+/)
    .filter((c) => /^(?:[a-z]+:)?(?:w-|flex-|min-w-|max-w-|shrink|grow|basis-)/.test(c))
    .join(" ");

  return (
    <span className={`relative inline-block align-middle ${widthClasses}`}>
      <button
        ref={buttonRef}
        id={id}
        type="button"
        disabled={disabled}
        onClick={openPicker}
        aria-haspopup="dialog"
        aria-expanded={open}
        aria-label={ariaLabel ? `${ariaLabel}${label ? `: ${label}` : ""}` : label || placeholder}
        title={title}
        className={`${className} inline-flex items-center gap-2 text-left w-full min-w-[9.5rem] disabled:opacity-60`}
      >
        <Icon name="calendar" className="w-4 h-4 text-slate-500" />
        <span className={`flex-1 truncate ${label ? "" : "text-slate-500"}`}>{label || placeholder}</span>
      </button>
      {required && (
        // Keeps the form's own "required" check working, as with a date box.
        <input
          tabIndex={-1}
          aria-hidden="true"
          required
          value={value}
          onChange={() => {}}
          className="absolute left-2 bottom-0 h-px w-px opacity-0 pointer-events-none"
        />
      )}
      {open &&
        createPortal(
          <div
            ref={popRef}
            role="dialog"
            aria-label="Choose a date"
            style={{ top: pos.top, left: pos.left }}
            className="fixed z-[70] w-[17rem] menu-panel p-3 text-sm"
          >
            <div className="flex items-center justify-between mb-2">
              <button
                type="button"
                className="icon-btn"
                aria-label="Previous month"
                onClick={() => setMonth(new Date(month.getFullYear(), month.getMonth() - 1, 1))}
              >
                <Icon name="chevronLeft" className="w-4 h-4" />
              </button>
              <div className="font-semibold text-slate-900 dark:text-slate-100">
                {month.toLocaleDateString("en-AU", { month: "long", year: "numeric" })}
              </div>
              <button
                type="button"
                className="icon-btn"
                aria-label="Next month"
                onClick={() => setMonth(new Date(month.getFullYear(), month.getMonth() + 1, 1))}
              >
                <Icon name="chevronRight" className="w-4 h-4" />
              </button>
            </div>
            <div className="grid grid-cols-7 gap-0.5 text-center text-[11px] font-medium text-slate-500 mb-1">
              {WEEKDAYS.map((d) => (
                <div key={d}>{d}</div>
              ))}
            </div>
            <div className="grid grid-cols-7 gap-0.5">
              {days.map((d) => {
                const iso = toIso(d);
                const inMonth = d.getMonth() === month.getMonth();
                const isSelected = iso === value.substring(0, 10);
                const isToday = iso === todayIso;
                const blocked = outOfRange(iso);
                return (
                  <button
                    key={iso}
                    type="button"
                    disabled={blocked}
                    onClick={() => pick(iso)}
                    aria-label={d.toLocaleDateString("en-AU", { weekday: "long", day: "numeric", month: "long", year: "numeric" })}
                    aria-pressed={isSelected}
                    className={`h-8 rounded-lg text-sm tabular-nums disabled:opacity-30 ${
                      isSelected
                        ? "bg-blue-600 text-white font-semibold"
                        : isToday
                          ? "ring-1 ring-blue-500 text-blue-700 dark:text-blue-300 font-semibold"
                          : inMonth
                            ? "text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-700"
                            : "text-slate-300 dark:text-slate-600 hover:bg-slate-100 dark:hover:bg-slate-700"
                    }`}
                  >
                    {d.getDate()}
                  </button>
                );
              })}
            </div>
            <div className="flex justify-between mt-2 pt-2 border-t border-slate-100 dark:border-slate-700">
              <button
                type="button"
                onClick={() => pick("")}
                className="text-xs text-slate-500 hover:text-slate-900 dark:hover:text-slate-100"
              >
                Clear
              </button>
              <button
                type="button"
                disabled={outOfRange(todayIso)}
                onClick={() => pick(todayIso)}
                className="text-xs font-medium text-blue-700 dark:text-blue-300 hover:underline disabled:opacity-40"
              >
                Today
              </button>
            </div>
          </div>,
          document.body
        )}
    </span>
  );
}
