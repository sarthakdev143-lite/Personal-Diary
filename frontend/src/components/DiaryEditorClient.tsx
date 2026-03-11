"use client";

import {
    RiAlignCenter,
    RiAlignLeft,
    RiAlignRight,
    RiArrowGoBackLine,
    RiArrowGoForwardLine,
    RiBold,
    RiCodeBoxLine,
    RiDeleteBinLine,
    RiEdit2Line,
    RiImageLine,
    RiItalic,
    RiLinkM,
    RiListOrdered,
    RiListUnordered,
    RiMarkPenLine,
    RiSeparator,
    RiStrikethrough,
    RiUnderline,
} from "@remixicon/react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { flushSync } from "react-dom";
import { ReactNode, useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from "react";

import { Toaster } from "@/components/ui/toaster";
import { useToast } from "@/hooks/use-toast";

type Diary = { _id: string; title: string; description: string; theme: string; createdAt: string; updatedAt: string };
type Entry = { _id: string; diaryId: string; userId: string; content: string; createdAt: string; updatedAt: string };
type DiaryResponse = { diary: Diary; entries: Entry[] };
type ToolBtn = { icon: ReactNode; title: string; action: () => void; active?: boolean };

const ENTRY_BATCH_SIZE = 30;

const fmtShort = (value: string) => {
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return "-";
    return new Intl.DateTimeFormat("en-US", { day: "numeric", month: "short", year: "numeric" }).format(date);
};

const fmtTime = (value: string) => {
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return "";
    return new Intl.DateTimeFormat("en-US", { hour: "2-digit", minute: "2-digit" }).format(date);
};

const fmtLong = (value: string) => {
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return "-";
    return new Intl.DateTimeFormat("en-US", { weekday: "long", day: "numeric", month: "long", year: "numeric" }).format(date);
};

const stripHtml = (html: string) =>
    html
        .replace(/<style[^>]*>[\s\S]*?<\/style>/gi, " ")
        .replace(/<script[^>]*>[\s\S]*?<\/script>/gi, " ")
        .replace(/<[^>]*>/g, " ")
        .replace(/&nbsp;/g, " ")
        .replace(/\s+/g, " ")
        .trim();

const sanitizePreviewHtml = (html: string) =>
    html
        .replace(/<style[^>]*>[\s\S]*?<\/style>/gi, "")
        .replace(/<script[^>]*>[\s\S]*?<\/script>/gi, "")
        .replace(/<img[^>]*>/gi, "<em>[image]</em>")
        .replace(/<\/?([a-z0-9]+)(?:\s[^>]*)?>/gi, (match, tag: string) => {
            const allowed = new Set(["p", "strong", "em", "u", "s", "blockquote", "br", "ul", "ol", "li", "h1", "h2", "h3"]);
            const lower = tag.toLowerCase();
            if (!allowed.has(lower)) return "";
            if (match.startsWith("</")) return `</${lower}>`;
            return lower === "br" ? "<br/>" : `<${lower}>`;
        })
        .slice(0, 260);

const isRecord = (value: unknown): value is Record<string, unknown> => typeof value === "object" && value !== null;
const isDiary = (value: unknown): value is Diary => isRecord(value) && typeof value._id === "string" && typeof value.title === "string" && typeof value.description === "string" && typeof value.theme === "string" && typeof value.createdAt === "string" && typeof value.updatedAt === "string";
const isEntry = (value: unknown): value is Entry => isRecord(value) && typeof value._id === "string" && typeof value.diaryId === "string" && typeof value.userId === "string" && typeof value.content === "string" && typeof value.createdAt === "string" && typeof value.updatedAt === "string";
const isDiaryResponse = (value: unknown): value is DiaryResponse => isRecord(value) && isDiary(value.diary) && Array.isArray(value.entries) && value.entries.every(isEntry);
const readError = (value: unknown, fallback: string) => (isRecord(value) && typeof value.error === "string" ? value.error : fallback);
const hasRichContent = (html: string) => /<(img|table|hr|blockquote|pre|ul|ol|h[1-6])\b/i.test(html);
const todayHeader = () => `<h2>${fmtLong(new Date().toISOString())}</h2><p><br></p>`;

const DiaryEditorClient = ({ diaryId }: { diaryId: string }) => {
    const router = useRouter();
    const { toast } = useToast();
    const editorRef = useRef<HTMLDivElement>(null);
    const fileInputRef = useRef<HTMLInputElement>(null);

    const [diary, setDiary] = useState<Diary | null>(null);
    const [entries, setEntries] = useState<Entry[]>([]);
    const [htmlContent, setHtmlContent] = useState("");
    const [selectedEntryId, setSelectedEntryId] = useState<string | null>(null);
    const [isEditingExisting, setIsEditingExisting] = useState(false);
    const [isLoading, setIsLoading] = useState(true);
    const [isSaving, setIsSaving] = useState(false);
    const [isUploading, setIsUploading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [activeFormats, setActiveFormats] = useState<Set<string>>(new Set());
    const [editorKey, setEditorKey] = useState(0);
    const [isDirty, setIsDirty] = useState(false);
    const [hasStartedNewEntry, setHasStartedNewEntry] = useState(false);
    const [linkPopoverOpen, setLinkPopoverOpen] = useState(false);
    const [linkUrl, setLinkUrl] = useState("");
    const [entrySearch, setEntrySearch] = useState("");
    const [visibleEntriesCount, setVisibleEntriesCount] = useState(ENTRY_BATCH_SIZE);

    const selectedEntry = useMemo(() => entries.find((entry) => entry._id === selectedEntryId) ?? null, [entries, selectedEntryId]);
    const draftKey = `rojnishi:draft:${diaryId}`;
    const isViewingOld = Boolean(selectedEntryId) && !isEditingExisting;
    const plainText = useMemo(() => stripHtml(htmlContent), [htmlContent]);
    const words = useMemo(() => (plainText ? plainText.split(/\s+/).filter(Boolean).length : 0), [plainText]);
    const chars = plainText.length;
    const canSaveContent = chars > 0 || hasRichContent(htmlContent);
    const showPlaceholder = !hasStartedNewEntry && chars === 0 && !hasRichContent(htmlContent);

    const filteredEntries = useMemo(() => {
        const query = entrySearch.trim().toLowerCase();
        if (!query) return entries;
        return entries.filter((entry) => `${stripHtml(entry.content)} ${fmtLong(entry.createdAt)}`.toLowerCase().includes(query));
    }, [entries, entrySearch]);
    const visibleEntries = useMemo(() => filteredEntries.slice(0, visibleEntriesCount), [filteredEntries, visibleEntriesCount]);

    const replaceEditorContent = useCallback((nextHtml: string) => {
        setHtmlContent(nextHtml);
        setEditorKey((current) => current + 1);
    }, []);

    const focusEditorAtEnd = useCallback(() => {
        const editor = editorRef.current;
        if (!editor) return;
        editor.focus();
        const range = document.createRange();
        range.selectNodeContents(editor);
        range.collapse(false);
        const selection = window.getSelection();
        selection?.removeAllRanges();
        selection?.addRange(range);
    }, []);

    const confirmDiscard = useCallback(() => (!isDirty ? true : window.confirm("You have unsaved changes. Discard them?")), [isDirty]);

    useEffect(() => {
        let mounted = true;
        (async () => {
            try {
                const response = await fetch(`/api/diaries/${diaryId}`, { cache: "no-store" });
                const data: unknown = await response.json().catch(() => null);
                if (!response.ok) throw new Error(readError(data, "Failed to load diary."));
                if (!isDiaryResponse(data)) throw new Error("Unexpected diary response format.");
                if (!mounted) return;
                setDiary(data.diary);
                setEntries(data.entries);
                const draft = window.localStorage.getItem(draftKey);
                if (draft) {
                    replaceEditorContent(draft);
                    setHasStartedNewEntry(true);
                    setIsDirty(true);
                    toast({ title: "Recovered local draft", description: "An unsaved draft was restored." });
                }
            } catch (caughtError) {
                if (mounted) setError(caughtError instanceof Error ? caughtError.message : "Failed to load diary.");
            } finally {
                if (mounted) setIsLoading(false);
            }
        })();
        return () => {
            mounted = false;
        };
    }, [diaryId, draftKey, replaceEditorContent, toast]);

    useLayoutEffect(() => {
        if (editorRef.current) editorRef.current.innerHTML = htmlContent;
    }, [editorKey, htmlContent]);

    useEffect(() => {
        setVisibleEntriesCount(ENTRY_BATCH_SIZE);
    }, [entrySearch]);

    useEffect(() => {
        if (isViewingOld) return;
        if (!htmlContent.trim()) {
            window.localStorage.removeItem(draftKey);
            return;
        }
        const timeoutId = window.setTimeout(() => window.localStorage.setItem(draftKey, htmlContent), 450);
        return () => window.clearTimeout(timeoutId);
    }, [draftKey, htmlContent, isViewingOld]);

    useEffect(() => {
        if (!isDirty) return;
        const beforeUnload = (event: BeforeUnloadEvent) => {
            event.preventDefault();
            event.returnValue = "";
        };
        window.addEventListener("beforeunload", beforeUnload);
        return () => window.removeEventListener("beforeunload", beforeUnload);
    }, [isDirty]);

    const updateFormats = useCallback(() => {
        const selection = document.getSelection();
        if (!editorRef.current || !selection || selection.rangeCount === 0) return;
        const range = selection.getRangeAt(0);
        if (!editorRef.current.contains(range.commonAncestorContainer)) return;

        const nextFormats = new Set<string>();
        if (document.queryCommandState("bold")) nextFormats.add("bold");
        if (document.queryCommandState("italic")) nextFormats.add("italic");
        if (document.queryCommandState("underline")) nextFormats.add("underline");
        if (document.queryCommandState("strikeThrough")) nextFormats.add("strike");
        if (document.queryCommandState("insertUnorderedList")) nextFormats.add("ul");
        if (document.queryCommandState("insertOrderedList")) nextFormats.add("ol");
        if (document.queryCommandState("justifyLeft")) nextFormats.add("align-left");
        if (document.queryCommandState("justifyCenter")) nextFormats.add("align-center");
        if (document.queryCommandState("justifyRight")) nextFormats.add("align-right");
        setActiveFormats(nextFormats);
    }, []);

    useEffect(() => {
        const onSelection = () => updateFormats();
        document.addEventListener("selectionchange", onSelection);
        return () => document.removeEventListener("selectionchange", onSelection);
    }, [updateFormats]);

    const exec = useCallback((command: string, value?: string) => {
        editorRef.current?.focus();
        document.execCommand(command, false, value);
        if (editorRef.current) {
            setHtmlContent(editorRef.current.innerHTML);
            setIsDirty(true);
        }
        updateFormats();
    }, [updateFormats]);

    const insertHTML = useCallback((html: string) => {
        editorRef.current?.focus();
        document.execCommand("insertHTML", false, html);
        if (editorRef.current) {
            setHtmlContent(editorRef.current.innerHTML);
            setIsDirty(true);
        }
        updateFormats();
    }, [updateFormats]);

    const uploadImage = useCallback(async (file: File) => {
        const formData = new FormData();
        formData.append("file", file);
        setIsUploading(true);
        try {
            const response = await fetch("/api/uploads/image", { method: "POST", body: formData });
            const data: unknown = await response.json().catch(() => null);
            if (!response.ok || !isRecord(data) || typeof data.url !== "string" || !data.url.trim()) {
                throw new Error(readError(data, "Failed to upload image."));
            }
            insertHTML(`<img src="${data.url}" alt="Diary image" style="max-width:100%;border-radius:6px;margin:12px 0;" /><p><br></p>`);
        } catch (caughtError) {
            toast({ title: "Image upload failed", description: caughtError instanceof Error ? caughtError.message : "Unable to upload image.", variant: "destructive" });
        } finally {
            setIsUploading(false);
        }
    }, [insertHTML, toast]);

    const saveEntry = useCallback(async () => {
        if (isSaving || isViewingOld || !canSaveContent) return;
        setIsSaving(true);
        try {
            if (selectedEntryId && isEditingExisting && selectedEntry) {
                const response = await fetch(`/api/diaries/${diaryId}/entries/${selectedEntry._id}`, { method: "PUT", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ content: htmlContent, createdAt: selectedEntry.createdAt }) });
                const data: unknown = await response.json().catch(() => null);
                if (!response.ok || !isEntry(data)) throw new Error(readError(data, "Failed to update entry."));
                setEntries((current) => current.map((entry) => (entry._id === data._id ? data : entry)));
                replaceEditorContent(data.content);
                setIsEditingExisting(false);
                setIsDirty(false);
                window.localStorage.removeItem(draftKey);
                toast({ title: "Entry updated", description: `Updated ${fmtShort(data.updatedAt)}` });
            } else {
                const response = await fetch(`/api/diaries/${diaryId}/entries`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ content: htmlContent, createdAt: new Date().toISOString() }) });
                const data: unknown = await response.json().catch(() => null);
                if (!response.ok || !isEntry(data)) throw new Error(readError(data, "Failed to save entry."));
                setEntries((current) => [data, ...current]);
                setSelectedEntryId(null);
                setIsEditingExisting(false);
                replaceEditorContent("");
                setIsDirty(false);
                window.localStorage.removeItem(draftKey);
                toast({ title: "Entry saved", description: fmtLong(data.createdAt) });
            }
        } catch (caughtError) {
            toast({ title: "Save failed", description: caughtError instanceof Error ? caughtError.message : "Unable to save entry.", variant: "destructive" });
        } finally {
            setIsSaving(false);
        }
    }, [canSaveContent, diaryId, draftKey, htmlContent, isEditingExisting, isSaving, isViewingOld, replaceEditorContent, selectedEntry, selectedEntryId, toast]);

    const toolbarGroups: ToolBtn[][] = [
        [{ icon: "H1", title: "Heading 1", action: () => exec("formatBlock", "h1") }, { icon: "H2", title: "Heading 2", action: () => exec("formatBlock", "h2") }, { icon: "H3", title: "Heading 3", action: () => exec("formatBlock", "h3") }],
        [{ icon: <RiBold size={15} />, title: "Bold", action: () => exec("bold"), active: activeFormats.has("bold") }, { icon: <RiItalic size={15} />, title: "Italic", action: () => exec("italic"), active: activeFormats.has("italic") }, { icon: <RiUnderline size={15} />, title: "Underline", action: () => exec("underline"), active: activeFormats.has("underline") }, { icon: <RiStrikethrough size={15} />, title: "Strike", action: () => exec("strikeThrough"), active: activeFormats.has("strike") }, { icon: <RiMarkPenLine size={15} />, title: "Highlight", action: () => exec("hiliteColor", "#5f4a2a") }],
        [{ icon: <RiListUnordered size={15} />, title: "Bullets", action: () => exec("insertUnorderedList"), active: activeFormats.has("ul") }, { icon: <RiListOrdered size={15} />, title: "Numbered", action: () => exec("insertOrderedList"), active: activeFormats.has("ol") }, { icon: <RiSeparator size={15} />, title: "Divider", action: () => insertHTML("<hr/><p><br></p>") }, { icon: "Tbl", title: "Table", action: () => insertHTML('<table style="width:100%;border-collapse:collapse;margin:14px 0;"><tbody><tr><td style="border:1px solid #5b4a35;padding:8px;">Cell</td><td style="border:1px solid #5b4a35;padding:8px;">Cell</td></tr><tr><td style="border:1px solid #5b4a35;padding:8px;">Cell</td><td style="border:1px solid #5b4a35;padding:8px;">Cell</td></tr></tbody></table><p><br></p>') }],
        [{ icon: <RiAlignLeft size={15} />, title: "Align left", action: () => exec("justifyLeft") }, { icon: <RiAlignCenter size={15} />, title: "Align center", action: () => exec("justifyCenter") }, { icon: <RiAlignRight size={15} />, title: "Align right", action: () => exec("justifyRight") }, { icon: <RiImageLine size={15} />, title: "Image", action: () => fileInputRef.current?.click() }, { icon: <RiCodeBoxLine size={15} />, title: "Code", action: () => insertHTML('<pre><code>code here</code></pre><p><br></p>') }, { icon: <RiLinkM size={15} />, title: "Link", action: () => setLinkPopoverOpen((current) => !current), active: linkPopoverOpen }, { icon: <RiArrowGoBackLine size={15} />, title: "Undo", action: () => exec("undo") }, { icon: <RiArrowGoForwardLine size={15} />, title: "Redo", action: () => exec("redo") }],
    ];

    if (isLoading) return <div className="fixed inset-0 z-10 flex items-center justify-center bg-[#0d0b09]"><div className="h-8 w-8 animate-spin rounded-full border-2 border-[#4a4030] border-t-[#c4a882]" /><Toaster /></div>;
    if (error) return <div className="fixed inset-0 z-10 flex flex-col items-center justify-center gap-4 bg-[#0d0b09] px-4"><p className="text-sm text-[#a09080]">{error}</p><button onClick={() => router.push("/diary")} className="border-b border-[#5a4a38] text-[11px] uppercase tracking-[0.2em] text-[#8a7860]">return</button><Toaster /></div>;

    return (
        <>
            <div className="fixed inset-0 z-10 flex flex-col bg-[#0d0b09] text-[#d8d0c4]" onKeyDown={(event) => {
                if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === "s") { event.preventDefault(); saveEntry(); }
                if ((event.ctrlKey || event.metaKey) && event.shiftKey && event.key === "9" && !isViewingOld) { event.preventDefault(); exec("formatBlock", "blockquote"); }
            }}>
                <header className="flex items-center justify-between gap-3 border-b border-[#1e1c18] bg-[#0f0d0b] px-4 py-3 lg:px-6">
                    <div className="flex min-w-0 items-center gap-4"><Link href="/diary" className="font-mono text-[10px] uppercase tracking-[0.25em] text-[#9b9286] hover:text-[#e0d6c8]">back</Link><div className="h-4 w-px bg-[#252018]" /><div className="min-w-0"><h1 className="truncate text-[15px] text-[#ede5d8]">{diary?.title || "Untitled"}</h1>{diary?.description && <p className="truncate font-mono text-[10px] tracking-[0.04em] text-[#8f8679]">{diary.description}</p>}</div></div>
                    <div className="flex items-center gap-2"><span className="hidden font-mono text-[10px] tracking-[0.15em] text-[#8f8679] sm:inline">{entries.length} {entries.length === 1 ? "entry" : "entries"}</span>{selectedEntry && !isEditingExisting && <button type="button" className="rounded border border-[#3a362e] p-1.5 text-[#a79f93] hover:border-[#6a5a48] hover:text-[#e0d6c8]" onClick={() => { setIsEditingExisting(true); replaceEditorContent(selectedEntry.content); setIsDirty(false); requestAnimationFrame(focusEditorAtEnd); }} title="Edit entry"><RiEdit2Line size={13} /></button>}{selectedEntry && <button type="button" className="rounded border border-[#3a362e] p-1.5 text-[#a79f93] hover:border-[#6a5a48] hover:text-[#e0d6c8]" onClick={async () => { if (!window.confirm("Delete this entry permanently?")) return; try { const response = await fetch(`/api/diaries/${diaryId}/entries/${selectedEntry._id}`, { method: "DELETE" }); const data: unknown = await response.json().catch(() => null); if (!response.ok) throw new Error(readError(data, "Failed to delete entry.")); setEntries((current) => current.filter((entry) => entry._id !== selectedEntry._id)); setSelectedEntryId(null); setIsEditingExisting(false); replaceEditorContent(""); setIsDirty(false); window.localStorage.removeItem(draftKey); toast({ title: "Entry deleted", description: "The selected entry was removed." }); } catch (caughtError) { toast({ title: "Unable to delete entry", description: caughtError instanceof Error ? caughtError.message : "Please try again.", variant: "destructive" }); } }} title="Delete entry"><RiDeleteBinLine size={13} /></button>}<button type="button" onClick={() => { if (!confirmDiscard()) return; flushSync(() => { setSelectedEntryId(null); setIsEditingExisting(false); replaceEditorContent(todayHeader()); setHasStartedNewEntry(true); setIsDirty(false); }); requestAnimationFrame(focusEditorAtEnd); }} className="rounded border border-[#3a362e] px-3 py-1.5 font-mono text-[10px] uppercase tracking-[0.2em] text-[#a79f93] hover:border-[#6a5a48] hover:text-[#e0d6c8]">new</button></div>
                </header>

                {!isViewingOld && <div className="relative flex flex-wrap items-center gap-2 border-b border-[#1e1c18] bg-[#111009] px-4 py-2 lg:px-6">{toolbarGroups.map((group, groupIndex) => <div key={groupIndex} className="flex items-center gap-1">{groupIndex > 0 && <div className="mx-1 h-4 w-px bg-[#2a2520]" />}{group.map((button, buttonIndex) => <button key={`${groupIndex}-${buttonIndex}`} type="button" title={button.title} onClick={button.action} onMouseDown={(event) => event.preventDefault()} className={`inline-flex min-w-7 items-center justify-center rounded border px-2 py-1 font-mono text-[11px] transition ${button.active ? "border-[#3a3020] bg-[#2a2010] text-[#c4a882]" : "border-transparent bg-transparent text-[#a79f93] hover:border-[#2a2520] hover:bg-[#1e1c18] hover:text-[#d4c8b4]"}`}>{button.icon}</button>)}</div>)}{linkPopoverOpen && <div className="absolute right-4 top-11 z-20 flex items-center gap-2 rounded border border-[#3b3328] bg-[#1a1612] p-2 shadow-lg"><input type="url" value={linkUrl} onChange={(event) => setLinkUrl(event.target.value)} onKeyDown={(event) => { if (event.key === "Enter") { event.preventDefault(); const raw = linkUrl.trim(); if (!raw) return; const normalized = /^(https?:\/\/|mailto:)/i.test(raw) ? raw : `https://${raw}`; exec("createLink", normalized); setLinkUrl(""); setLinkPopoverOpen(false); } }} placeholder="https://example.com" className="w-56 rounded border border-[#3a3329] bg-[#100f0d] px-2 py-1 text-xs text-[#ddd5c8] outline-none focus:border-[#8a775b]" /><button type="button" onClick={() => { const raw = linkUrl.trim(); if (!raw) return; const normalized = /^(https?:\/\/|mailto:)/i.test(raw) ? raw : `https://${raw}`; exec("createLink", normalized); setLinkUrl(""); setLinkPopoverOpen(false); }} className="rounded border border-[#8a775b] bg-[#2b2419] px-2 py-1 text-[11px] text-[#e2d6c2]">Insert</button></div>}</div>}

                <div className="flex min-h-0 flex-1 flex-col lg:flex-row">
                    <aside className="flex w-full shrink-0 flex-col border-b border-[#1a1814] bg-[#0f0d0b] lg:h-full lg:w-[292px] lg:border-b-0 lg:border-r"><div className="px-4 pb-2 pt-4 font-mono text-[9px] uppercase tracking-[0.35em] text-[#a79f93]">Past Entries</div><button type="button" onClick={() => { if (!confirmDiscard()) return; flushSync(() => { setSelectedEntryId(null); setIsEditingExisting(false); replaceEditorContent(todayHeader()); setHasStartedNewEntry(true); setIsDirty(false); }); requestAnimationFrame(focusEditorAtEnd); }} className="mx-4 mb-2 rounded border border-[#4a3a28] bg-[#1b1308] px-3 py-2 text-left font-mono text-[10px] uppercase tracking-[0.18em] text-[#d6be93] hover:border-[#7a5f3e] hover:bg-[#26180a]">+ New Note</button><input type="text" value={entrySearch} onChange={(event) => setEntrySearch(event.target.value)} placeholder="Search entries" className="mx-4 mb-3 rounded border border-[#302920] bg-[#100f0d] px-2 py-1.5 text-xs text-[#d8d0c4] outline-none focus:border-[#6f604a]" /><div className="entries-scroll min-h-0 flex-1 overflow-y-auto">{filteredEntries.length === 0 ? <div className="flex h-full items-center justify-center px-5 pb-8"><p className="text-center text-sm italic text-[#a79f93]">{entries.length ? "No matching entries." : "Nothing written yet."}</p></div> : <>{visibleEntries.map((entry) => { const active = selectedEntryId === entry._id; return <button key={entry._id} type="button" onClick={() => { if (selectedEntryId === entry._id && !isEditingExisting) { if (!confirmDiscard()) return; setSelectedEntryId(null); setIsEditingExisting(false); replaceEditorContent(""); setIsDirty(false); return; } if (!confirmDiscard()) return; setSelectedEntryId(entry._id); setIsEditingExisting(false); replaceEditorContent(entry.content); setIsDirty(false); setHasStartedNewEntry(false); }} className={`block w-full border-b border-[#141210] border-l-2 px-4 py-3 text-left transition ${active ? "border-l-[#c4a882] bg-[#161208]" : "border-l-transparent hover:bg-[#131109]"}`}><div className="mb-1 flex items-baseline justify-between gap-2 font-mono text-[9px]"><span className={`uppercase tracking-[0.18em] ${active ? "text-[#d5c3a6]" : "text-[#9b9286]"}`}>{fmtShort(entry.createdAt)}</span><span className="text-[#7d746a]">{fmtTime(entry.createdAt)}</span></div><div className="de-entry-preview text-xs leading-6 text-[#bfb6aa]" dangerouslySetInnerHTML={{ __html: sanitizePreviewHtml(entry.content) || "<p>-</p>" }} /></button>; })}{visibleEntriesCount < filteredEntries.length && <button type="button" onClick={() => setVisibleEntriesCount((current) => Math.min(current + ENTRY_BATCH_SIZE, filteredEntries.length))} className="m-3 rounded border border-[#3a362e] px-3 py-1.5 text-left font-mono text-[10px] uppercase tracking-[0.2em] text-[#a79f93] hover:border-[#6a5a48] hover:text-[#e0d6c8]">Load more</button>}</>}</div></aside>

                    <section className="relative flex min-h-0 flex-1 flex-col">{(isViewingOld || isEditingExisting) && selectedEntry && <div className="absolute right-3 top-3 z-10 rounded border border-[#4a3a28] bg-[#0d0b09] px-2 py-1 font-mono text-[9px] uppercase tracking-[0.16em] text-[#c4a882]">{isViewingOld ? "viewing" : "editing"} {fmtShort(selectedEntry.createdAt)}</div>}<div className="editor-scroll min-h-0 flex-1 overflow-y-auto" onDrop={async (event) => { if (isViewingOld) return; event.preventDefault(); const file = event.dataTransfer.files?.[0]; if (!file) return; await uploadImage(file); }} onDragOver={(event) => { if (isViewingOld) return; event.preventDefault(); }}><div key={editorKey} id="de-editor" ref={editorRef} dir="ltr" contentEditable={!isViewingOld} suppressContentEditableWarning onInput={() => { if (!editorRef.current) return; setHtmlContent(editorRef.current.innerHTML); setIsDirty(true); updateFormats(); }} onFocus={updateFormats} onKeyUp={updateFormats} onMouseUp={updateFormats} spellCheck={false} data-show-placeholder={showPlaceholder ? "true" : "false"} className={showPlaceholder ? "empty" : ""} /></div><footer className="flex flex-wrap items-center justify-between gap-3 border-t border-[#1a1814] bg-[#0f0d0b] px-4 py-2 lg:px-6"><div className="flex flex-wrap items-center gap-3 font-mono text-[10px] tracking-[0.1em] text-[#8f8679]"><span>{words} words</span><span className="inline-block h-2.5 w-px bg-[#2a2520]" /><span>{chars} chars</span>{!isViewingOld && <><span className="inline-block h-2.5 w-px bg-[#2a2520]" /><span>ctrl+s to save</span></>}{isViewingOld && <><span className="inline-block h-2.5 w-px bg-[#2a2520]" /><span className="italic text-[#9b8b78]">read only</span></>}{isUploading && <><span className="inline-block h-2.5 w-px bg-[#2a2520]" /><span>uploading image...</span></>}</div>{!isViewingOld ? <button onClick={saveEntry} disabled={!canSaveContent || isSaving} className="inline-flex items-center gap-2 rounded border border-[#4a3a28] px-4 py-2 font-mono text-[10px] uppercase tracking-[0.2em] text-[#c4a882] transition hover:bg-[#c4a882] hover:text-[#0d0b09] disabled:cursor-not-allowed disabled:opacity-30">{isSaving ? "saving" : "save entry"}</button> : <button onClick={() => { if (!confirmDiscard()) return; setSelectedEntryId(null); setIsEditingExisting(false); replaceEditorContent(""); setIsDirty(false); }} className="rounded border border-[#3a362e] px-3 py-2 font-mono text-[10px] uppercase tracking-[0.2em] text-[#a79f93] hover:border-[#6a5a48] hover:text-[#e0d6c8]">close</button>}</footer></section>
                </div>
            </div>

            <input ref={fileInputRef} type="file" accept="image/*" className="hidden" onChange={async (event) => { const file = event.target.files?.[0]; event.target.value = ""; if (!file) return; await uploadImage(file); }} />

            <style jsx global>{`.entries-scroll::-webkit-scrollbar, .editor-scroll::-webkit-scrollbar { width: 10px; } .entries-scroll::-webkit-scrollbar-track, .editor-scroll::-webkit-scrollbar-track { background: #0f0f0f; } .entries-scroll::-webkit-scrollbar-thumb, .editor-scroll::-webkit-scrollbar-thumb { background: linear-gradient(180deg, #5f4a2a, #3e2f19); border-radius: 999px; border: 2px solid #0f0f0f; } .entries-scroll, .editor-scroll { scrollbar-width: thin; scrollbar-color: #5f4a2a #0f0f0f; } #de-editor { min-height: 100%; padding: 42px 56px; font-family: "Lora", Georgia, serif; font-size: 16px; line-height: 1.85; color: #ddd5c8; outline: none; caret-color: #c4a882; word-break: break-word; direction: ltr; unicode-bidi: normal; } #de-editor * { direction: ltr; unicode-bidi: normal; } #de-editor.empty[data-show-placeholder="true"]::before { content: "How was your day?..."; color: #9b9286; font-style: italic; pointer-events: none; } #de-editor h1 { font-size: 26px; margin: 24px 0 12px; color: #ede5d8; } #de-editor h2 { font-size: 20px; margin: 20px 0 10px; color: #e0d8cc; } #de-editor h3 { font-size: 12px; margin: 16px 0 8px; font-family: "JetBrains Mono", monospace; text-transform: uppercase; letter-spacing: 0.08em; color: #d4ccc0; } #de-editor p { margin-bottom: 4px; } #de-editor blockquote { border-left: 2px solid #c4a882; padding: 8px 20px; margin: 16px 0; color: #a89878; font-style: italic; background: #161208; border-radius: 0 4px 4px 0; } #de-editor hr { border: none; border-top: 1px solid #2a2520; margin: 24px 0; } #de-editor ul, #de-editor ol { padding-left: 28px; margin: 8px 0; } #de-editor pre { background: #111009; border: 1px solid #2a2520; border-radius: 4px; padding: 16px 20px; margin: 16px 0; overflow-x: auto; } #de-editor code { font-family: "JetBrains Mono", monospace; font-size: 13px; color: #a8d8a8; } #de-editor table td { border: 1px solid #5b4a35; padding: 8px; } #de-editor a { color: #c4a882; text-decoration: underline; text-underline-offset: 3px; } #de-editor img { max-width: 100%; border-radius: 6px; margin: 12px 0; display: block; } #de-editor[contenteditable="false"] { opacity: 0.78; cursor: default; } .de-entry-preview p, .de-entry-preview blockquote, .de-entry-preview h1, .de-entry-preview h2, .de-entry-preview h3 { margin: 0; display: inline; } @media (max-width: 1024px) { #de-editor { padding: 28px 22px; } }`}</style>

            <Toaster />
        </>
    );
};

export default DiaryEditorClient;

