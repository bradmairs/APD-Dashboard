// Long-text fields can carry light formatting markers from the app's
// formatted editor (frontend/src/richText.ts): **bold**, *italic*,
// __underline__, and lines starting "- " / "* " / "• " for bullets. This
// removes them for places that only take plain text — the monthly report
// workbook and search result titles — keeping list items as "• " lines.
// Numbered lines ("1. ") are already plain text and are left as they are.
export function stripFormatting(text: string): string {
  return text
    .split(/\r?\n/)
    .map((line) => line.replace(/^\s*[-*•]\s+/, "• "))
    .join("\n")
    .replace(/(\*\*|__)(?=\S)([\s\S]*?\S)\1/g, "$2")
    .replace(/\*(?=[^\s*])([^*\n]*?[^\s*])\*/g, "$1");
}
