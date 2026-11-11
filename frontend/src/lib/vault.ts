const encoder = new TextEncoder();
const decoder = new TextDecoder();

export const KDF_ITERATIONS = 210_000;
export const MIN_PASSWORD = 10;
export const MAX_PASSWORD = 200;

const HKDF_SALT = "diary-hkdf-v1";
const AUTH_INFO = "diary-auth-v1";
const WRAP_INFO = "diary-wrap-v1";

export type Sealed = {
    c: string;
    iv: string;
};

export type VaultMaterial = {
    authVerifier: string;
    kdfSalt: string;
    wrappedDataKey: string;
    wrapIv: string;
};

export type OpenedVault = {
    authVerifier: string;
    rawKey: Uint8Array;
};

export function passwordError(password: string): string | null {
    if (password.length < MIN_PASSWORD) return "Use at least 10 characters.";
    if (password.length > MAX_PASSWORD) return "Use at most 200 characters.";
    return null;
}

export function bytesToBase64(bytes: Uint8Array): string {
    let binary = "";
    for (let index = 0; index < bytes.length; index += 1) {
        binary += String.fromCharCode(bytes[index]);
    }
    return btoa(binary);
}

export function base64ToBytes(value: string): Uint8Array | null {
    if (value.length % 4 === 1) return null;
    try {
        const binary = atob(value);
        const bytes = new Uint8Array(binary.length);
        for (let index = 0; index < binary.length; index += 1) {
            bytes[index] = binary.charCodeAt(index);
        }
        return bytes;
    } catch {
        return null;
    }
}

function asBuffer(bytes: Uint8Array): ArrayBuffer {
    return bytes.buffer.slice(bytes.byteOffset, bytes.byteOffset + bytes.byteLength) as ArrayBuffer;
}

function randomBytes(length: number): Uint8Array {
    const bytes = new Uint8Array(length);
    crypto.getRandomValues(bytes);
    return bytes;
}

function hasLength(value: unknown, length: number): value is string {
    if (typeof value !== "string") return false;
    const bytes = base64ToBytes(value);
    return bytes !== null && bytes.length === length;
}

export function isVaultMaterial(value: unknown): value is VaultMaterial {
    if (!value || typeof value !== "object") return false;
    const record = value as VaultMaterial;
    return hasLength(record.authVerifier, 32)
        && hasLength(record.kdfSalt, 16)
        && hasLength(record.wrapIv, 12)
        && hasLength(record.wrappedDataKey, 48);
}

export function isWrapMaterial(value: unknown): value is Pick<VaultMaterial, "kdfSalt" | "wrappedDataKey" | "wrapIv"> {
    if (!value || typeof value !== "object") return false;
    const record = value as VaultMaterial;
    return hasLength(record.kdfSalt, 16)
        && hasLength(record.wrapIv, 12)
        && hasLength(record.wrappedDataKey, 48);
}

async function deriveRoot(password: string, salt: Uint8Array): Promise<CryptoKey> {
    const passwordKey = await crypto.subtle.importKey(
        "raw",
        asBuffer(encoder.encode(password)),
        "PBKDF2",
        false,
        ["deriveBits"]
    );
    const bits = await crypto.subtle.deriveBits(
        {
            name: "PBKDF2",
            hash: "SHA-256",
            salt: asBuffer(salt),
            iterations: KDF_ITERATIONS,
        },
        passwordKey,
        256
    );
    return crypto.subtle.importKey("raw", bits, "HKDF", false, ["deriveBits", "deriveKey"]);
}

async function authVerifierFromRoot(root: CryptoKey): Promise<string> {
    const bits = await crypto.subtle.deriveBits(
        {
            name: "HKDF",
            hash: "SHA-256",
            salt: asBuffer(encoder.encode(HKDF_SALT)),
            info: asBuffer(encoder.encode(AUTH_INFO)),
        },
        root,
        256
    );
    return bytesToBase64(new Uint8Array(bits));
}

async function wrapKeyFromRoot(root: CryptoKey): Promise<CryptoKey> {
    return crypto.subtle.deriveKey(
        {
            name: "HKDF",
            hash: "SHA-256",
            salt: asBuffer(encoder.encode(HKDF_SALT)),
            info: asBuffer(encoder.encode(WRAP_INFO)),
        },
        root,
        { name: "AES-GCM", length: 256 },
        false,
        ["encrypt", "decrypt"]
    );
}

async function importDataKey(rawKey: Uint8Array): Promise<CryptoKey> {
    return crypto.subtle.importKey("raw", asBuffer(rawKey), "AES-GCM", false, ["encrypt", "decrypt"]);
}

