"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { useSession } from "next-auth/react";

import { useVault } from "@/context/VaultContext";
import type { DiaryRecord } from "@/lib/records";
import { revealText } from "@/lib/reveal";

type Diary = {
    _id: string;
    title: string;
    description: string;
    theme: string;
    pinned: boolean;
    createdAt: string;
};

const SKELETON_COUNT = 3;

const truncateDescription = (description: string, maxLength = 110) => {
    if (description.length <= maxLength) return description;
    return `${description.slice(0, maxLength).trimEnd()}...`;
};

const formatDiaryDate = (dateValue: string) => {
    const date = new Date(dateValue);
    if (Number.isNaN(date.getTime())) return "Unknown date";

    return new Intl.DateTimeFormat("en-US", {
        day: "numeric",
        month: "short",
        year: "numeric",
    }).format(date);
};

const Diaries = ({ refetchTrigger = 0, query = "" }: { refetchTrigger?: number; query?: string }) => {
    const { data: session, status } = useSession();
    const { open, phase, refresh } = useVault();
    const [diaries, setDiaries] = useState<Diary[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [confirmId, setConfirmId] = useState<string | null>(null);

    useEffect(() => {
        if (status === "loading" || phase !== "unlocked") return;

        if (!session) {
            setIsLoading(false);
            return;
        }

        let isMounted = true;

        const fetchDiaries = async () => {
            setIsLoading(true);
            setError(null);

            try {
                const response = await fetch("/api/diaries", { method: "GET", cache: "no-store" });
                if (!response.ok) throw new Error(`Failed to fetch diaries: ${response.status}`);

                const data = await response.json() as DiaryRecord[];
                const opened = await Promise.all(data.map(async (diary) => ({
                    _id: diary._id,
                    title: await revealText(diary.title, open),
                    description: await revealText(diary.description, open),
                    theme: diary.theme,
                    pinned: diary.pinned,
                    createdAt: diary.createdAt,
                })));

                if (!isMounted) return;
                setDiaries(opened);
            } catch {
                if (!isMounted) return;
                setDiaries([]);
                setError("Could not open your diaries.");
            } finally {
                if (isMounted) setIsLoading(false);
            }
        };

        void fetchDiaries();
        return () => {
            isMounted = false;
        };
    }, [session, status, refetchTrigger, phase, open]);

    const visible = useMemo(() => {
        const needle = query.trim().toLowerCase();
        if (!needle) return diaries;
        return diaries.filter((diary) => `${diary.title} ${diary.description}`.toLowerCase().includes(needle));
    }, [diaries, query]);

    async function remove(id: string) {
        if (confirmId !== id) {
            setConfirmId(id);
            return;
        }
        const response = await fetch(`/api/diaries/${id}`, { method: "DELETE" });
        if (!response.ok) return;
        setDiaries((current) => current.filter((diary) => diary._id !== id));
        setConfirmId(null);
        await refresh();
    }

    if (isLoading) {
        return (
            <>
                {Array.from({ length: SKELETON_COUNT }).map((_, index) => (
                    <div key={`diary-skeleton-${index}`} className="h-36 w-full max-w-xs animate-pulse rounded-xl bg-zinc-700/30" />
                ))}
            </>
        );
    }

    if (error) return <p className="text-base text-red-300">{error}</p>;
    if (!visible.length && query.trim()) return <p className="text-base text-zinc-300">No diaries match that search.</p>;
    if (!visible.length) return null;

    return (
        <>
            {visible.map((diary) => (
                <article key={diary._id} className="flex h-44 w-full max-w-xs flex-col justify-between rounded-xl border border-white/10 bg-zinc-600/10 p-6 text-white/80 shadow-lg">
                    <div className="space-y-2 overflow-hidden">
                        <div className="flex items-start justify-between gap-2">
                            <Link href={`/diary/${diary._id}`} className="min-w-0 flex-1">
                                <h2 className="truncate text-lg font-medium text-white">
                                    {diary.pinned ? "Pinned · " : ""}{diary.title}
                                </h2>
                            </Link>
                            <button type="button" onClick={() => remove(diary._id)} className="shrink-0 text-xs text-zinc-400 hover:text-white">
                                {confirmId === diary._id ? "Confirm" : "Delete"}
                            </button>
                        </div>
                        <p className="text-sm leading-6 text-zinc-300">
                            {truncateDescription(diary.description || "No description")}
                        </p>
                    </div>
                    <p className="text-xs tracking-wide text-zinc-400">{formatDiaryDate(diary.createdAt)}</p>
                </article>
            ))}
        </>
    );
};

export default Diaries;
