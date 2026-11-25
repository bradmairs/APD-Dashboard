// Request batching and a short-lived page cache.
//
// A page like the dashboard loads ~23 lists and a project page ~38, each
// with its own request. `batched(run)` runs `run` (which calls the usual
// api.ts functions, e.g. Promise.all([getProjects(), getAllRisks(), …]))
// but sends every plain GET it makes to /api as ONE request to /api/batch,
// then hands each function its own answer as if it had fetched it itself.
// Nothing else in api.ts needs to know.
//
// It also remembers the answers for a few minutes. With `preferCache`, a
// page you've already visited is drawn straight away from what was fetched
// last time, and `onCacheHit` tells it to refresh in the background.
//
// The cache is in memory only (gone on reload) and cleared on log out.

const MAX_AGE_MS = 10 * 60 * 1000;
const MAX_PER_BATCH = 60;

interface CachedAnswer {
  status: number;
  body: unknown;
  at: number;
}

const cache = new Map<string, CachedAnswer>();

export function clearBatchCache() {
  cache.clear();
}

interface Pending {
  url: string;
  resolve: (res: Response) => void;
  reject: (err: unknown) => void;
}

function toResponse(answer: { status: number; body: unknown }): Response {
  if (answer.status === 204 || answer.body === null) return new Response(null, { status: answer.status === 200 ? 204 : answer.status });
  return new Response(JSON.stringify(answer.body), {
    status: answer.status,
    headers: { "Content-Type": "application/json" },
  });
}

function urlOf(input: RequestInfo | URL): string {
  if (typeof input === "string") return input;
  if (input instanceof URL) return input.pathname + input.search;
  return input.url;
}

function isBatchable(url: string, init?: RequestInit): boolean {
  const method = (init?.method ?? "GET").toUpperCase();
  return (
    method === "GET" &&
    !init?.body &&
    url.startsWith("/api/") &&
    !url.startsWith("/api/batch") &&
    !url.startsWith("/api/auth") &&
    /^\/api\/[A-Za-z0-9\-_/]+(\?[A-Za-z0-9\-_=&%.:,]*)?$/.test(url)
  );
}

export class CacheMiss extends Error {}

interface Options {
  // Answer from the cache when every request in this batch is there.
  preferCache?: boolean;
  // Called when the answer came from the cache (so the page can refresh).
  onCacheHit?: () => void;
}

export async function batched<T>(run: () => Promise<T>, options: Options = {}): Promise<T> {
  const realFetch = window.fetch;
  const pending: Pending[] = [];

  // The api functions call fetch() synchronously when invoked, so swapping
  // it just while `run` starts catches exactly this page's requests.
  window.fetch = ((input: RequestInfo | URL, init?: RequestInit) => {
    const url = urlOf(input);
    if (!isBatchable(url, init)) return realFetch(input, init);
    return new Promise<Response>((resolve, reject) => pending.push({ url, resolve, reject }));
  }) as typeof window.fetch;

  let result: Promise<T>;
  try {
    result = run();
  } finally {
    window.fetch = realFetch;
  }

  if (pending.length > 0) {
    const now = Date.now();
    const allCached =
      options.preferCache && pending.every((p) => {
        const hit = cache.get(p.url);
        return hit && now - hit.at < MAX_AGE_MS;
      });
    if (allCached) {
      for (const p of pending) p.resolve(toResponse(cache.get(p.url)!));
      options.onCacheHit?.();
    } else {
      await send(pending, realFetch);
    }
  }
  return result;
}

async function send(pending: Pending[], realFetch: typeof window.fetch) {
  const urls = Array.from(new Set(pending.map((p) => p.url)));
  const answers = new Map<string, { status: number; body: unknown }>();
  try {
    for (let i = 0; i < urls.length; i += MAX_PER_BATCH) {
      const chunk = urls.slice(i, i + MAX_PER_BATCH);
      const query = chunk.map((u) => `p=${encodeURIComponent(u)}`).join("&");
      const res = await realFetch(`/api/batch?${query}`);
      if (!res.ok) throw new Error(`Batch failed: ${res.status}`);
      const data = (await res.json()) as Record<string, { status: number; body: unknown }>;
      for (const u of chunk) {
        if (!data[u]) throw new Error("Batch answer missing");
        answers.set(u, data[u]);
      }
    }
  } catch {
    // Older server or a network hiccup: fall back to one request each.
    for (const p of pending) realFetch(p.url).then(p.resolve, p.reject);
    return;
  }
  const at = Date.now();
  for (const [u, answer] of answers) {
    if (answer.status >= 200 && answer.status < 300) cache.set(u, { ...answer, at });
    else cache.delete(u);
  }
  for (const p of pending) p.resolve(toResponse(answers.get(p.url)!));
}
