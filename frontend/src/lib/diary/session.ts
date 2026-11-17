export function showSignIn(status: string, path = ""): boolean {
    return status === "unauthenticated" && path !== "/login";
}