async function wrapRawKey(rawKey: Uint8Array, wrapKey: CryptoKey): Promise<{ wrappedDataKey: string; wrapIv: string }> {
    const wrapIv = randomBytes(12);
    const wrapped = await crypto.subtle.encrypt(
        { name: "AES-GCM", iv: asBuffer(wrapIv) },
        wrapKey,
        asBuffer(rawKey)
    );
    return {
        wrappedDataKey: bytesToBase64(new Uint8Array(wrapped)),
        wrapIv: bytesToBase64(wrapIv),
    };
}

export async function createVault(password: string): Promise<VaultMaterial & { rawKey: Uint8Array }> {
    const problem = passwordError(password);
    if (problem) throw new Error(problem);

    const salt = randomBytes(16);
    const root = await deriveRoot(password, salt);
    const dataKey = await crypto.subtle.generateKey({ name: "AES-GCM", length: 256 }, true, ["encrypt", "decrypt"]);
    const rawKey = new Uint8Array(await crypto.subtle.exportKey("raw", dataKey));
    const wrapKey = await wrapKeyFromRoot(root);
    const wrapped = await wrapRawKey(rawKey, wrapKey);

    return {
        authVerifier: await authVerifierFromRoot(root),
        kdfSalt: bytesToBase64(salt),
        wrappedDataKey: wrapped.wrappedDataKey,
        wrapIv: wrapped.wrapIv,
        rawKey,
    };
}

export async function openVault(
    password: string,
    material: Pick<VaultMaterial, "kdfSalt" | "wrappedDataKey" | "wrapIv">
): Promise<OpenedVault> {
    const problem = passwordError(password);
    if (problem) throw new Error(problem);

    const salt = base64ToBytes(material.kdfSalt);
    const wrapIv = base64ToBytes(material.wrapIv);
    const wrapped = base64ToBytes(material.wrappedDataKey);
    if (!salt || !wrapIv || !wrapped) throw new Error("Incorrect password.");

    try {
        const root = await deriveRoot(password, salt);
        const wrapKey = await wrapKeyFromRoot(root);
        const raw = await crypto.subtle.decrypt(
            { name: "AES-GCM", iv: asBuffer(wrapIv) },
            wrapKey,
            asBuffer(wrapped)
        );
        return {
            authVerifier: await authVerifierFromRoot(root),
            rawKey: new Uint8Array(raw),
        };
    } catch (error) {
        if (error instanceof Error && error.message === "Incorrect password.") throw error;
        throw new Error("Incorrect password.");
    }
}

export async function rewrapVault(
    currentPassword: string,
    nextPassword: string,
    material: Pick<VaultMaterial, "kdfSalt" | "wrappedDataKey" | "wrapIv">
): Promise<VaultMaterial & { rawKey: Uint8Array }> {
    const opened = await openVault(currentPassword, material);
    const problem = passwordError(nextPassword);
    if (problem) throw new Error(problem);

    const salt = randomBytes(16);
    const root = await deriveRoot(nextPassword, salt);
    const wrapKey = await wrapKeyFromRoot(root);
    const wrapped = await wrapRawKey(opened.rawKey, wrapKey);

    return {
        authVerifier: await authVerifierFromRoot(root),
        kdfSalt: bytesToBase64(salt),
        wrappedDataKey: wrapped.wrappedDataKey,
        wrapIv: wrapped.wrapIv,
        rawKey: opened.rawKey,
    };
}

export async function sealString(plain: string, rawKey: Uint8Array): Promise<Sealed> {
    const key = await importDataKey(rawKey);
    const iv = randomBytes(12);
    const cipher = await crypto.subtle.encrypt(
        { name: "AES-GCM", iv: asBuffer(iv) },
        key,
        asBuffer(encoder.encode(plain))
    );
    return {
        c: bytesToBase64(new Uint8Array(cipher)),
        iv: bytesToBase64(iv),
    };
}

export async function openString(sealed: Sealed, rawKey: Uint8Array): Promise<string> {
    const iv = base64ToBytes(sealed.iv);
    const cipher = base64ToBytes(sealed.c);
    if (!iv || !cipher) throw new Error("Could not decrypt.");

    try {
        const key = await importDataKey(rawKey);
        const plain = await crypto.subtle.decrypt(
            { name: "AES-GCM", iv: asBuffer(iv) },
            key,
            asBuffer(cipher)
        );
        return decoder.decode(plain);
    } catch {
        throw new Error("Could not decrypt.");
    }
}
