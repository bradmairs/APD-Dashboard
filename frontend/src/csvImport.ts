// Parses CSV text into an array of header-keyed row objects — the import
// counterpart to csvExport.ts. Handles RFC 4180 quoting (quoted fields,
// embedded commas/newlines, doubled "" for a literal quote) since a
// re-imported file may be one this app itself exported and then edited in
// Excel, which quotes liberally.
export function parseCsv(text: string): Record<string, string>[] {
  const withoutBom = text.charCodeAt(0) === 0xfeff ? text.slice(1) : text;
  const rows: string[][] = [];
  let field = "";
  let record: string[] = [];
  let inQuotes = false;

  for (let i = 0; i < withoutBom.length; i++) {
    const c = withoutBom[i];
    if (inQuotes) {
      if (c === '"') {
        if (withoutBom[i + 1] === '"') {
          field += '"';
          i++;
        } else {
          inQuotes = false;
        }
      } else {
        field += c;
      }
    } else if (c === '"') {
      inQuotes = true;
    } else if (c === ",") {
      record.push(field);
      field = "";
    } else if (c === "\n" || c === "\r") {
      if (c === "\r" && withoutBom[i + 1] === "\n") i++;
      record.push(field);
      rows.push(record);
      record = [];
      field = "";
    } else {
      field += c;
    }
  }
  if (field.length > 0 || record.length > 0) {
    record.push(field);
    rows.push(record);
  }
  if (rows.length === 0) return [];

  const headers = rows[0].map((h) => h.trim());
  return rows
    .slice(1)
    .filter((r) => r.some((cell) => cell.trim() !== ""))
    .map((r) => {
      const obj: Record<string, string> = {};
      headers.forEach((h, idx) => {
        obj[h] = (r[idx] ?? "").trim();
      });
      return obj;
    });
}

// Matches a CSV cell against an enum's label map, accepting either the
// human label ("Almost Certain") or the raw enum value ("ALMOST_CERTAIN"),
// case- and whitespace-insensitively — so an import round-trips a file this
// app itself exported without requiring an exact-case match.
export function matchEnumLabel<T extends string>(
  labels: Record<T, string>,
  input: string
): T | undefined {
  const normalized = input.trim().toLowerCase();
  if (!normalized) return undefined;
  for (const key of Object.keys(labels) as T[]) {
    if (key.toLowerCase() === normalized || labels[key].toLowerCase() === normalized) {
      return key;
    }
  }
  return undefined;
}

// Accepts anything Date can parse (ISO "2025-08-20", or formatDate's own
// "20 Aug 2025" output) and returns an ISO string for the API, or null for
// an empty cell. Throws for a non-empty cell that doesn't parse, so a typo'd
// date fails that row with a clear reason instead of silently becoming null.
export function parseImportDate(input: string): string | null {
  const trimmed = input.trim();
  if (!trimmed || trimmed === "—") return null;
  const date = new Date(trimmed);
  if (Number.isNaN(date.getTime())) {
    throw new Error(`Could not parse date "${trimmed}"`);
  }
  return date.toISOString();
}

export function parseRequiredEnum<T extends string>(
  labels: Record<T, string>,
  value: string | undefined,
  fieldName: string
): T {
  const match = value ? matchEnumLabel(labels, value) : undefined;
  if (!match) throw new Error(`Invalid or missing "${fieldName}": "${value ?? ""}"`);
  return match;
}

export function parseOptionalEnum<T extends string>(
  labels: Record<T, string>,
  value: string | undefined,
  fieldName: string
): T | null {
  if (!value || !value.trim()) return null;
  const match = matchEnumLabel(labels, value);
  if (!match) throw new Error(`Invalid "${fieldName}": "${value}"`);
  return match;
}

// Strips currency formatting ("$12,345") back to a plain numeric string
// ("12345") for a Decimal field — accepts a bare number too, so a value
// typed directly into a spreadsheet works as well as a re-imported export.
export function parseImportCurrency(input: string): string | null {
  const trimmed = input.trim();
  if (!trimmed || trimmed === "—") return null;
  const cleaned = trimmed.replace(/[^0-9.-]/g, "");
  if (!cleaned || Number.isNaN(Number(cleaned))) {
    throw new Error(`Could not parse amount "${trimmed}"`);
  }
  return cleaned;
}

export function requireCell(row: Record<string, string>, key: string): string {
  const value = row[key]?.trim();
  if (!value) throw new Error(`Missing required "${key}"`);
  return value;
}
