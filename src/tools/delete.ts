import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import { getBucket } from "../db";
import { ObjectId } from "mongodb";

export function registerDelete(server: McpServer) {
  server.tool(
    "gridfs_delete",
    "Delete a file from GridFS by its ObjectId.",
    {
      fileId: z.string().describe("The ObjectId of the file to delete"),
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

      await gfs.delete(new ObjectId(fileId));

      return {
        content: [
          {
            type: "text" as const,
            text: JSON.stringify(
              {
                id: fileId,
                message: "File deleted successfully",
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
