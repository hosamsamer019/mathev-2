# AL-SADEN — Production Deployment Architecture

**Repository:** `hosamsamer019/mathev-2`  
**Platform:** AL-SADEN / Math Teacher Smart Platform  
**Target Environment:** Linux VPS (Ubuntu 22.04 / 24.04 LTS), Docker Engine & Docker Compose, Nginx Gateway, Cloudflare  
**Database:** PostgreSQL (Supabase Managed or Dedicated PostgreSQL on VPS)  
**Date:** October 4, 2026  

---

## 1. High-Level Architecture Diagram

```
                              ┌───────────────────────────┐
                              │     Internet / Users      │
                              └─────────────┬─────────────┘
                                            │
                                            ▼
                              ┌───────────────────────────┐
                              │  Cloudflare Proxy (CDN)   │
                              │  SSL: Full (Strict) / HLS │
                              │  WAF & DDoS Mitigation    │
                              └─────────────┬─────────────┘
                                            │ :443 (HTTPS) / :80 (HTTP Redirect)
                                            ▼
                              ┌───────────────────────────┐
                              │    VPS Nginx Gateway      │
                              │    (Reverse Proxy Ingress)│
                              └─────────────┬─────────────┘
                                            │
                  ┌─────────────────────────┴─────────────────────────┐
                  │             alsaden-platform-network              │
                  │             (Internal Docker Bridge)              │
                  └──────┬──────────────────────┬───────────────┬─────┘
                         │                      │               │
                         ▼                      ▼               ▼
                  ┌──────────────┐      ┌──────────────┐ ┌──────────────┐
                  │   Frontend   │      │ Microservice │ │  Socket.IO   │
                  │  (SPA / Nginx│      │  Cluster     │ │(Course Svc)  │
                  │   Port 80)   │      │(Ports 4001-5)│ │ (Port 4004)  │
                  └──────────────┘      └──────┬───────┘ └──────┬───────┘
                                               │                │
            ┌──────────────────┬───────────────┼────────────────┼──────────────────┐
            ▼                  ▼               ▼                ▼                  ▼
     ┌──────────────┐   ┌──────────────┐┌──────────────┐ ┌──────────────┐   ┌──────────────┐
     │ auth-service │   │ user-service ││  ai-service  │ │course-service│   │analytics-svc │
     │  (Port 4001) │   │  (Port 4002) ││  (Port 4003) │ │  (Port 4004) │   │  (Port 4005) │
     └──────┬───────┘   └──────┬───────┘└──────┬───────┘ └──────┬───────┘   └──────┬───────┘
            │                  │               │                │                  │
            │                  └───────┬───────┴────────┬───────┴──────────────────┘
            │                          │                │
            ▼                          ▼                ▼
     ┌──────────────┐           ┌──────────────┐ ┌────────────────────────────────┐
     │    Redis     │           │  PostgreSQL  │ │       Cloudflare R2 / S3       │
     │(Session/JTI/ │◄──────────┤ (Supabase or │ │(HLS Video Streaming, Homework, │
     │ Rate Limit)  │           │ VPS Database)│ │ Exam Uploads & DB Backups)     │
     └──────────────┘           └──────────────┘ └────────────────────────────────┘
```

---

## 2. Component Inventory & Port Specifications

| Service Name | Container Name | Internal Port | Host Port Binding | Protocol | Ingress Route / Role |
| :--- | :--- | :---: | :---: | :---: | :--- |
| **Nginx Gateway** | `alsaden-nginx` | `80`, `443` | **`80:80`, `443:443`** | HTTP/HTTPS | Ingress reverse proxy, SSL termination, rate limiting, routing |
| **Frontend** | `alsaden-frontend` | `80` | *None (Internal)* | HTTP | Serves React 18 / Vite SPA production assets |
| **Auth Service** | `alsaden-auth-service` | `4001` | *None (Internal)* | HTTP | `/api/auth` — Auth, JWT issuance, JTI Redis blacklist, role validation |
| **User Service** | `alsaden-user-service` | `4002` | *None (Internal)* | HTTP | `/api/users`, `/api/attendance`, `/api/notifications` |
| **AI Service** | `alsaden-ai-service` | `4003` | *None (Internal)* | HTTP | `/api/ai` — Math solver, question generator, validator, Gemini SDK |
| **Course Service** | `alsaden-course-service` | `4004` | *None (Internal)* | HTTP & WS | `/api/courses`, `/api/exams`, `/api/homework`, `/api/questions`, `/api/upload`, `/api/payments`, `/socket.io` |
| **Analytics Service** | `alsaden-analytics-service` | `4005` | *None (Internal)* | HTTP | `/api/analytics` — Student progress metrics & predictive risk engine |
| **Video Worker** | `alsaden-video-worker` | *N/A (Worker)* | *None (Internal)* | BullMQ / Redis | Background video transcoding (FFmpeg) to HLS & R2 upload |
| **Redis Cache** | `alsaden-redis` | `6379` | *None (Internal)* | Redis Protocol | Session blacklist, password reset TTL, rate limits, BullMQ queues |
| **Database** | Supabase / Postgres | `5432` / `6543` | *External TLS / Isolated* | PostgreSQL | Primary relational data store with Row-Level Security (RLS) |

> **Critical Network Security Rule:** Only `nginx` publishes ports `80` and `443` to the host. All backend microservices, Redis, and internal communication communicate exclusively over the private Docker bridge network (`alsaden-platform-network`).

---

## 3. Storage & Persistence Mapping

1. **`alsaden-redis-data` (`/data`)**:
   - Persists Redis append-only file (AOF) for session state and queue persistence across container restarts.
2. **`alsaden-course-uploads` (`/app/uploads`)**:
   - Persists local teacher uploads, question imagery, and temporary files in `course-service`.
3. **`./nginx/ssl` (`/etc/nginx/ssl:ro`)**:
   - Read-only volume for SSL/TLS origin certificates and private keys.
4. **Cloudflare R2 Object Storage (External)**:
   - Dedicated cloud storage for HLS video segments (`master.m3u8`, `*.ts`), exam assets, and automated daily database dumps.

---

## 4. Health Check Architecture

All services implement non-leaking, lightweight health endpoints:
- **Nginx Ingress**: `GET /health` -> `200 OK` (plain text)
- **Frontend SPA**: `GET /health` -> `200 healthy` (nginx non-root)
- **Auth Service**: `GET /health` -> `200 OK` (JSON timestamp, no secrets)
- **User Service**: `GET /health` -> `200 OK`
- **AI Service**: `GET /health` -> `200 OK`
- **Course Service**: `GET /health` -> `200 OK`
- **Analytics Service**: `GET /health` -> `200 OK`
- **Redis**: `redis-cli ping` -> `PONG`
