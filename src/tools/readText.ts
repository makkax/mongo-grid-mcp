import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import { getBucket } from "../db";
import { ObjectId } from "mongodb";

export function registerReadText(server: McpServer) {
  server.tool(
    "gridfs_read_text",
    "Read a text file from GridFS and return its content as UTF-8 text.",
    {
      fileId: z.string().describe("The ObjectId of the file to read"),
      bucket: z.string().optional().describe("GridFS bucket name (default: fs)"),
      encoding: z
        .string()
        .optional()
        .describe("Text encoding (default: utf-8)"),
    },
    async ({ fileId, bucket, encoding }) => {
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

      const downloadStream = gfs.openDownloadStream(new ObjectId(fileId));
      const chunks: Buffer[] = [];

      await new Promise<void>((resolve, reject) => {
        downloadStream.on("data", (chunk: Buffer) => chunks.push(chunk));
        downloadStream.on("end", resolve);
        downloadStream.on("error", reject);
      });

      const enc = (encoding || "utf-8") as BufferEncoding;
      const text = Buffer.concat(chunks).toString(enc);

      return {
        content: [
          {
            type: "text" as const,
            text,
          },
        ],
      };
    }
  );
}
