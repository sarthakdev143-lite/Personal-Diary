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
    const clean = sanitizeHtml(liftBlockLines(input), {
        allowedTags: ALLOWED_TAGS,
        allowedAttributes: {
            a: ["href", "target", "rel"],
            img: ["src", "alt"],
            ol: ["start"],
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
            ol: (tagName, attribs) => {
                const start = (attribs.start ?? "").trim();
                const safeAttribs: Record<string, string> = {};
                if (/^-?\d+$/.test(start) && Number.isSafeInteger(Number(start))) safeAttribs.start = start;
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
    return separateGluedDateHeading(joinCodeLines(alignPictureCaptions(clean).trim()).replace(/\u200b/g, ""));
}

function liftBlockLines(html: string): string {
    let current = liftNestedLists(liftTables(html));
    const block = /<(?:p|div|section|article|h[1-3]|ul|ol|blockquote|pre|hr|figure|table)\b/i;
    const wrapper = /<(div|section|article)\b[^>]*>((?:(?!<\/?(?:div|section|article)\b)[\s\S])*)<\/\1>/gi;
    let previous = "";
    while (current !== previous) {
        previous = current;
        current = current.replace(wrapper, (_match, _tag, inner: string) => {
            if (block.test(inner)) return inner;
            const visible = inner.replace(/<br\s*\/?>/gi, "").replace(/&nbsp;/gi, " ").replace(/<[^>]+>/g, "").trim();
            if (!visible) return "<p><br></p>";
            return `<p>${inner}</p>`;
        });
    }
    return current;
}

function liftNestedLists(html: string): string {
    return html.replace(/<p\b[^>]*>([\s\S]*?)<\/p>/gi, (paragraph, inner: string) => {
        const list = inner.match(/^\s*(<(ul|ol)\b[\s\S]*<\/\2>)\s*$/i);
        return list ? list[1] : paragraph;
    });
}

function liftTables(html: string): string {
    return html.replace(/<table\b[^>]*>[\s\S]*?<\/table>/gi, (table) => {
        const rows = [...table.matchAll(/<tr\b[^>]*>([\s\S]*?)<\/tr>/gi)];
        return rows.map((row) => {
            const cells = [...row[1].matchAll(/<t[dh]\b[^>]*>([\s\S]*?)<\/t[dh]>/gi)]
                .map((cell) => tableCell(cell[1]))
                .filter((cell) => cell.length > 0);
            return cells.length ? `<p>${cells.join(" ")}</p>` : "";
        }).join("");
    });
}

function tableCell(inner: string): string {
    let body = inner.trim();
    const wrapped = body.match(/^<p\b[^>]*>([\s\S]*)<\/p>$/i);
    if (wrapped) body = wrapped[1].trim();
    body = body.replace(/<br\s*\/?>/gi, " ").replace(/\s+/g, " ").trim();
    const visible = body.replace(/<[^>]+>/g, "").replace(/&nbsp;/gi, " ").trim();
    return visible ? body : "";
}

function joinCodeLines(html: string): string {
    return html.replace(/<pre\b[^>]*>[\s\S]*?<\/pre>/gi, (pre) => {
        const inner = pre.slice(pre.indexOf(">") + 1, pre.toLowerCase().lastIndexOf("</pre>"));
        let text = "";
        for (const match of inner.matchAll(/<code\b[^>]*>[\s\S]*?<\/code>|<br\s*\/?>|[^<]+/gi)) {
            const token = match[0];
            const lower = token.toLowerCase();
            let piece = token;
            let separateLine = false;
            if (lower.startsWith("<code")) {
                piece = token.replace(/^<code\b[^>]*>/i, "").replace(/<\/code>$/i, "").replace(/<br\s*\/?>/gi, "\n");
                separateLine = true;
            } else if (lower.startsWith("<br")) {
                piece = "\n";
            }
            if (separateLine && text.length > 0 && !text.endsWith("\n")) text += "\n";
            text += piece;
        }
        text = text.replace(/\u200b/g, "").replace(/\n+$/, "");
        return `<pre><code>${text}</code></pre>`;
    });
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
            ? `<figure>${image}<figcaption>${captionMarkup(captionMatch[1] ?? "", name)}</figcaption></figure>`
            : image;
        return `${before ? `<p>${escapeText(before)}</p>` : ""}${picture}${after ? `<p>${escapeText(after)}</p>` : ""}`;
    });
}

function captionMarkup(inner: string, plain: string): string {
    if (!/<(b|strong|i|em|u|s|strike|del|a)\b/i.test(inner)) {
        return plain.replace(/&/g, "&amp;").replace(/"/g, "&quot;").replace(/</g, "&lt;");
    }
    return inner;
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
