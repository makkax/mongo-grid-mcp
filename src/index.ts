import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { registerList } from "./tools/list";
import { registerMetadata } from "./tools/metadata";
import { registerUpload } from "./tools/upload";
import { registerDownload } from "./tools/download";
import { registerDelete } from "./tools/delete";
import { registerReadText } from "./tools/readText";

const server = new McpServer(
  {
    name: "mongo-grid-mcp",
    version: "1.0.0",
  },
  {
    instructions:
      "MCP server for MongoDB GridFS operations: list, upload, download, delete, read text files, and get metadata.",
  }
);

registerList(server);
registerMetadata(server);
registerUpload(server);
registerDownload(server);
registerDelete(server);
registerReadText(server);

async function main() {
  const transport = new StdioServerTransport();
  await server.connect(transport);
  console.error("mongo-grid-mcp server running on stdio");
}

main().catch((err) => {
  console.error("Fatal error:", err);
  process.exit(1);
});
