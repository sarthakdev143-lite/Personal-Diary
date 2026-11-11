import type { Sealed } from "./vault";

export type DiaryRecord = {
    _id: string;
    title: Sealed | string;
    description: Sealed | string;
    theme: string;
    pinned: boolean;
    createdAt: string;
    updatedAt: string;
};

export type EntryRecord = {
    _id: string;
    diaryId: string;
    content: Sealed | string;
    createdAt: string;
    updatedAt: string;
};
