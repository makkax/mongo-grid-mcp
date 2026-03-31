import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import { getBucket } from "../db";

/**
 * gridfs_watch — Poll a GridFS bucket until a file matching prefix/filter appears.
 * Returns immediately when the first matching file is found.
 * Optionally downloads content (base64) alongside metadata.
 *
 * Designed for relay workflows:
 *   Windows script uploads → gridfs_watch in Claude → process immediately.
 */
export function registerWatch(server: McpServer) {
  server.tool(
    "gridfs_watch",
    "Poll a GridFS bucket until a file matching the given prefix/filter appears. Returns when the first match is found or timeout expires. Use for relay: wait for Windows to drop a file.",
    {
      prefix: z.string().optional().describe("Filename prefix to watch for (e.g. 'relay/')"),
      filter: z.string().optional().describe("Filename substring filter (regex-compatible)"),
      bucket: z.string().optional().describe("GridFS bucket name (default: fs)"),
      timeoutMs: z.number().optional().describe("Max wait time in milliseconds (default: 15000)"),
      pollIntervalMs: z.number().optional().describe("Poll interval in milliseconds (default: 800)"),
      download: z.boolean().optional().describe("If true, also return file content as base64 (default: false)"),
      metadataFilter: z
        .record(z.string(), z.unknown())
        .optional()
        .describe("Optional metadata fields to match (e.g. {status: 'pending'})"),
    },
    async ({ prefix, filter, bucket, timeoutMs = 15000, pollIntervalMs = 800, download = false, metadataFilter }) => {
      const gfs = await getBucket(bucket);
      const deadline = Date.now() + timeoutMs;

      const query: Record<string, unknown> = {};
      if (prefix && filter) {
        query.filename = { $regex: `^${prefix}.*${filter}`, $options: "i" };
      } else if (prefix) {
        query.filename = { $regex: `^${prefix}`, $options: "i" };
      } else if (filter) {
        query.filename = { $regex: filter, $options: "i" };
      }
      if (metadataFilter) {
        for (const [k, v] of Object.entries(metadataFilter)) {
          query[`metadata.${k}`] = v;
        }
      }

      const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));
      let elapsed = 0;

      while (Date.now() < deadline) {
        const files = await gfs.find(query).sort({ uploadDate: -1 }).limit(1).toArray();

        if (files.length > 0) {
          const file = files[0];
          const result: Record<string, unknown> = {
            id: file._id.toString(),
            filename: file.filename,
            length: file.length,
            uploadDate: file.uploadDate?.toISOString(),
            metadata: file.metadata,
            elapsed_ms: elapsed,
          };

          if (download) {
            const downloadStream = gfs.openDownloadStream(file._id);
            const chunks: Buffer[] = [];
            await new Promise<void>((resolve, reject) => {
              downloadStream.on("data", (chunk: Buffer) => chunks.push(chunk));
              downloadStream.on("end", resolve);
              downloadStream.on("error", reject);
            });
            result.contentBase64 = Buffer.concat(chunks).toString("base64");
          }

          return {
            content: [{ type: "text" as const, text: JSON.stringify(result, null, 2) }],
          };
        }

        await sleep(pollIntervalMs);
        elapsed += pollIntervalMs;
      }

      return {
        content: [
          {
            type: "text" as const,
            text: JSON.stringify({
              found: false,
              message: `No file found after ${timeoutMs}ms`,
              query,
            }),
          },
        ],
        isError: true,
      };
    }
  );
}
