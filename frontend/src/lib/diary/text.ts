function decodeEntryText(value: string): string {
    return value
        .replace(/&nbsp;/gi, " ")
        .replace(/&amp;/gi, "&")
        .replace(/&lt;/gi, "<")
        .replace(/&gt;/gi, ">")
        .replace(/&quot;/gi, '"')
        .replace(/&#39;|&apos;/gi, "'");
}

const INLINE_TAG = /^(a|abbr|b|cite|code|del|em|font|i|img|ins|kbd|mark|s|samp|small|span|strike|strong|sub|sup|u|wbr)$/i;

export function entryPlainText(html: string): string {
    const text = decodeEntryText(
        html
            .replace(/<script[\s\S]*?<\/script>/gi, " ")
            .replace(/<style[\s\S]*?<\/style>/gi, " ")
            .replace(/<\/?([a-zA-Z0-9]+)[^>]*>/g, (_tag, name: string) => INLINE_TAG.test(name) ? "" : " "),
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
    if (input.shiftKey || input.altKey || !input.collapsed) return "pass";
    if (input.neighbor !== "text") return "pass";
    const atEdge = (input.key === "Backspace" && input.atStart) || (input.key === "Delete" && input.atEnd);
    if ((input.ctrlKey || input.metaKey) && !atEdge) return "pass";
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
    if (input.shiftKey || input.altKey || !input.collapsed) return "pass";
    const atEdge = (input.key === "Backspace" && input.atBreak === "after") || (input.key === "Delete" && input.atBreak === "before");
    if ((input.ctrlKey || input.metaKey) && !atEdge) return "pass";
    if (input.key === "Backspace" && input.atBreak === "after") return "join";
    if (input.key === "Delete" && input.atBreak === "before") return "join";
    return "pass";
}

export function breakUndoMark(input: { index: number; side: "before" | "after" }): { index: number; side: "before" | "after" } | null {
    if (!Number.isFinite(input.index) || input.index < 0) return null;
    if (input.side !== "before" && input.side !== "after") return null;
    return { index: Math.floor(input.index), side: input.side };
}

export function styleEdgeCut(text: string): { leading: number; trailing: number } | null {
    if (!text.replace(/[\u00a0\s\u200b]/g, "")) return null;
    const leading = text.match(/^[\u00a0\s\u200b]*/)?.[0].length ?? 0;
    const trailing = text.slice(leading).match(/[\u00a0\s\u200b]*$/)?.[0].length ?? 0;
    if (leading === 0 && trailing === 0) return null;
    return { leading, trailing };
}

export function styleShortcut(input: {
    key: string;
    shiftKey?: boolean;
    altKey?: boolean;
    ctrlKey?: boolean;
    metaKey?: boolean;
}): "bold" | "italic" | "underline" | null {
    if (input.shiftKey || input.altKey || (!input.ctrlKey && !input.metaKey)) return null;
    const key = input.key.toLowerCase();
    if (key === "b") return "bold";
    if (key === "i") return "italic";
    if (key === "u") return "underline";
    return null;
}

export function styleUndoCaret(offset: number | null): number | null {
    if (offset === null || !Number.isFinite(offset) || offset < 0) return null;
    return Math.floor(offset);
}

export function replacedSelectionUndo(input: { collapsed: boolean }): "place" | "keep" {
    return input.collapsed ? "keep" : "place";
}

export function selectionDeleteUndo(input: {
    key: string;
    altKey?: boolean;
    ctrlKey?: boolean;
    metaKey?: boolean;
    collapsed: boolean;
}): "place" | "pass" {
    if (input.collapsed || input.altKey || input.ctrlKey || input.metaKey) return "pass";
    if (input.key !== "Backspace" && input.key !== "Delete") return "pass";
    return "place";
}

export function selectionEnterUndo(input: {
    key: string;
    shiftKey?: boolean;
    altKey?: boolean;
    ctrlKey?: boolean;
    metaKey?: boolean;
    collapsed: boolean;
    inWriting: boolean;
}): "place" | "pass" {
    if (input.collapsed || !input.inWriting || input.shiftKey || input.altKey || input.ctrlKey || input.metaKey) return "pass";
    if (input.key !== "Enter") return "pass";
    return "place";
}

export function selectionTypeUndo(input: {
    key: string;
    altKey?: boolean;
    ctrlKey?: boolean;
    metaKey?: boolean;
    composing?: boolean;
    collapsed: boolean;
    inWriting: boolean;
}): "place" | "pass" {
    if (input.collapsed || !input.inWriting || input.composing || input.altKey || input.ctrlKey || input.metaKey) return "pass";
    if (input.key.length !== 1) return "pass";
    return "place";
}

export function wordDeleteSpan(text: string, start: number, end: number): { start: number; end: number } {
    const space = (index: number) => {
        const piece = text[index];
        return piece === " " || piece === "\u00a0" || piece === "\t";
    };
    const word = (index: number) => /[\p{L}\p{N}]/u.test(text[index] ?? "");
    const digit = (index: number) => /\p{N}/u.test(text[index] ?? "");
    const digitComma = (index: number) => text[index] === "," && digit(index - 1) && digit(index + 1);
    const mark = (index: number) => digitComma(index) || text[index] === "&" || text[index] === "/" || text[index] === "@" || text[index] === "+" || text[index] === "_" || text[index] === "*" || text[index] === "=" || text[index] === "|" || text[index] === "~" || text[index] === "\\" || text[index] === "^" || text[index] === ":" || text[index] === "-" || text[index] === "\u2010" || text[index] === "\u2011" || text[index] === "\u2013" || text[index] === "\u2014";
    const dots = (index: number) => text[index] === ".";
    const pullJoiner = (index: number) => {
        if (mark(index) && word(index - 1)) return index;
        if (!dots(index)) return undefined;
        let cursor = index;
        while (dots(cursor)) cursor -= 1;
        return word(cursor) ? cursor + 1 : undefined;
    };
    const afterJoiner = (index: number) => {
        if (mark(index)) return word(index + 1) ? index + 1 : undefined;
        if (!dots(index) || dots(index - 1)) return undefined;
        let cursor = index;
        while (dots(cursor)) cursor += 1;
        return word(cursor) ? cursor : undefined;
    };
    const joinerSpan = (from: number, to: number) => {
        if (to === from + 1 && mark(from)) return true;
        if (from >= to) return false;
        for (let index = from; index < to; index += 1) {
            if (!dots(index)) return false;
        }
        return true;
    };
    const sticky = (index: number) => {
        if (digitComma(index)) return false;
        const piece = text[index];
        return piece === "," || piece === ";" || piece === "!" || piece === "?" || piece === "%" || piece === "\u00b0" || piece === "\u2026";
    };
    const held = (index: number) => sticky(index) || ((text[index] === "." || text[index] === ":") && !word(index + 1));
    const letter = (index: number) => /\p{L}/u.test(text[index] ?? "");
    const initialism = (index: number) => {
        if (index < 0 || index >= text.length) return undefined;
        let cursor = index;
        while (cursor > 0) {
            const previous = cursor - 1;
            if (text[previous] === "." && letter(previous - 1) && (letter(cursor) || text[cursor] === ".")) {
                cursor = previous - 1;
                continue;
            }
            if (letter(previous) && text[cursor] === "." && !letter(previous - 1)) {
                cursor = previous;
                continue;
            }
            break;
        }
        while (cursor > 0 && letter(cursor - 1)) cursor -= 1;
        while (cursor > 1 && text[cursor - 1] === ".") {
            let previous = cursor - 2;
            while (previous > 0 && letter(previous - 1)) previous -= 1;
            const length = cursor - previous - 1;
            if (length < 1 || length > 3) break;
            cursor = previous;
        }
        if (!letter(cursor)) return undefined;
        const segmentEnd = (from: number) => {
            let next = from;
            while (letter(next)) next += 1;
            if (next === from || next - from > 3) return undefined;
            return next;
        };
        let bound = segmentEnd(cursor);
        if (bound === undefined) return undefined;
        let parts = 1;
        let anyLong = bound > cursor + 1;
        while (text[bound] === "." && letter(bound + 1)) {
            const next = segmentEnd(bound + 1);
            if (next === undefined) break;
            if (next > bound + 2) anyLong = true;
            parts += 1;
            bound = next;
        }
        if (parts < 2) return undefined;
        if (text[bound] === "." && !letter(bound + 1)) bound += 1;
        else if (anyLong) return undefined;
        if (index < cursor || index >= bound) return undefined;
        return { start: cursor, end: bound };
    };
    const apostrophe = (index: number) => text[index] === "'" || text[index] === "\u2019" || text[index] === "\u2018";
    const contraction = (index: number) => apostrophe(index) && word(index - 1) && word(index + 1);
    const pairs = new Map<string, string>([
        ['"', '"'],
        ["(", ")"],
        ["[", "]"],
        ["{", "}"],
        ["\u201c", "\u201d"],
        ["\u2018", "\u2019"],
        ["\u00ab", "\u00bb"],
    ]);
    if (start < end) {
        const bounds = initialism(start) ?? initialism(end - 1);
        if (bounds && start >= bounds.start && start < bounds.end) {
            let tail = bounds.end;
            while (held(tail)) tail += 1;
            let limit = tail;
            while (space(limit)) limit += 1;
            if (end <= limit) {
                start = bounds.start;
                end = tail;
            }
        }
        if ((text[start - 1] === "$" || text[start - 1] === "\u20ac" || text[start - 1] === "\u00a3" || text[start - 1] === "\u20b9" || text[start - 1] === "\u00a5" || text[start - 1] === "#") && !word(start - 2) && word(start)) start -= 1;
        if (end === start + 1 && word(start - 1) && (sticky(start) || ((text[start] === "." || text[start] === ":") && !word(end)))) {
            while (word(start - 1)) start -= 1;
        }
        const pulled = pullJoiner(start - 1);
        if (pulled !== undefined && word(start)) start = pulled;
        else if (word(start - 1) && word(end) && joinerSpan(start, end)) {
            end += 1;
            while (word(end)) end += 1;
        } else if (word(end - 1)) {
            const next = afterJoiner(end);
            if (next !== undefined) end = next;
        }
        if (apostrophe(start - 1) && apostrophe(end) && word(start) && !word(start - 2) && !word(end + 1)) {
            start -= 1;
            end += 1;
        }
        if (contraction(end)) {
            end += 1;
            while (word(end)) end += 1;
        } else if (contraction(end - 1)) {
            while (word(end)) end += 1;
        }
        if (contraction(start - 1)) {
            start -= 1;
            while (word(start - 1)) start -= 1;
        } else if (contraction(start)) {
            while (word(start - 1)) start -= 1;
            if (apostrophe(end)) end += 1;
            while (word(end)) end += 1;
        }
        if (apostrophe(end) && word(end - 1) && !word(end + 1)) end += 1;
        if (word(end - 1) && held(end)) {
            while (held(end)) end += 1;
        }
        const trailingMark = (index: number) => {
            const piece = text[index];
            return piece === "+" || piece === "#" || piece === "*" || piece === "_" || piece === "&" || piece === "/" || piece === "@" || piece === "=" || piece === "|" || piece === "~" || piece === "\\" || piece === "^" || piece === "-" || piece === "\u2010" || piece === "\u2011" || piece === "\u2013" || piece === "\u2014";
        };
        const plusSuffix = (index: number) => {
            if (!trailingMark(index)) return undefined;
            const mark = text[index];
            let plusStart = index;
            while (text[plusStart - 1] === mark) plusStart -= 1;
            let plusEnd = index + 1;
            while (text[plusEnd] === mark) plusEnd += 1;
            if (word(plusEnd) || !word(plusStart - 1)) return undefined;
            let wordStart = plusStart - 1;
            while (word(wordStart - 1)) wordStart -= 1;
            return { wordStart, plusStart, end: plusEnd };
        };
        let plusProbe = -1;
        if (trailingMark(start)) plusProbe = start;
        else if (trailingMark(end)) plusProbe = end;
        else if (trailingMark(end - 1)) plusProbe = end - 1;
        else if (trailingMark(start - 1)) plusProbe = start - 1;
        const suffix = plusProbe >= 0 ? plusSuffix(plusProbe) : undefined;
        if (suffix) {
            let tail = suffix.end;
            while (tail < end && (space(tail) || held(tail))) tail += 1;
            const touchesPlus = start < suffix.end && end > suffix.plusStart;
            const entireWord = start <= suffix.wordStart && end >= suffix.plusStart;
            const markAfter = start === suffix.end && held(start);
            if ((touchesPlus || entireWord || markAfter) && (end <= suffix.end || tail === end)) {
                start = suffix.wordStart;
                end = suffix.end;
                while (held(end)) end += 1;
            }
        }
        const closer = text[end];
        if (closer !== undefined && pairs.get(text[start - 1] ?? "") === closer && word(start)) {
            start -= 1;
            end += 1;
        }
        const opening = (index: number) => {
            const piece = text[index];
            if (piece === undefined) return undefined;
            for (const [open, close] of pairs) {
                if (open === piece) return close;
            }
            if (apostrophe(index)) return piece;
            return undefined;
        };
        const closing = (index: number) => {
            const piece = text[index];
            if (piece === undefined) return undefined;
            for (const [open, close] of pairs) {
                if (close === piece) return open;
            }
            if (apostrophe(index)) return piece;
            return undefined;
        };
        const marksOnly = (from: number, to: number) => {
            for (let index = from; index < to; index += 1) {
                if (!held(index) && !space(index)) return false;
            }
            return true;
        };
        const wrappedWord = (from: number, to: number) => {
            if (!word(from)) return false;
            for (let index = from; index < to; index += 1) {
                if (word(index)) continue;
                if (apostrophe(index) && word(index - 1) && word(index + 1)) continue;
                return false;
            }
            return from < to;
        };
        const expectedClose = opening(start);
        if (expectedClose !== undefined && !word(start - 1)) {
            let cursor = start + 1;
            while (cursor < text.length && (word(cursor) || (apostrophe(cursor) && word(cursor + 1)))) cursor += 1;
            if (text[cursor] === expectedClose && wrappedWord(start + 1, cursor)) {
                const after = cursor + 1;
                if (end <= after || marksOnly(after, end)) {
                    if (end < after) end = after;
                    while (held(end)) end += 1;
                }
            }
        }
        const expectedOpen = closing(start);
        if (expectedOpen !== undefined && marksOnly(start + 1, end)) {
            let cursor = start - 1;
            while (cursor >= 0 && (word(cursor) || (apostrophe(cursor) && word(cursor - 1)))) cursor -= 1;
            if (text[cursor] === expectedOpen && wrappedWord(cursor + 1, start) && !word(cursor - 1)) {
                start = cursor;
                while (held(end)) end += 1;
            }
        }
    }
    const before = text.slice(0, start).replace(/[\u00a0\s]/g, "");
    const after = text.slice(end).replace(/[\u00a0\s]/g, "");
    if (end < text.length && space(end) && start > 0 && space(start - 1) && before !== "") {
        while (end < text.length && space(end)) end += 1;
        while (start > 1 && space(start - 1) && space(start - 2)) start -= 1;
        return { start, end };
    }
    if (end < text.length && space(end) && before === "") {
        while (end < text.length && space(end)) end += 1;
        return { start, end };
    }
    if (start > 0 && space(start - 1) && after === "") {
        while (start > 0 && space(start - 1)) start -= 1;
        return { start, end };
    }
    if (word(start - 1)) {
        let cursor = end;
        while (cursor > start && space(cursor - 1)) cursor -= 1;
        if (cursor < end && end < text.length && !space(end)) end -= 1;
    }
    return { start, end };
}

export function cutRemoval(text: string, start: number, end: number): { start: number; end: number; gap: "before" | "after" | "none" } {
    const span = wordDeleteSpan(text, start, end);
    return { start: span.start, end: span.end, gap: wordDeleteGap(text, start, end) };
}

export function wordDeleteGap(text: string, start: number, end: number): "before" | "after" | "none" {
    if (start >= end) return "none";
    const widened = wordDeleteSpan(text, start, end);
    const word = (piece: string | undefined) => Boolean(piece && /[\p{L}\p{N}]/u.test(piece));
    const space = (piece: string | undefined) => piece === " " || piece === "\u00a0" || piece === "\t";
    if (widened.end > end && word(text[widened.end])) return "after";
    if (widened.start < start && word(text[widened.start - 1])) return "before";
    if (widened.end > end && word(text[widened.start - 1]) && (widened.end >= text.length || space(text[widened.end]))) return "before";
    const digit = (piece: string | undefined) => Boolean(piece && /\p{N}/u.test(piece));
    const joiner = (index: number) => {
        const piece = text[index];
        if (piece === "," && digit(text[index - 1]) && digit(text[index + 1])) return true;
        return piece === "&" || piece === "/" || piece === "@" || piece === "+" || piece === "_" || piece === "*" || piece === "=" || piece === "|" || piece === "~" || piece === "\\" || piece === "^" || piece === "-" || piece === "\u2010" || piece === "\u2011" || piece === "\u2013" || piece === "\u2014";
    };
    if (joiner(start) && word(text[start - 1]) && (end >= text.length || space(text[end]) || word(text[end]))) return "before";
    if (joiner(end - 1) && word(text[end]) && (start === 0 || space(text[start - 1]) || word(text[start - 1]))) return "after";
    const piece = text[start];
    if ((piece === ":" || piece === ".") && word(text[start - 1])) {
        let cursor = start;
        if (piece === ".") {
            while (text[cursor] === ".") cursor += 1;
        } else cursor += 1;
        let tail = cursor === end;
        if (!tail && word(text[cursor])) {
            while (word(text[cursor])) cursor += 1;
            tail = cursor === end;
        }
        if (tail) return "before";
    }
    const selected = text.slice(start, end);
    if (!/[\u00a0\t ]/.test(selected)) return "none";
    const removedLeading = space(text[start]);
    const removedTrailing = space(text[end - 1]);
    if (removedLeading && !removedTrailing && word(text[start - 1]) && (end >= text.length || space(text[end]))) return "before";
    if (removedTrailing && !removedLeading && word(text[end]) && (start === 0 || space(text[start - 1]))) return "after";
    if (word(text[widened.end]) && widened.start < start && space(text[widened.start - 1])) return "after";
    return "none";
}

export function stickyUndo(input: { sticky: boolean; matches: boolean; sameLine: boolean }): "restore" | "keep" | "clear" {
    if (input.matches) return "restore";
    if (input.sticky && input.sameLine) return "keep";
    return "clear";
}

export function stickyTyped(input: { sticky: boolean; sameLine: boolean; current: string; before: string; after: string }): "record" | "skip" {
    if (!input.sticky || !input.sameLine) return "skip";
    if (sameEditingPage(input.current, input.after) || sameEditingPage(input.current, input.before)) return "skip";
    return "record";
}

export function typedRedo(input: { redone: string; typed?: string | null; undone?: string }): string {
    if (!input.typed) return input.redone;
    if (sameEditingPage(input.typed, input.redone)) return input.redone;
    if (input.undone && sameEditingPage(input.typed, input.undone)) return input.redone;
    return input.typed;
}

export function wordGapInsert(gap: "before" | "after", typed: string): { text: string; caret: number; pull: boolean } | null {
    if (typed === " " || typed === "\u00a0") return null;
    if (gap === "after" && /^[,.;:!?]$/.test(typed)) return { text: typed, caret: typed.length, pull: true };
    if (/[\r\n]/.test(typed) || !/[\p{L}\p{N}]/u.test(typed)) return null;
    const body = typed.replace(/^[\t \u00a0]+|[\t \u00a0]+$/gu, "");
    if (!body) return null;
    if (gap === "after") return { text: `${body} `, caret: body.length, pull: false };
    return { text: ` ${body}`, caret: body.length + 1, pull: false };
}

export function wordGapSpace(input: { text: string; offset: number; gap: "before" | "after" | null }): { action: "hold"; gap: "before" | "after" } | { action: "type" } {
    const space = (piece: string | undefined) => piece === " " || piece === "\u00a0" || piece === "\t";
    const word = (piece: string | undefined) => Boolean(piece && /[\p{L}\p{N}]/u.test(piece));
    const prev = input.text[input.offset - 1];
    const next = input.text[input.offset];
    if (space(next) && prev !== undefined && !space(prev)) return { action: "hold", gap: "before" };
    if (space(prev) && word(next)) return { action: "hold", gap: "after" };
    if (input.gap && !space(next)) return { action: "hold", gap: input.gap };
    return { action: "type" };
}

export function wordGapKey(input: { key: string; shiftKey?: boolean; ctrlKey?: boolean; metaKey?: boolean; altKey?: boolean }): "keep" | "clear" {
    const key = input.key.toLowerCase();
    if (key === "control" || key === "meta" || key === "shift" || key === "os") return "keep";
    if (input.altKey || key === "alt") return "clear";
    if ((input.ctrlKey || input.metaKey) && key === "v") return "keep";
    if (input.shiftKey && key === "insert" && !input.ctrlKey && !input.metaKey) return "keep";
    if (input.key.length !== 1 || input.ctrlKey || input.metaKey) return "clear";
    return "keep";
}

export function dragSelectionUndo(input: { collapsed: boolean; inWriting: boolean }): "place" | "pass" {
    if (input.collapsed || !input.inWriting) return "pass";
    return "place";
}

export function selectionCutUndo(input: { collapsed: boolean; inWriting: boolean }): "place" | "pass" {
    if (input.collapsed || !input.inWriting) return "pass";
    return "place";
}

export function pasteSelectionUndo(input: { collapsed: boolean; action: "default" | "plain" | "html" | "image" | "reject" | "ignore" }): "place" | "keep" {
    if (input.action !== "default" && input.action !== "plain" && input.action !== "html") return "keep";
    return replacedSelectionUndo({ collapsed: input.collapsed });
}

export function formatUndoCommand(command: string): boolean {
    return command === "bold"
        || command === "italic"
        || command === "underline"
        || command === "strikeThrough"
        || command === "formatBlock"
        || command === "createLink"
        || command === "unlink";
}

const MARK_SPACE = /(<(b|strong|i|em|u|s|strike|del|a)\b([^>]*)>)([^<]*)<\/\2>/gi;

export function plainMarkSpaces(html: string): string {
    let current = html;
    for (let pass = 0; pass < 4; pass += 1) {
        const next = current.replace(MARK_SPACE, (match, _open: string, tag: string, attrs: string, inner: string, offset: number, full: string) => {
            const leading = inner.match(/^((?:&nbsp;|\u00a0|[ \t])+)/);
            const rest = leading ? inner.slice(leading[1].length) : inner;
            const trailing = rest.match(/((?:&nbsp;|\u00a0|[ \t])+)$/);
            if (!leading && !trailing) return match;
            const core = trailing ? rest.slice(0, -trailing[1].length) : rest;
            if (!core.replace(/&nbsp;|\u00a0|\s/g, "")) return match;
            const before = full.slice(0, offset);
            const after = full.slice(offset + match.length);
            const blockBefore = before.split(/<(?:p|li|h1|h2|h3|blockquote|figcaption)\b[^>]*>/i).pop() ?? "";
            const blockAfter = after.split(/<\/(?:p|li|h1|h2|h3|blockquote|figcaption)>/i)[0] ?? "";
            const outside = `${blockBefore}${blockAfter}`.replace(/<[^>]+>/g, "").replace(/&nbsp;|\u00a0|\s/g, "");
            if (!outside) return match;
            const lead = leading ? leading[1].replace(/&nbsp;|\u00a0/g, " ") : "";
            const spaces = trailing ? trailing[1].replace(/&nbsp;|\u00a0/g, " ") : "";
            return `${lead}<${tag}${attrs}>${core}</${tag}>${spaces}`;
        });
        if (next === current) return current;
        current = next;
    }
    return current;
}

export function plainGaps(text: string): string {
    return text.replace(/(\S)((?:&nbsp;|\u00a0| )*(?:&nbsp;|\u00a0)(?:&nbsp;|\u00a0| )*)(?=\S)/g, (_match, before: string, gaps: string) => {
        return before + gaps.replace(/&nbsp;|\u00a0/g, " ");
    });
}

export function plainSpacesAfterMarks(html: string): string {
    return html
        .replace(/(<\/(?:b|strong|i|em|u|s|strike|del|a)>)((?:&nbsp;|\u00a0| )+)(?=[^<\s])/gi, (match, close: string, gaps: string) => {
            if (!/(?:&nbsp;|\u00a0)/.test(gaps)) return match;
            return close + gaps.replace(/&nbsp;|\u00a0/g, " ");
        })
        .replace(/(<(?:p|h1|h2|h3|li|blockquote|figcaption)\b[^>]*>)(?:&nbsp;|\u00a0)(?=[^\s<])/gi, "$1 ")
        .replace(/>([^<]*)</g, (_match, text: string) => `>${plainGaps(text)}<`);
}

export function styledLine(input: {
    key: string;
    shiftKey?: boolean;
    altKey?: boolean;
    ctrlKey?: boolean;
    metaKey?: boolean;
    collapsed: boolean;
    atBlockEnd: boolean;
    coversBlock: boolean[];
}): number | null {
    if (input.key !== "Enter" || input.shiftKey || input.altKey || input.ctrlKey || input.metaKey) return null;
    if (!input.collapsed || !input.atBlockEnd) return null;
    if (input.coversBlock.length === 0 || input.coversBlock.every(Boolean)) return null;
    let count = 0;
    for (const covers of input.coversBlock) {
        if (!covers) break;
        count += 1;
    }
    return count;
}

export function styledLineUndoCaret(offset: number | null): number | null {
    if (offset === null || !Number.isFinite(offset) || offset < 0) return null;
    return Math.floor(offset);
}

const SENTENCE_PUNCTUATION = new Set([".", ",", ";", ":", "!", "?", ")", "]", "}", "…"]);

export type StyledSpace = "outside" | "pass";

export function styledPunctuation(input: {
    key: string;
    shiftKey?: boolean;
    altKey?: boolean;
    ctrlKey?: boolean;
    metaKey?: boolean;
    collapsed: boolean;
    atMarkEnd: boolean;
    outsideText: boolean;
    endsWithDigit: boolean;
}): StyledSpace {
    if (input.altKey || input.ctrlKey || input.metaKey || !input.collapsed) return "pass";
    if (!input.atMarkEnd || !input.outsideText || !SENTENCE_PUNCTUATION.has(input.key)) return "pass";
    if (input.endsWithDigit && (input.key === "." || input.key === ",")) return "pass";
    return "outside";
}

export function styledSpace(input: {
    key: string;
    shiftKey?: boolean;
    altKey?: boolean;
    ctrlKey?: boolean;
    metaKey?: boolean;
    collapsed: boolean;
    atMarkEnd: boolean;
    outsideText: boolean;
}): StyledSpace {
    if (input.altKey || input.ctrlKey || input.metaKey || !input.collapsed) return "pass";
    if (input.key !== " " || !input.atMarkEnd || !input.outsideText) return "pass";
    return "outside";
}

export function joinGap(previous: string, next: string): { trimPrevious: number; trimNext: number; insert: boolean; separate: boolean } {
    const left = previous.replace(/\u00a0/g, " ");
    const right = next.replace(/\u00a0/g, " ");
    if (!left.trim() || !right.trim()) return { trimPrevious: 0, trimNext: 0, insert: false, separate: false };
    const trailing = left.length - left.trimEnd().length;
    const leading = right.length - right.trimStart().length;
    const end = left.trimEnd();
    const start = right.trimStart();
    const opens = /[\p{L}\p{N}\p{Pc},.!?;:)\]"']$/u.test(end);
    const continues = /^[\p{L}\p{N}\p{Pc}(["']/u.test(start);
    if (!opens || !continues) return { trimPrevious: 0, trimNext: 0, insert: false, separate: false };
    return {
        trimPrevious: Math.max(0, trailing - 1),
        trimNext: leading,
        insert: trailing === 0,
        separate: true,
    };
}

export function joinNeedsSpace(previous: string, next: string): boolean {
    const gap = joinGap(previous, next);
    return gap.insert && gap.trimPrevious === 0 && gap.trimNext === 0;
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

export function joinUndoCaret(input: { forward: boolean; offset: number }): number | null {
    if (!input.forward || !Number.isFinite(input.offset) || input.offset < 0) return null;
    return Math.floor(input.offset);
}

export function blankUndoCaret(saved: { caret?: number } | null): number | null {
    if (!saved || typeof saved.caret !== "number" || !Number.isFinite(saved.caret) || saved.caret < 0) return null;
    return Math.floor(saved.caret);
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

export type QuoteBlocks = "together" | "browser";

export function quoteCoveredBlocks(input: { covered: number; consecutive: boolean }): QuoteBlocks {
    if (input.covered > 1 && input.consecutive) return "together";
    return "browser";
}

export type QuoteListPlan =
    | { action: "wrap" }
    | { action: "split"; quoted: { start: number | null }; after: { start: number | null } | null };

export function quoteListPlan(input: {
    ordered: boolean;
    start?: string | null;
    values?: Array<string | null | undefined>;
    count: number;
    from: number;
    to: number;
}): QuoteListPlan | null {
    if (!Number.isInteger(input.count) || input.count < 1) return null;
    if (!Number.isInteger(input.from) || !Number.isInteger(input.to)) return null;
    if (input.from < 0 || input.to < input.from || input.to >= input.count) return null;
    if (input.from === 0 && input.to === input.count - 1) return { action: "wrap" };
    const ownNumber = (index: number) => input.ordered && wholeNumber(input.values?.[index]) !== null;
    const keptStart = (index: number) => {
        if (!input.ordered || ownNumber(index)) return null;
        const number = orderedItemNumber({ start: input.start, values: input.values, index });
        return number === 1 ? null : number;
    };
    const hasAfter = input.to + 1 < input.count;
    return {
        action: "split",
        quoted: { start: keptStart(input.from) },
        after: hasAfter ? { start: keptStart(input.to + 1) } : null,
    };
}

export type QuoteListKind = "ul" | "ol" | "other" | "none";

export function quoteListAgain(input: { quoted: QuoteListKind; previous: QuoteListKind; next: QuoteListKind }): { previous: boolean; next: boolean } {
    const same = (side: QuoteListKind) => (input.quoted === "ul" || input.quoted === "ol") && side === input.quoted;
    return { previous: same(input.previous), next: same(input.next) };
}

export function quotedListJoinValue(input: { ordered: boolean; previous: number | null; number: number }): number | null {
    if (!input.ordered || input.previous === null) return null;
    if (!Number.isInteger(input.previous) || !Number.isInteger(input.number)) return null;
    if (input.number === input.previous + 1) return null;
    return input.number;
}

export type QuoteToggle = "leave" | "quote";

export function quoteToggle(input: { inside: boolean }): QuoteToggle {
    if (input.inside) return "leave";
    return "quote";
}

export type ItalicQuote = "browser" | "mark" | "clear" | "arm" | "plain" | "disarm";

export function italicInQuote(input: { inQuote: boolean; inItalic: boolean; collapsed: boolean; pending: "italic" | "plain" | null }): ItalicQuote {
    if (!input.inQuote) return "browser";
    if (input.collapsed && !input.inItalic) return input.pending === "italic" ? "disarm" : "arm";
    if (input.collapsed && input.inItalic) return input.pending === "plain" ? "disarm" : "plain";
    if (input.inItalic) return "clear";
    return "mark";
}

export function typedQuoteUndoCaret(offset: number): number | null {
    if (!Number.isFinite(offset) || offset < 0) return null;
    return Math.floor(offset);
}

export type QuoteItalicKey = "keep" | "release" | "clear";

export function quoteItalicKey(input: {
    key: string;
    shiftKey?: boolean;
    altKey?: boolean;
    ctrlKey?: boolean;
    metaKey?: boolean;
    held: boolean;
}): QuoteItalicKey {
    const typing = input.key.length === 1 && !input.ctrlKey && !input.metaKey && !input.altKey;
    const modifier = input.key === "Control" || input.key === "Meta" || input.key === "Alt" || input.key === "Shift";
    if (typing || modifier || styleShortcut(input) === "italic") return "keep";
    if (input.held) return "release";
    return "clear";
}

export type LinkUnderline = "browser" | "mark" | "clear" | "arm" | "plain" | "disarm";

export function linkUnderline(input: { inLink: boolean; inUnderline: boolean; collapsed: boolean; pending: "underline" | "plain" | null }): LinkUnderline {
    if (!input.inLink) return "browser";
    if (input.collapsed && !input.inUnderline) return input.pending === "underline" ? "disarm" : "arm";
    if (input.collapsed && input.inUnderline) return input.pending === "plain" ? "disarm" : "plain";
    if (input.inUnderline) return "clear";
    return "mark";
}

export function linkUnderlineShown(input: { inLink: boolean; inUnderline: boolean; pending: "underline" | "plain" | null; browser: boolean }): boolean {
    if (!input.inLink) return input.browser;
    if (input.pending === "underline") return true;
    if (input.pending === "plain") return false;
    return input.inUnderline;
}

export type LinkUnderlineKey = "keep" | "release" | "clear";

export function linkUnderlineKey(input: {
    key: string;
    shiftKey?: boolean;
    altKey?: boolean;
    ctrlKey?: boolean;
    metaKey?: boolean;
    held: boolean;
}): LinkUnderlineKey {
    const typing = input.key.length === 1 && !input.ctrlKey && !input.metaKey && !input.altKey;
    const modifier = input.key === "Control" || input.key === "Meta" || input.key === "Alt" || input.key === "Shift";
    if (typing || modifier || styleShortcut(input) === "underline") return "keep";
    if (input.held) return "release";
    return "clear";
}

export type DeletedStrike = "browser" | "clear" | "plain" | "disarm";

export function deletedStrike(input: { inDeleted: boolean; collapsed: boolean; pending: "plain" | null }): DeletedStrike {
    if (!input.inDeleted) return "browser";
    if (input.collapsed) return input.pending === "plain" ? "disarm" : "plain";
    return "clear";
}

export function deletedStrikeShown(input: { inDeleted: boolean; pending: "plain" | null; browser: boolean }): boolean {
    if (!input.inDeleted) return input.browser;
    return input.pending !== "plain";
}

export type DeletedStrikeKey = "keep" | "clear";

export function deletedStrikeKey(input: {
    key: string;
    altKey?: boolean;
    ctrlKey?: boolean;
    metaKey?: boolean;
}): DeletedStrikeKey {
    const typing = input.key.length === 1 && !input.ctrlKey && !input.metaKey && !input.altKey;
    const modifier = input.key === "Control" || input.key === "Meta" || input.key === "Alt" || input.key === "Shift";
    if (typing || modifier) return "keep";
    return "clear";
}

export type StyleStart = "start" | "pass";

export function styleStartType(input: { inStyle: boolean; collapsed: boolean; atStart: boolean }): StyleStart {
    if (input.inStyle && input.collapsed && input.atStart) return "start";
    return "pass";
}

export type LinkEdge = "start" | "end" | "pass";

export function linkEdgeType(input: { inLink: boolean; collapsed: boolean; atStart: boolean; atEnd: boolean }): LinkEdge {
    if (!input.inLink || !input.collapsed) return "pass";
    if (input.atStart) return "start";
    if (input.atEnd) return "end";
    return "pass";
}

export type ListCommand = "lift" | "pass";

export function listCommand(command: string): ListCommand {
    if (command === "insertUnorderedList" || command === "insertOrderedList") return "lift";
    return "pass";
}

export function listUndoCaret(offset: number | null): number | null {
    if (offset === null || !Number.isFinite(offset) || offset < 0) return null;
    return Math.floor(offset);
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

export function orderedItemNumber(input: { start?: string | null; values?: Array<string | null | undefined>; index: number }): number {
    const start = wholeNumber(input.start);
    let number = start ?? 1;
    const index = Math.max(0, input.index);
    const values = input.values ?? [];
    for (let i = 0; i <= index; i += 1) {
        const value = wholeNumber(values[i]);
        if (value !== null) number = value;
        else if (i > 0) number += 1;
    }
    return number;
}

function wholeNumber(value?: string | null): number | null {
    if (value == null || !/^-?\d+$/.test(value.trim())) return null;
    const number = Number(value);
    return Number.isSafeInteger(number) ? number : null;
}

export type ListEnter = "above" | "pass";

export function listEnterKey(input: {
    key: string;
    shiftKey?: boolean;
    altKey?: boolean;
    ctrlKey?: boolean;
    metaKey?: boolean;
    inItem: boolean;
    collapsed: boolean;
    empty: boolean;
    atStart: boolean;
}): ListEnter {
    if (input.key !== "Enter" || input.shiftKey || input.altKey || input.ctrlKey || input.metaKey) return "pass";
    if (!input.inItem || !input.collapsed || input.empty || !input.atStart) return "pass";
    return "above";
}

export type ListLeavePlace = "replace" | "before" | "split" | "after";

export function listLeavePlace(input: { remaining: boolean; preceding: boolean; following: boolean }): ListLeavePlace {
    if (!input.remaining) return "replace";
    if (input.following && !input.preceding) return "before";
    if (input.following && input.preceding) return "split";
    return "after";
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

export function codePullUndoCaret(offset: number | null): number | null {
    if (offset === null || !Number.isFinite(offset) || offset < 0) return null;
    return Math.floor(offset);
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

export type DateFormatReach = "hold" | "writing" | "run";

export function dateFormatReach(input: {
    command: string;
    touchesDate: boolean;
    onlyDate: boolean;
}): DateFormatReach {
    if (input.command === "undo" || input.command === "redo") return "run";
    if (input.onlyDate) return "hold";
    if (input.touchesDate) return "writing";
    return "run";
}

export function dateHeadingCommand(command: string, inDate: boolean): "run" | "hold" {
    return dateFormatReach({ command, touchesDate: inDate, onlyDate: inDate }) === "hold" ? "hold" : "run";
}

const DATE_WRITING_TAGS = new Set(["P", "H1", "H2", "H3", "LI", "UL", "OL", "BLOCKQUOTE", "PRE"]);

export function dateLeaveTarget(tag: string): "into" | "past" {
    return DATE_WRITING_TAGS.has(tag) ? "into" : "past";
}

export type DateArrow = "past" | "pass";

export function dateCaretLeave(input: {
    inHeading: boolean;
    exact: boolean;
    next: "into" | "past" | "none";
}): "past" | "peel" | "into" | "stay" {
    if (!input.inHeading) return "stay";
    if (!input.exact) return "peel";
    if (input.next === "into") return "into";
    return "past";
}

export function dateArrow(input: {
    key: string;
    altKey?: boolean;
    ctrlKey?: boolean;
    metaKey?: boolean;
    shiftKey?: boolean;
    where: "heading" | "after";
    atEnd: boolean;
    next: "into" | "past" | "none";
}): DateArrow {
    if (input.altKey || input.ctrlKey || input.metaKey || input.shiftKey) return "pass";
    if (input.where !== "heading" || input.next !== "past") return "pass";
    if (input.key === "ArrowDown") return "past";
    if (input.key === "ArrowRight" && input.atEnd) return "past";
    return "pass";
}

export function dateLineTyping(input: { writing: boolean; peeled: boolean; paragraph: boolean }): "new-line" | "into-line" {
    if (input.peeled || (input.paragraph && !input.writing)) return "into-line";
    return "new-line";
}

export function freshDateLineMarkup(letter: string, following: string): string {
    const safe = letter.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
    return `<p>${safe}</p>${following}`;
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
    return entryFindMonths(dates.map((createdAt) => ({ createdAt, matches: true })));
}

export function entryFindMonths(entries: readonly { createdAt: string; matches: boolean }[]): EntryMonth[] {
    const counts = new Map<string, number>();
    for (const entry of entries) {
        const key = monthKey(entry.createdAt);
        if (!key) continue;
        counts.set(key, (counts.get(key) ?? 0) + (entry.matches ? 1 : 0));
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

export function entryFindCountLabel(count: number, query: string): string | null {
    if (!query.trim() || count < 1) return null;
    return count === 1 ? "1 entry" : `${count} entries`;
}

export function diaryFindCountLabel(count: number, query: string): string | null {
    if (!query.trim() || count < 1) return null;
    return count === 1 ? "1 diary" : `${count} diaries`;
}

export function retitleEntryDate(html: string, fromLabel: string, toLabel: string): string {
    if (!fromLabel || !toLabel || fromLabel === toLabel) return html;
    const prefix = `<h2>${fromLabel}</h2>`;
    if (!html.startsWith(prefix)) return html;
    return `<h2>${toLabel}</h2>${html.slice(prefix.length)}`;
}

export function calendarDateFromLabel(label: string): string | null {
    if (!isGeneratedDateLabel(label)) return null;
    const parts = /^[A-Za-z]+, ([A-Za-z]+) (\d{1,2}), (\d{4})$/.exec(label);
    if (!parts) return null;
    const month = MONTH_INDEX.get(parts[1]);
    if (month === undefined) return null;
    return `${parts[3]}-${String(month + 1).padStart(2, "0")}-${String(Number(parts[2])).padStart(2, "0")}`;
}

export function dateFieldAfterEdit(html: string, field: string): string {
    const match = /^<h2\b[^>]*>([\s\S]*?)<\/h2>/i.exec(html.trim());
    if (!match) return field;
    const text = decodeEntryText((match[1] ?? "").replace(/<[^>]+>/g, " ")).replace(/\s+/g, " ").trim();
    if (leadingDateLabel(text) !== text) return field;
    return calendarDateFromLabel(text) ?? field;
}

export function dateRetitleAction(html: string, fromLabel: string, toLabel: string): "type" | "keep" {
    return retitleEntryDate(html, fromLabel, toLabel) === html ? "keep" : "type";
}

const REVISION_GAP_MS = 2000;

export function entryWasRevised(createdAt: string | Date, updatedAt: string | Date): boolean {
    const created = new Date(createdAt).getTime();
    const updated = new Date(updatedAt).getTime();
    return Number.isFinite(created) && Number.isFinite(updated) && updated - created > REVISION_GAP_MS;
}

export function entrySearchWriting(entry: { content?: string | null; plainText?: string | null }): string {
    const fromPage = entry.content ? entryWritingText(entry.content) : "";
    if (fromPage) return fromPage;
    return entry.plainText?.trim() ?? "";
}

export function entrySearchParts(entry: {
    content: string;
    plainText?: string | null;
    createdAt: string;
    updatedAt: string;
}): string[] {
    const writing = entrySearchWriting(entry);
    const clock = formatEntryTime(entry.createdAt);
    const looseClock = clock.replace(/^0/, "");
    const parts = [writing, formatDiaryDate(entry.createdAt), formatEntryLong(entry.createdAt), clock];
    if (looseClock !== clock) parts.push(looseClock);
    if (entryWasRevised(entry.createdAt, entry.updatedAt)) parts.push("edited");
    return parts.filter(Boolean);
}

export function entryListSearchText(entry: {
    content: string;
    plainText?: string | null;
    createdAt: string;
    updatedAt: string;
}): string {
    return entrySearchParts(entry).join(" ");
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
    mode: "compose" | "view" | "edit" = "view",
): T | null {
    if (mode !== "view" || !visible.length) return null;
    if (currentId && visible.some((entry) => entry._id === currentId)) return null;
    return entryToShowOnOpen(visible);
}

export function entryToOpenForFilter<T extends { _id: string; createdAt: string }>(
    visible: readonly T[],
    currentId: string | null,
    mode: "compose" | "view" | "edit" = "view",
): T | null {
    if (mode !== "view" || !currentId) return null;
    return entryToOpenWhenHidden(visible, currentId);
}

export function showOpenEntry<T extends { _id: string }>(
    visible: readonly T[],
    currentId: string | null,
    mode: "compose" | "view" | "edit",
    confirming = false,
): boolean {
    if (mode !== "view" || confirming) return true;
    if (!currentId) return visible.length > 0;
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
