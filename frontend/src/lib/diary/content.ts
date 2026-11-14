import { CONTENT_MAX } from "./constants";
import { sanitizeEntryHtml } from "./sanitize";
import { entryPlainText, hasEntryContent } from "./text";

export type PreparedEntryResult =
    | { ok: true; content: string; plainText: string }
    | { ok: false; error: string };

export function prepareEntryContent(input: unknown): PreparedEntryResult {
    if (typeof input !== "string") {
        return { ok: false, error: "Content is required." };
    }
    if (input.length > CONTENT_MAX) {
        return { ok: false, error: "Entry is too large. Use fewer or smaller images." };
    }

    const content = sanitizeEntryHtml(input);
    if (content.length > CONTENT_MAX) {
        return { ok: false, error: "Entry is too large. Use fewer or smaller images." };
    }

    const plainText = entryPlainText(content);
    if (!hasEntryContent(content)) {
        return { ok: false, error: "Content is required." };
    }

    return { ok: true, content, plainText: plainText || "Image" };
}

export function presentEntry(entry: { content: string; plainText?: string | null }): { content: string; plainText: string } {
    const content = sanitizeEntryHtml(typeof entry.content === "string" ? entry.content : "");
    const plainText = entryPlainText(content);
    return { content, plainText: plainText || (hasEntryContent(content) ? "Image" : "") };
}
