import { Router } from "express";
import bcrypt from "bcryptjs";
import rateLimit from "express-rate-limit";
import { prisma } from "../prisma";
import { COOKIE_NAME, signToken } from "../auth";
import { requireAuth } from "../middleware/requireAuth";
import QRCode from "qrcode";
import {
  consumeRecoveryCode,
  decryptSecret,
  encryptSecret,
  generateRecoveryCodes,
  generateSecret,
  hashRecoveryCode,
  otpauthUrl,
  signChallenge,
  verifyChallenge,
  verifyTotp,
} from "../twoFactor";

const router = Router();

const COOKIE_OPTIONS = {
  httpOnly: true,
  sameSite: "lax" as const,
  secure: process.env.NODE_ENV === "production",
  maxAge: 7 * 24 * 60 * 60 * 1000,
};

// This app is reachable from the open internet, so login needs its own
// brute-force/credential-stuffing throttle rather than relying on a
// strong password alone. Keyed by IP (express-rate-limit's default) — a
// shared office/NAT IP will share this budget, which is an acceptable
// trade-off for a small self-hosted deployment. Counts only failed
// attempts (skipSuccessfulRequests) so a legitimate user who mistypes
// their password once isn't locked out by their own subsequent correct
// login.
const loginRateLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 10,
  standardHeaders: true,
  legacyHeaders: false,
  skipSuccessfulRequests: true,
  message: { error: "Too many login attempts. Try again in a few minutes." },
});

type SessionUser = {
  id: string;
  name: string;
  email: string;
  role: "ADMIN" | "MEMBER" | "VIEWER";
  createdAt: Date;
  emailDigestOptIn: boolean;
  twoFactorEnabled: boolean;
  upcomingManagerFilter: string | null;
};

function toSessionUser(user: SessionUser) {
  return {
    id: user.id,
    name: user.name,
    email: user.email,
    role: user.role,
    createdAt: user.createdAt,
    emailDigestOptIn: user.emailDigestOptIn,
    twoFactorEnabled: user.twoFactorEnabled,
    upcomingManagerFilter: user.upcomingManagerFilter,
  };
}

function startSession(res: import("express").Response, user: SessionUser) {
  const token = signToken({
    sub: user.id,
    name: user.name,
    email: user.email,
    role: user.role,
    createdAt: user.createdAt.toISOString(),
  });
  res.cookie(COOKIE_NAME, token, COOKIE_OPTIONS);
}

// Per-account throttle on second-factor guesses, on top of the per-IP
// limiter: 6-digit codes are only safe if the guess budget is small, and an
// attacker who already has the password could rotate IPs. In memory is fine —
// a restart just resets the window, and the 5-minute challenge token and the
// per-IP limiter still apply.
const SECOND_FACTOR_MAX_FAILURES = 5;
const SECOND_FACTOR_WINDOW_MS = 10 * 60 * 1000;
const secondFactorFailures = new Map<string, { count: number; resetAt: number }>();

function secondFactorLocked(userId: string): boolean {
  const entry = secondFactorFailures.get(userId);
  if (!entry) return false;
  if (Date.now() > entry.resetAt) {
    secondFactorFailures.delete(userId);
    return false;
  }
  return entry.count >= SECOND_FACTOR_MAX_FAILURES;
}

function recordSecondFactorFailure(userId: string) {
  const entry = secondFactorFailures.get(userId);
  if (!entry || Date.now() > entry.resetAt) {
    secondFactorFailures.set(userId, { count: 1, resetAt: Date.now() + SECOND_FACTOR_WINDOW_MS });
  } else {
    entry.count += 1;
  }
}

type TwoFactorUser = {
  id: string;
  twoFactorSecret: string | null;
  twoFactorRecoveryHashes: string[];
  twoFactorLastStep: number | null;
};

// Accepts either a current authenticator code or an unused recovery code.
// Both are single use: a TOTP step is recorded so it can't be replayed, and a
// recovery code is removed from the stored hashes. Returns false (and counts a
// failure) when neither matches.
async function checkSecondFactor(user: TwoFactorUser, rawCode: string): Promise<boolean> {
  if (!user.twoFactorSecret) return false;
  const code = rawCode.trim();
  const step = verifyTotp(decryptSecret(user.twoFactorSecret), code, user.twoFactorLastStep);
  if (step !== null) {
    // Atomic compare-and-set so two parallel requests can't both spend one code.
    const claimed = await prisma.user.updateMany({
      where: {
        id: user.id,
        OR: [{ twoFactorLastStep: null }, { twoFactorLastStep: { lt: step } }],
      },
      data: { twoFactorLastStep: step },
    });
    if (claimed.count === 1) return true;
  }
  const remaining = consumeRecoveryCode(user.twoFactorRecoveryHashes, code);
  if (remaining) {
    const claimed = await prisma.user.updateMany({
      where: { id: user.id, twoFactorRecoveryHashes: { equals: user.twoFactorRecoveryHashes } },
      data: { twoFactorRecoveryHashes: remaining },
    });
    if (claimed.count === 1) return true;
  }
  recordSecondFactorFailure(user.id);
  return false;
}

