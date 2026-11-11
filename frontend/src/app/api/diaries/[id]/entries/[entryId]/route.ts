import { NextResponse } from "next/server";

import { DiaryDocument, EntryDocument, serializeEntry, toObjectId } from "../../../_shared";
import { currentUser } from "@/lib/current-user";
import { apiError, readJson } from "@/lib/http";
import { getDatabase } from "@/lib/mongodb";
import { ciphertextLimit, planOf } from "@/lib/plans";
import { parseSealed } from "@/lib/sealed";

type RouteContext = { params: Promise<{ id: string; entryId: string }> };

export async function PUT(request: Request, context: RouteContext) {
    const user = await currentUser();
    if (!user) return apiError("Unauthorized", 401);

    const { id, entryId } = await context.params;
    const diaryId = toObjectId(id);
    const parsedEntryId = toObjectId(entryId);
    if (!diaryId || !parsedEntryId) return apiError("Invalid diary or entry id", 400);

    const payload = await readJson(request) as { content?: unknown } | undefined;
    if (!payload) return apiError("Invalid JSON.", 400);

    const plan = planOf(user.plan);
    const content = parseSealed(payload.content, ciphertextLimit(plan));
    if (!content) return apiError("Content must be encrypted.", 400);

    const userId = user._id.toString();
    const now = new Date();
    const db = await getDatabase();
    const entries = db.collection<EntryDocument>("entries");
    const result = await entries.updateOne(
        { _id: parsedEntryId, diaryId, userId },
        { $set: { content, updatedAt: now } }
    );
    if (!result.matchedCount) return apiError("Entry not found", 404);

    await db.collection<DiaryDocument>("diaries").updateOne({ _id: diaryId, userId }, { $set: { updatedAt: now } });
    const updated = await entries.findOne({ _id: parsedEntryId, diaryId, userId });
    if (!updated?._id) return apiError("Entry not found", 404);
    return NextResponse.json(serializeEntry({ ...updated, _id: updated._id }));
}

export async function DELETE(_: Request, context: RouteContext) {
    const user = await currentUser();
    if (!user) return apiError("Unauthorized", 401);

    const { id, entryId } = await context.params;
    const diaryId = toObjectId(id);
    const parsedEntryId = toObjectId(entryId);
    if (!diaryId || !parsedEntryId) return apiError("Invalid diary or entry id", 400);

    const userId = user._id.toString();
    const db = await getDatabase();
    const result = await db.collection<EntryDocument>("entries").deleteOne({ _id: parsedEntryId, diaryId, userId });
    if (!result.deletedCount) return apiError("Entry not found", 404);

    await db.collection<DiaryDocument>("diaries").updateOne(
        { _id: diaryId, userId },
        { $set: { updatedAt: new Date() } }
    );
    return NextResponse.json({ success: true });
}
