import { NextResponse } from "next/server";

import { DiaryDocument, EntryDocument, serializeEntry, toObjectId } from "../../_shared";
import { currentUser } from "@/lib/current-user";
import { apiError, readJson } from "@/lib/http";
import { getDatabase } from "@/lib/mongodb";
import { ciphertextLimit, limits, planOf } from "@/lib/plans";
import { parseSealed } from "@/lib/sealed";

type RouteContext = { params: Promise<{ id: string }> };

export async function GET(_: Request, context: RouteContext) {
    const user = await currentUser();
    if (!user) return apiError("Unauthorized", 401);

    const diaryId = toObjectId((await context.params).id);
    if (!diaryId) return apiError("Invalid diary id", 400);

    const userId = user._id.toString();
    const db = await getDatabase();
    const diary = await db.collection<DiaryDocument>("diaries").findOne({ _id: diaryId, userId });
    if (!diary) return apiError("Diary not found", 404);

    const entries = await db.collection<EntryDocument>("entries")
        .find({ diaryId, userId })
        .sort({ createdAt: -1 })
        .toArray();

    return NextResponse.json(entries.flatMap((entry) => (entry._id ? [serializeEntry({ ...entry, _id: entry._id })] : [])));
}

export async function POST(request: Request, context: RouteContext) {
    const user = await currentUser();
    if (!user) return apiError("Unauthorized", 401);

    const diaryId = toObjectId((await context.params).id);
    if (!diaryId) return apiError("Invalid diary id", 400);

    const payload = await readJson(request) as { content?: unknown } | undefined;
    if (!payload) return apiError("Invalid JSON.", 400);

    const plan = planOf(user.plan);
    const content = parseSealed(payload.content, ciphertextLimit(plan));
    if (!content) return apiError("Content must be encrypted.", 400);

    const userId = user._id.toString();
    const db = await getDatabase();
    const diary = await db.collection<DiaryDocument>("diaries").findOne({ _id: diaryId, userId });
    if (!diary) return apiError("Diary not found", 404);

    const count = await db.collection<EntryDocument>("entries").countDocuments({ diaryId, userId });
    if (count >= limits(plan).entriesPerDiary) {
        return apiError("This diary has used every entry on this plan.", 402, "upgrade");
    }

    const now = new Date();
    const entry: EntryDocument = { diaryId, userId, content, createdAt: now, updatedAt: now };
    const result = await db.collection<EntryDocument>("entries").insertOne(entry);
    await db.collection<DiaryDocument>("diaries").updateOne({ _id: diaryId, userId }, { $set: { updatedAt: now } });

    return NextResponse.json(serializeEntry({ ...entry, _id: result.insertedId }), { status: 201 });
}
