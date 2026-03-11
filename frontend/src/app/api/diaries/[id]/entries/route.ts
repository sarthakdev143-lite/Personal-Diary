import { NextResponse } from "next/server";

import {
    consumeRateLimit,
    DiaryDocument,
    EntryDocument,
    EntryWithId,
    getDatabase,
    getSessionUserId,
    hasTrustedOrigin,
    logApiError,
    serializeEntry,
    toObjectId,
} from "../../_shared";

type RouteContext = {
    params: Promise<{ id: string }>;
};

type CreateEntryPayload = {
    content?: unknown;
    createdAt?: unknown;
};

const MAX_CONTENT_BYTES = 500 * 1024;
const CREATE_ENTRY_RATE_LIMIT = {
    max: 20,
    windowMs: 60 * 1000,
};

export async function GET(_: Request, context: RouteContext) {
    try {
        const userId = await getSessionUserId();

        if (!userId) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }

        const { id } = await context.params;
        const diaryId = toObjectId(id);

        if (!diaryId) {
            return NextResponse.json({ error: "Invalid diary id" }, { status: 400 });
        }

        const db = await getDatabase();
        const diariesCollection = db.collection<DiaryDocument>("diaries");
        const entriesCollection = db.collection<EntryDocument>("entries");

        const diary = await diariesCollection.findOne({ _id: diaryId, userId });

        if (!diary) {
            return NextResponse.json({ error: "Diary not found" }, { status: 404 });
        }

        const entries = await entriesCollection.find({ diaryId, userId }).sort({ createdAt: -1 }).toArray();
        return NextResponse.json((entries as EntryWithId[]).map(serializeEntry));
    } catch (error) {
        logApiError("Failed to fetch entries", error);
        return NextResponse.json({ error: "Failed to fetch entries" }, { status: 500 });
    }
}

export async function POST(request: Request, context: RouteContext) {
    try {
        if (!hasTrustedOrigin(request)) {
            return NextResponse.json({ error: "Forbidden request origin." }, { status: 403 });
        }

        const userId = await getSessionUserId();

        if (!userId) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }

        const { id } = await context.params;
        const diaryId = toObjectId(id);

        if (!diaryId) {
            return NextResponse.json({ error: "Invalid diary id" }, { status: 400 });
        }

        const payload = (await request.json()) as CreateEntryPayload;
        const content = typeof payload.content === "string" ? payload.content.trim() : "";

        if (!content.length) {
            return NextResponse.json({ error: "Content is required." }, { status: 400 });
        }

        if (Buffer.byteLength(content, "utf8") > MAX_CONTENT_BYTES) {
            return NextResponse.json(
                { error: "Entry content exceeds 500KB limit." },
                { status: 413 }
            );
        }

        let createdAt = new Date();
        if (payload.createdAt !== undefined) {
            if (typeof payload.createdAt !== "string") {
                return NextResponse.json({ error: "createdAt must be an ISO date string." }, { status: 400 });
            }

            const parsedCreatedAt = new Date(payload.createdAt);
            if (Number.isNaN(parsedCreatedAt.getTime())) {
                return NextResponse.json({ error: "Invalid createdAt date." }, { status: 400 });
            }
            createdAt = parsedCreatedAt;
        }

        const db = await getDatabase();
        const diariesCollection = db.collection<DiaryDocument>("diaries");
        const entriesCollection = db.collection<EntryDocument>("entries");

        const diary = await diariesCollection.findOne({ _id: diaryId, userId });

        if (!diary) {
            return NextResponse.json({ error: "Diary not found" }, { status: 404 });
        }

        const rateLimit = consumeRateLimit({
            key: `entries:create:${userId}:${diaryId.toString()}`,
            max: CREATE_ENTRY_RATE_LIMIT.max,
            windowMs: CREATE_ENTRY_RATE_LIMIT.windowMs,
        });

        if (!rateLimit.allowed) {
            return NextResponse.json(
                { error: "Too many requests. Please wait before creating another entry." },
                {
                    status: 429,
                    headers: {
                        "Retry-After": String(Math.ceil((rateLimit.resetAt - Date.now()) / 1000)),
                    },
                }
            );
        }

        const entry: EntryDocument = {
            diaryId,
            userId,
            content,
            createdAt,
            updatedAt: new Date(),
        };

        const result = await entriesCollection.insertOne(entry);

        return NextResponse.json(
            serializeEntry({
                ...entry,
                _id: result.insertedId,
            }),
            { status: 201 }
        );
    } catch (error) {
        logApiError("Failed to create entry", error);
        return NextResponse.json({ error: "Failed to create entry" }, { status: 500 });
    }
}
