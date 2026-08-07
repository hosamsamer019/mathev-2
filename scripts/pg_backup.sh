#!/bin/sh
set -e

echo "[$(date -u)] Starting PostgreSQL backup..."

if [ -z "$DATABASE_URL" ]; then
  echo "Error: DATABASE_URL is not set"
  exit 1
fi

TIMESTAMP=$(date -u +"%Y-%m-%dT%H%M%SZ")
BACKUP_FILE="backup_${TIMESTAMP}.sql.gz"
TEMP_DIR="/tmp/pg_backup"

mkdir -p "$TEMP_DIR"
cd "$TEMP_DIR"

# Dump and compress
echo "Dumping database..."
# Using pg_dump with the connection string directly
pg_dump "$DATABASE_URL" --no-owner --no-privileges | gzip > "$BACKUP_FILE"

echo "Database dumped successfully. File size: $(stat -c%s "$BACKUP_FILE") bytes"

if [ -n "$CLOUDFLARE_R2_ENDPOINT" ] && [ -n "$CLOUDFLARE_R2_BUCKET_NAME" ]; then
  echo "Uploading to Cloudflare R2..."
  
  # Configure AWS CLI for R2
  aws configure set aws_access_key_id "$CLOUDFLARE_R2_ACCESS_KEY_ID"
  aws configure set aws_secret_access_key "$CLOUDFLARE_R2_SECRET_ACCESS_KEY"
  aws configure set default.region auto
  
  # Upload
  aws s3 cp "$BACKUP_FILE" "s3://${CLOUDFLARE_R2_BUCKET_NAME}/backups/db/${BACKUP_FILE}" \
    --endpoint-url "$CLOUDFLARE_R2_ENDPOINT"
    
  echo "Upload complete."
else
  echo "Warning: R2 configuration missing, backup not uploaded."
fi

# Cleanup local backup file to prevent disk exhaustion
rm "$BACKUP_FILE"
echo "[$(date -u)] Backup process finished successfully."