router.post("/login", loginRateLimiter, async (req, res) => {
  const { email, password } = req.body as { email?: string; password?: string };
  if (!email || !password) {
    return res.status(400).json({ error: "Email and password are required" });
  }

  const user = await prisma.user.findUnique({ where: { email: email.toLowerCase() } });
  if (!user || !(await bcrypt.compare(password, user.passwordHash))) {
    return res.status(401).json({ error: "Invalid email or password" });
  }
  if (!user.active) {
    return res
      .status(403)
      .json({ error: "This account has been deactivated. Contact an administrator." });
  }

  if (user.twoFactorEnabled) {
    // Password was right but no session yet: the client must come back with a
    // code from the authenticator app (or a recovery code) via /login/2fa.
    return res.json({ twoFactorRequired: true, challengeToken: signChallenge(user.id) });
  }

  startSession(res, user);
  res.json(toSessionUser(user));
});

router.post("/login/2fa", loginRateLimiter, async (req, res) => {
  const { challengeToken, code } = req.body as { challengeToken?: string; code?: string };
  if (!challengeToken || !code) {
    return res.status(400).json({ error: "A verification code is required" });
  }
  const userId = verifyChallenge(challengeToken);
  if (!userId) {
    return res.status(401).json({ error: "Your sign-in expired. Enter your password again." });
  }
  const user = await prisma.user.findUnique({ where: { id: userId } });
  if (!user || !user.active || !user.twoFactorEnabled) {
    return res.status(401).json({ error: "Your sign-in expired. Enter your password again." });
  }
  if (secondFactorLocked(user.id)) {
    return res
      .status(429)
      .json({ error: "Too many incorrect codes. Try again in a few minutes." });
  }
  if (!(await checkSecondFactor(user, code))) {
    return res.status(401).json({ error: "Invalid verification code" });
  }
  secondFactorFailures.delete(user.id);
  startSession(res, user);
  res.json({
    ...toSessionUser(user),
    recoveryCodesRemaining: user.twoFactorRecoveryHashes.length,
  });
});

router.post("/logout", (_req, res) => {
  res.clearCookie(COOKIE_NAME, { ...COOKIE_OPTIONS, maxAge: undefined });
  res.status(204).send();
});

router.get("/me", requireAuth, async (req, res) => {
  // emailDigestOptIn is read fresh from the DB rather than the JWT — it's a
  // preference a user can flip mid-session (see PUT /preferences below),
  // and baking it into the token would mean it goes stale until next login.
  const user = await prisma.user.findUnique({
    where: { id: req.user!.sub },
    select: { emailDigestOptIn: true, twoFactorEnabled: true, upcomingManagerFilter: true },
  });
  res.json({
    id: req.user!.sub,
    name: req.user!.name,
    email: req.user!.email,
    role: req.user!.role,
    createdAt: req.user!.createdAt,
    emailDigestOptIn: user?.emailDigestOptIn ?? false,
    twoFactorEnabled: user?.twoFactorEnabled ?? false,
    upcomingManagerFilter: user?.upcomingManagerFilter ?? null,
  });
});

// Per-user settings that should follow someone across logins and devices.
// Each field is optional, so a client can save one without touching others.
router.put("/preferences", requireAuth, async (req, res) => {
  const { emailDigestOptIn, upcomingManagerFilter } = req.body as {
    emailDigestOptIn?: unknown;
    upcomingManagerFilter?: unknown;
  };
  const data: { emailDigestOptIn?: boolean; upcomingManagerFilter?: string | null } = {};
  if (emailDigestOptIn !== undefined) {
    if (typeof emailDigestOptIn !== "boolean") {
      return res.status(400).json({ error: "emailDigestOptIn must be true or false" });
    }
    data.emailDigestOptIn = emailDigestOptIn;
  }
  if (upcomingManagerFilter !== undefined) {
    if (upcomingManagerFilter !== null && typeof upcomingManagerFilter !== "string") {
      return res.status(400).json({ error: "upcomingManagerFilter must be a name or null" });
    }
    data.upcomingManagerFilter = upcomingManagerFilter ? upcomingManagerFilter.slice(0, 200) : null;
  }
  if (Object.keys(data).length === 0) {
    return res.status(400).json({ error: "Nothing to update" });
  }
  const user = await prisma.user.update({
    where: { id: req.user!.sub },
    data,
    select: { emailDigestOptIn: true, upcomingManagerFilter: true },
  });
  res.json(user);
});

router.post("/change-password", requireAuth, async (req, res) => {
  const { currentPassword, newPassword } = req.body as {
    currentPassword?: string;
    newPassword?: string;
  };
  if (!currentPassword || !newPassword) {
    return res
      .status(400)
      .json({ error: "Current and new password are required" });
  }
  if (newPassword.length < 8) {
    return res
      .status(400)
      .json({ error: "New password must be at least 8 characters" });
  }

  const user = await prisma.user.findUnique({ where: { id: req.user!.sub } });
  if (!user || !(await bcrypt.compare(currentPassword, user.passwordHash))) {
    return res.status(401).json({ error: "Current password is incorrect" });
  }

  const passwordHash = await bcrypt.hash(newPassword, 10);
  await prisma.user.update({ where: { id: user.id }, data: { passwordHash } });
  res.status(204).send();
});

