import sanitizeHtml from "sanitize-html";

import { MAX_DATA_IMAGE_LENGTH } from "./constants";

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
];

export function sanitizeEntryHtml(input: string): string {
    return sanitizeHtml(input, {
        allowedTags: ALLOWED_TAGS,
        allowedAttributes: {
            a: ["href"],
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
    }).trim();
}
