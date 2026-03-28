import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { registerList } from "./tools/list";
import { registerMetadata } from "./tools/metadata";
import { registerUpload } from "./tools/upload";
import { registerUploadText } from "./tools/uploadText";
import { registerDownload } from "./tools/download";
import { registerFind } from "./tools/find";
import { registerDelete } from "./tools/delete";
import { registerReadText } from "./tools/readText";
import { registerWatch } from "./tools/watch";
import { registerCleanup } from "./tools/cleanup";
import { registerUpdateMetadata } from "./tools/updateMetadata";

const server = new McpServer(
  {
    name: "mongo-grid-mcp",
    version: "1.1.0",
  },
  {
    instructions:
      "MCP server for MongoDB GridFS operations. " +
      "Core: list, upload (base64 or text), download, find-by-name, delete, read text, get metadata. " +
      "Relay: watch (poll until file appears), update_metadata (mark consumed), cleanup (TTL delete). " +
      "Bucket convention: 'relay' for transient Claude↔host transfers, 'fs' default.",
  }
);

// Core tools
registerList(server);
registerMetadata(server);
registerUpload(server);
registerUploadText(server);
registerDownload(server);
registerFind(server);
registerDelete(server);
registerReadText(server);

// Relay / lifecycle tools
registerWatch(server);
registerCleanup(server);
registerUpdateMetadata(server);

async function main() {
  const transport = new StdioServerTransport();
  await server.connect(transport);
  console.error("mongo-grid-mcp server running on stdio (v1.1.0)");
}

main().catch((err) => {
  console.error("Fatal error:", err);
  process.exit(1);
});
