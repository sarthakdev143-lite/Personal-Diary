"use client";

import { useEffect } from "react";
import Link from "next/link";

import Diary3D from "@/components/Diary3D";
import LenisProvider from "@/components/LenisProvider";
import { DIARY_EVENTS } from "@/context/DiaryContext";
import { PRICES } from "@/lib/plans";

export default function HomeStory() {
    useEffect(() => {
        if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;

        const open = new CustomEvent(DIARY_EVENTS.OPEN);
        const close = new CustomEvent(DIARY_EVENTS.CLOSE);
        const opened = document.getElementById("diary-opens");
        if (!opened) return;

        const observer = new IntersectionObserver((entries) => {
            if (entries.some((entry) => entry.isIntersecting)) {
                window.dispatchEvent(open);
                return;
            }
            window.dispatchEvent(close);
        }, { threshold: 0.45 });

        observer.observe(opened);
        return () => observer.disconnect();
    }, []);

    return (
        <LenisProvider>
            <Diary3D selectedTexture="/textures/leather-texture.jpg" />
            <article className="relative z-10">
                <section className="flex min-h-screen items-end px-6 pb-24 md:items-center md:px-16">
                    <div className="max-w-md bg-[#12110f]/80 p-6 backdrop-blur-sm">
                        <h1 className="text-4xl font-normal leading-tight">The diary opens when you scroll.</h1>
                        <p className="mt-4 leading-7 text-[#c9c2b6]">
                            The book is the product. Keep going and it opens. The words you write are encrypted in this browser before they are saved.
                        </p>
                        <Link href="/login" className="mt-6 inline-block bg-[#e8e2d6] px-4 py-2 text-sm text-[#161410]">
                            Create account
                        </Link>
                    </div>
                </section>

                <section id="diary-opens" className="flex min-h-screen items-center px-6 md:px-16">
                    <div className="max-w-md bg-[#12110f]/80 p-6 backdrop-blur-sm">
                        <h2 className="text-3xl font-normal leading-tight">The server stores ciphertext.</h2>
                        <p className="mt-4 leading-7 text-[#c9c2b6]">
                            Your password stays in this tab. It is not sent with the entry. Forget it, and the diary cannot be opened by you, by us, or by anyone who takes the database.
                        </p>
                    </div>
                </section>

                <section className="flex min-h-screen items-center px-6 md:px-16">
                    <div className="max-w-md bg-[#12110f]/80 p-6 backdrop-blur-sm">
                        <h2 className="text-3xl font-normal leading-tight">You can still leave with the pages.</h2>
                        <p className="mt-4 leading-7 text-[#c9c2b6]">
                            Unlock the diary, search it, and revise an entry. Download it as Markdown whenever you want. Export is not a paid feature.
                        </p>
                    </div>
                </section>

                <section className="flex min-h-screen items-end px-6 pb-24 md:items-center md:px-16">
                    <div className="max-w-md bg-[#12110f]/80 p-6 backdrop-blur-sm">
                        <h2 className="text-3xl font-normal leading-tight">One diary is free.</h2>
                        <p className="mt-4 leading-7 text-[#c9c2b6]">
                            Pro is {PRICES.month.label} a month, or {PRICES.year.label} a year, when you need more than one diary and longer entries.
                        </p>
                        <div className="mt-6 flex gap-5 text-sm">
                            <Link href="/login" className="bg-[#e8e2d6] px-4 py-2 text-[#161410]">Create account</Link>
                            <Link href="/pricing" className="self-center underline">Compare plans</Link>
                        </div>
                        <div className="mt-8 flex gap-6 text-sm text-[#8f877c]">
                            <Link href="/terms">Terms</Link>
                            <Link href="/privacy">Privacy</Link>
                        </div>
                    </div>
                </section>
            </article>
        </LenisProvider>
    );
}
