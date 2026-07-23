#!/usr/bin/env bash
# Auto-update the self-hosted deployment: pull the fork and rebuild the
# container only when new commits actually arrived (e.g. after the daily
# data-sync workflow commits fresh characters / lore).
#
# Install on the VPS (adjust the path), then add a cron entry. The data-sync
# workflow only runs every 3 days, so a twice-daily pull is plenty:
#   chmod +x deploy/vps-auto-update.sh
#   crontab -e
#   # 06:30 and 18:30 UTC, log to a file:
#   30 6,18 * * * /home/user/Stellaron-Metrics/deploy/vps-auto-update.sh >> /var/log/stellaron-update.log 2>&1
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
