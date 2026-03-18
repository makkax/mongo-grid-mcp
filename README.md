# mongo-grid-mcp

A [Model Context Protocol (MCP)](https://modelcontextprotocol.io/) server for MongoDB GridFS operations. Allows Claude (or any MCP-compatible client) to upload, download, list, delete, and read files stored in a MongoDB GridFS bucket.

---

## Features

| Tool | Description |
|---|---|
| `gridfs_list` | List files in GridFS, with optional filters |
| `gridfs_upload` | Upload a file with structured JSON metadata |
| `gridfs_download` | Download a binary file from GridFS |
| `gridfs_read_text` | Read the text content of a file stored in GridFS |
| `gridfs_metadata` | Retrieve metadata for a specific file |
| `gridfs_delete` | Delete a file from GridFS by ID |

---

## Requirements

- Docker
- A running MongoDB instance accessible from Docker (e.g. via `host.docker.internal`)

---

## Setup

### 1. Build the Docker image

```bash
npm run docker:build
# or directly:
docker build -t mongo-grid-mcp .
```

### 2. Configure Claude Desktop

Add the following to your `claude_desktop_config.json`:

```json
"mongo-grid-mcp": {
  "command": "docker",
  "args": [
    "run", "-i", "--rm",
    "--name", "desktop-mcp-gridfs",
    "-e", "MONGODB_URI=mongodb://admin:secret@host.docker.internal:27017",
    "-e", "MONGODB_DB=gridfs_store",
    "mongo-grid-mcp"
  ]
}
```

### Environment variables

| Variable | Description | Example |
|---|---|---|
| `MONGODB_URI` | MongoDB connection string | `mongodb://admin:secret@host.docker.internal:27017` |
| `MONGODB_DB` | GridFS database name | `gridfs_store` |

---

## Development

```bash
# Install dependencies
npm install

# Build TypeScript
npm run build

# Build and run locally
npm run dev

# Run tests
npm test

# Test Docker image (sends MCP initialize handshake)
npm run docker:test
```

### Project structure

```
src/
├── index.ts          # MCP server entry point
└── tools/
    ├── list.ts       # gridfs_list tool
    ├── upload.ts     # gridfs_upload tool
    ├── download.ts   # gridfs_download tool
    ├── readText.ts   # gridfs_read_text tool
    ├── metadata.ts   # gridfs_metadata tool
    └── delete.ts     # gridfs_delete tool
```

### Tech stack

- **Runtime:** Node.js 22
- **Language:** TypeScript 5
- **MCP SDK:** `@modelcontextprotocol/sdk`
- **DB driver:** `mongodb` v7
- **Validation:** `zod`
- **Packaging:** Docker (multi-stage build, `node:22-alpine`)

---

## Notes

- The server communicates via **stdio** transport (standard MCP pattern for Claude Desktop).
- Files are stored in the GridFS bucket of the database specified by `MONGODB_DB`.
- Upload metadata should follow a structured JSON format including fields like `tipo`, `source`, `tags`, `progetto`, `createdAt` for best queryability.
- For advanced metadata queries (e.g. filter by tag or project), use `mongodb-mcp` directly on `gridfs_store.fs.files`.
