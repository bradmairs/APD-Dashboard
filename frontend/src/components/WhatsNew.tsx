import { ReactNode, useEffect, useState } from "react";
import { createPortal } from "react-dom";
import rawNotes from "../whatsNew/whatsNew.md?raw";
import { APP_VERSION } from "../version";
import { Icon } from "./icons";

// The pop-up's pictures, kept beside the notes in src/whatsNew/ and
// referred to by file name: ![What it shows](picture.webp).
const PICTURES = import.meta.glob("../whatsNew/*.{webp,png,jpg,jpeg,gif,svg}", {
  eager: true,
  query: "?url",
  import: "default",
}) as Record<string, string>;
export function pictureUrl(file: string): string | undefined {
  return PICTURES[`../whatsNew/${file.replace(/^\.\//, "")}`];
}

// The notes start with <!-- version: X.Y.Z -->, the version they were
// written for. The pop-up shows once per notes version, so a release that
// doesn't change them (a small fix) doesn't show the same notes again.
export function notesVersion(md: string): string | undefined {
  return /<!--\s*version:\s*([\d.]+)\s*-->/.exec(md)?.[1];
}
const NOTES_VERSION = notesVersion(rawNotes) ?? APP_VERSION;
const notes = rawNotes.replace(/<!--[\s\S]*?-->/g, "").trim();

const SEEN_KEY = "apd.whatsNewSeen";
export const SHOW_WHATS_NEW_EVENT = "apd:whats-new";

// Inline Markdown: **bold**, `code` and [links](url).
function inline(text: string): ReactNode[] {
  const out: ReactNode[] = [];
  const re = /(\*\*[^*]+\*\*|`[^`]+`|\[[^\]]+\]\([^)]+\))/g;
  let last = 0;
  let m: RegExpExecArray | null;
  while ((m = re.exec(text))) {
    if (m.index > last) out.push(text.slice(last, m.index));
    const t = m[0];
    if (t.startsWith("**")) out.push(<strong key={m.index}>{t.slice(2, -2)}</strong>);
    else if (t.startsWith("`"))
      out.push(
        <code key={m.index} className="text-[0.9em] px-1 rounded bg-slate-100 dark:bg-slate-800">
          {t.slice(1, -1)}
        </code>
      );
    else {
      const link = /\[([^\]]+)\]\(([^)]+)\)/.exec(t)!;
      out.push(<span key={m.index}>{link[1]}</span>);
    }
    last = m.index + t.length;
  }
  if (last < text.length) out.push(text.slice(last));
  return out;
}

// The notes (a small Markdown subset: headings, paragraphs, pictures and
// bullet lists, nested by indentation).
export function renderNotes(md: string): ReactNode {
  const lines = md.replace(/\r/g, "").split("\n");
  const blocks: ReactNode[] = [];
  let i = 0;
  while (i < lines.length) {
    const line = lines[i];
    if (!line.trim()) {
      i++;
      continue;
    }
    const h = /^(#{1,3})\s+(.*)$/.exec(line);
    if (h) {
      if (h[1].length === 1) {
        i++;
        continue; // the title is shown in the dialog header
      }
      blocks.push(
        <h3 key={i} className="text-sm font-semibold text-slate-900 dark:text-slate-100 mt-4 mb-1.5">
          {inline(h[2])}
        </h3>
      );
      i++;
      continue;
    }
    const pic = /^!\[([^\]]*)\]\(([^)]+)\)\s*$/.exec(line.trim());
    if (pic) {
      const src = pictureUrl(pic[2]);
      if (src)
        blocks.push(
          <figure key={i} className="my-3">
            <a href={src} target="_blank" rel="noreferrer" title="Open full size" className="block">
            <img
              src={src}
              alt={pic[1]}
              loading="lazy"
              className="block mx-auto max-w-full max-h-[26rem] w-auto rounded-lg border border-slate-200 dark:border-slate-700 shadow-sm bg-white hover:shadow-md transition-shadow"
            />
            </a>
          </figure>
        );
      i++;
      continue;
    }
    if (/^\s*-\s+/.test(line)) {
      const items: { depth: number; text: string }[] = [];
      while (i < lines.length && /^\s*-\s+/.test(lines[i])) {
        const depth = Math.floor((lines[i].match(/^\s*/)?.[0].length ?? 0) / 2);
        items.push({ depth, text: lines[i].replace(/^\s*-\s+/, "") });
        i++;
      }
      blocks.push(
        <ul key={i} className="space-y-1 text-sm text-slate-700 dark:text-slate-300">
          {items.map((it, k) => (
            <li key={k} className="flex gap-2" style={{ marginLeft: it.depth * 16 }}>
              <span className="mt-2 w-1.5 h-1.5 rounded-full bg-blue-500 shrink-0" />
              <span>{inline(it.text)}</span>
            </li>
          ))}
        </ul>
      );
      continue;
    }
    const para: string[] = [];
    while (i < lines.length && lines[i].trim() && !/^(#|\s*-\s|\s*!\[)/.test(lines[i])) {
      para.push(lines[i]);
      i++;
    }
    blocks.push(
      <p key={i} className="text-sm text-slate-700 dark:text-slate-300 my-2">
        {inline(para.join(" "))}
      </p>
    );
  }
  return blocks;
}

