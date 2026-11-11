import { NextResponse } from "next/server";

import { DiaryDocument, EntryDocument, serializeDiary, serializeEntry, toObjectId } from "../_shared";
import { currentUser } from "@/lib/current-user";
import { apiError, readJson } from "@/lib/http";
import { getDatabase } from "@/lib/mongodb";
import { ciphertextLimit, planOf, themeProblem } from "@/lib/plans";
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
    if (!diary?._id) return apiError("Diary not found", 404);

    const entries = await db.collection<EntryDocument>("entries")
        .find({ diaryId, userId })
        .sort({ createdAt: -1 })
        .toArray();

    return NextResponse.json({
        diary: serializeDiary({ ...diary, _id: diary._id }),
        entries: entries.flatMap((entry) => (entry._id ? [serializeEntry({ ...entry, _id: entry._id })] : [])),
    });
}

export async function PUT(request: Request, context: RouteContext) {
    const user = await currentUser();
    if (!user) return apiError("Unauthorized", 401);

    const diaryId = toObjectId((await context.params).id);
    if (!diaryId) return apiError("Invalid diary id", 400);

    const payload = await readJson(request) as {
        title?: unknown;
        description?: unknown;
        theme?: unknown;
        pinned?: unknown;
    } | undefined;
    if (!payload) return apiError("Invalid JSON.", 400);

    const plan = planOf(user.plan);
    const maxCipher = ciphertextLimit(plan);
    const updates: Partial<DiaryDocument> = {};

    if ("title" in payload) {
        const title = parseSealed(payload.title, maxCipher);
        if (!title) return apiError("Title must be encrypted.", 400);
        updates.title = title;
    }
    if ("description" in payload) {
        const description = parseSealed(payload.description, maxCipher);
        if (!description) return apiError("Description must be encrypted.", 400);
        updates.description = description;
    }
    if ("theme" in payload) {
        if (typeof payload.theme !== "string") return apiError("Unknown cover.", 400);
        const themeCheck = themeProblem(plan, payload.theme);
        if (themeCheck === "unknown") return apiError("Unknown cover.", 400);
        if (themeCheck === "upgrade") return apiError("That cover is part of Pro.", 402, "upgrade");
        updates.theme = payload.theme;
    }
    if ("pinned" in payload) {
        if (typeof payload.pinned !== "boolean") return apiError("Pinned must be true or false.", 400);
        if (payload.pinned && plan !== "pro") return apiError("Pinning is part of Pro.", 402, "upgrade");
        updates.pinned = payload.pinned;
    }
    if (!Object.keys(updates).length) return apiError("No valid fields provided for update.", 400);

    updates.updatedAt = new Date();
    const userId = user._id.toString();
    const db = await getDatabase();
    const diaries = db.collection<DiaryDocument>("diaries");
    const result = await diaries.updateOne({ _id: diaryId, userId }, { $set: updates });
    if (!result.matchedCount) return apiError("Diary not found", 404);

    const updated = await diaries.findOne({ _id: diaryId, userId });
    if (!updated?._id) return apiError("Diary not found", 404);
    return NextResponse.json(serializeDiary({ ...updated, _id: updated._id }));
}

export async function DELETE(_: Request, context: RouteContext) {
    const user = await currentUser();
    if (!user) return apiError("Unauthorized", 401);

    const diaryId = toObjectId((await context.params).id);
    if (!diaryId) return apiError("Invalid diary id", 400);

    const userId = user._id.toString();
    const db = await getDatabase();
    const deleted = await db.collection<DiaryDocument>("diaries").deleteOne({ _id: diaryId, userId });
    if (!deleted.deletedCount) return apiError("Diary not found", 404);

    await db.collection<EntryDocument>("entries").deleteMany({ diaryId, userId });
    return NextResponse.json({ success: true });
}
