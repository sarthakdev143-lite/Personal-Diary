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
