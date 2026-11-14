import { calendarDate, hasEntryContent } from "./text";

export type EntryDraft = {
    entryId: string | null;
    content: string;
    baseline: string;
    entryDate: string;
};

export function entryDraftKey(diaryId: string): string {
    return `personal-diary-draft:${diaryId}`;
}

export function entryDraftRecord(input: {
    diaryId: string;
    entryId: string | null;
    content: string;
    baseline: string;
    entryDate: string;
    savedDate: string;
}): string | null {
    if (!input.diaryId) return null;
    const changed = input.content !== input.baseline || input.entryDate !== input.savedDate;
    if (!changed || !hasEntryContent(input.content)) return null;
    const draft: EntryDraft = {
        entryId: input.entryId,
        content: input.content,
        baseline: input.baseline,
        entryDate: input.entryDate,
    };
    return JSON.stringify(draft);
}

export function readEntryDraft(raw: string | null): EntryDraft | null {
    if (!raw) return null;
    let value: unknown;
    try {
        value = JSON.parse(raw);
    } catch {
        return null;
    }
    if (!value || typeof value !== "object") return null;
    const record = value as Partial<EntryDraft>;
    if (typeof record.content !== "string" || typeof record.baseline !== "string" || typeof record.entryDate !== "string") {
        return null;
    }
    if (record.entryId !== null && typeof record.entryId !== "string") return null;
    if (!hasEntryContent(record.content)) return null;
    return {
        entryId: record.entryId,
        content: record.content,
        baseline: record.baseline,
        entryDate: record.entryDate,
    };
}

export function offerEntryDraft<T extends { _id: string; content: string; createdAt?: string }>(
    draft: { entryId: string | null; content: string; entryDate?: string } | null,
    entries: readonly T[],
): boolean {
    if (!draft) return false;
    if (!draft.entryId) return true;
    const saved = entries.find((entry) => entry._id === draft.entryId);
    if (!saved) return true;
    if (saved.content !== draft.content) return true;
    if (!draft.entryDate || !saved.createdAt) return false;
    const created = new Date(saved.createdAt);
    if (Number.isNaN(created.getTime())) return false;
    return calendarDate(created) !== draft.entryDate;
}

export function restoredDraftTarget(
    draft: { entryId: string | null } | null,
    entries: readonly { _id: string }[],
): "edit" | "compose" {
    if (draft?.entryId && entries.some((entry) => entry._id === draft.entryId)) return "edit";
    return "compose";
}
