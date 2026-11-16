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
    return [text, ...extra].join(" ").replace(/\u200b/g, "").replace(/\s+([.,;:!?])/g, "$1").replace(/\s+/g, " ").trim();
}

export function dropCaretMarker(input: { text: string; offset: number }): { text: string; offset: number } | null {
    if (!input.text.includes("\u200b")) return null;
    const visible = input.text.replace(/\u200b/g, "");
    if (!visible) return null;
    let removedBefore = 0;
    const end = Math.min(input.offset, input.text.length);
    for (let index = 0; index < end; index += 1) {
        if (input.text[index] === "\u200b") removedBefore += 1;
    }
    return { text: visible, offset: Math.max(0, Math.min(input.offset - removedBefore, visible.length)) };
}

export type CaretMarkBeside = "drop" | "keep";

export function caretMarkBeside(input: { text: string; caretInside: boolean; writingBeside: boolean }): CaretMarkBeside {
    if (input.text.replace(/\u200b/g, "").replace(/[\u00a0\s]/g, "")) return "keep";
    if (!input.text.includes("\u200b") || input.caretInside || !input.writingBeside) return "keep";
    return "drop";
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

export type QuoteLineEdge = "out" | "stay";

export function quoteLineEdge(input: { parent: "quote" | "other"; atEdge: boolean }): QuoteLineEdge {
    return input.parent === "quote" && input.atEdge ? "out" : "stay";
}

export type QuoteJoinTarget = "line" | "quote";

export function quoteJoinTarget(input: { direction: "next" | "previous"; hasLine: boolean }): QuoteJoinTarget {
    return input.direction === "next" && input.hasLine ? "line" : "quote";
}

export type QuotePictureJoin = "part" | "whole";

export function quotePictureJoin(input: { leading: "picture" | "writing" | "none" }): QuotePictureJoin {
    return input.leading === "none" ? "whole" : "part";
}

export type QuoteLineLeave = "leave" | "stay";

export function quoteTrailingLeave(input: { trailing: boolean; outside: boolean }): QuoteLineLeave {
    return input.trailing && input.outside ? "leave" : "stay";
}

export type QuoteListTail = "line" | "quote";

export function quoteListTail(input: { last: "list" | "writing" | "other" }): QuoteListTail {
    return input.last === "other" ? "quote" : "line";
}

export type QuoteAfterList = "out" | "stay";

export function quoteAfterList(input: { listParent: "quote" | "item" | "other" }): QuoteAfterList {
    return input.listParent === "quote" || input.listParent === "item" ? "out" : "stay";
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
    if (input.collapsed || input.altKey) return "pass";
    const word = Boolean(input.ctrlKey || input.metaKey);
    if (word && input.key !== "Backspace" && input.key !== "Delete") return "pass";
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

const LEADING_WORD_MARKS = new Set(["$", "\u20ac", "\u00a3", "\u20b9", "\u00a5", "#"]);

export function wordLeadSpan(text: string, start: number, end: number): { start: number; end: number } {
    const word = (index: number) => /[\p{L}\p{N}]/u.test(text[index] ?? "");
    const digit = (index: number) => /\p{N}/u.test(text[index] ?? "");
    const sign = LEADING_WORD_MARKS.has(text[start] ?? "");
    const signAndDot = end === start + 2 && sign && text[start + 1] === "." && digit(start + 2);
    const one = end === start + 1 && (sign || (text[start] === "." && !word(start - 1)));
    if ((!one && !signAndDot) || word(start - 1)) return { start, end };
    let cursor = signAndDot ? start + 2 : start + 1;
    if (text[start] === "." && one) {
        if (!digit(cursor)) return { start, end };
        while (digit(cursor)) cursor += 1;
        return { start, end: cursor };
    }
    if (!word(cursor) && !(text[cursor] === "." && digit(cursor + 1))) return { start, end };
    while (word(cursor)) cursor += 1;
    while (digit(cursor - 1) && text[cursor] === "," && digit(cursor + 1)) {
        cursor += 2;
        while (digit(cursor)) cursor += 1;
    }
    if ((digit(cursor - 1) || text[cursor] === ".") && text[cursor] === "." && digit(cursor + 1)) {
        cursor += 2;
        while (digit(cursor)) cursor += 1;
    }
    return { start, end: cursor };
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
        if (text[start - 1] === "." && digit(start) && !word(start - 2)) start -= 1;
        if ((text[start - 1] === "$" || text[start - 1] === "\u20ac" || text[start - 1] === "\u00a3" || text[start - 1] === "\u20b9" || text[start - 1] === "\u00a5" || text[start - 1] === "#") && !word(start - 2) && (word(start) || (text[start] === "." && digit(start + 1)))) start -= 1;
        if (end === start + 1 && word(start - 1) && (sticky(start) || ((text[start] === "." || text[start] === ":") && !word(end)))) {
            while (word(start - 1) || (text[start - 1] === "," && digit(start - 2) && digit(start))) start -= 1;
            if (text[start - 1] === "." && digit(start) && !word(start - 2)) start -= 1;
            if ((text[start - 1] === "$" || text[start - 1] === "\u20ac" || text[start - 1] === "\u00a3" || text[start - 1] === "\u20b9" || text[start - 1] === "\u00a5" || text[start - 1] === "#") && !word(start - 2) && (word(start) || (text[start] === "." && digit(start + 1)))) start -= 1;
        }
        const pulled = pullJoiner(start - 1);
        if (pulled !== undefined && word(start)) start = pulled;
        else if (word(start - 1) && word(end) && joinerSpan(start, end)) {
            end += 1;
            while (word(end)) end += 1;
        } else if (word(end - 1) || text[end - 1] === "%" || text[end - 1] === "\u00b0") {
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
        if ((word(end - 1) || text[end - 1] === "%" || text[end - 1] === "\u00b0") && held(end)) {
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
            let limit = suffix.end;
            const pairClose = pairs.get(text[suffix.wordStart - 1] ?? "");
            let paired = false;
            if (pairClose !== undefined && !word(suffix.wordStart - 2)) {
                let cursor = suffix.end;
                while (held(cursor)) cursor += 1;
                if (text[cursor] === pairClose) {
                    paired = true;
                    limit = cursor + 1;
                }
            }
            let tail = limit;
            while (tail < end && (space(tail) || held(tail))) tail += 1;
            const touchesPlus = start < suffix.end && end > suffix.plusStart;
            const entireWord = start <= suffix.wordStart && end >= suffix.plusStart;
            const markAfter = start === suffix.end && held(start);
            if ((touchesPlus || entireWord || markAfter) && (end <= limit || tail === end)) {
                start = paired ? suffix.wordStart - 1 : suffix.wordStart;
                end = limit;
                const joined = afterJoiner(end);
                if (joined !== undefined) end = joined;
                else while (held(end)) end += 1;
            }
        }
        const signedEnd = (from: number): number | undefined => {
            if (!LEADING_WORD_MARKS.has(text[from] ?? "")) return undefined;
            let cursor = from + 1;
            const rate = (index: number) => (text[index] === "%" || text[index] === "\u00b0") ? index + 1 : index;
            if (text[cursor] === "." && digit(cursor + 1)) {
                cursor += 1;
                while (digit(cursor)) cursor += 1;
                return rate(cursor);
            }
            if (!word(cursor)) return undefined;
            const number = digit(cursor);
            while (word(cursor)) cursor += 1;
            if (number) {
                while (digit(cursor - 1) && text[cursor] === "," && digit(cursor + 1)) {
                    cursor += 2;
                    while (digit(cursor)) cursor += 1;
                }
                if (digit(cursor - 1) && text[cursor] === "." && digit(cursor + 1)) {
                    cursor += 2;
                    while (digit(cursor)) cursor += 1;
                }
            }
            return rate(cursor);
        };
        const closer = text[end];
        const opensSigned = LEADING_WORD_MARKS.has(text[start] ?? "") && signedEnd(start) === end;
        if (closer !== undefined && pairs.get(text[start - 1] ?? "") === closer && (word(start) || opensSigned)) {
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
            const signed = signedEnd(start + 1);
            let cursor = start + 1;
            let covered = false;
            if (signed !== undefined) {
                let afterSigned = signed;
                while (held(afterSigned)) afterSigned += 1;
                if (text[afterSigned] === expectedClose) {
                    cursor = afterSigned;
                    covered = true;
                }
            }
            if (!covered) {
                while (cursor < text.length && (word(cursor) || (apostrophe(cursor) && word(cursor + 1)))) cursor += 1;
                const mark = trailingMark(cursor) ? plusSuffix(cursor) : undefined;
                if (mark && mark.wordStart === start + 1) {
                    let afterMark = mark.end;
                    while (held(afterMark)) afterMark += 1;
                    if (text[afterMark] === expectedClose) {
                        cursor = afterMark;
                        covered = true;
                    }
                } else if (wrappedWord(start + 1, cursor)) {
                    let afterWord = cursor;
                    while (held(afterWord)) afterWord += 1;
                    if (text[afterWord] === expectedClose) {
                        cursor = afterWord;
                        covered = true;
                    }
                }
                else if ((text[cursor] === "%" || text[cursor] === "\u00b0") && wrappedWord(start + 1, cursor)) {
                    let afterRate = cursor + 1;
                    while (held(afterRate)) afterRate += 1;
                    if (text[afterRate] === expectedClose) {
                        cursor = afterRate;
                        covered = true;
                    }
                }
            }
            if (covered) {
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
            } else {
                let probe = start - 1;
                while (probe >= 0 && !space(probe) && text[probe] !== expectedOpen) probe -= 1;
                if (text[probe] === expectedOpen && !word(probe - 1) && signedEnd(probe + 1) === start) {
                    start = probe;
                    while (held(end)) end += 1;
                }
            }
        } else if (text[start] === "%" || text[start] === "\u00b0") {
            let cursor = start + 1;
            while (held(cursor)) cursor += 1;
            const opener = closing(cursor);
            if (opener !== undefined && end > cursor && (end === cursor + 1 || marksOnly(cursor + 1, end))) {
                let probe = start - 1;
                while (probe >= 0 && !space(probe) && text[probe] !== opener) probe -= 1;
                if (text[probe] === opener && !word(probe - 1) && (signedEnd(probe + 1) === start + 1 || wrappedWord(probe + 1, start))) {
                    start = probe;
                    if (end < cursor + 1) end = cursor + 1;
                    while (held(end)) end += 1;
                }
            }
        } else if (held(start)) {
            let cursor = start;
            while (held(cursor)) cursor += 1;
            const opener = closing(cursor);
            if (opener !== undefined && end > cursor && (end === cursor + 1 || marksOnly(cursor + 1, end))) {
                let probe = start - 1;
                while (probe >= 0 && !space(probe) && text[probe] !== opener) probe -= 1;
                if (text[probe] === opener && !word(probe - 1) && (signedEnd(probe + 1) === start || wrappedWord(probe + 1, start))) {
                    start = probe;
                    if (end < cursor + 1) end = cursor + 1;
                    while (held(end)) end += 1;
                }
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

export type BlockBesideJoin = "line" | "pass";

export function blockBesideJoin(input: { beside: "quote" | "list" | "none" }): BlockBesideJoin {
    return input.beside === "none" ? "pass" : "line";
}

export type ItemBlockJoin = "line" | "pass";

export function itemBlockJoin(input: { beside: boolean }): ItemBlockJoin {
    return input.beside ? "line" : "pass";
}

export type BreakJoinSpace = "tight" | "pass";

export function breakJoinSpace(input: { afterBreak: boolean }): BreakJoinSpace {
    return input.afterBreak ? "tight" : "pass";
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

export type DividerLineKey = "rule" | "pass";

export function dividerLineKey(input: {
    key: string;
    shiftKey?: boolean;
    altKey?: boolean;
    ctrlKey?: boolean;
    metaKey?: boolean;
    collapsed: boolean;
    atEdge: boolean;
    rule: boolean;
}): DividerLineKey {
    if (input.shiftKey || input.altKey || !input.collapsed || !input.atEdge || !input.rule) return "pass";
    if (!(input.ctrlKey || input.metaKey)) return "pass";
    if (input.key !== "Backspace" && input.key !== "Delete") return "pass";
    return "rule";
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

export type QuoteCoveredReach = "inside" | "beyond";

export function quoteCoveredReach(input: { covered: number; touched: number }): QuoteCoveredReach {
    if (Number.isInteger(input.covered) && Number.isInteger(input.touched) && input.touched <= input.covered) return "inside";
    return "beyond";
}

export function quoteBreakBlock(tag: string): boolean {
    const name = tag.toLowerCase();
    return name === "hr" || name === "pre" || name === "figure";
}

export function quoteTouchedBlocks(input: { touched: number; consecutive: boolean; crossesList: boolean; crossesBreak?: boolean; crossesWriting?: boolean }): QuoteBlocks {
    if ((input.crossesList || input.crossesBreak || input.crossesWriting) && input.touched > 1 && input.consecutive) return "together";
    return "browser";
}

export type QuoteListPortion = "list" | "part" | "skip";

export function quoteListPortion(input: { count: number; from: number; to: number }): QuoteListPortion {
    if (!Number.isInteger(input.count) || input.count < 1) return "skip";
    if (!Number.isInteger(input.from) || !Number.isInteger(input.to)) return "skip";
    if (input.from < 0 || input.to < input.from || input.to >= input.count) return "skip";
    if (input.from === 0 && input.to === input.count - 1) return "list";
    return "part";
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

export type QuotedListLift = "keep" | "lift-start" | "lift-end" | "lift-both" | "stop";

export function quotedListLift(input: {
    sameParent: boolean;
    startContainsEnd: boolean;
    endContainsStart: boolean;
    startNested: boolean;
    endNested: boolean;
}): QuotedListLift {
    if (input.sameParent || input.startContainsEnd || input.endContainsStart) return "keep";
    if (input.startNested && input.endNested) return "lift-both";
    if (input.startNested) return "lift-start";
    if (input.endNested) return "lift-end";
    return "stop";
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

export function keptListNumber(input: { first: boolean; previous: number | null; number: number }): number | null {
    if (!Number.isInteger(input.number)) return null;
    if (input.first || input.previous === null) return input.number === 1 ? null : input.number;
    if (input.number === input.previous + 1) return null;
    return input.number;
}

export function listLineLeaves(input: { ordered: boolean; sameList: boolean }): boolean {
    return input.ordered && !input.sameList;
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

export type ListIndent = "indent" | "outdent" | "stay" | "pass";

export function listIndentKey(input: {
    key: string;
    shiftKey?: boolean;
    altKey?: boolean;
    ctrlKey?: boolean;
    metaKey?: boolean;
    inItem: boolean;
    collapsed: boolean;
    hasPrevious: boolean;
    nested: boolean;
}): ListIndent {
    if (input.key !== "Tab" || input.altKey || input.ctrlKey || input.metaKey) return "pass";
    if (!input.inItem) return "pass";
    if (!input.collapsed) return "stay";
    if (input.shiftKey) return input.nested ? "outdent" : "stay";
    return input.hasPrevious ? "indent" : "stay";
}

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
    if (input.shiftKey || input.altKey) return "pass";
    if (!input.inItem || !input.collapsed || !input.atStart || input.key !== "Backspace") return "pass";
    if (input.neighbor === "text") return "pass";
    return "outdent";
}

export type ListLeaveKey = "leave" | "outdent" | "pass";

export function listLeaveKey(input: {
    key: string;
    shiftKey?: boolean;
    altKey?: boolean;
    ctrlKey?: boolean;
    metaKey?: boolean;
    inItem: boolean;
    collapsed: boolean;
    empty: boolean;
    nested?: boolean;
}): ListLeaveKey {
    if (!input.inItem || !input.collapsed || !input.empty) return "pass";
    if (input.shiftKey || input.altKey || input.ctrlKey || input.metaKey) return "pass";
    if (input.key !== "Enter") return "pass";
    return input.nested ? "outdent" : "leave";
}

export type NestedListJoin = "join" | "pass";

export function nestedListJoinKey(input: {
    key: string;
    shiftKey?: boolean;
    altKey?: boolean;
    ctrlKey?: boolean;
    metaKey?: boolean;
    collapsed: boolean;
    atNestedStart: boolean;
    atParentEnd: boolean;
}): NestedListJoin {
    if (input.shiftKey || input.altKey || !input.collapsed) return "pass";
    if (input.key === "Backspace" && input.atNestedStart) return "join";
    if (input.key === "Delete" && input.atParentEnd) return "join";
    return "pass";
}

export type NestedEnter = "after" | "line" | "pass";

export function nestedEnterKey(input: {
    key: string;
    shiftKey?: boolean;
    altKey?: boolean;
    ctrlKey?: boolean;
    metaKey?: boolean;
    collapsed: boolean;
    atNestedStart: boolean;
    beforeChildList: boolean;
}): NestedEnter {
    if (input.key !== "Enter" || input.shiftKey || input.altKey || input.ctrlKey || input.metaKey || !input.collapsed) return "pass";
    if (input.atNestedStart) return "line";
    if (input.beforeChildList) return "after";
    return "pass";
}

export type NestedListLeave = "lift" | "keep";

export function nestedListLeave(input: { nested: boolean; host: string }): NestedListLeave {
    if (input.nested && (input.host === "P" || input.host === "H1" || input.host === "H2" || input.host === "H3")) return "lift";
    return "keep";
}

export type ListHeading = "line" | "pass";

export function listHeading(input: { command: string; value?: string; inItem: boolean }): ListHeading {
    const value = (input.value ?? "").toLowerCase();
    if (input.command === "formatBlock" && input.inItem && (value === "h1" || value === "h2" || value === "h3")) return "line";
    return "pass";
}

export type ListHeadingPicture = "lift" | "keep";

export function listHeadingPicture(input: { inItem: boolean; hasPicture: boolean }): ListHeadingPicture {
    if (input.inItem && input.hasPicture) return "lift";
    return "keep";
}

export type PictureListChange = "leave" | "switch" | "skip";

export function pictureListChange(input: { inList: boolean; hasPicture: boolean; sameKind: boolean }): PictureListChange {
    if (!input.inList || !input.hasPicture) return "skip";
    return input.sameKind ? "leave" : "switch";
}

export type PictureListReach = "lines" | "skip";

export type ListReachBlock = "line" | "list" | "skip";

export function listReachBlock(tag: string): ListReachBlock {
    const name = tag.toLowerCase();
    if (name === "ul" || name === "ol") return "list";
    if (name === "p" || name === "h1" || name === "h2" || name === "h3" || name === "blockquote") return "line";
    return "skip";
}

export type PictureCodeList = "beside" | "skip";

export function pictureCodeList(input: { inList: boolean; inCode: boolean; hasPicture: boolean }): PictureCodeList {
    if (input.inList && input.inCode && input.hasPicture) return "beside";
    return "skip";
}

export type PictureTableList = "beside" | "skip";

export function pictureTableList(input: { inList: boolean; inTable: boolean; hasPicture: boolean }): PictureTableList {
    if (input.inList && input.inTable && input.hasPicture) return "beside";
    return "skip";
}

export function pictureListReach(input: { inList: boolean; outsideList: boolean; hasPicture: boolean }): PictureListReach {
    if (input.inList && input.outsideList && input.hasPicture) return "lines";
    return "skip";
}

export type PictureStyle = "outside" | "pass";

export type PictureStyleHold = "aside" | "inside";

export function pictureStyleHold(input: { containsEdge: boolean }): PictureStyleHold {
    return input.containsEdge ? "inside" : "aside";
}

export type PictureStyleSeat = "line" | "between";

export function pictureStyleSeat(input: { inlineSibling: boolean }): PictureStyleSeat {
    return input.inlineSibling ? "line" : "between";
}

export type PictureLineItalic = "mark" | "clear" | "browser";

export function pictureLineItalic(input: { inQuote: boolean; covered: boolean }): PictureLineItalic {
    if (!input.inQuote) return "browser";
    return input.covered ? "clear" : "mark";
}

export type PictureLinkField = "add" | "edit" | "pass";

export function pictureLinkField(input: { crossesPicture: boolean; covered: boolean }): PictureLinkField {
    if (!input.crossesPicture) return "pass";
    return input.covered ? "edit" : "add";
}

export function pictureStyle(input: { command?: string; outsideSelected: boolean }): PictureStyle {
    if (!input.outsideSelected) return "pass";
    if (
        input.command === "bold"
        || input.command === "italic"
        || input.command === "underline"
        || input.command === "strikeThrough"
    ) return "outside";
    return "pass";
}

export type ListHeadingAcross = "lines" | "pass";

export function listHeadingAcross(input: { touchesList: boolean; across: boolean }): ListHeadingAcross {
    if (input.touchesList && input.across) return "lines";
    return "pass";
}

export type BreakHeadingAcross = "lines" | "pass";

export function breakHeadingAcross(input: { crossesBreak: boolean; across: boolean }): BreakHeadingAcross {
    if (input.crossesBreak && input.across) return "lines";
    return "pass";
}

export type WritingHeadingAcross = "lines" | "pass";

export function writingHeadingAcross(input: { crossesWriting: boolean; across: boolean }): WritingHeadingAcross {
    if (input.crossesWriting && input.across) return "lines";
    return "pass";
}

export type ListBlock = "open" | "pass";

export function listBlock(input: { kind: string; inItem: boolean }): ListBlock {
    if (input.inItem && (input.kind === "divider" || input.kind === "code")) return "open";
    return "pass";
}

export function listLineSpace(text: string, edge: "start" | "end"): string {
    if (edge === "start") return text.replace(/^[\s\u00a0]/, "");
    return text.replace(/[\s\u00a0]$/, "");
}

export type ListBlockPlace = "items" | "nested" | "span" | "pass";

export function listBlockPlace(input: { inItem: boolean; acrossItems?: boolean; acrossLists?: boolean; intoNested?: boolean; across?: boolean; separateLists?: boolean }): ListBlockPlace {
    if (!input.inItem) return "pass";
    if (input.acrossItems || input.acrossLists) return "items";
    if (input.intoNested) return "nested";
    if (input.across || input.separateLists) return "span";
    return "pass";
}

export type PictureBlockEnds = "writing" | "list" | "item" | "skip";

export function pictureBlockEnds(input: { start: string; end: string; hasPicture: boolean; sameBlock?: boolean }): PictureBlockEnds {
    if (!input.hasPicture) return "skip";
    const name = (tag: string) => tag.toLowerCase();
    const writing = (tag: string) => name(tag) === "p" || name(tag) === "h1" || name(tag) === "h2" || name(tag) === "h3";
    const list = (tag: string) => name(tag) === "ul" || name(tag) === "ol";
    if (input.sameBlock) {
        if (list(input.start) && name(input.start) === name(input.end)) return "item";
        return "skip";
    }
    if (!writing(input.start) && !list(input.start)) return "skip";
    if (!writing(input.end) && !list(input.end)) return "skip";
    if (list(input.start) || list(input.end)) return "list";
    return "writing";
}

export type PictureItemSpan = "item" | "across" | "skip";

export function pictureItemSpan(input: { sameItem: boolean; hasPicture: boolean }): PictureItemSpan {
    if (!input.hasPicture) return "skip";
    if (input.sameItem) return "item";
    return "across";
}

export function listBlockNumbers(input: { item: number; following: number[]; split: boolean }): number[] {
    if (!input.split) return input.following;
    const numbers = [input.item + 1];
    let previous = input.item + 1;
    for (const number of input.following) {
        const kept = number > previous ? number : previous + 1;
        numbers.push(kept);
        previous = kept;
    }
    return numbers;
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
    if (input.shiftKey || input.altKey || !input.collapsed) return "pass";
    if (input.key === "Backspace" && input.atStart && (input.neighbor === "text" || input.neighbor === "code")) return "pull";
    if (input.key === "Delete" && input.atEnd && input.neighbor === "code") return "pull";
    return "pass";
}

export type CodeForwardJoin = "line" | "pass";

export function codeForwardJoin(input: {
    key: string;
    shiftKey?: boolean;
    altKey?: boolean;
    ctrlKey?: boolean;
    metaKey?: boolean;
    collapsed: boolean;
    atEnd: boolean;
    next: "writing" | "list" | "quote" | "code" | "none";
}): CodeForwardJoin {
    if (input.shiftKey || input.altKey || !input.collapsed || !input.atEnd) return "pass";
    if (input.key !== "Delete" || input.next === "none") return "pass";
    return "line";
}

export type CodeListNest = "keep" | "drop";

export function codeListNest(input: { nested: boolean }): CodeListNest {
    return input.nested ? "keep" : "drop";
}

export type CodePastItem = "out" | "stay";

export function codePastItem(input: { host: "item" | "list" | "other" }): CodePastItem {
    return input.host === "other" ? "stay" : "out";
}

export type CodePictureWords = "words" | "pass";

export function codePictureWords(input: { before: boolean }): CodePictureWords {
    return input.before ? "words" : "pass";
}

export type CodeAhead = "code" | "words" | "pass";

export function codeAhead(input: { code: boolean; wordsBefore: boolean }): CodeAhead {
    if (!input.code) return "pass";
    return input.wordsBefore ? "words" : "code";
}

export type CodeTail = "line" | "pass";

export function codeTail(input: { text: boolean }): CodeTail {
    return input.text ? "line" : "pass";
}

export type CodeLead = "pull" | "pass";

export function codeLead(input: { words: boolean }): CodeLead {
    return input.words ? "pull" : "pass";
}

export type CodeForwardLead = "pull" | "pass";

export function codeForwardLead(input: { words: boolean }): CodeForwardLead {
    return input.words ? "pull" : "pass";
}

export type CodeMarkTail = "space" | "keep";

export function codeMarkTail(input: { mark: boolean }): CodeMarkTail {
    return input.mark ? "space" : "keep";
}

export type CodeTailBack = "pull" | "pass";

export function codeTailBack(input: { tail: boolean }): CodeTailBack {
    return input.tail ? "pull" : "pass";
}

export type CodeBlockTail = "pull" | "pass";

export function codeBlockTail(input: { block: boolean }): CodeBlockTail {
    return input.block ? "pull" : "pass";
}

export type CodeQuoteEnd = "pull" | "pass";

export function codeQuoteEnd(input: { quote: boolean }): CodeQuoteEnd {
    return input.quote ? "pull" : "pass";
}

export type CodeListEnd = "pull" | "pass";

export function codeListEnd(input: { list: boolean }): CodeListEnd {
    return input.list ? "pull" : "pass";
}

export type CodeNextItem = "pull" | "pass";

export function codeNextItem(input: { item: boolean }): CodeNextItem {
    return input.item ? "pull" : "pass";
}

export type CodeNestedItem = "pull" | "pass";

export function codeNestedItem(input: { nested: boolean }): CodeNestedItem {
    return input.nested ? "pull" : "pass";
}

export type CodeHeadingEnd = "pull" | "pass";

export function codeHeadingEnd(input: { heading: boolean }): CodeHeadingEnd {
    return input.heading ? "pull" : "pass";
}

export type CodeHeadingForward = "line" | "pass";

export function codeHeadingForward(input: { heading: boolean }): CodeHeadingForward {
    return input.heading ? "line" : "pass";
}

export type CodeDivForward = "line" | "pass";

export function codeDivForward(input: { block: boolean }): CodeDivForward {
    return input.block ? "line" : "pass";
}

export type CodeDivLine = "line" | "pass";

export function codeDivLine(input: { block: boolean }): CodeDivLine {
    return input.block ? "line" : "pass";
}

export type CodeDivHost = "line" | "pass";

export function codeDivHost(input: { host: boolean }): CodeDivHost {
    return input.host ? "line" : "pass";
}

export type CodeDivRest = "line" | "pass";

export function codeDivRest(input: { rest: boolean }): CodeDivRest {
    return input.rest ? "line" : "pass";
}

export type CodeDivNest = "line" | "pass";

export function codeDivNest(input: { nest: boolean }): CodeDivNest {
    return input.nest ? "line" : "pass";
}

export type CodeDivDeep = "line" | "pass";

export function codeDivDeep(input: { deep: boolean }): CodeDivDeep {
    return input.deep ? "line" : "pass";
}

export type CodeDivSide = "line" | "pass";

export function codeDivSide(input: { side: boolean }): CodeDivSide {
    return input.side ? "line" : "pass";
}

export type CodeDivList = "line" | "pass";

export function codeDivList(input: { list: boolean }): CodeDivList {
    return input.list ? "line" : "pass";
}

export type CodeDivHead = "line" | "pass";

export function codeDivHead(input: { head: boolean }): CodeDivHead {
    return input.head ? "line" : "pass";
}

export type CodeLineBreak = "line" | "pass";

export function codeLineBreak(input: { line: boolean }): CodeLineBreak {
    return input.line ? "line" : "pass";
}

export type CodeBackLine = "line" | "pass";

export function codeBackLine(input: { back: boolean }): CodeBackLine {
    return input.back ? "line" : "pass";
}

export type CodeListBack = "line" | "pass";

export function codeListBack(input: { item: boolean }): CodeListBack {
    return input.item ? "line" : "pass";
}

export type CodeQuoteBack = "line" | "pass";

export function codeQuoteBack(input: { quote: boolean }): CodeQuoteBack {
    return input.quote ? "line" : "pass";
}

export type CodeDivBack = "line" | "pass";

export function codeDivBack(input: { line: boolean }): CodeDivBack {
    return input.line ? "line" : "pass";
}

export type CodeDivJoin = "line" | "pass";

export function codeDivJoin(input: { line: boolean }): CodeDivJoin {
    return input.line ? "line" : "pass";
}

export type CodeBackBreak = "line" | "pass";

export function codeBackBreak(input: { broken: boolean }): CodeBackBreak {
    return input.broken ? "line" : "pass";
}

export type CodeHeldWords = "words" | "pass";

export function codeHeldWords(input: { held: boolean }): CodeHeldWords {
    return input.held ? "words" : "pass";
}

export type CodeHeldStay = "stay" | "pass";

export function codeHeldStay(input: { held: boolean }): CodeHeldStay {
    return input.held ? "stay" : "pass";
}

export type CodeWrappedStay = "stay" | "pass";

export function codeWrappedStay(input: { wrapped: boolean }): CodeWrappedStay {
    return input.wrapped ? "stay" : "pass";
}

export type CodeHeldCode = "line" | "pass";

export function codeHeldCode(input: { held: boolean }): CodeHeldCode {
    return input.held ? "line" : "pass";
}

export type CodeTableStay = "stay" | "pass";

export function codeTableStay(input: { table: boolean }): CodeTableStay {
    return input.table ? "stay" : "pass";
}

export type TableLineBack = "cell" | "pass";

export function tableLineBack(input: { atStart: boolean; table: boolean; empty: boolean; word?: boolean }): TableLineBack {
    if (!input.atStart || !input.table || input.empty) return "pass";
    return "cell";
}

export type CodeQuotedTable = "stay" | "pass";

export function codeQuotedTable(input: { quoted: boolean }): CodeQuotedTable {
    return input.quoted ? "stay" : "pass";
}

export type CodeQuotedWords = "words" | "pass";

export function codeQuotedWords(input: { quoted: boolean }): CodeQuotedWords {
    return input.quoted ? "words" : "pass";
}

export type CodeQuotedCode = "line" | "pass";

export function codeQuotedCode(input: { quoted: boolean }): CodeQuotedCode {
    return input.quoted ? "line" : "pass";
}

export type CodeQuotedCodeWords = "words" | "pass";

export function codeQuotedCodeWords(input: { quoted: boolean }): CodeQuotedCodeWords {
    return input.quoted ? "words" : "pass";
}

export type CodeQuotedDivider = "words" | "pass";

export function codeQuotedDivider(input: { quoted: boolean }): CodeQuotedDivider {
    return input.quoted ? "words" : "pass";
}

export type CodeQuotedPicture = "stay" | "pass";

export function codeQuotedPicture(input: { picture: boolean }): CodeQuotedPicture {
    return input.picture ? "stay" : "pass";
}

export type CodeNestedCode = "words" | "pass";

export function codeNestedCode(input: { nested: boolean }): CodeNestedCode {
    return input.nested ? "words" : "pass";
}

export type CodeNestedHeld = "words" | "pass";

export function codeNestedHeld(input: { nested: boolean }): CodeNestedHeld {
    return input.nested ? "words" : "pass";
}

export type CodeShellTable = "stay" | "words" | "pass";

export function codeShellTable(input: { table: boolean; words: boolean }): CodeShellTable {
    if (!input.table) return "pass";
    return input.words ? "words" : "stay";
}

export type CodeShellDivider = "words" | "stay" | "pass";

export function codeShellDivider(input: { divider: boolean; words: boolean }): CodeShellDivider {
    if (!input.divider) return "pass";
    return input.words ? "words" : "stay";
}

export type CodeShellCode = "line" | "words" | "pass";

export function codeShellCode(input: { code: boolean; words: boolean }): CodeShellCode {
    if (!input.code) return "pass";
    return input.words ? "words" : "line";
}

export type CodeQuoteInline = "words" | "pass";

export function codeQuoteInline(input: { inline: boolean }): CodeQuoteInline {
    return input.inline ? "words" : "pass";
}

export type CodeQuoteDiv = "line" | "pass";

export function codeQuoteDiv(input: { div: boolean }): CodeQuoteDiv {
    return input.div ? "line" : "pass";
}

export type CodeItemLine = "words" | "pass";

export function codeItemLine(input: { line: boolean }): CodeItemLine {
    return input.line ? "words" : "pass";
}

export type CodeHeadingLine = "words" | "pass";

export function codeHeadingLine(input: { line: boolean }): CodeHeadingLine {
    return input.line ? "words" : "pass";
}

export type CodeInnerLine = "words" | "pass";

export function codeInnerLine(input: { inner: boolean }): CodeInnerLine {
    return input.inner ? "words" : "pass";
}

export type CodeNextBlock = "words" | "pass";

export function codeNextBlock(input: { block: boolean }): CodeNextBlock {
    return input.block ? "words" : "pass";
}

export type CodeBreakLine = "line" | "pass";

export function codeBreakLine(input: { broken: boolean }): CodeBreakLine {
    return input.broken ? "line" : "pass";
}

export type CodeBlankBreak = "drop" | "pass";

export function codeBlankBreak(input: { blank: boolean }): CodeBlankBreak {
    return input.blank ? "drop" : "pass";
}

export type CodePriorItem = "pull" | "pass";

export function codePriorItem(input: { item: boolean }): CodePriorItem {
    return input.item ? "pull" : "pass";
}

export type CodeHostItem = "pull" | "pass";

export function codeHostItem(input: { host: boolean }): CodeHostItem {
    return input.host ? "pull" : "pass";
}

export type CodeBreakLead = "pull" | "pass";

export function codeBreakLead(input: { words: boolean }): CodeBreakLead {
    return input.words ? "pull" : "pass";
}

export type CodeDeepHost = "pull" | "pass";

export function codeDeepHost(input: { host: boolean }): CodeDeepHost {
    return input.host ? "pull" : "pass";
}

export type CodeListLead = "pull" | "pass";

export function codeListLead(input: { block: boolean }): CodeListLead {
    return input.block ? "pull" : "pass";
}

export type CodeBeside = "line" | "pass";

export function codeBeside(input: { code: boolean }): CodeBeside {
    return input.code ? "line" : "pass";
}

export type CodeInside = "line" | "pass";

export function codeInside(input: { code: boolean }): CodeInside {
    return input.code ? "line" : "pass";
}

export type CodeAfterHost = "pull" | "pass";

export function codeAfterHost(input: { words: boolean }): CodeAfterHost {
    return input.words ? "pull" : "pass";
}

export type CodeShellLead = "pull" | "pass";

export function codeShellLead(input: { shell: boolean }): CodeShellLead {
    return input.shell ? "pull" : "pass";
}

export type CodeEdgeLead = "pull" | "pass";

export function codeEdgeLead(input: { edge: boolean }): CodeEdgeLead {
    return input.edge ? "pull" : "pass";
}

export type CodePictureLead = "pull" | "pass";

export function codePictureLead(input: { picture: boolean }): CodePictureLead {
    return input.picture ? "pull" : "pass";
}

export type CodeTableLead = "pull" | "pass";

export function codeTableLead(input: { table: boolean }): CodeTableLead {
    return input.table ? "pull" : "pass";
}

export type CodeTableHost = "pull" | "pass";

export function codeTableHost(input: { table: boolean }): CodeTableHost {
    return input.table ? "pull" : "pass";
}

export type CodeListHost = "pull" | "pass";

export function codeListHost(input: { list: boolean }): CodeListHost {
    return input.list ? "pull" : "pass";
}

export type CodePictureHost = "pull" | "pass";

export function codePictureHost(input: { picture: boolean }): CodePictureHost {
    return input.picture ? "pull" : "pass";
}

export type CodeDividerHost = "pull" | "pass";

export function codeDividerHost(input: { divider: boolean }): CodeDividerHost {
    return input.divider ? "pull" : "pass";
}

export type CodeQuoteHost = "pull" | "pass";

export function codeQuoteHost(input: { quote: boolean }): CodeQuoteHost {
    return input.quote ? "pull" : "pass";
}

export type CodeDividerLead = "pull" | "pass";

export function codeDividerLead(input: { divider: boolean }): CodeDividerLead {
    return input.divider ? "pull" : "pass";
}

export type CodeDivLead = "pull" | "pass";

export function codeDivLead(input: { block: boolean }): CodeDivLead {
    return input.block ? "pull" : "pass";
}

export type CodeQuoteShell = "close" | "keep";

export function codeQuoteShell(input: { blank: boolean }): CodeQuoteShell {
    return input.blank ? "close" : "keep";
}

export type CodeQuoteLead = "code" | "pass";

export function codeQuoteLead(input: { leading: boolean }): CodeQuoteLead {
    return input.leading ? "code" : "pass";
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
    if (input.altKey || input.collapsed || !input.touchesDate) return "pass";
    const word = Boolean(input.ctrlKey || input.metaKey);
    if (word && input.key !== "Backspace" && input.key !== "Delete") return "pass";
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
    const word = Boolean(input.ctrlKey || input.metaKey);
    if (input.altKey || (word && input.key !== "Backspace" && input.key !== "Delete")) return "pass";
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
