import { SEARCH_MAX } from "./constants";

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
