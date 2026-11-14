import {
    DEFAULT_DIARY_THEME,
    DESCRIPTION_MAX,
    TITLE_MAX,
    TITLE_MIN,
    isAllowedTheme,
} from "./constants";

export type FieldResult<T> = { ok: true; value: T } | { ok: false; error: string };

const DAY_MS = 24 * 60 * 60 * 1000;

export function normalizeTitle(value: unknown): FieldResult<string> {
    if (typeof value !== "string") {
        return { ok: false, error: "Title must be at least 3 characters." };
    }

    const title = value.trim().replace(/\s+/g, " ");
    if (title.length < TITLE_MIN) {
        return { ok: false, error: "Title must be at least 3 characters." };
    }
    if (title.length > TITLE_MAX) {
        return { ok: false, error: `Title must be ${TITLE_MAX} characters or fewer.` };
    }

    return { ok: true, value: title };
}

export function normalizeDescription(value: unknown): FieldResult<string> {
    if (value === undefined || value === null) {
        return { ok: true, value: "" };
    }
    if (typeof value !== "string") {
        return { ok: false, error: "Description must be a string." };
    }

    const description = value.trim();
    if (description.length > DESCRIPTION_MAX) {
        return { ok: false, error: `Description must be ${DESCRIPTION_MAX} characters or fewer.` };
    }

    return { ok: true, value: description };
}

export function normalizeTheme(value: unknown): FieldResult<string> {
    if (value === undefined || value === null || value === "") {
        return { ok: true, value: DEFAULT_DIARY_THEME };
    }
    if (typeof value !== "string") {
        return { ok: false, error: "Choose a theme from the list." };
    }

    const theme = value.trim();
    if (!theme) {
        return { ok: true, value: DEFAULT_DIARY_THEME };
    }
    if (!isAllowedTheme(theme)) {
        return { ok: false, error: "Choose a theme from the list." };
    }

    return { ok: true, value: theme };
}

export function normalizeThemeUpdate(value: unknown): FieldResult<string> {
    if (typeof value !== "string") {
        return { ok: false, error: "Choose a theme from the list." };
    }

    const theme = value.trim();
    if (!isAllowedTheme(theme)) {
        return { ok: false, error: "Choose a theme from the list." };
    }

    return { ok: true, value: theme };
}

export function parseEntryDate(value: unknown, now = Date.now(), field = "createdAt"): FieldResult<Date> {
    if (typeof value !== "string" || !value.trim()) {
        return { ok: false, error: `${field} must be an ISO date string.` };
    }

    const parsed = new Date(value);
    const time = parsed.getTime();
    if (Number.isNaN(time)) {
        return { ok: false, error: `Invalid ${field} date.` };
    }
    if (time < Date.UTC(1970, 0, 1) || time > now + DAY_MS) {
        return { ok: false, error: `${field} is out of range.` };
    }

    return { ok: true, value: parsed };
}
