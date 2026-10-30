import { describe, expect, it } from "vitest";
import { parseBlocks, parseInline, toPlainText } from "./richText";

describe("parseInline", () => {
  it("leaves unformatted text alone", () => {
    expect(parseInline("Just a note, 5 * 3 = 15")).toEqual([
      { type: "text", text: "Just a note, 5 * 3 = 15" },
    ]);
  });

  it("reads bold, italic and underline, including nested", () => {
    expect(parseInline("a **b *c* d** __d__ *e*")).toEqual([
      { type: "text", text: "a " },
      {
        type: "bold",
        children: [
          { type: "text", text: "b " },
          { type: "italic", children: [{ type: "text", text: "c" }] },
          { type: "text", text: " d" },
        ],
      },
      { type: "text", text: " " },
      { type: "underline", children: [{ type: "text", text: "d" }] },
      { type: "text", text: " " },
      { type: "italic", children: [{ type: "text", text: "e" }] },
    ]);
  });

  it("keeps unmatched markers as text", () => {
    expect(parseInline("**not closed")).toEqual([{ type: "text", text: "**not closed" }]);
  });
});

describe("parseBlocks", () => {
  it("groups bullet and numbered lines into lists", () => {
    const blocks = parseBlocks("Intro\n- one\n* two\n\n3. three\n4) four");
    expect(blocks.map((b) => b.type)).toEqual(["line", "ul", "blank", "ol"]);
    expect(blocks[1]).toMatchObject({ items: [[{ text: "one" }], [{ text: "two" }]] });
    expect(blocks[3]).toMatchObject({ start: 3 });
  });
});

describe("toPlainText", () => {
  it("strips markers and renders list markers", () => {
    expect(toPlainText("**Agreed:**\n- item __one__\n1. first")).toBe(
      "Agreed:\n•  item one\n1.  first"
    );
  });
});
