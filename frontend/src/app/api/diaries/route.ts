import { NextResponse } from "next/server";

import { DiaryDocument, serializeDiary } from "./_shared";
import { currentUser } from "@/lib/current-user";
import { apiError, readJson } from "@/lib/http";
import { getDatabase } from "@/lib/mongodb";
import { ciphertextLimit, limits, planOf, themeProblem } from "@/lib/plans";
import { parseSealed } from "@/lib/sealed";

export async function GET() {
    const user = await currentUser();
    if (!user) return apiError("Unauthorized", 401);

    const db = await getDatabase();
    const diaries = await db.collection<DiaryDocument>("diaries")
        .find({ userId: user._id.toString() })
        .sort({ pinned: -1, updatedAt: -1 })
        .toArray();

    return NextResponse.json(diaries.flatMap((diary) => (diary._id ? [serializeDiary({ ...diary, _id: diary._id })] : [])));
}

export async function POST(request: Request) {
    const user = await currentUser();
    if (!user) return apiError("Unauthorized", 401);

    const payload = await readJson(request) as { title?: unknown; description?: unknown; theme?: unknown } | undefined;
    if (!payload) return apiError("Invalid JSON.", 400);

    const plan = planOf(user.plan);
    const maxCipher = ciphertextLimit(plan);
    const title = parseSealed(payload.title, maxCipher);
    const description = parseSealed(payload.description, maxCipher);
    const theme = typeof payload.theme === "string" ? payload.theme : "";

    if (!title || !description) return apiError("Title and description must be encrypted.", 400);
    const themeCheck = themeProblem(plan, theme);
    if (themeCheck === "unknown") return apiError("Unknown cover.", 400);
    if (themeCheck === "upgrade") return apiError("That cover is part of Pro.", 402, "upgrade");

    const db = await getDatabase();
    const userId = user._id.toString();
    const count = await db.collection<DiaryDocument>("diaries").countDocuments({ userId });
    if (count >= limits(plan).diaries) {
        return apiError("You've used every diary on this plan.", 402, "upgrade");
    }

    const now = new Date();
    const diary: DiaryDocument = {
        userId,
        title,
        description,
        theme,
        pinned: false,
        createdAt: now,
        updatedAt: now,
    };
    const result = await db.collection<DiaryDocument>("diaries").insertOne(diary);

    return NextResponse.json(serializeDiary({ ...diary, _id: result.insertedId }), { status: 201 });
}
