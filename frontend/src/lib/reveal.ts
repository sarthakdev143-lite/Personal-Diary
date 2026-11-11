import type { Sealed } from "./vault";

export function isSealed(value: unknown): value is Sealed {
    if (!value || typeof value !== "object") return false;
    const record = value as { c?: unknown; iv?: unknown };
    return typeof record.c === "string" && typeof record.iv === "string";
}

export async function revealText(value: unknown, open: (sealed: Sealed) => Promise<string>): Promise<string> {
    if (typeof value === "string") return value;
    if (isSealed(value)) return open(value);
    return "";
}
