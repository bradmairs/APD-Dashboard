// TRIM locations (and general links) are free text: a web link where one
// exists, otherwise a record/container number. Returns a safe href for web
// links — including ones pasted without "https://", like
// "www.gvw.com.au/..." — or null for anything else. Only http(s) hrefs are
// ever produced, so a pasted "javascript:" value can never become a link.
export function trimHref(location: string | null | undefined): string | null {
  if (!location) return null;
  const trimmed = location.trim();
  if (/\s/.test(trimmed)) return null;
  if (/^https?:\/\//i.test(trimmed)) return trimmed;
  // A bare host: dotted name ending in a 2+ letter TLD, optional port/path.
  // Checked before the scheme test, which "host:8080" would otherwise match.
  if (/^(www\.)?([a-z0-9-]+\.)+[a-z]{2,}(:\d+)?(\/\S*)?$/i.test(trimmed)) {
    return `https://${trimmed}`;
  }
  // Anything else ("javascript:", "data:", "mailto:", a record number…) is
  // not a web link.
  return null;
}
