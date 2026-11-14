import { DEFAULT_DIARY_THEME, MAX_IMPORT_ENTRIES, isAllowedTheme } from "./constants";
import { prepareEntryContent } from "./content";
import { isObjectId } from "./ids";
import { asRecord } from "./json";
import { normalizeDescription, normalizeTitle, parseEntryDate } from "./validation";

export type ImportedEntry = {
    content: string;
    plainText: string;
    createdAt: Date;
    updatedAt: Date;
};

export type ImportedDiary = {
    title: string;
    description: string;
    theme: string;
    entries: ImportedEntry[];
    skipped: number;
};

export function importedDiaryPath(id: unknown): string | null {
    if (typeof id !== "string" || !isObjectId(id)) return null;
    return `/diary/${id}`;
}

export function importNotice(input: {
    title?: string | null;
    importedEntries?: number;
    skippedEntries?: number;
    opened: boolean;
}): { title: string; description: string } {
    const name = input.title?.trim() || "Diary";
    const imported = input.importedEntries ?? 0;
    const skipped = input.skippedEntries ?? 0;
    const details = [input.opened ? `${name} is open.` : `${name} is in your list.`];
    if (imported > 0) details.push(`${imported} ${imported === 1 ? "entry" : "entries"} saved.`);
    if (skipped > 0) details.push(`${skipped} empty ${skipped === 1 ? "entry was" : "entries were"} left out.`);
    return { title: "Diary imported", description: details.join(" ") };
}

const IMPORT_NOTICE_KEY = "diary-import-notice";

export function rememberImportNotice(notice: { title: string; description: string }) {
    if (typeof sessionStorage === "undefined") return;
    sessionStorage.setItem(IMPORT_NOTICE_KEY, JSON.stringify(notice));
}

export function takeImportNotice(): { title: string; description: string } | null {
    if (typeof sessionStorage === "undefined") return null;
    const raw = sessionStorage.getItem(IMPORT_NOTICE_KEY);
    if (!raw) return null;
    sessionStorage.removeItem(IMPORT_NOTICE_KEY);
    try {
        const parsed = JSON.parse(raw) as { title?: unknown; description?: unknown };
        if (typeof parsed.title !== "string" || typeof parsed.description !== "string") return null;
        if (!parsed.title || !parsed.description) return null;
        return { title: parsed.title, description: parsed.description };
    } catch {
        return null;
    }
}

export function parseDiaryBackup(
    value: unknown,
    now = Date.now(),
): { ok: true; diary: ImportedDiary } | { ok: false; error: string } {
    const body = asRecord(value);
    if (!body || body.format !== "personal-diary-backup") {
        return { ok: false, error: "Choose a JSON backup from this diary." };
    }
    if (body.version !== 1) {
        return { ok: false, error: "This backup version is not supported." };
    }

    const diary = asRecord(body.diary);
    if (!diary) {
        return { ok: false, error: "The backup is missing the diary." };
    }

    const title = normalizeTitle(diary.title);
    if (!title.ok) return title;

    const description = normalizeDescription(diary.description);
    if (!description.ok) return description;

    const requestedTheme = typeof diary.theme === "string" ? diary.theme.trim() : "";
    const theme = requestedTheme && isAllowedTheme(requestedTheme) ? requestedTheme : DEFAULT_DIARY_THEME;

    if (!Array.isArray(body.entries)) {
        return { ok: false, error: "The backup is missing its entries." };
    }
    if (body.entries.length > MAX_IMPORT_ENTRIES) {
        return { ok: false, error: `A backup can include at most ${MAX_IMPORT_ENTRIES} entries.` };
    }

    const entries: ImportedEntry[] = [];
    let skipped = 0;

    for (let index = 0; index < body.entries.length; index += 1) {
        const entry = asRecord(body.entries[index]);
        const label = `Entry ${index + 1}`;
        if (!entry) {
            return { ok: false, error: `${label} is not an object.` };
        }

        const prepared = prepareEntryContent(entry.content);
        if (!prepared.ok) {
            if (prepared.error === "Content is required.") {
                skipped += 1;
                continue;
            }
            return { ok: false, error: `${label}: ${prepared.error}` };
        }

        const createdAt = parseEntryDate(entry.createdAt, now);
        if (!createdAt.ok) {
            return { ok: false, error: `${label}: ${createdAt.error}` };
        }

        let updatedAt = createdAt.value;
        if (entry.updatedAt !== undefined && entry.updatedAt !== null && entry.updatedAt !== "") {
            const parsedUpdatedAt = parseEntryDate(entry.updatedAt, now);
            if (!parsedUpdatedAt.ok) {
                return { ok: false, error: `${label}: ${parsedUpdatedAt.error}` };
            }
            updatedAt = parsedUpdatedAt.value.getTime() < createdAt.value.getTime()
                ? createdAt.value
                : parsedUpdatedAt.value;
        }

        entries.push({
            content: prepared.content,
            plainText: prepared.plainText,
            createdAt: createdAt.value,
            updatedAt,
        });
    }

    return {
        ok: true,
        diary: {
            title: title.value,
            description: description.value,
            theme,
            entries,
            skipped,
        },
    };
}
