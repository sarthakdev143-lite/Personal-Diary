import { ObjectId } from "mongodb";

import type { DiaryRecord, EntryRecord } from "@/lib/records";
import type { Sealed } from "@/lib/vault";

export type DiaryDocument = {
    _id?: ObjectId;
    userId: string;
    title: Sealed;
    description: Sealed;
    theme: string;
    pinned: boolean;
    createdAt: Date;
    updatedAt: Date;
};

export type EntryDocument = {
    _id?: ObjectId;
    diaryId: ObjectId;
    userId: string;
    content: Sealed;
    createdAt: Date;
    updatedAt: Date;
};

export function toObjectId(value: string): ObjectId | null {
    if (!ObjectId.isValid(value)) return null;
    return new ObjectId(value);
}

export function serializeDiary(diary: DiaryDocument & { _id: ObjectId }): DiaryRecord {
    return {
        _id: diary._id.toString(),
        title: diary.title,
        description: diary.description,
        theme: diary.theme,
        pinned: Boolean(diary.pinned),
        createdAt: diary.createdAt.toISOString(),
        updatedAt: diary.updatedAt.toISOString(),
    };
}

export function serializeEntry(entry: EntryDocument & { _id: ObjectId }): EntryRecord {
    return {
        _id: entry._id.toString(),
        diaryId: entry.diaryId.toString(),
        content: entry.content,
        createdAt: entry.createdAt.toISOString(),
        updatedAt: entry.updatedAt.toISOString(),
    };
}
