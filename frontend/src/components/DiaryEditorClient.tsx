"use client";

import { useEffect, useLayoutEffect, useMemo, useRef, useState, useCallback } from "react";
import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useToast } from "@/hooks/use-toast";
import { Toaster } from "@/components/ui/toaster";
import { ToastAction } from "@/components/ui/toast";
import { MatchedText } from "@/components/MatchedText";
import { DESCRIPTION_MAX, DIARY_THEMES, TITLE_MAX, coverForTheme, isAllowedTheme } from "@/lib/diary/constants";
import { entryShareMarkdown } from "@/lib/diary/export";
import { appliedPin, pinFailureMessage } from "@/lib/diary/pin";
import { codeBlockHtml } from "@/lib/diary/markup";
import { takeImportNotice } from "@/lib/diary/import";
import { entryDraftKey, entryDraftRecord, offerEntryDraft, readEntryDraft, restoredDraftTarget, type EntryDraft } from "@/lib/diary/draft";
import { decideEntryDrop, decideEntryPaste, imageFileIssue, imageHtml, lineAfterPictureKey, pictureCaptionKey, selectedPictureKey } from "@/lib/diary/paste";
import { entryCardPreview, entryMatchCursor, entryMatchesListQuery, entryPageAddress, entryShareAddress } from "@/lib/diary/search";
import { commandKeyLabel, saveEntryShortcut } from "@/lib/diary/shortcut";
import { calendarDate, emptyEntryListMessage, entriesWithRestored, entryCardQuery, entryFindKeyAction, entryInMonth, entryInstant, entryLayerEscape, entryLinkUrl, entryMonths, entrySelectionAction, entryToOpenForFilter, entryToOpenFromLink, entryToOpenWhenHidden, entryToShowAfterDelete, entryToShowByStep, entryUndoBody, entryWasRevised, entryWritingText, formatEntryLong, formatEntryTime, formatDiaryDate, freshEntryHtml, hasEntryContent, monthForSavedEntry, retitleEntryDate, showOpenEntry, wordCount } from "@/lib/diary/text";
import { normalizeDescription, normalizeTitle } from "@/lib/diary/validation";

type Diary = { _id: string; title: string; description: string; theme: string; pinned?: boolean; createdAt: string; updatedAt: string; };
type Entry = { _id: string; diaryId: string; content: string; plainText?: string; createdAt: string; updatedAt: string; };
type DiaryResponse = { diary: Diary; entries: Entry[]; };
type EditorMode = "compose" | "view" | "edit";

const fmtShort = formatDiaryDate;
const fmtTime = formatEntryTime;
const fmtLong = formatEntryLong;

function showFindMarks(root: HTMLElement, query: string, activeIndex: number): HTMLElement | null {
    const needle = query.trim();
    if (!needle) return null;
    const lower = needle.toLowerCase();
    const hits: { node: Text; index: number }[] = [];
    const walker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT);
    let node = walker.nextNode();
    while (node) {
        const text = (node.textContent ?? "").toLowerCase();
        let from = 0;
        while (from <= text.length - needle.length) {
            const index = text.indexOf(lower, from);
            if (index < 0) break;
            hits.push({ node: node as Text, index });
            from = index + needle.length;
        }
        node = walker.nextNode();
    }
    if (!hits.length) return null;
    const current = ((activeIndex % hits.length) + hits.length) % hits.length;
    let currentMark: HTMLElement | null = null;
    for (let hitIndex = hits.length - 1; hitIndex >= 0; hitIndex -= 1) {
        const hit = hits[hitIndex];
        const range = document.createRange();
        range.setStart(hit.node, hit.index);
        range.setEnd(hit.node, hit.index + needle.length);
        const mark = document.createElement("mark");
        mark.className = hitIndex === current ? "de-find de-find-current" : "de-find";
        try {
            range.surroundContents(mark);
        } catch {
            continue;
        }
        if (hitIndex === current) currentMark = mark;
    }
    return currentMark;
}

// Toolbar button definition
type ToolButton = {
    icon: string;
    title: string;
    format?: string;
    command?: string;
    value?: string;
    html?: string;
    kind?: "image" | "link" | "code";
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
        { icon: "</>", title: "Code block", kind: "code" },
        { icon: "🔗", title: "Insert link", kind: "link", format: "link" },
    ],
    [
        { icon: "⟵", title: "Undo", command: "undo" },
        { icon: "⟶", title: "Redo", command: "redo" },
    ],
];

function captionCaret(caption: HTMLElement, selection: Selection): { collapsed: boolean; atStart: boolean; atEnd: boolean } | null {
    if (!selection.rangeCount) return null;
    const range = selection.getRangeAt(0);
    if (!caption.contains(range.startContainer) || !caption.contains(range.endContainer)) return null;
    const before = document.createRange();
    before.selectNodeContents(caption);
    before.setEnd(range.startContainer, range.startOffset);
    const after = document.createRange();
    after.selectNodeContents(caption);
    after.setStart(range.endContainer, range.endOffset);
    return {
        collapsed: range.collapsed,
        atStart: before.toString().length === 0,
        atEnd: after.toString().length === 0,
    };
}

