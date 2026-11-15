import { MAX_IMAGE_BYTES } from "./constants";
import { sanitizeEntryHtml } from "./sanitize";
import { boundarySpaceCut, listLineSpace, sameEditingPage } from "./text";

const IMAGE_TYPES = new Set(["image/png", "image/jpeg", "image/gif", "image/webp"]);

export type ImageFileIssue = { title: string; description: string };

const LEFT_OUT: ImageFileIssue = {
    title: "Image left out",
    description: "Use a PNG, JPEG, GIF, or WebP under 150 KB.",
};

export function imageAltText(value: string): string {
    return value.replace(/\s+/g, " ").trim().slice(0, 180);
}

export type PictureCaptionKey = "break" | "hold" | "pass";

export function pictureCaptionKey(input: {
    key: string;
    shiftKey?: boolean;
    altKey?: boolean;
    ctrlKey?: boolean;
    metaKey?: boolean;
    collapsed: boolean;
    atStart: boolean;
    atEnd: boolean;
}): PictureCaptionKey {
    if (input.altKey || input.ctrlKey || input.metaKey) return "pass";
    if (input.key === "Enter") return "break";
    if (input.key === "Backspace" && input.collapsed && input.atStart) return "hold";
    if (input.key === "Delete" && input.collapsed && input.atEnd) return "hold";
    return "pass";
}

export type LineAfterPictureKey = "move" | "remove" | "pass";

export function lineAfterPictureKey(input: {
    key: string;
    altKey?: boolean;
    ctrlKey?: boolean;
    metaKey?: boolean;
    collapsed: boolean;
    atStart: boolean;
    empty: boolean;
}): LineAfterPictureKey {
    if (input.altKey || input.ctrlKey || input.metaKey) return "pass";
    if (input.key !== "Backspace" || !input.collapsed || !input.atStart) return "pass";
    return input.empty ? "remove" : "move";
}

export type SelectedPictureKey = "remove" | "name" | "after" | "pass";

export function selectedPictureKey(input: {
    key: string;
    altKey?: boolean;
    ctrlKey?: boolean;
    metaKey?: boolean;
    imageSelected: boolean;
}): SelectedPictureKey {
    if (!input.imageSelected || input.altKey || input.ctrlKey || input.metaKey) return "pass";
    if (input.key === "Backspace" || input.key === "Delete") return "remove";
    if (input.key === "Enter") return "after";
    if (input.key.length === 1) return "name";
    return "pass";
}

export type PictureFormat = "keep" | "pass" | "lines";

export function pictureFormat(input: { inPicture: boolean; command?: string; kind?: string; leavesPicture?: boolean; outsideSelected?: boolean }): PictureFormat {
    if (!input.inPicture) return "pass";
    if (input.kind === "link") return "pass";
    if (input.kind === "image" && input.leavesPicture) return "pass";
    if (
        input.command === "bold"
        || input.command === "italic"
        || input.command === "underline"
        || input.command === "strikeThrough"
        || input.command === "undo"
        || input.command === "redo"
    ) return "pass";
    if (input.outsideSelected && input.command === "formatBlock") return "pass";
    if (input.outsideSelected && (input.command === "insertUnorderedList" || input.command === "insertOrderedList")) return "lines";
    return "keep";
}

export type PictureBoundsKey = "clear" | "type" | "pass";

export function pictureBoundsKey(input: {
    key: string;
    altKey?: boolean;
    ctrlKey?: boolean;
    metaKey?: boolean;
    collapsed: boolean;
    touchesPicture: boolean;
    outsideSelected: boolean;
}): PictureBoundsKey {
    if (input.altKey || input.ctrlKey || input.metaKey || input.collapsed || !input.touchesPicture || !input.outsideSelected) return "pass";
    if (input.key === "Backspace" || input.key === "Delete") return "clear";
    if (input.key === "Enter" || input.key.length === 1) return "type";
    return "pass";
}

export function captionBreakText(before: string, after: string): { name: string; next: string } {
    const cut = boundarySpaceCut(before, after);
    if (!cut) return { name: before, next: after };
    return { name: before.slice(0, before.length - cut.before), next: after.slice(cut.after) };
}

export function captionUndoCaret(offset: number | null): number | null {
    if (offset === null || !Number.isFinite(offset) || offset < 0) return null;
    return Math.floor(offset);
}

export type PictureClick = "select" | "pass";

export function pictureClick(input: { image: boolean; inEditor: boolean }): PictureClick {
    if (input.image && input.inEditor) return "select";
    return "pass";
}

export type PictureSelectionMark = "selected" | "plain";

export function pictureSelectionMark(input: { editing: boolean; imageSelected: boolean }): PictureSelectionMark {
    if (input.editing && input.imageSelected) return "selected";
    return "plain";
}

export type PictureMove = "select" | "before" | "after" | "name" | "pass";

