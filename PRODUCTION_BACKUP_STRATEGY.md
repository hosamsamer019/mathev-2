# AL-SADEN — Production Backup & Disaster Recovery Strategy

**Scope:** Automated Database Dumps, Object Storage Protection, Session State Recovery, and VPS Disaster Recovery  
**Target Platform:** AL-SADEN / Math Teacher Smart Platform  
**Date:** October 4, 2026  

---

## 1. Backup Architecture & Target Objectives

| Metric | Target Objective | Implementation |
| :--- | :--- | :--- |
| **Recovery Point Objective (RPO)** | **< 24 Hours** (Database) / **< 1 Hour** (PITR) | Daily automated offsite dumps + Supabase continuous WAL archiving |
| **Recovery Time Objective (RTO)** | **< 30 Minutes** (Database Restore) | Automated `pg_restore` script + instant container restart |
| **Offsite Storage Location** | Cloudflare R2 (`s3://alsaden-videos-prod/backups/db/`) | Multi-region resilient cloud object store |
| **Retention Policy** | 30 Daily Backups, 12 Monthly Snapshots | Automated S3 lifecycle expiration |

---

## 2. Automated PostgreSQL Database Backups

### Daily Scheduled Automated Dump
The `alsaden-pg-backup` container runs on a daily cron schedule (`0 3 * * *` — 3:00 AM UTC):
1. Connects securely to `DATABASE_URL` via PostgreSQL `pg_dump`.
2. Generates compressed archive: `backup_YYYY-MM-DDTHHMMSSZ.sql.gz`.
3. Encrypts and transmits offsite to Cloudflare R2 bucket (`backups/db/`).
4. Purges local temporary dump from `/tmp` to prevent disk saturation.

### Supabase Managed Database Considerations
* If hosted on **Supabase Pro**:
  * Point-in-Time Recovery (PITR) enables restoring to any second within the retention window (up to 7 or 30 days).
  * The automated offsite R2 dump acts as an independent secondary safeguard against vendor lock-in or accidental project deletion.

---

## 3. Uploaded Assets & Object Storage Backups

1. **Video Streaming Files (HLS / MP4)**:
   * Stored in Cloudflare R2 bucket (`alsaden-videos-prod`).
   * Cloudflare R2 provides automatic 99.999999999% (11 9s) durability across redundant storage nodes.
2. **Local Course Uploads (`alsaden-course-uploads`)**:
   * Volume mounted at `/app/uploads` in `course-service`.
   * Backed up weekly via tarball archive to offsite storage:
     ```bash
     docker run --rm -v alsaden-course-uploads:/data -v /tmp:/backup alpine \
       tar -czf /backup/course_uploads_$(date +%Y%m%d).tar.gz -C /data .
     ```

---

## 4. Redis Cache & Session Recovery

* **Append-Only File (AOF)**: Redis is configured with `--appendonly yes` writing transaction logs to `alsaden-redis-data`.
* **Disaster Scenario**: If Redis data is lost:
  * Application gracefully starts with empty cache.
  * Stateless JWT authentication continues to operate seamlessly.
  * Active user sessions remain valid until token expiry; revoked tokens reset naturally.

---

## 5. Step-by-Step Database Restore Procedure

To restore a database dump from Cloudflare R2 into PostgreSQL:

```bash
# 1. Download the desired backup archive from R2
aws s3 cp s3://alsaden-videos-prod/backups/db/backup_2026-10-04T030000Z.sql.gz ./restore.sql.gz \
  --endpoint-url https://[ACCOUNT_ID].r2.cloudflarestorage.com

# 2. Decompress archive
gunzip restore.sql.gz

# 3. Stop backend services to avoid concurrent writes during restore
docker compose -f docker-compose.production.yml stop auth-service user-service course-service ai-service analytics-service

# 4. Restore into PostgreSQL
psql "$DATABASE_URL" -f restore.sql

# 5. Run Prisma migration check to verify schema integrity
docker compose -f docker-compose.production.yml run --rm prisma-migrate

# 6. Restart all services
docker compose -f docker-compose.production.yml start
```

---

## 6. VPS Snapshot Strategy

* Take a full VPS provider snapshot (Linode/DigitalOcean/Hetzner/AWS):
  * **Frequency:** Before applying major OS upgrades or Docker engine updates.
  * **Retention:** Keep latest 2 snapshots.
