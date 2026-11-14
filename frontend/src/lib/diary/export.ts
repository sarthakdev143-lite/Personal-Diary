import { sanitizeEntryHtml } from "./sanitize";
import { formatEntryLong } from "./text";

export type ExportDiary = {
    title: string;
    description?: string | null;
    theme?: string | null;
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
        if (node.tag === "strong" || node.tag === "b") return `**${inner}**`;
        if (node.tag === "em" || node.tag === "i") return `*${inner}*`;
        if (node.tag === "s" || node.tag === "strike" || node.tag === "del") return `~~${inner}~~`;
        if (node.tag === "u") return inner ? `<u>${inner}</u>` : inner;
        if (node.tag === "code") return `\`${inner}\``;
        if (node.tag === "a") {
            const href = node.attrs.href ?? "";
            const label = inner.trim() || href;
            return href ? `[${escapeLinkText(label)}](${href})` : inner;
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
            if (text) parts.push(`${level} ${text}`);
            continue;
        }

        if (node.tag === "p") {
            const text = renderInline(node.children).trim();
            if (text) parts.push(text);
            continue;
        }

        if (node.tag === "blockquote") {
            const inner = renderBlocks(node.children).trim();
            if (inner) parts.push(inner.split("\n").map((line) => `> ${line}`).join("\n"));
            continue;
        }

        if (node.tag === "ul" || node.tag === "ol") {
            const items = node.children.filter((child): child is ElementNode => child.kind === "el" && child.tag === "li");
            const lines = items.map((item, index) => {
                const marker = node.tag === "ul" ? "-" : `${index + 1}.`;
                const text = renderInline(item.children).trim() || renderBlocks(item.children).trim();
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

export function diaryToMarkdown(diary: ExportDiary, entries: ExportEntry[]): string {
    const title = diary.title.trim() || "Diary";
    const parts = [`# ${title}`];
    const description = diary.description?.trim();
    if (description) parts.push(description);

    const body = sortedEntries(entries).map((entry) => {
        const written = htmlToMarkdown(entry.content);
        return `## ${formatEntryLong(entry.createdAt)}\n\n${written || "_Empty entry._"}`;
    });

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
