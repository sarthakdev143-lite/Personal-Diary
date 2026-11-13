import { NextResponse } from "next/server";

import { prepareEntryContent } from "@/lib/diary/content";
import { asRecord, readJsonBody } from "@/lib/diary/json";
import { parseEntryDate } from "@/lib/diary/validation";

import {
    DiaryDocument,
    EntryDocument,
    EntryWithId,
    getDatabase,
    getSessionUserId,
    serializeEntry,
    toObjectId,
    touchDiary,
} from "../../_shared";

type RouteContext = {
    params: Promise<{ id: string }>;
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

        const body = await readJsonBody(request);
        if (!body.ok) {
            return NextResponse.json({ error: body.error }, { status: 400 });
        }

        const payload = asRecord(body.value);
        if (!payload) {
            return NextResponse.json({ error: "Request body must be a JSON object." }, { status: 400 });
        }

        const prepared = prepareEntryContent(payload.content);
        if (!prepared.ok) {
            return NextResponse.json({ error: prepared.error }, { status: 400 });
        }

        let createdAt = new Date();
        if (payload.createdAt !== undefined) {
            const parsedCreatedAt = parseEntryDate(payload.createdAt);
            if (!parsedCreatedAt.ok) {
                return NextResponse.json({ error: parsedCreatedAt.error }, { status: 400 });
            }
            createdAt = parsedCreatedAt.value;
        }

        const db = await getDatabase();
        const diariesCollection = db.collection<DiaryDocument>("diaries");
        const entriesCollection = db.collection<EntryDocument>("entries");

        const diary = await diariesCollection.findOne({ _id: diaryId, userId });

        if (!diary) {
            return NextResponse.json({ error: "Diary not found" }, { status: 404 });
        }

        const updatedAt = new Date();
        const entry: EntryDocument = {
            diaryId,
            userId,
            content: prepared.content,
            plainText: prepared.plainText,
            createdAt,
            updatedAt,
        };

        const result = await entriesCollection.insertOne(entry);
        await touchDiary(db, diaryId, userId, updatedAt);

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
