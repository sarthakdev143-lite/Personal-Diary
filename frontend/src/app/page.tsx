import Link from "next/link";

import Pricing from "@/components/Pricing";

export default function Home() {
    return (
        <div className="mx-auto flex min-h-screen max-w-3xl flex-col px-6 pb-24 pt-28">
            <h1 className="max-w-xl text-4xl font-normal leading-tight">A private diary.</h1>
            <p className="mt-4 max-w-xl text-base leading-7 text-[#b7b0a4]">
                Entries are encrypted in this browser before they are saved. The server stores ciphertext. A forgotten password cannot be recovered.
            </p>
            <div className="mt-8 flex gap-3">
                <Link href="/login" className="bg-[#e8e2d6] px-4 py-2 text-sm text-[#161410]">Create account</Link>
                <Link href="#pricing" className="border border-[#3a342c] px-4 py-2 text-sm">See pricing</Link>
            </div>
            <div id="pricing">
                <Pricing />
            </div>
            <footer className="flex gap-6 text-sm text-[#8f877c]">
                <Link href="/terms">Terms</Link>
                <Link href="/privacy">Privacy</Link>
            </footer>
        </div>
    );
}