// ---- Two-factor management (all require a signed-in session) --------------

async function verifyPassword(userId: string, password: unknown) {
  if (typeof password !== "string" || !password) return null;
  const user = await prisma.user.findUnique({ where: { id: userId } });
  if (!user || !(await bcrypt.compare(password, user.passwordHash))) return null;
  return user;
}

router.get("/2fa/status", requireAuth, async (req, res) => {
  const user = await prisma.user.findUnique({
    where: { id: req.user!.sub },
    select: { twoFactorEnabled: true, twoFactorRecoveryHashes: true },
  });
  res.json({
    enabled: user?.twoFactorEnabled ?? false,
    recoveryCodesRemaining: user?.twoFactorEnabled ? user.twoFactorRecoveryHashes.length : 0,
  });
});

// Step 1 of enrolment: needs the password (so a hijacked session alone can't
// bind an attacker's authenticator), stores a new pending secret, and returns
// the QR code. Nothing is enforced until /2fa/enable confirms a code.
router.post("/2fa/setup", requireAuth, loginRateLimiter, async (req, res) => {
  const user = await verifyPassword(req.user!.sub, req.body?.password);
  if (!user) return res.status(401).json({ error: "Password is incorrect" });
  if (user.twoFactorEnabled) {
    return res.status(400).json({ error: "Two-factor authentication is already on" });
  }
  const secret = generateSecret();
  await prisma.user.update({
    where: { id: user.id },
    data: { twoFactorSecret: encryptSecret(secret), twoFactorLastStep: null },
  });
  const url = otpauthUrl(user.email, secret);
  res.json({
    secret,
    otpauthUrl: url,
    qrDataUrl: await QRCode.toDataURL(url, { margin: 1, width: 220 }),
  });
});

// Step 2: prove the authenticator app is working before turning it on, so a
// mistyped scan can't lock the owner out. Returns the one-time recovery codes.
router.post("/2fa/enable", requireAuth, loginRateLimiter, async (req, res) => {
  const { code } = req.body as { code?: string };
  const user = await prisma.user.findUnique({ where: { id: req.user!.sub } });
  if (!user || !user.twoFactorSecret) {
    return res.status(400).json({ error: "Start setup first" });
  }
  if (user.twoFactorEnabled) {
    return res.status(400).json({ error: "Two-factor authentication is already on" });
  }
  const step =
    typeof code === "string" ? verifyTotp(decryptSecret(user.twoFactorSecret), code) : null;
  if (step === null) {
    return res.status(401).json({ error: "That code didn't match. Check the app and try again." });
  }
  const recoveryCodes = generateRecoveryCodes();
  await prisma.user.update({
    where: { id: user.id },
    data: {
      twoFactorEnabled: true,
      twoFactorLastStep: step,
      twoFactorRecoveryHashes: recoveryCodes.map(hashRecoveryCode),
    },
  });
  res.json({ recoveryCodes });
});

router.post("/2fa/disable", requireAuth, loginRateLimiter, async (req, res) => {
  const user = await verifyPassword(req.user!.sub, req.body?.password);
  if (!user) return res.status(401).json({ error: "Password is incorrect" });
  if (!user.twoFactorEnabled) {
    return res.status(400).json({ error: "Two-factor authentication is off" });
  }
  if (secondFactorLocked(user.id)) {
    return res.status(429).json({ error: "Too many incorrect codes. Try again in a few minutes." });
  }
  const code = typeof req.body?.code === "string" ? req.body.code : "";
  if (!(await checkSecondFactor(user, code))) {
    return res.status(401).json({ error: "Invalid verification code" });
  }
  await prisma.user.update({
    where: { id: user.id },
    data: {
      twoFactorEnabled: false,
      twoFactorSecret: null,
      twoFactorLastStep: null,
      twoFactorRecoveryHashes: [],
    },
  });
  res.status(204).send();
});

router.post("/2fa/recovery-codes", requireAuth, loginRateLimiter, async (req, res) => {
  const user = await verifyPassword(req.user!.sub, req.body?.password);
  if (!user) return res.status(401).json({ error: "Password is incorrect" });
  if (!user.twoFactorEnabled) {
    return res.status(400).json({ error: "Two-factor authentication is off" });
  }
  if (secondFactorLocked(user.id)) {
    return res.status(429).json({ error: "Too many incorrect codes. Try again in a few minutes." });
  }
  const code = typeof req.body?.code === "string" ? req.body.code : "";
  if (!(await checkSecondFactor(user, code))) {
    return res.status(401).json({ error: "Invalid verification code" });
  }
  const recoveryCodes = generateRecoveryCodes();
  await prisma.user.update({
    where: { id: user.id },
    data: { twoFactorRecoveryHashes: recoveryCodes.map(hashRecoveryCode) },
  });
  res.json({ recoveryCodes });
});

export default router;
