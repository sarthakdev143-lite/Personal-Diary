"use client";

import { useEffect, useState } from "react";
import Link from "next/link";

import Diary3D from "@/components/Diary3D";
import LenisProvider from "@/components/LenisProvider";
import { DIARY_EVENTS } from "@/context/DiaryContext";
import { PRICES } from "@/lib/plans";

const beats = [
    {
        kicker: "01",
        title: "A closed book.",
        body: "Scroll, and it opens. The entries you write are encrypted in this browser before they are saved.",
    },
    {
        kicker: "02",
        title: "Nothing readable is stored.",
        body: "The password stays on this device. The server keeps ciphertext. Lose the password, and nobody can open the book.",
    },
    {
        kicker: "03",
        title: "The pages stay yours.",
        body: "Search after you unlock the diary. Revise an entry. Download the whole diary as Markdown. Export is not charged.",
    },
    {
        kicker: "04",
        title: "One diary is free.",
        body: `Pro is ${PRICES.month.label} a month, or ${PRICES.year.label} a year, for more diaries and longer entries.`,
    },
];

function openAmount(progress: number) {
    const start = 0.1;
    const end = 0.62;
    return Math.min(1, Math.max(0, (progress - start) / (end - start)));
}

export default function HomeStory() {
    const [beat, setBeat] = useState(0);

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
            if (!reduced) {
                window.dispatchEvent(new CustomEvent(DIARY_EVENTS.POSE, { detail: openAmount(progress) }));
            }
            const next = progress < 0.22 ? 0 : progress < 0.46 ? 1 : progress < 0.7 ? 2 : 3;
            setBeat((current) => (current === next ? current : next));
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
            <Diary3D selectedTexture="/textures/leather-texture.jpg" />
            <div id="story" className="relative h-[340vh]">
                <div className="sticky top-0 h-screen overflow-hidden">
                    <div className="story-veil pointer-events-none absolute inset-0 z-10" />
                    <div className="relative z-20 flex h-full items-end px-6 pb-16 md:items-center md:px-16 md:pb-0">
                        <div className="relative min-h-64 w-full max-w-xl">
                            {beats.map((item, index) => (
                                <div
                                    key={item.kicker}
                                    className={`absolute inset-x-0 top-0 transition-opacity duration-500 ${index === beat ? "opacity-100" : "pointer-events-none opacity-0"}`}
                                >
                                    <p className="text-xs tracking-[0.22em] text-[#8f877c]">{item.kicker}</p>
                                    <h1 className="story-serif mt-3 text-5xl leading-none text-[#f3ecdf] md:text-6xl">{item.title}</h1>
                                    <p className="mt-5 max-w-md text-base leading-7 text-[#d5cdc0]">{item.body}</p>
                                    {index === 0 && (
                                        <Link href="/login" className="mt-8 inline-block bg-[#f3ecdf] px-4 py-2 text-sm text-[#161410]">
                                            Create account
                                        </Link>
                                    )}
                                    {index === beats.length - 1 && (
                                        <div className="mt-8 flex items-center gap-6 text-sm">
                                            <Link href="/login" className="bg-[#f3ecdf] px-4 py-2 text-[#161410]">Create account</Link>
                                            <Link href="/pricing" className="underline">Compare plans</Link>
                                        </div>
                                    )}
                                </div>
                            ))}
                        </div>
                    </div>
                    <div className="absolute bottom-6 left-6 z-20 flex gap-5 text-sm text-[#8f877c] md:left-16">
                        <Link href="/terms">Terms</Link>
                        <Link href="/privacy">Privacy</Link>
                    </div>
                </div>
            </div>
        </LenisProvider>
    );
}
