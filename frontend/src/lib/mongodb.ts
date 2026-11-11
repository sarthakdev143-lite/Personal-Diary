import { MongoClient, type Db } from "mongodb";

const globalForMongo = global as typeof globalThis & {
    _mongoClientPromise?: Promise<MongoClient>;
};

let prodPromise: Promise<MongoClient> | undefined;
let indexesReady: Promise<void> | undefined;

function uri(): string {
    const value = process.env.MONGODB_URI;
    if (!value) {
        throw new Error('Invalid/Missing environment variable: "MONGODB_URI"');
    }
    return value;
}

export function getMongoClient(): Promise<MongoClient> {
    if (process.env.NODE_ENV === "development") {
        if (!globalForMongo._mongoClientPromise) {
            globalForMongo._mongoClientPromise = new MongoClient(uri()).connect();
        }
        return globalForMongo._mongoClientPromise;
    }

    if (!prodPromise) {
        prodPromise = new MongoClient(uri()).connect();
    }
    return prodPromise;
}

async function ensureIndexes(db: Db): Promise<void> {
    await Promise.all([
        db.collection("users").createIndex({ email: 1 }, { unique: true }),
        db.collection("users").createIndex({ stripeCustomerId: 1 }, { sparse: true }),
        db.collection("diaries").createIndex({ userId: 1, updatedAt: -1 }),
        db.collection("entries").createIndex({ diaryId: 1, userId: 1, createdAt: -1 }),
        db.collection("entries").createIndex({ userId: 1, createdAt: -1 }),
    ]);
}

export async function getDatabase(): Promise<Db> {
    const client = await getMongoClient();
    const db = client.db();
    if (!indexesReady) {
        indexesReady = ensureIndexes(db).catch((error: unknown) => {
            indexesReady = undefined;
            throw error;
        });
    }
    await indexesReady;
    return db;
}
