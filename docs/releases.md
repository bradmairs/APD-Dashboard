# Releases and versions

The dashboard has one version, in [`/VERSION`](../VERSION): **Section.Feature.Fix**, e.g. `2.6.1`.
Both `package.json` files follow it, the left menu shows it, and a backend test (`backend/src/version.test.ts`)
checks they all match and that the version has release notes.

## Every change bumps it

Each change merged to main moves the version up by one of:

- **Fix** (`scripts/bump-version.sh fix`): a fix or a minor change, e.g. 2.6.1 → 2.6.2.
- **Feature** (`scripts/bump-version.sh feature`): a new feature or a bigger upgrade, e.g. 2.6.1 → 2.7.0.
- **Section** (`scripts/bump-version.sh section`): a significant new section, like Monthly Reporting, e.g. 2.6.1 → 3.0.0.

Each part counts on its own and never rolls over into the next (2.9.0 plus a feature is 2.10.0), so a change in the
whole number always means a new section. The script writes every version spot and starts
`docs/releases/<version>.md`: fill in what changed, why, and how to update. Bump in the same pull request as the change.

### What's new, for users

The app shows a "What's new" pop-up once after an update (and from the avatar menu). It's written for the people
using the dashboard, separately from the release notes, in
[`frontend/src/whatsNew/whatsNew.md`](../frontend/src/whatsNew/whatsNew.md):

- What's new and how to use it, in plain words, with a screenshot where it helps. Pictures (`.webp`, at most 1200 px
  wide) sit beside it and are shown with `![What it shows](file.webp)`.
- No server or update steps, technical detail, or things that were already there; those belong in the release notes.
- It starts with `<!-- version: X.Y.Z -->`. The pop-up shows once per version written there, so set it to the new
  version when you rewrite the notes, and leave it alone for changes users won't notice.

### The renumbering (2026-11-25)

Until 2026-11-25 versions were decimals (X.YY). They were renumbered to match SirisOS: 1.6 became 2.6.0.
[`renumbering.md`](renumbering.md) lists every old number against its new one.

## Shipping

Changes go to main by pull request and are merged as soon as CI is green, with no separate sign-off. When a merge
changes `VERSION`, the [Release workflow](../.github/workflows/release.yml) tags it `v<version>` and publishes a GitHub
release from its notes.

## Updating the server

On the server, in the app folder: `git pull`, then `docker compose up -d --build`. The version in the left menu
shows what's running.
