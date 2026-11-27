#!/usr/bin/env bash
# Bump the dashboard's version (docs/releases.md). Versions are Section.Feature.Fix, e.g. 2.6.1:
#   scripts/bump-version.sh fix       # a fix or minor change                 2.6.1 -> 2.6.2
#   scripts/bump-version.sh feature   # a new feature or bigger upgrade       2.6.1 -> 2.7.0
#   scripts/bump-version.sh section   # a significant new section (like Monthly Reporting)  2.6.1 -> 3.0.0
# (patch, minor and major also work, as fix, feature and section.) Each part counts on its own and never
# rolls over into the next, so a whole-number change always means a new section.
# Writes VERSION, both package.json files (and their lockfiles), the README's version line, and starts
# docs/releases/<version>.md. Merging the bump to main tags and releases it.
set -euo pipefail
cd "$(dirname "$0")/.."

kind="${1:-}"
current="$(tr -d '[:space:]' < VERSION)"
next="$(python3 - "$current" "$kind" <<'PY'
import sys
current, kind = sys.argv[1], {"patch": "fix", "minor": "feature", "major": "section"}.get(sys.argv[2], sys.argv[2])
parts = current.split(".")
if len(parts) != 3 or not all(p.isdigit() for p in parts):
    sys.exit(f"VERSION should be Section.Feature.Fix, like 2.6.1, not {current}")
s, f, x = (int(p) for p in parts)
if kind == "fix":
    x += 1
elif kind == "feature":
    f, x = f + 1, 0
elif kind == "section":
    s, f, x = s + 1, 0, 0
else:
    sys.exit("usage: scripts/bump-version.sh fix|feature|section")
print(f"{s}.{f}.{x}")
PY
)"

echo "$next" > VERSION
for app in backend frontend; do
  (cd "$app" && npm version "$next" --no-git-tag-version --allow-same-version >/dev/null)
done
sed -i -E "s#^\*\*Version [0-9.]+\*\* \(\[release notes\]\(docs/releases/[0-9.]+\.md\)#**Version $next** ([release notes](docs/releases/$next.md)#" README.md
notes="docs/releases/$next.md"
[ -f "$notes" ] || printf '# APD Project Management Dashboard %s\n\n- \n' "$next" > "$notes"
echo "Dashboard $current -> $next (fill in $notes; if users will notice the change, rewrite frontend/src/whatsNew/whatsNew.md for them too)"
