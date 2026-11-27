import { describe, expect, it } from "vitest";
import { crc32, makeZip } from "./zip";
import { markdownToNote, noteToMarkdown, safeFileName, wikiLinks } from "./obsidian";

describe("zip", () => {
  it("computes the standard CRC-32", () => {
    expect(crc32(new TextEncoder().encode("123456789"))).toBe(0xcbf43926);
  });
  it("writes a zip with local headers, central directory and end record", () => {
    const z = makeZip([{ name: "a.md", content: "hello" }]);
    const v = new DataView(z.buffer);
    expect(v.getUint32(0, true)).toBe(0x04034b50);
    expect(v.getUint32(z.length - 22, true)).toBe(0x06054b50);
    expect(v.getUint16(z.length - 22 + 10, true)).toBe(1);
  });
});

describe("Obsidian notes", () => {
  const note = {
    title: "Valve options",
    body: "Compare **gate** and __butterfly__ valves.\nSee [[Pump sizing]] and [[Costs|cost notes]].",
    tags: ["design", "valves"],
    createdByName: "A. Nguyen",
    createdAt: "2026-11-20T01:00:00.000Z",
    updatedAt: "2026-11-21T01:00:00.000Z",
  };

  it("exports front matter, a title and Obsidian-friendly underline", () => {
    const md = noteToMarkdown(note, "Westfield PS");
    expect(md).toContain('tags: ["design", "valves"]');
    expect(md).toContain("# Valve options");
    expect(md).toContain("<u>butterfly</u>");
  });

  it("imports what it exported", () => {
    const back = markdownToNote("Valve options.md", noteToMarkdown(note, "Westfield PS"));
    expect(back.title).toBe("Valve options");
    expect(back.tags).toEqual(["design", "valves"]);
    expect(back.body).toContain("__butterfly__");
  });

  it("imports a plain Obsidian note with block tags and hashtags", () => {
    const back = markdownToNote("Site ideas.md", "---\ntags:\n  - site\n---\nCrane pad near gate #access");
    expect(back.title).toBe("Site ideas");
    expect(back.tags).toEqual(["site", "access"]);
  });

  it("finds wiki links and makes safe file names", () => {
    expect(wikiLinks(note.body)).toEqual(["Pump sizing", "Costs"]);
    expect(safeFileName('A/B: "C"?')).toBe("A-B- -C--");
  });
});
