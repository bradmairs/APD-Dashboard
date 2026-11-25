// The app's version, Section.Feature.Fix (e.g. 2.6.1), from package.json,
// which scripts/bump-version.sh keeps in step with /VERSION. See
// docs/releases.md. Shown as is: every part counts on its own.
export function formatVersion(semver: string): string {
  const match = /^(\d+)\.(\d+)\.(\d+)/.exec(semver);
  return match ? `${match[1]}.${match[2]}.${match[3]}` : semver;
}

export const APP_VERSION =
  typeof __APP_VERSION__ === "string" ? formatVersion(__APP_VERSION__) : "dev";
