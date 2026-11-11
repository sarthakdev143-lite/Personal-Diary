"use client";

import { FormEvent, useState } from "react";
import { signOut } from "next-auth/react";
import Link from "next/link";

import { useVault } from "@/context/VaultContext";
import { openVault, rewrapVault } from "@/lib/vault";
import { forgetRawKey, rememberRawKey } from "@/lib/vault-session";

const fieldClass = "w-full border border-[#3a342c] bg-transparent px-3 py-2 text-sm text-[#d5cdc0] placeholder:text-[#8f877c] focus-visible:outline focus-visible:outline-1 focus-visible:outline-[#f3ecdf]";
const primaryClass = "mt-4 bg-[#f3ecdf] px-4 py-2 text-sm text-[#161410] disabled:opacity-50";
const quietClass = "border border-[#3a342c] px-4 py-2 text-sm text-[#d5cdc0]";

export default function AccountClient({ billing }: { billing: string | null }) {
    const { account, refresh, phase } = useVault();
    const [currentPassword, setCurrentPassword] = useState("");
    const [nextPassword, setNextPassword] = useState("");
    const [passwordConfirm, setPasswordConfirm] = useState("");
    const [deletePhrase, setDeletePhrase] = useState("");
    const [message, setMessage] = useState<string | null>(null);
    const [error, setError] = useState<string | null>(null);
    const [pending, setPending] = useState(false);

    async function changePassword(event: FormEvent) {
        event.preventDefault();
        setError(null);
        setMessage(null);
        if (!account?.kdfSalt || !account.wrappedDataKey || !account.wrapIv) {
            setError("Set a vault passphrase before changing it.");
            return;
        }
        const material = {
            kdfSalt: account.kdfSalt,
            wrappedDataKey: account.wrappedDataKey,
            wrapIv: account.wrapIv,
        };
        if (nextPassword !== passwordConfirm) {
            setError("The new passwords do not match.");
            return;
        }
        setPending(true);
        try {
            const opened = await openVault(currentPassword, material);
            const rewrapped = await rewrapVault(currentPassword, nextPassword, material);
            const response = await fetch("/api/account/password", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    currentVerifier: opened.authVerifier,
                    next: {
                        authVerifier: rewrapped.authVerifier,
                        kdfSalt: rewrapped.kdfSalt,
                        wrappedDataKey: rewrapped.wrappedDataKey,
                        wrapIv: rewrapped.wrapIv,
                    },
                }),
            });
            const data = await response.json() as { error?: string };
            if (!response.ok) throw new Error(data.error || "Could not change the password.");
            rememberRawKey(rewrapped.rawKey);
            setCurrentPassword("");
            setNextPassword("");
            setPasswordConfirm("");
            setMessage("Password updated. The same diary key is still unlocked in this tab.");
            await refresh();
        } catch (caught) {
            setError(caught instanceof Error ? caught.message : "Could not change the password.");
        } finally {
            setPending(false);
        }
    }

    async function manageBilling() {
        setError(null);
        const response = await fetch("/api/billing/portal", { method: "POST" });
        const data = await response.json() as { url?: string; error?: string };
        if (!response.ok || !data.url) {
            setError(data.error || "Could not open billing.");
            return;
        }
        window.location.href = data.url;
    }

    async function removeAccount(event: FormEvent) {
        event.preventDefault();
        setError(null);
        if (deletePhrase !== "delete my diary") {
            setError("Type delete my diary to confirm.");
            return;
        }
        setPending(true);
        try {
            const response = await fetch("/api/account", {
                method: "DELETE",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ confirm: deletePhrase }),
            });
            const data = await response.json() as { error?: string };
            if (!response.ok) throw new Error(data.error || "Could not delete the account.");
            forgetRawKey();
            await signOut({ callbackUrl: "/" });
        } catch (caught) {
            setError(caught instanceof Error ? caught.message : "Could not delete the account.");
            setPending(false);
        }
    }

    return (
        <div className="relative z-10 mx-auto flex min-h-screen w-full max-w-2xl flex-col gap-6 bg-[#12110f] px-4 pb-24 pt-32 text-[#d5cdc0]">
            <h1 className="story-serif text-4xl leading-none text-[#f3ecdf]">Account</h1>
            {billing === "success" && (
                <p className="border border-[#3a342c] p-4 text-sm text-[#d5cdc0]">
                    Stripe accepted the payment. This page shows Pro after the webhook lands. Refresh if it still says Free.
                </p>
            )}
            {!account || phase === "loading" ? (
                <p className="text-[#8f877c]">Loading account...</p>
            ) : (
                <>
                    <section className="border border-[#3a342c] p-5">
                        <p className="story-serif text-2xl text-[#f3ecdf]">{account.name}</p>
                        <p className="text-sm text-[#8f877c]">{account.email}</p>
                        <p className="mt-4 text-sm text-[#d5cdc0]">
                            {account.plan === "pro" ? "Pro" : "Free"} plan. {account.usage.diaries} of {account.limits.diaries} diaries. {account.usage.entries} entries saved. {account.limits.entriesPerDiary.toLocaleString()} entries per diary on this plan.
                        </p>
                        <div className="mt-4 flex flex-wrap gap-2">
                            {account.plan === "free" && <Link href="/pricing" className="bg-[#f3ecdf] px-4 py-2 text-sm text-[#161410]">Upgrade</Link>}
                            {account.canManageBilling && <button type="button" className={quietClass} onClick={manageBilling}>Manage billing</button>}
                        </div>
                    </section>

                    {account.hasPassword && (
                        <form onSubmit={changePassword} className="border border-[#3a342c] p-5">
                            <h2 className="story-serif text-2xl text-[#f3ecdf]">Change password</h2>
                            <p className="mt-1 text-sm text-[#8f877c]">The diary key stays the same. A forgotten password cannot be recovered.</p>
                            <input type="email" name="email" autoComplete="username" value={account.email} readOnly className="hidden" />
                            <input type="password" autoComplete="current-password" value={currentPassword} onChange={(event) => setCurrentPassword(event.target.value)} placeholder="Current password" className={`${fieldClass} mt-4`} required />
                            <input type="password" autoComplete="new-password" value={nextPassword} onChange={(event) => setNextPassword(event.target.value)} placeholder="New password" className={`${fieldClass} mt-3`} minLength={10} required />
                            <input type="password" autoComplete="new-password" value={passwordConfirm} onChange={(event) => setPasswordConfirm(event.target.value)} placeholder="Confirm new password" className={`${fieldClass} mt-3`} minLength={10} required />
                            <button type="submit" disabled={pending} className={primaryClass}>Update password</button>
                        </form>
                    )}

                    <form onSubmit={removeAccount} className="border border-[#3a342c] p-5">
                        <h2 className="story-serif text-2xl text-[#f3ecdf]">Delete account</h2>
                        <p className="mt-1 text-sm text-[#8f877c]">This deletes the diaries stored for this account. An active subscription is canceled first.</p>
                        <input value={deletePhrase} onChange={(event) => setDeletePhrase(event.target.value)} placeholder="delete my diary" className={`${fieldClass} mt-4`} />
                        <button type="submit" disabled={pending} className={`${quietClass} mt-4`}>Delete account</button>
                    </form>
                </>
            )}
            {message && <p className="text-sm text-[#d5cdc0]">{message}</p>}
            {error && <p className="text-sm text-[#d5cdc0]">{error}</p>}
        </div>
    );
}
