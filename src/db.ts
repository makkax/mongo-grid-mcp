import { MongoClient, GridFSBucket, Db } from "mongodb";

let client: MongoClient | null = null;
let db: Db | null = null;

export async function connect(): Promise<Db> {
  if (db) return db;

  const uri = process.env.MONGODB_URI || "mongodb://localhost:27017";
  const dbName = process.env.MONGODB_DB || "gridfs_store";

  client = new MongoClient(uri);
  await client.connect();
  db = client.db(dbName);
  return db;
}

export async function getBucket(bucketName?: string): Promise<GridFSBucket> {
  const database = await connect();
  return new GridFSBucket(database, {
    bucketName: bucketName || "fs",
  });
}

export async function getDb(): Promise<Db> {
  return connect();
}

export async function disconnect(): Promise<void> {
  if (client) {
    await client.close();
    client = null;
    db = null;
  }
}
