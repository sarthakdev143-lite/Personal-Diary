export function loginWaitingMessage(status: string): string | null {
    if (status === "unauthenticated") return null;
    return "Opening your diaries";
}
