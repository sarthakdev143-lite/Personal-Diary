import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = {
    title: "Terms • Diary",
};

export default function TermsPage() {
    return (
        <article className="relative z-10 mx-auto min-h-screen max-w-2xl px-4 pb-24 pt-32 text-zinc-200">
            <h1 className="text-3xl font-semibold text-white">Terms</h1>
            <div className="mt-6 space-y-4 text-sm leading-7 text-zinc-300">
                <p>Diary is a private journal. You need an account to save entries. Free and Pro limits are listed on the pricing page, and the server enforces them.</p>
                <p>Pro is a recurring subscription billed by Stripe. You can cancel from the billing portal. Deleting your account cancels an active subscription before the diaries are removed.</p>
                <p>Your password encrypts the diary key in the browser. We do not receive the password, and we cannot restore entries if you forget it.</p>
                <p>Do not use the service for anything illegal. We may close an account that abuses the storage limits or the billing system.</p>
                <p><Link href="/privacy" className="underline">Privacy</Link></p>
            </div>
        </article>
    );
}
