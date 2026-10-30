import { KeyboardEvent, TextareaHTMLAttributes, useRef } from "react";

type Props = TextareaHTMLAttributes<HTMLTextAreaElement> & { value: string };

// Sets the textarea's value the way typing does, so the field's own
// onChange handler sees the edit (React ignores a plain `el.value = …`).
function setNativeValue(el: HTMLTextAreaElement, value: string) {
  const setter = Object.getOwnPropertyDescriptor(HTMLTextAreaElement.prototype, "value")?.set;
  setter?.call(el, value);
  el.dispatchEvent(new Event("input", { bubbles: true }));
}

type Mark = "**" | "*" | "__";

// A textarea with a small formatting toolbar — bold, italic, underline,
// bullet and numbered lists — for long-text fields. It's a drop-in
// replacement for <textarea>: same props, and edits arrive through the
// usual onChange. The formatting is stored as plain-text markers (see
// richText.ts) and shown with FormattedText.
export default function RichTextArea({ className, onKeyDown, ...props }: Props) {
  const ref = useRef<HTMLTextAreaElement>(null);

  function apply(next: string, selStart: number, selEnd: number) {
    const el = ref.current;
    if (!el) return;
    setNativeValue(el, next);
    el.focus();
    // After React re-renders with the new value.
    requestAnimationFrame(() => el.setSelectionRange(selStart, selEnd));
  }

  function wrap(mark: Mark) {
    const el = ref.current;
    if (!el) return;
    const { selectionStart: start, selectionEnd: end, value } = el;
    const selected = value.slice(start, end);
    // Already wrapped → unwrap.
    if (
      value.slice(start - mark.length, start) === mark &&
      value.slice(end, end + mark.length) === mark
    ) {
      apply(
        value.slice(0, start - mark.length) + selected + value.slice(end + mark.length),
        start - mark.length,
        end - mark.length
      );
      return;
    }
    apply(
      value.slice(0, start) + mark + selected + mark + value.slice(end),
      start + mark.length,
      end + mark.length
    );
  }

  function list(numbered: boolean) {
    const el = ref.current;
    if (!el) return;
    const { value } = el;
    const lineStart = value.lastIndexOf("\n", el.selectionStart - 1) + 1;
    const nl = value.indexOf("\n", Math.max(el.selectionEnd - 1, el.selectionStart));
    const lineEnd = nl === -1 ? value.length : nl;
    const lines = value.slice(lineStart, lineEnd).split("\n");
    const pattern = numbered ? /^\s*\d+[.)]\s+/ : /^\s*[-*•]\s+/;
    const allListed = lines.every((l) => pattern.test(l));
    const next = lines
      .map((l, i) =>
        allListed ? l.replace(pattern, "") : `${numbered ? `${i + 1}. ` : "- "}${l.replace(/^\s*(\d+[.)]|[-*•])\s+/, "")}`
      )
      .join("\n");
    apply(value.slice(0, lineStart) + next + value.slice(lineEnd), lineStart, lineStart + next.length);
  }

  function handleKeyDown(e: KeyboardEvent<HTMLTextAreaElement>) {
    if (e.ctrlKey || e.metaKey) {
      const key = e.key.toLowerCase();
      if (key === "b" || key === "i" || key === "u") {
        e.preventDefault();
        wrap(key === "b" ? "**" : key === "i" ? "*" : "__");
        return;
      }
    }
    onKeyDown?.(e);
  }

  const buttons: { label: string; title: string; className?: string; run: () => void }[] = [
    { label: "B", title: "Bold (Ctrl+B)", className: "font-bold", run: () => wrap("**") },
    { label: "I", title: "Italic (Ctrl+I)", className: "italic", run: () => wrap("*") },
    { label: "U", title: "Underline (Ctrl+U)", className: "underline", run: () => wrap("__") },
    { label: "• List", title: "Bullet points", run: () => list(false) },
    { label: "1. List", title: "Numbered list", run: () => list(true) },
  ];

  return (
    <div>
      <div className="flex items-center gap-1 mb-1" role="toolbar" aria-label="Formatting">
        {buttons.map((b) => (
          <button
            key={b.label}
            type="button"
            title={b.title}
            aria-label={b.title}
            // Keep the textarea's selection when the button is pressed.
            onMouseDown={(e) => e.preventDefault()}
            onClick={b.run}
            className={`px-2 py-0.5 text-xs rounded border border-slate-300 dark:border-slate-600 text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700 ${b.className ?? ""}`}
          >
            {b.label}
          </button>
        ))}
      </div>
      <textarea ref={ref} className={className} onKeyDown={handleKeyDown} {...props} />
    </div>
  );
}
