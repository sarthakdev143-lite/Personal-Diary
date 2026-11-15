import { sanitizeEntryHtml } from "./sanitize";
import { formatEntryLong, orderedItemNumber, withoutGeneratedDateHeading } from "./text";

export type ExportDiary = {
    title: string;
    description?: string | null;
    theme?: string | null;
    pinned?: boolean | null;
};

export type ExportEntry = {
    content: string;
    createdAt: string;
    updatedAt?: string | null;
};

export type BuiltExport = {
    body: string;
    contentType: string;
    filename: string;
};

type TextNode = { kind: "text"; text: string };
type ElementNode = { kind: "el"; tag: string; attrs: Record<string, string>; children: HtmlNode[] };
type HtmlNode = TextNode | ElementNode;

const VOID_TAGS = new Set(["br", "hr", "img"]);

function decodeEntities(value: string): string {
    return value
        .replace(/&nbsp;/gi, " ")
        .replace(/&amp;/gi, "&")
        .replace(/&lt;/gi, "<")
        .replace(/&gt;/gi, ">")
        .replace(/&quot;/gi, '"')
        .replace(/&#39;|&apos;/gi, "'");
}

function parseAttrs(raw: string): Record<string, string> {
    const attrs: Record<string, string> = {};
    const pattern = /([a-zA-Z_:][\w:.-]*)\s*=\s*("([^"]*)"|'([^']*)')/g;
    for (const match of raw.matchAll(pattern)) {
        attrs[match[1].toLowerCase()] = decodeEntities(match[3] ?? match[4] ?? "");
    }
    return attrs;
}

function parseHtml(html: string): HtmlNode[] {
    const root: ElementNode = { kind: "el", tag: "root", attrs: {}, children: [] };
    const stack: ElementNode[] = [root];
    const pattern = /<!--[\s\S]*?-->|<\/([a-zA-Z0-9]+)\s*>|<([a-zA-Z0-9]+)([^>]*)>|([^<]+)/g;

    for (const match of html.matchAll(pattern)) {
        if (match[0].startsWith("<!--")) continue;

        if (match[1]) {
            const tag = match[1].toLowerCase();
            for (let index = stack.length - 1; index > 0; index -= 1) {
                const current = stack[index];
                stack.pop();
                if (current.tag === tag) break;
            }
            continue;
        }

        if (match[2]) {
            const tag = match[2].toLowerCase();
            const rawAttrs = match[3] ?? "";
            const element: ElementNode = { kind: "el", tag, attrs: parseAttrs(rawAttrs), children: [] };
            stack[stack.length - 1].children.push(element);
            const selfClosing = VOID_TAGS.has(tag) || /\/\s*$/.test(rawAttrs);
            if (!selfClosing) stack.push(element);
            continue;
        }

        if (match[4]) {
            stack[stack.length - 1].children.push({ kind: "text", text: decodeEntities(match[4]) });
        }
    }

    return root.children;
}

function textContent(node: HtmlNode): string {
    if (node.kind === "text") return node.text;
    return node.children.map(textContent).join("");
}

function escapeLinkText(value: string): string {
    return value.replace(/[\[\]]/g, "");
}

function wrapInline(inner: string, open: string, close: string): string {
    return inner.split("\n").map((line) => wrapInlineLine(line, open, close)).join("\n");
}

function wrapInlineLine(inner: string, open: string, close: string): string {
    const leading = inner.match(/^\s+/)?.[0] ?? "";
    const rest = inner.slice(leading.length);
    const trailing = rest.match(/\s+$/)?.[0] ?? "";
    const core = trailing ? rest.slice(0, -trailing.length) : rest;
    if (!core.trim()) return inner;
    return `${leading}${open}${core}${close}${trailing}`;
}

function renderLink(inner: string, href: string): string {
    const lines = inner.split("\n");
    return lines.map((line) => {
        const leading = line.match(/^\s*/)?.[0] ?? "";
        const rest = line.slice(leading.length);
        const trailing = rest.match(/\s*$/)?.[0] ?? "";
        const label = rest.slice(0, rest.length - trailing.length);
        if (!label) {
            if (lines.length === 1) return `${leading}[${escapeLinkText(href)}](${href})${trailing}`;
            return line;
        }
        return `${leading}[${escapeLinkText(label)}](${href})${trailing}`;
    }).join("\n");
}

function captionHasStyle(node: ElementNode): boolean {
    const styled = new Set(["b", "strong", "i", "em", "u", "s", "strike", "del", "a", "code"]);
    const visit = (child: HtmlNode): boolean => {
        if (child.kind === "text") return false;
        if (styled.has(child.tag)) return true;
        return child.children.some(visit);
    };
    return node.children.some(visit);
}

