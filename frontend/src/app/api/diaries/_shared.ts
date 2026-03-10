import { getServerSession } from "next-auth";
import type { Session } from "next-auth";
import { Db, ObjectId } from "mongodb";

import { authOptions } from "@/lib/auth";
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

export async function getDatabase(): Promise<Db> {
    const client = await clientPromise;
    return client.db();
}

export function toObjectId(value: string): ObjectId | null {
    if (!ObjectId.isValid(value)) {
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
    return {
        _id: entry._id.toString(),
        diaryId: entry.diaryId.toString(),
        userId: entry.userId,
        content: entry.content,
        createdAt: entry.createdAt,
        updatedAt: entry.updatedAt,
    };
}
