import Link from "next/link";

import { PRICES } from "@/lib/plans";

export default function Home() {
    return (
        <div className="mx-auto min-h-screen max-w-2xl px-6 pb-24 pt-28">
            <h1 className="text-4xl font-normal leading-tight">Write it here. The server cannot read it.</h1>
            <p className="mt-6 text-base leading-7 text-[#c9c2b6]">
                Diary encrypts each entry in the browser before saving it. The stored text is ciphertext. Your password never leaves this browser, so a forgotten password cannot be reset and the entries cannot be recovered.
            </p>
            <Link href="/login" className="mt-8 inline-block bg-[#e8e2d6] px-4 py-2 text-sm text-[#161410]">
                Create account
            </Link>

            <section className="mt-16 border-t border-[#2a2620] pt-10">
                <h2 className="text-lg font-normal">The diary</h2>
                <ul className="mt-4 list-disc space-y-2 pl-5 text-[#c9c2b6]">
                    <li>Write an entry, come back, and change it.</li>
                    <li>Search the diary after you unlock it in this tab.</li>
                    <li>Download the diary as Markdown.</li>
                </ul>
            </section>

            <section className="mt-12 border-t border-[#2a2620] pt-10">
                <h2 className="text-lg font-normal">The account</h2>
                <p className="mt-4 leading-7 text-[#c9c2b6]">
                    One diary is free. Pro is {PRICES.month.label} a month, or {PRICES.year.label} a year, and raises how many diaries and how long an entry can be.
                </p>
                <Link href="/pricing" className="mt-4 inline-block text-sm text-[#e8e2d6] underline">
                    Compare plans
                </Link>
            </section>

            <footer className="mt-16 flex gap-6 border-t border-[#2a2620] pt-8 text-sm text-[#8f877c]">
                <Link href="/terms">Terms</Link>
                <Link href="/privacy">Privacy</Link>
            </footer>
        </div>
    );
}
