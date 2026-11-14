import { NextResponse } from "next/server";

import { buildDiaryExport, contentDisposition } from "@/lib/diary/export";

import {
    DiaryDocument,
    EntryDocument,
    getDatabase,
    getSessionUserId,
    toObjectId,
} from "../../_shared";

type RouteContext = {
    params: Promise<{ id: string }>;
};

export async function GET(request: Request, context: RouteContext) {
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
        const diary = await db.collection<DiaryDocument>("diaries").findOne({ _id: diaryId, userId });

        if (!diary) {
            return NextResponse.json({ error: "Diary not found" }, { status: 404 });
        }

        const entries = await db.collection<EntryDocument>("entries")
            .find({ diaryId, userId })
            .sort({ createdAt: 1 })
            .toArray();

        const format = new URL(request.url).searchParams.get("format") ?? "md";
        const built = buildDiaryExport(
            {
                title: diary.title,
                description: diary.description,
                theme: diary.theme,
                pinned: diary.pinned === true,
            },
            entries.map((entry) => ({
                content: entry.content,
                createdAt: entry.createdAt.toISOString(),
                updatedAt: entry.updatedAt.toISOString(),
            })),
            format,
            new Date().toISOString(),
        );

        if (!built.ok) {
            return NextResponse.json({ error: built.error }, { status: 400 });
        }

        return new NextResponse(built.export.body, {
            status: 200,
            headers: {
                "Content-Type": built.export.contentType,
                "Content-Disposition": contentDisposition(built.export.filename),
                "Cache-Control": "no-store",
                "X-Content-Type-Options": "nosniff",
            },
        });
    } catch (error) {
        console.error("Failed to export diary", error);
        return NextResponse.json({ error: "Failed to export diary" }, { status: 500 });
    }
}
