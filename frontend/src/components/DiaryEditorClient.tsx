"use client";

import { type ChangeEvent, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";

import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Toaster } from "@/components/ui/toaster";
import { useToast } from "@/hooks/use-toast";

type Diary = {
    _id: string;
    title: string;
    description: string;
    theme: string;
    createdAt: string;
    updatedAt: string;
};

type Entry = {
    _id: string;
    diaryId: string;
    userId: string;
    content: string;
    createdAt: string;
    updatedAt: string;
};

type DiaryResponse = {
    diary: Diary;
    entries: Entry[];
};

const contentPreview = (content: string, maxLength = 85) => {
    if (content.length <= maxLength) return content;
    return `${content.slice(0, maxLength).trimEnd()}...`;
};

const formattedDate = (value: string) => {
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return "Unknown date";

    return new Intl.DateTimeFormat("en-US", {
        day: "numeric",
        month: "short",
        year: "numeric",
    }).format(date);
};

const DiaryEditorClient = ({ diaryId }: { diaryId: string }) => {
    const router = useRouter();
    const { toast } = useToast();
    const [diary, setDiary] = useState<Diary | null>(null);
    const [entries, setEntries] = useState<Entry[]>([]);
    const [newEntryContent, setNewEntryContent] = useState("");
    const [selectedEntryId, setSelectedEntryId] = useState<string | null>(null);
    const [isLoading, setIsLoading] = useState(true);
    const [isSaving, setIsSaving] = useState(false);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        let isMounted = true;

        const fetchDiary = async () => {
            setIsLoading(true);
            setError(null);

            try {
                const response = await fetch(`/api/diaries/${diaryId}`, {
                    method: "GET",
                    cache: "no-store",
                });
                const data = await response.json().catch(() => null) as Partial<DiaryResponse> & { error?: string } | null;

                if (!response.ok) {
                    throw new Error(data?.error || "Failed to load diary.");
                }

                if (!isMounted) return;

                if (!data?.diary || !Array.isArray(data.entries)) {
                    throw new Error("Unexpected diary response.");
                }

                setDiary(data.diary);
                setEntries(data.entries);
            } catch (fetchError) {
                if (!isMounted) return;
                setError(fetchError instanceof Error ? fetchError.message : "Failed to load diary.");
            } finally {
                if (isMounted) {
                    setIsLoading(false);
                }
            }
        };

        fetchDiary();

        return () => {
            isMounted = false;
        };
    }, [diaryId]);

    const canSave = useMemo(() => newEntryContent.trim().length > 0, [newEntryContent]);
    const wordCount = useMemo(() => {
        const trimmed = newEntryContent.trim();
        if (!trimmed) return 0;
        return trimmed.split(/\s+/).length;
    }, [newEntryContent]);

    const handleEntrySelect = (entry: Entry) => {
        setSelectedEntryId(entry._id);
        setNewEntryContent(entry.content);
    };

    const handleContentChange = (event: ChangeEvent<HTMLTextAreaElement>) => {
        setNewEntryContent(event.target.value);
    };

    const handleSaveEntry = async () => {
        if (!canSave || isSaving) return;

        setIsSaving(true);

        try {
            const response = await fetch(`/api/diaries/${diaryId}/entries`, {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                },
                body: JSON.stringify({
                    content: newEntryContent,
                    createdAt: new Date().toISOString(),
                }),
            });

            const data = await response.json().catch(() => null) as Entry & { error?: string } | null;

            if (!response.ok) {
                throw new Error(data?.error || "Failed to save entry.");
            }

            if (!data || !data._id) {
                throw new Error("Unexpected entry response.");
            }

            setEntries((prev) => [data, ...prev]);
            setNewEntryContent("");
            setSelectedEntryId(null);
        } catch (saveError) {
            toast({
                title: "Unable to save entry",
                description: saveError instanceof Error ? saveError.message : "Something went wrong.",
                variant: "destructive",
            });
        } finally {
            setIsSaving(false);
        }
    };

    if (isLoading) {
        return (
            <>
                <div className="relative z-10 flex min-h-screen w-full items-center justify-center bg-black/60 text-white backdrop-blur-xl">
                    Loading diary...
                </div>
                <Toaster />
            </>
        );
    }

    if (error) {
        return (
            <>
                <div className="relative z-10 flex min-h-screen w-full flex-col items-center justify-center gap-4 bg-black/60 px-6 text-white backdrop-blur-xl">
                    <p>{error}</p>
                    <Button onClick={() => router.push("/diary")} className="bg-zinc-700 hover:bg-zinc-600">
                        Back
                    </Button>
                </div>
                <Toaster />
            </>
        );
    }

    return (
        <>
            <div className="relative z-10 min-h-screen w-full text-white">
                <header className="sticky top-0 z-20 w-full border-b border-white/10 bg-black/70 backdrop-blur-xl">
                    <div className="flex w-full items-start gap-4 px-6 py-4">
                        <Button asChild className="border border-white/20 bg-white/5 hover:bg-white/10">
                            <Link href="/diary">← Back</Link>
                        </Button>
                        <div className="min-w-0">
                            <h1 className="truncate text-2xl font-semibold tracking-tight">
                                {diary?.title || "Diary"}
                            </h1>
                            <p className="text-sm text-zinc-400">{diary?.description || "No description"}</p>
                        </div>
                    </div>
                </header>

                <div className="w-full bg-black/60 backdrop-blur-xl">
                    <div className="flex w-full">
                        <aside className="box-border flex h-[calc(100vh-73px)] w-[35%] flex-col gap-4 overflow-y-auto overflow-x-hidden border-r border-white/10 px-6 py-6">
                            <h2 className="text-xs font-semibold uppercase tracking-[0.35em] text-zinc-300">
                                Past Entries
                            </h2>

                            {!entries.length ? (
                                <div className="flex flex-1 items-center justify-center text-center text-sm text-zinc-400">
                                    No entries yet. Start writing.
                                </div>
                            ) : (
                                <div className="space-y-4">
                                    {entries.map((entry) => {
                                        const isSelected = selectedEntryId === entry._id;

                                        return (
                                            <button
                                                key={entry._id}
                                                type="button"
                                                onClick={() => handleEntrySelect(entry)}
                                                className={`w-full rounded-xl border px-4 py-3 text-left transition ${
                                                    isSelected
                                                        ? "border-white/30 bg-white/10"
                                                        : "border-white/10 bg-white/5 hover:border-white/20 hover:bg-white/10"
                                                }`}
                                            >
                                                <p className="text-xs text-zinc-400">{formattedDate(entry.createdAt)}</p>
                                                <p
                                                    className="mt-2 text-sm text-zinc-200 line-clamp-2 break-words"
                                                    style={{
                                                        display: "-webkit-box",
                                                        WebkitLineClamp: 2,
                                                        WebkitBoxOrient: "vertical",
                                                        overflow: "hidden",
                                                    }}
                                                >
                                                    {contentPreview(entry.content)}
                                                </p>
                                            </button>
                                        );
                                    })}
                                </div>
                            )}
                        </aside>

                        <section className="box-border flex h-[calc(100vh-73px)] w-[65%] flex-col overflow-y-auto px-6 py-6">
                            <div className="flex items-center justify-between">
                                <h2 className="text-xs font-semibold uppercase tracking-[0.35em] text-zinc-300">
                                    Editor
                                </h2>
                            </div>

                            <div className="mt-4 flex flex-1">
                                <Textarea
                                    value={newEntryContent}
                                    onChange={handleContentChange}
                                    placeholder="Write your thoughts..."
                                    className="h-full min-h-[70vh] w-full resize-none bg-transparent p-6 text-base leading-relaxed text-white/90 placeholder:text-zinc-500 focus:outline-none break-words whitespace-pre-wrap"
                                />
                            </div>

                            <div className="mt-4 flex items-center justify-between">
                                <p className="text-xs text-zinc-400">
                                    {wordCount} {wordCount === 1 ? "word" : "words"}
                                </p>
                                <Button
                                    onClick={handleSaveEntry}
                                    disabled={!canSave || isSaving}
                                    className="inline-flex items-center gap-2 rounded-lg border border-zinc-600 bg-zinc-700 px-6 py-2 tracking-wide hover:bg-zinc-600 disabled:cursor-not-allowed disabled:opacity-60"
                                >
                                    {isSaving && (
                                        <span className="h-4 w-4 animate-spin rounded-full border-2 border-white/60 border-t-transparent" />
                                    )}
                                    <span>{isSaving ? "Saving..." : "Save Entry"}</span>
                                </Button>
                            </div>
                        </section>
                    </div>
                </div>
            </div>
            <Toaster />
        </>
    );
};

export default DiaryEditorClient;
