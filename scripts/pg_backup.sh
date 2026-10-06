#!/bin/sh
set -e

# Ensure environment variables are loaded if running under minimal crond subshell
if [ -z "$DATABASE_URL" ]; then
  if [ -f /container.env ]; then
    . /container.env
  elif [ -f /proc/1/environ ]; then
    eval $(tr '\0' '\n' < /proc/1/environ | grep -E '^(DATABASE_URL|GDRIVE_|LOCAL_RETENTION|REMOTE_RETENTION|BACKUP_DIR|PG|PATH)=' | sed -e 's/^/export /')
  fi
fi

# Configuration
BACKUP_DIR="${BACKUP_DIR:-/backups}"
LOCAL_RETENTION_DAYS="${LOCAL_RETENTION_DAYS:-7}"
SCRIPT_DIR="$(dirname "$0")"

mkdir -p "$BACKUP_DIR"

echo "[$(date -u +"%Y-%m-%dT%H:%M:%SZ")] === Starting AL-SADEN PostgreSQL Backup ==="

# 1. Verify DATABASE_URL
if [ -z "$DATABASE_URL" ]; then
  echo "[ERROR] DATABASE_URL environment variable is not set."
  exit 1
fi

# 2. Extract libpq connection parameters from DATABASE_URL
eval "$(python3 -c "
import os, urllib.parse
u = urllib.parse.urlparse(os.environ.get('DATABASE_URL', ''))
print(f'export PGHOST=\"{u.hostname or \"localhost\"}\"')
print(f'export PGPORT=\"{u.port or 5432}\"')
if u.username: print(f'export PGUSER=\"{u.username}\"')
if u.password: print(f'export PGPASSWORD=\"{u.password}\"')
if u.path: print(f'export PGDATABASE=\"{u.path.lstrip(\"/\")}\"')
")"

# 3. Check Database Reachability
echo "[INFO] Testing PostgreSQL connection ($PGHOST:$PGPORT)..."
if pg_isready -h "$PGHOST" -p "$PGPORT" -U "$PGUSER" >/dev/null 2>&1; then
  echo "[OK] PostgreSQL server is reachable."
else
  echo "[ERROR] PostgreSQL server is not reachable at $PGHOST:$PGPORT."
  exit 1
fi

# 4. Generate UTC Timestamp and Filename
TIMESTAMP=$(date -u +"%Y-%m-%d_%H%M%SZ")
BACKUP_FILE="${BACKUP_DIR}/math_platform_${TIMESTAMP}.dump"
TEMP_FILE="${BACKUP_FILE}.tmp"

# 5. Perform pg_dump in custom format (-Fc)
echo "[INFO] Executing pg_dump (custom compressed format)..."
if pg_dump --format=c --no-owner --no-privileges --file="$TEMP_FILE"; then
  mv "$TEMP_FILE" "$BACKUP_FILE"
  BACKUP_SIZE=$(stat -c%s "$BACKUP_FILE" 2>/dev/null || stat -f%z "$BACKUP_FILE")
  echo "[OK] Database dump completed successfully."
  echo "[INFO] Local backup path: $BACKUP_FILE (Size: $BACKUP_SIZE bytes)"
else
  echo "[ERROR] pg_dump failed."
  rm -f "$TEMP_FILE"
  exit 1
fi

# 6. Verify Backup Integrity Locally
if [ ! -s "$BACKUP_FILE" ]; then
  echo "[ERROR] Backup file is empty or missing: $BACKUP_FILE"
  rm -f "$BACKUP_FILE"
  exit 1
fi

echo "[INFO] Verifying local backup archive header and catalog via pg_restore..."
if pg_restore --list "$BACKUP_FILE" >/dev/null 2>&1; then
  TOC_COUNT=$(pg_restore --list "$BACKUP_FILE" | wc -l)
  echo "[OK] Local backup integrity verified (Catalog entries: $TOC_COUNT)."
else
  echo "[ERROR] pg_restore verification failed; backup archive appears corrupt."
  exit 1
fi

# 7. Upload to Google Drive & Remote Verification
echo "[INFO] Handing off to Google Drive backup engine..."
GDRIVE_SCRIPT="${SCRIPT_DIR}/gdrive_backup.py"
if [ ! -f "$GDRIVE_SCRIPT" ]; then
  GDRIVE_SCRIPT="/scripts/gdrive_backup.py"
fi

if [ -f "$GDRIVE_SCRIPT" ]; then
  if python3 "$GDRIVE_SCRIPT" "$BACKUP_FILE"; then
    echo "[OK] Google Drive off-site backup workflow succeeded."
  else
    echo "[WARNING] Google Drive upload or verification failed. Local backup will be preserved at $BACKUP_FILE."
  fi
else
  echo "[WARNING] Google Drive backup script ($GDRIVE_SCRIPT) not found. Local backup preserved."
fi

# 8. Apply Local Retention Policy
echo "[INFO] Applying local retention policy (keeping latest ${LOCAL_RETENTION_DAYS} daily backups)..."
TOTAL_LOCAL=$(find "$BACKUP_DIR" -maxdepth 1 -name "math_platform_*.dump" 2>/dev/null | wc -l)
if [ "$TOTAL_LOCAL" -gt "$LOCAL_RETENTION_DAYS" ]; then
  find "$BACKUP_DIR" -maxdepth 1 -name "math_platform_*.dump" -type f | sort | head -n -"${LOCAL_RETENTION_DAYS}" | while read -r old_file; do
    if [ -n "$old_file" ] && [ "$old_file" != "$BACKUP_FILE" ]; then
      echo "[INFO] Pruning old local backup: $old_file"
      rm -f "$old_file"
    fi
  done
fi

LOCAL_COUNT=$(find "$BACKUP_DIR" -maxdepth 1 -name "math_platform_*.dump" 2>/dev/null | wc -l)
echo "[INFO] Current local backups count: $LOCAL_COUNT"

echo "[$(date -u +"%Y-%m-%dT%H:%M:%SZ")] === Backup process finished ==="
