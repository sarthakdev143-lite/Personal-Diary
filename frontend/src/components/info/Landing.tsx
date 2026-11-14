"use client";

import { useSession } from "next-auth/react";
import Link from "next/link";

import { Button } from "@/components/ui/button";

const Landing = () => {
    const { status } = useSession();
    const startHref = status === "authenticated" ? "/diary" : "/login";
    const startReady = status !== "loading";

    return (
        <section
            className="flex w-full flex-col items-center justify-center select-none"
            style={{ textShadow: "0px 4px 12px rgba(0,0,0,0.2)" }}
        >
            <h1 className="text-center text-4xl font-bold italic text-white max-xxs:text-3xl">
                Your Private Digital Diary. Safe, Secure, and Serene
            </h1>
            <p className="mt-2 text-center text-lg text-zinc-300 max-xxs:text-base">
                Scribble your thoughts, ideas, and todos in a clean and minimal interface.
            </p>

            <div className="mt-6 flex gap-2 max-xxs:flex-col max-xxs:gap-3">
                {startReady ? (
                    <Button
                        className="pointer-events-auto rounded-md bg-white text-base font-semibold text-zinc-950 hover:bg-zinc-200"
                        size={'lg'}
                        asChild
                    >
                        <Link href={startHref}>
                            Start Writing
                        </Link>
                    </Button>
                ) : (
                    <Button
                        className="pointer-events-auto rounded-md bg-white text-base font-semibold text-zinc-950"
                        size={'lg'}
                        disabled
                    >
                        Start Writing
                    </Button>
                )}
                <Button
                    className="pointer-events-auto rounded-md border border-white/70 bg-transparent text-base font-semibold text-white hover:bg-white/10"
                    size={'lg'}
                    asChild
                >
                    <a href="#features">See what it does</a>
                </Button>
            </div>
        </section>
    );
};

export default Landing;