export function pictureMoveKey(input: {
    key: string;
    shiftKey?: boolean;
    altKey?: boolean;
    ctrlKey?: boolean;
    metaKey?: boolean;
    where: "before" | "after" | "both" | "caption" | "selected" | "figure";
    atStart?: boolean;
    atEnd?: boolean;
}): PictureMove {
    if (input.shiftKey || input.altKey || input.ctrlKey || input.metaKey) return "pass";
    const forward = input.key === "ArrowDown" || input.key === "ArrowRight";
    const backward = input.key === "ArrowUp" || input.key === "ArrowLeft";
    if ((input.where === "before" || input.where === "both") && forward) return "select";
    if ((input.where === "after" || input.where === "both") && backward) return "select";
    if (input.where === "selected" && forward) return "after";
    if (input.where === "selected" && backward) return "before";
    if (input.where === "caption" && backward && input.atStart) return "select";
    if (input.where === "caption" && forward && input.atEnd) return "after";
    if (input.where === "figure" && forward) return "after";
    if (input.where === "figure" && backward) return "before";
    if (input.where === "figure" && input.key.length === 1) return "name";
    return "pass";
}

export type PictureUndo = "restore" | "pass";

export function pictureUndo(input: {
    saved: { before: string; after: string } | null;
    current: string;
}): PictureUndo {
    if (!input.saved || !sameEditingPage(input.current, input.saved.after)) return "pass";
    return "restore";
}

export type PictureInsert = "line" | "after" | "split" | "code" | "span" | "items" | "nested" | "pass";

export function pictureInsert(input: { inPicture: boolean; inItem: boolean; inLine?: boolean; inCode?: boolean; across?: boolean; acrossItems?: boolean; acrossLists?: boolean; separateLists?: boolean; intoNested?: boolean; leavesPicture?: boolean }): PictureInsert {
    if (input.inPicture && input.leavesPicture) return "span";
    if (input.inPicture) return "after";
    if (input.acrossItems || input.acrossLists) return "items";
    if (input.separateLists) return "span";
    if (input.intoNested) return "nested";
    if (input.across && input.inItem) return "span";
    if (input.inItem) return "line";
    if (input.inCode) return "code";
    if (input.inLine) return "split";
    if (input.across) return "span";
    return "pass";
}

export function pictureListSpace(text: string, edge: "start" | "end"): string {
    return listLineSpace(text, edge);
}

export type DatePicture = "after" | "replace" | "pass";

export function datePicture(input: { onDate: "only" | "with-writing" | "none" }): DatePicture {
    if (input.onDate === "only") return "after";
    if (input.onDate === "with-writing") return "replace";
    return "pass";
}

export function imageHtml(src: string, alt: string): string {
    const name = imageAltText(alt)
        .replace(/&/g, "&amp;")
        .replace(/"/g, "&quot;")
        .replace(/</g, "&lt;");
    if (!name) return `<img src="${src}" /><p><br></p>`;
    return `<figure><img src="${src}" alt="${name}" /><figcaption>${name}</figcaption></figure>`;
}

export function imageFileIssue(file: { type: string; size: number }): ImageFileIssue | null {
    if (!IMAGE_TYPES.has(file.type)) {
        return {
            title: "Not an image",
            description: "Choose a PNG, JPEG, GIF, or WebP image.",
        };
    }
    if (file.size > MAX_IMAGE_BYTES) {
        return {
            title: "Image is too large",
            description: "Choose an image under 150 KB.",
        };
    }
    return null;
}

export type PasteDecision =
    | { action: "image"; indexes?: number[]; warning?: ImageFileIssue }
    | { action: "html"; html: string; warning?: ImageFileIssue }
    | { action: "plain"; text: string }
    | { action: "default" }
    | { action: "ignore" }
    | { action: "reject"; title: string; description: string };

export function codePasteHtml(text: string): string {
    const normalized = text.replace(/\r\n/g, "\n").replace(/\r/g, "\n").replace(/\n$/, "");
    return normalized
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;")
        .replace(/\n/g, "&#10;");
}

export function decideEntryPaste(input: {
    files: { type: string; size: number }[];
    html: string;
    text: string;
}): PasteDecision {
    const imageFiles = input.files.filter((file) => file.type.startsWith("image/"));
    if (imageFiles.length) return decideEntryDrop(imageFiles);

    const html = input.html.trim();
    if (!html) return { action: "default" };

    const clean = sanitizeEntryHtml(html);
    const droppedImage = /<img\b/i.test(html) && !/<img\b/i.test(clean);
    if (droppedImage && !clean) return { action: "reject", ...LEFT_OUT };
    if (clean) return { action: "html", html: clean, ...(droppedImage ? { warning: LEFT_OUT } : {}) };

    const text = input.text.trim();
    if (text) return { action: "plain", text };
    return { action: "ignore" };
}

export function decideEntryDrop(files: { type: string; size: number }[]): PasteDecision {
    if (!files.length) return { action: "default" };
    const indexes: number[] = [];
    let warning: ImageFileIssue | undefined;
    files.forEach((file, index) => {
        if (!file.type.startsWith("image/")) return;
        const issue = imageFileIssue(file);
        if (issue) {
            warning ??= issue;
            return;
        }
        indexes.push(index);
    });
    if (!indexes.length) {
        if (warning) return { action: "reject", ...warning };
        return {
            action: "reject",
            title: "Not an image",
            description: "Choose a PNG, JPEG, GIF, or WebP image.",
        };
    }
    return { action: "image", indexes, ...(warning ? { warning } : {}) };
}
