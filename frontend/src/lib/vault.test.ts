import { describe, expect, it } from "vitest";

import {
    base64ToBytes,
    createVault,
    openString,
    openVault,
    rewrapVault,
    sealString,
} from "./vault";

const PASSWORD = "correct horse battery";

describe("vault", () => {
    it("round-trips a vault and unicode text", async () => {
        const created = await createVault(PASSWORD);
        const opened = await openVault(PASSWORD, created);

        expect(opened.authVerifier).toBe(created.authVerifier);
        expect(base64ToBytes(created.wrappedDataKey)?.length).toBe(48);
        expect(Buffer.from(opened.rawKey).equals(Buffer.from(created.rawKey))).toBe(true);

        const plain = "Café 日記";
        const sealed = await sealString(plain, created.rawKey);
        await expect(openString(sealed, opened.rawKey)).resolves.toBe(plain);
    });

    it("rejects the wrong password and a tampered entry", async () => {
        const created = await createVault(PASSWORD);
        await expect(openVault("wrong password", created)).rejects.toThrow("Incorrect password.");

        const sealed = await sealString("private", created.rawKey);
        const cipher = base64ToBytes(sealed.c);
        expect(cipher).not.toBeNull();
        cipher![0] ^= 0xff;
        const { bytesToBase64 } = await import("./vault");
        await expect(openString({ ...sealed, c: bytesToBase64(cipher!) }, created.rawKey)).rejects.toThrow(
            "Could not decrypt."
        );
    });

    it("keeps the same data key when the password changes", async () => {
        const created = await createVault(PASSWORD);
        const sealed = await sealString("still here", created.rawKey);
        const next = await rewrapVault(PASSWORD, "a different secret", created);

        expect(Buffer.from(next.rawKey).equals(Buffer.from(created.rawKey))).toBe(true);
        await expect(openVault(PASSWORD, next)).rejects.toThrow("Incorrect password.");
        const opened = await openVault("a different secret", next);
        await expect(openString(sealed, opened.rawKey)).resolves.toBe("still here");
    });

    it("rejects a short password", async () => {
        await expect(createVault("short")).rejects.toThrow("Use at least 10 characters.");
    });
});
