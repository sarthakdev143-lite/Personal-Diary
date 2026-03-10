import { NextResponse } from "next/server";

import { DiaryDocument, DiaryWithId, getDatabase, getSessionUserId, serializeDiary } from "./_shared";

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
        const diaries = await db
            .collection<DiaryDocument>("diaries")
            .find({ userId })
            .sort({ createdAt: -1 })
            .toArray();

        return NextResponse.json((diaries as DiaryWithId[]).map(serializeDiary));
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

        const payload = (await request.json()) as CreateDiaryPayload;
        const title = typeof payload.title === "string" ? payload.title.trim() : "";
        const description = typeof payload.description === "string" ? payload.description.trim() : "";
        const theme = typeof payload.theme === "string" && payload.theme.trim().length > 0
            ? payload.theme.trim()
            : DEFAULT_THEME;

        if (title.length < 3) {
            return NextResponse.json({ error: "Title must be at least 3 characters." }, { status: 400 });
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
        console.error("Failed to create diary", error);
        return NextResponse.json({ error: "Failed to create diary" }, { status: 500 });
    }
}
