import { Router } from "express";

// GET /api/batch?p=/api/projects&p=/api/risks&...
//
// Lets a page fetch everything it needs in ONE browser request instead of
// dozens (the dashboard used to make ~23, a project page ~38). Over a VPN
// or a busy network each browser request costs a round trip, and browsers
// only run about six at once, so this makes pages noticeably faster.
//
// Each path is fetched from this same server on 127.0.0.1 with the caller's
// own cookie, so it goes through exactly the same login, permission and
// viewer checks as if the browser had asked for it directly. Only GETs to
// this app's own /api paths are allowed — never another host.

const MAX_PATHS = 60;
const PATH_PATTERN = /^\/api\/[A-Za-z0-9\-_/]+(\?[A-Za-z0-9\-_=&%.:,]*)?$/;

export function isBatchablePath(path: unknown): path is string {
  return (
    typeof path === "string" &&
    path.length <= 300 &&
    PATH_PATTERN.test(path) &&
    !path.includes("..") &&
    !path.includes("//") &&
    !path.startsWith("/api/batch") &&
    !path.startsWith("/api/auth")
  );
}

export function batchRouter(port: number | string) {
  const router = Router();

  router.get("/", async (req, res) => {
    const raw = req.query.p;
    const paths = (Array.isArray(raw) ? raw : raw === undefined ? [] : [raw]) as unknown[];
    if (paths.length === 0 || paths.length > MAX_PATHS) {
      return res.status(400).json({ error: `Ask for between 1 and ${MAX_PATHS} paths.` });
    }
    if (!paths.every(isBatchablePath)) {
      return res.status(400).json({ error: "Only this app's own /api paths can be batched." });
    }

    const headers: Record<string, string> = { accept: "application/json" };
    if (req.headers.cookie) headers.cookie = req.headers.cookie;
    // Keep the caller's IP for anything that logs or rate-limits by it.
    headers["x-forwarded-for"] = req.ip ?? "";

    const results = await Promise.all(
      (paths as string[]).map(async (path) => {
        try {
          const r = await fetch(`http://127.0.0.1:${port}${path}`, { headers });
          const body = r.status === 204 ? null : await r.json().catch(() => null);
          return [path, { status: r.status, body }] as const;
        } catch {
          return [path, { status: 502, body: { error: "Request failed" } }] as const;
        }
      })
    );
    res.set("Cache-Control", "no-store");
    res.json(Object.fromEntries(results));
  });

  return router;
}
