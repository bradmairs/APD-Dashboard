import { NextFunction, Request, Response } from "express";

// Must run after requireAuth (needs req.user already populated).
export function requireAdmin(req: Request, res: Response, next: NextFunction) {
  if (req.user?.role !== "ADMIN") {
    return res.status(403).json({ error: "Admin access required" });
  }
  next();
}
