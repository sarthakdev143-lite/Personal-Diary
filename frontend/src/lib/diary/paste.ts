import { MAX_IMAGE_BYTES } from "./constants";
import { sanitizeEntryHtml } from "./sanitize";

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

export type PictureClick = "select" | "pass";

export function pictureClick(input: { image: boolean; inEditor: boolean }): PictureClick {
    if (input.image && input.inEditor) return "select";
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
