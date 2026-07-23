#!/usr/bin/env bash
# Auto-update the self-hosted deployment: pull the fork and rebuild the
# container only when new commits actually arrived (e.g. after the daily
# data-sync workflow commits fresh characters / lore).
#
# Install on the VPS, then add a cron entry. The data-sync workflow only runs
# every 3 days, so a twice-daily pull is plenty. Use absolute paths (cron does
# not expand ~) and a log the running user can actually write to (the home dir,
# not /var/log, unless cron runs as root). This one-liner fills both in and
# replaces any stale entry:
#   chmod +x deploy/vps-auto-update.sh
#   REPO="$(cd ~/Stellaron-Metrics && pwd)"; ( crontab -l 2>/dev/null | grep -v 'vps-auto-update.sh'; \
#     echo "30 6,18 * * * $REPO/deploy/vps-auto-update.sh >> $HOME/stellaron-update.log 2>&1" ) | crontab -
set -euo pipefail

# Repo root = the directory that contains this script's parent.
cd "$(dirname "$0")/.."

BRANCH="${BRANCH:-main}"

git fetch origin "$BRANCH" --quiet
LOCAL="$(git rev-parse HEAD)"
REMOTE="$(git rev-parse "origin/$BRANCH")"

if [ "$LOCAL" = "$REMOTE" ]; then
  echo "$(date -u +%FT%TZ) up to date ($LOCAL)"
  exit 0
fi

echo "$(date -u +%FT%TZ) updating $LOCAL -> $REMOTE"
git reset --hard "origin/$BRANCH"

# Rebuild + restart (build runs inside Docker; no Node needed on the host).
docker compose up -d --build

# Drop dangling images from previous builds to reclaim disk.
docker image prune -f >/dev/null 2>&1 || true
echo "$(date -u +%FT%TZ) deployed $REMOTE"
