import { Role } from "@prisma/client";
import jwt from "jsonwebtoken";

if (!process.env.JWT_SECRET) {
  throw new Error("JWT_SECRET environment variable is required");
}
const JWT_SECRET: string = process.env.JWT_SECRET;

// Cookies are scoped to a host, not a port, so two instances on one host (e.g.
// :8080 and :8069 on the same LAN IP) overwrite each other's login cookie and
// each rejects the other's token ("Invalid or expired session"). Setting
// AUTH_COOKIE_NAME per instance keeps their sessions separate.
export const COOKIE_NAME = process.env.AUTH_COOKIE_NAME || "apd_token";

export interface AuthTokenPayload {
  sub: string;
  name: string;
  email: string;
  role: Role;
  createdAt: string;
}

export function signToken(payload: AuthTokenPayload): string {
  return jwt.sign(payload, JWT_SECRET, { expiresIn: "7d" });
}

export function verifyToken(token: string): AuthTokenPayload {
  return jwt.verify(token, JWT_SECRET) as AuthTokenPayload;
}
