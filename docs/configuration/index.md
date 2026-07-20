# Configuration

Day-to-day settings live in the admin UI (**Settings**) and persist in SQLite under `/config`. Use this section as a walkthrough of every Settings tab.

For headless / container bootstrap, see **[Environment variables](environment-variables.md)** — the schema of env vars that configure NzbDAV without the UI (or as fallbacks when a UI value is empty).

## Settings hub

<div class="grid cards" markdown>

-   **Connections** — [Usenet](usenet.md) · [Indexers](indexers.md) · [Search profiles](profiles.md)
-   **Playback & automation** — [Watchdog](watchdog.md) · [Preflight](preflight.md) · [Watchtower](watchtower.md) · [Warden](warden.md)
-   **Integrations** — [SABnzbd](sabnzbd.md) · [WebDAV](webdav.md) · [Radarr/Sonarr](arrs.md) · [Rclone](rclone.md)
-   **System** — [Repairs](repairs.md) · [Maintenance](maintenance.md) · [Backup](backup.md)

</div>

!!! tip "Config vs env"

    Most tunables are UI/`ConfigItems` keys. Env vars cover process wiring (`CONFIG_PATH`, ports, auth cookies), secrets bootstrap, and a handful of fallbacks documented on the [environment variables](environment-variables.md) page.
