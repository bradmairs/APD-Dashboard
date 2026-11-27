import { ProjectNote, ProjectNoteInput } from "../types";

// Notes <-> Obsidian Markdown. A note's body is already light Markdown
// (**bold**, *italic*, lists); __underline__ becomes <u>…</u>, which
// Obsidian shows as underline. [[Note title]] links work as they are.

export function safeFileName(title: string): string {
  return (title.replace(/[\\/:*?"<>|#^[\]]/g, "-").replace(/\s+/g, " ").trim() || "Untitled").slice(0, 120);
}

export function noteToMarkdown(note: Pick<ProjectNote, "title" | "body" | "tags" | "createdByName" | "createdAt" | "updatedAt">, projectName: string): string {
  const fm = [
    "---",
    `project: "${projectName.replace(/"/g, "'")}"`,
    `created: ${note.createdAt.substring(0, 10)}`,
    `updated: ${note.updatedAt.substring(0, 10)}`,
    `author: "${note.createdByName.replace(/"/g, "'")}"`,
    `tags: [${note.tags.map((t) => JSON.stringify(t)).join(", ")}]`,
    "---",
    "",
  ].join("\n");
  const body = note.body.replace(/__(?=\S)([\s\S]*?\S)__/g, "<u>$1</u>");
  return `${fm}# ${note.title}\n\n${body}\n`;
}

// An Obsidian (or any Markdown) file back into a note: the title from the
// first "# heading" or the file name, tags from the front matter and from
// #hashtags in the text.
export function markdownToNote(fileName: string, text: string): Partial<ProjectNoteInput> {
  let rest = text.replace(/\r/g, "");
  const tags = new Set<string>();
  const fm = /^---\n([\s\S]*?)\n---\n?/.exec(rest);
  if (fm) {
    rest = rest.slice(fm[0].length);
    const inline = /^tags:\s*\[(.*)\]\s*$/m.exec(fm[1]);
    if (inline) inline[1].split(",").forEach((t) => t.trim() && tags.add(t.trim().replace(/^["']|["']$/g, "")));
    const block = /^tags:\s*\n((?:\s*-\s*.+\n?)+)/m.exec(fm[1]);
    if (block) block[1].split("\n").forEach((l) => {
      const m = /-\s*(.+)/.exec(l);
      if (m) tags.add(m[1].trim().replace(/^["']|["']$/g, ""));
    });
  }
  let title = fileName.replace(/\.md$/i, "");
  const h1 = /^#\s+(.+)\n?/m.exec(rest);
  if (h1 && rest.trimStart().startsWith("#")) {
    title = h1[1].trim();
    rest = rest.replace(h1[0], "");
  }
  for (const m of rest.matchAll(/(?:^|\s)#([A-Za-z][\w/-]*)/g)) tags.add(m[1]);
  const body = rest.replace(/<u>([\s\S]*?)<\/u>/g, "__$1__").trim();
  return { title, body, tags: Array.from(tags) };
}

// [[Title]] and [[Title|label]] links in a body.
export function wikiLinks(body: string): string[] {
  return Array.from(body.matchAll(/\[\[([^\]|]+)(?:\|[^\]]*)?\]\]/g)).map((m) => m[1].trim());
}
