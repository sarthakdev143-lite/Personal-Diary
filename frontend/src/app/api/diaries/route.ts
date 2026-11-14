import { NextResponse } from "next/server";

import { asRecord, readJsonBody } from "@/lib/diary/json";
import { diaryListMatch, normalizeSearchQuery } from "@/lib/diary/search";
import { normalizeDescription, normalizeTheme, normalizeTitle } from "@/lib/diary/validation";

import { backfillPlainText, DiaryDocument, DiaryWithId, EntryDocument, getDatabase, getSessionUserId, serializeDiary } from "./_shared";

export async function GET(request: Request) {
    try {
        const userId = await getSessionUserId();

        if (!userId) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }

        const query = normalizeSearchQuery(new URL(request.url).searchParams.get("q") ?? "");
        const db = await getDatabase();
        await backfillPlainText(db, userId).catch((backfillError: unknown) => {
            console.error("Failed to backfill entry text", backfillError);
        });
        const diaries = await db
            .collection<DiaryDocument>("diaries")
            .find({ userId })
            .sort({ updatedAt: -1, createdAt: -1 })
            .toArray();

        if (!query) {
            return NextResponse.json((diaries as DiaryWithId[]).map(serializeDiary));
        }

        const notes = await db.collection<EntryDocument>("entries")
            .find({ userId })
            .project({ diaryId: 1, content: 1, plainText: 1, createdAt: 1, updatedAt: 1 })
            .toArray();
        const byDiary = new Map<string, Array<{ content: string; plainText?: string | null; createdAt: string; updatedAt: string }>>();
        for (const note of notes) {
            const id = String(note.diaryId);
            const group = byDiary.get(id) ?? [];
            group.push({
                content: note.content,
                plainText: note.plainText,
                createdAt: note.createdAt.toISOString(),
                updatedAt: note.updatedAt.toISOString(),
            });
            byDiary.set(id, group);
        }

        const visible = (diaries as DiaryWithId[]).flatMap((diary) => {
            const match = diaryListMatch(
                { title: diary.title, description: diary.description },
                byDiary.get(String(diary._id)) ?? [],
                query,
            );
            if (!match.matched) return [];
            return [{ ...serializeDiary(diary), match: match.snippet }];
        });

        return NextResponse.json(visible);
    } catch (error) {
        console.error("Failed to fetch diaries", error);
        return NextResponse.json({ error: "Failed to fetch diaries" }, { status: 500 });
    }
}

export async function POST(request: Request) {
    try {
        const userId = await getSessionUserId();

        if (!userId) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }

        const body = await readJsonBody(request);
        if (!body.ok) {
            return NextResponse.json({ error: body.error }, { status: 400 });
        }

        const payload = asRecord(body.value);
        if (!payload) {
            return NextResponse.json({ error: "Request body must be a JSON object." }, { status: 400 });
        }

        const title = normalizeTitle(payload.title);
        if (!title.ok) {
            return NextResponse.json({ error: title.error }, { status: 400 });
        }

        const description = normalizeDescription(payload.description);
        if (!description.ok) {
            return NextResponse.json({ error: description.error }, { status: 400 });
        }

        const theme = normalizeTheme(payload.theme);
        if (!theme.ok) {
            return NextResponse.json({ error: theme.error }, { status: 400 });
        }

        const now = new Date();
        const diary: DiaryDocument = {
            userId,
            title: title.value,
            description: description.value,
            theme: theme.value,
            createdAt: now,
            updatedAt: now,
        };

        const db = await getDatabase();
        const result = await db.collection<DiaryDocument>("diaries").insertOne(diary);

        return NextResponse.json(
            serializeDiary({
                ...diary,
                _id: result.insertedId,
            }),
            { status: 201 }
        );
    } catch (error) {
        console.error("Failed to create diary", error);
        return NextResponse.json({ error: "Failed to create diary" }, { status: 500 });
    }
}
