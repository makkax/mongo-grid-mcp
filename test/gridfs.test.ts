import { describe, it, before, after } from "node:test";
import assert from "node:assert/strict";
import { Readable } from "stream";
import { ObjectId } from "mongodb";
import { connect, getBucket, disconnect } from "../src/db";

// Use authenticated URI and a dedicated test database
process.env.MONGODB_URI = "mongodb://admin:secret@localhost:27017";
process.env.MONGODB_DB = "gridfs_test_" + Date.now();

describe("GridFS integration tests", () => {
  let uploadedId: ObjectId;

  before(async () => {
    // Verify connection works
    const db = await connect();
    assert.ok(db, "Should connect to MongoDB");
  });

  after(async () => {
    // Clean up: drop the test database entirely
    const db = await connect();
    await db.dropDatabase();
    await disconnect();
  });

  describe("upload", () => {
    it("should upload a file from a buffer", async () => {
      const bucket = await getBucket();
      const content = Buffer.from("Hello GridFS!", "utf-8");
      const readable = Readable.from(content);

      const uploadStream = bucket.openUploadStream("test-file.txt", {
        metadata: { author: "test-suite" },
      });

      await new Promise<void>((resolve, reject) => {
        readable.pipe(uploadStream).on("finish", resolve).on("error", reject);
      });

      uploadedId = uploadStream.id;
      assert.ok(uploadedId, "Should return an ObjectId after upload");
    });

    it("should upload a binary file", async () => {
      const bucket = await getBucket();
      const content = Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x00, 0xff]);
      const readable = Readable.from(content);

      const uploadStream = bucket.openUploadStream("binary-file.bin");
      await new Promise<void>((resolve, reject) => {
        readable.pipe(uploadStream).on("finish", resolve).on("error", reject);
      });

      assert.ok(uploadStream.id, "Should upload binary content");
    });
  });

  describe("list", () => {
    it("should list uploaded files", async () => {
      const bucket = await getBucket();
      const files = await bucket.find().toArray();
      assert.ok(files.length >= 2, `Expected at least 2 files, got ${files.length}`);
    });

    it("should filter files by filename", async () => {
      const bucket = await getBucket();
      const files = await bucket
        .find({ filename: { $regex: "test-file", $options: "i" } })
        .toArray();
      assert.equal(files.length, 1);
      assert.equal(files[0].filename, "test-file.txt");
    });

    it("should respect limit", async () => {
      const bucket = await getBucket();
      const files = await bucket.find().limit(1).toArray();
      assert.equal(files.length, 1);
    });
  });

  describe("metadata", () => {
    it("should retrieve file metadata by id", async () => {
      const bucket = await getBucket();
      const files = await bucket.find({ _id: uploadedId }).toArray();
      assert.equal(files.length, 1);

      const file = files[0];
      assert.equal(file.filename, "test-file.txt");
      assert.equal(file.length, 13); // "Hello GridFS!" = 13 bytes
      assert.deepEqual(file.metadata, { author: "test-suite" });
      assert.ok(file.uploadDate instanceof Date);
    });

    it("should return empty for non-existent id", async () => {
      const bucket = await getBucket();
      const fakeId = new ObjectId();
      const files = await bucket.find({ _id: fakeId }).toArray();
      assert.equal(files.length, 0);
    });
  });

  describe("download", () => {
    it("should download file content as buffer", async () => {
      const bucket = await getBucket();
      const downloadStream = bucket.openDownloadStream(uploadedId);
      const chunks: Buffer[] = [];

      await new Promise<void>((resolve, reject) => {
        downloadStream.on("data", (chunk: Buffer) => chunks.push(chunk));
        downloadStream.on("end", resolve);
        downloadStream.on("error", reject);
      });

      const content = Buffer.concat(chunks).toString("utf-8");
      assert.equal(content, "Hello GridFS!");
    });

    it("should round-trip base64 encoding", async () => {
      const bucket = await getBucket();
      const downloadStream = bucket.openDownloadStream(uploadedId);
      const chunks: Buffer[] = [];

      await new Promise<void>((resolve, reject) => {
        downloadStream.on("data", (chunk: Buffer) => chunks.push(chunk));
        downloadStream.on("end", resolve);
        downloadStream.on("error", reject);
      });

      const base64 = Buffer.concat(chunks).toString("base64");
      const decoded = Buffer.from(base64, "base64").toString("utf-8");
      assert.equal(decoded, "Hello GridFS!");
    });

    it("should error on non-existent file download", async () => {
      const bucket = await getBucket();
      const fakeId = new ObjectId();
      const downloadStream = bucket.openDownloadStream(fakeId);

      await assert.rejects(
        () =>
          new Promise<void>((resolve, reject) => {
            downloadStream.on("data", () => {});
            downloadStream.on("end", resolve);
            downloadStream.on("error", reject);
          }),
        (err: unknown) => {
          assert.ok(err instanceof Error);
          return true;
        }
      );
    });
  });

  describe("read text", () => {
    it("should read file content as UTF-8 text", async () => {
      const bucket = await getBucket();
      const downloadStream = bucket.openDownloadStream(uploadedId);
      const chunks: Buffer[] = [];

      await new Promise<void>((resolve, reject) => {
        downloadStream.on("data", (chunk: Buffer) => chunks.push(chunk));
        downloadStream.on("end", resolve);
        downloadStream.on("error", reject);
      });

      const text = Buffer.concat(chunks).toString("utf-8");
      assert.equal(text, "Hello GridFS!");
    });

    it("should handle unicode content", async () => {
      const bucket = await getBucket();
      const unicodeText = "Ciao mondo! 日本語テスト 🎉";
      const content = Buffer.from(unicodeText, "utf-8");
      const readable = Readable.from(content);

      const uploadStream = bucket.openUploadStream("unicode.txt");
      await new Promise<void>((resolve, reject) => {
        readable.pipe(uploadStream).on("finish", resolve).on("error", reject);
      });

      const downloadStream = bucket.openDownloadStream(uploadStream.id);
      const chunks: Buffer[] = [];
      await new Promise<void>((resolve, reject) => {
        downloadStream.on("data", (chunk: Buffer) => chunks.push(chunk));
        downloadStream.on("end", resolve);
        downloadStream.on("error", reject);
      });

      const result = Buffer.concat(chunks).toString("utf-8");
      assert.equal(result, unicodeText);
    });
  });

  describe("delete", () => {
    it("should delete a file by id", async () => {
      const bucket = await getBucket();

      // Upload a file to delete
      const content = Buffer.from("delete me", "utf-8");
      const readable = Readable.from(content);
      const uploadStream = bucket.openUploadStream("to-delete.txt");
      await new Promise<void>((resolve, reject) => {
        readable.pipe(uploadStream).on("finish", resolve).on("error", reject);
      });

      const deleteId = uploadStream.id;

      // Verify it exists
      let files = await bucket.find({ _id: deleteId }).toArray();
      assert.equal(files.length, 1);

      // Delete it
      await bucket.delete(deleteId);

      // Verify it's gone
      files = await bucket.find({ _id: deleteId }).toArray();
      assert.equal(files.length, 0);
    });

    it("should error when deleting non-existent file", async () => {
      const bucket = await getBucket();
      const fakeId = new ObjectId();

      await assert.rejects(() => bucket.delete(fakeId), (err: unknown) => {
        assert.ok(err instanceof Error);
        return true;
      });
    });
  });

  describe("custom bucket", () => {
    it("should use a custom bucket name", async () => {
      const bucket = await getBucket("custom_bucket");
      const content = Buffer.from("custom bucket content", "utf-8");
      const readable = Readable.from(content);

      const uploadStream = bucket.openUploadStream("custom.txt");
      await new Promise<void>((resolve, reject) => {
        readable.pipe(uploadStream).on("finish", resolve).on("error", reject);
      });

      const files = await bucket.find().toArray();
      assert.equal(files.length, 1);
      assert.equal(files[0].filename, "custom.txt");

      // Default bucket should not contain this file
      const defaultBucket = await getBucket();
      const defaultFiles = await defaultBucket
        .find({ filename: "custom.txt" })
        .toArray();
      assert.equal(defaultFiles.length, 0);
    });
  });
});
