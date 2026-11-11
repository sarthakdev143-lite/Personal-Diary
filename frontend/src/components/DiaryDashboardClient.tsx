"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";

import Diaries from "@/components/Diaries";
import NewDiaryForm from "@/components/NewDiaryForm";
import { Toaster } from "@/components/ui/toaster";
import { useVault } from "@/context/VaultContext";

const fieldClass = "w-full max-w-md border border-[#3a342c] bg-transparent px-3 py-2 text-sm text-[#d5cdc0] placeholder:text-[#8f877c] focus-visible:outline focus-visible:outline-1 focus-visible:outline-[#f3ecdf]";
const primaryClass = "bg-[#f3ecdf] px-4 py-2 text-sm text-[#161410]";

const DiaryDashboardClient = () => {
    const searchInputRef = useRef<HTMLInputElement>(null);
    const router = useRouter();
    const { account } = useVault();
    const [query, setQuery] = useState("");
    const [newDiaryFormActive, setNewDiaryFormActive] = useState(false);
    const [refetchTrigger, setRefetchTrigger] = useState(0);
    const atDiaryLimit = account ? account.usage.diaries >= account.limits.diaries : false;

    useEffect(() => {
        searchInputRef.current?.focus();

        const handleKeyDown = (event: KeyboardEvent) => {
            if (event.key !== "Escape") return;
            setNewDiaryFormActive(false);
        };

        window.addEventListener("keydown", handleKeyDown);
        return () => window.removeEventListener("keydown", handleKeyDown);
    }, []);

    return (
        <div className="mx-auto flex min-h-screen w-full max-w-5xl flex-col bg-[#12110f] px-4 pb-16 pt-24 text-[#d5cdc0]">
            <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
                <input
                    ref={searchInputRef}
                    type="text"
                    value={query}
                    onChange={(event) => setQuery(event.target.value)}
                    placeholder="Search"
                    className={fieldClass}
                />
                <button
                    type="button"
                    className={primaryClass}
                    onClick={() => {
                        if (atDiaryLimit) {
                            router.push("/pricing");
                            return;
                        }
                        setNewDiaryFormActive(true);
                    }}
                >
                    {atDiaryLimit ? "Upgrade for another diary" : "New diary"}
                </button>
            </div>
            <p className="mb-6 text-sm text-[#8f877c]">
                {account ? `${account.plan === "pro" ? "Pro" : "Free"}. ${account.usage.diaries} of ${account.limits.diaries} diaries.` : ""}
            </p>
            <div className="flex flex-wrap gap-4">
                <Diaries refetchTrigger={refetchTrigger} query={query} />
            </div>
            <NewDiaryForm
                formActive={newDiaryFormActive}
                setFormActive={setNewDiaryFormActive}
                onDiaryCreated={() => setRefetchTrigger((prev) => prev + 1)}
            />
            <Toaster />
        </div>
    );
};

export default DiaryDashboardClient;
