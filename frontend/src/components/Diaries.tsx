"use client";

import Image from "next/image";
import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { useSession } from "next-auth/react";

import { MatchedText } from "@/components/MatchedText";
import { coverForTheme } from "@/lib/diary/constants";
import { diaryListKeyAction, diaryListStep } from "@/lib/diary/keys";
import { compareDiaryMatches } from "@/lib/diary/order";
import { appliedPin, pinFailureMessage } from "@/lib/diary/pin";
import { diaryCardWhen, diaryMatchPath } from "@/lib/diary/search";
import { diaryListView } from "@/lib/diary/view";

type Diary = {
    _id: string;
    title: string;
    description: string;
    theme: string;
    pinned?: boolean;
    createdAt: string;
    updatedAt?: string;
    match?: string | null;
    matchEntry?: string | null;
    matchAt?: string | null;
    matchCount?: number | null;
};

const SKELETON_COUNT = 3;

const truncateDescription = (description: string, maxLength = 110) => {
    if (description.length <= maxLength) return description;
    return `${description.slice(0, maxLength).trimEnd()}...`;
};

const Diaries = ({ query = "", refetchTrigger = 0, paused = false, onMatchCount }: { query?: string; refetchTrigger?: number; paused?: boolean; onMatchCount?: (count: number | null) => void }) => {
    const { status } = useSession();
    const [attempt, setAttempt] = useState(0);
    const [pinningId, setPinningId] = useState<string | null>(null);
    const [pinError, setPinError] = useState<{ id: string; message: string } | null>(null);
    const visibleRef = useRef<readonly Diary[]>([]);
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
                searchFocused: target instanceof HTMLElement && target.id === "diary-search",
                query: "",
                formOpen: paused,
                themeOpen: false,
            });
            if (action === "open") {
                const first = visibleRef.current[0];
                if (!first) return;
                const link = document.querySelector<HTMLAnchorElement>(`a[data-diary-id="${CSS.escape(first._id)}"]`);
                if (!link) return;
                event.preventDefault();
                link.click();
                return;
            }
            if (action !== "next" && action !== "previous") return;
            const list = visibleRef.current;
            if (!list.length) return;
            const active = document.activeElement instanceof Element
                ? document.activeElement.closest<HTMLElement>("[data-diary-id]")
                : null;
            const step = diaryListStep(
                list.map((diary) => diary._id),
                active?.dataset.diaryId ?? null,
                action === "next" ? "next" : "previous",
            );
            if (step === "search") {
                event.preventDefault();
                document.getElementById("diary-search")?.focus();
                return;
            }
            if (!step) return;
            const link = document.querySelector<HTMLAnchorElement>(`a[data-diary-id="${CSS.escape(step)}"]`);
            if (!link) return;
            event.preventDefault();
            link.focus();
            link.scrollIntoView({ block: "nearest" });
        };

        window.addEventListener("keydown", onKey);
        return () => window.removeEventListener("keydown", onKey);
    }, [paused]);

    const togglePin = async (diary: Diary) => {
        if (pinningId === diary._id) return;
        const pinned = diary.pinned !== true;
        setPinningId(diary._id);
        setPinError((current) => current?.id === diary._id ? null : current);
        try {
            const response = await fetch(`/api/diaries/${diary._id}`, {
                method: "PUT",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ pinned }),
            });
            const saved: unknown = await response.json().catch(() => null);
            if (!response.ok) {
                setPinError({ id: diary._id, message: pinFailureMessage(saved) });
                return;
            }
            const next = appliedPin(diary, saved && typeof saved === "object" ? saved : null, pinned);
            setResult((current) => {
                if (!current?.diaries.some((item) => item._id === diary._id)) return current;
                return {
                    ...current,
                    diaries: current.diaries
                        .map((item) => item._id === diary._id ? { ...item, pinned: next.pinned, updatedAt: next.updatedAt } : item)
                        .sort(compareDiaryMatches),
                };
            });
        } finally {
            setPinningId((current) => current === diary._id ? null : current);
        }
    };

    const view = diaryListView({
        status: status === "loading" || status === "authenticated" ? status : "unauthenticated",
        result,
        requestKey,
    });
    const diaries = view.diaries;
    visibleRef.current = diaries;
    const error = view.error;
    const isLoading = view.loading;
    const isCurrent = result?.key === requestKey;

    useEffect(() => {
        if (!query.trim() || (isCurrent && error)) {
            onMatchCount?.(null);
            return;
        }
        if (!isCurrent) return;
        onMatchCount?.(diaries.length);
    }, [onMatchCount, query, isCurrent, error, diaries.length]);

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
                const pinned = diary.pinned === true;
                return (
                <article
                    key={diary._id}
                    className="flex min-h-36 w-full max-w-xs overflow-hidden rounded-xl border border-white/10 bg-zinc-600/10 text-white/80 shadow-lg"
                >
                    <Link
                        href={diaryMatchPath(diary._id, query ? diary.matchEntry : null, query)}
                        data-diary-id={diary._id}
                        className="flex min-w-0 flex-1 focus-visible:border-white/70 focus-visible:outline focus-visible:outline-1 focus-visible:outline-offset-2 focus-visible:outline-white/70"
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
                                <h2 className="truncate text-lg font-medium text-white">
                                    {query
                                        ? <MatchedText text={diary.title} query={query} className="rounded-sm bg-amber-950/80 px-0.5 text-amber-100" />
                                        : diary.title}
                                </h2>
                                <p className="line-clamp-2 text-sm leading-6 text-zinc-300">
                                    {query
                                        ? <MatchedText text={diary.match || truncateDescription(diary.description || "No description")} query={query} className="rounded-sm bg-amber-950/80 px-0.5 text-amber-100" />
                                        : truncateDescription(diary.description || "No description")}
                                </p>
                            </div>
                            <p className="text-xs tracking-wide text-zinc-400">
                                {diaryCardWhen({
                                    query,
                                    matchEntry: diary.matchEntry,
                                    matchAt: diary.matchAt,
                                    matchCount: diary.matchCount,
                                    updatedAt: diary.updatedAt,
                                    createdAt: diary.createdAt,
                                })}
                            </p>
                        </div>
                    </Link>
                    <div className="mb-4 mr-4 flex shrink-0 flex-col items-end gap-1 self-end">
                        <button
                            type="button"
                            onClick={() => void togglePin(diary)}
                            disabled={pinningId === diary._id}
                            aria-pressed={pinned}
                            aria-label={`${pinned ? "Unpin" : "Pin"} ${diary.title}`}
                            className="text-xs tracking-wide text-zinc-200 underline decoration-white/30 underline-offset-4 hover:text-white focus-visible:outline focus-visible:outline-1 focus-visible:outline-offset-2 focus-visible:outline-white/70 disabled:opacity-50"
                        >
                            {pinned ? "Unpin" : "Pin"}
                        </button>
                        {pinError?.id === diary._id && (
                            <p className="max-w-24 text-right text-xs leading-4 text-red-200" role="alert">{pinError.message}</p>
                        )}
                    </div>
                </article>
                );
            })}
        </>
    );
};

export default Diaries;
