# AL-SADEN — Cloudflare Deployment & Edge Configuration Guide

This document outlines the recommended Cloudflare architecture, DNS records, SSL/TLS encryption modes, caching rules, and security controls for AL-SADEN.

---

## 1. Cloudflare Proxy Architecture

```
User Browser
    │
    ▼ (HTTPS / TLS 1.3)
Cloudflare Edge Network (Proxy: ON 🟧)
  ├─ DDoS Mitigation & Web Application Firewall (WAF)
  ├─ Edge Caching for Static Assets (.js, .css, .png, .woff2)
  ├─ WebSocket Proxying (wss:// /socket.io)
  └─ Header Injection: CF-Connecting-IP
    │
    ▼ (HTTPS / TLS 1.3 via Cloudflare Origin CA)
VPS Origin (Nginx Gateway on Port 443)
    │
    ▼
Docker Platform Network (Microservices)
```

---

## 2. Recommended DNS Configuration

| Type | Name | Content / Target | Proxy Status | Purpose |
| :--- | :--- | :--- | :---: | :--- |
| **A** | `@` (root) | `[VPS_PUBLIC_IPV4]` | **Proxied (🟧)** | Primary web application (SPA & APIs) |
| **CNAME** | `www` | `@` (or `your-domain.com`) | **Proxied (🟧)** | Canonical redirect to root domain |
| **A / CNAME** | `api` (Optional) | `[VPS_PUBLIC_IPV4]` | **Proxied (🟧)** | Dedicated API subdomain (if separate hostname desired) |
| **CNAME** | `videos` | `[CLOUDFLARE_R2_PUBLIC_BUCKET]` | **Proxied (🟧)** | Custom domain for R2 HLS video CDN streaming |

---

## 3. SSL/TLS Settings

* **Encryption Mode:** **Full (Strict)** (Recommended)
  * Generate a free **Cloudflare Origin Certificate** in the Cloudflare Dashboard (*SSL/TLS > Origin Server > Create Certificate*).
  * Place the certificate and private key in the VPS at `/etc/nginx/ssl/` (e.g. `origin.crt` and `origin.key`).
  * Nginx terminates TLS with the Origin CA certificate, guaranteeing end-to-end encryption between Cloudflare edge and VPS.
* **Minimum TLS Version:** **TLS 1.2** (TLS 1.3 enabled).
* **Always Use HTTPS:** **Enabled** (Cloudflare automatically redirects HTTP to HTTPS at the edge).
* **Automatic HTTPS Rewrites:** **Enabled**.

---

## 4. WebSocket & Socket.IO Support

* **WebSockets:** **Enabled** by default in Cloudflare (*Network > WebSockets*).
* **Socket.IO Compatibility:** Cloudflare fully supports HTTP long-polling upgrade to WebSockets (`/socket.io/`).
* **Timeout Settings:** Cloudflare allows up to 100s HTTP timeout on Free plans, while WebSocket connections remain persistent as long as heartbeats/pings occur (Socket.IO default heartbeat interval is 25s).

---

## 5. Caching Rules & Page Rules

> ⚠️ **CRITICAL:** Backend APIs, user authentication, and exams must **NEVER** be cached by Cloudflare.

Configure Cache Rules in Cloudflare Dashboard (*Caching > Cache Rules*):

### Rule 1: Bypass Cache for API & Auth & Socket.IO
* **Expression:**
  ```text
  (http.request.uri.path starts_with "/api/") or
  (http.request.uri.path starts_with "/socket.io/") or
  (http.request.uri.path starts_with "/admin")
  ```
* **Action:** **Bypass Cache** (Cache status: Bypass)

### Rule 2: Cache Static Assets
* **Expression:**
  ```text
  (http.request.uri.path starts_with "/assets/") or
  (http.request.uri.path.extension in {"js" "css" "png" "jpg" "jpeg" "webp" "svg" "woff" "woff2" "ttf"})
  ```
* **Action:** **Eligible for Cache** (Edge Cache TTL: 7 days, Browser Cache TTL: 4 hours)

---

## 6. Real Client IP Header Handling

Cloudflare replaces the incoming TCP remote address with Cloudflare edge IPs.
To preserve real user IP addresses for rate limiting, anti-cheat detection, and audit logging:

1. Cloudflare automatically injects `CF-Connecting-IP`.
2. Nginx configuration in `nginx/nginx.conf` sets:
   ```nginx
   proxy_set_header X-Real-IP $remote_addr;
   proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
   proxy_set_header CF-Connecting-IP $http_cf_connecting_ip;
   ```
3. Express microservices use `configureTrustProxy(app)` with `TRUST_PROXY=1` to accurately extract `req.ip` and `req.ips` from `CF-Connecting-IP` / `X-Forwarded-For`.

---

## 7. Security & WAF Recommendations

1. **Bot Fight Mode:** Enabled.
2. **Security Level:** Medium.
3. **Browser Integrity Check:** Enabled.
4. **Rate Limiting Rule (Edge Layer):**
   * Limit `POST /api/auth/login` to 10 requests per minute per IP to mitigate credential stuffing before reaching the VPS.
