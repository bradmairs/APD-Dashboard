// package.json holds semver (1.2.1) but releases are named X.YY (1.21) — see
// CHANGELOG.md. A zero patch is just X.Y (1.1.0 -> 1.1); otherwise the patch
// digit is appended to the minor (1.0.1 -> 1.01, 1.2.1 -> 1.21).
export function formatVersion(semver: string): string {
  const match = /^(\d+)\.(\d+)\.(\d+)/.exec(semver);
  if (!match) return semver;
  const [, major, minor, patch] = match;
  return patch === "0" ? `${major}.${minor}` : `${major}.${minor}${patch}`;
}

export const APP_VERSION =
  typeof __APP_VERSION__ === "string" ? formatVersion(__APP_VERSION__) : "dev";
