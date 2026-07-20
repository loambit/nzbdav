# Health and repairs

## Background repairs

**Settings → Repairs** monitors library items and can trigger *Arr replacements when content is unhealthy.

Requires:

- **Library Directory** visible inside the container
- At least one configured Radarr/Sonarr instance
- **Enable Background Repairs**

Tune concurrency, health-check depth, aging [since 0.8.0](https://github.com/nzbdav/nzbdav/releases/tag/v0.8.0){ .nzbdav-since }, and auto-remove thresholds — [Repairs settings](../configuration/repairs.md).

## Health-check retention

Health result rows prune by age (**Maintenance** retention or `DATABASE_HEALTHCHECK_RETENTION_DAYS`). Reset counters from Maintenance when needed.

## Manual checks

Use the Health UI / repairs flows in the app to inspect failures. Known transport issues should appear as clear warnings in logs rather than opaque crashes — see [Logs](logs-crash-dumps.md).
