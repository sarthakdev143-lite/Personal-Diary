"use client";

import { useEffect } from "react";
import Link from "next/link";

import Diary3D from "@/components/Diary3D";
import LenisProvider from "@/components/LenisProvider";
import { DIARY_EVENTS } from "@/context/DiaryContext";
import { PRICES } from "@/lib/plans";

const later = [
    {
        title: "Nothing readable is stored.",
        body: "The password stays on this device. The server keeps ciphertext. Lose the password, and nobody can open the book.",
    },
    {
        title: "The pages stay yours.",
        body: "Search after you unlock the diary. Revise an entry. Download it as Markdown. That export is not charged.",
    },
];

export default function HomeStory() {
    useEffect(() => {
        const story = document.getElementById("story");
        if (!story) return;
        let frame = 0;
        const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
        const update = () => {
            frame = 0;
            const total = story.offsetHeight - window.innerHeight;
            const traveled = Math.min(Math.max(-story.getBoundingClientRect().top, 0), Math.max(total, 0));
            const progress = total <= 0 ? 0 : traveled / total;
            const amount = Math.min(1, Math.max(0, (progress - 0.08) / 0.75));
            if (!reduced) {
                window.dispatchEvent(new CustomEvent(DIARY_EVENTS.POSE, { detail: amount }));
            }
        };
        const onScroll = () => {
            if (frame) return;
            frame = window.requestAnimationFrame(update);
        };
        update();
        window.addEventListener("scroll", onScroll, { passive: true });
        window.addEventListener("resize", onScroll);
        return () => {
            window.removeEventListener("scroll", onScroll);
            window.removeEventListener("resize", onScroll);
            if (frame) window.cancelAnimationFrame(frame);
        };
    }, []);

    return (
        <LenisProvider>
            <div id="story" className="mx-auto grid max-w-6xl items-start px-6 md:grid-cols-2">
                <div className="order-2 md:order-1">
                    <section className="flex min-h-[calc(100vh-4rem)] flex-col justify-center py-16">
                        <h1 className="story-serif text-5xl leading-none text-[#f3ecdf] md:text-6xl">A closed book.</h1>
                        <p className="mt-5 max-w-md text-base leading-7 text-[#d5cdc0]">
                            Scroll, and it opens. The entries you write are encrypted in this browser before they are saved.
                        </p>
                        <Link href="/login" className="mt-8 inline-block w-fit bg-[#f3ecdf] px-4 py-2 text-sm text-[#161410]">
                            Create account
                        </Link>
                    </section>
                    {later.map((item) => (
                        <section key={item.title} className="flex min-h-[70vh] flex-col justify-center border-t border-[#2a2620]">
                            <h2 className="story-serif text-4xl text-[#f3ecdf]">{item.title}</h2>
                            <p className="mt-4 max-w-md leading-7 text-[#d5cdc0]">{item.body}</p>
                        </section>
                    ))}
                    <section className="flex min-h-[70vh] flex-col justify-center border-t border-[#2a2620]">
                        <h2 className="story-serif text-4xl text-[#f3ecdf]">One diary is free.</h2>
                        <p className="mt-4 max-w-md leading-7 text-[#d5cdc0]">
                            Pro is {PRICES.month.label} a month, or {PRICES.year.label} a year, for more diaries and longer entries.
                        </p>
                        <Link href="/pricing" className="mt-6 inline-block text-sm text-[#f3ecdf] underline">Compare plans</Link>
                        <div className="mt-10 flex gap-6 text-sm text-[#8f877c]">
                            <Link href="/terms">Terms</Link>
                            <Link href="/privacy">Privacy</Link>
                        </div>
                    </section>
                </div>
                <div className="order-1 py-8 md:sticky md:top-16 md:order-2 md:flex md:h-[calc(100vh-4rem)] md:items-center md:py-8">
                    <div className="relative flex h-[420px] w-full items-center justify-center overflow-hidden border border-[#2a2620] bg-[#1a1612] md:h-[calc(100vh-8rem)]">
                        <div className="relative aspect-[3/4] h-[72%] max-h-[520px] bg-[#5c3b24] shadow-[0_30px_70px_rgba(0,0,0,0.45)]">
                            <div className="absolute inset-y-0 left-0 w-3 bg-[#2c1b10]" />
                            <div className="absolute inset-5 border border-[#e6d3b1]/30" />
                            <p className="story-serif absolute inset-0 flex items-center justify-center text-3xl text-[#f3ecdf]">Diary</p>
                        </div>
                        <Diary3D selectedTexture="/textures/leather-texture.jpg" />
                    </div>
                </div>
            </div>
        </LenisProvider>
    );
}
