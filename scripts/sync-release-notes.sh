#!/usr/bin/env bash
# Copies the current version's release notes (docs/releases/<VERSION>.md)
# into the frontend, where the "What's new" pop-up shows them after an
# update. Run it after filling in the notes; a backend test fails until the
# copy matches.
set -euo pipefail
cd "$(dirname "$0")/.."
version="$(tr -d '[:space:]' < VERSION)"
cp "docs/releases/$version.md" frontend/src/whatsNew.md
echo "Copied docs/releases/$version.md to frontend/src/whatsNew.md"
