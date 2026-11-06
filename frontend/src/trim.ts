import { useEffect, useState } from "react";
import { getAppConfig } from "./api";

// TRIM and GVW links are free text, so this works out what each one can
// open, in a new tab:
//   - a web address, with or without "https://" ("www.gvw.com.au/…");
//   - a network path ("\\server\share\folder") or file: link, as a file: URL;
//   - an app link such as TRIM / Content Manager's own ("trim:…", "hprm:…");
//   - a TRIM record number ("D24/12345"), when the server is configured
//     with TRIM_RECORD_URL (e.g. "https://trim.gvw.local/…?uri={record}").
// Script-capable schemes ("javascript:", "data:", "vbscript:", "blob:") are
// never made into links. Returns null when there's nothing to open.
const BLOCKED_SCHEMES = new Set(["javascript", "data", "vbscript", "blob", "about"]);

export function trimHref(
  location: string | null | undefined,
  recordUrlTemplate?: string | null
): string | null {
  if (!location) return null;
  const trimmed = location.trim();
  if (!trimmed) return null;

  if (/^https?:\/\/\S+$/i.test(trimmed)) return trimmed;

  // A bare host: dotted name ending in a 2+ letter TLD, optional port/path.
  // Checked before the scheme test, which "host:8080" would otherwise match.
  if (/^(www\.)?([a-z0-9-]+\.)+[a-z]{2,}(:\d+)?(\/\S*)?$/i.test(trimmed)) {
    return `https://${trimmed}`;
  }

  // A Windows network path: \\server\share\folder → file://server/share/folder
  const unc = /^\\\\([^\\/\s]+)\\(.+)$/.exec(trimmed);
  if (unc) {
    return `file://${unc[1]}/${unc[2].split("\\").map(encodeURIComponent).join("/")}`;
  }

  // Another scheme (file:, trim:, hprm:, ms-word:…), unless script-capable.
  const scheme = /^([a-z][a-z0-9+.-]*):\S/i.exec(trimmed);
  if (scheme) {
    return BLOCKED_SCHEMES.has(scheme[1].toLowerCase()) || /\s/.test(trimmed) ? null : trimmed;
  }

  // A record number, through the configured TRIM web address.
  if (recordUrlTemplate && /^[\w./-]+$/.test(trimmed)) {
    return recordUrlTemplate.replace("{record}", encodeURIComponent(trimmed));
  }
  return null;
}

// The server's TRIM_RECORD_URL template (null when not configured), fetched
// once and shared by every link on the page.
let recordUrlPromise: Promise<string | null> | null = null;

export function useTrimRecordUrl(): string | null {
  const [template, setTemplate] = useState<string | null>(null);
  useEffect(() => {
    recordUrlPromise ??= getAppConfig()
      .then((c) => c.trimRecordUrl)
      .catch(() => null);
    let active = true;
    recordUrlPromise.then((t) => {
      if (active) setTemplate(t);
    });
    return () => {
      active = false;
    };
  }, []);
  return template;
}
