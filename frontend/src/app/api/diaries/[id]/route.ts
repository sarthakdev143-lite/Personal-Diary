import { NextResponse } from "next/server";

import {
    DiaryDocument,
    DiaryWithId,
    EntryDocument,
    EntryWithId,
    getDatabase,
    getSessionUserId,
    serializeDiary,
    serializeEntry,
    toObjectId,
} from "../_shared";

type RouteContext = {
    params: Promise<{ id: string }>;
};

type UpdateDiaryPayload = {
    title?: unknown;
    description?: unknown;
    theme?: unknown;
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

        const payload = (await request.json()) as UpdateDiaryPayload;
        const updates: Partial<DiaryDocument> = {};

        if (payload.title !== undefined) {
            if (typeof payload.title !== "string" || payload.title.trim().length < 3) {
                return NextResponse.json({ error: "Title must be at least 3 characters." }, { status: 400 });
            }
            updates.title = payload.title.trim();
        }

        if (payload.description !== undefined) {
            if (typeof payload.description !== "string") {
                return NextResponse.json({ error: "Description must be a string." }, { status: 400 });
            }
            updates.description = payload.description.trim();
        }

        if (payload.theme !== undefined) {
            if (typeof payload.theme !== "string" || payload.theme.trim().length === 0) {
                return NextResponse.json({ error: "Theme must be a non-empty string." }, { status: 400 });
            }
            updates.theme = payload.theme.trim();
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

        const deleteDiaryResult = await diariesCollection.deleteOne({ _id: diaryId, userId });

        if (!deleteDiaryResult.deletedCount) {
            return NextResponse.json({ error: "Diary not found" }, { status: 404 });
        }

        await entriesCollection.deleteMany({ diaryId, userId });

        return NextResponse.json({ success: true });
    } catch (error) {
        console.error("Failed to delete diary", error);
        return NextResponse.json({ error: "Failed to delete diary" }, { status: 500 });
    }
}
