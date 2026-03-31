import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import { getBucket } from "../db";

/**
 * gridfs_find — Download a file by filename (no ObjectId required).
 * Returns the same structure as gridfs_download.
 * If multiple files share the same filename, returns the most recent one.
 */
export function registerFind(server: McpServer) {
  server.tool(
    "gridfs_find",
    "Download a file from GridFS by filename (no ObjectId needed). Returns the most recent match. Content returned as base64.",
    {
      filename: z.string().describe("Exact filename to look up in GridFS"),
      bucket: z.string().optional().describe("GridFS bucket name (default: fs)"),
    },
    async ({ filename, bucket }) => {
      const gfs = await getBucket(bucket);

      const files = await gfs
        .find({ filename })
        .sort({ uploadDate: -1 })
        .limit(1)
        .toArray();

      if (files.length === 0) {
        return {
          content: [{ type: "text" as const, text: `File not found: ${filename}` }],
          isError: true,
        };
      }

      const file = files[0];
      const downloadStream = gfs.openDownloadStream(file._id);
      const chunks: Buffer[] = [];

      await new Promise<void>((resolve, reject) => {
        downloadStream.on("data", (chunk: Buffer) => chunks.push(chunk));
        downloadStream.on("end", resolve);
        downloadStream.on("error", reject);
      });

      return {
        content: [
          {
            type: "text" as const,
            text: JSON.stringify(
              {
                id: file._id.toString(),
                filename: file.filename,
                length: file.length,
                uploadDate: file.uploadDate?.toISOString(),
                metadata: file.metadata,
                contentBase64: Buffer.concat(chunks).toString("base64"),
              },
              null,
              2
            ),
          },
        ],
      };
    }
  );
}