// "What's new": after an update with new notes for users, the first visit
// shows them once (remembered in this browser). Reopen it any time from the
// avatar menu. The notes, in src/whatsNew/whatsNew.md, are written for the
// people using the dashboard; the full release notes are in docs/releases/.
export default function WhatsNew() {
  const [open, setOpen] = useState(false);

  useEffect(() => {
    let seen: string | null = null;
    try {
      seen = localStorage.getItem(SEEN_KEY);
    } catch {
      // storage blocked: don't nag
      seen = NOTES_VERSION;
    }
    if (seen !== NOTES_VERSION && APP_VERSION !== "dev") setOpen(true);
    const show = () => setOpen(true);
    window.addEventListener(SHOW_WHATS_NEW_EVENT, show);
    return () => window.removeEventListener(SHOW_WHATS_NEW_EVENT, show);
  }, []);

  function close() {
    setOpen(false);
    try {
      localStorage.setItem(SEEN_KEY, NOTES_VERSION);
    } catch {
      // fine
    }
  }

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && close();
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open]);

  if (!open) return null;
  const title = /^#\s+(.*)$/m.exec(notes)?.[1] ?? `Version ${APP_VERSION}`;
  const lead = /^\*\*(.+)\*\*\s*$/m.exec(notes)?.[1];
  const body = lead ? notes.replace(/^\*\*(.+)\*\*\s*$/m, "") : notes;

  return createPortal(
    <div className="fixed inset-0 bg-navy-800/40 backdrop-blur-[2px] flex items-center justify-center p-4 z-[80] animate-fade-in" onMouseDown={close}>
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="whats-new-title"
        onMouseDown={(e) => e.stopPropagation()}
        className="bg-white dark:bg-slate-900 rounded-2xl shadow-xl w-full max-w-3xl max-h-[88vh] flex flex-col animate-pop-in overflow-hidden"
      >
        <div className="px-6 pt-6 pb-4 bg-gradient-to-br from-blue-600 to-navy-700 text-white">
          <div className="flex items-start justify-between gap-4">
            <div>
              <div className="text-xs font-medium uppercase tracking-wider text-blue-100">What's new · v{APP_VERSION}</div>
              <h2 id="whats-new-title" className="text-xl font-semibold mt-1">
                {title}
              </h2>
              {lead && <p className="text-sm text-blue-50 mt-1">{lead}</p>}
            </div>
            <button type="button" onClick={close} aria-label="Close" className="p-1.5 rounded-lg hover:bg-white/15">
              <Icon name="x" className="w-5 h-5" />
            </button>
          </div>
        </div>
        <div className="px-6 py-4 overflow-y-auto">{renderNotes(body)}</div>
        <div className="px-6 py-3 border-t border-slate-100 dark:border-slate-800 flex justify-end">
          <button type="button" onClick={close} className="px-4 py-2 text-sm rounded-lg bg-blue-600 text-white hover:bg-blue-700">
            Got it
          </button>
        </div>
      </div>
    </div>,
    document.body
  );
}
