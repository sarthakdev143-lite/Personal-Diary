"use client";

import { useEffect, useLayoutEffect, useMemo, useRef, useState, useCallback } from "react";
import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useToast } from "@/hooks/use-toast";
import { Toaster } from "@/components/ui/toaster";
import { DESCRIPTION_MAX, DIARY_THEMES, TITLE_MAX, coverForTheme, isAllowedTheme } from "@/lib/diary/constants";
import { diaryFieldsMatch } from "@/lib/diary/search";
import { decideEntryPaste, imageFileIssue } from "@/lib/diary/paste";
import { calendarDate, emptyEntryListMessage, entryInMonth, entryInstant, entryLinkUrl, entryListSearchText, entryMonths, entrySelectionAction, entryToShowOnOpen, entryWasRevised, entryWritingText, formatEntryLong, formatEntryTime, formatDiaryDate, hasEntryContent, monthForSavedEntry, retitleEntryDate, wordCount } from "@/lib/diary/text";
import { normalizeDescription, normalizeTitle } from "@/lib/diary/validation";

type Diary = { _id: string; title: string; description: string; theme: string; createdAt: string; updatedAt: string; };
type Entry = { _id: string; diaryId: string; content: string; plainText?: string; createdAt: string; updatedAt: string; };
type DiaryResponse = { diary: Diary; entries: Entry[]; };
type EditorMode = "compose" | "view" | "edit";

const fmtShort = formatDiaryDate;
const fmtTime = formatEntryTime;
const fmtLong = formatEntryLong;
const headingFor = (iso: string) => `<h2>${fmtLong(iso)}</h2><p><br></p>`;

const entryPreview = (entry: Entry) => {
    const text = entry.plainText?.trim() || entryWritingText(entry.content);
    return text.slice(0, 90);
};

// Toolbar button definition
type ToolButton = {
    icon: string;
    title: string;
    format?: string;
    command?: string;
    value?: string;
    html?: string;
    kind?: "image" | "link";
};

const TOOLBAR: ToolButton[][] = [
    [
        { icon: "H1", title: "Heading 1", command: "formatBlock", value: "h1", format: "h1" },
        { icon: "H2", title: "Heading 2", command: "formatBlock", value: "h2", format: "h2" },
        { icon: "H3", title: "Heading 3", command: "formatBlock", value: "h3", format: "h3" },
    ],
    [
        { icon: "B", title: "Bold (Ctrl+B)", command: "bold", format: "bold" },
        { icon: "I", title: "Italic (Ctrl+I)", command: "italic", format: "italic" },
        { icon: "U", title: "Underline (Ctrl+U)", command: "underline", format: "underline" },
        { icon: "S̶", title: "Strikethrough", command: "strikeThrough", format: "strikethrough" },
    ],
    [
        { icon: "≡", title: "Bullet list", command: "insertUnorderedList", format: "ul" },
        { icon: "1.", title: "Numbered list", command: "insertOrderedList", format: "ol" },
        { icon: "❝", title: "Blockquote", command: "formatBlock", value: "blockquote", format: "blockquote" },
        { icon: "—", title: "Divider", html: "<hr/><p><br></p>" },
    ],
    [
        { icon: "🖼", title: "Insert image", kind: "image" },
        { icon: "</>", title: "Code block", html: "<pre><code>code here</code></pre><p><br></p>" },
        { icon: "🔗", title: "Insert link", kind: "link", format: "link" },
    ],
    [
        { icon: "⟵", title: "Undo", command: "undo" },
        { icon: "⟶", title: "Redo", command: "redo" },
    ],
];