function lineAfterPicture(editor: HTMLElement, selection: Selection): { block: HTMLElement; caption: HTMLElement; atStart: boolean; empty: boolean } | null {
    if (!selection.rangeCount || !selection.anchorNode) return null;
    const range = selection.getRangeAt(0);
    const anchor = selection.anchorNode;
    const host = anchor instanceof Element ? anchor : anchor.parentElement;
    const block = host?.closest("p, h1, h2, h3, li, blockquote, pre");
    if (!(block instanceof HTMLElement) || !editor.contains(block)) return null;
    const figure = block.previousElementSibling;
    if (!(figure instanceof HTMLElement) || figure.tagName !== "FIGURE") return null;
    const caption = figure.querySelector("figcaption");
    if (!(caption instanceof HTMLElement)) return null;
    if (!block.contains(range.startContainer) || !block.contains(range.endContainer)) return null;
    const before = document.createRange();
    before.selectNodeContents(block);
    before.setEnd(range.startContainer, range.startOffset);
    return {
        block,
        caption,
        atStart: before.toString().length === 0,
        empty: (block.textContent ?? "").replace(/\u00a0/g, " ").trim().length === 0,
    };
}

function selectedFigure(editor: HTMLElement, selection: Selection): HTMLElement | null {
    if (!selection.rangeCount || selection.isCollapsed) return null;
    const range = selection.getRangeAt(0);
    if (range.startContainer !== range.endContainer || range.startContainer.nodeType !== Node.ELEMENT_NODE) return null;
    const parent = range.startContainer as HTMLElement;
    const node = parent.childNodes[range.startOffset];
    if (!(node instanceof HTMLImageElement) || range.endOffset !== range.startOffset + 1) return null;
    const figure = node.closest("figure");
    if (!(figure instanceof HTMLElement) || !editor.contains(figure)) return null;
    return figure;
}

function placeCaretAtStart(node: HTMLElement) {
    const selection = window.getSelection();
    if (!selection) return;
    const caret = document.createRange();
    caret.selectNodeContents(node);
    caret.collapse(true);
    selection.removeAllRanges();
    selection.addRange(caret);
}

function placeCaretAtEnd(node: HTMLElement) {
    const selection = window.getSelection();
    if (!selection) return;
    const caret = document.createRange();
    caret.selectNodeContents(node);
    caret.collapse(false);
    selection.removeAllRanges();
    selection.addRange(caret);
}

function continueAfterPicture(caption: HTMLElement) {
    const figure = caption.closest("figure");
    const selection = window.getSelection();
    if (!figure || !selection || !selection.rangeCount) return;
    const range = selection.getRangeAt(0);
    const before = document.createRange();
    before.selectNodeContents(caption);
    before.setEnd(range.startContainer, range.startOffset);
    const after = document.createRange();
    after.selectNodeContents(caption);
    after.setStart(range.endContainer, range.endOffset);
    const rest = after.toString();
    caption.textContent = before.toString();
    const paragraph = document.createElement("p");
    if (rest) paragraph.textContent = rest;
    else paragraph.appendChild(document.createElement("br"));
    figure.after(paragraph);
    const caret = document.createRange();
    if (rest && paragraph.firstChild) caret.setStart(paragraph.firstChild, 0);
    else caret.setStart(paragraph, 0);
    caret.collapse(true);
    selection.removeAllRanges();
    selection.addRange(caret);
}

