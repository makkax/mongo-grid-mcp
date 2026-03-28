import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import { getDb } from "../db";
import { ObjectId } from "mongodb";

/**
 * gridfs_update_metadata — Patch metadata on an existing GridFS file.
 * Uses $set so only specified keys are updated (not full replace).
 * Useful for marking relay files as consumed, adding tags, etc.
 */
export function registerUpdateMetadata(server: McpServer) {
  server.tool(
    "gridfs_update_metadata",
    "Update (patch) metadata fields on an existing GridFS file. Only specified keys are updated. Use to mark relay files as consumed, add tags, etc.",
    {
      fileId: z.string().describe("The ObjectId of the file to update"),
      metadata: z
        .record(z.string(), z.unknown())
        .describe("Metadata fields to set/update (partial merge, not full replace)"),
      bucket: z.string().optional().describe("GridFS bucket name (default: fs)"),
    },
    async ({ fileId, metadata, bucket }) => {
      const db = await getDb();
      const bucketName = bucket || "fs";
      const collection = db.collection(`${bucketName}.files`);

      // Build $set with metadata.* prefix
      const setOp: Record<string, unknown> = {};
      for (const [k, v] of Object.entries(metadata)) {
        setOp[`metadata.${k}`] = v;
      }

      const result = await collection.updateOne(
        { _id: new ObjectId(fileId) },
        { $set: setOp }
      );

      if (result.matchedCount === 0) {
        return {
          content: [{ type: "text" as const, text: `File not found: ${fileId}` }],
          isError: true,
        };
      }

      return {
        content: [
          {
            type: "text" as const,
            text: JSON.stringify({
              id: fileId,
              matched: result.matchedCount,
              modified: result.modifiedCount,
              updated_fields: Object.keys(metadata),
            }, null, 2),
          },
        ],
      };
    }
  );
}
