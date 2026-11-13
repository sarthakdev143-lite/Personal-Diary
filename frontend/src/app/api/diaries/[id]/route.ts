import { NextResponse } from "next/server";

import { asRecord, readJsonBody } from "@/lib/diary/json";
import { normalizeDescription, normalizeThemeUpdate, normalizeTitle } from "@/lib/diary/validation";

import {
    DiaryDocument,
    DiaryWithId,
    EntryDocument,
    EntryWithId,
    backfillPlainText,
    getDatabase,
    getSessionUserId,
    serializeDiary,
    serializeEntry,
    toObjectId,
} from "../_shared";

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

        await backfillPlainText(db, userId, diaryId).catch((backfillError: unknown) => {
            console.error("Failed to backfill entry text", backfillError);
        });
        const entries = await entriesCollection.find({ diaryId, userId }).sort({ createdAt: -1 }).toArray();

        return NextResponse.json({
            diary: serializeDiary(diary as DiaryWithId),
            entries: (entries as EntryWithId[]).map(serializeEntry),
        });
    } catch (error) {
        console.error("Failed to fetch diary", error);
        return NextResponse.json({ error: "Failed to fetch diary" }, { status: 500 });
    }
}

export async function PUT(request: Request, context: RouteContext) {
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

        const updates: Partial<DiaryDocument> = {};

        if (payload.title !== undefined) {
            const title = normalizeTitle(payload.title);
            if (!title.ok) {
                return NextResponse.json({ error: title.error }, { status: 400 });
            }
            updates.title = title.value;
        }

        if (payload.description !== undefined) {
            const description = normalizeDescription(payload.description);
            if (!description.ok) {
                return NextResponse.json({ error: description.error }, { status: 400 });
            }
            updates.description = description.value;
        }

        if (payload.theme !== undefined) {
            const theme = normalizeThemeUpdate(payload.theme);
            if (!theme.ok) {
                return NextResponse.json({ error: theme.error }, { status: 400 });
            }
            updates.theme = theme.value;
        }

        if (!Object.keys(updates).length) {
            return NextResponse.json({ error: "No valid fields provided for update." }, { status: 400 });
        }

        updates.updatedAt = new Date();

        const db = await getDatabase();
        const diariesCollection = db.collection<DiaryDocument>("diaries");

        const result = await diariesCollection.updateOne(
            { _id: diaryId, userId },
            { $set: updates }
        );

        if (!result.matchedCount) {
            return NextResponse.json({ error: "Diary not found" }, { status: 404 });
        }

        const updatedDiary = await diariesCollection.findOne({ _id: diaryId, userId });

        if (!updatedDiary) {
            return NextResponse.json({ error: "Diary not found after update" }, { status: 404 });
        }

        return NextResponse.json(serializeDiary(updatedDiary as DiaryWithId));
    } catch (error) {
        console.error("Failed to update diary", error);
        return NextResponse.json({ error: "Failed to update diary" }, { status: 500 });
    }
}

export async function DELETE(_: Request, context: RouteContext) {
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

        await entriesCollection.deleteMany({ diaryId, userId });
        await diariesCollection.deleteOne({ _id: diaryId, userId });

        return NextResponse.json({ success: true });
    } catch (error) {
        console.error("Failed to delete diary", error);
        return NextResponse.json({ error: "Failed to delete diary" }, { status: 500 });
    }
}
