import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import { getBucket } from "../db";
import { ObjectId } from "mongodb";

export function registerDownload(server: McpServer) {
  server.tool(
    "gridfs_download",
    "Download a file from GridFS. Returns the content as base64.",
    {
      fileId: z.string().describe("The ObjectId of the file to download"),
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

      const downloadStream = gfs.openDownloadStream(new ObjectId(fileId));
      const chunks: Buffer[] = [];

      await new Promise<void>((resolve, reject) => {
        downloadStream.on("data", (chunk: Buffer) => chunks.push(chunk));
        downloadStream.on("end", resolve);
        downloadStream.on("error", reject);
      });

      const content = Buffer.concat(chunks).toString("base64");

      return {
        content: [
          {
            type: "text" as const,
            text: JSON.stringify(
              {
                filename: files[0].filename,
                length: files[0].length,
                contentBase64: content,
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
