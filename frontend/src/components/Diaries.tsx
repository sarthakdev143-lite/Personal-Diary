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
import { diaryCardWhen, diaryMatchPath, titleCardText } from "@/lib/diary/search";
import { diaryEnterChoice, diaryFieldReady, diaryListView, diaryMatchCount, diaryPendingOpen, emptyDiaryListMessage } from "@/lib/diary/view";

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

const Diaries = ({ query = "", typedQuery = query, refetchTrigger = 0, paused = false, onMatchCount }: { query?: string; typedQuery?: string; refetchTrigger?: number; paused?: boolean; onMatchCount?: (count: number | null) => void }) => {
    const { status } = useSession();
    const [attempt, setAttempt] = useState(0);
    const [pinningId, setPinningId] = useState<string | null>(null);
    const [pinError, setPinError] = useState<{ id: string; message: string } | null>(null);
    const visibleRef = useRef<readonly Diary[]>([]);
    const typedRef = useRef(typedQuery);
    const loadedRef = useRef(query);
    const currentRef = useRef(false);
    const pendingOpen = useRef<string | null>(null);
    typedRef.current = typedQuery;
    loadedRef.current = query;
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
                event.preventDefault();
                const choice = diaryEnterChoice(
                    diaryFieldReady(typedRef.current, loadedRef.current, currentRef.current),
                    visibleRef.current.map((diary) => diary._id),
                );
                if (choice === "wait") {
                    pendingOpen.current = typedRef.current.trim();
                    return;
                }
                if (!choice) return;
                document.querySelector<HTMLAnchorElement>(`a[data-diary-id="${CSS.escape(choice)}"]`)?.click();
                return;
            }
            if (action !== "next" && action !== "previous") return;
            if (!diaryFieldReady(typedRef.current, loadedRef.current, currentRef.current)) return;
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
    currentRef.current = isCurrent;

    useEffect(() => {
        const decision = diaryPendingOpen({
            pending: pendingOpen.current,
            typed: typedQuery,
            loaded: query,
            current: isCurrent,
            ids: diaries.map((diary) => diary._id),
        });
        pendingOpen.current = decision.pending;
        if (!decision.openId) return;
        document.querySelector<HTMLAnchorElement>(`a[data-diary-id="${CSS.escape(decision.openId)}"]`)?.click();
    }, [typedQuery, query, isCurrent, diaries]);

    useEffect(() => {
        onMatchCount?.(diaryMatchCount({
            typed: typedQuery,
            loaded: query,
            current: isCurrent,
            error: Boolean(error),
            count: diaries.length,
        }));
    }, [onMatchCount, typedQuery, query, isCurrent, error, diaries.length]);

    if (isLoading) {
        return (
            <>
                {Array.from({ length: SKELETON_COUNT }).map((_, index) => (
                    <div
                        key={`diary-skeleton-${index}`}
                        className="h-36 w-full animate-pulse rounded-xl bg-zinc-700/30"
                    />
                ))}
            </>
        );
    }

    if (error) {
        return (
            <div className="flex h-full min-h-36 w-full flex-col justify-between rounded-xl border border-red-400/30 bg-red-950/20 p-6 text-white/80">
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
            <p className="flex h-full min-w-0 w-full items-center rounded-xl border border-white/10 bg-zinc-600/10 p-6 text-base text-zinc-300 [overflow-wrap:anywhere]" role="status">
                <span className="min-w-0 [overflow-wrap:anywhere]">No diaries match “{query}”.</span>
            </p>
        );
    }

    if (!diaries.length) {
        return (
            <p className="flex h-full min-w-0 w-full items-center rounded-xl border border-white/10 bg-zinc-600/10 p-6 text-base text-zinc-300 [overflow-wrap:anywhere]" role="status">
                <span className="min-w-0 [overflow-wrap:anywhere]">{emptyDiaryListMessage()}</span>
            </p>
        );
    }

    return (
        <>
            {diaries.map((diary) => {
                const cover = coverForTheme(diary.theme);
                const pinned = diary.pinned === true;
                return (
                <article
                    key={diary._id}
                    className="flex min-h-36 w-full overflow-hidden rounded-xl border border-white/10 bg-zinc-600/10 text-white/80 shadow-lg"
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
                                        ? <MatchedText text={titleCardText(diary.title, query)} query={query} className="rounded-sm bg-amber-950/80 px-0.5 text-amber-100" />
                                        : diary.title}
                                </h2>
                                {(query ? diary.match || diary.description : diary.description) ? (
                                <p className="line-clamp-2 text-sm leading-6 text-zinc-300">
                                    {query
                                        ? <MatchedText text={diary.match || truncateDescription(diary.description)} query={query} className="rounded-sm bg-amber-950/80 px-0.5 text-amber-100" />
                                        : truncateDescription(diary.description)}
                                </p>
                                ) : null}
                            </div>
                            <p className="truncate text-xs tracking-wide text-zinc-400">
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
                            className={`relative shrink-0 rounded-full border px-1.5 py-0.5 text-xs tracking-wide after:absolute after:-inset-x-2 after:-inset-y-3 after:content-[''] focus-visible:outline focus-visible:outline-1 focus-visible:outline-offset-2 focus-visible:outline-white/70 disabled:opacity-50 ${pinned ? "border-white/50 bg-white/10 text-white" : "border-white/20 text-zinc-200 hover:border-white/40 hover:text-white"}`}
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
