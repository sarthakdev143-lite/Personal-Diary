"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { RiAddCircleLine } from "@remixicon/react";

import LenisProvider from "@/components/LenisProvider";
import Diaries from "@/components/Diaries";
import NewDiaryForm from "@/components/NewDiaryForm";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Toaster } from "@/components/ui/toaster";
import { useVault } from "@/context/VaultContext";
import { writingStreak } from "@/lib/streak";

const DiaryDashboardClient = () => {
    const infoParentRef = useRef<HTMLDivElement>(null);
    const searchInputRef = useRef<HTMLInputElement>(null);
    const router = useRouter();
    const { account } = useVault();
    const [query, setQuery] = useState("");
    const [newDiaryFormActive, setNewDiaryFormActive] = useState(false);
    const [isFullScreen, setIsFullScreen] = useState(false);
    const [refetchTrigger, setRefetchTrigger] = useState(0);
    const atDiaryLimit = account ? account.usage.diaries >= account.limits.diaries : false;
    const streak = useMemo(
        () => writingStreak((account?.entryDates ?? []).map((value) => new Date(value))),
        [account]
    );

    useEffect(() => {
        searchInputRef.current?.focus();

        const handleKeyDown = (event: KeyboardEvent) => {
            if (event.ctrlKey && event.key.toLowerCase() === "i") {
                event.preventDefault();
                searchInputRef.current?.focus();
            }
        };

        const handleFormClose = (event: KeyboardEvent) => {
            if (event.key.toLowerCase() !== "escape") return;

            if (isFullScreen) {
                setIsFullScreen(false);
                return;
            }

            setNewDiaryFormActive(false);
        };

        window.addEventListener("keydown", handleFormClose);
        window.addEventListener("keydown", handleKeyDown);

        return () => {
            window.removeEventListener("keydown", handleFormClose);
            window.removeEventListener("keydown", handleKeyDown);
        };
    }, [isFullScreen]);

    return (
        <LenisProvider>
            <div
                id="info-parent"
                ref={infoParentRef}
                className="relative flex min-h-screen w-full flex-col bg-black/25 px-4 pt-32 text-3xl text-white backdrop-blur-lg max-xs:px-3"
            >
                <div className="sticky top-[16%] mx-auto mb-6 flex w-full items-center justify-between gap-3 xs:w-[80%] md:w-[55%]">
                    <Input
                        ref={searchInputRef}
                        type="text"
                        value={query}
                        onChange={(event) => setQuery(event.target.value)}
                        placeholder="Search diary and notes..."
                        className="rounded-xl border border-white/15 bg-white/10 p-6 py-[1.65rem] text-lg text-white outline-none placeholder:text-zinc-400 focus:border-white/50"
                    />
                    <div id="keyboard-key" className="absolute right-6 flex gap-1 max-md:hidden">
                        <span className="rounded-md bg-zinc-700/70 px-[0.4rem] font-mono text-base text-zinc-400/90">ctrl</span>
                        <span className="rounded-md bg-zinc-700/70 px-[0.4rem] font-mono text-base text-zinc-400/90">I</span>
                    </div>
                </div>
                <p className="mx-auto mb-6 w-full text-base text-zinc-300 xs:w-[80%] md:w-[55%]">
                    {streak === 0 ? "No writing streak yet." : `${streak} day streak.`}
                    {account ? ` ${account.plan === "pro" ? "Pro" : "Free"} plan, ${account.usage.diaries} of ${account.limits.diaries} diaries.` : ""}
                </p>
                <div id="diaries" className="mx-auto flex h-auto w-full max-w-[85%] flex-wrap gap-5 max-sm:justify-center">
                    <Diaries refetchTrigger={refetchTrigger} query={query} />
                    <Button
                        onClick={() => {
                            if (atDiaryLimit) {
                                router.push("/pricing");
                                return;
                            }
                            setNewDiaryFormActive(true);
                        }}
                        id="add-new-diary"
                        className="group h-36 max-w-xs flex-col items-center rounded-xl border border-white/10 bg-zinc-600/10 p-6 text-white/80 shadow-lg mix-blend-difference transition-[border] hover:border-white/30 hover:bg-zinc-700/15"
                    >
                        <div className="mb-3 rounded-lg border border-white/10 bg-white/10 p-3 transition-[border] group-hover:border-white/30 group-hover:bg-white/15">
                            <RiAddCircleLine size={20} />
                        </div>
                        <h2 className="text-lg font-medium">{atDiaryLimit ? "Upgrade for another diary" : "+ Add New Diary"}</h2>
                    </Button>
                </div>
            </div>
            <NewDiaryForm
                formActive={newDiaryFormActive}
                setFormActive={setNewDiaryFormActive}
                isFullScreen={isFullScreen}
                setIsFullScreen={setIsFullScreen}
                onDiaryCreated={() => setRefetchTrigger((prev) => prev + 1)}
            />
            <Toaster />
        </LenisProvider>
    );
};

export default DiaryDashboardClient;
