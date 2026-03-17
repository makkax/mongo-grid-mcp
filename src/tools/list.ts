import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import { getBucket } from "../db";

export function registerList(server: McpServer) {
  server.tool(
    "gridfs_list",
    "List files stored in GridFS. Optionally filter by filename pattern or bucket name.",
    {
      bucket: z.string().optional().describe("GridFS bucket name (default: fs)"),
      filter: z.string().optional().describe("Filename substring to filter by"),
      limit: z.number().optional().describe("Max number of files to return"),
    },
    async ({ bucket, filter, limit }) => {
      const gfs = await getBucket(bucket);
      const query: Record<string, unknown> = {};
      if (filter) {
        query.filename = { $regex: filter, $options: "i" };
      }

      const cursor = gfs.find(query);
      if (limit) cursor.limit(limit);
      const files = await cursor.toArray();

      const result = files.map((f) => ({
        id: f._id.toString(),
        filename: f.filename,
        length: f.length,
        uploadDate: f.uploadDate?.toISOString(),
        metadata: f.metadata,
      }));

      return {
        content: [
          {
            type: "text" as const,
            text: JSON.stringify(result, null, 2),
          },
        ],
      };
    }
  );
}
