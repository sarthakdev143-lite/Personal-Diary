import { SEARCH_MAX } from "./constants";
import { entryInMonth, entrySearchParts, entrySearchWriting, entryToOpenFromLink, entryToShowOnOpen, entryWasRevised, formatDiaryDate, formatEntryLong, formatEntryTime } from "./text";

type RegexQuery = { $regex: string; $options: "i" };

export type EntrySearchFilter = {
    userId: string;
    $or: [
        { plainText: RegexQuery },
        { plainText: { $exists: false }; content: RegexQuery },
    ];
};

export function normalizeSearchQuery(value: string): string {
    return searchSpans(value.trim().slice(0, SEARCH_MAX)).text;
}

export function escapeRegExp(value: string): string {
    return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function foldedIncludes(text: string, query: string): boolean {
    return searchSpans(text).text.toLowerCase().includes(query.toLowerCase());
}

function matchRange(text: string, query: string): { start: number; end: number } | null {
    const hay = searchSpans(text);
    const index = hay.text.toLowerCase().indexOf(query.toLowerCase());
    const start = hay.spans[index];
    const end = hay.spans[index + query.length - 1];
    if (index < 0 || !start || !end) return null;
    return { start: start.start, end: end.end };
}

// One line of a diary title fits about this many characters.
const TITLE_LINE = 21;
const TITLE_LEAD = 8;
const TITLE_TAIL = 8;
const TITLE_WINDOW = 19;

function titleWindow(title: string, range: { start: number; end: number }): string {
    for (let lead = TITLE_LEAD; lead >= 0; lead -= 1) {
        const start = Math.max(0, range.start - lead);
        const body = title.slice(start, Math.min(title.length, range.end + TITLE_TAIL)).trim();
        const atWord = start === 0 || (/\s/.test(title[start - 1] ?? "") && !/\s/.test(body[0] ?? ""));
        if ((body.length <= TITLE_WINDOW && atWord) || lead === 0) {
            return start > 0 ? `…${body}` : body;
        }
    }
    return title;
}

export function titleCardText(title: string, rawQuery: string): string {
    const query = normalizeSearchQuery(rawQuery);
    if (!query) return title;
    const range = matchRange(title, query);
    if (!range || range.end <= TITLE_LINE) return title;
    return titleWindow(title, range);
}

export function diaryFieldsMatch(title: string, description: string, rawQuery: string): boolean {
    const query = normalizeSearchQuery(rawQuery).toLowerCase();
    if (!query) return true;
    return foldedIncludes(title, query) || foldedIncludes(description, query);
}

export function entryMatchesListQuery(entry: {
    content: string;
    plainText?: string | null;
    createdAt: string;
    updatedAt: string;
}, rawQuery: string): boolean {
    const query = normalizeSearchQuery(rawQuery).toLowerCase();
    if (!query) return true;
    if (entrySearchParts(entry).some((part) => foldedIncludes(part, query))) return true;
    const writing = entrySearchWriting(entry);
    const date = formatEntryLong(entry.createdAt);
    if (!writing || !date || date === "—") return false;
    return foldedIncludes(`${date} ${writing}`, query);
}

export function entriesForQuery<T extends {
    content: string;
    plainText?: string | null;
    createdAt: string | Date;
    updatedAt: string | Date;
}>(entries: readonly T[], rawQuery: string): T[] {
    const query = normalizeSearchQuery(rawQuery);
    if (!query) return [...entries];
    return entries.filter((entry) => entryMatchesListQuery({
        content: entry.content,
        plainText: entry.plainText,
        createdAt: entry.createdAt instanceof Date ? entry.createdAt.toISOString() : entry.createdAt,
        updatedAt: entry.updatedAt instanceof Date ? entry.updatedAt.toISOString() : entry.updatedAt,
    }, query));
}

type ListedEntry = {
    id?: string;
    content: string;
    plainText?: string | null;
    createdAt: string;
    updatedAt: string;
};

// Two lines of a diary card fit about this many characters.
const CARD_OPENING = 48;
// Two lines of an entry card fit about this many characters.
const ENTRY_LINE = 76;

function matchWindow(text: string, query: string, fit = CARD_OPENING): string {
    const range = matchRange(text, query);
    const index = range ? range.start : text.toLowerCase().indexOf(query.toLowerCase());
    const matchLength = range ? range.end - range.start : query.length;
    const lead = Math.min(28, Math.max(0, fit - matchLength));
    const start = Math.max(0, index - lead);
    const end = Math.min(text.length, Math.max(index, 0) + matchLength + 36);
    let snippet = text.slice(start, end).trim();
    if (start > 0) snippet = `…${snippet}`;
    if (end < text.length) snippet = `${snippet}…`;
    return snippet;
}

function textWindow(text: string, query: string, visible = 90): string {
    const range = matchRange(text, query);
    const index = range ? range.start : text.toLowerCase().indexOf(query.toLowerCase());
    if (text.length <= 90 && index < visible) return text;
    return matchWindow(text, query, visible);
}

function matchingPiece(entry: ListedEntry, query: string, visible = 90): string {
    const writing = entrySearchWriting(entry);
    const needle = query.toLowerCase();
    const date = formatEntryLong(entry.createdAt);
    const page = date && date !== "—" && writing ? `${date} ${writing}` : writing;
    const piece = entrySearchParts(entry).find((item) => foldedIncludes(item, needle)) ?? page;
    return textWindow(piece, query, visible);
}

function descriptionSnippet(description: string, query: string): string | null {
    const opening = description.length <= CARD_OPENING ? description : description.slice(0, CARD_OPENING);
    if (foldedIncludes(opening, query)) return null;
    return matchWindow(description, query);
}

export function entryCardClock(createdAt: string, updatedAt: string): { time: string; edited: boolean } {
    return {
        time: formatEntryTime(createdAt),
        edited: entryWasRevised(createdAt, updatedAt),
    };
}

export function entryCardPreview(entry: {
    content: string;
    plainText?: string | null;
    createdAt: string;
    updatedAt: string;
}, rawQuery: string): string {
    const writing = entrySearchWriting(entry);
    const query = normalizeSearchQuery(rawQuery);
    if (!query) return writing.slice(0, 90);
    if (foldedIncludes(writing, query)) return matchingPiece(entry, query, ENTRY_LINE);
    if (entrySearchParts(entry).some((part) => foldedIncludes(part, query))) return writing.slice(0, 90);
    const date = formatEntryLong(entry.createdAt);
    const page = date && date !== "—" && writing ? `${date} ${writing}` : writing;
    if (foldedIncludes(page, query)) return matchingPiece(entry, query, ENTRY_LINE);
    return writing.slice(0, 90);
}

export function matchedTextParts(text: string, rawQuery: string): { text: string; match: boolean }[] {
    const query = normalizeSearchQuery(rawQuery);
    if (!text) return [];
    if (!query) return [{ text, match: false }];
    const hay = searchSpans(text);
    const haystack = hay.text.toLowerCase();
    const needle = query.toLowerCase();
    const parts: { text: string; match: boolean }[] = [];
    let cursor = 0;
    let from = 0;
    while (from <= haystack.length - needle.length) {
        const index = haystack.indexOf(needle, from);
        if (index < 0) break;
        const start = hay.spans[index]?.start ?? cursor;
        const end = hay.spans[index + needle.length - 1]?.end ?? start;
        if (start > cursor) parts.push({ text: text.slice(cursor, start), match: false });
        if (end > start) parts.push({ text: text.slice(start, end), match: true });
        cursor = Math.max(cursor, end);
        from = index + needle.length;
    }
    if (cursor < text.length) parts.push({ text: text.slice(cursor), match: false });
    return parts;
}

export type TextPieceSlice = { piece: number; start: number; end: number };

function isSearchSpace(char: string): boolean {
    return /\s/.test(char) || char === "\u00a0";
}

function searchSpans(text: string): { text: string; spans: { start: number; end: number }[] } {
    const chars: string[] = [];
    const spans: { start: number; end: number }[] = [];
    let index = 0;
    while (index < text.length) {
        if (!isSearchSpace(text[index])) {
            chars.push(text[index]);
            spans.push({ start: index, end: index + 1 });
            index += 1;
            continue;
        }
        let next = index + 1;
        while (next < text.length && isSearchSpace(text[next])) next += 1;
        const following = text[next];
        if (!following || /[.,;:!?]/.test(following) || chars.length === 0) {
            index = next;
            continue;
        }
        chars.push(" ");
        spans.push({ start: index, end: next });
        index = next;
    }
    return { text: chars.join(""), spans };
}

export function textPieceHits(pieces: readonly string[], rawQuery: string): TextPieceSlice[][] {
    const query = normalizeSearchQuery(rawQuery);
    if (!query) return [];
    const needle = query.toLowerCase();
    const ranges: { piece: number; start: number; end: number }[] = [];
    let combined = "";
    pieces.forEach((piece, pieceIndex) => {
        const start = combined.length;
        combined += piece;
        ranges.push({ piece: pieceIndex, start, end: combined.length });
    });
    const hay = searchSpans(combined);
    const haystack = hay.text.toLowerCase();
    const matches: TextPieceSlice[][] = [];
    let from = 0;
    while (from <= haystack.length - needle.length) {
        const index = haystack.indexOf(needle, from);
        if (index < 0) break;
        const end = index + needle.length;
        const originStart = hay.spans[index]?.start ?? 0;
        const originEnd = hay.spans[end - 1]?.end ?? originStart;
        const slices: TextPieceSlice[] = [];
        for (const range of ranges) {
            if (range.end <= originStart || range.start >= originEnd) continue;
            const start = Math.max(originStart, range.start) - range.start;
            const stop = Math.min(originEnd, range.end) - range.start;
            if (stop > start) slices.push({ piece: range.piece, start, end: stop });
        }
        if (slices.length) matches.push(slices);
        from = end;
    }
    return matches;
}

export type TextRun = { text: string; breakBefore: boolean };
export type TextRunSlice = { run: number; start: number; end: number };

export function textRunHits(runs: readonly TextRun[], rawQuery: string): TextRunSlice[][] {
    const pieces: string[] = [];
    const runForPiece: number[] = [];
    runs.forEach((run, index) => {
        const previous = pieces[pieces.length - 1];
        if (run.breakBefore && previous !== undefined && !previous.endsWith(" ")) {
            pieces.push(" ");
            runForPiece.push(-1);
        }
        pieces.push(run.text);
        runForPiece.push(index);
    });
    return textPieceHits(pieces, rawQuery).flatMap((hit) => {
        const slices = hit.flatMap((slice) => {
            const run = runForPiece[slice.piece];
            if (run === undefined || run < 0) return [];
            return [{ run, start: slice.start, end: slice.end }];
        });
        return slices.length ? [slices] : [];
    });
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
): { matched: boolean; snippet: string | null; entryId: string | null; entryAt: string | null; count: number } {
    const query = normalizeSearchQuery(rawQuery);
    if (!query) return { matched: true, snippet: null, entryId: null, entryAt: null, count: 0 };

    const hits = entries
        .filter((entry) => entryMatchesListQuery(entry, query))
        .sort((left, right) => Date.parse(right.createdAt) - Date.parse(left.createdAt));
    const newest = hits[0];
    if (newest) {
        return {
            matched: true,
            snippet: matchingPiece(newest, query, CARD_OPENING),
            entryId: newest.id || null,
            entryAt: newest.createdAt,
            count: hits.length,
        };
    }
    if (foldedIncludes(diary.title, query)) {
        return { matched: true, snippet: null, entryId: null, entryAt: null, count: 0 };
    }
    const description = diary.description ?? "";
    if (foldedIncludes(description, query)) {
        return { matched: true, snippet: descriptionSnippet(description, query), entryId: null, entryAt: null, count: 0 };
    }
    return { matched: false, snippet: null, entryId: null, entryAt: null, count: 0 };
}

export function diaryCardWhen(input: {
    query: string;
    matchEntry?: string | null;
    matchAt?: string | null;
    matchCount?: number | null;
    updatedAt?: string | null;
    createdAt: string;
}): string {
    const query = normalizeSearchQuery(input.query);
    const note = input.matchAt?.trim();
    if (query && input.matchEntry && note) {
        const date = formatDiaryDate(note);
        const count = input.matchCount ?? 0;
        if (count > 1) return `${date} · ${count} notes`;
        return date;
    }
    return `Updated ${formatDiaryDate(input.updatedAt || input.createdAt)}`;
}

export function diaryListAddress(rawQuery: string): string {
    const query = normalizeSearchQuery(rawQuery);
    if (!query) return "/diary";
    return `/diary?q=${encodeURIComponent(query)}`;
}

export function openedDiaryQuery(rawQuery: string | null): string {
    return normalizeSearchQuery(rawQuery ?? "");
}

export function diaryListNavigation(currentPath: string, rawQuery: string): string | null {
    const path = currentPath.split("?")[0];
    if (path !== "/diary") return null;
    const next = diaryListAddress(rawQuery);
    if (currentPath === next) return null;
    return next;
}

export function diaryMatchPath(diaryId: string, entryId: string | null | undefined, rawQuery?: string | null): string {
    const query = normalizeSearchQuery(rawQuery ?? "");
    if (!entryId) {
        if (!query) return `/diary/${diaryId}`;
        return `/diary/${diaryId}?list=${encodeURIComponent(query)}`;
    }
    const path = `/diary/${diaryId}?entry=${encodeURIComponent(entryId)}`;
    if (!query) return path;
    return `${path}&q=${encodeURIComponent(query)}&list=${encodeURIComponent(query)}`;
}

export function entryListQueryAddress(path: string, rawQuery: string): string {
    const query = normalizeSearchQuery(rawQuery);
    if (!query) return path;
    const join = path.includes("?") ? "&" : "?";
    return `${path}${join}list=${encodeURIComponent(query)}`;
}

export function diaryReturnAddress(entryQuery: string, listQuery: string): string {
    return diaryListAddress(normalizeSearchQuery(entryQuery) || normalizeSearchQuery(listQuery));
}

export function diaryReturnQuery(rawSearch: string): string {
    const params = new URLSearchParams(rawSearch.startsWith("?") ? rawSearch.slice(1) : rawSearch);
    return normalizeSearchQuery(params.get("q") || params.get("list") || "");
}

export function entryFromAddress<T extends {
    _id: string;
    createdAt: string;
    content: string;
    plainText?: string | null;
    updatedAt: string;
}>(
    entries: readonly T[],
    requestedId: string | null,
    month: string,
    rawQuery: string,
): { entry: T | null; query: string } {
    const query = normalizeSearchQuery(rawQuery);
    const inMonth = entries.filter((entry) => entryInMonth(entry.createdAt, month));
    const scope = inMonth.length ? inMonth : entries;
    if (!query) return { entry: entryToOpenFromLink(scope, requestedId), query: "" };
    const matches = scope.filter((entry) => entryMatchesListQuery(entry, query));
    if (!matches.length) return { entry: null, query };
    const requested = requestedId ? matches.find((entry) => entry._id === requestedId) ?? null : null;
    const entry = requested ?? entryToShowOnOpen(matches);
    return { entry, query: entry ? openedEntryQuery(query, entry) : query };
}

export function openedEntryQuery(rawQuery: string | null, entry: {
    content: string;
    plainText?: string | null;
    createdAt: string;
    updatedAt: string;
} | null): string {
    const query = normalizeSearchQuery(rawQuery ?? "");
    if (!query || !entry || !entryMatchesListQuery(entry, query)) return "";
    return query;
}

export function entryFindAddress(path: string, rawQuery: string): string {
    const query = normalizeSearchQuery(rawQuery);
    if (!query) return path;
    const join = path.includes("?") ? "&" : "?";
    return `${path}${join}q=${encodeURIComponent(query)}`;
}

export function openedEntryMonth(rawMonth: string | null): string {
    const month = (rawMonth ?? "").trim();
    const match = /^(\d{4})-(\d{2})$/.exec(month);
    if (!match) return "";
    const value = Number(match[2]);
    if (value < 1 || value > 12) return "";
    return month;
}

export function entryMonthAddress(path: string, month: string): string {
    const key = openedEntryMonth(month);
    if (!key) return path;
    const join = path.includes("?") ? "&" : "?";
    return `${path}${join}month=${encodeURIComponent(key)}`;
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
