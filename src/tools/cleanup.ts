import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import { getBucket, getDb } from "../db";

/**
 * gridfs_cleanup — Remove old files from a GridFS bucket.
 * Filter by: age (uploadDate), filename prefix, metadata.status.
 * Returns count of files deleted + total bytes reclaimed.
 *
 * Use for relay bucket TTL: cleanup consumed/old relay files automatically.
 */
export function registerCleanup(server: McpServer) {
  server.tool(
    "gridfs_cleanup",
    "Remove files from a GridFS bucket older than maxAgeHours. Optionally filter by filename prefix and/or metadata.status. Returns deleted count and bytes reclaimed.",
    {
      maxAgeHours: z
        .number()
        .describe("Delete files uploaded more than this many hours ago"),
      bucket: z.string().optional().describe("GridFS bucket name (default: fs)"),
      prefix: z.string().optional().describe("Only delete files whose filename starts with this prefix"),
      statusFilter: z
        .string()
        .optional()
        .describe("Only delete files where metadata.status equals this value (e.g. 'consumed')"),
      dryRun: z
        .boolean()
        .optional()
        .describe("If true, only report what would be deleted without actually deleting (default: false)"),
    },
    async ({ maxAgeHours, bucket, prefix, statusFilter, dryRun = false }) => {
      const gfs = await getBucket(bucket);
      const db = await getDb();
      const bucketName = bucket || "fs";

      const cutoff = new Date(Date.now() - maxAgeHours * 3600 * 1000);

      const query: Record<string, unknown> = {
        uploadDate: { $lt: cutoff },
      };
      if (prefix) {
        query.filename = { $regex: `^${prefix}`, $options: "i" };
      }
      if (statusFilter) {
        query["metadata.status"] = statusFilter;
      }

      const filesCollection = db.collection(`${bucketName}.files`);
      const candidates = await filesCollection.find(query).toArray();

      if (candidates.length === 0) {
        return {
          content: [
            {
              type: "text" as const,
              text: JSON.stringify({ deleted: 0, bytes_reclaimed: 0, dry_run: dryRun, message: "No files matched" }),
            },
          ],
        };
      }

      const totalBytes = candidates.reduce((sum, f) => sum + (f.length || 0), 0);

      if (dryRun) {
        return {
          content: [
            {
              type: "text" as const,
              text: JSON.stringify({
                dry_run: true,
                would_delete: candidates.length,
                bytes_reclaimed: totalBytes,
                files: candidates.map((f) => ({
                  id: f._id.toString(),
                  filename: f.filename,
                  uploadDate: f.uploadDate?.toISOString(),
                  length: f.length,
                  metadata: f.metadata,
                })),
              }, null, 2),
            },
          ],
        };
      }

      let deleted = 0;
      for (const file of candidates) {
        try {
          await gfs.delete(file._id);
          deleted++;
        } catch {
          // continue on individual errors
        }
      }

      return {
        content: [
          {
            type: "text" as const,
            text: JSON.stringify({
              deleted,
              bytes_reclaimed: totalBytes,
              cutoff: cutoff.toISOString(),
              bucket: bucketName,
              prefix: prefix || null,
              status_filter: statusFilter || null,
            }, null, 2),
          },
        ],
      };
    }
  );
}
