import { Block, Inline, parseBlocks } from "./richText";

// Converts between the stored formatted text (see richText.ts) and the DOM
// of the formatted editor (RichTextArea), in both directions.
//
// Text → DOM builds real elements with document.createElement and text
// nodes — never innerHTML — so nothing typed into a field can inject markup.
// DOM → text reads back what the browser's editing produced (b/strong,
// i/em, u, ul/ol/li, div/p lines and <br>s).

function appendInline(parent: Node, nodes: Inline[]) {
  for (const node of nodes) {
    if (node.type === "text") {
      parent.appendChild(document.createTextNode(node.text));
    } else {
      const el = document.createElement(
        node.type === "bold" ? "strong" : node.type === "italic" ? "em" : "u"
      );
      appendInline(el, node.children);
      parent.appendChild(el);
    }
  }
}

function blockElement(block: Block): HTMLElement {
  switch (block.type) {
    case "blank": {
      const div = document.createElement("div");
      div.appendChild(document.createElement("br"));
      return div;
    }
    case "line": {
      const div = document.createElement("div");
      appendInline(div, block.content);
      return div;
    }
    case "ul":
    case "ol": {
      const list = document.createElement(block.type);
      if (block.type === "ol" && block.start !== 1) list.setAttribute("start", String(block.start));
      for (const item of block.items) {
        const li = document.createElement("li");
        appendInline(li, item);
        list.appendChild(li);
      }
      return list;
    }
  }
}

// Replaces the editor's contents with the formatted text.
export function renderInto(root: HTMLElement, text: string) {
  root.replaceChildren();
  if (!text) return;
  for (const block of parseBlocks(text)) root.appendChild(blockElement(block));
}

type Style = "**" | "*" | "__";

function styleOf(el: HTMLElement): Style[] {
  const tag = el.tagName;
  const styles: Style[] = [];
  const weight = el.style.fontWeight;
  if (tag === "B" || tag === "STRONG" || weight === "bold" || Number(weight) >= 600) {
    styles.push("**");
  }
  if (tag === "I" || tag === "EM" || el.style.fontStyle === "italic") styles.push("*");
  if (tag === "U" || el.style.textDecoration.includes("underline") || el.style.textDecorationLine.includes("underline")) {
    styles.push("__");
  }
  return styles;
}

// Inline content of a node as marked-up text. Whitespace at the edges of a
// styled run is moved outside its markers ("** a**" wouldn't read back).
function inlineText(node: Node): string {
  if (node.nodeType === Node.TEXT_NODE) {
    return (node.textContent ?? "").replace(/ /g, " ");
  }
  if (!(node instanceof HTMLElement)) return "";
  if (node.tagName === "BR") return "\n";
  let inner = Array.from(node.childNodes).map(inlineText).join("");
  for (const mark of styleOf(node)) {
    const m = /^(\s*)([\s\S]*?)(\s*)$/.exec(inner)!;
    if (!m[2]) continue;
    // Markers can't span a line break, so mark each line separately.
    inner =
      m[1] +
      m[2]
        .split("\n")
        .map((part) => (part.trim() ? `${mark}${part}${mark}` : part))
        .join("\n") +
      m[3];
  }
  return inner;
}

const BLOCK_TAGS = new Set(["DIV", "P", "UL", "OL", "LI", "H1", "H2", "H3", "H4", "BLOCKQUOTE"]);

// A list item's text, on one line (a soft break inside it becomes a space).
function listItemText(li: Element): string {
  return Array.from(li.childNodes)
    .filter((n) => !(n instanceof HTMLElement && (n.tagName === "UL" || n.tagName === "OL")))
    .map(inlineText)
    .join("")
    .replace(/\n+/g, " ")
    .trim();
}

function blockLines(el: HTMLElement): string[] {
  if (el.tagName === "UL" || el.tagName === "OL") {
    const lines: string[] = [];
    const start = Number(el.getAttribute("start")) || 1;
    let n = start;
    for (const li of Array.from(el.children)) {
      if (li.tagName !== "LI") continue;
      lines.push(el.tagName === "UL" ? `- ${listItemText(li)}` : `${n++}. ${listItemText(li)}`);
      // A list nested inside an item is flattened into the same list.
      for (const nested of Array.from(li.children)) {
        if (nested instanceof HTMLElement && (nested.tagName === "UL" || nested.tagName === "OL")) {
          lines.push(...blockLines(nested));
        }
      }
    }
    return lines;
  }
  // A line (div/p): its text, with <br>s as line breaks. A trailing <br> is
  // just how browsers keep an empty or final line open, so it's dropped.
  const hasBlockChild = Array.from(el.childNodes).some(
    (n) => n instanceof HTMLElement && BLOCK_TAGS.has(n.tagName)
  );
  if (hasBlockChild) return childLines(el);
  const text = inlineText(el).replace(/\n$/, "");
  return text.split("\n");
}

function childLines(root: Node): string[] {
  const lines: string[] = [];
  let pending = "";
  let hasPending = false;
  const flush = () => {
    if (hasPending) lines.push(...pending.replace(/\n$/, "").split("\n"));
    pending = "";
    hasPending = false;
  };
  for (const child of Array.from(root.childNodes)) {
    if (child instanceof HTMLElement && BLOCK_TAGS.has(child.tagName)) {
      flush();
      lines.push(...blockLines(child));
    } else {
      pending += inlineText(child);
      hasPending = true;
    }
  }
  flush();
  return lines;
}

// Reads the editor's contents back as stored text.
export function readFrom(root: HTMLElement): string {
  const lines = childLines(root).map((line) => line.replace(/[ \t]+$/, ""));
  // Drop blank lines at the very start and end.
  while (lines.length && !lines[0].trim()) lines.shift();
  while (lines.length && !lines[lines.length - 1].trim()) lines.pop();
  return lines.join("\n");
}
