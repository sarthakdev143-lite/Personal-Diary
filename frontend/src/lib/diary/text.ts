export function entryPlainText(html: string): string {
    const alts = [...html.matchAll(/\balt\s*=\s*["']([^"']*)["']/gi)].map((match) => match[1] ?? "");

    const text = html
        .replace(/<script[\s\S]*?<\/script>/gi, " ")
        .replace(/<style[\s\S]*?<\/style>/gi, " ")
        .replace(/<[^>]+>/g, " ")
        .replace(/&nbsp;/gi, " ")
        .replace(/&amp;/gi, "&")
        .replace(/&lt;/gi, "<")
        .replace(/&gt;/gi, ">")
        .replace(/&quot;/gi, '"')
        .replace(/&#39;|&apos;/gi, "'");

    return [text, ...alts].join(" ").replace(/\s+/g, " ").trim();
}

export function hasEntryContent(html: string): boolean {
    if (entryPlainText(html).length > 0) return true;
    return /<img\b[^>]*\bsrc\s*=\s*["'][^"']+/i.test(html);
}

export function wordCount(html: string): number {
    const text = entryPlainText(html);
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
