import { MongoClient } from "mongodb";

if (!process.env.MONGODB_URI) {
    throw new Error('Invalid/Missing environment variable: "MONGODB_URI"');
}

const uri: string = process.env.MONGODB_URI;
const options = {};

let clientPromise: Promise<MongoClient>;

declare global {
    var _mongoClientPromise: Promise<MongoClient> | undefined;
}

// Ensure `globalThis` has the correct type
const globalForMongo = global as typeof globalThis;

const connectMongo = () => {
    const nextClient = new MongoClient(uri, options);
    const connecting = nextClient.connect();
    // The promise is also awaited by requests. This keeps a refused
    // connection from surfacing as an unhandled rejection on startup.
    connecting.catch(() => undefined);
    return connecting;
};

if (process.env.NODE_ENV === "development") {
    if (!globalForMongo._mongoClientPromise) {
        globalForMongo._mongoClientPromise = connectMongo();
    }
    clientPromise = globalForMongo._mongoClientPromise;
} else {
    clientPromise = connectMongo();
}

export default clientPromise;
