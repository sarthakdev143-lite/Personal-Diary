import { NextResponse } from "next/server";

import {
    DiaryDocument,
    DiaryWithId,
    EntryDocument,
    getDatabase,
    getSessionUserId,
    hasTrustedOrigin,
    logApiError,
    serializeDiary,
} from "./_shared";

type CreateDiaryPayload = {
    title?: unknown;
    description?: unknown;
    theme?: unknown;
};

const DEFAULT_THEME = "/textures/leather-texture.jpg";

export async function GET() {
    try {
        const userId = await getSessionUserId();

        if (!userId) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }

        const db = await getDatabase();
        const diariesCollection = db.collection<DiaryDocument>("diaries");
        const entriesCollection = db.collection<EntryDocument>("entries");
        const diaries = await diariesCollection.find({ userId }).sort({ createdAt: -1 }).toArray();

        const diaryDocs = diaries as DiaryWithId[];
        const diaryIds = diaryDocs.map((diary) => diary._id);
        const entryStats = diaryIds.length
            ? await entriesCollection
                .aggregate<{ _id: EntryDocument["diaryId"]; entryCount: number; lastEntryAt: Date }>([
                    { $match: { userId, diaryId: { $in: diaryIds } } },
                    {
                        $group: {
                            _id: "$diaryId",
                            entryCount: { $sum: 1 },
                            lastEntryAt: { $max: "$createdAt" },
                        },
                    },
                ])
                .toArray()
            : [];

        const entryStatsMap = new Map(
            entryStats.map((entryStat) => [
                entryStat._id.toString(),
                { entryCount: entryStat.entryCount, lastEntryAt: entryStat.lastEntryAt.toISOString() },
            ])
        );

        return NextResponse.json(
            diaryDocs.map((diary) => {
                const serializedDiary = serializeDiary(diary);
                const stats = entryStatsMap.get(diary._id.toString());

                return {
                    ...serializedDiary,
                    entryCount: stats?.entryCount ?? 0,
                    lastEntryAt: stats?.lastEntryAt ?? null,
                };
            })
        );
    } catch (error) {
        logApiError("Failed to fetch diaries", error);
        return NextResponse.json({ error: "Failed to fetch diaries" }, { status: 500 });
    }
}

export async function POST(request: Request) {
    try {
        if (!hasTrustedOrigin(request)) {
            return NextResponse.json({ error: "Forbidden request origin." }, { status: 403 });
        }

        const userId = await getSessionUserId();

        if (!userId) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }

        const payload = (await request.json()) as CreateDiaryPayload;
        const title = typeof payload.title === "string" ? payload.title.trim() : "";
        const description = typeof payload.description === "string" ? payload.description.trim() : "";
        const theme = typeof payload.theme === "string" && payload.theme.trim().length > 0
            ? payload.theme.trim()
            : DEFAULT_THEME;

        if (title.length < 3) {
            return NextResponse.json({ error: "Title must be at least 3 characters." }, { status: 400 });
        }

        if (title.length > 120) {
            return NextResponse.json({ error: "Title must be 120 characters or fewer." }, { status: 400 });
        }

        if (description.length > 600) {
            return NextResponse.json({ error: "Description must be 600 characters or fewer." }, { status: 400 });
        }

        const now = new Date();
        const diary: DiaryDocument = {
            userId,
            title,
            description,
            theme,
            createdAt: now,
            updatedAt: now,
        };

        const db = await getDatabase();
        const diariesCollection = db.collection<DiaryDocument>("diaries");
        const result = await diariesCollection.insertOne(diary);

        return NextResponse.json(
            serializeDiary({
                ...diary,
                _id: result.insertedId,
            }),
            { status: 201 }
        );
    } catch (error) {
        logApiError("Failed to create diary", error);
        return NextResponse.json({ error: "Failed to create diary" }, { status: 500 });
    }
}