const LIST_BLOCK = new Set(["p", "div", "section", "article", "h1", "h2", "h3", "ul", "ol", "blockquote", "pre", "hr", "figure", "table"]);

function listItemBody(item: ElementNode, indent: number): string {
    const hasBlock = item.children.some((child) => child.kind === "el" && LIST_BLOCK.has(child.tag));
    const text = (hasBlock ? renderListItemBlocks(item.children) : renderInline(item.children)).trim();
    const pad = " ".repeat(indent);
    return text.split("\n").map((line, index) => index === 0 || !line ? line : `${pad}${line}`).join("\n");
}

function renderListItemBlocks(nodes: HtmlNode[]): string {
    const parts: { text: string; tight: boolean }[] = [];
    let inline: HtmlNode[] = [];
    const flush = () => {
        const text = renderInline(inline).trim();
        inline = [];
        if (text) parts.push({ text, tight: false });
    };
    for (const node of nodes) {
        if (node.kind === "text" || !LIST_BLOCK.has(node.tag)) {
            inline.push(node);
            continue;
        }
        if (node.tag === "ul" || node.tag === "ol") {
            flush();
            const list = renderBlocks([node]).trim();
            if (list) parts.push({ text: list, tight: parts.length > 0 });
            continue;
        }
        flush();
        const block = renderBlocks([node]).trim();
        if (block) parts.push({ text: block, tight: false });
    }
    flush();
    return parts.map((part, index) => (index === 0 ? part.text : `${part.tight ? "\n" : "\n\n"}${part.text}`)).join("");
}

function renderInline(nodes: HtmlNode[]): string {
    return nodes.map((node) => {
        if (node.kind === "text") return node.text.replace(/\s+/g, " ");
        if (node.tag === "br") return "\n";
        if (node.tag === "img") {
            const alt = escapeLinkText(node.attrs.alt || "image");
            const src = node.attrs.src ?? "";
            if (!src || src.startsWith("data:")) return `![${alt}](image)`;
            return `![${alt}](${src})`;
        }

        const inner = renderInline(node.children);
        if (node.tag === "strong" || node.tag === "b") return wrapInline(inner, "**", "**");
        if (node.tag === "em" || node.tag === "i") return wrapInline(inner, "*", "*");
        if (node.tag === "s" || node.tag === "strike" || node.tag === "del") return wrapInline(inner, "~~", "~~");
        if (node.tag === "u") return inner.trim() ? wrapInline(inner, "<u>", "</u>") : inner;
        if (node.tag === "code") return inner.split("\n").map((line) => line ? `\`${line}\`` : line).join("\n");
        if (node.tag === "a") {
            const href = node.attrs.href ?? "";
            return href ? renderLink(inner, href) : inner;
        }
        return inner;
    }).join("");
}

function renderBlocks(nodes: HtmlNode[]): string {
    const parts: string[] = [];

    for (const node of nodes) {
        if (node.kind === "text") {
            const text = node.text.replace(/\s+/g, " ").trim();
            if (text) parts.push(text);
            continue;
        }

        if (node.tag === "h1" || node.tag === "h2" || node.tag === "h3") {
            const level = node.tag === "h1" ? "#" : node.tag === "h2" ? "##" : "###";
            const text = renderInline(node.children).trim();
            if (text) parts.push(text.split("\n").map((line) => line ? `${level} ${line}` : line).join("\n"));
            continue;
        }

        if (node.tag === "p") {
            const text = renderInline(node.children).trim();
            if (text) parts.push(text);
            continue;
        }

        if (node.tag === "blockquote") {
            const blocks = new Set(["p", "div", "section", "article", "h1", "h2", "h3", "ul", "ol", "blockquote", "pre", "hr", "figure", "table"]);
            const inline = node.children.every((child) => child.kind === "text" || !blocks.has(child.tag));
            const inner = (inline ? renderInline(node.children) : renderBlocks(node.children)).trim();
            if (inner) parts.push(inner.split("\n").map((line) => `> ${line}`).join("\n"));
            continue;
        }

        if (node.tag === "ul" || node.tag === "ol") {
            const items = node.children.filter((child): child is ElementNode => child.kind === "el" && child.tag === "li");
            const values = items.map((item) => item.attrs.value);
            const lines = items.map((item, index) => {
                const marker = node.tag === "ul" ? "-" : `${orderedItemNumber({ start: node.attrs.start, values, index })}.`;
                const text = listItemBody(item, marker.length + 1);
                return `${marker} ${text}`;
            });
            if (lines.length) parts.push(lines.join("\n"));
            continue;
        }

        if (node.tag === "pre") {
            const code = textContent(node).replace(/^\n/, "").replace(/\n$/, "");
            parts.push(`\`\`\`\n${code}\n\`\`\``);
            continue;
        }

        if (node.tag === "hr") {
            parts.push("---");
            continue;
        }

        if (node.tag === "img") {
            parts.push(renderInline([node]));
            continue;
        }

        if (node.tag === "figure") {
            const image = node.children.find((child): child is ElementNode => child.kind === "el" && child.tag === "img");
            const caption = node.children.find((child): child is ElementNode => child.kind === "el" && child.tag === "figcaption");
            if (image) {
                parts.push(renderInline([image]));
                if (caption && captionHasStyle(caption)) {
                    const line = renderInline(caption.children).trim();
                    if (line) parts.push(line);
                }
                continue;
            }
        }

        const text = renderInline([node]).trim();
        if (text) parts.push(text);
    }

    return parts.join("\n\n");
}

