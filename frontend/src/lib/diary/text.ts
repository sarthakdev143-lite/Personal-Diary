export function entryPlainText(html: string): string {
    const alts = [...html.matchAll(/\balt\s*=\s*["']([^"']*)["']/gi)].map((match) => match[1] ?? "");

    const text = html
        .replace(/<script[\s\S]*?<\/script>/gi, " ")
        .replace(/<style[\s\S]*?<\/style>/gi, " ")
        .replace(/<[^>]+>/g, " ")
        .replace(/&nbsp;/gi, " ")
        .replace(/&amp;/gi, "&")
        .replace(/&lt;/gi, "<")
        .replace(/&gt;/gi, ">")
        .replace(/&quot;/gi, '"')
        .replace(/&#39;|&apos;/gi, "'");

    return [text, ...alts].join(" ").replace(/\s+/g, " ").trim();
}

const MONTH_INDEX = new Map([
    ["January", 0],
    ["February", 1],
    ["March", 2],
    ["April", 3],
    ["May", 4],
    ["June", 5],
    ["July", 6],
    ["August", 7],
    ["September", 8],
    ["October", 9],
    ["November", 10],
    ["December", 11],
]);

export function withoutGeneratedDateHeading(html: string): string {
    const match = /^<h2>([A-Za-z]+, [A-Za-z]+ \d{1,2}, \d{4})<\/h2>/.exec(html);
    if (!match) return html;

    const label = match[1];
    const parts = /^[A-Za-z]+, ([A-Za-z]+) (\d{1,2}), (\d{4})$/.exec(label);
    if (!parts) return html;

    const month = MONTH_INDEX.get(parts[1]);
    if (month === undefined) return html;

    const day = Number(parts[2]);
    const year = Number(parts[3]);
    const local = new Date(year, month, day);
    if (local.getFullYear() !== year || local.getMonth() !== month || local.getDate() !== day) return html;
    if (formatEntryLong(local.toISOString()) !== label) return html;

    return html.slice(match[0].length);
}

export function entryWritingText(html: string): string {
    return entryPlainText(withoutGeneratedDateHeading(html));
}

export function hasEntryContent(html: string): boolean {
    const writing = withoutGeneratedDateHeading(html);
    if (entryPlainText(writing).length > 0) return true;
    return /<img\b[^>]*\bsrc\s*=\s*["'][^"']+/i.test(writing);
}

export function storedPlainText(entry: { content: string; plainText?: string | null }): {
    plainText: string;
    needsWrite: boolean;
} {
    if (typeof entry.plainText === "string") {
        return { plainText: entry.plainText, needsWrite: false };
    }

    const plainText = entryWritingText(entry.content);
    if (plainText) return { plainText, needsWrite: true };
    if (hasEntryContent(entry.content)) return { plainText: "Image", needsWrite: true };
    return { plainText: "", needsWrite: true };
}

export function wordCount(html: string): number {
    const text = entryWritingText(html);
    return text ? text.split(/\s+/).filter(Boolean).length : 0;
}

export function formatDiaryDate(value: string): string {
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return "Unknown date";

    return new Intl.DateTimeFormat("en-US", {
        day: "numeric",
        month: "short",
        year: "numeric",
    }).format(date);
}

export function formatEntryTime(value: string): string {
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return "";

    return new Intl.DateTimeFormat("en-US", {
        hour: "2-digit",
        minute: "2-digit",
    }).format(date);
}

export function calendarDate(date: Date): string {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, "0");
    const day = String(date.getDate()).padStart(2, "0");
    return `${year}-${month}-${day}`;
}

export function entryInstant(value: string, now = new Date(), clock: Date = now): Date | null {
    const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(value);
    if (!match) return null;

    const year = Number(match[1]);
    const month = Number(match[2]);
    const day = Number(match[3]);
    const chosenDay = new Date(year, month - 1, day);
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    if (
        chosenDay.getFullYear() !== year
        || chosenDay.getMonth() !== month - 1
        || chosenDay.getDate() !== day
        || chosenDay.getTime() > today.getTime()
    ) {
        return null;
    }

    const chosen = new Date(
        year,
        month - 1,
        day,
        clock.getHours(),
        clock.getMinutes(),
        clock.getSeconds(),
        clock.getMilliseconds(),
    );
    if (chosen.getTime() < Date.UTC(1970, 0, 1)) return null;
    if (chosen.getTime() > now.getTime()) return new Date(now.getTime());
    return chosen;
}

export type EntryMonth = {
    key: string;
    label: string;
    count: number;
};

export function monthKey(value: string): string | null {
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return null;
    return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}`;
}

export function monthLabel(key: string): string {
    const match = /^(\d{4})-(\d{2})$/.exec(key);
    if (!match) return key;
    const date = new Date(Number(match[1]), Number(match[2]) - 1, 1);
    return new Intl.DateTimeFormat("en-US", { month: "long", year: "numeric" }).format(date);
}

export function entryMonths(dates: string[]): EntryMonth[] {
    const counts = new Map<string, number>();
    for (const value of dates) {
        const key = monthKey(value);
        if (!key) continue;
        counts.set(key, (counts.get(key) ?? 0) + 1);
    }

    return [...counts.entries()]
        .sort(([left], [right]) => right.localeCompare(left))
        .map(([key, count]) => ({ key, label: monthLabel(key), count }));
}

export function entryInMonth(createdAt: string, month: string): boolean {
    if (!month) return true;
    return monthKey(createdAt) === month;
}

export function monthForSavedEntry(createdAt: string, month: string): string {
    const key = monthKey(createdAt);
    if (!key || entryInMonth(createdAt, month)) return month;
    return key;
}

export function emptyEntryListMessage(query: string, month: string): string {
    const text = query.trim();
    const when = month ? monthLabel(month) : "";
    if (text && when) return `No entries match “${text}” in ${when}.`;
    if (text) return `No entries match “${text}”.`;
    return `No entries in ${when}.`;
}

export function retitleEntryDate(html: string, fromLabel: string, toLabel: string): string {
    if (!fromLabel || !toLabel || fromLabel === toLabel) return html;
    const prefix = `<h2>${fromLabel}</h2>`;
    if (!html.startsWith(prefix)) return html;
    return `<h2>${toLabel}</h2>${html.slice(prefix.length)}`;
}

const REVISION_GAP_MS = 2000;

export function entryWasRevised(createdAt: string | Date, updatedAt: string | Date): boolean {
    const created = new Date(createdAt).getTime();
    const updated = new Date(updatedAt).getTime();
    return Number.isFinite(created) && Number.isFinite(updated) && updated - created > REVISION_GAP_MS;
}

export function entryWritingChanged(previousHtml: string, nextHtml: string): boolean {
    return withoutGeneratedDateHeading(previousHtml) !== withoutGeneratedDateHeading(nextHtml);
}

export function nextEntryRevision(input: {
    createdAt: Date;
    updatedAt: Date;
    nextCreatedAt?: Date;
    writingChanged: boolean;
    now: Date;
}): { createdAt: Date; updatedAt: Date } {
    const createdAt = input.nextCreatedAt ?? input.createdAt;
    const dateChanged = createdAt.getTime() !== input.createdAt.getTime();
    if (!input.writingChanged && !dateChanged) {
        return { createdAt: input.createdAt, updatedAt: input.updatedAt };
    }

    if (input.writingChanged) {
        const updatedAt = input.now.getTime() - createdAt.getTime() > REVISION_GAP_MS
            ? input.now
            : new Date(createdAt.getTime() + REVISION_GAP_MS + 1);
        return { createdAt, updatedAt };
    }

    if (!entryWasRevised(input.createdAt, input.updatedAt)) {
        return { createdAt, updatedAt: createdAt };
    }

    const updatedAt = input.updatedAt.getTime() - createdAt.getTime() > REVISION_GAP_MS
        ? input.updatedAt
        : new Date(createdAt.getTime() + REVISION_GAP_MS + 1);
    return { createdAt, updatedAt };
}

export function entrySelectionAction(
    currentId: string | null,
    mode: "compose" | "view" | "edit",
    clickedId: string,
): "stay" | "revert" | "open" {
    if (currentId === clickedId && mode === "view") return "stay";
    if (currentId === clickedId && mode === "edit") return "revert";
    return "open";
}

export function entryToShowOnOpen<T extends { createdAt: string }>(entries: readonly T[]): T | null {
    let chosen: T | null = null;
    let chosenTime = Number.NEGATIVE_INFINITY;

    for (const entry of entries) {
        const time = Date.parse(entry.createdAt);
        if (!Number.isFinite(time) || time <= chosenTime) continue;
        chosen = entry;
        chosenTime = time;
    }

    return chosen;
}

export function formatEntryLong(value: string): string {
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return "—";

    return new Intl.DateTimeFormat("en-US", {
        weekday: "long",
        day: "numeric",
        month: "long",
        year: "numeric",
    }).format(date);
}
