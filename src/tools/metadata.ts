import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import { getBucket } from "../db";
import { ObjectId } from "mongodb";

export function registerMetadata(server: McpServer) {
  server.tool(
    "gridfs_metadata",
    "Get metadata for a specific file in GridFS by its ObjectId.",
    {
      fileId: z.string().describe("The ObjectId of the file"),
      bucket: z.string().optional().describe("GridFS bucket name (default: fs)"),
    },
    async ({ fileId, bucket }) => {
      const gfs = await getBucket(bucket);
      const files = await gfs.find({ _id: new ObjectId(fileId) }).toArray();

      if (files.length === 0) {
        return {
          content: [
            { type: "text" as const, text: `File not found: ${fileId}` },
          ],
          isError: true,
        };
      }

      const f = files[0];
      const { text_content, ...metaRest } = (f.metadata ?? {}) as Record<string, unknown>;
      const textChars = typeof text_content === "string" ? text_content.length : 0;
      const result = {
        id: f._id.toString(),
        filename: f.filename,
        length: f.length,
        chunkSize: f.chunkSize,
        uploadDate: f.uploadDate?.toISOString(),
        metadata: {
          ...metaRest,
          ...(textChars > 0 ? { text_chars: textChars } : {}),
        },
      };

      return {
        content: [
          { type: "text" as const, text: JSON.stringify(result, null, 2) },
        ],
      };
    }
  );
}
