import crypto from "crypto";
import jwt from "jsonwebtoken";

// TOTP (RFC 6238, HMAC-SHA1, 6 digits, 30s step) — the variant every
// authenticator app (Google Authenticator, Microsoft Authenticator, Authy,
// 1Password, Bitwarden…) supports. Implemented on node:crypto directly so
// two-factor auth adds no runtime dependency beyond QR rendering.

const STEP_SECONDS = 30;
const DIGITS = 6;
// Accept the previous and next step too, so a few seconds of clock drift
// between the phone and the server doesn't lock a user out.
const WINDOW = 1;
const BASE32 = "ABCDEFGHIJKLMNOPQRSTUVWXYZ234567";
const ISSUER = "GVW Project Management";

function appSecret(): string {
  const secret = process.env.JWT_SECRET;
  if (!secret) throw new Error("JWT_SECRET environment variable is required");
  return secret;
}

// Each purpose gets its own key derived from JWT_SECRET, so a 2FA challenge
// token can never be replayed as a session cookie (or vice versa) even
// though both are JWTs signed from the same root secret.
function derivedKey(purpose: string): Buffer {
  return crypto.createHash("sha256").update(`${appSecret()}|${purpose}`).digest();
}

export function base32Encode(buf: Buffer): string {
  let bits = 0;
  let value = 0;
  let out = "";
  for (const byte of buf) {
    value = (value << 8) | byte;
    bits += 8;
    while (bits >= 5) {
      out += BASE32[(value >>> (bits - 5)) & 31];
      bits -= 5;
    }
  }
  if (bits > 0) out += BASE32[(value << (5 - bits)) & 31];
  return out;
}

export function base32Decode(input: string): Buffer {
  const clean = input.toUpperCase().replace(/[\s=-]/g, "");
  let bits = 0;
  let value = 0;
  const bytes: number[] = [];
  for (const ch of clean) {
    const idx = BASE32.indexOf(ch);
    if (idx === -1) throw new Error("Invalid base32 character");
    value = (value << 5) | idx;
    bits += 5;
    if (bits >= 8) {
      bytes.push((value >>> (bits - 8)) & 255);
      bits -= 8;
    }
  }
  return Buffer.from(bytes);
}

export function generateSecret(): string {
  return base32Encode(crypto.randomBytes(20));
}

export function hotp(secret: Buffer, counter: number, digits = DIGITS): string {
  const buf = Buffer.alloc(8);
  buf.writeBigUInt64BE(BigInt(counter));
  const hmac = crypto.createHmac("sha1", secret).update(buf).digest();
  const offset = hmac[hmac.length - 1] & 0xf;
  const code =
    ((hmac[offset] & 0x7f) << 24) |
    (hmac[offset + 1] << 16) |
    (hmac[offset + 2] << 8) |
    hmac[offset + 3];
  return (code % 10 ** digits).toString().padStart(digits, "0");
}

export function currentStep(nowMs = Date.now()): number {
  return Math.floor(nowMs / 1000 / STEP_SECONDS);
}

// Returns the time step the code matched, or null. `lastUsedStep` rejects any
// step at or before the last accepted one, so each code works exactly once.
export function verifyTotp(
  base32Secret: string,
  code: string,
  lastUsedStep: number | null = null,
  nowMs = Date.now()
): number | null {
  const cleaned = code.replace(/\s/g, "");
  if (!/^\d{6}$/.test(cleaned)) return null;
  const secret = base32Decode(base32Secret);
  const now = currentStep(nowMs);
  for (let step = now - WINDOW; step <= now + WINDOW; step++) {
    if (lastUsedStep !== null && step <= lastUsedStep) continue;
    const expected = hotp(secret, step);
    if (
      crypto.timingSafeEqual(Buffer.from(expected), Buffer.from(cleaned))
    ) {
      return step;
    }
  }
  return null;
}

export function otpauthUrl(accountEmail: string, base32Secret: string): string {
  const label = encodeURIComponent(`${ISSUER}:${accountEmail}`);
  const params = new URLSearchParams({
    secret: base32Secret,
    issuer: ISSUER,
    algorithm: "SHA1",
    digits: String(DIGITS),
    period: String(STEP_SECONDS),
  });
  return `otpauth://totp/${label}?${params.toString()}`;
}

// --- secret at rest -------------------------------------------------------
// AES-256-GCM so a database dump alone doesn't hand over everyone's TOTP seeds.

export function encryptSecret(plain: string): string {
  const iv = crypto.randomBytes(12);
  const cipher = crypto.createCipheriv("aes-256-gcm", derivedKey("2fa-secret"), iv);
  const enc = Buffer.concat([cipher.update(plain, "utf8"), cipher.final()]);
  const tag = cipher.getAuthTag();
  return [iv, tag, enc].map((b) => b.toString("base64")).join(".");
}

export function decryptSecret(stored: string): string {
  const [iv, tag, enc] = stored.split(".").map((p) => Buffer.from(p, "base64"));
  const decipher = crypto.createDecipheriv("aes-256-gcm", derivedKey("2fa-secret"), iv);
  decipher.setAuthTag(tag);
  return Buffer.concat([decipher.update(enc), decipher.final()]).toString("utf8");
}

// --- recovery codes -------------------------------------------------------

const RECOVERY_CODE_COUNT = 10;

export function generateRecoveryCodes(): string[] {
  const codes: string[] = [];
  for (let i = 0; i < RECOVERY_CODE_COUNT; i++) {
    const raw = base32Encode(crypto.randomBytes(7)).slice(0, 10).toLowerCase();
    codes.push(`${raw.slice(0, 5)}-${raw.slice(5)}`);
  }
  return codes;
}

export function normalizeRecoveryCode(input: string): string {
  return input.toLowerCase().replace(/[^a-z2-7]/g, "");
}

export function hashRecoveryCode(code: string): string {
  return crypto
    .createHmac("sha256", derivedKey("2fa-recovery"))
    .update(normalizeRecoveryCode(code))
    .digest("hex");
}

// Single use: returns the remaining hashes if the code was valid, else null.
export function consumeRecoveryCode(hashes: string[], code: string): string[] | null {
  const candidate = hashRecoveryCode(code);
  const idx = hashes.findIndex((h) => h === candidate);
  if (idx === -1) return null;
  return hashes.filter((_, i) => i !== idx);
}

// --- login challenge ------------------------------------------------------
// After a correct password for a 2FA user we hand back this short-lived token
// instead of a session cookie; it only proves "password step passed" and is
// exchanged for a real session by POST /api/auth/login/2fa.

export function signChallenge(userId: string): string {
  return jwt.sign({ sub: userId, purpose: "2fa-login" }, derivedKey("2fa-challenge"), {
    expiresIn: "5m",
  });
}

export function verifyChallenge(token: string): string | null {
  try {
    const payload = jwt.verify(token, derivedKey("2fa-challenge")) as {
      sub?: string;
      purpose?: string;
    };
    return payload.purpose === "2fa-login" && payload.sub ? payload.sub : null;
  } catch {
    return null;
  }
}
