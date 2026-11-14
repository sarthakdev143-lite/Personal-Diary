import { getServerSession } from "next-auth";
import type { Session } from "next-auth";
import { Db, ObjectId } from "mongodb";

import { authOptions } from "@/lib/auth";
import { isObjectId } from "@/lib/diary/ids";
import { presentEntry } from "@/lib/diary/content";
import { storedPlainText } from "@/lib/diary/text";
import clientPromise from "@/lib/mongodb";

export type DiaryDocument = {
    _id?: ObjectId;
    userId: string;
    title: string;
    description: string;
    theme: string;
    createdAt: Date;
    updatedAt: Date;
};

export type EntryDocument = {
    _id?: ObjectId;
    diaryId: ObjectId;
    userId: string;
    content: string;
    plainText?: string;
    createdAt: Date;
    updatedAt: Date;
};

export type DiaryWithId = DiaryDocument & { _id: ObjectId };
export type EntryWithId = EntryDocument & { _id: ObjectId };

type SessionWithId = Session & {
    user?: Session["user"] & { id?: string };
};

export async function getSessionUserId(): Promise<string | null> {
    const session = await getServerSession(authOptions);
    const userId = (session as SessionWithId | null)?.user?.id;
    return userId ?? null;
}

let indexPromise: Promise<void> | null = null;

export async function getDatabase(): Promise<Db> {
    const client = await clientPromise;
    const db = client.db();
    await ensureIndexes(db);
    return db;
}

function ensureIndexes(db: Db): Promise<void> {
    if (!indexPromise) {
        indexPromise = Promise.all([
            db.collection("diaries").createIndex({ userId: 1, updatedAt: -1 }),
            db.collection("entries").createIndex({ diaryId: 1, userId: 1, createdAt: -1 }),
            db.collection("entries").createIndex({ userId: 1 }),
        ]).then(() => undefined).catch((error: unknown) => {
            indexPromise = null;
            throw error;
        });
    }

    return indexPromise;
}

export async function backfillPlainText(db: Db, userId: string, diaryId?: ObjectId) {
    const filter: { userId: string; diaryId?: ObjectId; plainText: { $exists: false } } = {
        userId,
        plainText: { $exists: false },
    };
    if (diaryId) filter.diaryId = diaryId;

    const missing = await db.collection<EntryDocument>("entries").find(filter).limit(25).toArray();
    await Promise.all(missing.map((entry) => {
        const stored = storedPlainText(entry);
        return db.collection<EntryDocument>("entries").updateOne(
            { _id: entry._id, userId, plainText: { $exists: false } },
            { $set: { plainText: stored.plainText } }
        );
    }));
}

export async function touchDiary(db: Db, diaryId: ObjectId, userId: string, updatedAt = new Date()) {
    await db.collection<DiaryDocument>("diaries").updateOne(
        { _id: diaryId, userId },
        { $set: { updatedAt } }
    );
}

export function toObjectId(value: string): ObjectId | null {
    if (!isObjectId(value)) {
        return null;
    }

    return new ObjectId(value);
}

export function serializeDiary(diary: DiaryWithId) {
    return {
        _id: diary._id.toString(),
        userId: diary.userId,
        title: diary.title,
        description: diary.description,
        theme: diary.theme,
        createdAt: diary.createdAt,
        updatedAt: diary.updatedAt,
    };
}

export function serializeEntry(entry: EntryWithId) {
    const presented = presentEntry(entry);
    return {
        _id: entry._id.toString(),
        diaryId: entry.diaryId.toString(),
        userId: entry.userId,
        content: presented.content,
        plainText: presented.plainText,
        createdAt: entry.createdAt,
        updatedAt: entry.updatedAt,
    };
}
