import { MongoClient } from "mongodb";

const uri = process.env.MONGODB_URI;

if (!uri) {
    console.error('Missing required environment variable: "MONGODB_URI"');
    process.exit(1);
}

const client = new MongoClient(uri, { maxPoolSize: 1 });

try {
    await client.connect();
    const db = client.db();

    await db.collection("diaries").createIndex(
        { userId: 1, createdAt: -1 },
        { name: "diaries_userId_createdAt_desc" }
    );

    await db.collection("entries").createIndex(
        { diaryId: 1, userId: 1, createdAt: -1 },
        { name: "entries_diaryId_userId_createdAt_desc" }
    );

    console.log("Indexes ensured successfully.");
} catch (error) {
    console.error("Failed to create indexes", error);
    process.exitCode = 1;
} finally {
    await client.close();
}