export function htmlToMarkdown(html: string): string {
    return renderBlocks(parseHtml(sanitizeEntryHtml(html))).trim();
}

function entryTime(value: string): number {
    const time = Date.parse(value);
    return Number.isNaN(time) ? Number.POSITIVE_INFINITY : time;
}

function sortedEntries(entries: ExportEntry[]): ExportEntry[] {
    return [...entries].sort((left, right) => entryTime(left.createdAt) - entryTime(right.createdAt));
}

export function entryShareMarkdown(entry: { content: string; createdAt: string }): string {
    const written = htmlToMarkdown(withoutGeneratedDateHeading(entry.content));
    return `## ${formatEntryLong(entry.createdAt)}\n\n${written || "_Empty entry._"}\n`;
}

export function diaryToMarkdown(diary: ExportDiary, entries: ExportEntry[]): string {
    const title = diary.title.trim() || "Diary";
    const parts = [`# ${title}`];
    const description = diary.description?.trim();
    if (description) parts.push(description);

    const body = sortedEntries(entries).map((entry) => entryShareMarkdown(entry).slice(0, -1));

    parts.push(...(body.length ? body : ["_No entries yet._"]));
    return `${parts.join("\n\n").trim()}\n`;
}

export function diaryToBackup(diary: ExportDiary, entries: ExportEntry[], exportedAt: string) {
    return {
        format: "personal-diary-backup",
        version: 1,
        exportedAt,
        diary: {
            title: diary.title.trim() || "Diary",
            description: diary.description?.trim() ?? "",
            theme: diary.theme ?? "",
            pinned: diary.pinned === true,
        },
        entries: sortedEntries(entries).map((entry) => {
            const content = sanitizeEntryHtml(entry.content);
            return {
                createdAt: entry.createdAt,
                updatedAt: entry.updatedAt ?? entry.createdAt,
                content,
                markdown: htmlToMarkdown(content),
            };
        }),
    };
}

export function exportFilename(title: string, extension: "md" | "json"): string {
    const slug = title
        .normalize("NFKD")
        .replace(/[\u0300-\u036f]/g, "")
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, "-")
        .replace(/^-+|-+$/g, "")
        .slice(0, 60);
    return `${slug || "diary"}.${extension}`;
}

export function contentDisposition(filename: string): string {
    const ascii = filename.replace(/[^\w.-]+/g, "_");
    return `attachment; filename="${ascii}"; filename*=UTF-8''${encodeURIComponent(filename)}`;
}

export function buildDiaryExport(
    diary: ExportDiary,
    entries: ExportEntry[],
    format: string,
    exportedAt: string,
): { ok: true; export: BuiltExport } | { ok: false; error: string } {
    const requested = format.trim().toLowerCase();

    if (requested === "json") {
        return {
            ok: true,
            export: {
                body: `${JSON.stringify(diaryToBackup(diary, entries, exportedAt), null, 2)}\n`,
                contentType: "application/json; charset=utf-8",
                filename: exportFilename(diary.title, "json"),
            },
        };
    }

    if (requested === "" || requested === "md" || requested === "markdown") {
        return {
            ok: true,
            export: {
                body: diaryToMarkdown(diary, entries),
                contentType: "text/markdown; charset=utf-8",
                filename: exportFilename(diary.title, "md"),
            },
        };
    }

    return { ok: false, error: "Use format=md or format=json." };
}
