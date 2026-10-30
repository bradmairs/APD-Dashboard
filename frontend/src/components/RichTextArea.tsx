import { ClipboardEvent, KeyboardEvent, useEffect, useRef, useState } from "react";
import { readFrom, renderInto } from "../richTextDom";

interface Props {
  value: string;
  // Same shape as a textarea's onChange as the forms use it, so this is a
  // drop-in replacement: `onChange={(e) => setNotes(e.target.value)}`.
  onChange?: (e: { target: { value: string } }) => void;
  rows?: number;
  placeholder?: string;
  required?: boolean;
  className?: string;
  id?: string;
  disabled?: boolean;
  "aria-label"?: string;
}

type Command = "bold" | "italic" | "underline" | "insertUnorderedList" | "insertOrderedList";

const BUTTONS: { command: Command; label: string; title: string; className?: string }[] = [
  { command: "bold", label: "B", title: "Bold (Ctrl+B)", className: "font-bold" },
  { command: "italic", label: "I", title: "Italic (Ctrl+I)", className: "italic" },
  { command: "underline", label: "U", title: "Underline (Ctrl+U)", className: "underline" },
  { command: "insertUnorderedList", label: "• List", title: "Bullet points" },
  { command: "insertOrderedList", label: "1. List", title: "Numbered list" },
];

// A formatted text box for long-text fields (meeting minutes, notes,
// descriptions): bold, italic, underline and bullet/numbered lists show
// as you type, like a word processor. Behind the scenes the value is
// stored as plain text with light markers (see richText.ts) — readable in
// CSV exports and the AI assistant, and shown formatted by FormattedText
// and in the meeting minutes PDF. Pasted content comes in as plain text,
// so formatting from Word or email can't bring in stray styles or markup.
export default function RichTextArea({
  value,
  onChange,
  rows = 3,
  placeholder,
  required,
  className,
  id,
  disabled,
  "aria-label": ariaLabel,
}: Props) {
  const editorRef = useRef<HTMLDivElement>(null);
  // The last value this editor produced, so an incoming value that merely
  // echoes the user's own typing doesn't re-render (and move the cursor).
  const lastValueRef = useRef<string | null>(null);
  const [active, setActive] = useState<Partial<Record<Command, boolean>>>({});

  useEffect(() => {
    const el = editorRef.current;
    if (!el || value === lastValueRef.current) return;
    renderInto(el, value);
    lastValueRef.current = value;
  }, [value]);

  function emit() {
    const el = editorRef.current;
    if (!el) return;
    const next = readFrom(el);
    if (next === lastValueRef.current) return;
    lastValueRef.current = next;
    onChange?.({ target: { value: next } });
  }

  function refreshActive() {
    const next: Partial<Record<Command, boolean>> = {};
    for (const b of BUTTONS) {
      try {
        next[b.command] = document.queryCommandState(b.command);
      } catch {
        next[b.command] = false;
      }
    }
    setActive(next);
  }

  function run(command: Command) {
    const el = editorRef.current;
    if (!el || disabled) return;
    el.focus();
    // Use <b>/<i>/<u> rather than inline styles, and <div> for new lines.
    document.execCommand("styleWithCSS", false, "false");
    document.execCommand("defaultParagraphSeparator", false, "div");
    document.execCommand(command);
    emit();
    refreshActive();
  }

  function handleKeyDown(e: KeyboardEvent<HTMLDivElement>) {
    if (!(e.ctrlKey || e.metaKey)) return;
    const key = e.key.toLowerCase();
    const command = key === "b" ? "bold" : key === "i" ? "italic" : key === "u" ? "underline" : null;
    if (command) {
      e.preventDefault();
      run(command);
    }
  }

  function handlePaste(e: ClipboardEvent<HTMLDivElement>) {
    e.preventDefault();
    const text = e.clipboardData.getData("text/plain");
    document.execCommand("insertText", false, text);
  }

  // Roughly the height a textarea with this many rows would have.
  const minHeight = `${rows * 1.5 + 1}rem`;

  return (
    <div className="relative">
      <div className="flex items-center gap-1 mb-1" role="toolbar" aria-label="Formatting">
        {BUTTONS.map((b) => (
          <button
            key={b.command}
            type="button"
            title={b.title}
            aria-label={b.title}
            aria-pressed={!!active[b.command]}
            disabled={disabled}
            // Keep the editor's selection when the button is pressed.
            onMouseDown={(e) => e.preventDefault()}
            onClick={() => run(b.command)}
            className={`px-2 py-0.5 text-xs rounded border ${
              active[b.command]
                ? "bg-slate-200 dark:bg-slate-600 border-slate-400 dark:border-slate-500 text-slate-900 dark:text-slate-100"
                : "border-slate-300 dark:border-slate-600 text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700"
            } disabled:opacity-50 ${b.className ?? ""}`}
          >
            {b.label}
          </button>
        ))}
      </div>
      <div
        ref={editorRef}
        id={id}
        role="textbox"
        aria-multiline="true"
        aria-label={ariaLabel}
        aria-required={required}
        contentEditable={!disabled}
        suppressContentEditableWarning
        onInput={emit}
        onBlur={emit}
        onKeyDown={handleKeyDown}
        onKeyUp={refreshActive}
        onMouseUp={refreshActive}
        onFocus={refreshActive}
        onPaste={handlePaste}
        style={{ minHeight }}
        className={`${className ?? ""} resize-y overflow-auto whitespace-pre-wrap break-words focus:outline-none focus:ring-2 focus:ring-blue-500 [&_ul]:list-disc [&_ul]:pl-5 [&_ol]:list-decimal [&_ol]:pl-5`}
      />
      {!value && placeholder && (
        <div
          aria-hidden="true"
          className="pointer-events-none absolute left-3 top-8 text-sm text-slate-400 dark:text-slate-500"
        >
          {placeholder}
        </div>
      )}
      {required && (
        // A visually hidden copy of the value so the form's own "required"
        // check still stops an empty submit, as it did with a textarea.
        <textarea
          required
          value={value}
          onChange={() => {}}
          tabIndex={-1}
          aria-hidden="true"
          className="absolute left-2 bottom-0 h-px w-px opacity-0 pointer-events-none"
        />
      )}
    </div>
  );
}
