export async function readJsonBody(
    request: Request
): Promise<{ ok: true; value: unknown } | { ok: false; error: string }> {
    try {
        return { ok: true, value: await request.json() };
    } catch {
        return { ok: false, error: "Request body must be JSON." };
    }
}

export function asRecord(value: unknown): Record<string, unknown> | null {
    if (!value || typeof value !== "object" || Array.isArray(value)) {
        return null;
    }

    return value as Record<string, unknown>;
}
