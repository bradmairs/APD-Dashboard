// Light formatting for long-text fields (meeting notes, descriptions…),
// stored as plain text with a few markers so it stays readable everywhere
// the raw text ends up (CSV export, PDFs, the AI assistant, search):
//
//   **bold**   *italic*   __underline__
//   - bullet point        (also "* " or "• ")
//   1. numbered point     (also "1) ")
//
// Text with no markers is unchanged. Parsing produces plain data that
// FormattedText turns into React elements — never HTML — so nothing typed
// into a field can inject markup.

export type Inline =
  | { type: "text"; text: string }
  | { type: "bold" | "italic" | "underline"; children: Inline[] };

export type Block =
  | { type: "line"; content: Inline[] }
  | { type: "blank" }
  | { type: "ul"; items: Inline[][] }
  | { type: "ol"; start: number; items: Inline[][] };

const BULLET = /^\s*[-*•]\s+(.*)$/;
const NUMBERED = /^\s*(\d+)[.)]\s+(.*)$/;
// **bold** / __underline__ (no space just inside the markers), or *italic*.
const INLINE = /(\*\*|__)(?=\S)([\s\S]*?\S)\1|\*(?=[^\s*])([^*]*?[^\s*])\*/;

export function parseInline(text: string): Inline[] {
  const out: Inline[] = [];
  let rest = text;
  while (rest) {
    const m = INLINE.exec(rest);
    if (!m) {
      out.push({ type: "text", text: rest });
      break;
    }
    if (m.index > 0) out.push({ type: "text", text: rest.slice(0, m.index) });
    if (m[1]) {
      out.push({ type: m[1] === "**" ? "bold" : "underline", children: parseInline(m[2]) });
    } else {
      out.push({ type: "italic", children: parseInline(m[3]) });
    }
    rest = rest.slice(m.index + m[0].length);
  }
  return out;
}

export function parseBlocks(text: string): Block[] {
  const blocks: Block[] = [];
  for (const line of text.replace(/\r\n?/g, "\n").split("\n")) {
    const last = blocks[blocks.length - 1];
    const bullet = BULLET.exec(line);
    const numbered = NUMBERED.exec(line);
    if (bullet) {
      if (last?.type === "ul") last.items.push(parseInline(bullet[1]));
      else blocks.push({ type: "ul", items: [parseInline(bullet[1])] });
    } else if (numbered) {
      if (last?.type === "ol") last.items.push(parseInline(numbered[2]));
      else blocks.push({ type: "ol", start: Number(numbered[1]), items: [parseInline(numbered[2])] });
    } else if (!line.trim()) {
      blocks.push({ type: "blank" });
    } else {
      blocks.push({ type: "line", content: parseInline(line) });
    }
  }
  return blocks;
}

function inlineText(nodes: Inline[]): string {
  return nodes.map((n) => (n.type === "text" ? n.text : inlineText(n.children))).join("");
}

// The text with formatting markers removed and list items given a "•" or
// their number — for places that can only show plain text, like PDFs.
export function toPlainText(text: string): string {
  return parseBlocks(text)
    .map((block) => {
      switch (block.type) {
        case "blank":
          return "";
        case "line":
          return inlineText(block.content);
        case "ul":
          return block.items.map((item) => `•  ${inlineText(item)}`).join("\n");
        case "ol":
          return block.items.map((item, i) => `${block.start + i}.  ${inlineText(item)}`).join("\n");
      }
    })
    .join("\n");
}

// A one-line plain preview (for truncated list rows): no markers, lines
// joined with " · ".
export function previewText(text: string): string {
  return toPlainText(text)
    .split("\n")
    .map((line) => line.trim())
    .filter(Boolean)
    .join(" · ");
}
