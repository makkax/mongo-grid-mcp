# Changelog — mongo-grid-mcp

## v1.1.0 — 2026-03-28

### New tools
- **`gridfs_upload_text`** — Upload plain text content (JSON, CSV, HTML, Markdown, Python…) without base64. Encoding configurable (default utf-8).
- **`gridfs_find`** — Download a file by filename (no ObjectId required). Returns most recent match. Same response shape as `gridfs_download`.
- **`gridfs_watch`** — Poll a GridFS bucket until a file matching prefix/filter appears. Returns immediately on match. Configurable `timeoutMs`, `pollIntervalMs`. Optionally downloads content alongside metadata. Supports `metadataFilter` (e.g. `{status: "pending"}`). Core primitive for relay workflows.
- **`gridfs_update_metadata`** — Patch metadata fields on an existing file using `$set`. Does not replace the full metadata object. Ideal for marking relay files as `consumed`.
- **`gridfs_cleanup`** — Remove files older than `maxAgeHours`. Filter by filename `prefix` and/or `metadata.status`. Supports `dryRun` mode (reports what would be deleted without acting). Returns deleted count and bytes reclaimed.

### Relay bucket convention
- `relay` — transient Claude↔host transfers (delete after consume)
- `fs` — default bucket (generic use)
- `ubs`, `reports` etc. — domain-specific buckets

## v1.0.0 — 2026-03-21

Initial release.
- `gridfs_upload` — base64 upload
- `gridfs_download` — base64 download by ObjectId
- `gridfs_list` — list with filter/limit
- `gridfs_metadata` — get metadata by ObjectId
- `gridfs_read_text` — read text content by ObjectId
- `gridfs_delete` — delete by ObjectId