const DiaryEditorClient = ({ diaryId }: { diaryId: string }) => {
    const router = useRouter();
    const { toast } = useToast();
    const editorRef = useRef<HTMLDivElement>(null);
    const fileInputRef = useRef<HTMLInputElement>(null);
    const entryClock = useRef(new Date());
    const restoreEntryRef = useRef<(entry: Entry) => void>(() => {});
    const linkInputRef = useRef<HTMLInputElement>(null);
    const imageAltRef = useRef<HTMLInputElement>(null);
    const entrySearchRef = useRef<HTMLInputElement>(null);
    const saveHintRef = useRef<HTMLSpanElement>(null);
    const linkRange = useRef<Range | null>(null);
    const imageRange = useRef<Range | null>(null);
    const discardButtonRef = useRef<HTMLButtonElement>(null);

    const [diary, setDiary] = useState<Diary | null>(null);
    const [entries, setEntries] = useState<Entry[]>([]);
    const [htmlContent, setHtmlContent] = useState("");
    const [selectedEntryId, setSelectedEntryId] = useState<string | null>(null);
    const [mode, setMode] = useState<EditorMode>("compose");
    const [isLoading, setIsLoading] = useState(true);
    const [isSaving, setIsSaving] = useState(false);
    const [isSavingDiary, setIsSavingDiary] = useState(false);
    const [isPinningDiary, setIsPinningDiary] = useState(false);
    const [pinError, setPinError] = useState<string | null>(null);
    const [error, setError] = useState<string | null>(null);
    const [activeFormats, setActiveFormats] = useState<Set<string>>(new Set());
    const [detailsOpen, setDetailsOpen] = useState(false);
    const [diaryDraft, setDiaryDraft] = useState({ title: "", description: "", theme: "" });
    const [confirmDelete, setConfirmDelete] = useState<"entry" | "diary" | null>(null);
    const [baseline, setBaseline] = useState("");
    const [entryQuery, setEntryQuery] = useState("");
    const [matchAt, setMatchAt] = useState(0);
    const [matchCount, setMatchCount] = useState(0);
    const matchCountRef = useRef(0);
    const matchKey = `${selectedEntryId ?? ""}:${entryQuery}`;
    const [matchKeySeen, setMatchKeySeen] = useState(matchKey);
    if (matchKey !== matchKeySeen) {
        setMatchKeySeen(matchKey);
        setMatchAt(0);
    }
    const [entryMonth, setEntryMonth] = useState("");
    const [isExporting, setIsExporting] = useState<"md" | "json" | null>(null);
    const [entryDate, setEntryDate] = useState(() => calendarDate(new Date()));
    const [savedDate, setSavedDate] = useState(() => calendarDate(new Date()));
    const [linkOpen, setLinkOpen] = useState(false);
    const [pictureQueue, setPictureQueue] = useState<string[]>([]);
    const [pictureTotal, setPictureTotal] = useState(0);
    const pendingImage = pictureQueue[0] ?? null;
    const pictureIndex = pictureQueue.length === 0 ? 0 : pictureTotal - pictureQueue.length + 1;
    const pictureLabel = pictureTotal > 1 ? `Picture ${pictureIndex} of ${pictureTotal}` : "Picture";
    const [imageAlt, setImageAlt] = useState("");
    const [linkDraft, setLinkDraft] = useState("");
    const [linkError, setLinkError] = useState<string | null>(null);
    const [linkHasAnchor, setLinkHasAnchor] = useState(false);
    const [pendingDiscard, setPendingDiscard] = useState<(() => void) | null>(null);
    const [keptDraft, setKeptDraft] = useState<EntryDraft | null>(null);

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
                const requestedId = new URLSearchParams(window.location.search).get("entry");
                const latest = entryToOpenFromLink(loaded, requestedId);
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
                const draftKey = entryDraftKey(diaryId);
                let resumeDraft = false;
                try {
                    const stored = readEntryDraft(window.sessionStorage.getItem(draftKey));
                    if (offerEntryDraft(stored, loaded)) {
                        setKeptDraft(stored);
                        resumeDraft = true;
                    } else {
                        window.sessionStorage.removeItem(draftKey);
                    }
                } catch {
                    setKeptDraft(null);
                }
                if (!latest && !resumeDraft && mounted) {
                    const now = new Date();
                    const day = calendarDate(now);
                    const html = freshEntryHtml(now.toISOString());
                    setEntryDate(day);
                    setSavedDate(day);
                    entryClock.current = now;
                    setBaseline(html);
                    setHtmlContent(html);
                }
            } catch (e) {
                if (mounted) setError(e instanceof Error ? e.message : "Failed to load.");
            } finally {
                if (mounted) setIsLoading(false);
            }
        })();
        return () => { mounted = false; };
    }, [diaryId]);

    useEffect(() => {
        if (isLoading) return;
        const next = entryPageAddress(diaryId, selectedEntryId, mode);
        const current = `${window.location.pathname}${window.location.search}`;
        if (current === next) return;
        window.history.replaceState(window.history.state, "", next);
    }, [isLoading, diaryId, mode, selectedEntryId]);

    useEffect(() => {
        if (isLoading) return;
        const requestedId = new URLSearchParams(window.location.search).get("entry");
        if (!requestedId || requestedId !== selectedEntryId) return;
        document.querySelector(".de-entry-card.active")?.scrollIntoView({ block: "nearest" });
    }, [isLoading, selectedEntryId]);

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
        if (!pendingImage) return;
        imageAltRef.current?.focus();
    }, [pendingImage, pictureIndex]);

    useEffect(() => {
        if (mode !== "view") return;
        setPictureQueue([]);
        setPictureTotal(0);
        setImageAlt("");
    }, [mode]);

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

    const startPictureQueue = (files: File[]) => {
        if (!files.length) return;
        const editor = editorRef.current;
        const selection = window.getSelection();
        imageRange.current = selection && selection.rangeCount > 0 && editor?.contains(selection.anchorNode)
            ? selection.getRangeAt(0).cloneRange()
            : null;
        let remaining = files.length;
        const sources = new Array<string>(files.length).fill("");
        const finish = () => {
            remaining -= 1;
            if (remaining > 0) return;
            const next = sources.filter((src) => src.length > 0);
            if (!next.length) return;
            setLinkOpen(false);
            setImageAlt("");
            setPictureTotal(next.length);
            setPictureQueue(next);
        };
        files.forEach((file, index) => {
            const reader = new FileReader();
            reader.onload = () => {
                sources[index] = typeof reader.result === "string" ? reader.result : "";
                finish();
            };
            reader.onerror = () => finish();
            reader.readAsDataURL(file);
        });
    };

    const insertImageFile = (file: File) => {
        startPictureQueue([file]);
    };

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
    }, [toast]);

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
        if (decision.action !== "image") return;
        if (decision.warning) {
            toast({ title: decision.warning.title, description: decision.warning.description, variant: "destructive" });
        }
        const imageFiles = Array.from(data.files).filter((item) => item.type.startsWith("image/"));
        const chosen = (decision.indexes ?? []).flatMap((index) => {
            const file = imageFiles[index];
            return file ? [file] : [];
        });
        if (chosen.length) startPictureQueue(chosen);
    };

    const onEditorDragOver = (event: React.DragEvent<HTMLDivElement>) => {
        if (![...event.dataTransfer.types].includes("Files")) return;
        event.preventDefault();
    };

    const onEditorDrop = (event: React.DragEvent<HTMLDivElement>) => {
        const files = Array.from(event.dataTransfer.files);
        if (!files.length) return;
        event.preventDefault();
        if (mode === "view") return;
        const decision = decideEntryDrop(files.map((file) => ({ type: file.type, size: file.size })));
        if (decision.action === "reject") {
            toast({ title: decision.title, description: decision.description, variant: "destructive" });
            return;
        }
        if (decision.action !== "image") return;
        if (decision.warning) {
            toast({ title: decision.warning.title, description: decision.warning.description, variant: "destructive" });
        }
        const chosen = (decision.indexes ?? []).flatMap((index) => {
            const file = files[index];
            return file ? [file] : [];
        });
        if (chosen.length) startPictureQueue(chosen);
    };

    const writeEditor = (html: string) => {
        setBaseline(html);
        setHtmlContent(html);
        setLinkOpen(false);
        if (editorRef.current) editorRef.current.innerHTML = html;
    };

    useLayoutEffect(() => {
        const editor = editorRef.current;
        if (isLoading || !editor || !htmlContent) return;
        if (editor.innerHTML) return;
        editor.innerHTML = htmlContent;
        if (editor.getAttribute("contenteditable") !== "true") return;
        editor.focus();
        const range = document.createRange();
        range.selectNodeContents(editor);
        range.collapse(false);
        const selection = window.getSelection();
        selection?.removeAllRanges();
        selection?.addRange(range);
    }, [isLoading, htmlContent]);

    const isDirty = mode !== "view" && (htmlContent !== baseline || entryDate !== savedDate);

    useEffect(() => {
        if (!isDirty) return;
        setKeptDraft(null);
    }, [isDirty]);

    const wroteDraft = useRef(false);

    useEffect(() => {
        if (isLoading) return;
        if (keptDraft && !isDirty) return;
        const key = entryDraftKey(diaryId);
        try {
            const raw = entryDraftRecord({
                diaryId,
                entryId: mode === "compose" ? null : selectedEntryId,
                content: htmlContent,
                baseline,
                entryDate,
                savedDate,
            });
            if (raw) {
                window.sessionStorage.setItem(key, raw);
                wroteDraft.current = true;
                return;
            }
            if (wroteDraft.current && !keptDraft) {
                window.sessionStorage.removeItem(key);
                wroteDraft.current = false;
            }
        } catch {
            // The browser refused to keep the writing.
        }
    }, [isLoading, keptDraft, isDirty, diaryId, mode, selectedEntryId, htmlContent, baseline, entryDate, savedDate]);

    useEffect(() => {
        if (isLoading) return;
        const notice = takeImportNotice();
        if (notice) toast(notice);
    }, [isLoading, toast]);

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

    const restoreKeptDraft = () => {
        if (!keptDraft) return;
        const target = restoredDraftTarget(keptDraft, entries);
        const entry = target === "edit" ? entries.find((item) => item._id === keptDraft.entryId) : undefined;
        if (entry) {
            setSelectedEntryId(entry._id);
            setMode("edit");
            setBaseline(entry.content);
            const created = new Date(entry.createdAt);
            setSavedDate(calendarDate(created));
            entryClock.current = created;
        } else {
            setSelectedEntryId(null);
            setMode("compose");
            setBaseline(keptDraft.baseline);
            setSavedDate(keptDraft.entryDate);
        }
        setConfirmDelete(null);
        setEntryDate(keptDraft.entryDate);
        setHtmlContent(keptDraft.content);
        setLinkOpen(false);
        if (editorRef.current) editorRef.current.innerHTML = keptDraft.content;
        setKeptDraft(null);
        window.requestAnimationFrame(() => editorRef.current?.focus());
    };

    const discardKeptDraft = () => {
        try {
            window.sessionStorage.removeItem(entryDraftKey(diaryId));
        } catch {
            // The notice can still close when storage is unavailable.
        }
        setKeptDraft(null);
        if (entries.length === 0 && !selectedEntryId && !hasEntryContent(htmlContent)) {
            const now = new Date();
            rememberDate(calendarDate(now), now);
            writeEditor(freshEntryHtml(now.toISOString()));
        }
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
        writeEditor(freshEntryHtml(now.toISOString()));
    };

    const handleNewEntry = () => {
        askToDiscard(() => {
            resetComposer();
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
            if (!entryMatchesListQuery(data, entryQuery)) setEntryQuery("");
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
        const removedId = selectedEntryId;
        const removed = entries.find((entry) => entry._id === removedId);
        const next = entryToShowAfterDelete(visibleEntries, removedId)
            ?? entryToShowAfterDelete(entries, removedId);
        const staysInList = visibleEntries.some((entry) => entry._id === next?._id);
        setIsSaving(true);
        try {
            const res = await fetch(`/api/diaries/${diaryId}/entries/${removedId}`, { method: "DELETE" });
            const data = await res.json().catch(() => null) as { error?: string } | null;
            if (!res.ok) throw new Error(data?.error || "Failed to delete entry.");
            setEntries((prev) => prev.filter((entry) => entry._id !== removedId));
            if (!next) {
                resetComposer();
            } else {
                setSelectedEntryId(next._id);
                setMode("view");
                setConfirmDelete(null);
                const created = new Date(next.createdAt);
                rememberDate(calendarDate(created), created);
                writeEditor(next.content);
                if (!staysInList) {
                    setEntryMonth(monthForSavedEntry(next.createdAt, entryMonth));
                    if (!entryMatchesListQuery(next, entryQuery)) setEntryQuery("");
                }
            }
            toast({
                title: "Entry deleted",
                description: removed ? fmtLong(removed.createdAt) : undefined,
                duration: 12000,
                action: removed ? (
                    <ToastAction
                        altText="Bring this entry back"
                        onClick={(event) => {
                            event.preventDefault();
                            restoreEntryRef.current(removed);
                        }}
                    >
                        Undo
                    </ToastAction>
                ) : undefined,
            });
        } catch (e) {
            toast({ title: "Not deleted", description: e instanceof Error ? e.message : "Error", variant: "destructive" });
        } finally {
            setIsSaving(false);
        }
    };

    const restoreEntry = async (entry: Entry) => {
        setIsSaving(true);
        try {
            const res = await fetch(`/api/diaries/${diaryId}/entries`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(entryUndoBody(entry)),
            });
            const data = await res.json() as Entry & { error?: string };
            if (!res.ok) throw new Error(data.error || "Failed to restore entry.");
            setEntries((prev) => entriesWithRestored(prev, data));
            setEntryMonth(monthForSavedEntry(data.createdAt, entryMonth));
            if (!entryMatchesListQuery(data, entryQuery)) setEntryQuery("");
            setSelectedEntryId(data._id);
            setMode("view");
            setConfirmDelete(null);
            setPendingDiscard(null);
            const created = new Date(data.createdAt);
            rememberDate(calendarDate(created), created);
            writeEditor(data.content);
            toast({ title: "Entry restored", description: fmtLong(data.createdAt) });
            window.setTimeout(() => {
                document.querySelector(".de-entry-card.active")?.scrollIntoView({ block: "nearest" });
            }, 0);
        } catch (restoreError) {
            toast({
                title: "Not restored",
                description: restoreError instanceof Error ? restoreError.message : "Error",
                variant: "destructive",
            });
        } finally {
            setIsSaving(false);
        }
    };

    restoreEntryRef.current = (entry) => {
        if (isSaving) return;
        askToDiscard(() => {
            void restoreEntry(entry);
        });
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

    const toggleDiaryPin = async () => {
        if (!diary || isPinningDiary) return;
        const requested = diary.pinned !== true;
        setIsPinningDiary(true);
        setPinError(null);
        try {
            const response = await fetch(`/api/diaries/${diaryId}`, {
                method: "PUT",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ pinned: requested }),
            });
            const saved: unknown = await response.json().catch(() => null);
            if (!response.ok) {
                setPinError(pinFailureMessage(saved));
                return;
            }
            setDiary(appliedPin(diary, saved && typeof saved === "object" ? saved : null, requested));
        } finally {
            setIsPinningDiary(false);
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

    const copyEntryText = async () => {
        if (!selectedEntry) return;
        const markdown = entryShareMarkdown(selectedEntry);
        try {
            await navigator.clipboard.writeText(markdown);
            toast({ title: "Text copied" });
        } catch {
            toast({ title: "Could not copy the text", variant: "destructive" });
        }
    };

    const copyEntryLink = async () => {
        if (!selectedEntryId) return;
        const address = entryShareAddress(window.location.origin, diaryId, selectedEntryId);
        try {
            await navigator.clipboard.writeText(address);
            toast({ title: "Link copied", description: address });
        } catch {
            toast({ title: "Copy this link", description: address });
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

    const closeLinkField = useCallback(() => {
        setLinkOpen(false);
        setLinkDraft("");
        setLinkError(null);
        setLinkHasAnchor(false);
        linkRange.current = null;
    }, []);

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
        setPictureQueue([]);
        setPictureTotal(0);
        setImageAlt("");
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

    const insertPendingImage = () => {
        const current = pictureQueue[0];
        if (!current) return;
        const editor = editorRef.current;
        editor?.focus();
        const selection = window.getSelection();
        if (editor && selection) {
            selection.removeAllRanges();
            const saved = imageRange.current;
            if (saved && editor.contains(saved.startContainer)) {
                selection.addRange(saved);
            } else {
                const range = document.createRange();
                range.selectNodeContents(editor);
                range.collapse(false);
                selection.addRange(range);
            }
        }
        insertHTML(imageHtml(current, imageAlt));
        const nextSelection = window.getSelection();
        imageRange.current = nextSelection && nextSelection.rangeCount > 0 && editor?.contains(nextSelection.anchorNode)
            ? nextSelection.getRangeAt(0).cloneRange()
            : null;
        const rest = pictureQueue.slice(1);
        setPictureQueue(rest);
        if (!rest.length) setPictureTotal(0);
        setImageAlt("");
    };

    const removeSelectedPicture = (e: React.KeyboardEvent) => {
        const editor = editorRef.current;
        const selection = window.getSelection();
        if (!editor || !selection || mode === "view") return false;
        const figure = selectedFigure(editor, selection);
        const action = selectedPictureKey({
            key: e.key,
            altKey: e.altKey,
            ctrlKey: e.ctrlKey,
            metaKey: e.metaKey,
            imageSelected: Boolean(figure),
        });
        if (action !== "remove" || !figure) return false;
        e.preventDefault();
        const next = figure.nextElementSibling;
        figure.remove();
        if (next instanceof HTMLElement && editor.contains(next)) {
            placeCaretAtStart(next);
        } else {
            const paragraph = document.createElement("p");
            paragraph.appendChild(document.createElement("br"));
            editor.appendChild(paragraph);
            placeCaretAtStart(paragraph);
        }
        setHtmlContent(editor.innerHTML);
        return true;
    };

    const keepPictureNameApart = (e: React.KeyboardEvent) => {
        const editor = editorRef.current;
        const selection = window.getSelection();
        if (!editor || !selection || mode === "view") return false;
        const line = lineAfterPicture(editor, selection);
        if (!line) return false;
        const action = lineAfterPictureKey({
            key: e.key,
            altKey: e.altKey,
            ctrlKey: e.ctrlKey,
            metaKey: e.metaKey,
            collapsed: selection.isCollapsed,
            atStart: line.atStart,
            empty: line.empty,
        });
        if (action === "pass") return false;
        e.preventDefault();
        if (action === "remove") line.block.remove();
        placeCaretAtEnd(line.caption);
        setHtmlContent(editor.innerHTML);
        return true;
    };

    const handleKeyDown = (e: React.KeyboardEvent) => {
        if (saveEntryShortcut(e)) {
            e.preventDefault();
            void handleSave();
            return;
        }
        if (mode === "view") return;
        if (removeSelectedPicture(e)) return;
        if (keepPictureNameApart(e)) return;
        const editor = editorRef.current;
        const selection = window.getSelection();
        const anchor = selection?.anchorNode;
        const host = anchor instanceof Element ? anchor : anchor?.parentElement ?? null;
        const caption = host?.closest("figcaption");
        if (!editor || !caption || !editor.contains(caption) || !selection) return;
        const caret = captionCaret(caption, selection);
        if (!caret) return;
        const action = pictureCaptionKey({
            key: e.key,
            shiftKey: e.shiftKey,
            altKey: e.altKey,
            ctrlKey: e.ctrlKey,
            metaKey: e.metaKey,
            collapsed: caret.collapsed,
            atStart: caret.atStart,
            atEnd: caret.atEnd,
        });
        if (action === "pass") return;
        e.preventDefault();
        if (action === "break") continueAfterPicture(caption);
        setHtmlContent(editor.innerHTML);
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
        if (tool.kind === "code") {
            const editor = editorRef.current;
            editor?.focus();
            const selection = window.getSelection();
            const anchor = selection?.anchorNode ?? null;
            const host = anchor instanceof Element ? anchor : anchor?.parentElement ?? null;
            const pre = host?.closest("pre");
            if (editor && pre && editor.contains(pre) && selection) {
                const range = document.createRange();
                range.setStartAfter(pre);
                range.collapse(true);
                selection.removeAllRanges();
                selection.addRange(range);
            }
            insertHTML(codeBlockHtml());
            const fresh = editor?.querySelector("code[data-fresh]");
            if (fresh) {
                fresh.removeAttribute("data-fresh");
                const range = document.createRange();
                range.selectNodeContents(fresh);
                const nextSelection = window.getSelection();
                nextSelection?.removeAllRanges();
                nextSelection?.addRange(range);
                setHtmlContent(editor?.innerHTML ?? "");
            }
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
        && entryMatchesListQuery(entry, entryQuery)
    );
    const entryOnScreen = showOpenEntry(visibleEntries, selectedEntryId, mode, Boolean(confirmDelete));

    const selectEntryRef = useRef(handleEntrySelect);
    useEffect(() => {
        selectEntryRef.current = handleEntrySelect;
    });

    useEffect(() => {
        const onKey = (event: KeyboardEvent) => {
            const layer = entryLayerEscape({
                key: event.key,
                altKey: event.altKey,
                ctrlKey: event.ctrlKey,
                metaKey: event.metaKey,
                pendingDiscard: Boolean(pendingDiscard),
                linkOpen,
                confirmDelete: Boolean(confirmDelete),
                detailsOpen,
            });
            if (layer === "discard") {
                event.preventDefault();
                setPendingDiscard(null);
                return;
            }
            if (layer === "link") {
                event.preventDefault();
                closeLinkField();
                return;
            }
            if (layer === "delete") {
                event.preventDefault();
                setConfirmDelete(null);
                return;
            }
            if (layer === "details") {
                event.preventDefault();
                setDetailsOpen(false);
                return;
            }
            if (mode !== "view" || detailsOpen || linkOpen || confirmDelete || pendingDiscard) return;

            const target = event.target;
            const inField = target instanceof HTMLElement && (
                target.tagName === "INPUT"
                || target.tagName === "TEXTAREA"
                || target.tagName === "SELECT"
                || target.isContentEditable
            );
            const findAction = entryFindKeyAction({
                key: event.key,
                altKey: event.altKey,
                ctrlKey: event.ctrlKey,
                metaKey: event.metaKey,
                shiftKey: event.shiftKey,
                inField,
                searchFocused: target === entrySearchRef.current,
                query: entryQuery,
            });
            if (findAction === "clear") {
                event.preventDefault();
                setEntryQuery("");
                return;
            }
            if (findAction === "close") {
                event.preventDefault();
                entrySearchRef.current?.blur();
                return;
            }
            if (findAction === "focus") {
                if (!entrySearchRef.current) return;
                event.preventDefault();
                entrySearchRef.current.focus();
                return;
            }
            if (event.key !== "ArrowDown" && event.key !== "ArrowUp") return;
            if (event.altKey || event.ctrlKey || event.metaKey || event.shiftKey || inField) return;
            const next = entryToShowByStep(
                visibleEntries,
                selectedEntryId,
                event.key === "ArrowDown" ? "next" : "previous",
            );
            if (!next) return;
            event.preventDefault();
            const card = document.querySelector<HTMLButtonElement>(entryCardQuery(next._id));
            card?.focus({ preventScroll: true });
            selectEntryRef.current(next);
            card?.scrollIntoView({ block: "nearest" });
        };

        window.addEventListener("keydown", onKey);
        return () => window.removeEventListener("keydown", onKey);
    }, [mode, detailsOpen, linkOpen, confirmDelete, pendingDiscard, visibleEntries, selectedEntryId, entryQuery, closeLinkField]);

    useEffect(() => {
        if (isLoading || !saveHintRef.current) return;
        saveHintRef.current.textContent = `${commandKeyLabel(navigator.platform)}+s to save`;
    }, [mode, isLoading]);

    useLayoutEffect(() => {
        const root = editorRef.current;
        if (!root || isLoading || !entryOnScreen) return;
        if (mode !== "view") {
            if (root.querySelector("mark.de-find")) root.innerHTML = htmlContent;
            if (matchCountRef.current !== 0) {
                matchCountRef.current = 0;
                setMatchCount(0);
            }
            return;
        }
        if (htmlContent) root.innerHTML = htmlContent;
        const mark = showFindMarks(root, entryQuery, matchAt);
        const count = root.querySelectorAll("mark.de-find").length;
        if (matchCountRef.current !== count) {
            matchCountRef.current = count;
            setMatchCount(count);
        }
        mark?.scrollIntoView({ block: "nearest" });
    }, [isLoading, entryOnScreen, mode, htmlContent, entryQuery, matchAt]);

    if (isLoading) return (
        <div style={{ position: "fixed", inset: 0, zIndex: 10, background: "#0d0b09", display: "flex", alignItems: "center", justifyContent: "center" }}>
            <div style={{ width: 28, height: 28, borderRadius: "50%", border: "2px solid #4a4030", borderTopColor: "#c4a882", animation: "spin 1s linear infinite" }} />
            <style>{`@keyframes spin{to{transform:rotate(360deg)}}`}</style>
            <Toaster viewportClassName="bottom-24 top-auto flex-col sm:bottom-16" />
        </div>
    );

    if (error) return (
        <div style={{ position: "fixed", inset: 0, zIndex: 10, background: "#0d0b09", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: 16 }}>
            <p style={{ fontFamily: "Georgia,serif", color: "#a09080", fontSize: 14 }}>{error}</p>
            <button onClick={() => router.push("/diary")} style={{ fontFamily: "monospace", color: "#8a7860", fontSize: 11, letterSpacing: "0.2em", textTransform: "uppercase", borderBottom: "1px solid #5a4a38", background: "none", cursor: "pointer" }}>← return</button>
            <Toaster viewportClassName="bottom-24 top-auto flex-col sm:bottom-16" />
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
                .de-picture-preview{
                    width:48px;height:36px;object-fit:cover;flex-shrink:0;
                    border-radius:3px;border:1px solid #2a2520;background:#0d0b09;
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
                    display:block;width:100%;text-align:left;color:inherit;
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
                .de-find-nav{
                    display:flex;align-items:center;gap:8px;margin:0 16px 8px;
                    font-family:'JetBrains Mono',monospace;font-size:10px;letter-spacing:0.08em;color:#a79f93;
                }
                .de-find-nav button{
                    font:inherit;letter-spacing:0.08em;text-transform:lowercase;color:#c4a882;
                    background:transparent;border:1px solid #3a3020;border-radius:3px;padding:2px 6px;cursor:pointer;
                }
                .de-find-nav button:hover{border-color:#c4a882;}
                .de-month{
                    display:block;width:calc(100% - 32px);margin:0 16px 8px;
                    font-family:'Lora',Georgia,serif;font-size:13px;color:#ede5d8;
                    background:#0d0b09;border:1px solid #2a2520;border-radius:3px;padding:8px 10px;
                    color-scheme:dark;
                }
                .de-entry-card:hover{background:#131109;}
                .de-entry-card.active{background:#161208;border-left-color:#c4a882;}
                .de-entry-card:focus-visible{outline:1px solid #c4a882;outline-offset:-2px;}
                .de-entry-card mark{background:#4a3b24;color:#f4ead8;padding:0 2px;border-radius:2px;font-style:inherit;}

                /* Right panel */
                .de-right{
                    flex:1;min-width:0;min-height:0;
                    display:flex;flex-direction:column;
                    position:relative;
                }

                /* Editor content area */
                .de-editor-wrap{flex:1;overflow-y:auto;position:relative;}
                .de-empty-read{
                    min-height:100%;
                    display:flex;align-items:center;justify-content:center;
                    padding:48px 64px;
                    font-family:'Lora',Georgia,serif;font-style:italic;
                    color:#a79f93;font-size:16px;line-height:1.8;text-align:center;
                }
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
                #de-editor mark.de-find{background:#3a3020;color:#f4ead8;padding:0 2px;border-radius:2px;}
                #de-editor mark.de-find-current{background:#c4a882;color:#1a140e;box-shadow:0 0 0 1px #e7d3b0;}

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
                #de-editor pre code{display:block;min-height:1.6em;}
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
                            <button
                                type="button"
                                className="de-ghost-btn"
                                onClick={() => void toggleDiaryPin()}
                                disabled={isPinningDiary || !diary}
                                aria-pressed={diary?.pinned === true}
                            >
                                {diary?.pinned === true ? "Unpin" : "Pin"}
                            </button>
                            {pinError && <p className="de-field-error" role="alert">{pinError}</p>}
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

                {pendingImage && mode !== "view" && (
                    <form
                        className="de-link"
                        onSubmit={(event) => {
                            event.preventDefault();
                            insertPendingImage();
                        }}
                    >
                        <label htmlFor="entry-image-alt">{pictureLabel}</label>
                        <img className="de-picture-preview" src={pendingImage} alt="" aria-hidden="true" />
                        <input
                            id="entry-image-alt"
                            ref={imageAltRef}
                            value={imageAlt}
                            placeholder="Description, optional"
                            onChange={(event) => setImageAlt(event.target.value)}
                            onKeyDown={(event) => {
                                if (event.key === "Escape") {
                                    event.preventDefault();
                                    setPictureQueue([]);
                                    setPictureTotal(0);
                                    setImageAlt("");
                                }
                            }}
                        />
                        <button type="submit" className="de-save-btn">insert picture</button>
                        <button
                            type="button"
                            className="de-ghost-btn"
                            onClick={() => {
                                setPictureQueue([]);
                                setPictureTotal(0);
                                setImageAlt("");
                            }}
                        >
                            cancel
                        </button>
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
                                ref={entrySearchRef}
                                className="de-entry-search"
                                type="search"
                                value={entryQuery}
                                onChange={(event) => {
                                    const query = event.target.value;
                                    setEntryQuery(query);
                                    const next = entryToOpenForFilter(
                                        entries.filter((entry) =>
                                            entryInMonth(entry.createdAt, activeMonth)
                                            && entryMatchesListQuery(entry, query)
                                        ),
                                        selectedEntryId,
                                    );
                                    if (!next) return;
                                    handleEntrySelect(next);
                                    window.requestAnimationFrame(() => {
                                        document.querySelector(".de-entry-card.active")?.scrollIntoView({ block: "nearest" });
                                    });
                                }}
                                placeholder="Find an entry"
                                aria-label="Find an entry"
                                maxLength={80}
                                onKeyDown={(event) => {
                                    if (event.key !== "Enter" || event.altKey || event.ctrlKey || event.metaKey) return;
                                    if (matchCount < 2) return;
                                    event.preventDefault();
                                    setMatchAt((current) => entryMatchCursor(matchCount, current, event.shiftKey ? "previous" : "next"));
                                }}
                            />
                        )}
                        {mode === "view" && matchCount > 1 && (
                            <div className="de-find-nav" role="group" aria-label="Matches in this entry">
                                <span>{(((matchAt % matchCount) + matchCount) % matchCount) + 1} of {matchCount}</span>
                                <button
                                    type="button"
                                    aria-label="Previous match"
                                    onClick={() => setMatchAt((current) => entryMatchCursor(matchCount, current, "previous"))}
                                >
                                    previous
                                </button>
                                <button
                                    type="button"
                                    aria-label="Next match"
                                    onClick={() => setMatchAt((current) => entryMatchCursor(matchCount, current, "next"))}
                                >
                                    next
                                </button>
                            </div>
                        )}
                        {months.length > 1 && (
                            <select
                                className="de-month"
                                aria-label="Month"
                                value={activeMonth}
                                onChange={(event) => {
                                    const month = event.target.value;
                                    setEntryMonth(month);
                                    const next = entryToOpenWhenHidden(
                                        entries.filter((entry) =>
                                            entryInMonth(entry.createdAt, month)
                                            && entryMatchesListQuery(entry, entryQuery)
                                        ),
                                        selectedEntryId,
                                    );
                                    if (next) handleEntrySelect(next);
                                }}
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
                                const preview = entryCardPreview(entry, entryQuery);
                                return (
                                    <button
                                        key={entry._id}
                                        type="button"
                                        data-entry-id={entry._id}
                                        aria-current={active ? "true" : undefined}
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
                                            {preview ? <MatchedText text={preview} query={entryQuery} /> : "—"}
                                        </p>
                                    </button>
                                );
                            })
                        )}
                    </aside>

                    {/* RIGHT */}
                    <section className="de-right">
                        {entryOnScreen && statusLabel && (
                            <div className="de-viewing-badge de-fade">
                                {statusLabel}
                            </div>
                        )}

                        <div className="de-editor-wrap">
                            {!entryOnScreen && (
                                <p className="de-empty-read" role="status">
                                    {emptyEntryListMessage(entryQuery, activeMonth)}
                                </p>
                            )}
                            <div
                                id="de-editor"
                                ref={editorRef}
                                hidden={!entryOnScreen}
                                contentEditable={mode !== "view"}
                                aria-label="Diary entry"
                                suppressContentEditableWarning
                                onInput={onInput}
                                onFocus={updateActiveFormats}
                                onKeyUp={updateActiveFormats}
                                onMouseUp={updateActiveFormats}
                                spellCheck={false}
                                onPaste={onPaste}
                                onDragOver={onEditorDragOver}
                                onDrop={onEditorDrop}
                                data-gramm="false"
                                data-gramm_editor="false"
                                data-enable-grammarly="false"
                            />
                        </div>

                        {keptDraft && !pendingDiscard && (
                            <div className="de-discard" role="group" aria-labelledby="kept-draft">
                                <p id="kept-draft" style={{ margin: 0 }}>Unsaved writing was kept.</p>
                                <button type="button" className="de-ghost-btn" onClick={restoreKeptDraft}>restore</button>
                                <button type="button" className="de-danger-btn" onClick={discardKeptDraft}>discard</button>
                            </div>
                        )}

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
                            {entryOnScreen && (
                            <>
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
                                        <span ref={saveHintRef} className="de-kbd-hint">ctrl+s to save</span>
                                    </>
                                )}
                                {mode === "view" && (
                                    <>
                                        <span style={{ width: 1, height: 10, background: "#2a2520", display: "inline-block" }} />
                                        <span style={{ color: "#9b8b78", fontStyle: "italic" }}>read only</span>
                                        {entries.length > 0 && (
                                            <>
                                                <span style={{ width: 1, height: 10, background: "#2a2520", display: "inline-block" }} />
                                                <span className="de-kbd-hint">/ find</span>
                                            </>
                                        )}
                                        {visibleEntries.length > 1 && (
                                            <>
                                                <span style={{ width: 1, height: 10, background: "#2a2520", display: "inline-block" }} />
                                                <span className="de-kbd-hint">↑↓ entries</span>
                                            </>
                                        )}
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
                                            {selectedEntryId && (
                                                <button type="button" className="de-ghost-btn" onClick={() => void copyEntryLink()}>copy link</button>
                                            )}
                                            {selectedEntry && (
                                                <button type="button" className="de-ghost-btn" onClick={() => void copyEntryText()}>copy text</button>
                                            )}
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
                            </>
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

            <Toaster viewportClassName="bottom-24 top-auto flex-col sm:bottom-16" />
        </>
    );
};

export default DiaryEditorClient;
