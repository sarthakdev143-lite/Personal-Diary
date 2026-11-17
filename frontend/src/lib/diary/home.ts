/** Hides the header Sign Out button while the account menu holds it. */
export const headerSignOutQuery = "(max-width: 479px)";

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
