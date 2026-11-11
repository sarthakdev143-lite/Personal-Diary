"use client";

import { FormEvent, useState } from "react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useVault } from "@/context/VaultContext";

export default function VaultGate({ children }: { children: React.ReactNode }) {
    const { phase, account, setup, unlock } = useVault();
    const [password, setPassword] = useState("");
    const [confirm, setConfirm] = useState("");
    const [error, setError] = useState<string | null>(null);
    const [pending, setPending] = useState(false);

    if (phase === "loading") return <Screen title="Checking your vault" />;
    if (phase === "unlocked") return <>{children}</>;
    if (phase === "anonymous") return <Screen title="Sign in to open your diary" />;

    const settingUp = phase === "needs-setup";
    const secretName = account?.hasPassword ? "password" : "passphrase";

    async function submit(event: FormEvent) {
        event.preventDefault();
        setError(null);
        if (settingUp && password !== confirm) {
            setError("Those passphrases do not match.");
            return;
        }
        setPending(true);
        try {
            if (settingUp) await setup(password);
            else await unlock(password);
            setPassword("");
            setConfirm("");
        } catch (caught) {
            setError(caught instanceof Error ? caught.message : "Could not open the vault.");
        } finally {
            setPending(false);
        }
    }

    return (
        <div className="fixed inset-0 z-20 flex items-center justify-center bg-[#0d0b09]/90 p-4">
            <form onSubmit={submit} className="w-full max-w-md rounded-2xl border border-white/10 bg-zinc-900/90 p-6 text-white shadow-2xl">
                <h1 className="text-2xl font-semibold">
                    {settingUp ? "Create your vault passphrase" : `Enter your ${secretName}`}
                </h1>
                <p className="mt-2 text-sm leading-6 text-zinc-400">
                    {settingUp
                        ? "This passphrase encrypts your diary in the browser. We never receive it. If you lose it, the entries cannot be read."
                        : "Your diary stays encrypted until this browser tab can unwrap the key."}
                </p>
                <label className="mt-5 block text-sm text-zinc-300" htmlFor="vault-password">
                    {settingUp ? "Passphrase" : secretName[0].toUpperCase() + secretName.slice(1)}
                </label>
                <Input
                    id="vault-password"
                    type="password"
                    autoComplete={settingUp ? "new-password" : "current-password"}
                    value={password}
                    onChange={(event) => setPassword(event.target.value)}
                    className="mt-2 border-white/15 text-white"
                    minLength={10}
                    required
                />
                {settingUp && (
                    <>
                        <label className="mt-4 block text-sm text-zinc-300" htmlFor="vault-confirm">Confirm passphrase</label>
                        <Input
                            id="vault-confirm"
                            type="password"
                            autoComplete="new-password"
                            value={confirm}
                            onChange={(event) => setConfirm(event.target.value)}
                            className="mt-2 border-white/15 text-white"
                            minLength={10}
                            required
                        />
                    </>
                )}
                {error && <p className="mt-3 text-sm text-red-400">{error}</p>}
                <Button type="submit" disabled={pending} className="mt-5 w-full">
                    {pending ? "Working..." : settingUp ? "Save passphrase" : "Unlock"}
                </Button>
            </form>
        </div>
    );
}

function Screen({ title }: { title: string }) {
    return (
        <div className="fixed inset-0 z-20 flex items-center justify-center bg-[#0d0b09] text-zinc-300">
            <p>{title}</p>
        </div>
    );
}
