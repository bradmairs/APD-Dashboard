// Autosaved drafts for the formatted text boxes (RichTextArea), kept in this
// browser's localStorage until the form is saved. Nothing goes to the
// server until you press Save, exactly as before.
//
// A draft is keyed by the page, the form's heading, which text box it is
// in the form, and the text the box started with. So reopening the same
// "New meeting" form offers what you'd typed, while editing a different
// record (different starting text) doesn't.

const PREFIX = "apd.draft.";
const MAX_AGE_MS = 7 * 24 * 60 * 60 * 1000;

function hash(text: string): string {
  let h = 0;
  for (let i = 0; i < text.length; i++) h = (Math.imul(31, h) + text.charCodeAt(i)) | 0;
  return (h >>> 0).toString(36);
}

export function draftKeyFor(el: HTMLElement, initialValue: string): string {
  const scope = el.closest("form, [role=dialog]") ?? document.body;
  const heading = scope.querySelector("h1, h2, h3")?.textContent?.trim() ?? "";
  const boxes = Array.from(scope.querySelectorAll('[role="textbox"][aria-multiline="true"]'));
  const index = Math.max(0, boxes.indexOf(el));
  return `${PREFIX}${location.pathname}|${heading}|${index}|${hash(initialValue)}`;
}

export function loadDraft(key: string): { text: string; at: number } | null {
  try {
    const raw = localStorage.getItem(key);
    if (!raw) return null;
    const draft = JSON.parse(raw) as { text: string; at: number };
    if (!draft.text?.trim() || Date.now() - draft.at > MAX_AGE_MS) {
      localStorage.removeItem(key);
      return null;
    }
    return draft;
  } catch {
    return null;
  }
}

const timers = new Map<string, number>();

export function saveDraft(key: string, text: string) {
  window.clearTimeout(timers.get(key));
  timers.set(
    key,
    window.setTimeout(() => {
      try {
        localStorage.setItem(key, JSON.stringify({ text, at: Date.now() }));
      } catch {
        // storage full or blocked: no draft kept
      }
    }, 600)
  );
}

export function clearDraft(key: string) {
  window.clearTimeout(timers.get(key));
  timers.delete(key);
  try {
    localStorage.removeItem(key);
  } catch {
    // ignore
  }
}

// Boxes with typed-but-unsaved text: the browser asks before leaving.
const dirty = new Set<string>();

export function markDirty(key: string, isDirty: boolean) {
  if (isDirty) dirty.add(key);
  else dirty.delete(key);
}

if (typeof window !== "undefined") {
  window.addEventListener("beforeunload", (e) => {
    if (dirty.size === 0) return;
    e.preventDefault();
    e.returnValue = "";
  });
}

// Old drafts are tidied away once per page load.
try {
  for (let i = localStorage.length - 1; i >= 0; i--) {
    const k = localStorage.key(i);
    if (k?.startsWith(PREFIX)) loadDraft(k);
  }
} catch {
  // ignore
}
