"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";

import Diaries from "@/components/Diaries";
import NewDiaryForm from "@/components/NewDiaryForm";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Toaster } from "@/components/ui/toaster";
import { useVault } from "@/context/VaultContext";

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
        <div className="mx-auto flex min-h-screen w-full max-w-5xl flex-col px-4 pb-16 pt-24">
            <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
                <Input
                    ref={searchInputRef}
                    type="text"
                    value={query}
                    onChange={(event) => setQuery(event.target.value)}
                    placeholder="Search"
                    className="max-w-md border-[#3a342c] text-[#e8e2d6]"
                />
                <Button
                    onClick={() => {
                        if (atDiaryLimit) {
                            router.push("/pricing");
                            return;
                        }
                        setNewDiaryFormActive(true);
                    }}
                >
                    {atDiaryLimit ? "Upgrade for another diary" : "New diary"}
                </Button>
            </div>
            <p className="mb-6 text-sm text-[#b7b0a4]">
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
