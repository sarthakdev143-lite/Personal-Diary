import sanitizeHtml from "sanitize-html";

import { MAX_DATA_IMAGE_LENGTH } from "./constants";
import { separateGluedDateHeading } from "./text";

const DATA_IMAGE = /^data:image\/(png|jpeg|gif|webp);base64,[a-z0-9+/=\s]+$/i;

const ALLOWED_TAGS = [
    "h1",
    "h2",
    "h3",
    "p",
    "br",
    "strong",
    "b",
    "em",
    "i",
    "u",
    "s",
    "strike",
    "del",
    "ul",
    "ol",
    "li",
    "blockquote",
    "hr",
    "pre",
    "code",
    "a",
    "img",
    "figure",
    "figcaption",
];

export function sanitizeEntryHtml(input: string): string {
    const clean = sanitizeHtml(input, {
        allowedTags: ALLOWED_TAGS,
        allowedAttributes: {
            a: ["href", "target", "rel"],
            img: ["src", "alt"],
        },
        allowedSchemes: ["http", "https", "mailto"],
        allowedSchemesByTag: {
            img: ["http", "https", "data"],
        },
        allowedSchemesAppliedToAttributes: ["href", "src"],
        allowProtocolRelative: false,
        disallowedTagsMode: "discard",
        parseStyleAttributes: false,
        transformTags: {
            a: (tagName, attribs) => {
                const href = attribs.href ?? "";
                const safeAttribs: Record<string, string> = {};
                if (href) {
                    safeAttribs.href = href;
                    safeAttribs.target = "_blank";
                    safeAttribs.rel = "noopener noreferrer";
                }
                return { tagName, attribs: safeAttribs };
            },
            img: (_tagName, attribs) => {
                const src = attribs.src ?? "";
                const alt = (attribs.alt ?? "").replace(/\s+/g, " ").trim().slice(0, 180);
                const safeData = src.startsWith("data:") && DATA_IMAGE.test(src) && src.length <= MAX_DATA_IMAGE_LENGTH;
                const safeRemote = /^https?:\/\//i.test(src);
                if (!safeData && !safeRemote) {
                    return { tagName: "img", attribs: { src: "" } };
                }

                const safeAttribs: Record<string, string> = { src };
                if (alt) safeAttribs.alt = alt;
                return { tagName: "img", attribs: safeAttribs };
            },
        },
        exclusiveFilter: (frame) => frame.tag === "img" && !frame.attribs.src,
    });
    return separateGluedDateHeading(alignPictureCaptions(clean).trim());
}

function alignPictureCaptions(html: string): string {
    return html.replace(/<figure\b[^>]*>[\s\S]*?<\/figure>/gi, (figure) => {
        const imageMatch = figure.match(/<img\b[^>]*>/i);
        if (!imageMatch || imageMatch.index === undefined) return "";
        const captionMatch = figure.match(/<figcaption\b[^>]*>([\s\S]*?)<\/figcaption>/i);
        if (!captionMatch || captionMatch.index === undefined) return figure.replace(/<\/?figure\b[^>]*>/gi, "");
        const name = decodeCaption(captionMatch[1] ?? "");
        const image = imageWithAlt(imageMatch[0], name);
        const contentStart = figure.indexOf(">") + 1;
        const contentEnd = figure.toLowerCase().lastIndexOf("</figure>");
        const imageAt = imageMatch.index;
        const imageEnd = imageAt + imageMatch[0].length;
        const captionAt = captionMatch.index;
        const captionEnd = captionAt + captionMatch[0].length;
        const loose = (start: number, end: number) => (end > start ? decodeCaption(figure.slice(start, end)) : "");
        const before = captionAt >= imageEnd
            ? loose(contentStart, imageAt)
            : `${loose(contentStart, captionAt)} ${loose(captionEnd, imageAt)}`.trim();
        const after = captionAt >= imageEnd
            ? `${loose(imageEnd, captionAt)} ${loose(captionEnd, contentEnd)}`.trim()
            : loose(imageEnd, contentEnd);
        const picture = name
            ? `<figure>${image}<figcaption>${name.replace(/&/g, "&amp;").replace(/"/g, "&quot;").replace(/</g, "&lt;")}</figcaption></figure>`
            : image;
        return `${before ? `<p>${escapeText(before)}</p>` : ""}${picture}${after ? `<p>${escapeText(after)}</p>` : ""}`;
    });
}

function escapeText(value: string): string {
    return value.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
}

function decodeCaption(value: string): string {
    return value
        .replace(/<[^>]+>/g, " ")
        .replace(/&nbsp;/gi, " ")
        .replace(/&amp;/gi, "&")
        .replace(/&lt;/gi, "<")
        .replace(/&gt;/gi, ">")
        .replace(/&quot;/gi, '"')
        .replace(/&#39;|&apos;/gi, "'")
        .replace(/\s+/g, " ")
        .trim()
        .slice(0, 180);
}

function imageWithAlt(image: string, name: string): string {
    const withoutAlt = image.replace(/\s+alt\s*=\s*("[^"]*"|'[^']*')/gi, "");
    if (!name) return withoutAlt;
    const escaped = name.replace(/&/g, "&amp;").replace(/"/g, "&quot;").replace(/</g, "&lt;");
    return withoutAlt.replace(/<img\b/i, `<img alt="${escaped}"`);
}
