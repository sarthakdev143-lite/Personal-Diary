"use client";

import { useEffect, useRef, useState, useCallback } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useToast } from "@/hooks/use-toast";
import { Toaster } from "@/components/ui/toaster";

type Diary = { _id: string; title: string; description: string; theme: string; createdAt: string; updatedAt: string; };
type Entry = { _id: string; diaryId: string; userId: string; content: string; createdAt: string; updatedAt: string; };
type DiaryResponse = { diary: Diary; entries: Entry[]; };

const fmtShort = (v: string) => {
    const d = new Date(v);
    if (isNaN(d.getTime())) return "—";
    return new Intl.DateTimeFormat("en-US", { day: "numeric", month: "short", year: "numeric" }).format(d);
};
const fmtTime = (v: string) => {
    const d = new Date(v);
    if (isNaN(d.getTime())) return "";
    return new Intl.DateTimeFormat("en-US", { hour: "2-digit", minute: "2-digit" }).format(d);
};
const fmtLong = (v: string) => {
    const d = new Date(v);
    if (isNaN(d.getTime())) return "—";
    return new Intl.DateTimeFormat("en-US", { weekday: "long", day: "numeric", month: "long", year: "numeric" }).format(d);
};
const todayHeader = () => `<h2>${fmtLong(new Date().toISOString())}</h2><p><br></p>`;

const wordCount = (html: string) => {
    const text = html.replace(/<[^>]*>/g, " ").replace(/&nbsp;/g, " ").trim();
    return text ? text.split(/\s+/).filter(Boolean).length : 0;
};

// Toolbar button definition
type ToolBtn = { icon: string; title: string; action: () => void; active?: boolean };

