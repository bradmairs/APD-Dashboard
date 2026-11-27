# Working on APD-Dashboard

## Versions and shipping (Brad's standing instructions)

- **Bump the version in every pull request.** Versions are **Section.Feature.Fix** (e.g. 2.6.1), the same rule as SirisOS: `scripts/bump-version.sh fix` (+0.0.1) for a fix or minor change; `scripts/bump-version.sh feature` (+0.1.0) for a new feature or a bigger upgrade; `scripts/bump-version.sh section` (+1.0.0) only for a significant new section, like Monthly Reporting. Fill in the `docs/releases/<version>.md` it starts (the full notes, for the GitHub release). See [docs/releases.md](docs/releases.md).
- **The in-app "What's new" pop-up is for end users.** When a change is something users will notice, rewrite `frontend/src/whatsNew/whatsNew.md` for them: what's new and how to use it, in plain words, with screenshots (`.webp`, at most 1200 px wide, beside it in `frontend/src/whatsNew/`). Leave out server and update steps, technical detail and anything that was already there. Set its `<!-- version: X.Y.Z -->` line to the new version so it pops up once; leave it alone for changes users won't notice.
- **Merge to main automatically**: open the pull request, wait for CI to go green, then mark it ready and merge it without asking. Fix red CI first; never merge red.
- Merging a `VERSION` change tags `v<version>` and publishes the GitHub release by itself (`.github/workflows/release.yml`).

## Checks before pushing

- Backend: `cd backend && npx tsc --noEmit && npm test`
- Frontend: `cd frontend && npx tsc --noEmit && npm test && npm run build`

## Siris: record what you build (Brad's standing instruction)

Siris is Brad's second brain, the private repo `bradmairs/Siris-Second-Brain`, and his manual for rebuilding everything. When a session in this repo builds, changes, deploys or retires a feature, record it in Siris before finishing, without being asked:

- Follow `plugins/siris-brain/skills/learn/SKILL.md` in that repo. In a cloud session, attach it first (owner `bradmairs`, repo `Siris-Second-Brain`, push access). Always write through its engine (`tools/brain.py learn`), never by editing notes directly, then commit and push.
- Add to this app's note, **"GVW Dashboard"**, so it gets a dated update instead of a duplicate.
- Capture what changed and why, the version, how to deploy or update it, the settings that matter (names only), and lessons learned. Never write secrets.
- End your reply with one line, e.g. `🧠 Siris learned: [[GVW Dashboard]] (updated)`.
