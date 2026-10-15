import { NextFunction, Request, Response } from "express";
import { AuthTokenPayload, COOKIE_NAME, verifyToken } from "../auth";
import { prisma } from "../prisma";

declare global {
  namespace Express {
    interface Request {
      user?: AuthTokenPayload;
    }
  }
}

export async function requireAuth(req: Request, res: Response, next: NextFunction) {
  const token = req.cookies?.[COOKIE_NAME];
  if (!token) {
    return res.status(401).json({ error: "Not authenticated" });
  }
  let payload: AuthTokenPayload;
  try {
    payload = verifyToken(token);
  } catch {
    return res.status(401).json({ error: "Invalid or expired session" });
  }

  // Checked on every request (not baked into the JWT) so deactivating a user
  // takes effect immediately, instead of waiting out their up-to-7-day session.
  const user = await prisma.user.findUnique({
    where: { id: payload.sub },
    select: { active: true },
  });
  if (!user || !user.active) {
    res.clearCookie(COOKIE_NAME);
    return res.status(403).json({ error: "This account has been deactivated." });
  }

  req.user = payload;
  next();
}