const DiaryEditorClient = ({ diaryId }: { diaryId: string }) => {
    const router = useRouter();
    const { toast } = useToast();
    const editorRef = useRef<HTMLDivElement>(null);
    const fileInputRef = useRef<HTMLInputElement>(null);

    const [diary, setDiary] = useState<Diary | null>(null);
    const [entries, setEntries] = useState<Entry[]>([]);
    const [htmlContent, setHtmlContent] = useState("");
    const [selectedEntryId, setSelectedEntryId] = useState<string | null>(null);
    const [isViewingOld, setIsViewingOld] = useState(false);
    const [isLoading, setIsLoading] = useState(true);
    const [isSaving, setIsSaving] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [activeFormats, setActiveFormats] = useState<Set<string>>(new Set());

    useEffect(() => {
        let mounted = true;
        (async () => {
            try {
                const res = await fetch(`/api/diaries/${diaryId}`, { cache: "no-store" });
                const data = await res.json() as Partial<DiaryResponse> & { error?: string };
                if (!res.ok) throw new Error(data.error || "Failed to load.");
                if (!mounted) return;
                setDiary(data.diary!);
                setEntries(data.entries!);
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

    const handleImageUpload = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;
        const reader = new FileReader();
        reader.onload = (ev) => {
            const src = ev.target?.result as string;
            insertHTML(`<img src="${src}" style="max-width:100%;border-radius:6px;margin:12px 0;" /><p><br></p>`);
        };
        reader.readAsDataURL(file);
        e.target.value = "";
    }, [insertHTML]);

    const handleNewEntry = () => {
        setSelectedEntryId(null);
        setIsViewingOld(false);
        const html = todayHeader();
        setHtmlContent(html);
        if (editorRef.current) {
            editorRef.current.innerHTML = html;
            editorRef.current.focus();
            const range = document.createRange();
            range.selectNodeContents(editorRef.current);
            range.collapse(false);
            window.getSelection()?.removeAllRanges();
            window.getSelection()?.addRange(range);
        }
    };

    const handleEntrySelect = (entry: Entry) => {
        if (selectedEntryId === entry._id) {
            setSelectedEntryId(null);
            setIsViewingOld(false);
            setHtmlContent("");
            if (editorRef.current) editorRef.current.innerHTML = "";
            return;
        }
        setSelectedEntryId(entry._id);
        setIsViewingOld(true);
        setHtmlContent(entry.content);
        if (editorRef.current) editorRef.current.innerHTML = entry.content;
    };

    const handleSave = async () => {
        const trimmed = htmlContent.replace(/<[^>]*>/g, "").trim();
        if (!trimmed || isSaving || isViewingOld) return;
        setIsSaving(true);
        try {
            const res = await fetch(`/api/diaries/${diaryId}/entries`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ content: htmlContent, createdAt: new Date().toISOString() }),
            });
            const data = await res.json() as Entry & { error?: string };
            if (!res.ok) throw new Error(data.error || "Failed to save.");
            setEntries(prev => [data, ...prev]);
            setHtmlContent("");
            setSelectedEntryId(null);
            setIsViewingOld(false);
            if (editorRef.current) editorRef.current.innerHTML = "";
            toast({ title: "Saved", description: fmtLong(data.createdAt) });
        } catch (e) {
            toast({ title: "Not saved", description: e instanceof Error ? e.message : "Error", variant: "destructive" });
        } finally {
            setIsSaving(false);
        }
    };

    const handleKeyDown = (e: React.KeyboardEvent) => {
        if ((e.ctrlKey || e.metaKey) && e.key === "s") { e.preventDefault(); handleSave(); }
    };

    // Build toolbar buttons
    const toolbarGroups: ToolBtn[][] = [
        [
            { icon: "H1", title: "Heading 1", action: () => exec("formatBlock", "h1"), active: activeFormats.has("h1") },
            { icon: "H2", title: "Heading 2", action: () => exec("formatBlock", "h2"), active: activeFormats.has("h2") },
            { icon: "H3", title: "Heading 3", action: () => exec("formatBlock", "h3"), active: activeFormats.has("h3") },
        ],
        [
            { icon: "B", title: "Bold (Ctrl+B)", action: () => exec("bold"), active: activeFormats.has("bold") },
            { icon: "I", title: "Italic (Ctrl+I)", action: () => exec("italic"), active: activeFormats.has("italic") },
            { icon: "U", title: "Underline (Ctrl+U)", action: () => exec("underline"), active: activeFormats.has("underline") },
            { icon: "S̶", title: "Strikethrough", action: () => exec("strikeThrough"), active: activeFormats.has("strikethrough") },
        ],
        [
            { icon: "≡", title: "Bullet list", action: () => exec("insertUnorderedList"), active: activeFormats.has("ul") },
            { icon: "1.", title: "Numbered list", action: () => exec("insertOrderedList"), active: activeFormats.has("ol") },
            { icon: "❝", title: "Blockquote", action: () => exec("formatBlock", "blockquote"), active: activeFormats.has("blockquote") },
            { icon: "—", title: "Divider", action: () => insertHTML("<hr/><p><br></p>") },
        ],
        [
            { icon: "🖼", title: "Insert image", action: () => fileInputRef.current?.click() },
            { icon: "⬛", title: "Code block", action: () => insertHTML('<pre><code>code here</code></pre><p><br></p>') },
            { icon: "🔗", title: "Insert link", action: () => { const url = prompt("URL:"); if (url) exec("createLink", url); } },
        ],
        [
            { icon: "⟵", title: "Undo", action: () => exec("undo") },
            { icon: "⟶", title: "Redo", action: () => exec("redo") },
        ],
    ];

    const wc = wordCount(htmlContent);
    const canSave = htmlContent.replace(/<[^>]*>/g, "").trim().length > 0 && !isViewingOld;

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

                *{box-sizing:border-box;margin:0;padding:0;}

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

                /* Toolbar */
                .de-toolbar{
                    flex-shrink:0;
                    display:flex;align-items:center;gap:2px;flex-wrap:wrap;
                    padding:6px 16px;
                    background:#111009;
                    border-bottom:1px solid #1e1c18;
                }
                .de-toolbar-sep{width:1px;height:18px;background:#2a2520;margin:0 4px;flex-shrink:0;}
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

                /* Back link */
                .de-back{
                    font-family:'JetBrains Mono',monospace;
                    font-size:10px;letter-spacing:0.25em;text-transform:uppercase;
                    color:#9b9286;text-decoration:none;transition:color 0.15s;flex-shrink:0;
                }
                .de-back:hover{color:#e0d6c8;}

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
                        <Link href="/diary" className="de-back">← back</Link>
                        <div style={{ width: 1, height: 14, background: "#252018", flexShrink: 0 }} />
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
                    <div style={{ display: "flex", alignItems: "center", gap: 12, flexShrink: 0 }}>
                        <span className="de-mono" style={{ fontSize: 10, color: "#8f8679", letterSpacing: "0.15em" }}>
                            {entries.length} {entries.length === 1 ? "entry" : "entries"}
                        </span>
                        <button onClick={handleNewEntry} className="de-ghost-btn">+ new entry</button>
                    </div>
                </header>

                {/* TOOLBAR — only when not viewing old */}
                {!isViewingOld && (
                    <div className="de-toolbar">
                        {toolbarGroups.map((group, gi) => (
                            <div key={gi} style={{ display: "flex", alignItems: "center", gap: 1 }}>
                                {gi > 0 && <div className="de-toolbar-sep" />}
                                {group.map((btn, bi) => (
                                    <button
                                        key={bi}
                                        type="button"
                                        title={btn.title}
                                        onClick={btn.action}
                                        className={`de-tbtn${btn.active ? " on" : ""}`}
                                        onMouseDown={e => e.preventDefault()} // prevent focus loss
                                    >
                                        {btn.icon}
                                    </button>
                                ))}
                            </div>
                        ))}
                    </div>
                )}

                {/* BODY */}
                <div className="de-body">

                    {/* LEFT */}
                    <aside className="de-left">
                        <div className="de-mono" style={{ padding: "16px 16px 10px", fontSize: 9, letterSpacing: "0.35em", textTransform: "uppercase", color: "#a79f93" }}>
                            Past Entries
                        </div>
                        {entries.length === 0 ? (
                            <div style={{ flex: 1, display: "flex", alignItems: "center", justifyContent: "center", padding: "0 20px 48px" }}>
                                <p style={{ fontFamily: "'Lora',Georgia,serif", fontStyle: "italic", color: "#a79f93", fontSize: 13, textAlign: "center", lineHeight: 1.8 }}>
                                    Nothing written yet.
                                </p>
                            </div>
                        ) : (
                            entries.map((entry, i) => {
                                const active = selectedEntryId === entry._id;
                                const preview = entry.content.replace(/<[^>]*>/g, " ").replace(/\s+/g, " ").trim().slice(0, 90);
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
                                            <span style={{ fontSize: 9, color: "#7d746a", flexShrink: 0 }}>{fmtTime(entry.createdAt)}</span>
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
                        {isViewingOld && (
                            <div className="de-viewing-badge de-fade">
                                viewing · {fmtShort(entries.find(e => e._id === selectedEntryId)?.createdAt || "")}
                            </div>
                        )}

                        <div className="de-editor-wrap">
                            <div
                                id="de-editor"
                                ref={editorRef}
                                contentEditable={!isViewingOld}
                                suppressContentEditableWarning
                                onInput={onInput}
                                onFocus={updateActiveFormats}
                                onKeyUp={updateActiveFormats}
                                onMouseUp={updateActiveFormats}
                                spellCheck={false}
                                data-gramm="false"
                                data-gramm_editor="false"
                                data-enable-grammarly="false"
                            />
                        </div>

                        {/* Footer */}
                        <div className="de-footer">
                            <div className="de-mono" style={{ display: "flex", alignItems: "center", gap: 12, fontSize: 10, color: "#8f8679", letterSpacing: "0.1em" }}>
                                <span>{wc} words</span>
                                <span style={{ width: 1, height: 10, background: "#2a2520", display: "inline-block" }} />
                                <span>{htmlContent.replace(/<[^>]*>/g, "").length} chars</span>
                                {!isViewingOld && (
                                    <>
                                        <span style={{ width: 1, height: 10, background: "#2a2520", display: "inline-block" }} />
                                        <span style={{ color: "#8f8679" }}>ctrl+s to save</span>
                                    </>
                                )}
                                {isViewingOld && (
                                    <><span style={{ width: 1, height: 10, background: "#2a2520", display: "inline-block" }} />
                                        <span style={{ color: "#9b8b78", fontStyle: "italic" }}>read only</span>
                                    </>
                                )}
                            </div>

                            {!isViewingOld ? (
                                <button onClick={handleSave} disabled={!canSave || isSaving} className="de-save-btn">
                                    {isSaving
                                        ? <><span style={{ width: 10, height: 10, borderRadius: "50%", border: "1px solid #c4a882", borderTopColor: "transparent", animation: "spin 1s linear infinite", display: "inline-block" }} />saving</>
                                        : "save entry"
                                    }
                                </button>
                            ) : (
                                <button onClick={() => { setSelectedEntryId(null); setIsViewingOld(false); setHtmlContent(""); if (editorRef.current) editorRef.current.innerHTML = ""; }} className="de-ghost-btn">
                                    ✕ close
                                </button>
                            )}
                        </div>
                    </section>
                </div>
            </div>

            {/* Hidden file input for image upload */}
            <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                style={{ display: "none" }}
                onChange={handleImageUpload}
            />

            <Toaster />
        </>
    );
};

export default DiaryEditorClient;
