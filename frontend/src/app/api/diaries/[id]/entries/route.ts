import { NextResponse } from "next/server";

import {
    DiaryDocument,
    EntryDocument,
    EntryWithId,
    getDatabase,
    getSessionUserId,
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
        console.error("Failed to fetch entries", error);
        return NextResponse.json({ error: "Failed to fetch entries" }, { status: 500 });
    }
}

export async function POST(request: Request, context: RouteContext) {
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

        const payload = (await request.json()) as CreateEntryPayload;
        const content = typeof payload.content === "string" ? payload.content.trim() : "";

        if (!content.length) {
            return NextResponse.json({ error: "Content is required." }, { status: 400 });
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
        console.error("Failed to create entry", error);
        return NextResponse.json({ error: "Failed to create entry" }, { status: 500 });
    }
}
