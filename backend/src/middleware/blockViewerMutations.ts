import { NextFunction, Request, Response } from "express";

const SAFE_METHODS = new Set(["GET", "HEAD", "OPTIONS"]);

// Must run after requireAuth (needs req.user already populated). This is the
// real security boundary for the read-only Viewer role — frontend hiding of
// create/edit/delete controls is just a courtesy on top of this.
export function blockViewerMutations(req: Request, res: Response, next: NextFunction) {
  if (req.user?.role === "VIEWER" && !SAFE_METHODS.has(req.method)) {
    return res.status(403).json({ error: "Your account has read-only access." });
  }
  next();
}
