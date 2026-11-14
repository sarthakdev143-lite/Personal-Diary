function decodeEntryText(value: string): string {
    return value
        .replace(/&nbsp;/gi, " ")
        .replace(/&amp;/gi, "&")
        .replace(/&lt;/gi, "<")
        .replace(/&gt;/gi, ">")
        .replace(/&quot;/gi, '"')
        .replace(/&#39;|&apos;/gi, "'");
}

export function entryPlainText(html: string): string {
    const text = decodeEntryText(
        html
            .replace(/<script[\s\S]*?<\/script>/gi, " ")
            .replace(/<style[\s\S]*?<\/style>/gi, " ")
            .replace(/<[^>]+>/g, " "),
    );

    const visible = text.toLowerCase();
    const captioned = html.replace(/<figure\b[^>]*>[\s\S]*?<\/figure>/gi, " ");
    const extra = [...captioned.matchAll(/\balt\s*=\s*["']([^"']*)["']/gi)]
        .map((match) => decodeEntryText(match[1] ?? "").trim())
        .filter((alt) => alt && !visible.includes(alt.toLowerCase()));
    return [text, ...extra].join(" ").replace(/\s+([.,;:!?])/g, "$1").replace(/\s+/g, " ").trim();
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

function isGeneratedDateLabel(label: string): boolean {
    const parts = /^[A-Za-z]+, ([A-Za-z]+) (\d{1,2}), (\d{4})$/.exec(label);
    if (!parts) return false;

    const month = MONTH_INDEX.get(parts[1]);
    if (month === undefined) return false;

    const day = Number(parts[2]);
    const year = Number(parts[3]);
    const local = new Date(year, month, day);
    if (local.getFullYear() !== year || local.getMonth() !== month || local.getDate() !== day) return false;
    return formatEntryLong(local.toISOString()) === label;
}

export function withoutGeneratedDateHeading(html: string): string {
    const match = /^<h2>([A-Za-z]+, [A-Za-z]+ \d{1,2}, \d{4})<\/h2>/.exec(html);
    if (!match || !isGeneratedDateLabel(match[1])) return html;
    return html.slice(match[0].length);
}

export function leadingDateLabel(text: string): string | null {
    const match = /^([A-Za-z]+, [A-Za-z]+ \d{1,2}, \d{4})/.exec(text.replace(/\s+/g, " ").trim());
    if (!match || !isGeneratedDateLabel(match[1])) return null;
    return match[1];
}

export function separateGluedDateHeading(html: string): string {
    const match = /^<(h[1-3])\b[^>]*>([\s\S]*?)<\/\1>/i.exec(html);
    if (!match) return html;
    const text = decodeEntryText((match[2] ?? "").replace(/<[^>]+>/g, " ")).replace(/\s+/g, " ").trim();
    const label = leadingDateLabel(text);
    if (!label) return html;
    const extra = text.slice(label.length).trim();
    const heading = `<h2>${label}</h2>`;
    const rest = html.slice(match[0].length);
    if (!extra) return match[0] === heading ? html : `${heading}${rest}`;
    const escaped = extra.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
    return `${heading}<p>${escaped}</p>${rest}`;
}

export type LineJoin = "join" | "clear" | "drop" | "pass";

export function lineJoinKey(input: {
    key: string;
    shiftKey?: boolean;
    altKey?: boolean;
    ctrlKey?: boolean;
    metaKey?: boolean;
    collapsed: boolean;
    atStart: boolean;
    atEnd: boolean;
    neighbor: "text" | "none";
    blockEmpty?: boolean;
    neighborEmpty?: boolean;
}): LineJoin {
    if (input.shiftKey || input.altKey || input.ctrlKey || input.metaKey || !input.collapsed) return "pass";
    if (input.neighbor !== "text") return "pass";
    if (input.key === "Backspace" && input.atStart) {
        if (input.blockEmpty) return "drop";
        return input.neighborEmpty ? "clear" : "join";
    }
    if (input.key === "Delete" && input.atEnd) return input.blockEmpty ? "clear" : "join";
    return "pass";
}

export type BreakJoin = "join" | "pass";

export function breakJoinKey(input: {
    key: string;
    shiftKey?: boolean;
    altKey?: boolean;
    ctrlKey?: boolean;
    metaKey?: boolean;
    collapsed: boolean;
    atBreak: "before" | "after" | "none";
}): BreakJoin {
    if (input.shiftKey || input.altKey || input.ctrlKey || input.metaKey || !input.collapsed) return "pass";
    if (input.key === "Backspace" && input.atBreak === "after") return "join";
    if (input.key === "Delete" && input.atBreak === "before") return "join";
    return "pass";
}

export function plainSpacesAfterMarks(html: string): string {
    return html
        .replace(/(<\/(?:b|strong|i|em|u|s|strike|del|a)>)(?:&nbsp;|\u00a0)/gi, "$1 ")
        .replace(/(<(?:p|h1|h2|h3|li|blockquote|figcaption)\b[^>]*>)(?:&nbsp;|\u00a0)(?=[^\s<])/gi, "$1 ");
}

export function joinNeedsSpace(previous: string, next: string): boolean {
    const left = previous.replace(/\u00a0/g, " ");
    const right = next.replace(/\u00a0/g, " ");
    if (!left.trim() || !right.trim()) return false;
    if (/\s$/.test(left) || /^\s/.test(right)) return false;
    const end = left.trimEnd();
    const start = right.trimStart();
    const opens = /[\p{L}\p{N}\p{Pc},.!?;:)\]"']$/u.test(end);
    const continues = /^[\p{L}\p{N}\p{Pc}(["']/u.test(start);
    return opens && continues;
}

export type SplitSpace = "trim" | "keep";

export function splitSpace(input: {
    key: string;
    shiftKey?: boolean;
    altKey?: boolean;
    ctrlKey?: boolean;
    metaKey?: boolean;
    inCode: boolean;
    before: string;
    after: string;
}): SplitSpace {
    if (input.key !== "Enter" || input.altKey || input.ctrlKey || input.metaKey || input.inCode) return "keep";
    const before = input.before.replace(/\u00a0/g, " ");
    const after = input.after.replace(/\u00a0/g, " ");
    if (!before.trim() || !after.trim()) return "keep";
    if (/\s$/.test(before) || /^\s/.test(after)) return "trim";
    return "keep";
}

export type HeadingEnter = "paragraph" | "above" | "leave" | "pass";

export function headingEnterKey(input: {
    key: string;
    shiftKey?: boolean;
    altKey?: boolean;
    ctrlKey?: boolean;
    metaKey?: boolean;
    inHeading: boolean;
    collapsed: boolean;
    dateHeading: boolean;
    hasImage?: boolean;
    before: string;
    after: string;
}): HeadingEnter {
    if (input.key !== "Enter" || input.shiftKey || input.altKey || input.ctrlKey || input.metaKey) return "pass";
    if (!input.inHeading || !input.collapsed || input.dateHeading) return "pass";
    const before = input.before.replace(/\u00a0/g, " ");
    const after = input.after.replace(/\u00a0/g, " ");
    if (before.trim() && after.trim()) return "paragraph";
    if (!before.trim() && after.trim()) return "above";
    if (!before.trim() && !after.trim() && !input.hasImage) return "leave";
    return "pass";
}

export function sameEditingPage(left: string, right: string): boolean {
    const plain = (html: string) => html
        .replace(/ class="de-selected"/g, "")
        .replace(/ class="de-selected /g, ' class="')
        .replace(/ de-selected"/g, '"')
        .replace(/ de-selected /g, " ");
    return plain(left) === plain(right);
}

export type HeadingSplitUndo = "restore" | "pass";

export function headingSplitUndo(input: {
    saved: { before: string; after: string } | null;
    current: string;
}): HeadingSplitUndo {
    if (!input.saved || !sameEditingPage(input.current, input.saved.after)) return "pass";
    return "restore";
}

export function boundarySpaceCut(before: string, after: string): { before: number; after: number } | null {
    if (splitSpace({ key: "Enter", inCode: false, before, after }) !== "trim") return null;
    const left = before.replace(/\u00a0/g, " ");
    const right = after.replace(/\u00a0/g, " ");
    return {
        before: left.length - left.trimEnd().length,
        after: right.length - right.trimStart().length,
    };
}

export type CodeGap = "close" | "stay";

export function codeGap(input: { emptyLine: boolean; nextBlock: boolean }): CodeGap {
    if (input.emptyLine && input.nextBlock) return "close";
    return "stay";
}

export type DividerCaret = "join" | "stay";

export function dividerCaret(input: {
    emptyLine: boolean;
    followsRule: boolean;
    nextHasWriting: boolean;
}): DividerCaret {
    if (input.emptyLine && input.followsRule && input.nextHasWriting) return "join";
    return "stay";
}

export type QuoteEnter = "break" | "blank" | "above" | "pass";

export function quoteEnterKey(input: {
    key: string;
    shiftKey?: boolean;
    altKey?: boolean;
    ctrlKey?: boolean;
    metaKey?: boolean;
    inQuote: boolean;
    collapsed: boolean;
    before: string;
    after: string;
    besideBreak?: boolean;
}): QuoteEnter {
    if (input.key !== "Enter" || input.shiftKey || input.altKey || input.ctrlKey || input.metaKey) return "pass";
    if (!input.inQuote || !input.collapsed) return "pass";
    const before = input.before.replace(/\u00a0/g, " ");
    const after = input.after.replace(/\u00a0/g, " ");
    if (before.trim() && after.trim()) return input.besideBreak ? "blank" : "break";
    if (!before.trim() && after.trim() && !input.besideBreak) return "above";
    return "pass";
}

export type QuoteLeaveKey = "leave" | "pass";

export function quoteLeaveKey(input: {
    key: string;
    shiftKey?: boolean;
    altKey?: boolean;
    ctrlKey?: boolean;
    metaKey?: boolean;
    inQuote: boolean;
    collapsed: boolean;
    empty: boolean;
}): QuoteLeaveKey {
    if (!input.inQuote || !input.collapsed || !input.empty) return "pass";
    if (input.shiftKey || input.altKey || input.ctrlKey || input.metaKey) return "pass";
    if (input.key !== "Enter") return "pass";
    return "leave";
}

export type ListCommand = "lift" | "pass";

export function listCommand(command: string): ListCommand {
    if (command === "insertUnorderedList" || command === "insertOrderedList") return "lift";
    return "pass";
}

export type UndoButton = "saved" | "browser";

export function undoButton(command: string): UndoButton {
    return command === "undo" ? "saved" : "browser";
}

export type SavedRedo = "restore" | "pass";

export function savedRedo(input: {
    command?: string;
    key?: string;
    shiftKey?: boolean;
    altKey?: boolean;
    ctrlKey?: boolean;
    metaKey?: boolean;
    matches: boolean;
}): SavedRedo {
    if (input.altKey || !input.matches) return "pass";
    if (input.command === "redo") return "restore";
    if (!(input.ctrlKey || input.metaKey)) return "pass";
    if (input.key === "y" || input.key === "Y") return "restore";
    if ((input.key === "z" || input.key === "Z") && input.shiftKey) return "restore";
    return "pass";
}

export type ListEdge = "outdent" | "pass";

export function listEdgeKey(input: {
    key: string;
    shiftKey?: boolean;
    altKey?: boolean;
    ctrlKey?: boolean;
    metaKey?: boolean;
    collapsed: boolean;
    atStart: boolean;
    inItem: boolean;
    neighbor: "date" | "none" | "text";
}): ListEdge {
    if (input.shiftKey || input.altKey || input.ctrlKey || input.metaKey) return "pass";
    if (!input.inItem || !input.collapsed || !input.atStart || input.key !== "Backspace") return "pass";
    if (input.neighbor === "text") return "pass";
    return "outdent";
}

export type ListLeaveKey = "leave" | "pass";

export function listLeaveKey(input: {
    key: string;
    shiftKey?: boolean;
    altKey?: boolean;
    ctrlKey?: boolean;
    metaKey?: boolean;
    inItem: boolean;
    collapsed: boolean;
    empty: boolean;
}): ListLeaveKey {
    if (!input.inItem || !input.collapsed || !input.empty) return "pass";
    if (input.shiftKey || input.altKey || input.ctrlKey || input.metaKey) return "pass";
    if (input.key !== "Enter") return "pass";
    return "leave";
}

export type CodePull = "pull" | "pass";

export function codePullKey(input: {
    key: string;
    shiftKey?: boolean;
    altKey?: boolean;
    ctrlKey?: boolean;
    metaKey?: boolean;
    collapsed: boolean;
    atStart: boolean;
    atEnd: boolean;
    neighbor: "text" | "code" | "none";
}): CodePull {
    if (input.shiftKey || input.altKey || input.ctrlKey || input.metaKey || !input.collapsed) return "pass";
    if (input.key === "Backspace" && input.atStart && input.neighbor === "text") return "pull";
    if (input.key === "Delete" && input.atEnd && input.neighbor === "code") return "pull";
    return "pass";
}

export type CodeLineKey = "newline" | "leave" | "pass";

export function codeLineKey(input: {
    key: string;
    altKey?: boolean;
    ctrlKey?: boolean;
    metaKey?: boolean;
    inCode: boolean;
    collapsed: boolean;
    blankLine: boolean;
    trailing: boolean;
}): CodeLineKey {
    if (!input.inCode) return "pass";
    if (input.altKey || input.ctrlKey || input.metaKey) return "pass";
    if (input.key !== "Enter") return "pass";
    if (input.collapsed && input.blankLine && input.trailing) return "leave";
    return "newline";
}

export function codeLeaveRemoval(text: string): boolean {
    return text.replace(/[\u200b\u00a0\n]/g, "").trim() === "";
}

export type DatePaste = "writing" | "replace-writing" | "pass";

export function datePaste(input: { touchesDate: boolean; onlyDate: boolean }): DatePaste {
    if (!input.touchesDate) return "pass";
    return input.onlyDate ? "writing" : "replace-writing";
}

export type DateSelectionKey = "clear" | "leave" | "type" | "pass";

export function dateSelectionKey(input: {
    key: string;
    altKey?: boolean;
    ctrlKey?: boolean;
    metaKey?: boolean;
    collapsed: boolean;
    touchesDate: boolean;
    writingSelected: boolean;
}): DateSelectionKey {
    if (input.altKey || input.ctrlKey || input.metaKey || input.collapsed || !input.touchesDate) return "pass";
    if (input.key === "Backspace" || input.key === "Delete") return input.writingSelected ? "clear" : "leave";
    if (input.key === "Enter" || input.key.length === 1) return "type";
    return "pass";
}

export type DateHeadingKey = "write" | "leave" | "hold" | "drop" | "pass";

export function dateHeadingKey(input: {
    key: string;
    altKey?: boolean;
    ctrlKey?: boolean;
    metaKey?: boolean;
    where: "heading" | "after";
    atStart?: boolean;
    empty?: boolean;
    followed?: boolean;
}): DateHeadingKey {
    const formatsDate = input.where === "heading"
        && (input.ctrlKey || input.metaKey)
        && !input.altKey
        && ["b", "i", "u"].includes(input.key.toLowerCase());
    if (formatsDate) return "hold";
    if (input.altKey || input.ctrlKey || input.metaKey) return "pass";
    if (input.where === "heading") {
        if (input.key.length === 1 || input.key === "Enter") return "write";
        if (input.key === "Backspace" || input.key === "Delete") return "leave";
        return "pass";
    }
    if ((input.key === "Backspace" || input.key === "Delete") && input.atStart && input.empty && input.followed) return "drop";
    if (input.key === "Backspace" && input.atStart) return "hold";
    if (input.key === "Delete" && input.atStart && input.empty) return "hold";
    return "pass";
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

export function entryListSearchText(entry: {
    content: string;
    plainText?: string | null;
    createdAt: string;
    updatedAt: string;
}): string {
    const writing = entry.plainText?.trim() || entryWritingText(entry.content);
    const clock = formatEntryTime(entry.createdAt);
    const looseClock = clock.replace(/^0/, "");
    const parts = [writing, formatDiaryDate(entry.createdAt), formatEntryLong(entry.createdAt), clock];
    if (looseClock !== clock) parts.push(looseClock);
    if (entryWasRevised(entry.createdAt, entry.updatedAt)) parts.push("edited");
    return parts.filter(Boolean).join(" ");
}

export function entryWritingChanged(previousHtml: string, nextHtml: string): boolean {
    return withoutGeneratedDateHeading(previousHtml) !== withoutGeneratedDateHeading(nextHtml);
}

export function entryLinkUrl(value: string): { ok: true; href: string } | { ok: false; error: string } {
    const trimmed = value.trim();
    let parsed: URL;
    try {
        parsed = new URL(trimmed);
    } catch {
        return { ok: false, error: "Enter a full http, https, or mailto URL." };
    }
    if (parsed.protocol !== "http:" && parsed.protocol !== "https:" && parsed.protocol !== "mailto:") {
        return { ok: false, error: "Use an http, https, or mailto link." };
    }
    return { ok: true, href: parsed.href };
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

export function entryToOpenFromLink<T extends { _id: string; createdAt: string }>(
    entries: readonly T[],
    requestedId: string | null,
): T | null {
    if (requestedId) {
        const requested = entries.find((entry) => entry._id === requestedId);
        if (requested) return requested;
    }
    return entryToShowOnOpen(entries);
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

export function entryToOpenWhenHidden<T extends { _id: string; createdAt: string }>(
    visible: readonly T[],
    currentId: string | null,
): T | null {
    if (!visible.length) return null;
    if (currentId && visible.some((entry) => entry._id === currentId)) return null;
    return entryToShowOnOpen(visible);
}

export function entryToOpenForFilter<T extends { _id: string; createdAt: string }>(
    visible: readonly T[],
    currentId: string | null,
): T | null {
    if (!currentId) return null;
    return entryToOpenWhenHidden(visible, currentId);
}

export function showOpenEntry<T extends { _id: string }>(
    visible: readonly T[],
    currentId: string | null,
    mode: "compose" | "view" | "edit",
    confirming = false,
): boolean {
    if (mode !== "view" || confirming) return true;
    if (!currentId) return true;
    return visible.some((entry) => entry._id === currentId);
}

export function entryToShowAfterDelete<T extends { _id: string }>(
    entries: readonly T[],
    deletedId: string,
): T | null {
    const index = entries.findIndex((entry) => entry._id === deletedId);
    if (index < 0) return null;
    return entries[index + 1] ?? entries[index - 1] ?? null;
}

export function entryUndoBody(entry: {
    content: string;
    createdAt: string;
    updatedAt: string;
}): { content: string; createdAt: string; updatedAt: string } {
    return {
        content: entry.content,
        createdAt: entry.createdAt,
        updatedAt: entry.updatedAt,
    };
}

export function laterEntryTime(createdAt: Date, updatedAt: Date): Date {
    return updatedAt.getTime() < createdAt.getTime() ? createdAt : updatedAt;
}

export function entriesWithRestored<T extends { _id: string; createdAt: string }>(
    entries: readonly T[],
    restored: T,
): T[] {
    const without = entries.filter((entry) => entry._id !== restored._id);
    return [...without, restored].sort(
        (left, right) => Date.parse(right.createdAt) - Date.parse(left.createdAt),
    );
}

export function entryLayerEscape(event: {
    key: string;
    altKey: boolean;
    ctrlKey: boolean;
    metaKey: boolean;
    pendingDiscard: boolean;
    linkOpen: boolean;
    confirmDelete: boolean;
    detailsOpen: boolean;
}): "discard" | "link" | "delete" | "details" | null {
    if (event.key !== "Escape" || event.altKey || event.ctrlKey || event.metaKey) return null;
    if (event.pendingDiscard) return "discard";
    if (event.linkOpen) return "link";
    if (event.confirmDelete) return "delete";
    if (event.detailsOpen) return "details";
    return null;
}

export function entryFindKeyAction(event: {
    key: string;
    altKey: boolean;
    ctrlKey: boolean;
    metaKey: boolean;
    shiftKey: boolean;
    inField: boolean;
    searchFocused: boolean;
    query: string;
}): "focus" | "clear" | "close" | null {
    if (event.altKey || event.ctrlKey || event.metaKey) return null;
    if (event.key === "Escape") {
        if (!event.searchFocused) return null;
        return event.query ? "clear" : "close";
    }
    if (event.key !== "/" || event.shiftKey || event.searchFocused || event.inField) return null;
    return "focus";
}

export function entryToShowByStep<T extends { _id: string }>(
    entries: readonly T[],
    currentId: string | null,
    direction: "next" | "previous",
): T | null {
    if (!entries.length) return null;
    const index = currentId ? entries.findIndex((entry) => entry._id === currentId) : -1;
    if (index < 0) return direction === "next" ? entries[0] : entries[entries.length - 1];
    const step = direction === "next" ? index + 1 : index - 1;
    return entries[step] ?? null;
}

export function entryCardQuery(entryId: string): string {
    const escaped = entryId.replace(/\\/g, "\\\\").replace(/"/g, '\\"');
    return `button[data-entry-id="${escaped}"]`;
}

export function freshEntryHtml(iso: string): string {
    return `<h2>${formatEntryLong(iso)}</h2><p><br></p>`;
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
