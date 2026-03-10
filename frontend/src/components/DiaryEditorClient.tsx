"use client";

import { useEffect, useMemo, useState } from "react";
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
                <div className="relative z-10 mx-auto flex min-h-screen w-full max-w-6xl items-center justify-center px-4 pt-24 text-white">
                    Loading diary...
                </div>
                <Toaster />
            </>
        );
    }

    if (error) {
        return (
            <>
                <div className="relative z-10 mx-auto flex min-h-screen w-full max-w-6xl flex-col items-center justify-center gap-4 px-4 pt-24 text-white">
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
            <div className="relative z-10 mx-auto flex min-h-screen w-full max-w-6xl flex-col gap-6 px-4 pb-10 pt-24 text-white">
                <div className="flex items-center justify-between gap-4">
                    <div>
                        <h1 className="text-2xl font-semibold">{diary?.title || "Diary"}</h1>
                        <p className="text-sm text-zinc-300">{diary?.description || "No description"}</p>
                    </div>
                    <Button onClick={() => router.push("/diary")} className="bg-zinc-700 hover:bg-zinc-600">
                        Back
                    </Button>
                </div>

                <div className="grid flex-1 gap-4 rounded-2xl border border-white/10 bg-zinc-900/50 p-4 md:grid-cols-[340px_1fr]">
                    <aside className="space-y-3 overflow-y-auto border-b border-white/10 pb-4 md:border-b-0 md:border-r md:pb-0 md:pr-4">
                        <h2 className="text-lg font-medium">Past entries</h2>
                        {!entries.length && <p className="text-sm text-zinc-400">No entries yet.</p>}
                        {entries.map((entry) => (
                            <article key={entry._id} className="rounded-lg border border-white/10 bg-zinc-800/40 p-3">
                                <p className="text-xs text-zinc-400">{formattedDate(entry.createdAt)}</p>
                                <p className="mt-2 text-sm text-zinc-200">{contentPreview(entry.content)}</p>
                            </article>
                        ))}
                    </aside>

                    <section className="flex flex-col gap-3">
                        <h2 className="text-lg font-medium">Write a new entry</h2>
                        <Textarea
                            value={newEntryContent}
                            onChange={(event) => setNewEntryContent(event.target.value)}
                            placeholder="Write your thoughts..."
                            className="min-h-64 border-white/15 bg-zinc-800/40 text-white placeholder:text-zinc-500"
                        />
                        <div>
                            <Button
                                onClick={handleSaveEntry}
                                disabled={!canSave || isSaving}
                                className="bg-zinc-700 hover:bg-zinc-600 disabled:cursor-not-allowed disabled:opacity-60"
                            >
                                {isSaving ? "Saving..." : "Save Entry"}
                            </Button>
                        </div>
                    </section>
                </div>
            </div>
            <Toaster />
        </>
    );
};

export default DiaryEditorClient;
