import { base64ToBytes, type Sealed } from "./vault";

export function parseSealed(value: unknown, maxCipherBytes: number): Sealed | null {
    if (!value || typeof value !== "object") return null;

    const record = value as { c?: unknown; iv?: unknown };
    if (typeof record.c !== "string" || typeof record.iv !== "string") return null;

    const cipher = base64ToBytes(record.c);
    const iv = base64ToBytes(record.iv);
    if (!cipher || !iv) return null;
    if (iv.length !== 12) return null;
    if (cipher.length < 16 || cipher.length > maxCipherBytes) return null;

    return { c: record.c, iv: record.iv };
}
