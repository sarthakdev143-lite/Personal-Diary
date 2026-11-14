"use client";

import Image from "next/image";
import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { useSession } from "next-auth/react";

import { coverForTheme } from "@/lib/diary/constants";
import { diaryListKeyAction } from "@/lib/diary/keys";
import { diaryMatchPath } from "@/lib/diary/search";
import { entryToShowByStep, formatDiaryDate } from "@/lib/diary/text";

type Diary = {
    _id: string;
    title: string;
    description: string;
    theme: string;
    createdAt: string;
    updatedAt?: string;
    match?: string | null;
    matchEntry?: string | null;
};

const SKELETON_COUNT = 3;

const truncateDescription = (description: string, maxLength = 110) => {
    if (description.length <= maxLength) return description;
    return `${description.slice(0, maxLength).trimEnd()}...`;
};

const Diaries = ({ query = "", refetchTrigger = 0, paused = false }: { query?: string; refetchTrigger?: number; paused?: boolean }) => {
    const { status } = useSession();
    const [attempt, setAttempt] = useState(0);
    const visibleRef = useRef<Diary[]>([]);
    const [result, setResult] = useState<{
        key: string;
        diaries: Diary[];
        error: string | null;
    } | null>(null);
    const requestKey = `${status}:${query}:${refetchTrigger}:${attempt}`;

    useEffect(() => {
        if (status !== "authenticated") return;

        const controller = new AbortController();
        let active = true;

        const loadDiaries = async () => {
            try {
                const params = query ? `?q=${encodeURIComponent(query)}` : "";
                const response = await fetch(`/api/diaries${params}`, {
                    method: "GET",
                    cache: "no-store",
                    signal: controller.signal,
                });

                const data: unknown = await response.json().catch(() => null);

                if (!response.ok) {
                    const message = data && typeof data === "object" && "error" in data && typeof data.error === "string"
                        ? data.error
                        : "Could not load diaries.";
                    throw new Error(message);
                }

                if (!active) return;
                setResult({
                    key: requestKey,
                    diaries: Array.isArray(data) ? (data as Diary[]) : [],
                    error: null,
                });
            } catch (fetchError) {
                if (!active || controller.signal.aborted) return;
                setResult({
                    key: requestKey,
                    diaries: [],
                    error: fetchError instanceof Error ? fetchError.message : "Could not load diaries.",
                });
            }
        };

        void loadDiaries();

        return () => {
            active = false;
            controller.abort();
        };
    }, [status, query, refetchTrigger, attempt, requestKey]);

    useEffect(() => {
        const onKey = (event: KeyboardEvent) => {
            const target = event.target;
            const inField = target instanceof HTMLElement && (
                target.tagName === "INPUT"
                || target.tagName === "TEXTAREA"
                || target.tagName === "SELECT"
                || target.isContentEditable
            );
            const action = diaryListKeyAction({
                key: event.key,
                altKey: event.altKey,
                ctrlKey: event.ctrlKey,
                metaKey: event.metaKey,
                shiftKey: event.shiftKey,
                inField,
                searchFocused: false,
                query: "",
                formOpen: paused,
                themeOpen: false,
            });
            if (action !== "next" && action !== "previous") return;
            const list = visibleRef.current;
            if (!list.length) return;
            const active = document.activeElement instanceof Element
                ? document.activeElement.closest<HTMLElement>("[data-diary-id]")
                : null;
            const next = entryToShowByStep(
                list,
                active?.dataset.diaryId ?? null,
                action === "next" ? "next" : "previous",
            );
            if (!next) return;
            const link = document.querySelector<HTMLAnchorElement>(`a[data-diary-id="${CSS.escape(next._id)}"]`);
            if (!link) return;
            event.preventDefault();
            link.focus();
            link.scrollIntoView({ block: "nearest" });
        };

        window.addEventListener("keydown", onKey);
        return () => window.removeEventListener("keydown", onKey);
    }, [paused]);

    const isCurrent = result?.key === requestKey;
    const diaries = isCurrent ? result.diaries : [];
    visibleRef.current = diaries;
    const error = isCurrent ? result.error : null;
    const isLoading = status === "loading" || (status === "authenticated" && !isCurrent);

    if (isLoading) {
        return (
            <>
                {Array.from({ length: SKELETON_COUNT }).map((_, index) => (
                    <div
                        key={`diary-skeleton-${index}`}
                        className="h-36 w-full max-w-xs animate-pulse rounded-xl bg-zinc-700/30"
                    />
                ))}
            </>
        );
    }

    if (error) {
        return (
            <div className="flex h-36 w-full max-w-xs flex-col justify-between rounded-xl border border-red-400/30 bg-red-950/20 p-6 text-white/80">
                <p className="text-sm leading-6">{error}</p>
                <button
                    type="button"
                    onClick={() => setAttempt((value) => value + 1)}
                    className="w-fit text-sm text-white underline underline-offset-4"
                >
                    Try again
                </button>
            </div>
        );
    }

    if (!diaries.length && query) {
        return (
            <p className="w-full max-w-xs rounded-xl border border-white/10 bg-zinc-600/10 p-6 text-base text-zinc-300" role="status">
                No diaries match “{query}”.
            </p>
        );
    }

    if (!diaries.length) {
        return null;
    }

    return (
        <>
            {diaries.map((diary) => {
                const cover = coverForTheme(diary.theme);
                return (
                <Link
                    key={diary._id}
                    href={diaryMatchPath(diary._id, query ? diary.matchEntry : null)}
                    data-diary-id={diary._id}
                    className="flex min-h-36 w-full max-w-xs overflow-hidden rounded-xl border border-white/10 bg-zinc-600/10 text-white/80 shadow-lg focus-visible:border-white/70 focus-visible:outline focus-visible:outline-1 focus-visible:outline-offset-2 focus-visible:outline-white/70"
                >
                    {cover ? (
                        <span className="relative block h-full w-16 shrink-0">
                            <Image
                                src={cover.textureUrl}
                                alt={cover.name}
                                fill
                                sizes="64px"
                                className="object-cover"
                            />
                        </span>
                    ) : (
                        <span className="h-full w-16 shrink-0 bg-zinc-800" />
                    )}
                    <div className="flex min-w-0 flex-1 flex-col justify-between p-4">
                        <div className="space-y-2 overflow-hidden">
                            <h2 className="truncate text-lg font-medium text-white">{diary.title}</h2>
                            <p className="line-clamp-2 text-sm leading-6 text-zinc-300">
                                {query && diary.match
                                    ? diary.match
                                    : truncateDescription(diary.description || "No description")}
                            </p>
                        </div>
                        <p className="text-xs tracking-wide text-zinc-400">
                            Updated {formatDiaryDate(diary.updatedAt || diary.createdAt)}
                        </p>
                    </div>
                </Link>
                );
            })}
        </>
    );
};

export default Diaries;
