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
}): "theme" | "form" | "clear" | "close" | "next" | "previous" | null {
    if (event.altKey || event.ctrlKey || event.metaKey) return null;
    if (event.key === "Escape") {
        if (event.themeOpen) return "theme";
        if (event.formOpen) return "form";
        if (!event.searchFocused) return null;
        return event.query ? "clear" : "close";
    }
    if (event.shiftKey || event.inField || event.formOpen || event.themeOpen) return null;
    if (event.key === "ArrowDown") return "next";
    if (event.key === "ArrowUp") return "previous";
    return null;
}
