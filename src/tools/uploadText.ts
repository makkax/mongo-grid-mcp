import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import { getBucket } from "../db";
import { Readable } from "stream";

/**
 * gridfs_upload_text — Upload plain text content directly without base64 encoding.
 * Convenience wrapper for text files (JSON, CSV, Markdown, HTML, Python, etc.)
 * Returns same shape as gridfs_upload.
 */
export function registerUploadText(server: McpServer) {
  server.tool(
    "gridfs_upload_text",
    "Upload a plain text file to GridFS without base64 encoding. Ideal for JSON, CSV, HTML, Markdown, Python scripts, etc.",
    {
      filename: z.string().describe("Name for the file in GridFS (e.g. 'relay/report.html')"),
      content: z.string().describe("Plain text content to store"),
      bucket: z.string().optional().describe("GridFS bucket name (default: fs)"),
      encoding: z.string().optional().describe("Text encoding (default: utf-8)"),
      metadata: z
        .record(z.string(), z.unknown())
        .optional()
        .describe("Optional metadata object"),
    },
    async ({ filename, content, bucket, encoding = "utf-8", metadata }) => {
      const gfs = await getBucket(bucket);
      const buffer = Buffer.from(content, encoding as BufferEncoding);
      const readable = Readable.from(buffer);

      const uploadStream = gfs.openUploadStream(filename, {
        metadata: {
          encoding,
          ...(metadata || {}),
        },
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
                encoding,
                message: "Text file uploaded successfully",
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
