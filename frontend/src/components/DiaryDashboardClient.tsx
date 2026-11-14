"use client";

import { useEffect, useRef, useState } from "react";
import { RiAddCircleLine } from "@remixicon/react";

import LenisProvider from "@/components/LenisProvider";
import Diaries from "@/components/Diaries";
import NewDiaryForm from "@/components/NewDiaryForm";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Toaster } from "@/components/ui/toaster";
import { useToast } from "@/hooks/use-toast";

const DiaryDashboardClient = () => {
    const { toast } = useToast();
    const infoParentRef = useRef<HTMLDivElement>(null);
    const searchInputRef = useRef<HTMLInputElement>(null);
    const [newDiaryFormActive, setNewDiaryFormActive] = useState(false);
    const [isFullScreen, setIsFullScreen] = useState(false);
    const [refetchTrigger, setRefetchTrigger] = useState(0);
    const [query, setQuery] = useState("");
    const [debouncedQuery, setDebouncedQuery] = useState("");
    const [isImporting, setIsImporting] = useState(false);
    const queryRef = useRef(query);
    const importInputRef = useRef<HTMLInputElement>(null);

    useEffect(() => {
        queryRef.current = query;
    }, [query]);

    useEffect(() => {
        const timeout = window.setTimeout(() => setDebouncedQuery(query), 250);
        return () => window.clearTimeout(timeout);
    }, [query]);

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

            if (document.activeElement === searchInputRef.current && queryRef.current) {
                setQuery("");
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

    const importBackup = async (file: File | undefined) => {
        if (!file || isImporting) return;
        if (file.size > 12_000_000) {
            toast({
                title: "Backup is too large",
                description: "Choose a JSON backup under 12 MB.",
                variant: "destructive",
            });
            return;
        }

        setIsImporting(true);
        try {
            const text = await file.text();
            let payload: unknown;
            try {
                payload = JSON.parse(text);
            } catch {
                throw new Error("Choose a JSON backup from this diary.");
            }

            const response = await fetch("/api/diaries/import", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(payload),
            });
            const data = await response.json().catch(() => null) as {
                error?: string;
                diary?: { title?: string };
                importedEntries?: number;
                skippedEntries?: number;
            } | null;
            if (!response.ok) {
                throw new Error(data?.error || "Could not import that backup.");
            }

            setRefetchTrigger((value) => value + 1);
            const imported = data?.importedEntries ?? 0;
            const skipped = data?.skippedEntries ?? 0;
            const details = [`${data?.diary?.title || "Diary"} is in your list.`];
            if (imported) details.push(`${imported} ${imported === 1 ? "entry" : "entries"} saved.`);
            if (skipped) details.push(`${skipped} empty ${skipped === 1 ? "entry was" : "entries were"} left out.`);
            toast({ title: "Diary imported", description: details.join(" ") });
        } catch (importError) {
            toast({
                title: "Not imported",
                description: importError instanceof Error ? importError.message : "Could not import that backup.",
                variant: "destructive",
            });
        } finally {
            setIsImporting(false);
            if (importInputRef.current) importInputRef.current.value = "";
        }
    };

    return (
        <LenisProvider>
            <div
                id="info-parent"
                ref={infoParentRef}
                className="relative flex min-h-screen w-full flex-col bg-zinc-950 px-4 pt-32 text-base text-zinc-100 max-xs:px-3"
            >
                <div className="sticky top-[16%] mx-auto mb-6 flex w-full items-center gap-3 xs:w-[80%] md:w-[55%]">
                    <div className="relative min-w-0 flex-1">
                    <Input
                        ref={searchInputRef}
                        id="diary-search"
                        type="search"
                        value={query}
                        onChange={(event) => setQuery(event.target.value)}
                        placeholder="Search diaries and notes..."
                        aria-label="Search diaries and notes"
                        maxLength={80}
                        className="rounded-xl border border-white/15 bg-zinc-900 p-6 py-[1.65rem] text-lg text-zinc-100 outline-none placeholder:text-zinc-500 focus:border-white/50 md:pr-24"
                    />
                    <div id="keyboard-key" className="absolute right-6 top-1/2 flex -translate-y-1/2 gap-1 max-md:hidden">
                        <span className="rounded-md bg-zinc-700/70 px-[0.4rem] font-mono text-base text-zinc-400/90">ctrl</span>
                        <span className="rounded-md bg-zinc-700/70 px-[0.4rem] font-mono text-base text-zinc-400/90">I</span>
                    </div>
                    </div>
                    <button
                        type="button"
                        onClick={() => importInputRef.current?.click()}
                        disabled={isImporting}
                        className="shrink-0 rounded-xl border border-white/15 bg-zinc-900/80 px-4 py-3 text-base text-zinc-100 hover:border-white/40 disabled:opacity-50"
                    >
                        {isImporting ? "Importing" : "Import"}
                    </button>
                    <input
                        ref={importInputRef}
                        type="file"
                        accept="application/json,.json"
                        className="hidden"
                        aria-label="Import a JSON backup"
                        onChange={(event) => {
                            void importBackup(event.target.files?.[0]);
                        }}
                    />
                </div>
                <div id="diaries" className="mx-auto flex h-auto w-full max-w-[85%] flex-wrap gap-5 max-sm:justify-center">
                    <Diaries query={debouncedQuery} refetchTrigger={refetchTrigger} />
                    <Button
                        onClick={() => setNewDiaryFormActive(true)}
                        id="add-new-diary"
                        className="group h-36 w-full max-w-xs flex-col items-center rounded-xl border border-white/15 bg-zinc-900 p-6 text-zinc-100 shadow-lg transition-[border] hover:border-white/40"
                    >
                        <div className="mb-3 rounded-lg border border-white/10 bg-white/10 p-3 transition-[border] group-hover:border-white/30 group-hover:bg-white/15">
                            <RiAddCircleLine size={20} />
                        </div>
                        <h2 className="text-lg font-medium">+ Add New Diary</h2>
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