const DiaryEditorClient = ({ diaryId }: { diaryId: string }) => {
    const router = useRouter();
    const { toast } = useToast();
    const editorRef = useRef<HTMLDivElement>(null);
    const fileInputRef = useRef<HTMLInputElement>(null);
    const entryClock = useRef(new Date());
    const linkInputRef = useRef<HTMLInputElement>(null);
    const linkRange = useRef<Range | null>(null);
    const discardButtonRef = useRef<HTMLButtonElement>(null);

    const [diary, setDiary] = useState<Diary | null>(null);
    const [entries, setEntries] = useState<Entry[]>([]);
    const [htmlContent, setHtmlContent] = useState("");
    const [selectedEntryId, setSelectedEntryId] = useState<string | null>(null);
    const [mode, setMode] = useState<EditorMode>("compose");
    const [isLoading, setIsLoading] = useState(true);
    const [isSaving, setIsSaving] = useState(false);
    const [isSavingDiary, setIsSavingDiary] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [activeFormats, setActiveFormats] = useState<Set<string>>(new Set());
    const [detailsOpen, setDetailsOpen] = useState(false);
    const [diaryDraft, setDiaryDraft] = useState({ title: "", description: "", theme: "" });
    const [confirmDelete, setConfirmDelete] = useState<"entry" | "diary" | null>(null);
    const [baseline, setBaseline] = useState("");
    const [entryQuery, setEntryQuery] = useState("");
    const [entryMonth, setEntryMonth] = useState("");
    const [isExporting, setIsExporting] = useState<"md" | "json" | null>(null);
    const [entryDate, setEntryDate] = useState(() => calendarDate(new Date()));
    const [savedDate, setSavedDate] = useState(() => calendarDate(new Date()));
    const [linkOpen, setLinkOpen] = useState(false);
    const [linkDraft, setLinkDraft] = useState("");
    const [linkError, setLinkError] = useState<string | null>(null);
    const [linkHasAnchor, setLinkHasAnchor] = useState(false);
    const [pendingDiscard, setPendingDiscard] = useState<(() => void) | null>(null);

    useEffect(() => {
        let mounted = true;
        (async () => {
            try {
                const res = await fetch(`/api/diaries/${diaryId}`, { cache: "no-store" });
                const data = await res.json() as Partial<DiaryResponse> & { error?: string };
                if (!res.ok) throw new Error(data.error || "Failed to load.");
                if (!mounted) return;
                setDiary(data.diary!);
                const loaded = data.entries ?? [];
                setEntries(loaded);
                const latest = entryToShowOnOpen(loaded);
                if (latest) {
                    setSelectedEntryId(latest._id);
                    setMode("view");
                    setConfirmDelete(null);
                    const created = new Date(latest.createdAt);
                    const day = calendarDate(created);
                    setEntryDate(day);
                    setSavedDate(day);
                    entryClock.current = created;
                    setBaseline(latest.content);
                    setHtmlContent(latest.content);
                }
                setDiaryDraft({
                    title: data.diary?.title ?? "",
                    description: data.diary?.description ?? "",
                    theme: data.diary?.theme ?? "",
                });
            } catch (e) {
                if (mounted) setError(e instanceof Error ? e.message : "Failed to load.");
            } finally {
                if (mounted) setIsLoading(false);
            }
        })();
        return () => { mounted = false; };
    }, [diaryId]);

    // Track active formats for toolbar highlight
    const updateActiveFormats = useCallback(() => {
        const selection = document.getSelection();
        if (!editorRef.current || !selection || selection.rangeCount === 0) return;
        const range = selection.getRangeAt(0);
        const anchor = range.commonAncestorContainer;
        if (anchor && !editorRef.current.contains(anchor)) return;

        const fmt = new Set<string>();
        if (document.queryCommandState("bold")) fmt.add("bold");
        if (document.queryCommandState("italic")) fmt.add("italic");
        if (document.queryCommandState("underline")) fmt.add("underline");
        if (document.queryCommandState("strikeThrough")) fmt.add("strikethrough");
        if (document.queryCommandState("insertUnorderedList")) fmt.add("ul");
        if (document.queryCommandState("insertOrderedList")) fmt.add("ol");
        const block = document.queryCommandValue("formatBlock");
        if (typeof block === "string" && block) {
            const normalized = block.replace(/[<>]/g, "").toLowerCase();
            if (normalized) fmt.add(normalized);
        }
        const linkHost = anchor instanceof Element ? anchor : anchor.parentElement;
        const link = linkHost?.closest("a");
        if (link && editorRef.current.contains(link)) fmt.add("link");
        setActiveFormats(fmt);
    }, []);

    // Sync editor DOM -> htmlContent state
    const onInput = useCallback(() => {
        if (editorRef.current) setHtmlContent(editorRef.current.innerHTML);
        updateActiveFormats();
    }, [updateActiveFormats]);

    // Track active formats for toolbar highlight
    const onSelectionChange = useCallback(() => {
        updateActiveFormats();
    }, [updateActiveFormats]);

    useEffect(() => {
        document.addEventListener("selectionchange", onSelectionChange);
        return () => document.removeEventListener("selectionchange", onSelectionChange);
    }, [onSelectionChange]);

    useEffect(() => {
        if (!linkOpen) return;
        const input = linkInputRef.current;
        input?.focus();
        if (linkHasAnchor) input?.select();
    }, [linkOpen, linkHasAnchor]);

    useEffect(() => {
        if (!pendingDiscard) return;
        discardButtonRef.current?.focus();
    }, [pendingDiscard]);

    const exec = useCallback((cmd: string, value?: string) => {
        editorRef.current?.focus();
        document.execCommand(cmd, false, value);
        if (editorRef.current) setHtmlContent(editorRef.current.innerHTML);
        updateActiveFormats();
    }, [updateActiveFormats]);

    const insertHTML = useCallback((html: string) => {
        editorRef.current?.focus();
        document.execCommand("insertHTML", false, html);
        if (editorRef.current) setHtmlContent(editorRef.current.innerHTML);
        updateActiveFormats();
    }, [updateActiveFormats]);

    const insertText = useCallback((text: string) => {
        editorRef.current?.focus();
        document.execCommand("insertText", false, text);
        if (editorRef.current) setHtmlContent(editorRef.current.innerHTML);
        updateActiveFormats();
    }, [updateActiveFormats]);

    const insertImageFile = useCallback((file: File) => {
        const reader = new FileReader();
        reader.onload = (ev) => {
            const src = ev.target?.result;
            if (typeof src !== "string") return;
            insertHTML(`<img src="${src}" alt="" /><p><br></p>`);
        };
        reader.readAsDataURL(file);
    }, [insertHTML]);

    const handleImageUpload = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        e.target.value = "";
        if (!file) return;
        const issue = imageFileIssue(file);
        if (issue) {
            toast({ title: issue.title, description: issue.description, variant: "destructive" });
            return;
        }
        insertImageFile(file);
    }, [insertImageFile, toast]);

    const onPaste = (event: React.ClipboardEvent<HTMLDivElement>) => {
        if (mode === "view") return;
        const data = event.clipboardData;
        const decision = decideEntryPaste({
            files: Array.from(data.files, (file) => ({ type: file.type, size: file.size })),
            html: data.getData("text/html"),
            text: data.getData("text/plain"),
        });
        if (decision.action === "default") return;
        event.preventDefault();
        if (decision.action === "reject") {
            toast({ title: decision.title, description: decision.description, variant: "destructive" });
            return;
        }
        if (decision.action === "html") {
            if (decision.warning) {
                toast({ title: decision.warning.title, description: decision.warning.description, variant: "destructive" });
            }
            insertHTML(decision.html);
            return;
        }
        if (decision.action === "plain") {
            insertText(decision.text);
            return;
        }
        if (decision.action === "ignore") return;
        const file = Array.from(data.files).find((item) => item.type.startsWith("image/"));
        if (file) insertImageFile(file);
    };

    const writeEditor = (html: string) => {
        setBaseline(html);
        setHtmlContent(html);
        setLinkOpen(false);
        if (editorRef.current) editorRef.current.innerHTML = html;
    };

    useLayoutEffect(() => {
        if (isLoading || !editorRef.current || !htmlContent) return;
        if (editorRef.current.innerHTML) return;
        editorRef.current.innerHTML = htmlContent;
    }, [isLoading, htmlContent]);

    const isDirty = mode !== "view" && (htmlContent !== baseline || entryDate !== savedDate);

    useEffect(() => {
        if (!isDirty) return;

        const warnBeforeLeaving = (event: BeforeUnloadEvent) => {
            event.preventDefault();
            event.returnValue = "";
        };

        window.addEventListener("beforeunload", warnBeforeLeaving);
        return () => window.removeEventListener("beforeunload", warnBeforeLeaving);
    }, [isDirty]);

    const askToDiscard = (run: () => void) => {
        if (!isDirty) {
            setPendingDiscard(null);
            run();
            return;
        }
        setPendingDiscard(() => run);
    };

    const confirmDiscard = () => {
        const run = pendingDiscard;
        setPendingDiscard(null);
        run?.();
    };

    const rememberDate = (value: string, clock?: Date) => {
        setEntryDate(value);
        setSavedDate(value);
        if (clock) entryClock.current = clock;
    };

    const instantFor = (value: string) => entryInstant(value, new Date(), entryClock.current);

    const changeEntryDate = (next: string) => {
        const nextInstant = instantFor(next);
        if (!nextInstant) {
            toast({ title: "Check the date", description: "Use today or a past day.", variant: "destructive" });
            return;
        }
        const previousInstant = instantFor(entryDate);
        const previousLabel = previousInstant ? fmtLong(previousInstant.toISOString()) : "";
        const updated = retitleEntryDate(htmlContent, previousLabel, fmtLong(nextInstant.toISOString()));
        setEntryDate(next);
        if (updated === htmlContent) return;
        setHtmlContent(updated);
        if (editorRef.current) editorRef.current.innerHTML = updated;
    };

    const resetComposer = () => {
        setSelectedEntryId(null);
        setMode("compose");
        setConfirmDelete(null);
        const now = new Date();
        rememberDate(calendarDate(now), now);
        writeEditor("");
    };

    const handleNewEntry = () => {
        askToDiscard(() => {
            const now = new Date();
            rememberDate(calendarDate(now), now);
            const html = headingFor(now.toISOString());
            setSelectedEntryId(null);
            setMode("compose");
            setConfirmDelete(null);
            writeEditor(html);
            editorRef.current?.focus();
            if (editorRef.current) {
                const range = document.createRange();
                range.selectNodeContents(editorRef.current);
                range.collapse(false);
                window.getSelection()?.removeAllRanges();
                window.getSelection()?.addRange(range);
            }
        });
    };

    const revertToSaved = (entry: Entry) => {
        askToDiscard(() => {
            setSelectedEntryId(entry._id);
            setMode("view");
            setConfirmDelete(null);
            const created = new Date(entry.createdAt);
            rememberDate(calendarDate(created), created);
            writeEditor(entry.content);
        });
    };

    const handleEntrySelect = (entry: Entry) => {
        const action = entrySelectionAction(selectedEntryId, mode, entry._id);
        if (action === "stay") return;
        if (action === "revert") {
            revertToSaved(entry);
            return;
        }
        askToDiscard(() => {
            setSelectedEntryId(entry._id);
            setMode("view");
            setConfirmDelete(null);
            const created = new Date(entry.createdAt);
            rememberDate(calendarDate(created), created);
            writeEditor(entry.content);
        });
    };

    const handleSave = async () => {
        if (!hasEntryContent(htmlContent) || isSaving || mode === "view") return;
        const instant = instantFor(entryDate);
        if (!instant) {
            toast({ title: "Check the date", description: "Use today or a past day.", variant: "destructive" });
            return;
        }
        setIsSaving(true);
        const editing = mode === "edit" && selectedEntryId;
        try {
            const res = await fetch(
                editing ? `/api/diaries/${diaryId}/entries/${selectedEntryId}` : `/api/diaries/${diaryId}/entries`,
                {
                    method: editing ? "PUT" : "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({ content: htmlContent, createdAt: instant.toISOString() }),
                }
            );
            const data = await res.json() as Entry & { error?: string };
            if (!res.ok) throw new Error(data.error || "Failed to save.");
            const placeEntry = (items: Entry[]) =>
                [...items].sort((left, right) => Date.parse(right.createdAt) - Date.parse(left.createdAt));
            if (editing) {
                setEntries((prev) => placeEntry(prev.map((entry) => entry._id === data._id ? data : entry)));
            } else {
                setEntries((prev) => placeEntry([data, ...prev]));
            }
            setEntryMonth(monthForSavedEntry(data.createdAt, entryMonth));
            const savedText = data.plainText || entryWritingText(data.content);
            if (!diaryFieldsMatch(savedText, "", entryQuery)) setEntryQuery("");
            setSelectedEntryId(data._id);
            setMode("view");
            setConfirmDelete(null);
            setPendingDiscard(null);
            const created = new Date(data.createdAt);
            rememberDate(calendarDate(created), created);
            writeEditor(data.content);
            toast({ title: editing ? "Updated" : "Saved", description: fmtLong(data.createdAt) });
        } catch (e) {
            toast({ title: "Not saved", description: e instanceof Error ? e.message : "Error", variant: "destructive" });
        } finally {
            setIsSaving(false);
        }
    };

    const handleDeleteEntry = async () => {
        if (!selectedEntryId || isSaving) return;
        setIsSaving(true);
        try {
            const res = await fetch(`/api/diaries/${diaryId}/entries/${selectedEntryId}`, { method: "DELETE" });
            const data = await res.json().catch(() => null) as { error?: string } | null;
            if (!res.ok) throw new Error(data?.error || "Failed to delete entry.");
            setEntries((prev) => prev.filter((entry) => entry._id !== selectedEntryId));
            resetComposer();
            toast({ title: "Entry deleted" });
        } catch (e) {
            toast({ title: "Not deleted", description: e instanceof Error ? e.message : "Error", variant: "destructive" });
        } finally {
            setIsSaving(false);
        }
    };

    const handleSaveDiary = async () => {
        const title = normalizeTitle(diaryDraft.title);
        if (!title.ok) {
            toast({ title: "Check the title", description: title.error, variant: "destructive" });
            return;
        }
        const description = normalizeDescription(diaryDraft.description);
        if (!description.ok) {
            toast({ title: "Check the description", description: description.error, variant: "destructive" });
            return;
        }
        setIsSavingDiary(true);
        try {
            const payload: { title: string; description: string; theme?: string } = {
                title: title.value,
                description: description.value,
            };
            if (isAllowedTheme(diaryDraft.theme)) payload.theme = diaryDraft.theme;
            const res = await fetch(`/api/diaries/${diaryId}`, {
                method: "PUT",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(payload),
            });
            const data = await res.json() as Diary & { error?: string };
            if (!res.ok) throw new Error(data.error || "Failed to update diary.");
            setDiary(data);
            setDiaryDraft({ title: data.title, description: data.description, theme: data.theme });
            setDetailsOpen(false);
            toast({ title: "Diary updated" });
        } catch (e) {
            toast({ title: "Not updated", description: e instanceof Error ? e.message : "Error", variant: "destructive" });
        } finally {
            setIsSavingDiary(false);
        }
    };

    const handleDeleteDiary = async () => {
        setIsSavingDiary(true);
        try {
            const res = await fetch(`/api/diaries/${diaryId}`, { method: "DELETE" });
            const data = await res.json().catch(() => null) as { error?: string } | null;
            if (!res.ok) throw new Error(data?.error || "Failed to delete diary.");
            router.push("/diary");
        } catch (e) {
            toast({ title: "Not deleted", description: e instanceof Error ? e.message : "Error", variant: "destructive" });
            setIsSavingDiary(false);
        }
    };

    const downloadExport = async (format: "md" | "json") => {
        if (isExporting) return;
        setIsExporting(format);
        try {
            const res = await fetch(`/api/diaries/${diaryId}/export?format=${format}`, { cache: "no-store" });
            if (!res.ok) {
                const data = await res.json().catch(() => null) as { error?: string } | null;
                throw new Error(data?.error || "Could not export this diary.");
            }
            const blob = await res.blob();
            const header = res.headers.get("Content-Disposition") ?? "";
            const named = /filename="([^"]+)"/.exec(header);
            const url = URL.createObjectURL(blob);
            const link = document.createElement("a");
            link.href = url;
            link.download = named?.[1] || (format === "json" ? "diary.json" : "diary.md");
            document.body.appendChild(link);
            link.click();
            link.remove();
            URL.revokeObjectURL(url);
            toast({
                title: format === "json" ? "Backup downloaded" : "Markdown downloaded",
                description: "This file includes saved entries.",
            });
        } catch (downloadError) {
            toast({
                title: "Not exported",
                description: downloadError instanceof Error ? downloadError.message : "Could not export this diary.",
                variant: "destructive",
            });
        } finally {
            setIsExporting(null);
        }
    };

    const closeLinkField = () => {
        setLinkOpen(false);
        setLinkDraft("");
        setLinkError(null);
        setLinkHasAnchor(false);
        linkRange.current = null;
    };

    const editorAnchor = (node: Node | null): HTMLAnchorElement | null => {
        const editor = editorRef.current;
        if (!node || !editor) return null;
        const element = node instanceof Element ? node : node.parentElement;
        const anchor = element?.closest("a");
        if (!(anchor instanceof HTMLAnchorElement) || !editor.contains(anchor)) return null;
        return anchor;
    };

    const rangeAnchor = (range: Range | null): HTMLAnchorElement | null => {
        if (!range) return null;
        const start = editorAnchor(range.startContainer);
        const end = editorAnchor(range.endContainer);
        if (!start || start !== end) return null;
        return start;
    };

    const openLinkField = () => {
        if (linkOpen) {
            closeLinkField();
            return;
        }
        const selection = window.getSelection();
        const editor = editorRef.current;
        const range = selection && selection.rangeCount > 0 && editor?.contains(selection.anchorNode)
            ? selection.getRangeAt(0).cloneRange()
            : null;
        linkRange.current = range;
        const href = rangeAnchor(range)?.getAttribute("href") ?? "";
        const parsed = href ? entryLinkUrl(href) : null;
        setLinkHasAnchor(Boolean(parsed?.ok));
        setLinkDraft(parsed?.ok ? parsed.href : "");
        setLinkError(null);
        setLinkOpen(true);
    };

    const writeLinkChange = () => {
        const editor = editorRef.current;
        if (editor) setHtmlContent(editor.innerHTML);
        updateActiveFormats();
        closeLinkField();
    };

    const editAnchor = (anchor: HTMLAnchorElement, command: "createLink" | "unlink", value?: string) => {
        const editor = editorRef.current;
        editor?.focus();
        const selection = window.getSelection();
        if (!selection) return;
        const range = document.createRange();
        range.selectNodeContents(anchor);
        selection.removeAllRanges();
        selection.addRange(range);
        document.execCommand(command, false, value);
    };

    const applyLink = (event: React.FormEvent) => {
        event.preventDefault();
        const parsed = entryLinkUrl(linkDraft);
        if (!parsed.ok) {
            setLinkError(parsed.error);
            return;
        }
        const anchor = rangeAnchor(linkRange.current);
        if (anchor) {
            editAnchor(anchor, "createLink", parsed.href);
            writeLinkChange();
            return;
        }
        const editor = editorRef.current;
        editor?.focus();
        const selection = window.getSelection();
        if (linkRange.current && selection) {
            selection.removeAllRanges();
            selection.addRange(linkRange.current);
        }
        document.execCommand("createLink", false, parsed.href);
        writeLinkChange();
    };

    const removeLink = () => {
        const anchor = rangeAnchor(linkRange.current);
        if (!anchor) {
            closeLinkField();
            return;
        }
        editAnchor(anchor, "unlink");
        writeLinkChange();
    };

    const handleKeyDown = (e: React.KeyboardEvent) => {
        if (e.key === "Escape" && pendingDiscard) {
            e.preventDefault();
            setPendingDiscard(null);
            return;
        }
        if ((e.ctrlKey || e.metaKey) && e.key === "s") { e.preventDefault(); handleSave(); }
    };

    const runTool = (tool: ToolButton) => {
        if (tool.kind === "image") {
            fileInputRef.current?.click();
            return;
        }
        if (tool.kind === "link") {
            openLinkField();
            return;
        }
        if (tool.html) {
            insertHTML(tool.html);
            return;
        }
        if (tool.command) exec(tool.command, tool.value);
    };

    const wc = wordCount(htmlContent);
    const canSave = hasEntryContent(htmlContent) && mode !== "view";
    const selectedEntry = entries.find((entry) => entry._id === selectedEntryId);
    const statusDate = mode === "edit"
        ? entryInstant(entryDate)?.toISOString() ?? selectedEntry?.createdAt
        : selectedEntry?.createdAt;
    const statusLabel = selectedEntry && statusDate && mode !== "compose"
        ? `${mode === "edit" ? "editing" : "viewing"} · ${fmtShort(statusDate)}`
        : null;
    const titleCheck = normalizeTitle(diaryDraft.title);
    const descriptionCheck = normalizeDescription(diaryDraft.description);
    const detailsTitleMessage = titleCheck.ok ? null : titleCheck.error;
    const detailsDescriptionMessage = descriptionCheck.ok ? null : descriptionCheck.error;
    const canSaveDetails = titleCheck.ok && descriptionCheck.ok;
    const cover = coverForTheme(diary?.theme);
    const months = useMemo(() => entryMonths(entries.map((entry) => entry.createdAt)), [entries]);
    const activeMonth = months.some((month) => month.key === entryMonth) ? entryMonth : "";
    const visibleEntries = entries.filter((entry) =>
        entryInMonth(entry.createdAt, activeMonth)
        && diaryFieldsMatch(entryListSearchText(entry), "", entryQuery)
    );

    if (isLoading) return (
        <div style={{ position: "fixed", inset: 0, zIndex: 10, background: "#0d0b09", display: "flex", alignItems: "center", justifyContent: "center" }}>
            <div style={{ width: 28, height: 28, borderRadius: "50%", border: "2px solid #4a4030", borderTopColor: "#c4a882", animation: "spin 1s linear infinite" }} />
            <style>{`@keyframes spin{to{transform:rotate(360deg)}}`}</style>
            <Toaster />
        </div>
    );

    if (error) return (
        <div style={{ position: "fixed", inset: 0, zIndex: 10, background: "#0d0b09", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: 16 }}>
            <p style={{ fontFamily: "Georgia,serif", color: "#a09080", fontSize: 14 }}>{error}</p>
            <button onClick={() => router.push("/diary")} style={{ fontFamily: "monospace", color: "#8a7860", fontSize: 11, letterSpacing: "0.2em", textTransform: "uppercase", borderBottom: "1px solid #5a4a38", background: "none", cursor: "pointer" }}>← return</button>
            <Toaster />
        </div>
    );

    return (
        <>
            <style>{`
                @import url('https://fonts.googleapis.com/css2?family=Lora:ital,wght@0,400;0,500;1,400;1,500&family=JetBrains+Mono:wght@300;400&display=swap');

                .de-root,.de-root *{box-sizing:border-box;}

                .de-root{
                    position:fixed;inset:0;z-index:10;
                    background:#0d0b09;
                    color:#d8d0c4;
                    font-family:'Lora',Georgia,serif;
                    display:flex;flex-direction:column;
                }
                .de-mono{font-family:'JetBrains Mono','Courier New',monospace;}

                /* Left panel scrollbar */
                .de-left::-webkit-scrollbar{width:3px;}
                .de-left::-webkit-scrollbar-track{background:transparent;}
                .de-left::-webkit-scrollbar-thumb{background:#2a2520;border-radius:99px;}

                /* Header */
                .de-header{
                    flex-shrink:0;
                    display:flex;align-items:center;justify-content:space-between;
                    padding:10px 24px;
                    background:#0f0d0b;
                    border-bottom:1px solid #1e1c18;
                }
                .de-header-actions{
                    display:flex;align-items:center;gap:12px;flex-shrink:0;
                }

                /* Toolbar */
                .de-toolbar{
                    flex-shrink:0;
                    display:flex;align-items:center;gap:2px;flex-wrap:wrap;
                    padding:6px 16px;
                    background:#111009;
                    border-bottom:1px solid #1e1c18;
                }
                .de-toolbar-sep{width:1px;height:18px;background:#2a2520;margin:0 4px;flex-shrink:0;}
                .de-link{
                    flex-shrink:0;display:flex;align-items:center;gap:8px;flex-wrap:wrap;
                    padding:8px 16px;background:#14110e;border-bottom:1px solid #1e1c18;
                }
                .de-link label{
                    font-family:'JetBrains Mono',monospace;font-size:9px;
                    letter-spacing:0.18em;text-transform:uppercase;color:#a79f93;
                }
                .de-link input{
                    flex:1;min-width:160px;font-family:'Lora',Georgia,serif;font-size:14px;
                    color:#ede5d8;background:#0d0b09;border:1px solid #2a2520;border-radius:3px;padding:6px 10px;
                }
                .de-link input[aria-invalid="true"]{border-color:#6a3a32;}
                .de-link-error{
                    margin:0;flex-basis:100%;font-family:'Lora',Georgia,serif;font-size:13px;color:#e7b2a4;
                }
                .de-tbtn{
                    font-family:'JetBrains Mono',monospace;
                    font-size:11px;
                    color:#a79f93;
                    background:transparent;
                    border:1px solid transparent;
                    border-radius:3px;
                    padding:3px 7px;
                    cursor:pointer;
                    transition:all 0.15s;
                    min-width:28px;
                    text-align:center;
                    line-height:1.4;
                }
                .de-tbtn:hover{color:#d4c8b4;background:#1e1c18;border-color:#2a2520;}
                .de-tbtn.on{color:#c4a882;background:#2a2010;border-color:#3a3020;}

                /* Body */
                .de-body{flex:1;min-height:0;display:flex;}

                /* Left panel */
                .de-left{
                    width:268px;flex-shrink:0;
                    display:flex;flex-direction:column;
                    overflow-y:auto;overflow-x:hidden;
                    background:#0f0d0b;
                    border-right:1px solid #1a1814;
                }
                .de-entry-card{
                    display:block;width:100%;text-align:left;
                    padding:14px 16px;
                    border:none;
                    border-bottom:1px solid #141210;
                    border-left:3px solid transparent;
                    background:transparent;cursor:pointer;
                    transition:background 0.12s,border-left-color 0.12s;
                }
                .de-entry-search{
                    display:block;width:calc(100% - 32px);margin:0 16px 8px;
                    font-family:'Lora',Georgia,serif;font-size:13px;color:#ede5d8;
                    background:#0d0b09;border:1px solid #2a2520;border-radius:3px;padding:8px 10px;
                }
                .de-entry-search:focus,.de-month:focus{outline:none;border-color:#6a5a48;}
                .de-month{
                    display:block;width:calc(100% - 32px);margin:0 16px 8px;
                    font-family:'Lora',Georgia,serif;font-size:13px;color:#ede5d8;
                    background:#0d0b09;border:1px solid #2a2520;border-radius:3px;padding:8px 10px;
                    color-scheme:dark;
                }
                .de-entry-card:hover{background:#131109;}
                .de-entry-card.active{background:#161208;border-left-color:#c4a882;}

                /* Right panel */
                .de-right{
                    flex:1;min-width:0;min-height:0;
                    display:flex;flex-direction:column;
                    position:relative;
                }

                /* Editor content area */
                .de-editor-wrap{flex:1;overflow-y:auto;position:relative;}
                .de-editor-wrap::-webkit-scrollbar{width:4px;}
                .de-editor-wrap::-webkit-scrollbar-track{background:transparent;}
                .de-editor-wrap::-webkit-scrollbar-thumb{background:#2a2520;border-radius:99px;}

                #de-editor{
                    min-height:100%;
                    padding:48px 64px;
                    font-family:'Lora',Georgia,serif;
                    font-size:16px;
                    line-height:1.9;
                    color:#ddd5c8;
                    letter-spacing:0.01em;
                    outline:none;
                    caret-color:#c4a882;
                    word-break:break-word;
                }
                #de-editor:empty::before{
                    content:"How was your day?...";
                    color:#9b9286;
                    font-style:italic;
                    pointer-events:none;
                }
                #de-editor::selection,
                #de-editor *::selection{background:#3a3020;color:#ede5d8;}

                /* Typography inside editor */
                #de-editor h1{font-size:26px;font-weight:500;color:#ede5d8;margin:24px 0 12px;letter-spacing:-0.01em;line-height:1.3;}
                #de-editor h2{font-size:20px;font-weight:500;color:#e0d8cc;margin:20px 0 10px;line-height:1.4;}
                #de-editor h3{font-size:16px;font-weight:500;color:#d4ccc0;margin:16px 0 8px;text-transform:uppercase;letter-spacing:0.08em;font-family:'JetBrains Mono',monospace;font-size:12px;}
                #de-editor p{margin-bottom:4px;}
                #de-editor blockquote{
                    border-left:2px solid #c4a882;
                    padding:8px 20px;
                    margin:16px 0;
                    color:#a89878;
                    font-style:italic;
                    background:#161208;
                    border-radius:0 4px 4px 0;
                }
                #de-editor hr{border:none;border-top:1px solid #2a2520;margin:24px 0;}
                #de-editor ul,#de-editor ol{padding-left:28px;margin:8px 0;}
                #de-editor li{margin-bottom:4px;color:#d0c8bc;}
                #de-editor pre{
                    background:#111009;
                    border:1px solid #2a2520;
                    border-radius:4px;
                    padding:16px 20px;
                    margin:16px 0;
                    overflow-x:auto;
                }
                #de-editor code{
                    font-family:'JetBrains Mono',monospace;
                    font-size:13px;
                    color:#a8d8a8;
                    line-height:1.6;
                }
                #de-editor a{color:#c4a882;text-decoration:underline;text-underline-offset:3px;}
                #de-editor img{max-width:100%;border-radius:6px;margin:12px 0;display:block;}

                /* Read-only overlay */
                #de-editor[contenteditable="false"]{opacity:0.75;cursor:default;}

                /* Footer */
                .de-footer{
                    flex-shrink:0;
                    display:flex;align-items:center;justify-content:space-between;
                    padding:9px 28px;
                    background:#0f0d0b;
                    border-top:1px solid #1a1814;
                }
                .de-footer-actions{display:flex;gap:8px;align-items:center;}
                .de-discard{
                    flex-shrink:0;display:flex;align-items:center;gap:8px;flex-wrap:wrap;
                    padding:8px 28px;background:#1a1210;border-top:1px solid #3a2a24;
                    font-family:'Lora',Georgia,serif;font-size:14px;color:#e7b2a4;
                }

                /* Buttons */
                .de-save-btn{
                    font-family:'JetBrains Mono',monospace;
                    font-size:10px;letter-spacing:0.2em;text-transform:uppercase;
                    color:#c4a882;border:1px solid #4a3a28;
                    padding:7px 22px;border-radius:2px;background:transparent;
                    cursor:pointer;transition:all 0.18s;
                    display:flex;align-items:center;gap:8px;
                }
                .de-save-btn:hover:not(:disabled){background:#c4a882;color:#0d0b09;border-color:#c4a882;}
                .de-save-btn:active:not(:disabled){transform:scale(0.97);}
                .de-save-btn:disabled{opacity:0.2;cursor:not-allowed;}
                .de-ghost-btn{
                    font-family:'JetBrains Mono',monospace;
                    font-size:9px;letter-spacing:0.22em;text-transform:uppercase;
                    color:#a79f93;border:1px solid #3a362e;
                    padding:6px 14px;border-radius:2px;background:transparent;
                    cursor:pointer;transition:all 0.15s;
                }
                .de-ghost-btn:hover{color:#e0d6c8;border-color:#6a5a48;}
                .de-ghost-btn:disabled{opacity:0.4;cursor:not-allowed;}
                .de-danger-btn{
                    font-family:'JetBrains Mono',monospace;
                    font-size:9px;letter-spacing:0.18em;text-transform:uppercase;
                    color:#e7b2a4;border:1px solid #6a3a32;
                    padding:6px 14px;border-radius:2px;background:transparent;
                    cursor:pointer;
                }
                .de-danger-btn:hover{color:#1a0d0b;background:#e7b2a4;border-color:#e7b2a4;}
                .de-danger-btn:disabled{opacity:0.4;cursor:not-allowed;}
                .de-details{
                    flex-shrink:0;display:grid;gap:10px;
                    grid-template-columns:minmax(0,1fr) minmax(0,1.4fr);
                    padding:12px 24px;background:#14110e;border-bottom:1px solid #1e1c18;
                }
                .de-field-error{
                    margin:0;font-family:'Lora',Georgia,serif;font-size:13px;
                    letter-spacing:0;text-transform:none;color:#e7b2a4;
                }
                .de-details label{
                    display:flex;flex-direction:column;gap:6px;
                    font-family:'JetBrains Mono',monospace;font-size:9px;
                    letter-spacing:0.18em;text-transform:uppercase;color:#a79f93;
                }
                .de-details input,.de-details textarea{
                    font-family:'Lora',Georgia,serif;font-size:14px;letter-spacing:0;
                    text-transform:none;color:#ede5d8;background:#0d0b09;
                    border:1px solid #2a2520;border-radius:3px;padding:8px 10px;resize:vertical;
                }
                .de-details input[aria-invalid="true"],.de-details textarea[aria-invalid="true"]{border-color:#6a3a32;}
                .de-covers{grid-column:1 / -1;display:flex;gap:8px;align-items:center;flex-wrap:wrap;}
                .de-covers button{
                    width:52px;height:64px;padding:0;border:1px solid #3a362e;border-radius:3px;
                    overflow:hidden;background:#0d0b09;cursor:pointer;
                }
                .de-covers button[aria-pressed="true"]{border-color:#c4a882;outline:1px solid #c4a882;}
                .de-covers img{width:100%;height:100%;object-fit:cover;display:block;}
                .de-cover-mark{width:28px;height:36px;object-fit:cover;border-radius:2px;border:1px solid #3a362e;flex-shrink:0;}
                .de-details-actions{grid-column:1 / -1;display:flex;gap:8px;align-items:center;flex-wrap:wrap;color:#a79f93;font-size:12px;}
                @media (max-width:720px){
                    .de-details{grid-template-columns:1fr;}
                    .de-header{flex-wrap:wrap;align-items:flex-start;gap:10px;padding:10px 14px;}
                    .de-header-actions{width:100%;justify-content:flex-start;flex-wrap:wrap;gap:8px;}
                    .de-ghost-btn{padding:6px 10px;letter-spacing:0.12em;}
                    .de-body{flex-direction:column;}
                    .de-left{
                        width:100%;max-height:min(280px,36vh);flex-shrink:0;
                        border-right:none;border-bottom:1px solid #1a1814;
                    }
                    #de-editor{padding:52px 18px 48px;}
                    .de-link input{flex-basis:100%;}
                    .de-footer{padding:9px 14px;gap:8px;flex-wrap:wrap;}
                    .de-discard{padding:8px 14px;}
                    .de-save-btn,.de-footer-actions{margin-left:auto;}
                    .de-kbd-hint{display:none;}
                }

                /* Back link */
                .de-back{
                    font-family:'JetBrains Mono',monospace;
                    font-size:10px;letter-spacing:0.25em;text-transform:uppercase;
                    color:#9b9286;text-decoration:none;transition:color 0.15s;flex-shrink:0;
                }
                .de-back:hover{color:#e0d6c8;}

                .de-date{
                    display:flex;align-items:center;gap:8px;
                    font-family:'JetBrains Mono',monospace;font-size:9px;
                    letter-spacing:0.16em;text-transform:uppercase;color:#a79f93;
                }
                .de-date input{
                    font-family:'JetBrains Mono',monospace;font-size:11px;letter-spacing:0.04em;
                    text-transform:none;color:#ede5d8;background:#0d0b09;
                    border:1px solid #2a2520;border-radius:3px;padding:4px 6px;color-scheme:dark;
                }
                .de-date input:focus{outline:none;border-color:#6a5a48;}
                .de-viewing-badge{
                    font-family:'JetBrains Mono',monospace;
                    font-size:9px;letter-spacing:0.22em;text-transform:uppercase;
                    color:#c4a882;border:1px solid #4a3a28;
                    padding:3px 10px;border-radius:2px;background:#0d0b09;
                    position:absolute;top:14px;right:20px;z-index:5;pointer-events:none;
                }

                .de-fade{animation:defade 0.25s ease forwards;opacity:0;}
                @keyframes defade{to{opacity:1;transform:translateY(0);}from{opacity:0;transform:translateY(3px);}}
            `}</style>

            <div className="de-root" onKeyDown={handleKeyDown}>

                {/* HEADER */}
                <header className="de-header">
                    <div style={{ display: "flex", alignItems: "center", gap: 18, minWidth: 0 }}>
                        <Link
                            href="/diary"
                            className="de-back"
                            onClick={(event) => {
                                if (!isDirty) return;
                                event.preventDefault();
                                askToDiscard(() => router.push("/diary"));
                            }}
                        >
                            ← back
                        </Link>
                        <div style={{ width: 1, height: 14, background: "#252018", flexShrink: 0 }} />
                        {cover && (
                            <Image
                                src={cover.textureUrl}
                                alt=""
                                width={28}
                                height={36}
                                className="de-cover-mark"
                            />
                        )}
                        <div style={{ minWidth: 0 }}>
                            <h1 style={{ fontFamily: "'Lora',Georgia,serif", fontSize: 15, fontWeight: 500, color: "#ede5d8", margin: 0, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", letterSpacing: "0.01em" }}>
                                {diary?.title || "Untitled"}
                            </h1>
                            {diary?.description && (
                                <p className="de-mono" style={{ fontSize: 10, color: "#8f8679", margin: 0, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", letterSpacing: "0.04em" }}>
                                    {diary.description}
                                </p>
                            )}
                        </div>
                    </div>
                    <div className="de-header-actions">
                        <span className="de-mono" style={{ fontSize: 10, color: "#8f8679", letterSpacing: "0.15em" }}>
                            {entries.length} {entries.length === 1 ? "entry" : "entries"}
                        </span>
                        <button type="button" onClick={() => void downloadExport("md")} className="de-ghost-btn" disabled={isExporting !== null}>
                            {isExporting === "md" ? "exporting" : "export"}
                        </button>
                        <button type="button" onClick={() => setDetailsOpen((open) => !open)} className="de-ghost-btn">
                            {detailsOpen ? "close details" : "details"}
                        </button>
                        <button type="button" onClick={handleNewEntry} className="de-ghost-btn">+ new entry</button>
                    </div>
                </header>

                {detailsOpen && (
                    <form
                        className="de-details"
                        onSubmit={(event) => {
                            event.preventDefault();
                            void handleSaveDiary();
                        }}
                    >
                        <label htmlFor="diary-details-title">
                            <span id="diary-details-title-label">Title</span>
                            <input
                                id="diary-details-title"
                                value={diaryDraft.title}
                                maxLength={TITLE_MAX}
                                aria-labelledby="diary-details-title-label"
                                aria-invalid={Boolean(detailsTitleMessage)}
                                aria-describedby={detailsTitleMessage ? "diary-details-title-error" : undefined}
                                onChange={(event) => setDiaryDraft((draft) => ({ ...draft, title: event.target.value }))}
                            />
                            {detailsTitleMessage && (
                                <p id="diary-details-title-error" className="de-field-error">{detailsTitleMessage}</p>
                            )}
                        </label>
                        <label htmlFor="diary-details-description">
                            <span id="diary-details-description-label">Description</span>
                            <textarea
                                id="diary-details-description"
                                value={diaryDraft.description}
                                maxLength={DESCRIPTION_MAX}
                                rows={2}
                                aria-labelledby="diary-details-description-label"
                                aria-invalid={Boolean(detailsDescriptionMessage)}
                                aria-describedby={detailsDescriptionMessage ? "diary-details-description-error" : undefined}
                                onChange={(event) => setDiaryDraft((draft) => ({ ...draft, description: event.target.value }))}
                            />
                            {detailsDescriptionMessage && (
                                <p id="diary-details-description-error" className="de-field-error">{detailsDescriptionMessage}</p>
                            )}
                        </label>
                        <div className="de-covers" role="group" aria-label="Cover">
                            {DIARY_THEMES.map((theme) => (
                                <button
                                    key={theme.textureUrl}
                                    type="button"
                                    aria-label={theme.name}
                                    aria-pressed={diaryDraft.theme === theme.textureUrl}
                                    onClick={() => setDiaryDraft((draft) => ({ ...draft, theme: theme.textureUrl }))}
                                >
                                    <Image src={theme.textureUrl} alt="" width={52} height={64} />
                                </button>
                            ))}
                        </div>
                        <div className="de-details-actions">
                            <button type="submit" className="de-save-btn" disabled={!canSaveDetails || isSavingDiary}>
                                {isSavingDiary ? "saving" : "save details"}
                            </button>
                            <button type="button" className="de-ghost-btn" onClick={() => void downloadExport("json")} disabled={isExporting !== null}>
                                {isExporting === "json" ? "exporting" : "json backup"}
                            </button>
                            {confirmDelete === "diary" ? (
                                <>
                                    <span>Delete this diary and every entry?</span>
                                    <button type="button" className="de-danger-btn" onClick={() => void handleDeleteDiary()} disabled={isSavingDiary}>
                                        delete diary
                                    </button>
                                    <button type="button" className="de-ghost-btn" onClick={() => setConfirmDelete(null)}>cancel</button>
                                </>
                            ) : (
                                <button type="button" className="de-danger-btn" onClick={() => setConfirmDelete("diary")}>
                                    delete diary
                                </button>
                            )}
                        </div>
                    </form>
                )}

                {/* TOOLBAR — hidden while reading a saved entry */}
                {mode !== "view" && (
                    <div className="de-toolbar">
                        {TOOLBAR.map((group, gi) => (
                            <div key={gi} style={{ display: "flex", alignItems: "center", gap: 1 }}>
                                {gi > 0 && <div className="de-toolbar-sep" />}
                                {group.map((btn) => {
                                    const active = btn.format ? activeFormats.has(btn.format) : false;
                                    return (
                                    <button
                                        key={btn.title}
                                        type="button"
                                        title={btn.title}
                                        onClick={() => runTool(btn)}
                                        aria-label={btn.title}
                                        {...(btn.format ? { "aria-pressed": active } : {})}
                                        className={`de-tbtn${active ? " on" : ""}`}
                                        onMouseDown={e => e.preventDefault()}
                                    >
                                        {btn.icon}
                                    </button>
                                    );
                                })}
                            </div>
                        ))}
                    </div>
                )}

                {linkOpen && mode !== "view" && (
                    <form className="de-link" onSubmit={applyLink}>
                        <label htmlFor="entry-link-url">Link</label>
                        <input
                            id="entry-link-url"
                            ref={linkInputRef}
                            value={linkDraft}
                            placeholder="https://example.com"
                            aria-invalid={Boolean(linkError)}
                            aria-describedby={linkError ? "entry-link-error" : undefined}
                            onChange={(event) => {
                                setLinkDraft(event.target.value);
                                if (linkError) setLinkError(null);
                            }}
                            onKeyDown={(event) => {
                                if (event.key === "Escape") {
                                    event.preventDefault();
                                    closeLinkField();
                                }
                            }}
                        />
                        <button type="submit" className="de-save-btn">{linkHasAnchor ? "update link" : "add link"}</button>
                        {linkHasAnchor && (
                            <button type="button" className="de-ghost-btn" onClick={removeLink}>remove</button>
                        )}
                        <button type="button" className="de-ghost-btn" onClick={closeLinkField}>cancel</button>
                        {linkError && <p id="entry-link-error" className="de-link-error">{linkError}</p>}
                    </form>
                )}

                {/* BODY */}
                <div className="de-body">

                    {/* LEFT */}
                    <aside className="de-left">
                        <div className="de-mono" style={{ padding: "16px 16px 10px", fontSize: 9, letterSpacing: "0.35em", textTransform: "uppercase", color: "#a79f93" }}>
                            Past Entries
                        </div>
                        {entries.length > 0 && (
                            <input
                                className="de-entry-search"
                                type="search"
                                value={entryQuery}
                                onChange={(event) => setEntryQuery(event.target.value)}
                                placeholder="Find an entry"
                                aria-label="Find an entry"
                                maxLength={80}
                            />
                        )}
                        {months.length > 1 && (
                            <select
                                className="de-month"
                                aria-label="Month"
                                value={activeMonth}
                                onChange={(event) => setEntryMonth(event.target.value)}
                            >
                                <option value="">All months</option>
                                {months.map((month) => (
                                    <option key={month.key} value={month.key}>
                                        {month.label} ({month.count})
                                    </option>
                                ))}
                            </select>
                        )}
                        {entries.length === 0 ? (
                            <div style={{ flex: 1, display: "flex", alignItems: "center", justifyContent: "center", padding: "0 20px 48px" }}>
                                <p style={{ fontFamily: "'Lora',Georgia,serif", fontStyle: "italic", color: "#a79f93", fontSize: 13, textAlign: "center", lineHeight: 1.8 }}>
                                    Nothing written yet.
                                </p>
                            </div>
                        ) : visibleEntries.length === 0 ? (
                            <p style={{ padding: "8px 20px 24px", fontFamily: "'Lora',Georgia,serif", fontStyle: "italic", color: "#a79f93", fontSize: 13, lineHeight: 1.8 }}>
                                {emptyEntryListMessage(entryQuery, activeMonth)}
                            </p>
                        ) : (
                            visibleEntries.map((entry, i) => {
                                const active = selectedEntryId === entry._id;
                                const preview = entryPreview(entry);
                                return (
                                    <button
                                        key={entry._id}
                                        type="button"
                                        onClick={() => handleEntrySelect(entry)}
                                        className={`de-entry-card de-fade${active ? " active" : ""}`}
                                        style={{ animationDelay: `${i * 25}ms` }}
                                    >
                                        <div className="de-mono" style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", marginBottom: 6, gap: 4 }}>
                                            <span style={{ fontSize: 9, letterSpacing: "0.18em", textTransform: "uppercase", color: active ? "#d5c3a6" : "#9b9286" }}>
                                                {fmtShort(entry.createdAt)}
                                            </span>
                                            <span style={{ fontSize: 9, color: "#7d746a", flexShrink: 0 }}>
                                                {entryWasRevised(entry.createdAt, entry.updatedAt) ? "edited" : fmtTime(entry.createdAt)}
                                            </span>
                                        </div>
                                        <p style={{ fontFamily: "'Lora',Georgia,serif", fontStyle: "italic", fontSize: 12, lineHeight: 1.65, color: active ? "#e0d6c8" : "#bfb6aa", margin: 0, overflow: "hidden", display: "-webkit-box", WebkitLineClamp: 2, WebkitBoxOrient: "vertical", wordBreak: "break-word" }}>
                                            {preview || "—"}
                                        </p>
                                    </button>
                                );
                            })
                        )}
                    </aside>

                    {/* RIGHT */}
                    <section className="de-right">
                        {statusLabel && (
                            <div className="de-viewing-badge de-fade">
                                {statusLabel}
                            </div>
                        )}

                        <div className="de-editor-wrap">
                            <div
                                id="de-editor"
                                ref={editorRef}
                                contentEditable={mode !== "view"}
                                aria-label="Diary entry"
                                suppressContentEditableWarning
                                onInput={onInput}
                                onFocus={updateActiveFormats}
                                onKeyUp={updateActiveFormats}
                                onMouseUp={updateActiveFormats}
                                spellCheck={false}
                                onPaste={onPaste}
                                data-gramm="false"
                                data-gramm_editor="false"
                                data-enable-grammarly="false"
                            />
                        </div>

                        {pendingDiscard && (
                            <div className="de-discard" role="group" aria-labelledby="discard-prompt">
                                <p id="discard-prompt" style={{ margin: 0 }}>Discard unsaved changes?</p>
                                <button
                                    ref={discardButtonRef}
                                    type="button"
                                    className="de-danger-btn"
                                    onClick={confirmDiscard}
                                >
                                    discard
                                </button>
                                <button type="button" className="de-ghost-btn" onClick={() => setPendingDiscard(null)}>keep editing</button>
                            </div>
                        )}

                        {/* Footer */}
                        <div className="de-footer">
                            <div className="de-mono" style={{ display: "flex", alignItems: "center", gap: 12, fontSize: 10, color: "#8f8679", letterSpacing: "0.1em", flexWrap: "wrap" }}>
                                {mode !== "view" && (
                                    <label className="de-date">
                                        Date
                                        <input
                                            type="date"
                                            value={entryDate}
                                            min="1970-01-01"
                                            max={calendarDate(new Date())}
                                            aria-label="Entry date"
                                            onChange={(event) => changeEntryDate(event.target.value)}
                                        />
                                    </label>
                                )}
                                <span>{wc} words</span>
                                <span style={{ width: 1, height: 10, background: "#2a2520", display: "inline-block" }} />
                                <span>{entryWritingText(htmlContent).length} chars</span>
                                {mode !== "view" && (
                                    <>
                                        <span style={{ width: 1, height: 10, background: "#2a2520", display: "inline-block" }} />
                                        <span className="de-kbd-hint">ctrl+s to save</span>
                                    </>
                                )}
                                {mode === "view" && (
                                    <><span style={{ width: 1, height: 10, background: "#2a2520", display: "inline-block" }} />
                                        <span style={{ color: "#9b8b78", fontStyle: "italic" }}>read only</span>
                                    </>
                                )}
                            </div>

                            {mode === "view" ? (
                                <div className="de-footer-actions">
                                    {confirmDelete === "entry" ? (
                                        <>
                                            <span className="de-mono" style={{ fontSize: 10, color: "#c4a882" }}>Delete this entry?</span>
                                            <button type="button" className="de-danger-btn" onClick={() => void handleDeleteEntry()} disabled={isSaving}>delete</button>
                                            <button type="button" className="de-ghost-btn" onClick={() => setConfirmDelete(null)}>cancel</button>
                                        </>
                                    ) : (
                                        <>
                                            <button type="button" className="de-ghost-btn" onClick={() => { setMode("edit"); setConfirmDelete(null); setBaseline(htmlContent); }}>edit</button>
                                            <button type="button" className="de-danger-btn" onClick={() => setConfirmDelete("entry")}>delete</button>
                                            <button type="button" className="de-ghost-btn" onClick={() => askToDiscard(resetComposer)}>✕ close</button>
                                        </>
                                    )}
                                </div>
                            ) : (
                                <div className="de-footer-actions">
                                    {mode === "edit" && selectedEntryId && (
                                        <button
                                            type="button"
                                            className="de-ghost-btn"
                                            onClick={() => {
                                                const entry = entries.find((item) => item._id === selectedEntryId);
                                                if (entry) revertToSaved(entry);
                                            }}
                                        >
                                            cancel
                                        </button>
                                    )}
                                    <button type="button" onClick={handleSave} disabled={!canSave || isSaving} className="de-save-btn">
                                        {isSaving
                                            ? <><span style={{ width: 10, height: 10, borderRadius: "50%", border: "1px solid #c4a882", borderTopColor: "transparent", animation: "spin 1s linear infinite", display: "inline-block" }} />saving</>
                                            : mode === "edit" ? "update entry" : "save entry"
                                        }
                                    </button>
                                </div>
                            )}
                        </div>
                    </section>
                </div>
            </div>

            {/* Hidden file input for image upload */}
            <input
                ref={fileInputRef}
                type="file"
                accept="image/png,image/jpeg,image/gif,image/webp"
                style={{ display: "none" }}
                onChange={handleImageUpload}
            />

            <Toaster />
        </>
    );
};

export default DiaryEditorClient;
