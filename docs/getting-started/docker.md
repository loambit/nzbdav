# Docker

NzbDAV ships as a single multi-arch image: `ghcr.io/nzbdav/nzbdav`. The container runs the frontend (public port `3000`) and backend (internal `8080`).

!!! tip "IPv6-only hosts"

    `ghcr.io` is not reachable over IPv6. Use the Docker Hub mirror `nzbdav/nzbdav` instead.

## Persistent Compose

```yaml
services:
  nzbdav:
    image: ghcr.io/nzbdav/nzbdav:latest
    container_name: nzbdav
    restart: unless-stopped
    healthcheck:
      test: ["CMD-SHELL", "curl -fsSL http://localhost:3000/healthz > /dev/null || exit 1"]
      interval: 30s
      retries: 3
      start_period: 60s
      timeout: 5s
    ports:
      - "3000:3000"
    environment:
      PUID: "1000"
      PGID: "1000"
      TZ: America/New_York
    volumes:
      - ./config:/config
      - /mnt:/mnt
```

```bash
docker compose up -d
```

Set `PUID`/`PGID` from `id` on the host. Map `/mnt` (or your media paths) so completed downloads and library folders share paths with *Arr and media servers.

## What the image does

1. Starts the frontend so maintenance progress can be shown.
2. Runs database migration / restore swap (`--db-migration`).
3. Starts the backend and waits for `/health` before considering startup complete.

Long one-time maintenance does not mark the Compose healthcheck unhealthy — it targets frontend `/healthz`.

## Reverse proxy

!!! warning "TLS and WebSockets"

    - Prefer HTTPS in front of port `3000`. Do not expose plain HTTP to the internet.
    - Bind `127.0.0.1:3000:3000` when the proxy is on the Docker host.
    - Allow HTTP Upgrade on **same-origin** `/ws` (Overview/Queue live updates).
    - Set `SECURE_COOKIES=true` when the UI is HTTPS-only.
    - Set **Base URL** in Settings (or `TRUST_PROXY=1` so forwarded headers rewrite correctly) for STRM/adapter absolute URLs.
    - For `addurl` to Docker-internal indexers, configure [Trusted local hosts](../configuration/sabnzbd.md) or `TRUSTED_INTERNAL_HOSTS`.

## Optional environment

| Variable | Purpose |
|----------|---------|
| `TRUST_PROXY=1` | Honor proxy `X-Forwarded-*` when rewriting scheme/host |
| `TRUSTED_PROXY_CIDRS` | Widen backend proxy trust (split-container) |
| `TRUSTED_INTERNAL_HOSTS` | Allowlist for private `addurl` targets |
| `SESSION_KEY` | Stable session secret (else persisted under `/config`) |
| `THREADPOOL_MIN_THREADS` / `THREADPOOL_MAX_THREADS` | Memory-constrained hosts |

Full list: [Environment variables](../configuration/environment-variables.md).

## Next

[First run](first-run.md) — admin account, providers, WebDAV, import strategy.
