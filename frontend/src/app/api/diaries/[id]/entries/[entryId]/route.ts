import { NextResponse } from "next/server";

import {
    EntryDocument,
    EntryWithId,
    getDatabase,
    getSessionUserId,
    serializeEntry,
    toObjectId,
} from "../../../_shared";

type RouteContext = {
    params: Promise<{ id: string; entryId: string }>;
};

type UpdateEntryPayload = {
    content?: unknown;
    createdAt?: unknown;
};

export async function PUT(request: Request, context: RouteContext) {
    try {
        const userId = await getSessionUserId();

        if (!userId) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }

        const { id, entryId } = await context.params;
        const diaryId = toObjectId(id);
        const parsedEntryId = toObjectId(entryId);

        if (!diaryId || !parsedEntryId) {
            return NextResponse.json({ error: "Invalid diary or entry id" }, { status: 400 });
        }

        const payload = (await request.json()) as UpdateEntryPayload;
        const updates: Partial<EntryDocument> = {};

        if (payload.content !== undefined) {
            if (typeof payload.content !== "string" || !payload.content.trim().length) {
                return NextResponse.json({ error: "Content must be a non-empty string." }, { status: 400 });
            }
            updates.content = payload.content.trim();
        }

        if (payload.createdAt !== undefined) {
            if (typeof payload.createdAt !== "string") {
                return NextResponse.json({ error: "createdAt must be an ISO date string." }, { status: 400 });
            }

            const parsedCreatedAt = new Date(payload.createdAt);
            if (Number.isNaN(parsedCreatedAt.getTime())) {
                return NextResponse.json({ error: "Invalid createdAt date." }, { status: 400 });
            }
            updates.createdAt = parsedCreatedAt;
        }

        if (!Object.keys(updates).length) {
            return NextResponse.json({ error: "No valid fields provided for update." }, { status: 400 });
        }

        updates.updatedAt = new Date();

        const db = await getDatabase();
        const entriesCollection = db.collection<EntryDocument>("entries");

        const result = await entriesCollection.updateOne(
            { _id: parsedEntryId, diaryId, userId },
            { $set: updates }
        );

        if (!result.matchedCount) {
            return NextResponse.json({ error: "Entry not found" }, { status: 404 });
        }

        const updatedEntry = await entriesCollection.findOne({ _id: parsedEntryId, diaryId, userId });

        if (!updatedEntry) {
            return NextResponse.json({ error: "Entry not found after update" }, { status: 404 });
        }

        return NextResponse.json(serializeEntry(updatedEntry as EntryWithId));
    } catch (error) {
        console.error("Failed to update entry", error);
        return NextResponse.json({ error: "Failed to update entry" }, { status: 500 });
    }
}

export async function DELETE(_: Request, context: RouteContext) {
    try {
        const userId = await getSessionUserId();

        if (!userId) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }

        const { id, entryId } = await context.params;
        const diaryId = toObjectId(id);
        const parsedEntryId = toObjectId(entryId);

        if (!diaryId || !parsedEntryId) {
            return NextResponse.json({ error: "Invalid diary or entry id" }, { status: 400 });
        }

        const db = await getDatabase();
        const entriesCollection = db.collection<EntryDocument>("entries");

        const result = await entriesCollection.deleteOne({ _id: parsedEntryId, diaryId, userId });

        if (!result.deletedCount) {
            return NextResponse.json({ error: "Entry not found" }, { status: 404 });
        }

        return NextResponse.json({ success: true });
    } catch (error) {
        console.error("Failed to delete entry", error);
        return NextResponse.json({ error: "Failed to delete entry" }, { status: 500 });
    }
}
