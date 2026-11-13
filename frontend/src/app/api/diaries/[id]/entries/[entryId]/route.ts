import { NextResponse } from "next/server";

import { prepareEntryContent } from "@/lib/diary/content";
import { asRecord, readJsonBody } from "@/lib/diary/json";
import { parseEntryDate } from "@/lib/diary/validation";

import {
    EntryDocument,
    EntryWithId,
    getDatabase,
    getSessionUserId,
    serializeEntry,
    toObjectId,
    touchDiary,
} from "../../../_shared";

type RouteContext = {
    params: Promise<{ id: string; entryId: string }>;
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

        const body = await readJsonBody(request);
        if (!body.ok) {
            return NextResponse.json({ error: body.error }, { status: 400 });
        }

        const payload = asRecord(body.value);
        if (!payload) {
            return NextResponse.json({ error: "Request body must be a JSON object." }, { status: 400 });
        }

        const updates: Partial<EntryDocument> = {};

        if (payload.content !== undefined) {
            const prepared = prepareEntryContent(payload.content);
            if (!prepared.ok) {
                return NextResponse.json({ error: prepared.error }, { status: 400 });
            }
            updates.content = prepared.content;
            updates.plainText = prepared.plainText;
        }

        if (payload.createdAt !== undefined) {
            const parsedCreatedAt = parseEntryDate(payload.createdAt);
            if (!parsedCreatedAt.ok) {
                return NextResponse.json({ error: parsedCreatedAt.error }, { status: 400 });
            }
            updates.createdAt = parsedCreatedAt.value;
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

        await touchDiary(db, diaryId, userId, updates.updatedAt);

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

        await touchDiary(db, diaryId, userId);

        return NextResponse.json({ success: true });
    } catch (error) {
        console.error("Failed to delete entry", error);
        return NextResponse.json({ error: "Failed to delete entry" }, { status: 500 });
    }
}
