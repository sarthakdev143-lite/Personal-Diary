import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = {
    title: "Privacy • Diary",
};

export default function PrivacyPage() {
    return (
        <article className="relative z-10 mx-auto min-h-screen max-w-2xl px-4 pb-24 pt-32 text-zinc-200">
            <h1 className="text-3xl font-semibold text-white">Privacy</h1>
            <div className="mt-6 space-y-4 text-sm leading-7 text-zinc-300">
                <p>We store your email, name, plan, and the encrypted diary. Entry text, titles, and descriptions are encrypted in your browser with AES-GCM before they are sent. The server stores ciphertext and cannot decrypt it.</p>
                <p>The unwrapped diary key stays in this browser tab. It is not sent to the server. A person who can run script in the page, such as a malicious extension, can read an unlocked diary. Sign out or lock the diary when you leave a shared computer.</p>
                <p>Email accounts send a password verifier, not the password. Google and GitHub sign-in are optional and only appear when those apps are configured. Stripe receives the billing details for Pro. We store the Stripe customer id and subscription status.</p>
                <p>Entry dates and counts are stored in the clear so the streak and plan limits can work. The words themselves are not.</p>
                <p>Delete the account from the account page to remove the user, diaries, and entries. <Link href="/terms" className="underline">Terms</Link></p>
            </div>
        </article>
    );
}
