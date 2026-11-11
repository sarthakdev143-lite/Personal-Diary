"use client";

import { useSession } from "next-auth/react";
import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from "react";

import type { AccountSnapshot } from "@/lib/account";
import { createVault, openString, openVault, sealString, type Sealed } from "@/lib/vault";
import { forgetRawKey, loadRawKey, rememberRawKey } from "@/lib/vault-session";

type Phase = "loading" | "anonymous" | "needs-setup" | "locked" | "unlocked";

type VaultContextValue = {
    phase: Phase;
    account: AccountSnapshot | null;
    refresh: () => Promise<void>;
    unlock: (password: string) => Promise<void>;
    setup: (password: string) => Promise<void>;
    lock: () => void;
    seal: (plain: string) => Promise<Sealed>;
    open: (sealed: Sealed) => Promise<string>;
};

const VaultContext = createContext<VaultContextValue | null>(null);

export function VaultProvider({ children }: { children: React.ReactNode }) {
    const { status } = useSession();
    const [phase, setPhase] = useState<Phase>("loading");
    const [account, setAccount] = useState<AccountSnapshot | null>(null);
    const rawKey = useRef<Uint8Array | null>(null);

    const refresh = useCallback(async () => {
        const response = await fetch("/api/account", { cache: "no-store" });
        if (response.status === 401) {
            setAccount(null);
            setPhase("anonymous");
            return;
        }
        if (!response.ok) return;

        const snapshot = await response.json() as AccountSnapshot;
        setAccount(snapshot);
        if (!snapshot.vaultConfigured) {
            rawKey.current = null;
            forgetRawKey();
            setPhase("needs-setup");
            return;
        }

        const stored = rawKey.current ?? loadRawKey();
        if (!stored) {
            setPhase("locked");
            return;
        }
        rawKey.current = stored;
        setPhase("unlocked");
    }, []);

    useEffect(() => {
        if (status === "loading") return;
        if (status === "unauthenticated") {
            rawKey.current = null;
            forgetRawKey();
            setAccount(null);
            setPhase("anonymous");
            return;
        }
        void refresh();
    }, [status, refresh]);

    const unlock = useCallback(async (password: string) => {
        if (!account?.kdfSalt || !account.wrappedDataKey || !account.wrapIv) {
            throw new Error("Set a vault passphrase first.");
        }
        const opened = await openVault(password, {
            kdfSalt: account.kdfSalt,
            wrappedDataKey: account.wrappedDataKey,
            wrapIv: account.wrapIv,
        });
        rawKey.current = opened.rawKey;
        rememberRawKey(opened.rawKey);
        setPhase("unlocked");
    }, [account]);

    const setup = useCallback(async (password: string) => {
        const created = await createVault(password);
        const response = await fetch("/api/vault", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
                kdfSalt: created.kdfSalt,
                wrappedDataKey: created.wrappedDataKey,
                wrapIv: created.wrapIv,
            }),
        });
        const body = await response.json().catch(() => null) as { error?: string } | null;
        if (!response.ok) throw new Error(body?.error || "Could not save the vault.");
        rawKey.current = created.rawKey;
        rememberRawKey(created.rawKey);
        await refresh();
        setPhase("unlocked");
    }, [refresh]);

    const lock = useCallback(() => {
        rawKey.current = null;
        forgetRawKey();
        setPhase((current) => (current === "anonymous" ? current : account?.vaultConfigured ? "locked" : "needs-setup"));
    }, [account]);

    const seal = useCallback(async (plain: string) => {
        if (!rawKey.current) throw new Error("Unlock your vault first.");
        return sealString(plain, rawKey.current);
    }, []);

    const open = useCallback(async (sealed: Sealed) => {
        if (!rawKey.current) throw new Error("Unlock your vault first.");
        return openString(sealed, rawKey.current);
    }, []);

    const value = useMemo(
        () => ({ phase, account, refresh, unlock, setup, lock, seal, open }),
        [phase, account, refresh, unlock, setup, lock, seal, open]
    );

    return <VaultContext.Provider value={value}>{children}</VaultContext.Provider>;
}

export function useVault() {
    const value = useContext(VaultContext);
    if (!value) throw new Error("useVault must be used inside VaultProvider");
    return value;
}
