import fs from "fs";
import { siteVisitPhotoFilePath } from "./upload";

// Thin client for the Engineering Archive — a separate self-hosted app on
// the same server that indexes site photos/videos and general work files
// by asset. Two directions:
//   - push: this app's site visit photos get exported into the Archive
//     (POST /api/external/site-visit-photos, a write-scoped endpoint the
//     Archive already built specifically to receive these).
//   - search: this app's users can search the Archive's assets/media/files
//     to link one to a GVW project (GET /api/external/search, key-authenticated
//     — the Archive's plain /api/search sits behind its web login and
//     rejects an API key).
// No API key: unlike Ollama, the Archive's /api/external/* routes DO check
// one (X-API-Key), created once on the Archive's Integrations page and
// stored here as ENGINEERING_ARCHIVE_API_KEY — never sent to the browser.
const ARCHIVE_BASE_URL = process.env.ENGINEERING_ARCHIVE_BASE_URL;
const ARCHIVE_API_KEY = process.env.ENGINEERING_ARCHIVE_API_KEY;
// Deliberately separate from ARCHIVE_BASE_URL: in the Docker deployment,
// ARCHIVE_BASE_URL is a container-to-container address (e.g.
// http://host.docker.internal:<port>) that only resolves from inside this
// backend's own container — a link built from it would 404 in a real
// browser. This is the address a browser on the LAN can actually reach.
const ARCHIVE_PUBLIC_URL = process.env.ENGINEERING_ARCHIVE_PUBLIC_URL || ARCHIVE_BASE_URL;

export class ArchiveError extends Error {}

export function isArchiveConfigured(): boolean {
  return Boolean(ARCHIVE_BASE_URL && ARCHIVE_API_KEY);
}

function requireConfig(): { baseUrl: string; apiKey: string } {
  if (!ARCHIVE_BASE_URL || !ARCHIVE_API_KEY) {
    throw new ArchiveError(
      "Engineering Archive integration is not configured (set ENGINEERING_ARCHIVE_BASE_URL and ENGINEERING_ARCHIVE_API_KEY)."
    );
  }
  return { baseUrl: ARCHIVE_BASE_URL, apiKey: ARCHIVE_API_KEY };
}

interface PushSiteVisitPhotoInput {
  photoId: string;
  projectId: string;
  projectName: string;
  siteVisitId: string;
  storedFilename: string;
  originalName: string;
  mimeType: string;
  latitude: number | null;
  longitude: number | null;
  takenAt: Date | null;
}

export async function pushSiteVisitPhotoToArchive(
  input: PushSiteVisitPhotoInput
): Promise<{ id: string }> {
  const { baseUrl, apiKey } = requireConfig();

  const filePath = siteVisitPhotoFilePath(input.projectId, input.siteVisitId, input.storedFilename);
  const fileBuffer = await fs.promises.readFile(filePath);

  const form = new FormData();
  form.append("file", new Blob([fileBuffer], { type: input.mimeType }), input.originalName);
  form.append("projectName", input.projectName);
  form.append("siteVisitId", input.siteVisitId);
  form.append("externalId", input.photoId);
  form.append("externalSource", "gvw-project-management");
  if (input.latitude !== null) form.append("latitude", String(input.latitude));
  if (input.longitude !== null) form.append("longitude", String(input.longitude));
  if (input.takenAt) form.append("takenAt", input.takenAt.toISOString());

  let res: Response;
  try {
    res = await fetch(`${baseUrl}/api/external/site-visit-photos`, {
      method: "POST",
      headers: { "X-API-Key": apiKey },
      body: form,
    });
  } catch (err) {
    throw new ArchiveError(`Could not reach the Engineering Archive at ${baseUrl}.`);
  }

  if (!res.ok) {
    const body = await res.text().catch(() => "");
    throw new ArchiveError(`Engineering Archive returned an error (${res.status}): ${body || res.statusText}`);
  }

  return (await res.json()) as { id: string };
}

export interface ArchiveSearchResult {
  query: string;
  assets: Array<Record<string, unknown> & { id: string; name: string }>;
  media: Array<Record<string, unknown> & { id: string; fileName: string }>;
  files: Array<Record<string, unknown> & { id: string; fileName: string }>;
}

export async function searchArchive(query: string): Promise<ArchiveSearchResult> {
  const { baseUrl, apiKey } = requireConfig();

  let res: Response;
  try {
    res = await fetch(`${baseUrl}/api/external/search?q=${encodeURIComponent(query)}`, {
      headers: { "X-API-Key": apiKey },
    });
  } catch (err) {
    throw new ArchiveError(`Could not reach the Engineering Archive at ${baseUrl}.`);
  }

  if (!res.ok) {
    const body = await res.text().catch(() => "");
    throw new ArchiveError(`Engineering Archive returned an error (${res.status}): ${body || res.statusText}`);
  }

  return (await res.json()) as ArchiveSearchResult;
}

export type ArchiveItemType = "ASSET" | "MEDIA" | "FILE";

// The Archive's own frontend routes (see its App.tsx) — /assets/:id and
// /media/:id have real detail pages; general files only have a list view,
// so a FILE link just goes to that.
export function buildArchiveItemUrl(type: ArchiveItemType, id: string): string {
  requireConfig(); // throws if the integration isn't configured at all
  const base = ARCHIVE_PUBLIC_URL;
  if (type === "ASSET") return `${base}/assets/${id}`;
  if (type === "MEDIA") return `${base}/media/${id}`;
  return `${base}/files`;
}
