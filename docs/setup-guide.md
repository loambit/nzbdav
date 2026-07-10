# Comprehensive NzbDav Setup Guide

An opinionated, step-by-step walkthrough for setting up NzbDav for maximum performance ("infinite library" style) with Radarr, Sonarr, Plex/Jellyfin, and Stremio.

## Table of contents

1. [How the "infinite library" works](#how-the-infinite-library-works)
2. [Phase 1 — Prerequisites](#phase-1--prerequisites)
3. [Phase 2 — Initial deployment](#phase-2--initial-deployment)
4. [Phase 3 — The full stack (Rclone sidecar)](#phase-3--the-full-stack-rclone-sidecar)
5. [Phase 4 — Integrations](#phase-4--integrations)
6. [Phase 5 — Usenet streaming in Stremio (via AIOStreams)](#phase-5--usenet-streaming-in-stremio-via-aiostreams)

## How the "infinite library" works

Before configuring anything, it helps to understand the flow.

### Path A: The automation flow (Radarr/Sonarr + Plex/Jellyfin)

1. **Radarr** sends an `.nzb` file to NzbDav (acting as a download client) to "download".
2. **NzbDav** mounts the NZB onto the WebDAV without actually downloading it.
3. **NzbDav** tells Radarr the "download" is finished and points to a folder of **symlinks** at `/mnt/remote/nzbdav/completed-symlinks`.
   * The symlinks always point into the `/mnt/remote/nzbdav/.ids` folder, which contains the streamable content.
4. **Radarr** imports these symlinks into your library (e.g. `/mnt/media/movies`).
5. **Plex** reads the symlink → Rclone mount → WebDAV stream → Usenet provider.
   * **Rclone** makes the NZB contents available to your filesystem by streaming, without using any storage space on your server.

### Path B: The on-demand flow (Stremio)

1. **Stremio (via AIOStreams)** searches your indexers using the Newznab addon and finds a release.
2. **AIOStreams** sends the `.nzb` to NzbDav's API to mount it.
3. **NzbDav** mounts the file instantly via WebDAV.
4. **AIOStreams** generates a streamable URL.
   * With the recommended proxy setup, this URL points to AIOStreams, which tunnels the traffic from NzbDav.
5. **Stremio** plays the video from that URL (bypassing Rclone/symlinks entirely).

---

## Phase 1 — Prerequisites

### 1. Usenet provider

You need a Usenet provider to download content. Consult the [Usenet Providers Wiki](https://www.reddit.com/r/usenet/wiki/providerdeals/) for a full list.

### 2. Indexers

You need Usenet indexers to find content. Consult the [Usenet Indexers Wiki](https://www.reddit.com/r/usenet/wiki/indexers/) for a full list.

Add these to Prowlarr and sync them to your Radarr/Sonarr instances.

---

## Phase 2 — Initial deployment

We start with a basic NzbDav container.

### 1. Create `docker-compose.yml`

Create the file structure like below:

```
your-root-docker-folder/
├── apps
│   ├── nzbdav
│   │   └── docker-compose.yml   👈 Create this file now
│   └── ...
```

Update `PUID`, `PGID`, `TZ`, and volume paths as needed. You can get your PUID/PGID by running `id` in your terminal.

```yaml
services:
  nzbdav:
    image: ghcr.io/nzbdav/nzbdav:latest
    container_name: nzbdav
    restart: unless-stopped
    healthcheck:
      test: curl -f http://localhost:3000/health || exit 1
      interval: 1m       # check every minute
      retries: 3         # restart after 3 consecutive failures
      start_period: 5s   # give it 5 seconds to boot up
      timeout: 5s        # if it doesn't answer in 5 seconds, assume it's frozen
    ports:
      - "3000:3000"
    environment:
      # Change these IDs to match the user you got from `id` above
      - PUID=1000
      - PGID=1000
      # Set the time zone to match your location
      - TZ=America/New_York
    volumes:
      - ./config:/config
      - /mnt:/mnt
```

Run the container:

```bash
docker compose up -d
```

### 2. Core configuration

Navigate to `http://your-server-ip:3000`.

**A. Create the admin account**

Set your username and password.

**B. Usenet settings (`Settings` → `Usenet`)**

| Setting | Value |
|---------|-------|
| Host | `news.newshosting.com` (put your provider here) |
| Port | `563` |
| Username / Password | Your Usenet credentials |
| Max Connections | `100` (set to your provider's max allowed) |
| Type | `Pool Connections` |
| Use SSL | Checked |

**C. WebDAV settings (`Settings` → `WebDAV`)**

| Setting | Value |
|---------|-------|
| WebDAV Password | Create a password (you will need this for Rclone) |
| Enforce Read-Only | Leave checked, unless you'd like to delete files from a terminal |

### 3. Speed tuning (optional)

> [!NOTE]
> The default **Max Download Connections** setting of `15` works perfectly for most users (handling ~1Gbps). You only need to touch this if you are experiencing speed issues.

You can find the optimal **Max Download Connections** for your network (`Settings` → `WebDAV` → `Max Download Connections`) using the steps below:

1. **Baseline test** — run this on your server to check raw bandwidth:

   ```bash
   wget -O /dev/null https://ash-speed.hetzner.com/10GB.bin --report-speed=bits
   ```

2. **NzbDav internal test:**
   * In one terminal window, monitor CPU usage:

     ```bash
     docker stats nzbdav
     ```

   * Download a movie `.nzb` via your indexer website and upload it to NzbDav.
   * In the NzbDav UI, go to `Dav Explore` → `Content` → `Movies` → pick the movie you just added → right-click the **video file** and click `Copy Link Address`. Paste it into a text editor so you can see the whole URL.
   * Construct a test command like below and run it in another terminal window:

     ```bash
     docker exec nzbdav sh -c "apk add --no-cache wget > /dev/null 2>&1 && timeout 20s wget -O /dev/null --report-speed=bits --progress=bar:force:noscroll 'http://localhost:8080/view/content/Movies/<Movie Folder>/<Movie Name>.mkv?downloadKey=<download-key>'"
     ```

     Note the speed it reports and the CPU usage of the container.

3. **Adjust and repeat:**
   * Set `Max Download Connections` to `10`. Test speed (e.g. 500Mbps @ 70% CPU).
   * Set `Max Download Connections` to `15`. Test speed (e.g. 1Gbps @ 85% CPU).
   * **Sweet spot:** stop when the speed plateaus. For most setups, `15` (the default) is the magic number.

---

## Phase 3 — The full stack (Rclone sidecar)

Now we mount the NzbDav WebDAV onto the host filesystem using a sidecar container.

### 1. Prepare the host directory

```bash
sudo mkdir -p /mnt/remote/nzbdav                          # create the mount folder
sudo chown -R $(id -u):$(id -g) /mnt/remote/nzbdav        # give your user ownership
```

### 2. Generate the Rclone config

```
your-root-docker-folder/
├── apps
│   ├── nzbdav
│   │   ├── docker-compose.yml
│   │   └── rclone.conf          👈 Create this empty file now
│   └── ...
```

Generate an obscured password from the WebDAV password you set in NzbDav earlier:

```bash
docker run --rm -it rclone/rclone obscure "<your-webdav-password>"
```

Then populate `rclone.conf` with:

```ini
[nzbdav]
type = webdav
url = http://nzbdav:3000/
vendor = other
user = admin
pass = <PASTE_OBSCURED_PASSWORD_HERE_WITHOUT_ANGLE_BRACKETS>
```

### 3. Update `docker-compose.yml`

Add the Rclone sidecar under `services:` in your existing `apps/nzbdav/docker-compose.yml`. Update `PUID`, `PGID`, `TZ`, and volume paths as needed.

```yaml
  nzbdav_rclone:
    image: rclone/rclone:latest
    container_name: nzbdav_rclone
    restart: unless-stopped
    environment:
      # Change these IDs to match the user you got from `id`
      - PUID=1000
      - PGID=1000
      # Set the time zone to match your location
      - TZ=America/New_York
    volumes:
      # Host path : container path : propagation
      - /mnt:/mnt:rshared
      - ./rclone.conf:/config/rclone/rclone.conf
    cap_add:
      - SYS_ADMIN
    security_opt:
      - apparmor:unconfined
    devices:
      - /dev/fuse:/dev/fuse:rwm
    depends_on:
      nzbdav:
        condition: service_healthy
        restart: true
    # Mount flags optimized for streaming — see "Understanding the flags" below
    command: >
      mount nzbdav: /mnt/remote/nzbdav
        --uid=1000
        --gid=1000
        --allow-other
        --links
        --use-cookies
        --vfs-cache-mode=full
        --vfs-cache-max-size=20G
        --vfs-cache-max-age=24h
        --buffer-size=0M
        --vfs-read-ahead=512M
        --dir-cache-time=20s
```

Start the sidecar:

```bash
docker compose up -d nzbdav_rclone
```

If you later change the Rclone config or the compose file, apply the changes with:

```bash
docker compose up -d --force-recreate nzbdav_rclone
```

Verify the mount is working:

```bash
ls -la /mnt/remote/nzbdav
# Should show: .ids, completed-symlinks, content, nzbs
```

### Understanding the flags

| Flag | Why |
|------|-----|
| `--links` | **Crucial.** Translates `*.rclonelink` files within the WebDAV into real symlinks on your filesystem. Requires Rclone v1.70.3+. |
| `--use-cookies` | **Performance.** Without this, Rclone re-authenticates on every single request, causing massive slowdowns. |
| `--allow-other` | **Permissions.** Ensures other containers (like Radarr/Plex) can see the mounted files. |
| `--vfs-cache-mode=full` | **Performance.** Enables the full VFS cache, required for seeking and proper file handling. |
| `--buffer-size=0M` | **Stability.** Prevents double-caching (RAM + disk). |
| `--vfs-read-ahead=512M` | **Smooth playback.** Buffers 512MB ahead of the current position to handle high-bitrate spikes without stuttering. |
| `--vfs-cache-max-size=20G` | **Disk management.** Limits local disk space used by the cache; adjust to your available storage. |
| `--dir-cache-time=20s` | **Responsiveness.** Keeps the directory cache short so new downloads/links appear quickly in the mount. |

> [!TIP]
> These flags are optimized for streaming. Resist the urge to add more: `unnecessary flags = potential pitfalls`. For background on buffer sizing, see this [Rclone forum discussion](https://forum.rclone.org/t/whats-the-suitable-value-to-set-for-buffer-size-with-vfs-read-ahead/39971/4).

---

## Phase 4 — Integrations

### 1. Add NzbDav as a download client in Radarr/Sonarr

Go to Radarr/Sonarr → `Settings` → `Download Clients` → `Add Download Client`:

| Setting | Value |
|---------|-------|
| Client | **SABnzbd** |
| Name | `NzbDav` |
| Host | `nzbdav` |
| Port | `3000` |
| API Key | Found in NzbDav `Settings` → `SABnzbd` |

### 2. Configure NzbDav for Radarr/Sonarr

Go to NzbDav `Settings` → `Radarr/Sonarr`.

1. **Radarr Instances → Add**
   * **Host:** `http://radarr:7878`
   * **API Key:** Radarr → `Settings` → `General` → `Security` → `API Key`
2. **Sonarr Instances → Add**
   * **Host:** `http://sonarr:8989`
   * **API Key:** Sonarr → `Settings` → `General` → `Security` → `API Key`
3. **Automatic Queue Management**

   Configure these rules to handle failed or bad releases, keeping your queue clean with as little manual intervention as possible. Feel free to experiment and adjust them to your liking.

   * **Do Nothing:**
     * Found matching series via grab history, but release was matched to series by ID. Automatic import is not possible.
     * Found matching movie via grab history, but release was matched to movie by ID. Manual Import required.
     * Episode was not found in the grabbed release.
     * Episode was unexpected considering the folder name.
     * Invalid season or episode.
     * Unable to determine if file is a sample.
   * **Remove, Blocklist, and Search:**
     * No files found are eligible for import.
     * No audio tracks detected.
     * Sample.
   * **Remove and Blocklist:**
     * Not an upgrade for existing episode file(s).
     * Not an upgrade for existing movie file.
     * Not a Custom Format upgrade.
   * **Remove:**
     * Episode file already imported.

### 3. Configure mount & repairs

1. **Mount directory (`Settings` → `SABnzbd`):**
   * **Rclone Mount Directory:** `/mnt/remote/nzbdav`
   * This tells NzbDav where the files physically exist on your host system, so it can pass the correct paths to Radarr/Sonarr.
2. **Repairs (`Settings` → `Repairs`):**
   * **Library Directory:** `/mnt/media` — point this to the root folder where your actual movie/TV libraries live on the host.
   * **Enable Background Repairs:** Checked. This lets NzbDav monitor for dead links in your library and trigger redownloads automatically.

---

## Phase 5 — Usenet streaming in Stremio (via AIOStreams)

You can stream your Usenet content directly in Stremio using [AIOStreams](https://github.com/Viren070/AIOStreams). For more info, check out their [Usenet wiki](https://github.com/Viren070/AIOStreams/wiki/Usenet).

### 1. Configure the NzbDav service

In the AIOStreams UI:

1. Go to the **Services** menu and select **NzbDav**.
2. Enter the details:

   | Setting | Value |
   |---------|-------|
   | NzbDAV URL | `http://nzbdav:3000` (use your public URL if accessing remotely) |
   | NzbDAV API Key | From NzbDav `Settings` → `SABnzbd` |
   | NzbDAV WebDAV Username | From NzbDav `Settings` → `WebDAV` |
   | NzbDAV WebDAV Password | From NzbDav `Settings` → `WebDAV` |
   | AIOStreams Auth Token *(recommended)* | The `AIOSTREAMS_AUTH` value from your self-hosted AIOStreams `.env` file (e.g. `user:pass`) |

### 2. Configure the Newznab addon

In the AIOStreams UI:

1. Go to **Addons** → **Marketplace** → from the Types dropdown, select **Usenet**.
2. Find the **Newznab** addon and click **Configure**.
3. Add your indexers (repeat for each one):

   | Setting | Value |
   |---------|-------|
   | Name | `NZBGeek` (or similar) |
   | Newznab URL | Select `NZBgeek` from the dropdown |
   | API Key | Your indexer's API key |
   | AIOStreams Proxy Auth *(recommended)* | The `AIOSTREAMS_AUTH` value from your self-hosted AIOStreams `.env` file (e.g. `user:pass`) |
   | Search Mode | **Forced Query** (default is `Auto`) |
   | Timeout | `5000` ms (default is `7000`) |

4. Leave everything else as default and click **Install**.

### 3. Install to Stremio

Go to the **Save & Install** tab, click **Save**, and then install the addon to Stremio.
