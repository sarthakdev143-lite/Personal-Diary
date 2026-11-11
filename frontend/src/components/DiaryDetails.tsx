"use client";

import { FormEvent, useState } from "react";
import { useRouter } from "next/navigation";

import { useVault } from "@/context/VaultContext";
import { useToast } from "@/hooks/use-toast";
import { diaryToMarkdown, markdownFilename } from "@/lib/export-markdown";
import { THEMES } from "@/lib/plans";

type Diary = {
    _id: string;
    title: string;
    description: string;
    theme: string;
    pinned: boolean;
    createdAt: string;
    updatedAt: string;
};

type Entry = { content: string; createdAt: string };

export default function DiaryDetails({
    diary,
    entries,
    onUpdated,
}: {
    diary: Diary;
    entries: Entry[];
    onUpdated: (diary: Diary) => void;
}) {
    const router = useRouter();
    const { toast } = useToast();
    const { seal, account, refresh, lock } = useVault();
    const [open, setOpen] = useState(false);
    const [title, setTitle] = useState(diary.title);
    const [description, setDescription] = useState(diary.description);
    const [theme, setTheme] = useState(diary.theme);
    const [pinned, setPinned] = useState(diary.pinned);
    const [pending, setPending] = useState(false);
    const [confirmDelete, setConfirmDelete] = useState(false);
    const plan = account?.plan ?? "free";

    function download() {
        const file = diaryToMarkdown(
            { title: diary.title, description: diary.description },
            entries.map((entry) => ({
                heading: formatHeading(entry.createdAt),
                content: entry.content,
            }))
        );
        const blob = new Blob([file], { type: "text/markdown;charset=utf-8" });
        const url = URL.createObjectURL(blob);
        const anchor = document.createElement("a");
        anchor.href = url;
        anchor.download = markdownFilename(diary.title);
        anchor.click();
        URL.revokeObjectURL(url);
    }

    async function save(event: FormEvent) {
        event.preventDefault();
        const nextTitle = title.trim();
        if (nextTitle.length < 3) {
            toast({ title: "Title is too short", description: "Use at least 3 characters.", variant: "destructive" });
            return;
        }
        if (nextTitle.length > 80 || description.trim().length > 280) {
            toast({ title: "Too long", description: "Keep the title under 80 characters and the description under 280.", variant: "destructive" });
            return;
        }
        setPending(true);
        try {
            const response = await fetch(`/api/diaries/${diary._id}`, {
                method: "PUT",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    title: await seal(nextTitle),
                    description: await seal(description.trim()),
                    theme,
                    pinned,
                }),
            });
            const data = await response.json() as { error?: string };
            if (!response.ok) throw new Error(data.error || "Could not update the diary.");
            onUpdated({ ...diary, title: nextTitle, description: description.trim(), theme, pinned });
            await refresh();
            setOpen(false);
        } catch (caught) {
            toast({
                title: "Not saved",
                description: caught instanceof Error ? caught.message : "Could not update the diary.",
                variant: "destructive",
            });
        } finally {
            setPending(false);
        }
    }

    async function remove() {
        if (!confirmDelete) {
            setConfirmDelete(true);
            return;
        }
        setPending(true);
        try {
            const response = await fetch(`/api/diaries/${diary._id}`, { method: "DELETE" });
            const data = await response.json().catch(() => null) as { error?: string } | null;
            if (!response.ok) throw new Error(data?.error || "Could not delete the diary.");
            await refresh();
            router.push("/diary");
        } catch (caught) {
            toast({
                title: "Not deleted",
                description: caught instanceof Error ? caught.message : "Could not delete the diary.",
                variant: "destructive",
            });
            setPending(false);
        }
    }

    return (
        <>
            <button type="button" className="de-ghost-btn" onClick={download}>Export</button>
            <button type="button" className="de-ghost-btn" onClick={() => { setTitle(diary.title); setDescription(diary.description); setTheme(diary.theme); setPinned(diary.pinned); setConfirmDelete(false); setOpen(true); }}>Details</button>
            <button type="button" className="de-ghost-btn" onClick={lock}>Lock</button>
            {open && (
                <div className="fixed inset-0 z-30 flex items-center justify-center bg-black/70 p-4">
                    <form onSubmit={save} className="w-full max-w-md rounded-xl border border-[#2a2520] bg-[#0f0d0b] p-5 text-[#d8d0c4]">
                        <h2 className="text-lg text-[#ede5d8]">Diary details</h2>
                        <label className="mt-4 block text-xs uppercase tracking-[0.14em] text-[#8f8679]" htmlFor="diary-title">Title</label>
                        <input id="diary-title" value={title} onChange={(event) => setTitle(event.target.value)} className="mt-2 w-full rounded border border-[#2a2520] bg-[#161410] px-3 py-2 text-sm" />
                        <label className="mt-4 block text-xs uppercase tracking-[0.14em] text-[#8f8679]" htmlFor="diary-description">Description</label>
                        <textarea id="diary-description" value={description} onChange={(event) => setDescription(event.target.value)} rows={3} className="mt-2 w-full rounded border border-[#2a2520] bg-[#161410] px-3 py-2 text-sm" />
                        <label className="mt-4 block text-xs uppercase tracking-[0.14em] text-[#8f8679]" htmlFor="diary-theme">Cover</label>
                        <select id="diary-theme" value={theme} onChange={(event) => setTheme(event.target.value)} className="mt-2 w-full rounded border border-[#2a2520] bg-[#161410] px-3 py-2 text-sm">
                            {THEMES.map((item) => (
                                <option key={item.url} value={item.url} disabled={item.pro && plan !== "pro"}>
                                    {item.name}{item.pro && plan !== "pro" ? " (Pro)" : ""}
                                </option>
                            ))}
                        </select>
                        <label className="mt-4 flex items-center gap-2 text-sm">
                            <input
                                type="checkbox"
                                checked={pinned}
                                disabled={plan !== "pro" && !pinned}
                                onChange={(event) => setPinned(event.target.checked)}
                            />
                            Pin this diary{plan !== "pro" ? " (Pro)" : ""}
                        </label>
                        <div className="mt-5 flex flex-wrap gap-2">
                            <button type="submit" disabled={pending} className="de-save-btn">{pending ? "Saving" : "Save"}</button>
                            <button type="button" className="de-ghost-btn" onClick={() => setOpen(false)}>Close</button>
                            <button type="button" className="de-ghost-btn" onClick={remove} disabled={pending}>
                                {confirmDelete ? "Confirm delete" : "Delete diary"}
                            </button>
                        </div>
                    </form>
                </div>
            )}
        </>
    );
}

function formatHeading(value: string): string {
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return value;
    return new Intl.DateTimeFormat("en-US", { weekday: "long", day: "numeric", month: "long", year: "numeric" }).format(date);
}
