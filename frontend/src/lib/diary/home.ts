/** Hides the header Sign Out button while the account menu holds it. */
export const headerSignOutQuery = "(max-width: 479px)";

export function accountMenuEscape(event: {
    key: string;
    altKey: boolean;
    ctrlKey: boolean;
    metaKey: boolean;
    menuOpen: boolean;
    formOpen: boolean;
    themeOpen: boolean;
}): boolean {
    if (!event.menuOpen || event.formOpen || event.themeOpen) return false;
    if (event.altKey || event.ctrlKey || event.metaKey) return false;
    return event.key === "Escape";
}

export function homeMenu(input: {
    onHome: boolean;
    bookReady: boolean;
    narrow: boolean;
    signedIn: boolean;
}): { open: boolean; settings: boolean; account: boolean } {
    const settings = input.onHome && input.bookReady;
    const account = input.narrow && input.signedIn;
    return { open: settings || account, settings, account };
}
