export function appliedPin<T extends { pinned?: boolean; updatedAt?: string }>(
    diary: T,
    saved: { pinned?: unknown; updatedAt?: unknown } | null,
    requested: boolean,
): T {
    const pinned = saved && typeof saved.pinned === "boolean" ? saved.pinned : requested;
    const updatedAt = saved && typeof saved.updatedAt === "string" ? saved.updatedAt : diary.updatedAt;
    return { ...diary, pinned, updatedAt };
}

export function pinFailureMessage(body: unknown): string {
    if (body && typeof body === "object" && "error" in body && typeof body.error === "string" && body.error) {
        return body.error;
    }
    return "Could not change the pin.";
}
