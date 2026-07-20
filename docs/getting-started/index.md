# Getting started

Choose a path based on where you are:

<div class="grid cards" markdown>

-   :material-docker:{ .lg .middle } __Install with Docker__

    ---

    Persistent Compose deploy, health checks, reverse-proxy notes.

    [:octicons-arrow-right-24: Docker](docker.md)

-   :material-account-cog:{ .lg .middle } __First run__

    ---

    Admin account, Usenet provider, WebDAV credentials, import strategy.

    [:octicons-arrow-right-24: First run](first-run.md)

-   :material-sync:{ .lg .middle } __Connect *Arr__

    ---

    Add NzbDAV as a SABnzbd download client in Sonarr and Radarr.

    [:octicons-arrow-right-24: Connect Radarr/Sonarr](connect-arr.md)

-   :material-map:{ .lg .middle } __Understand the flow__

    ---

    How queue → mount → stream works with media servers.

    [:octicons-arrow-right-24: Architecture](../guides/architecture.md)

</div>

## Prerequisites

1. **Usenet provider** — NNTP host, credentials, and connection allowance.
2. **Indexers** (optional for first play) — Newznab-compatible sources for search and *Arr.
3. **Docker** — Engine + Compose v2. Symlink imports also need Linux FUSE (`/dev/fuse`).

## After install

| Goal | Next |
|------|------|
| Plex + symlinks | [Import strategies](../guides/import-strategies.md) → [Mounting WebDAV](../guides/mounting-webdav.md) |
| Emby/Jellyfin + STRM | [Import strategies](../guides/import-strategies.md) → [Media servers](../guides/media-servers.md) |
| Stremio on demand | [Stremio](../guides/stremio.md) |
| Tune Settings | [Configuration](../configuration/index.md) |
