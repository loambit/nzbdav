# About

NzbDAV is a single product: a WebDAV + SABnzbd-compatible Usenet streaming server.

## Ecosystem

Playback quality depends on the full stack. NzbDAV complements and ships with managed libraries in the same ecosystem — **UsenetSharp**, **RapidYencSharp**, **rapidyenc**, and **SharpCompress** — so connection, yEnc, and archive fixes land in the right layer instead of waiting on a fragmented dependency chain.

## Heritage

This project is a maintained fork of [nzbdav-dev/nzbdav](https://github.com/nzbdav-dev/nzbdav), with an **official drop-in upgrade path from `v0.6.4`**. Operators have also successfully migrated from community forks such as [Pukabyte/nzbdav](https://github.com/Pukabyte/nzbdav) and [qooode/nzbdavex](https://github.com/qooode/nzbdavex). See [Migration paths](../getting-started/migration.md) for steps and caveats. Ideas and contributions were also absorbed from elfhosted, kha-kis, mrghxst, and others.

Historical stack announcement notes: [0.7.x coordinated release](history/release-0.7.md). Prefer the [Changelog](changelog.md) for current releases.

## License

[MIT](https://github.com/nzbdav/nzbdav/blob/main/LICENSE).

NzbDAV is intended for legally obtained or public domain content only.
