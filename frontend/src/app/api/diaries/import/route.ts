import { NextResponse } from "next/server";

import { parseDiaryBackup } from "@/lib/diary/import";
import { readJsonBody } from "@/lib/diary/json";

import {
    DiaryDocument,
    DiaryWithId,
    EntryDocument,
    getDatabase,
    getSessionUserId,
    serializeDiary,
} from "../_shared";

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

        const parsed = parseDiaryBackup(body.value);
        if (!parsed.ok) {
            return NextResponse.json({ error: parsed.error }, { status: 400 });
        }

        const db = await getDatabase();
        const now = new Date();
        const diary: DiaryDocument = {
            userId,
            title: parsed.diary.title,
            description: parsed.diary.description,
            theme: parsed.diary.theme,
            createdAt: now,
            updatedAt: now,
        };

        const diaries = db.collection<DiaryDocument>("diaries");
        const entries = db.collection<EntryDocument>("entries");
        const inserted = await diaries.insertOne(diary);

        try {
            if (parsed.diary.entries.length) {
                await entries.insertMany(parsed.diary.entries.map((entry) => ({
                    diaryId: inserted.insertedId,
                    userId,
                    content: entry.content,
                    plainText: entry.plainText,
                    createdAt: entry.createdAt,
                    updatedAt: entry.updatedAt,
                })));
            }
        } catch (writeError) {
            await entries.deleteMany({ diaryId: inserted.insertedId, userId });
            await diaries.deleteOne({ _id: inserted.insertedId, userId });
            throw writeError;
        }

        return NextResponse.json(
            {
                diary: serializeDiary({ ...diary, _id: inserted.insertedId } as DiaryWithId),
                importedEntries: parsed.diary.entries.length,
                skippedEntries: parsed.diary.skipped,
            },
            { status: 201 }
        );
    } catch (error) {
        console.error("Failed to import diary", error);
        return NextResponse.json({ error: "Failed to import diary" }, { status: 500 });
    }
}
