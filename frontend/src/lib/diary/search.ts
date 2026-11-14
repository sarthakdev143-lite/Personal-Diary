import { SEARCH_MAX } from "./constants";
import { entryListSearchText, entryWasRevised, entryWritingText, formatDiaryDate, formatEntryLong, formatEntryTime } from "./text";

type RegexQuery = { $regex: string; $options: "i" };

export type EntrySearchFilter = {
    userId: string;
    $or: [
        { plainText: RegexQuery },
        { plainText: { $exists: false }; content: RegexQuery },
    ];
};

export function normalizeSearchQuery(value: string): string {
    return value.trim().slice(0, SEARCH_MAX);
}

export function escapeRegExp(value: string): string {
    return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

export function diaryFieldsMatch(title: string, description: string, rawQuery: string): boolean {
    const query = normalizeSearchQuery(rawQuery).toLowerCase();
    if (!query) return true;
    return title.toLowerCase().includes(query) || description.toLowerCase().includes(query);
}

export function entryMatchesListQuery(entry: {
    content: string;
    plainText?: string | null;
    createdAt: string;
    updatedAt: string;
}, rawQuery: string): boolean {
    return diaryFieldsMatch(entryListSearchText(entry), "", rawQuery);
}

type ListedEntry = {
    id?: string;
    content: string;
    plainText?: string | null;
    createdAt: string;
    updatedAt: string;
};

function matchingPiece(entry: ListedEntry, query: string): string {
    const writing = entry.plainText?.trim() || entryWritingText(entry.content);
    const clock = formatEntryTime(entry.createdAt);
    const looseClock = clock.replace(/^0/, "");
    const pieces = [writing, formatEntryLong(entry.createdAt), formatDiaryDate(entry.createdAt), clock];
    if (looseClock !== clock) pieces.push(looseClock);
    if (entryWasRevised(entry.createdAt, entry.updatedAt)) pieces.push("edited");
    const needle = query.toLowerCase();
    const piece = pieces.find((item) => item.toLowerCase().includes(needle)) ?? entryListSearchText(entry);
    if (piece.length <= 90) return piece;
    const index = piece.toLowerCase().indexOf(needle);
    const start = Math.max(0, index - 28);
    const end = Math.min(piece.length, Math.max(index, 0) + query.length + 36);
    let snippet = piece.slice(start, end).trim();
    if (start > 0) snippet = `…${snippet}`;
    if (end < piece.length) snippet = `${snippet}…`;
    return snippet;
}

export function entryCardPreview(entry: {
    content: string;
    plainText?: string | null;
    createdAt: string;
    updatedAt: string;
}, rawQuery: string): string {
    const writing = entry.plainText?.trim() || entryWritingText(entry.content);
    const query = normalizeSearchQuery(rawQuery);
    if (!query) return writing.slice(0, 90);
    return matchingPiece(entry, query);
}

export function entryMatchCount(text: string, rawQuery: string): number {
    const query = normalizeSearchQuery(rawQuery);
    if (!query) return 0;
    const haystack = text.toLowerCase();
    const needle = query.toLowerCase();
    let count = 0;
    let from = 0;
    while (from <= haystack.length - needle.length) {
        const index = haystack.indexOf(needle, from);
        if (index < 0) break;
        count += 1;
        from = index + needle.length;
    }
    return count;
}

export function entryMatchCursor(count: number, current: number, direction: "next" | "previous"): number {
    if (count <= 0) return 0;
    const index = ((current % count) + count) % count;
    if (direction === "next") return (index + 1) % count;
    return (index - 1 + count) % count;
}

export function diaryListMatch(
    diary: { title: string; description?: string | null },
    entries: readonly ListedEntry[],
    rawQuery: string,
): { matched: boolean; snippet: string | null; entryId: string | null } {
    const query = normalizeSearchQuery(rawQuery);
    if (!query) return { matched: true, snippet: null, entryId: null };
    if (diaryFieldsMatch(diary.title, diary.description ?? "", query)) {
        return { matched: true, snippet: null, entryId: null };
    }

    const hits = entries
        .filter((entry) => entryMatchesListQuery(entry, query))
        .sort((left, right) => Date.parse(right.createdAt) - Date.parse(left.createdAt));
    const newest = hits[0];
    if (!newest) return { matched: false, snippet: null, entryId: null };
    return { matched: true, snippet: matchingPiece(newest, query), entryId: newest.id || null };
}

export function diaryMatchPath(diaryId: string, entryId: string | null | undefined): string {
    if (!entryId) return `/diary/${diaryId}`;
    return `/diary/${diaryId}?entry=${encodeURIComponent(entryId)}`;
}

export function entryPageAddress(
    diaryId: string,
    entryId: string | null,
    mode: "compose" | "view" | "edit",
): string {
    if (mode === "compose") return diaryMatchPath(diaryId, null);
    return diaryMatchPath(diaryId, entryId);
}

export function entryShareAddress(origin: string, diaryId: string, entryId: string | null): string {
    const base = origin.trim().replace(/\/+$/, "");
    return `${base}${entryPageAddress(diaryId, entryId, "view")}`;
}

export function buildEntrySearchFilter(userId: string, rawQuery: string): EntrySearchFilter | null {
    const query = normalizeSearchQuery(rawQuery);
    if (!query) return null;

    const pattern: RegexQuery = { $regex: escapeRegExp(query), $options: "i" };
    return {
        userId,
        $or: [
            { plainText: pattern },
            { plainText: { $exists: false }, content: pattern },
        ],
    };
}
