"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { useSession } from "next-auth/react";
import { useToast } from "@/hooks/use-toast";
import { DIARY_THEMES } from "@/config/diaryThemes";

type Diary = {
    _id: string;
    title: string;
    description: string;
    theme: string;
    createdAt: string;
    updatedAt: string;
    entryCount: number;
    lastEntryAt: string | null;
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

const isRecord = (value: unknown): value is Record<string, unknown> =>
    typeof value === "object" && value !== null;

const isDiary = (value: unknown): value is Diary => {
    if (!isRecord(value)) return false;

    return (
        typeof value._id === "string" &&
        typeof value.title === "string" &&
        typeof value.description === "string" &&
        typeof value.theme === "string" &&
        typeof value.createdAt === "string" &&
        typeof value.updatedAt === "string" &&
        typeof value.entryCount === "number" &&
        (typeof value.lastEntryAt === "string" || value.lastEntryAt === null)
    );
};

const Diaries = ({
    refetchTrigger = 0,
    searchQuery = "",
    onCreateRequest,
}: {
    refetchTrigger?: number;
    searchQuery?: string;
    onCreateRequest?: () => void;
}) => {
    const { data: session, status } = useSession();
    const { toast } = useToast();
    const [diaries, setDiaries] = useState<Diary[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [deletingDiaryId, setDeletingDiaryId] = useState<string | null>(null);
    const [updatingDiaryId, setUpdatingDiaryId] = useState<string | null>(null);
    const [editingDiary, setEditingDiary] = useState<Diary | null>(null);
    const [editForm, setEditForm] = useState({
        title: "",
        description: "",
        theme: DIARY_THEMES[0].textureUrl,
    });

    useEffect(() => {
        if (status === "loading") return;

        if (!session) {
            setIsLoading(false);
            return;
        }

        let isMounted = true;

        const fetchDiaries = async () => {
            setIsLoading(true);

            try {
                const response = await fetch("/api/diaries", {
                    method: "GET",
                    cache: "no-store",
                });

                if (!response.ok) {
                    throw new Error(`Failed to fetch diaries: ${response.status}`);
                }

                const data: unknown = await response.json();

                if (!isMounted) return;
                setDiaries(Array.isArray(data) ? data.filter(isDiary) : []);
            } catch {
                if (!isMounted) return;
                setDiaries([]);
            } finally {
                if (isMounted) {
                    setIsLoading(false);
                }
            }
        };

        fetchDiaries();

        return () => {
            isMounted = false;
        };
    }, [session, status, refetchTrigger]);

    const normalizedQuery = searchQuery.trim().toLowerCase();
    const filteredDiaries = useMemo(() => {
        if (!normalizedQuery) return diaries;

        return diaries.filter((diary) =>
            `${diary.title} ${diary.description}`.toLowerCase().includes(normalizedQuery)
        );
    }, [diaries, normalizedQuery]);

    const handleDeleteDiary = async (diaryId: string) => {
        const shouldDelete = window.confirm("Delete this diary and all of its entries?");
        if (!shouldDelete) return;

        setDeletingDiaryId(diaryId);

        try {
            const response = await fetch(`/api/diaries/${diaryId}`, { method: "DELETE" });
            const result = await response.json().catch(() => ({})) as { error?: string };

            if (!response.ok) {
                throw new Error(result.error || "Failed to delete diary.");
            }

            setDiaries((previous) => previous.filter((diary) => diary._id !== diaryId));
            toast({
                title: "Diary deleted",
                description: "The diary and its entries were removed.",
            });
        } catch (error) {
            toast({
                title: "Unable to delete diary",
                description: error instanceof Error ? error.message : "Please try again.",
                variant: "destructive",
            });
        } finally {
            setDeletingDiaryId(null);
        }
    };

    const openEditDialog = (diary: Diary) => {
        setEditingDiary(diary);
        setEditForm({
            title: diary.title,
            description: diary.description,
            theme: diary.theme,
        });
    };

    const handleEditDiary = async () => {
        if (!editingDiary) return;

        const trimmedTitle = editForm.title.trim();
        const trimmedDescription = editForm.description.trim();

        if (trimmedTitle.length < 3) {
            toast({
                title: "Invalid title",
                description: "Diary title must be at least 3 characters.",
                variant: "destructive",
            });
            return;
        }

        setUpdatingDiaryId(editingDiary._id);

        try {
            const response = await fetch(`/api/diaries/${editingDiary._id}`, {
                method: "PUT",
                headers: {
                    "Content-Type": "application/json",
                },
                body: JSON.stringify({
                    title: trimmedTitle,
                    description: trimmedDescription,
                    theme: editForm.theme,
                }),
            });

            const result = await response.json().catch(() => null) as Diary | { error?: string } | null;

            if (!response.ok || !isDiary(result)) {
                const errorMessage =
                    isRecord(result) && "error" in result && typeof result.error === "string"
                    ? result.error
                    : "Failed to update diary.";
                throw new Error(errorMessage);
            }

            setDiaries((previous) => previous.map((diary) => {
                if (diary._id !== editingDiary._id) return diary;
                return {
                    ...diary,
                    title: result.title,
                    description: result.description,
                    theme: result.theme,
                    updatedAt: result.updatedAt,
                };
            }));

            setEditingDiary(null);
            toast({
                title: "Diary updated",
                description: "Diary details were saved.",
            });
        } catch (error) {
            toast({
                title: "Unable to update diary",
                description: error instanceof Error ? error.message : "Please try again.",
                variant: "destructive",
            });
        } finally {
            setUpdatingDiaryId(null);
        }
    };

    if (isLoading) {
        return (
            <>
                {Array.from({ length: SKELETON_COUNT }).map((_, index) => (
                    <div
                        key={`diary-skeleton-${index}`}
                        className="min-h-40 w-full max-w-sm animate-pulse rounded-xl bg-zinc-700/30"
                    />
                ))}
            </>
        );
    }

    if (!diaries.length) {
        return (
            <div className="flex min-h-40 w-full max-w-sm flex-col items-center justify-center rounded-xl border border-dashed border-white/20 bg-zinc-900/35 p-6 text-center">
                <h2 className="text-lg font-medium text-white">No diaries yet</h2>
                <p className="mt-2 text-sm leading-6 text-zinc-300">
                    Create your first diary to start journaling.
                </p>
                <button
                    type="button"
                    onClick={onCreateRequest}
                    className="mt-4 rounded-md border border-zinc-500 px-4 py-2 text-sm text-zinc-100 hover:bg-zinc-800"
                >
                    Create diary
                </button>
            </div>
        );
    }

    if (!filteredDiaries.length) {
        return (
            <div className="flex min-h-40 w-full max-w-sm items-center justify-center rounded-xl border border-white/10 bg-zinc-900/35 p-6 text-center text-sm text-zinc-300">
                No diaries match "{searchQuery.trim()}".
            </div>
        );
    }

    return (
        <>
            {filteredDiaries.map((diary) => (
                <article
                    key={diary._id}
                    className="group relative flex min-h-40 w-full max-w-sm flex-col justify-between rounded-xl border border-white/10 bg-zinc-600/10 p-5 text-white/80 shadow-lg transition-colors hover:border-white/30"
                >
                    <div
                        className="absolute inset-x-0 top-0 h-1 rounded-t-xl opacity-70"
                        style={{ backgroundImage: `url(${diary.theme})`, backgroundSize: "cover" }}
                    />
                    <div className="mb-5 space-y-2 overflow-hidden pr-20">
                        <h2 className="text-lg font-medium text-white">{diary.title}</h2>
                        <p className="text-sm leading-6 text-zinc-300">
                            {truncateDescription(diary.description || "No description")}
                        </p>
                    </div>
                    <div className="mt-auto flex items-end justify-between gap-4">
                        <div className="space-y-1 text-xs tracking-wide text-zinc-400">
                            <p>
                                {diary.entryCount} {diary.entryCount === 1 ? "entry" : "entries"}
                            </p>
                            <p>
                                Last written:{" "}
                                {diary.lastEntryAt ? formatDiaryDate(diary.lastEntryAt) : "Not yet"}
                            </p>
                        </div>
                        <Link
                            href={`/diary/${diary._id}`}
                            className="rounded border border-zinc-500 px-3 py-1.5 text-xs text-zinc-100 hover:bg-zinc-800"
                        >
                            Open
                        </Link>
                    </div>
                    <div className="absolute right-4 top-3 flex gap-2 opacity-0 transition-opacity group-hover:opacity-100">
                        <button
                            type="button"
                            onClick={() => openEditDialog(diary)}
                            className="rounded border border-zinc-500 px-2 py-1 text-[11px] text-zinc-100 hover:bg-zinc-800"
                        >
                            Edit
                        </button>
                        <button
                            type="button"
                            onClick={() => handleDeleteDiary(diary._id)}
                            disabled={deletingDiaryId === diary._id}
                            className="rounded border border-red-500 px-2 py-1 text-[11px] text-red-200 hover:bg-red-950/50 disabled:opacity-60"
                        >
                            {deletingDiaryId === diary._id ? "Deleting..." : "Delete"}
                        </button>
                    </div>
                </article>
            ))}

            {editingDiary && (
                <div className="fixed inset-0 z-[70] flex items-center justify-center bg-black/55 px-4">
                    <div className="w-full max-w-lg rounded-xl border border-zinc-700 bg-zinc-900 p-6 text-white shadow-xl">
                        <h3 className="text-lg font-semibold">Edit diary</h3>
                        <div className="mt-5 space-y-4">
                            <div className="space-y-2">
                                <label className="text-sm text-zinc-300" htmlFor="edit-diary-title">
                                    Title
                                </label>
                                <input
                                    id="edit-diary-title"
                                    type="text"
                                    value={editForm.title}
                                    onChange={(event) =>
                                        setEditForm((previous) => ({ ...previous, title: event.target.value }))
                                    }
                                    className="w-full rounded-md border border-zinc-600 bg-zinc-800 px-3 py-2 text-sm outline-none focus:border-zinc-300"
                                />
                            </div>
                            <div className="space-y-2">
                                <label className="text-sm text-zinc-300" htmlFor="edit-diary-description">
                                    Description
                                </label>
                                <textarea
                                    id="edit-diary-description"
                                    value={editForm.description}
                                    onChange={(event) =>
                                        setEditForm((previous) => ({ ...previous, description: event.target.value }))
                                    }
                                    rows={4}
                                    className="w-full rounded-md border border-zinc-600 bg-zinc-800 px-3 py-2 text-sm outline-none focus:border-zinc-300"
                                />
                            </div>
                            <div className="space-y-2">
                                <label className="text-sm text-zinc-300" htmlFor="edit-diary-theme">
                                    Theme
                                </label>
                                <select
                                    id="edit-diary-theme"
                                    value={editForm.theme}
                                    onChange={(event) =>
                                        setEditForm((previous) => ({ ...previous, theme: event.target.value }))
                                    }
                                    className="w-full rounded-md border border-zinc-600 bg-zinc-800 px-3 py-2 text-sm outline-none focus:border-zinc-300"
                                >
                                    {DIARY_THEMES.map((theme) => (
                                        <option key={theme.textureUrl} value={theme.textureUrl}>
                                            {theme.name}
                                        </option>
                                    ))}
                                </select>
                            </div>
                        </div>
                        <div className="mt-6 flex justify-end gap-3">
                            <button
                                type="button"
                                onClick={() => setEditingDiary(null)}
                                className="rounded border border-zinc-600 px-4 py-2 text-sm hover:bg-zinc-800"
                            >
                                Cancel
                            </button>
                            <button
                                type="button"
                                onClick={handleEditDiary}
                                disabled={updatingDiaryId === editingDiary._id}
                                className="rounded border border-zinc-100 px-4 py-2 text-sm text-zinc-900 bg-zinc-100 hover:bg-white disabled:opacity-60"
                            >
                                {updatingDiaryId === editingDiary._id ? "Saving..." : "Save changes"}
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </>
    );
};

export default Diaries;
