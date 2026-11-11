import { base64ToBytes, bytesToBase64 } from "./vault";

const STORAGE_KEY = "diary.vault.raw";

export function rememberRawKey(rawKey: Uint8Array): void {
    sessionStorage.setItem(STORAGE_KEY, bytesToBase64(rawKey));
}

export function loadRawKey(): Uint8Array | null {
    const stored = sessionStorage.getItem(STORAGE_KEY);
    if (!stored) return null;
    const bytes = base64ToBytes(stored);
    if (!bytes || bytes.length !== 32) return null;
    return bytes;
}

export function forgetRawKey(): void {
    sessionStorage.removeItem(STORAGE_KEY);
}
