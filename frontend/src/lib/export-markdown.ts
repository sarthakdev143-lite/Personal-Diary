const ENTITIES: Record<string, string> = {
    "&amp;": "&",
    "&lt;": "<",
    "&gt;": ">",
    "&quot;": "\"",
    "&#39;": "'",
    "&nbsp;": " ",
};

function decode(text: string): string {
    return text.replace(/&amp;|&lt;|&gt;|&quot;|&#39;|&nbsp;/g, (entity) => ENTITIES[entity] ?? entity);
}

function strip(html: string): string {
    return decode(html.replace(/<[^>]+>/g, "")).replace(/\s+/g, " ").trim();
}

export function htmlToMarkdown(html: string): string {
    const markdown = html
        .replace(/<img\b[^>]*>/gi, "[image]")
        .replace(/<h1[^>]*>([\s\S]*?)<\/h1>/gi, (_match, inner: string) => `# ${strip(inner)}\n\n`)
        .replace(/<h2[^>]*>([\s\S]*?)<\/h2>/gi, (_match, inner: string) => `## ${strip(inner)}\n\n`)
        .replace(/<h3[^>]*>([\s\S]*?)<\/h3>/gi, (_match, inner: string) => `### ${strip(inner)}\n\n`)
        .replace(/<blockquote[^>]*>([\s\S]*?)<\/blockquote>/gi, (_match, inner: string) => `> ${strip(inner)}\n\n`)
        .replace(/<li[^>]*>([\s\S]*?)<\/li>/gi, (_match, inner: string) => `- ${strip(inner)}\n`)
        .replace(/<br\s*\/?>/gi, "\n")
        .replace(/<\/p>/gi, "\n\n")
        .replace(/<[^>]+>/g, "");

    return decode(markdown).replace(/[ \t]+\n/g, "\n").replace(/\n{3,}/g, "\n\n").trim();
}

export function diaryToMarkdown(
    diary: { title: string; description: string },
    entries: { heading: string; content: string }[]
): string {
    const body = entries
        .map((entry) => `## ${entry.heading}\n\n${htmlToMarkdown(entry.content)}`)
        .join("\n\n");
    const description = diary.description.trim();
    return [`# ${diary.title}`, description, body].filter((part) => part.length > 0).join("\n\n") + "\n";
}

export function markdownFilename(title: string): string {
    const slug = title.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
    return `${slug || "diary"}.md`;
}
