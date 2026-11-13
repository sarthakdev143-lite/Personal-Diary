import { NextResponse } from "next/server";

import { asRecord, readJsonBody } from "@/lib/diary/json";
import { buildEntrySearchFilter, diaryFieldsMatch, normalizeSearchQuery } from "@/lib/diary/search";
import { normalizeDescription, normalizeTheme, normalizeTitle } from "@/lib/diary/validation";

import { DiaryDocument, DiaryWithId, EntryDocument, getDatabase, getSessionUserId, serializeDiary } from "./_shared";

export async function GET(request: Request) {
    try {
        const userId = await getSessionUserId();

        if (!userId) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }

        const query = normalizeSearchQuery(new URL(request.url).searchParams.get("q") ?? "");
        const db = await getDatabase();
        const diaries = await db
            .collection<DiaryDocument>("diaries")
            .find({ userId })
            .sort({ updatedAt: -1, createdAt: -1 })
            .toArray();

        let visible = diaries as DiaryWithId[];
        if (query) {
            const entryFilter = buildEntrySearchFilter(userId, query);
            const hits = entryFilter
                ? await db.collection<EntryDocument>("entries").find(entryFilter).project({ diaryId: 1 }).toArray()
                : [];
            const hitIds = new Set(hits.map((hit) => String(hit.diaryId)));
            visible = visible.filter((diary) =>
                diaryFieldsMatch(diary.title, diary.description ?? "", query) || hitIds.has(String(diary._id))
            );
        }

        return NextResponse.json(visible.map(serializeDiary));
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
