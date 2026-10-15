import { beforeAll, describe, expect, it } from "vitest";

beforeAll(() => {
  process.env.JWT_SECRET = "test-secret-for-two-factor-unit-tests";
});

async function tf() {
  return import("./twoFactor");
}

describe("TOTP", () => {
  // RFC 6238 appendix B (SHA-1, secret "12345678901234567890"); the RFC lists
  // 8-digit codes, and the 6-digit code is the same truncation mod 10^6.
  const rfcSecret = Buffer.from("12345678901234567890");
  it("matches the RFC 6238 test vectors", async () => {
    const { hotp, currentStep } = await tf();
    const cases: [number, string][] = [
      [59, "94287082"],
      [1111111109, "07081804"],
      [1111111111, "14050471"],
      [1234567890, "89005924"],
      [2000000000, "69279037"],
    ];
    for (const [seconds, expected8] of cases) {
      const step = currentStep(seconds * 1000);
      expect(hotp(rfcSecret, step, 8)).toBe(expected8);
      expect(hotp(rfcSecret, step, 6)).toBe(expected8.slice(-6));
    }
  });

  it("round-trips base32", async () => {
    const { base32Encode, base32Decode } = await tf();
    const buf = Buffer.from("hello world, this is a secret!");
    expect(base32Decode(base32Encode(buf)).equals(buf)).toBe(true);
    expect(base32Encode(Buffer.from("12345678901234567890"))).toBe("GEZDGNBVGY3TQOJQGEZDGNBVGY3TQOJQ");
  });

  it("accepts the current code once, tolerates one step of drift, rejects the rest", async () => {
    const { verifyTotp, hotp, base32Decode, base32Encode, currentStep } = await tf();
    const secret = base32Encode(Buffer.from("12345678901234567890"));
    const now = 1_700_000_000_000;
    const step = currentStep(now);
    const code = hotp(base32Decode(secret), step);
    expect(verifyTotp(secret, code, null, now)).toBe(step);
    // replay of the same step is refused once it has been used
    expect(verifyTotp(secret, code, step, now)).toBeNull();
    // previous / next step are accepted (clock drift)
    expect(verifyTotp(secret, hotp(base32Decode(secret), step - 1), null, now)).toBe(step - 1);
    expect(verifyTotp(secret, hotp(base32Decode(secret), step + 1), null, now)).toBe(step + 1);
    // two steps out is not
    expect(verifyTotp(secret, hotp(base32Decode(secret), step + 2), null, now)).toBeNull();
    expect(verifyTotp(secret, "12345", null, now)).toBeNull();
    expect(verifyTotp(secret, "abcdef", null, now)).toBeNull();
    // spaces in a typed code are fine
    expect(verifyTotp(secret, `${code.slice(0, 3)} ${code.slice(3)}`, null, now)).toBe(step);
  });

  it("builds a standard otpauth URL", async () => {
    const { otpauthUrl } = await tf();
    const url = otpauthUrl("a@b.com", "ABCDEFGH");
    expect(url.startsWith("otpauth://totp/")).toBe(true);
    expect(url).toContain("secret=ABCDEFGH");
    expect(url).toContain("issuer=APD+Project+Management+Dashboard");
  });
});

describe("secrets, recovery codes and challenge tokens", () => {
  it("encrypts secrets reversibly and non-deterministically", async () => {
    const { encryptSecret, decryptSecret } = await tf();
    const a = encryptSecret("JBSWY3DPEHPK3PXP");
    const b = encryptSecret("JBSWY3DPEHPK3PXP");
    expect(a).not.toBe(b);
    expect(a).not.toContain("JBSWY3DPEHPK3PXP");
    expect(decryptSecret(a)).toBe("JBSWY3DPEHPK3PXP");
  });

  it("consumes each recovery code exactly once, ignoring case and dashes", async () => {
    const { generateRecoveryCodes, hashRecoveryCode, consumeRecoveryCode } = await tf();
    const codes = generateRecoveryCodes();
    expect(codes).toHaveLength(10);
    expect(new Set(codes).size).toBe(10);
    expect(codes[0]).toMatch(/^[a-z2-7]{5}-[a-z2-7]{5}$/);
    const hashes = codes.map(hashRecoveryCode);
    const after = consumeRecoveryCode(hashes, codes[3].toUpperCase().replace("-", " "));
    expect(after).toHaveLength(9);
    expect(consumeRecoveryCode(after!, codes[3])).toBeNull();
    expect(consumeRecoveryCode(hashes, "zzzzz-zzzzz")).toBeNull();
  });

  it("only accepts a challenge token it signed, for the right purpose", async () => {
    const { signChallenge, verifyChallenge } = await tf();
    const jwt = (await import("jsonwebtoken")).default;
    const token = signChallenge("user-1");
    expect(verifyChallenge(token)).toBe("user-1");
    expect(verifyChallenge(token + "x")).toBeNull();
    // a session token signed with the raw app secret is not a challenge
    expect(verifyChallenge(jwt.sign({ sub: "user-1" }, process.env.JWT_SECRET!))).toBeNull();
  });
});
