// TRIM locations are free text: a web link where one exists, otherwise a
// record/container number. Only http(s) values are rendered as links, so a
// pasted "javascript:" value can never become a clickable href.
export function trimHref(location: string | null | undefined): string | null {
  if (!location) return null;
  const trimmed = location.trim();
  return /^https?:\/\//i.test(trimmed) ? trimmed : null;
}
