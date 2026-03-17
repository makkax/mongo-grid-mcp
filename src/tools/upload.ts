import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import { getBucket } from "../db";
import { Readable } from "stream";

export function registerUpload(server: McpServer) {
  server.tool(
    "gridfs_upload",
    "Upload a file to GridFS. Content is provided as a base64-encoded string.",
    {
      filename: z.string().describe("Name for the file in GridFS"),
      contentBase64: z.string().describe("File content encoded as base64"),
      bucket: z.string().optional().describe("GridFS bucket name (default: fs)"),
      metadata: z
        .record(z.string(), z.unknown())
        .optional()
        .describe("Optional metadata object to attach to the file"),
    },
    async ({ filename, contentBase64, bucket, metadata }) => {
      const gfs = await getBucket(bucket);
      const buffer = Buffer.from(contentBase64, "base64");
      const readable = Readable.from(buffer);

      const uploadStream = gfs.openUploadStream(filename, {
        metadata: metadata || undefined,
      });

      await new Promise<void>((resolve, reject) => {
        readable.pipe(uploadStream).on("finish", resolve).on("error", reject);
      });

      return {
        content: [
          {
            type: "text" as const,
            text: JSON.stringify(
              {
                id: uploadStream.id.toString(),
                filename,
                length: buffer.length,
                message: "File uploaded successfully",
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
