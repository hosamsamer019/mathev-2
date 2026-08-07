# AL-SADEN Load Testing Suite (k6)

This directory contains the enterprise load testing scripts for the AL-SADEN platform using [k6](https://k6.io/).

## Prerequisites
- Install [k6](https://k6.io/docs/get-started/installation/)
- The target environment (Staging/Production) must be running.

## Running Tests

Tests are controlled via environment variables:
- `BASE_URL` (Required): The base URL of the target environment.
- `SCALE` (Optional): The scale tier. Available options: `validation` (50 users), `tier_100`, `tier_1000`, `tier_2500`, `tier_5000`, `tier_10000`. Default is `validation`.

### Local Validation (50 users)
*Use this to verify scripts work against your local machine without crashing it.*
```bash
k6 run -e BASE_URL=http://localhost -e SCALE=validation tests/load/mixed-load.js
```

### Staging / Production Execution (e.g. 5,000 users)
*Ensure your staging environment is provisioned with identical hardware to production before running this.*
```bash
k6 run -e BASE_URL=https://staging-api.alsaden.com -e SCALE=tier_5000 tests/load/mixed-load.js
```

## Important Notes & Rules
- **Do not run `tier_5000` or above on a local developer machine.** It will cause OS-level socket exhaustion.
- **Video Bandwidth:** These tests do NOT stream large video files. They simulate metadata and manifest requests. Actual video payload delivery is offloaded to Cloudflare R2 and CDN.
- **Monitoring:** Ensure Prometheus and Grafana are actively monitoring the target cluster during execution to identify CPU/RAM/Database connection bottlenecks.
- **Database Seed:** The tests automatically generate random users (`testuser_XXXXX@example.com`), so no specific seeded accounts are required, but the database will accumulate test data. Ensure you run this on a Staging database that can be wiped or cleaned.
- **Stopping a Test:** Press `Ctrl+C` in your terminal to immediately abort the k6 run.
