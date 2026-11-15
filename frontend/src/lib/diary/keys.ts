export function diarySearchShortcut(event: {
    key: string;
    ctrlKey: boolean;
    metaKey: boolean;
    altKey: boolean;
    shiftKey: boolean;
}): boolean {
    if (event.altKey || event.shiftKey) return false;
    if (!event.ctrlKey && !event.metaKey) return false;
    return event.key.toLowerCase() === "i";
}

export function searchShortcutLabel(platform: string): "⌘" | "ctrl" {
    return /Mac|iPhone|iPad|iPod/i.test(platform) ? "⌘" : "ctrl";
}

function listStep(
    ids: readonly string[],
    currentId: string | null,
    direction: "next" | "previous",
    field: string,
): string | null {
    if (!ids.length) return null;
    if (direction === "previous" && currentId === ids[0]) return field;
    const index = currentId ? ids.indexOf(currentId) : -1;
    if (index < 0) return direction === "next" ? ids[0] : ids[ids.length - 1];
    return ids[direction === "next" ? index + 1 : index - 1] ?? null;
}

export function diaryListStep(
    ids: readonly string[],
    currentId: string | null,
    direction: "next" | "previous",
): string | "search" | null {
    return listStep(ids, currentId, direction, "search");
}

export function entryListStep(
    ids: readonly string[],
    currentId: string | null,
    direction: "next" | "previous",
): string | "find" | null {
    const step = listStep(ids, currentId, direction, "find");
    return step === "find" ? "find" : step;
}

export function diaryListKeyAction(event: {
    key: string;
    altKey: boolean;
    ctrlKey: boolean;
    metaKey: boolean;
    shiftKey: boolean;
    inField: boolean;
    searchFocused: boolean;
    query: string;
    formOpen: boolean;
    themeOpen: boolean;
}): "theme" | "form" | "clear" | "close" | "next" | "previous" | "open" | null {
    if (event.altKey || event.ctrlKey || event.metaKey) return null;
    if (event.key === "Escape") {
        if (event.themeOpen) return "theme";
        if (event.formOpen) return "form";
        if (!event.searchFocused) return null;
        return event.query ? "clear" : "close";
    }
    if (event.key === "Enter") {
        if (!event.searchFocused || event.shiftKey || event.formOpen || event.themeOpen) return null;
        return "open";
    }
    if (event.key === "ArrowDown" && event.searchFocused && !event.shiftKey && !event.formOpen && !event.themeOpen) return "next";
    if (event.shiftKey || event.inField || event.formOpen || event.themeOpen) return null;
    if (event.key === "ArrowDown") return "next";
    if (event.key === "ArrowUp") return "previous";
    return null;
}
