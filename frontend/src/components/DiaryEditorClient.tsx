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
import { captionUndoCaret, codePasteHtml, decideEntryDrop, decideEntryPaste, imageAltText, imageFileIssue, imageHtml, lineAfterPictureKey, pictureBoundsKey, pictureCaptionKey, pictureClick, pictureFormat, pictureMoveKey, pictureSelectionMark, pictureUndo, selectedPictureKey } from "@/lib/diary/paste";
import { diaryReturnAddress, diaryReturnQuery, entryCardPreview, entryFindAddress, entryFromAddress, entryListQueryAddress, entryMatchCursor, entryMatchesListQuery, entryMonthAddress, entryPageAddress, entryShareAddress, openedDiaryQuery, openedEntryMonth, textRunHits } from "@/lib/diary/search";
import { entryListStep } from "@/lib/diary/keys";
import { commandKeyLabel, saveEntryShortcut } from "@/lib/diary/shortcut";
import { calendarDate, emptyEntryListMessage, entryFindCountLabel, entriesWithRestored, entryCardQuery, entryFindKeyAction, entryInMonth, entryInstant, entryLayerEscape, entryLinkUrl, entryFindMonths, entrySelectionAction, entryToOpenForFilter, entryToOpenWhenHidden, entryToShowAfterDelete, codeLineKey, codeLeaveRemoval, codePullKey, codePullUndoCaret, dateHeadingKey, datePaste, dateSelectionKey, entryUndoBody, leadingDateLabel, entryWasRevised, entryWritingText, formatEntryLong, formatEntryTime, formatDiaryDate, freshEntryHtml, blankUndoCaret, joinUndoCaret, boundarySpaceCut, codeGap, dividerCaret, hasEntryContent, headingEnterKey, headingSplitUndo, splitSpace, plainGaps, plainMarkSpaces, plainSpacesAfterMarks, styleEdgeCut, styleShortcut, styleUndoCaret, formatUndoCommand, replacedSelectionUndo, dragSelectionUndo, pasteSelectionUndo, selectionCutUndo, selectionDeleteUndo, selectionEnterUndo, selectionTypeUndo, styledLine, wordDeleteSpan, wordDeleteGap, cutRemoval, wordGapInsert, wordGapKey, wordGapSpace, stickyUndo, stickyTyped, typedRedo, styledLineUndoCaret, styledPunctuation, styledSpace, joinGap, joinNeedsSpace, lineJoinKey, breakJoinKey, breakUndoMark, listCommand, listUndoCaret, listEdgeKey, listLeaveKey, listLeavePlace, listEnterKey, orderedItemNumber, quoteEnterKey, quoteLeaveKey, sameEditingPage, savedRedo, undoButton, monthForSavedEntry, retitleEntryDate, showOpenEntry, wordCount } from "@/lib/diary/text";
import { normalizeDescription, normalizeTitle } from "@/lib/diary/validation";

type Diary = { _id: string; title: string; description: string; theme: string; pinned?: boolean; createdAt: string; updatedAt: string; };
type Entry = { _id: string; diaryId: string; content: string; plainText?: string; createdAt: string; updatedAt: string; };
type DiaryResponse = { diary: Diary; entries: Entry[]; };
type EditorMode = "compose" | "view" | "edit";

const fmtShort = formatDiaryDate;
const fmtTime = formatEntryTime;
const fmtLong = formatEntryLong;

const FIND_BLOCKS = new Set(["ADDRESS", "ARTICLE", "ASIDE", "BLOCKQUOTE", "DIV", "DL", "FIGCAPTION", "FIGURE", "FOOTER", "H1", "H2", "H3", "H4", "H5", "H6", "HEADER", "HR", "LI", "OL", "P", "PRE", "SECTION", "TABLE", "TR", "UL"]);

function findRuns(root: HTMLElement): { node: Text; breakBefore: boolean }[] {
    const runs: { node: Text; breakBefore: boolean }[] = [];
    let breakBefore = false;
    const visit = (node: Node) => {
        if (node.nodeType === Node.TEXT_NODE) {
            runs.push({ node: node as Text, breakBefore });
            breakBefore = false;
            return;
        }
        if (node.nodeType !== Node.ELEMENT_NODE) return;
        const element = node as HTMLElement;
        if (element.tagName === "BR" || element.tagName === "HR") {
            breakBefore = true;
            return;
        }
        const block = FIND_BLOCKS.has(element.tagName);
        if (block && runs.length > 0) breakBefore = true;
        element.childNodes.forEach(visit);
        if (block) breakBefore = true;
    };
    root.childNodes.forEach(visit);
    return runs;
}

function showFindMarks(root: HTMLElement, query: string, activeIndex: number): { mark: HTMLElement | null; count: number } {
    const runs = findRuns(root);
    const matches = textRunHits(runs.map((run) => ({ text: run.node.textContent ?? "", breakBefore: run.breakBefore })), query);
    if (!matches.length) return { mark: null, count: 0 };
    const current = ((activeIndex % matches.length) + matches.length) % matches.length;
    let currentMark: HTMLElement | null = null;
    for (let matchIndex = matches.length - 1; matchIndex >= 0; matchIndex -= 1) {
        const className = matchIndex === current ? "de-find de-find-current" : "de-find";
        const slices = matches[matchIndex];
        let first: HTMLElement | null = null;
        for (let sliceIndex = slices.length - 1; sliceIndex >= 0; sliceIndex -= 1) {
            const slice = slices[sliceIndex];
            const textNode = runs[slice.run]?.node;
            const parent = textNode?.parentNode;
            if (!textNode || !parent) continue;
            const length = textNode.length;
            if (slice.end > length || slice.end <= slice.start) continue;
            let target = textNode;
            if (slice.end < target.length) target.splitText(slice.end);
            if (slice.start > 0) target = target.splitText(slice.start);
            const mark = document.createElement("mark");
            mark.className = className;
            parent.insertBefore(mark, target);
            mark.appendChild(target);
            first = mark;
        }
        if (matchIndex === current) currentMark = first;
    }
    return { mark: currentMark, count: matches.length };
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

function selectionTouchesPicture(editor: HTMLElement): boolean {
    const selection = window.getSelection();
    if (!selection?.rangeCount) return false;
    const range = selection.getRangeAt(0);
    const touches = (node: Node) => {
        const host = node instanceof Element ? node : node.parentElement;
        const figure = host?.closest("figure");
        return Boolean(figure && editor.contains(figure));
    };
    return touches(range.startContainer) || touches(range.endContainer);
}

function selectionCrossesPicture(editor: HTMLElement): { touchesPicture: boolean; outsideSelected: boolean } {
    const selection = window.getSelection();
    if (!selection?.rangeCount || selection.isCollapsed) return { touchesPicture: false, outsideSelected: false };
    const range = selection.getRangeAt(0);
    const figures = [...editor.querySelectorAll("figure")].filter((figure) => {
        try {
            return range.intersectsNode(figure);
        } catch {
            return false;
        }
    });
    if (!figures.length) return { touchesPicture: false, outsideSelected: false };
    const contained = figures.some((figure) => figure.contains(range.startContainer) && figure.contains(range.endContainer));
    return { touchesPicture: true, outsideSelected: !contained };
}

function protectedDateHeading(editor: HTMLElement, range: Range): HTMLElement | null {
    const heading = editor.firstElementChild;
    if (!(heading instanceof HTMLElement) || !/^H[1-3]$/.test(heading.tagName) || heading.querySelector("img")) return null;
    const text = (heading.textContent ?? "").replace(/\u00a0/g, " ").replace(/\s+/g, " ").trim();
    if (!leadingDateLabel(text)) return null;
    try {
        return range.intersectsNode(heading) ? heading : null;
    } catch {
        return null;
    }
}

function captionSlice(caption: HTMLElement, range: Range): Range | null {
    try {
        if (!range.intersectsNode(caption)) return null;
    } catch {
        return null;
    }
    const piece = range.cloneRange();
    if (!caption.contains(range.startContainer)) piece.setStart(caption, 0);
    if (!caption.contains(range.endContainer)) piece.setEnd(caption, caption.childNodes.length);
    return piece.collapsed ? null : piece;
}

function deleteOutsideProtected(range: Range, keep: HTMLElement[]) {
    const sorted = [...keep].sort((left, right) => (left.compareDocumentPosition(right) & Node.DOCUMENT_POSITION_FOLLOWING ? -1 : 1));
    let guard = 0;
    while (!range.collapsed && guard < 12) {
        guard += 1;
        const startKeep = sorted.find((node) => node.isConnected && node.contains(range.startContainer));
        if (startKeep) {
            range.setStartAfter(startKeep);
            continue;
        }
        const upcoming = sorted.find((node) => {
            if (!node.isConnected) return false;
            try {
                return range.intersectsNode(node);
            } catch {
                return false;
            }
        });
        const piece = range.cloneRange();
        if (upcoming) piece.setEndBefore(upcoming);
        if (!piece.collapsed) piece.deleteContents();
        if (!upcoming || upcoming.contains(range.endContainer)) return;
        range.setStartAfter(upcoming);
    }
}

function tidyLeadingSpace(root: HTMLElement) {
    const first = document.createTreeWalker(root, NodeFilter.SHOW_TEXT).nextNode();
    if (first instanceof Text) first.data = first.data.replace(/^[ \u00a0]+/, "");
}

function syncPictureAlt(figure: HTMLElement) {
    const caption = figure.querySelector("figcaption");
    const image = figure.querySelector("img");
    if (!(caption instanceof HTMLElement) || !(image instanceof HTMLImageElement)) return;
    const alt = imageAltText(caption.textContent ?? "");
    if (alt) image.setAttribute("alt", alt);
    else image.removeAttribute("alt");
}

function separatePictureSelection(editor: HTMLElement, selection: Selection, typing: boolean): HTMLElement | null {
    const range = selection.getRangeAt(0);
    const figures = [...editor.querySelectorAll("figure")].filter((figure): figure is HTMLElement => {
        try {
            return range.intersectsNode(figure);
        } catch {
            return false;
        }
    });
    const date = protectedDateHeading(editor, range);
    const keep = date ? [date, ...figures] : [...figures];
    const endInside = figures.some((figure) => figure.contains(range.endContainer));
    const captionPieces = figures.flatMap((figure) => {
        const caption = figure.querySelector("figcaption");
        if (!(caption instanceof HTMLElement)) return [];
        const piece = captionSlice(caption, range);
        return piece ? [{ caption, piece, figure }] : [];
    });
    const touched = [...editor.querySelectorAll("p, h1, h2, h3, li, blockquote")].filter((block): block is HTMLElement => {
        if (keep.some((node) => node === block || node.contains(block) || block.contains(node))) return false;
        try {
            return range.intersectsNode(block);
        } catch {
            return false;
        }
    });
    deleteOutsideProtected(range.cloneRange(), keep);
    for (const item of captionPieces) {
        if (!item.caption.isConnected || item.piece.collapsed) continue;
        item.piece.deleteContents();
        item.caption.querySelectorAll("b, strong, i, em, u, s, strike, del").forEach((node) => {
            if (!(node.textContent ?? "").replace(/[\u00a0\s]/g, "")) node.remove();
        });
        if (!(typing && endInside)) tidyLeadingSpace(item.caption);
        const last = [...item.caption.childNodes].reverse().find((node): node is Text => node instanceof Text);
        if (last) last.data = last.data.replace(/[ \u00a0]+$/, "");
        if (!(item.caption.textContent ?? "").replace(/[\u00a0\s]/g, "")) item.caption.replaceChildren(document.createElement("br"));
        syncPictureAlt(item.figure);
    }
    for (const block of touched) {
        if (!block.isConnected) continue;
        tidyLeadingSpace(block);
        if (!(block.textContent ?? "").replace(/[\u00a0\s]/g, "")) block.remove();
    }
    const lastFigure = figures.filter((figure) => figure.isConnected).at(-1) ?? null;
    if (!endInside && lastFigure) {
        const emptied = lastFigure.nextElementSibling;
        if (emptied instanceof HTMLElement && touched.includes(emptied) && !(emptied.textContent ?? "").replace(/[\u00a0\s]/g, "")) emptied.remove();
        const next = lastFigure.nextElementSibling;
        if (next instanceof HTMLElement && editor.contains(next)) {
            placeCaretAtStart(next);
            return next;
        }
        if (typing) {
            const paragraph = document.createElement("p");
            paragraph.appendChild(document.createElement("br"));
            lastFigure.after(paragraph);
            placeCaretAtStart(paragraph);
            return paragraph;
        }
    }
    const caption = captionPieces.find((item) => item.caption.isConnected)?.caption ?? null;
    if (caption instanceof HTMLElement) {
        const text = document.createTreeWalker(caption, NodeFilter.SHOW_TEXT).nextNode();
        const caret = document.createRange();
        if (text instanceof Text) caret.setStart(text, 0);
        else {
            caret.selectNodeContents(caption);
            caret.collapse(true);
        }
        caret.collapse(true);
        selection.removeAllRanges();
        selection.addRange(caret);
        return caption;
    }
    return lastFigure;
}

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

function selectedImage(editor: HTMLElement, selection: Selection): HTMLImageElement | null {
    if (!selection.rangeCount || selection.isCollapsed) return null;
    const range = selection.getRangeAt(0);
    if (range.startContainer !== range.endContainer || range.startContainer.nodeType !== Node.ELEMENT_NODE) return null;
    const parent = range.startContainer as HTMLElement;
    const node = parent.childNodes[range.startOffset];
    if (!(node instanceof HTMLImageElement) || range.endOffset !== range.startOffset + 1 || !editor.contains(node)) return null;
    return node;
}

function clearPictureMark(image: Element) {
    image.classList.remove("de-selected");
    if (image instanceof HTMLElement && image.classList.length === 0) image.removeAttribute("class");
}

function adjacentBlock(block: HTMLElement, direction: "next" | "previous"): Element | null {
    const sibling = direction === "next" ? block.nextElementSibling : block.previousElementSibling;
    if (sibling) return sibling;
    const parent = block.parentElement;
    if (parent && parent.id !== "de-editor" && (parent.tagName === "UL" || parent.tagName === "OL" || parent.tagName === "BLOCKQUOTE")) {
        return direction === "next" ? parent.nextElementSibling : parent.previousElementSibling;
    }
    return null;
}

function pictureMoveContext(editor: HTMLElement, selection: Selection): {
    where: "before" | "after" | "both" | "caption" | "selected" | "figure";
    atStart: boolean;
    atEnd: boolean;
    figure: HTMLElement;
    image: HTMLImageElement | null;
    previousFigure: HTMLElement | null;
    nextFigure: HTMLElement | null;
} | null {
    const selected = selectedImage(editor, selection);
    if (selected) {
        const owner = selected.closest("figure");
        const figure = owner instanceof HTMLElement && editor.contains(owner) ? owner : selected;
        return { where: "selected", atStart: false, atEnd: false, figure, image: selected, previousFigure: null, nextFigure: null };
    }
    const anchor = selection.anchorNode;
    if (!anchor) return null;
    const host = anchor instanceof Element ? anchor : anchor.parentElement;
    const caption = host?.closest("figcaption");
    if (caption instanceof HTMLElement && editor.contains(caption)) {
        const figure = caption.closest("figure");
        if (!(figure instanceof HTMLElement) || !selection.isCollapsed) return null;
        const caret = captionCaret(caption, selection);
        if (!caret) return null;
        const image = figure.querySelector("img");
        return {
            where: "caption",
            atStart: caret.atStart,
            atEnd: caret.atEnd,
            figure,
            image: image instanceof HTMLImageElement ? image : null,
            previousFigure: null,
            nextFigure: null,
        };
    }
    const owner = host?.closest("figure");
    if (owner instanceof HTMLElement && editor.contains(owner)) {
        const image = owner.querySelector("img");
        return {
            where: "figure",
            atStart: false,
            atEnd: false,
            figure: owner,
            image: image instanceof HTMLImageElement ? image : null,
            previousFigure: null,
            nextFigure: null,
        };
    }
    if (!selection.isCollapsed) return null;
    const block = host?.closest("p, h1, h2, h3, li, blockquote, pre");
    if (!(block instanceof HTMLElement) || !editor.contains(block)) return null;
    const edge = captionCaret(block, selection);
    if (!edge) return null;
    const next = edge.atEnd ? adjacentBlock(block, "next") : null;
    const previous = edge.atStart ? adjacentBlock(block, "previous") : null;
    const nextFigure = next instanceof HTMLElement && next.tagName === "FIGURE" && editor.contains(next) ? next : null;
    const previousFigure = previous instanceof HTMLElement && previous.tagName === "FIGURE" && editor.contains(previous) ? previous : null;
    if (!nextFigure && !previousFigure) return null;
    const where = nextFigure && previousFigure ? "both" : nextFigure ? "before" : "after";
    const figure = (where === "after" ? previousFigure : nextFigure) ?? previousFigure;
    if (!figure) return null;
    const image = figure.querySelector("img");
    return {
        where,
        atStart: edge.atStart,
        atEnd: edge.atEnd,
        figure,
        image: image instanceof HTMLImageElement ? image : null,
        previousFigure,
        nextFigure,
    };
}

function caretInsidePicture(editor: HTMLElement, selection: Selection): HTMLImageElement | null {
    if (!selection.isCollapsed || !selection.anchorNode || !editor.contains(selection.anchorNode)) return null;
    const anchor = selection.anchorNode;
    const host = anchor instanceof Element ? anchor : anchor.parentElement;
    if (!host || host.closest("figcaption")) return null;
    const figure = host.closest("figure");
    if (!(figure instanceof HTMLElement) || !editor.contains(figure)) return null;
    const image = figure.querySelector("img");
    return image instanceof HTMLImageElement ? image : null;
}

function selectPictureImage(image: HTMLImageElement) {
    const selection = window.getSelection();
    if (!selection) return;
    const range = document.createRange();
    range.selectNode(image);
    selection.removeAllRanges();
    selection.addRange(range);
}

function moveBesidePicture(figure: HTMLElement, direction: "before" | "after") {
    const neighbor = direction === "before" ? figure.previousElementSibling : figure.nextElementSibling;
    if (neighbor instanceof HTMLElement && neighbor.tagName === "FIGURE") {
        const image = neighbor.querySelector("img");
        if (image instanceof HTMLImageElement) {
            selectPictureImage(image);
            return;
        }
    }
    if (neighbor instanceof HTMLElement) {
        if (direction === "before") placeCaretAtEnd(neighbor);
        else placeCaretAtStart(neighbor);
        return;
    }
    if (direction === "after") {
        const paragraph = document.createElement("p");
        paragraph.appendChild(document.createElement("br"));
        figure.after(paragraph);
        placeCaretAtStart(paragraph);
    }
}

function typePictureName(picture: HTMLElement, image: HTMLImageElement, key: string, selection: Selection) {
    if (picture.tagName === "FIGURE") {
        let caption = picture.querySelector("figcaption");
        if (!(caption instanceof HTMLElement)) {
            caption = document.createElement("figcaption");
            picture.appendChild(caption);
        }
        placeCaretAtEnd(caption);
        if (!document.execCommand("insertText", false, key)) {
            caption.textContent = `${caption.textContent ?? ""}${key}`;
            placeCaretAtEnd(caption);
        }
        return;
    }
    const caret = document.createRange();
    caret.setStartAfter(image);
    caret.collapse(true);
    selection.removeAllRanges();
    selection.addRange(caret);
    if (!document.execCommand("insertText", false, key)) {
        const text = document.createTextNode(key);
        image.after(text);
    }
}

function dateLineContext(editor: HTMLElement, selection: Selection, label: string): {
    where: "heading" | "after";
    heading: HTMLElement;
    block: HTMLElement;
    atStart: boolean;
    empty: boolean;
    followed: boolean;
} | null {
    if (!label || !selection.rangeCount || !selection.anchorNode) return null;
    const heading = editor.firstElementChild;
    if (!(heading instanceof HTMLElement) || heading.tagName !== "H2") return null;
    const text = (heading.textContent ?? "").replace(/\u00a0/g, " ");
    if (text !== label && !text.startsWith(label)) return null;
    if (heading.contains(selection.anchorNode)) {
        return { where: "heading", heading, block: heading, atStart: false, empty: false, followed: false };
    }
    const anchor = selection.anchorNode;
    const host = anchor instanceof Element ? anchor : anchor.parentElement;
    const block = host?.closest("p, h1, h2, h3, li, blockquote, pre");
    if (!(block instanceof HTMLElement) || block.previousElementSibling !== heading || !selection.isCollapsed) return null;
    const edge = captionCaret(block, selection);
    if (!edge?.atStart) return null;
    const writing = (block.textContent ?? "").replace(/\u00a0/g, " ").trim();
    return {
        where: "after",
        heading,
        block,
        atStart: true,
        empty: writing.length === 0 && !block.querySelector("img"),
        followed: block.nextElementSibling !== null,
    };
}

function writingLineAfter(heading: HTMLElement): HTMLElement {
    const next = heading.nextElementSibling;
    if (next instanceof HTMLElement && next.tagName === "P") return next;
    const paragraph = document.createElement("p");
    paragraph.appendChild(document.createElement("br"));
    heading.after(paragraph);
    return paragraph;
}

function peelDateLine(heading: HTMLElement, label: string): { paragraph: HTMLElement; offset: number } {
    const text = (heading.textContent ?? "").replace(/\u00a0/g, " ");
    const extra = text.startsWith(label) && text !== label ? text.slice(label.length).trim() : "";
    if (text !== label) heading.textContent = label;
    const paragraph = writingLineAfter(heading);
    if (!extra) return { paragraph, offset: 0 };
    const current = (paragraph.textContent ?? "").replace(/\u00a0/g, " ").trim();
    paragraph.textContent = current ? `${extra} ${current}` : extra;
    return { paragraph, offset: extra.length };
}

function dateHeadingHoldsSelection(editor: HTMLElement, selection: Selection | null): boolean {
    if (!selection?.rangeCount || !selection.anchorNode) return false;
    const heading = editor.firstElementChild;
    if (!(heading instanceof HTMLElement) || !/^H[1-3]$/.test(heading.tagName)) return false;
    const text = (heading.textContent ?? "").replace(/\u00a0/g, " ").replace(/\s+/g, " ").trim();
    if (!leadingDateLabel(text) || heading.querySelector("img")) return false;
    const range = selection.getRangeAt(0);
    return heading.contains(range.startContainer) && heading.contains(range.endContainer);
}

function selectedDateHeading(editor: HTMLElement, selection: Selection | null, label: string): { heading: HTMLElement; onlyDate: boolean } | null {
    if (!label || !selection?.rangeCount) return null;
    const heading = editor.firstElementChild;
    if (!(heading instanceof HTMLElement) || heading.tagName !== "H2") return null;
    const text = (heading.textContent ?? "").replace(/\u00a0/g, " ").replace(/\s+/g, " ").trim();
    if (text !== label && !text.startsWith(label)) return null;
    const range = selection.getRangeAt(0);
    let touches = false;
    try {
        touches = range.intersectsNode(heading);
    } catch {
        touches = false;
    }
    if (!touches) return null;
    const onlyDate = heading.contains(range.startContainer) && heading.contains(range.endContainer);
    return { heading, onlyDate };
}

function pointAfterDate(heading: HTMLElement, container: Node, offset: number): boolean {
    const parent = heading.parentElement;
    if (!parent) return false;
    if (container === parent) return offset > [...parent.childNodes].indexOf(heading) + 1;
    if (heading.contains(container)) return false;
    const node = container instanceof Element ? container : container.parentElement;
    if (!node || node === heading) return false;
    return (heading.compareDocumentPosition(node) & Node.DOCUMENT_POSITION_FOLLOWING) !== 0;
}

function keepBoundarySpace(block: HTMLElement) {
    const text = document.createTreeWalker(block, NodeFilter.SHOW_TEXT).nextNode();
    if (text instanceof Text && text.data.startsWith(" ")) text.data = `\u00a0${text.data.slice(1)}`;
}

function clearWritingSelection(editor: HTMLElement, heading: HTMLElement, selection: Selection): number[] | undefined {
    const first = heading.nextElementSibling;
    const path = first instanceof HTMLElement ? childPath(editor, first) : undefined;
    const range = selection.getRangeAt(0).cloneRange();
    if (!pointAfterDate(heading, range.startContainer, range.startOffset)) range.setStartAfter(heading);
    range.deleteContents();
    const next = heading.nextElementSibling;
    if (!(next instanceof HTMLElement)) {
        const paragraph = document.createElement("p");
        paragraph.appendChild(document.createElement("br"));
        heading.after(paragraph);
        placeCaretAtStart(paragraph);
        return path;
    }
    const container = range.startContainer;
    const host = container instanceof Element ? container : container.parentElement;
    const block = host?.closest("p, h1, h2, h3, li, blockquote, pre");
    const keptText = container instanceof Text
        && editor.contains(container)
        && !heading.contains(container)
        && container.data.length > 0;
    if (keptText) {
        if (range.startOffset === 0) keepBoundarySpace(container.parentElement instanceof HTMLElement ? container.parentElement : next);
        range.setStart(container, range.startOffset);
        range.collapse(true);
        selection.removeAllRanges();
        selection.addRange(range);
        return path;
    }
    const line = block instanceof HTMLElement && editor.contains(block) && !heading.contains(block) ? block : next;
    keepBoundarySpace(line);
    if (blockIsEmpty(line) && !line.querySelector("br")) line.appendChild(document.createElement("br"));
    placeCaretAtStart(line);
    return path;
}

function selectReplaceRange(editor: HTMLElement, heading: HTMLElement, selection: Selection) {
    if (!selection.rangeCount) return;
    const range = selection.getRangeAt(0);
    if (!pointAfterDate(heading, range.endContainer, range.endOffset)) {
        placeWritingCaret(heading, true);
        return;
    }
    editor.focus();
    const clipped = range.cloneRange();
    if (!pointAfterDate(heading, range.startContainer, range.startOffset)) clipped.setStartAfter(heading);
    selection.removeAllRanges();
    selection.addRange(clipped);
}

function placeWritingCaret(heading: HTMLElement, onlyDate: boolean) {
    const next = heading.nextElementSibling;
    const nextText = next instanceof HTMLElement ? (next.textContent ?? "").replace(/\u00a0/g, " ").trim() : "";
    if (onlyDate && next instanceof HTMLElement && nextText) {
        const paragraph = document.createElement("p");
        paragraph.appendChild(document.createElement("br"));
        heading.after(paragraph);
        placeCaretAtStart(paragraph);
        return;
    }
    placeCaretAtStart(writingLineAfter(heading));
}

function settleDateHeading(editor: HTMLElement) {
    const heading = editor.firstElementChild;
    if (!(heading instanceof HTMLElement) || !/^H[1-3]$/.test(heading.tagName) || heading.querySelector("img")) return;
    const text = (heading.textContent ?? "").replace(/\u00a0/g, " ").replace(/\s+/g, " ").trim();
    const label = leadingDateLabel(text);
    if (!label) return;
    const extra = text.slice(label.length).trim();
    const alreadyPlain = heading.tagName === "H2"
        && !extra
        && heading.childNodes.length === 1
        && heading.firstChild instanceof Text
        && heading.firstChild.data === label;
    if (alreadyPlain) return;
    const plain = document.createElement("h2");
    plain.textContent = label;
    heading.replaceWith(plain);
    if (!extra) return;
    const paragraph = writingLineAfter(plain);
    const current = (paragraph.textContent ?? "").replace(/\u00a0/g, " ").trim();
    if (current === extra || current.startsWith(`${extra} `)) return;
    paragraph.textContent = current ? `${extra} ${current}` : extra;
}

function placeCaretIn(paragraph: HTMLElement, offset: number) {
    if (offset <= 0 || !(paragraph.firstChild instanceof Text)) {
        placeCaretAtStart(paragraph);
        return;
    }
    const text = paragraph.firstChild;
    const caret = document.createRange();
    caret.setStart(text, Math.min(offset, text.length));
    caret.collapse(true);
    const selection = window.getSelection();
    selection?.removeAllRanges();
    selection?.addRange(caret);
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

function selectionInsideCode(editor: HTMLElement, selection: Selection): boolean {
    if (!selection.rangeCount) return false;
    const range = selection.getRangeAt(0);
    const anchor = range.startContainer instanceof Element ? range.startContainer : range.startContainer.parentElement;
    const pre = anchor?.closest("pre");
    return pre instanceof HTMLElement && editor.contains(pre) && pre.contains(range.startContainer) && pre.contains(range.endContainer);
}

const LIST_BLOCKS = new Set(["H1", "H2", "H3", "P", "UL", "OL", "BLOCKQUOTE", "PRE", "HR", "FIGURE", "DIV", "IMG"]);

function liftNestedLists(editor: HTMLElement) {
    for (const paragraph of [...editor.querySelectorAll("p")]) {
        const list = onlyList(paragraph);
        if (list) paragraph.replaceWith(list);
    }
    const loose: Node[] = [];
    const flush = () => {
        const nodes = loose.splice(0);
        const visible = nodes.some((node) => node.nodeType !== Node.TEXT_NODE || (node.textContent ?? "").replace(/\u00a0/g, " ").trim());
        if (!visible) {
            for (const node of nodes) node.parentNode?.removeChild(node);
            return;
        }
        const paragraph = document.createElement("p");
        nodes[0].parentNode?.insertBefore(paragraph, nodes[0]);
        for (const node of nodes) paragraph.appendChild(node);
        while (paragraph.firstChild instanceof HTMLSpanElement || paragraph.firstChild instanceof HTMLFontElement) {
            const span = paragraph.firstChild;
            if ([...span.children].some((child) => child.tagName !== "BR")) break;
            while (span.firstChild) paragraph.insertBefore(span.firstChild, span);
            span.remove();
        }
        if (paragraph.lastChild instanceof HTMLBRElement && paragraph.childNodes.length > 1) paragraph.lastChild.remove();
    };
    for (const node of [...editor.childNodes]) {
        if (node instanceof Element && LIST_BLOCKS.has(node.tagName)) {
            flush();
            continue;
        }
        loose.push(node);
    }
    flush();
}

function onlyList(paragraph: HTMLElement): HTMLElement | null {
    const lists = [...paragraph.children].filter((child): child is HTMLElement => child.tagName === "UL" || child.tagName === "OL");
    if (lists.length !== 1) return null;
    for (const node of paragraph.childNodes) {
        if (node === lists[0]) continue;
        if (node instanceof Text && !node.data.trim()) continue;
        if (node instanceof HTMLBRElement) continue;
        return null;
    }
    return lists[0];
}

function placeListCaret(editor: HTMLElement, fromList: boolean, text: string, offset: number) {
    const candidates = [...editor.querySelectorAll("li, p")].filter((item) => (item.textContent ?? "").replace(/\u00a0/g, " ") === text);
    const preferred = candidates.find((item) => fromList ? item.tagName === "P" : item.tagName === "LI");
    const target = preferred ?? candidates[0];
    if (!(target instanceof HTMLElement)) return;
    placeCaretAtTextOffset(target, offset);
}

function textOffsetWithin(root: HTMLElement, container: Node, offset: number): number {
    const range = document.createRange();
    range.selectNodeContents(root);
    range.setEnd(container, offset);
    return range.toString().length;
}

function placeCaretAtTextOffset(root: HTMLElement, offset: number) {
    const selection = window.getSelection();
    if (!selection) return;
    let remaining = offset;
    const walker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT);
    let node = walker.nextNode();
    while (node) {
        const length = node.textContent?.length ?? 0;
        if (remaining <= length) {
            const caret = document.createRange();
            caret.setStart(node, remaining);
            caret.collapse(true);
            selection.removeAllRanges();
            selection.addRange(caret);
            return;
        }
        remaining -= length;
        node = walker.nextNode();
    }
    placeCaretAtEnd(root);
}

function codeLineState(code: HTMLElement, selection: Selection): {
    collapsed: boolean;
    blankLine: boolean;
    trailing: boolean;
} | null {
    if (!selection.rangeCount) return null;
    const range = selection.getRangeAt(0);
    if (!code.contains(range.startContainer) || !code.contains(range.endContainer)) return null;
    const raw = code.textContent ?? "";
    const offset = textOffsetWithin(code, range.startContainer, range.startOffset);
    const lineStart = offset === 0 ? -1 : raw.lastIndexOf("\n", offset - 1);
    const start = lineStart === -1 ? 0 : lineStart + 1;
    const nextBreak = raw.indexOf("\n", offset);
    const line = raw.slice(start, nextBreak === -1 ? raw.length : nextBreak).replace(/[\u200b\u00a0]/g, "");
    const after = raw.slice(offset).replace(/[\u200b\u00a0\n]/g, "");
    return { collapsed: range.collapsed, blankLine: line.trim() === "", trailing: after.trim() === "" };
}

function insertCodeNewline(code: HTMLElement, selection: Selection) {
    if (!selection.rangeCount) return;
    const range = selection.getRangeAt(0);
    const start = textOffsetWithin(code, range.startContainer, range.startOffset);
    const end = textOffsetWithin(code, range.endContainer, range.endOffset);
    const rest = (code.textContent ?? "").slice(end).replace(/[\u200b\u00a0]/g, "");
    document.execCommand("insertHTML", false, rest.trim() === "" ? "&#10;&#8203;" : "&#10;");
    placeCaretAtTextOffset(code, start + 1);
}

function selectCodeOffsets(code: HTMLElement, start: number, end: number) {
    const selection = window.getSelection();
    if (!selection) return;
    const range = document.createRange();
    let filled = 0;
    let started = false;
    const walker = document.createTreeWalker(code, NodeFilter.SHOW_TEXT);
    let node = walker.nextNode();
    while (node) {
        const length = node.textContent?.length ?? 0;
        const next = filled + length;
        if (!started && start <= next) {
            range.setStart(node, Math.max(0, start - filled));
            started = true;
        }
        if (started && end <= next) {
            range.setEnd(node, Math.max(0, end - filled));
            selection.removeAllRanges();
            selection.addRange(range);
            return;
        }
        filled = next;
        node = walker.nextNode();
    }
}

const LINE_BLOCK = /^(P|H1|H2|H3|BLOCKQUOTE|LI)$/;

function cutSelectionHtml(range: Range): string {
    const holder = document.createElement("div");
    holder.appendChild(range.cloneContents());
    let html = holder.innerHTML;
    let node: Node = range.commonAncestorContainer;
    const inline = new Set(["A", "B", "CODE", "DEL", "EM", "I", "S", "SPAN", "STRIKE", "STRONG", "SUB", "SUP", "U"]);
    while (node.parentElement && inline.has(node.parentElement.tagName) && node.parentElement.contains(range.startContainer) && node.parentElement.contains(range.endContainer)) {
        const wrap = node.parentElement.cloneNode(false);
        if (!(wrap instanceof HTMLElement)) break;
        wrap.innerHTML = html;
        html = wrap.outerHTML;
        node = node.parentElement;
    }
    return html;
}

function lineBlock(node: Node | null): HTMLElement | null {
    const host = node instanceof Element ? node : node?.parentElement ?? null;
    const block = host?.closest("li, p, h1, h2, h3, blockquote");
    if (!(block instanceof HTMLElement)) return null;
    if (block.tagName === "P" && block.parentElement?.tagName === "LI" && !block.previousElementSibling) return block.parentElement;
    return block;
}

function textPoint(root: HTMLElement, offset: number): { node: Text; offset: number } | null {
    let remaining = offset;
    const walker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT);
    let node = walker.nextNode();
    while (node instanceof Text) {
        if (remaining <= node.data.length) return { node, offset: remaining };
        remaining -= node.data.length;
        node = walker.nextNode();
    }
    return null;
}

function selectTextSpan(root: HTMLElement, start: number, end: number): Range | null {
    const from = textPoint(root, start);
    const to = textPoint(root, end);
    if (!from || !to) return null;
    const range = document.createRange();
    range.setStart(from.node, from.offset);
    range.setEnd(to.node, to.offset);
    return range;
}

function removeTextSpan(block: HTMLElement, start: number, end: number) {
    const live = selectTextSpan(block, start, end);
    if (!live) return false;
    live.deleteContents();
    dropEmptyMarks(block);
    block.normalize();
    if (blockIsEmpty(block)) {
        block.replaceChildren(document.createElement("br"));
        placeCaretAtStart(block);
        return true;
    }
    relaxBlockSpaces(block);
    placeCaretAtTextOffset(block, start);
    return true;
}

function wordBlock(node: Node | null): HTMLElement | null {
    const line = lineBlock(node);
    if (line) return line;
    const host = node instanceof Element ? node : node?.parentElement ?? null;
    const block = host?.closest("figcaption, pre");
    return block instanceof HTMLElement ? block : null;
}

function writingSelection(editor: HTMLElement, range: Range): boolean {
    const start = lineBlock(range.startContainer);
    const end = lineBlock(range.endContainer);
    if (!(start instanceof HTMLElement) || !(end instanceof HTMLElement)) return false;
    if (!editor.contains(start) || !editor.contains(end)) return false;
    if (start.closest("figure") || end.closest("figure")) return false;
    const held = document.createElement("div");
    held.appendChild(range.cloneContents());
    return held.querySelector("img, figure, hr") === null;
}

function adjacentTextBlock(block: HTMLElement, direction: "previous" | "next"): HTMLElement | null {
    let sibling = direction === "previous" ? block.previousElementSibling : block.nextElementSibling;
    const parent = block.parentElement;
    if (!sibling && parent && (parent.tagName === "UL" || parent.tagName === "OL")) {
        sibling = direction === "previous" ? parent.previousElementSibling : parent.nextElementSibling;
    }
    if (!sibling) return null;
    if (sibling.tagName === "UL" || sibling.tagName === "OL") {
        const items = [...sibling.children].filter((child) => child.tagName === "LI");
        const item = direction === "previous" ? items[items.length - 1] : items[0];
        return item instanceof HTMLElement ? item : null;
    }
    if (sibling instanceof HTMLElement && LINE_BLOCK.test(sibling.tagName)) return sibling;
    return null;
}

function writingHost(block: HTMLElement): HTMLElement {
    if (block.tagName !== "BLOCKQUOTE") return block;
    const nested = [...block.children].reverse().find((child) => child.tagName === "P");
    return nested instanceof HTMLElement ? nested : block;
}

const STYLE_MARK = "b, strong, i, em, u, s, strike, del, a";

function styleElement(node: Node | null): HTMLElement | null {
    const host = node instanceof Element ? node : node?.parentElement ?? null;
    const mark = host?.closest(STYLE_MARK);
    return mark instanceof HTMLElement ? mark : null;
}

function caretEndsMark(mark: HTMLElement, range: Range): boolean {
    if (!mark.contains(range.startContainer)) return false;
    const after = range.cloneRange();
    after.selectNodeContents(mark);
    after.setStart(range.startContainer, range.startOffset);
    return after.toString().replace(/[\u200b\u00a0\s]/g, "") === "" && !after.cloneContents().querySelector("img, br");
}

function markBeforeCaret(range: Range): HTMLElement | null {
    let node: Node | null = null;
    if (range.startContainer instanceof Element) node = range.startContainer.childNodes[range.startOffset - 1] ?? null;
    else if (range.startContainer instanceof Text) {
        if (range.startContainer.data.slice(0, range.startOffset).replace(/[\u200b\u00a0\s]/g, "") !== "") return null;
        node = range.startContainer.previousSibling;
    }
    while (node instanceof Text && node.data.replace(/[\u200b\u00a0\s]/g, "") === "") node = node.previousSibling;
    return node instanceof HTMLElement && node.matches(STYLE_MARK) ? node : null;
}

function blockTextOutside(mark: HTMLElement, block: HTMLElement): boolean {
    const walker = document.createTreeWalker(block, NodeFilter.SHOW_TEXT);
    let node = walker.nextNode();
    while (node) {
        if (node instanceof Text && !mark.contains(node) && node.data.replace(/[\u200b\u00a0\s]/g, "") !== "") return true;
        node = walker.nextNode();
    }
    return false;
}

function styleChain(selection: Selection): HTMLElement[] | null {
    if (!selection.rangeCount || !selection.isCollapsed) return null;
    const range = selection.getRangeAt(0);
    let mark = styleElement(range.startContainer);
    if (!mark || !caretEndsMark(mark, range)) mark = markBeforeCaret(range);
    if (!mark || mark.closest("pre")) return null;
    const chain = [mark];
    let parent = mark.parentElement;
    while (parent?.matches(STYLE_MARK)) {
        chain.unshift(parent);
        parent = parent.parentElement;
    }
    return chain;
}

function caretAtBlockEnd(block: HTMLElement, range: Range): boolean {
    if (!block.contains(range.startContainer)) return false;
    const after = range.cloneRange();
    after.selectNodeContents(block);
    after.setStart(range.startContainer, range.startOffset);
    return after.toString().replace(/[\u200b\u00a0\s]/g, "") === "" && !after.cloneContents().querySelector("img");
}

function textOutsideMark(mark: HTMLElement): boolean {
    const block = mark.parentElement;
    if (!block) return false;
    const walker = document.createTreeWalker(block, NodeFilter.SHOW_TEXT);
    let node = walker.nextNode();
    while (node) {
        if (node instanceof Text && !mark.contains(node) && node.data.replace(/[\u200b\u00a0\s]/g, "") !== "") return true;
        node = walker.nextNode();
    }
    return false;
}

function markEndsWithDigit(mark: HTMLElement): boolean {
    const text = (mark.textContent ?? "").replace(/[\u00a0\u200b]/g, " ").trimEnd();
    return /\d$/.test(text);
}

function spaceMark(selection: Selection): HTMLElement | null {
    if (!selection.rangeCount || !selection.isCollapsed) return null;
    const range = selection.getRangeAt(0);
    let mark = styleElement(range.startContainer);
    if (!mark || !caretEndsMark(mark, range)) mark = markBeforeCaret(range);
    if (!mark || mark.closest("pre")) return null;
    let parent = mark.parentElement;
    while (parent?.matches(STYLE_MARK) && caretEndsMark(parent, range) && !textOutsideMark(mark)) {
        mark = parent;
        parent = mark.parentElement;
    }
    if (!textOutsideMark(mark)) return null;
    return mark;
}

function writingOutsideMark(mark: HTMLElement): boolean {
    const block = mark.closest("p, li, h1, h2, h3, blockquote, figcaption");
    if (!(block instanceof HTMLElement)) return textOutsideMark(mark);
    const walker = document.createTreeWalker(block, NodeFilter.SHOW_TEXT);
    let node = walker.nextNode();
    while (node) {
        if (node instanceof Text && !mark.contains(node) && node.data.replace(/[\u200b\u00a0\s]/g, "") !== "") return true;
        node = walker.nextNode();
    }
    return false;
}

const STYLE_COMMANDS = new Set(["bold", "italic", "underline", "strikeThrough"]);

function textInside(range: Range, text: Text): { start: number; end: number } | null {
    const start = text === range.startContainer ? range.startOffset : 0;
    const end = text === range.endContainer ? range.endOffset : text.data.length;
    if (end <= start) return null;
    try {
        if (text !== range.startContainer && text !== range.endContainer && !range.intersectsNode(text)) return null;
    } catch {
        return null;
    }
    return { start, end };
}

function excludeStyleEdges(range: Range) {
    if (range.collapsed) return;
    const cut = styleEdgeCut(range.toString());
    if (!cut) return;
    const root = range.commonAncestorContainer.nodeType === Node.TEXT_NODE
        ? range.commonAncestorContainer.parentNode
        : range.commonAncestorContainer;
    if (!root) return;
    const nodes: Text[] = [];
    const walker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT);
    let current = walker.nextNode();
    while (current) {
        if (current instanceof Text && textInside(range, current)) nodes.push(current);
        current = walker.nextNode();
    }
    const point = (count: number, fromEnd: boolean) => {
        let left = count;
        const list = fromEnd ? [...nodes].reverse() : nodes;
        for (const text of list) {
            const inside = textInside(range, text);
            if (!inside) continue;
            const available = inside.end - inside.start;
            if (left <= available) return { node: text, offset: fromEnd ? inside.end - left : inside.start + left };
            left -= available;
        }
        return null;
    };
    const end = cut.trailing ? point(cut.trailing, true) : null;
    const start = cut.leading ? point(cut.leading, false) : null;
    if (end) range.setEnd(end.node, end.offset);
    if (start) range.setStart(start.node, start.offset);
}

function moveTrailingMarkSpaces(root: HTMLElement) {
    const marks = [...root.querySelectorAll(STYLE_MARK)].reverse();
    for (const mark of marks) {
        if (!(mark instanceof HTMLElement) || mark.closest("pre") || !writingOutsideMark(mark)) continue;
        const visible = (mark.textContent ?? "").replace(/[\u00a0\s\u200b]/g, "");
        if (!visible) continue;
        const first = mark.firstChild;
        if (first instanceof Text) {
            const leading = first.data.match(/^[\u00a0\s\u200b]+/);
            if (leading) {
                const spaces = leading[0].replace(/\u00a0/g, " ");
                if (leading[0].length === first.data.length) {
                    first.data = spaces;
                    mark.before(first);
                } else {
                    first.splitText(leading[0].length);
                    first.data = spaces;
                    mark.before(first);
                }
            }
        }
        const last = mark.lastChild;
        if (!(last instanceof Text)) continue;
        const trailing = last.data.match(/[\u00a0\s\u200b]+$/);
        if (!trailing) continue;
        const spaces = trailing[0].replace(/\u00a0/g, " ");
        if (trailing[0].length === last.data.length) {
            last.data = spaces;
            mark.after(last);
        } else {
            const cut = last.splitText(last.data.length - trailing[0].length);
            cut.data = spaces;
            mark.after(cut);
        }
    }
}

function restoreMarkSpaces(root: HTMLElement) {
    moveTrailingMarkSpaces(root);
    const selection = window.getSelection();
    const anchor = selection?.rangeCount ? selection.anchorNode : null;
    const offset = selection?.anchorOffset ?? 0;
    root.querySelectorAll(STYLE_MARK).forEach((mark) => {
        const next = mark.nextSibling;
        if (!(next instanceof Text)) return;
        const gap = next.data.match(/^[\u00a0\s\u200b]*/)?.[0] ?? "";
        if (!gap.includes("\u00a0")) return;
        const rest = next.data.slice(gap.length);
        let followed = rest.replace(/[\u200b\u00a0\s]/g, "") !== "";
        let sibling = next.nextSibling;
        while (!followed && sibling) {
            const visible = sibling instanceof Text ? sibling.data : sibling.textContent ?? "";
            followed = visible.replace(/[\u200b\u00a0\s]/g, "") !== "";
            sibling = sibling.nextSibling;
        }
        if (!followed) return;
        next.data = `${gap.replace(/\u00a0/g, " ")}${rest}`;
        if (selection && anchor === next) {
            const range = document.createRange();
            range.setStart(next, Math.min(offset, next.data.length));
            range.collapse(true);
            selection.removeAllRanges();
            selection.addRange(range);
        }
    });
    root.querySelectorAll("p, h1, h2, h3, li, blockquote, figcaption").forEach((block) => {
        const first = block.firstChild;
        if (first instanceof Text && first.data.startsWith("\u00a0") && /^[^\s<]/.test(first.data.slice(1))) first.data = ` ${first.data.slice(1)}`;
        if (block instanceof HTMLElement) relaxBlockSpaces(block);
    });
}

function relaxBlockSpaces(block: HTMLElement) {
    const nodes: Text[] = [];
    const walker = document.createTreeWalker(block, NodeFilter.SHOW_TEXT);
    let current = walker.nextNode();
    while (current) {
        if (current instanceof Text && !current.parentElement?.closest("pre")) nodes.push(current);
        current = walker.nextNode();
    }
    if (!nodes.length) return;
    const combined = nodes.map((node) => node.data).join("");
    const next = plainGaps(combined);
    if (next === combined) return;
    const selection = window.getSelection();
    const anchor = selection?.anchorNode ?? null;
    const offset = selection?.anchorOffset ?? 0;
    let cursor = 0;
    for (const node of nodes) {
        const slice = next.slice(cursor, cursor + node.data.length);
        cursor += node.data.length;
        if (slice !== node.data) node.data = slice;
    }
    if (!(selection && anchor instanceof Text && nodes.includes(anchor))) return;
    const range = document.createRange();
    range.setStart(anchor, Math.min(offset, anchor.data.length));
    range.collapse(true);
    selection.removeAllRanges();
    selection.addRange(range);
}

function caretEdges(block: HTMLElement, selection: Selection): { collapsed: boolean; atStart: boolean; atEnd: boolean } | null {
    if (!selection.rangeCount) return null;
    const range = selection.getRangeAt(0);
    if (!block.contains(range.startContainer) || !block.contains(range.endContainer)) return null;
    const before = range.cloneRange();
    before.selectNodeContents(block);
    before.setEnd(range.startContainer, range.startOffset);
    const after = range.cloneRange();
    after.selectNodeContents(block);
    after.setStart(range.endContainer, range.endOffset);
    const clean = (value: string) => value.replace(/\u200b/g, "");
    return { collapsed: range.collapsed, atStart: clean(before.toString()) === "", atEnd: clean(after.toString()) === "" };
}

function placeCaretOn(node: Node | null, fallback: HTMLElement) {
    const selection = window.getSelection();
    if (!selection) return;
    const caret = document.createRange();
    if (node instanceof Text && node.parentNode) caret.setStart(node, 0);
    else if (node?.parentNode) caret.setStartBefore(node);
    else {
        caret.selectNodeContents(fallback);
        caret.collapse(false);
    }
    caret.collapse(true);
    selection.removeAllRanges();
    selection.addRange(caret);
}

function blockIsEmpty(block: HTMLElement): boolean {
    return !(block.textContent ?? "").replace(/[\u200b\u00a0]/g, "").trim() && !block.querySelector("img");
}

function childPath(editor: HTMLElement, node: HTMLElement): number[] {
    const path: number[] = [];
    let current: HTMLElement | null = node;
    while (current && current !== editor) {
        const parent: HTMLElement | null = current.parentElement;
        if (!parent) break;
        path.unshift([...parent.children].indexOf(current));
        current = parent;
    }
    return path;
}

function nodeAtPath(editor: HTMLElement, path: number[]): HTMLElement | null {
    let current: HTMLElement = editor;
    for (const index of path) {
        const next = current.children[index];
        if (!(next instanceof HTMLElement)) return null;
        current = next;
    }
    return current === editor ? null : current;
}

function caretMark(editor: HTMLElement): { path: number[]; offset: number } | null {
    const selection = window.getSelection();
    if (!selection?.rangeCount) return null;
    const range = selection.getRangeAt(0);
    const anchor = range.startContainer;
    if (!editor.contains(anchor)) return null;
    const host = anchor instanceof Element ? anchor : anchor.parentElement;
    const line = host?.closest("p, h1, h2, h3, li, blockquote, pre, figcaption");
    if (!(line instanceof HTMLElement) || !editor.contains(line)) return null;
    const offset = caretTextOffset(textPieces(line), range.startContainer, range.startOffset) ?? 0;
    return { path: childPath(editor, line), offset };
}

function removeJoined(source: HTMLElement) {
    const list = source.parentElement;
    source.remove();
    if (list && (list.tagName === "UL" || list.tagName === "OL") && !list.querySelector("li")) list.remove();
}

function piecesOf(source: HTMLElement): Node[] {
    if (source.tagName !== "BLOCKQUOTE") return [...source.childNodes];
    return [...source.childNodes].flatMap((child) => {
        if (child instanceof HTMLElement && child.tagName === "P") return [...child.childNodes];
        return [child];
    });
}

function codeLines(code: HTMLElement): string[] {
    const lines = [""];
    const walk = (node: Node) => {
        if (node instanceof Text) {
            const parts = node.data.replace(/\u200b/g, "").split("\n");
            lines[lines.length - 1] += parts[0] ?? "";
            for (const part of parts.slice(1)) lines.push(part);
            return;
        }
        if (node instanceof HTMLBRElement) {
            lines.push("");
            return;
        }
        for (const child of node.childNodes) walk(child);
    };
    walk(code);
    return lines.map((line) => line.replace(/\u00a0/g, " "));
}

function pullFirstCodeLine(into: HTMLElement, pre: HTMLElement): "after" | "none" {
    const code = pre.querySelector("code");
    const source = code instanceof HTMLElement ? code : pre;
    const lines = codeLines(source);
    const line = lines[0] ?? "";
    const rest = lines.slice(1).join("\n");
    const host = writingHost(into);
    let separated: "after" | "none" = "none";
    if (line.trim()) {
        if (!(host.textContent ?? "").replace(/[\u200b\u00a0]/g, "").trim()) {
            for (const child of [...host.childNodes]) {
                if (child instanceof HTMLBRElement || (child instanceof Text && !child.data.replace(/[\u200b\u00a0]/g, "").trim())) child.remove();
            }
        }
        const gap = joinGap(host.textContent ?? "", line);
        trimEdgeSpaces(host, "end", gap.trimPrevious);
        const body = line.slice(gap.trimNext);
        if (gap.insert) host.appendChild(document.createTextNode(" "));
        const text = document.createTextNode(body);
        host.appendChild(text);
        placeCaretOn(text, host);
        separated = gap.separate ? "after" : "none";
    } else {
        placeCaretAtEnd(host);
    }
    if (!rest.trim()) pre.remove();
    else source.textContent = rest;
    return separated;
}

function followingCode(block: HTMLElement): HTMLPreElement | null {
    let next = block.nextElementSibling;
    const parent = block.parentElement;
    if (!next && parent && (parent.tagName === "UL" || parent.tagName === "OL")) next = parent.nextElementSibling;
    return next instanceof HTMLPreElement ? next : null;
}

function gapChar(value: string): boolean {
    return /\s/u.test(value);
}

function trimTextData(text: Text, side: "start" | "end", count: number): number {
    if (count <= 0) return count;
    const data = text.data;
    let left = count;
    if (side === "end") {
        let end = data.length;
        while (left > 0 && end > 0 && gapChar(data[end - 1] ?? "")) {
            end -= 1;
            left -= 1;
        }
        if (end !== data.length) text.data = data.slice(0, end);
        return left;
    }
    let start = 0;
    while (left > 0 && start < data.length && gapChar(data[start] ?? "")) {
        start += 1;
        left -= 1;
    }
    if (start) text.data = data.slice(start);
    return left;
}

function trimEdgeSpaces(root: HTMLElement, side: "start" | "end", count: number): number {
    if (count <= 0) return count;
    const nodes: Text[] = [];
    const walker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT);
    let node = walker.nextNode();
    while (node instanceof Text) {
        nodes.push(node);
        node = walker.nextNode();
    }
    if (side === "end") nodes.reverse();
    let left = count;
    for (const text of nodes) {
        left = trimTextData(text, side, left);
        if (left <= 0 || text.data.length > 0) return left;
    }
    return left;
}

function trimSpacesBeside(br: HTMLBRElement, direction: "previous" | "next", count: number) {
    let left = count;
    let current = direction === "previous" ? br.previousSibling : br.nextSibling;
    const side = direction === "previous" ? "end" : "start";
    while (current && left > 0 && !(current instanceof HTMLBRElement)) {
        if (current instanceof Text) {
            left = trimTextData(current, side, left);
            if (left <= 0 || current.data.length > 0) return;
        } else if (current instanceof HTMLElement) {
            left = trimEdgeSpaces(current, side, left);
            if (left <= 0 || (current.textContent ?? "").length > 0) return;
        }
        current = direction === "previous" ? current.previousSibling : current.nextSibling;
    }
}

function joinBlock(target: HTMLElement, source: HTMLElement): "after" | "none" {
    const into = writingHost(target);
    const after = source.textContent ?? "";
    const sourceEmpty = !after.replace(/[\u200b\u00a0]/g, "").trim() && !source.querySelector("img");
    if (sourceEmpty) {
        removeJoined(source);
        placeCaretAtEnd(into);
        return "none";
    }
    if (!(into.textContent ?? "").replace(/[\u200b\u00a0]/g, "").trim()) {
        for (const child of [...into.childNodes]) {
            if (child instanceof HTMLBRElement || (child instanceof Text && !child.data.replace(/[\u200b\u00a0]/g, "").trim())) child.remove();
        }
    }
    const gap = joinGap(into.textContent ?? "", source.textContent ?? "");
    trimEdgeSpaces(into, "end", gap.trimPrevious);
    trimEdgeSpaces(source, "start", gap.trimNext);
    const pieces = piecesOf(source);
    const start = pieces.find((node) => {
        if (node instanceof Text) return node.data.replace(/[\u200b\u00a0]/g, "") !== "";
        return !(node instanceof HTMLBRElement);
    }) ?? pieces[0] ?? null;
    for (const node of pieces) {
        const incoming = node.textContent ?? "";
        if (incoming.replace(/[\u200b\u00a0]/g, "").trim() && joinNeedsSpace(into.textContent ?? "", incoming)) {
            into.appendChild(document.createTextNode(" "));
        }
        into.appendChild(node);
    }
    removeJoined(source);
    placeCaretOn(start, into);
    return gap.separate ? "after" : "none";
}

const INLINE_MARK = /^(?:B|STRONG|I|EM|U|S|STRIKE|DEL|A|SPAN|FONT)$/;

function skipEmptyText(node: Node | null, direction: "previous" | "next"): Node | null {
    let current = node;
    while (current instanceof Text && current.data.replace(/\u200b/g, "") === "") {
        current = direction === "previous" ? current.previousSibling : current.nextSibling;
    }
    return current;
}

function unwrapBreakEdge(node: Node | null, direction: "previous" | "next"): Node | null {
    const current = skipEmptyText(node, direction);
    if (!current) return null;
    if (current instanceof HTMLBRElement) return current;
    if (current instanceof Element && INLINE_MARK.test(current.tagName)) {
        const child = direction === "previous" ? current.lastChild : current.firstChild;
        if (!child) return null;
        return unwrapBreakEdge(child, direction);
    }
    return null;
}

function neighborBreak(node: Node, direction: "previous" | "next"): Node | null {
    let current: Node | null = node;
    while (current) {
        const sibling = skipEmptyText(
            direction === "previous" ? current.previousSibling : current.nextSibling,
            direction,
        );
        if (sibling) return unwrapBreakEdge(sibling, direction);
        const parent: HTMLElement | null = current.parentElement;
        if (!parent || !INLINE_MARK.test(parent.tagName)) return null;
        current = parent;
    }
    return null;
}

function breakBesideCaret(selection: Selection, key: string): { br: HTMLBRElement; side: "before" | "after" } | null {
    if (!selection.rangeCount || !selection.isCollapsed) return null;
    const range = selection.getRangeAt(0);
    const look = (direction: "previous" | "next") => {
        const container = range.startContainer;
        const offset = range.startOffset;
        if (container instanceof Text) {
            if (direction === "previous" && offset > 0) return null;
            if (direction === "next" && offset < container.data.length) return null;
            return neighborBreak(container, direction);
        }
        if (container instanceof Element) {
            const child = direction === "previous" ? container.childNodes[offset - 1] : container.childNodes[offset];
            if (child) return unwrapBreakEdge(child, direction);
            return neighborBreak(container, direction);
        }
        return null;
    };
    if (key === "Backspace" || key === "Enter") {
        const before = look("previous");
        if (before instanceof HTMLBRElement) return { br: before, side: "after" };
    }
    if (key === "Delete" || key === "Enter") {
        const after = look("next");
        if (after instanceof HTMLBRElement) return { br: after, side: "before" };
    }
    return null;
}

function textBesideBreak(br: HTMLBRElement, direction: "previous" | "next"): string {
    let text = "";
    let current = direction === "previous" ? br.previousSibling : br.nextSibling;
    while (current && !(current instanceof HTMLBRElement)) {
        const piece = current.textContent ?? "";
        text = direction === "previous" ? piece + text : text + piece;
        current = direction === "previous" ? current.previousSibling : current.nextSibling;
    }
    return text;
}

function firstTextAfter(br: HTMLBRElement): Text | null {
    let current = br.nextSibling;
    while (current && !(current instanceof HTMLBRElement)) {
        if (current instanceof Text && current.data.replace(/\u200b/g, "") !== "") return current;
        if (current instanceof Element) {
            const walker = document.createTreeWalker(current, NodeFilter.SHOW_TEXT);
            let text = walker.nextNode();
            while (text instanceof Text) {
                if (text.data.replace(/\u200b/g, "") !== "") return text;
                text = walker.nextNode();
            }
        }
        current = current.nextSibling;
    }
    return null;
}

function placeCaretAfter(node: Node) {
    const selection = window.getSelection();
    if (!selection) return;
    const caret = document.createRange();
    caret.setStartAfter(node);
    caret.collapse(true);
    selection.removeAllRanges();
    selection.addRange(caret);
}

function placeBreakCaret(line: HTMLElement, index: number | undefined, side: "before" | "after" | undefined): boolean {
    if ((side !== "before" && side !== "after") || typeof index !== "number" || index < 0) return false;
    const br = line.querySelectorAll("br")[index];
    if (!(br instanceof HTMLBRElement)) return false;
    if (side === "after") {
        placeCaretAfter(br);
        return true;
    }
    const selection = window.getSelection();
    if (!selection) return false;
    const caret = document.createRange();
    caret.setStartBefore(br);
    caret.collapse(true);
    selection.removeAllRanges();
    selection.addRange(caret);
    return true;
}

function joinBrokenLine(br: HTMLBRElement): "after" | "none" {
    const block = br.closest("p, li, h1, h2, h3, blockquote");
    const before = textBesideBreak(br, "previous");
    const after = textBesideBreak(br, "next");
    const following = firstTextAfter(br);
    const marker = br.nextSibling;
    const gap = joinGap(before, after);
    trimSpacesBeside(br, "previous", gap.trimPrevious);
    trimSpacesBeside(br, "next", gap.trimNext);
    if (gap.insert) {
        const previous = br.previousSibling;
        if (previous instanceof Text) previous.data = `${previous.data} `;
        else br.before(document.createTextNode(" "));
    }
    br.remove();
    const fallback = block instanceof HTMLElement ? block : following?.parentElement;
    if (following?.isConnected && fallback instanceof HTMLElement) placeCaretOn(following, fallback);
    else if (marker?.parentNode) {
        const caret = document.createRange();
        caret.setStartBefore(marker);
        caret.collapse(true);
        const selection = window.getSelection();
        selection?.removeAllRanges();
        selection?.addRange(caret);
    } else if (block instanceof HTMLElement) placeCaretAtEnd(block);
    return gap.separate ? "after" : "none";
}

function openBlankLine(br: HTMLBRElement, side: "before" | "after") {
    const blank = document.createElement("br");
    if (side === "before") br.before(blank);
    else br.after(blank);
    placeCaretAfter(side === "before" ? blank : br);
}

function textPieces(root: HTMLElement): Text[] {
    const nodes: Text[] = [];
    const walker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT);
    let node = walker.nextNode();
    while (node) {
        if (node instanceof Text) nodes.push(node);
        node = walker.nextNode();
    }
    return nodes;
}

function caretTextOffset(nodes: Text[], container: Node, offset: number): number | null {
    if (!(container instanceof Text)) return null;
    let count = 0;
    for (const node of nodes) {
        if (node === container) return count + Math.min(offset, node.data.length);
        count += node.data.length;
    }
    return null;
}

function selectTextRange(nodes: Text[], start: number, end: number) {
    const selection = window.getSelection();
    if (!selection) return;
    const range = document.createRange();
    let cursor = 0;
    let started = false;
    for (const node of nodes) {
        const nodeEnd = cursor + node.data.length;
        if (!started && start <= nodeEnd) {
            range.setStart(node, Math.max(0, start - cursor));
            started = true;
        }
        if (started && end <= nodeEnd) {
            range.setEnd(node, Math.max(0, end - cursor));
            selection.removeAllRanges();
            selection.addRange(range);
            return;
        }
        cursor = nodeEnd;
    }
}

function leaveHeading(heading: HTMLElement, selection: Selection) {
    const range = selection.getRangeAt(0);
    const nodes = textPieces(heading);
    const offset = caretTextOffset(nodes, range.startContainer, range.startOffset);
    if (offset === null) return;
    const raw = nodes.map((node) => node.data).join("");
    const cut = boundarySpaceCut(raw.slice(0, offset), raw.slice(offset));
    const keepEnd = offset - (cut?.before ?? 0);
    const restStart = offset + (cut?.after ?? 0);
    const rest = document.createDocumentFragment();
    if (restStart < raw.length) {
        let cursor = 0;
        let startNode = nodes[0];
        for (const node of nodes) {
            if (restStart < cursor + node.data.length) {
                startNode = node;
                break;
            }
            cursor += node.data.length;
        }
        const chain = inlineChain(startNode, heading);
        selectTextRange(nodes, restStart, raw.length);
        if (!selection.rangeCount || selection.isCollapsed) return;
        const moved = selection.getRangeAt(0).extractContents();
        while (moved.firstChild) rest.appendChild(moved.firstChild);
        keepInlineChain(rest, chain);
    }
    if (cut) {
        selectTextRange(textPieces(heading), keepEnd, restStart);
        if (selection.rangeCount && !selection.isCollapsed) selection.getRangeAt(0).deleteContents();
    }
    const paragraph = document.createElement("p");
    while (rest.firstChild) paragraph.appendChild(rest.firstChild);
    dropEmptyMarks(heading);
    dropEmptyMarks(paragraph);
    if (!(paragraph.textContent ?? "").replace(/[\u200b\u00a0]/g, "").trim() && !paragraph.querySelector("img")) {
        paragraph.appendChild(document.createElement("br"));
    }
    heading.after(paragraph);
    placeCaretAtStart(paragraph);
}

function settleCode(editor: HTMLElement) {
    const fresh = editor.querySelector("code[data-fresh]");
    const pre = fresh?.closest("pre");
    if (!(pre instanceof HTMLElement) || !editor.contains(pre)) return;
    const gap = pre.nextElementSibling;
    if (!(gap instanceof HTMLElement)) return;
    const text = (gap.textContent ?? "").replace(/[\u200b\u00a0]/g, "").trim();
    const action = codeGap({
        emptyLine: text.length === 0 && !gap.querySelector("img"),
        nextBlock: gap.nextElementSibling !== null,
    });
    if (action === "close") gap.remove();
}

function settleDivider(editor: HTMLElement) {
    const selection = window.getSelection();
    if (!selection?.rangeCount) return;
    const anchor = selection.anchorNode;
    const host = anchor instanceof Element ? anchor : anchor?.parentElement ?? null;
    const paragraph = host?.closest("p");
    if (!(paragraph instanceof HTMLParagraphElement) || !editor.contains(paragraph)) return;
    const text = (paragraph.textContent ?? "").replace(/[\u200b\u00a0]/g, "").trim();
    const next = paragraph.nextElementSibling;
    const nextText = next ? (next.textContent ?? "").replace(/[\u200b\u00a0]/g, "").trim() : "";
    const action = dividerCaret({
        emptyLine: text.length === 0 && !paragraph.querySelector("img"),
        followsRule: paragraph.previousElementSibling instanceof HTMLHRElement,
        nextHasWriting: Boolean(next && (nextText || next.querySelector("img"))),
    });
    if (action !== "join" || !(next instanceof HTMLElement)) return;
    paragraph.remove();
    const target = next.matches("ul, ol") ? next.querySelector("li") : next;
    if (target instanceof HTMLElement) placeCaretAtStart(target);
}

function breakQuote(quote: HTMLElement, selection: Selection) {
    const range = selection.getRangeAt(0);
    const nodes = textPieces(quote);
    const offset = caretTextOffset(nodes, range.startContainer, range.startOffset);
    if (offset === null) return;
    const raw = nodes.map((node) => node.data).join("");
    const cut = boundarySpaceCut(raw.slice(0, offset), raw.slice(offset));
    const keepEnd = offset - (cut?.before ?? 0);
    const restStart = offset + (cut?.after ?? 0);
    const rest = document.createDocumentFragment();
    if (restStart < raw.length) {
        let cursor = 0;
        let startNode = nodes[0];
        for (const node of nodes) {
            if (restStart < cursor + node.data.length) {
                startNode = node;
                break;
            }
            cursor += node.data.length;
        }
        const chain = inlineChain(startNode, quote);
        selectTextRange(nodes, restStart, raw.length);
        if (!selection.rangeCount || selection.isCollapsed) return;
        const moved = selection.getRangeAt(0).extractContents();
        while (moved.firstChild) rest.appendChild(moved.firstChild);
        keepInlineChain(rest, chain);
    }
    if (cut) {
        selectTextRange(textPieces(quote), keepEnd, restStart);
        if (selection.rangeCount && !selection.isCollapsed) selection.getRangeAt(0).deleteContents();
    }
    dropEmptyMarks(quote);
    quote.appendChild(document.createElement("br"));
    const first = rest.firstChild;
    while (rest.firstChild) quote.appendChild(rest.firstChild);
    if (first instanceof HTMLElement) placeCaretAtStart(first);
    else if (first instanceof Text) placeCaretOn(first, quote);
    else placeCaretAtEnd(quote);
}

function leaveQuote(quote: HTMLElement) {
    const paragraph = document.createElement("p");
    paragraph.appendChild(document.createElement("br"));
    quote.replaceWith(paragraph);
    placeCaretAtStart(paragraph);
}

function outdentListItem(item: HTMLElement) {
    const list = item.parentElement;
    if (!(list instanceof HTMLUListElement || list instanceof HTMLOListElement)) return;
    const paragraph = document.createElement("p");
    while (item.firstChild) paragraph.appendChild(item.firstChild);
    if (blockIsEmpty(paragraph)) paragraph.appendChild(document.createElement("br"));
    const following = [...list.children].some((child) => child !== item && child.tagName === "LI" && (item.compareDocumentPosition(child) & Node.DOCUMENT_POSITION_FOLLOWING) !== 0);
    item.remove();
    const remaining = [...list.children].some((child) => child.tagName === "LI");
    if (!remaining) list.replaceWith(paragraph);
    else if (following) list.before(paragraph);
    else list.after(paragraph);
    placeCaretAtStart(paragraph);
}

function continueOrderedList(list: HTMLElement, rest: HTMLElement, index: number) {
    if (!(list instanceof HTMLOListElement) || !(rest instanceof HTMLOListElement) || index < 0) return;
    const items = [...list.children].filter((child) => child.tagName === "LI");
    const number = orderedItemNumber({
        start: list.getAttribute("start"),
        values: items.map((item) => item.getAttribute("value")),
        index,
    });
    if (number !== 1) rest.setAttribute("start", String(number));
}

function openLineAboveItem(item: HTMLElement) {
    const list = item.parentElement;
    if (!(list instanceof HTMLUListElement || list instanceof HTMLOListElement)) return;
    const items = [...list.children].filter((child) => child.tagName === "LI");
    const index = items.indexOf(item);
    const paragraph = document.createElement("p");
    paragraph.appendChild(document.createElement("br"));
    if (index <= 0) list.before(paragraph);
    else {
        const rest = document.createElement(list.tagName.toLowerCase());
        continueOrderedList(list, rest, index);
        for (const child of items.slice(index)) rest.appendChild(child);
        list.after(paragraph);
        paragraph.after(rest);
    }
    placeCaretAtStart(paragraph);
}

function leaveListItem(item: HTMLElement) {
    const list = item.parentElement;
    if (!(list instanceof HTMLUListElement || list instanceof HTMLOListElement)) return;
    const following = [...list.children].filter((child) => {
        return child.tagName === "LI" && (item.compareDocumentPosition(child) & Node.DOCUMENT_POSITION_FOLLOWING) !== 0;
    });
    const paragraph = document.createElement("p");
    paragraph.appendChild(document.createElement("br"));
    const original = [...list.children].filter((child) => child.tagName === "LI");
    const splitAt = following[0] instanceof HTMLElement ? original.indexOf(following[0]) : -1;
    const preceding = original.some((child) => child !== item && !following.includes(child));
    const continued = preceding && following.length > 0 ? document.createElement(list.tagName.toLowerCase()) : null;
    if (continued && splitAt >= 0) continueOrderedList(list, continued, splitAt);
    item.remove();
    const items = [...list.children].filter((child) => child.tagName === "LI");
    const place = listLeavePlace({
        remaining: items.length > 0,
        preceding: items.some((child) => !following.includes(child)),
        following: following.length > 0,
    });
    if (place === "replace") list.replaceWith(paragraph);
    else if (place === "before") list.before(paragraph);
    else if (place === "split" && continued) {
        for (const next of following) continued.appendChild(next);
        list.after(paragraph);
        paragraph.after(continued);
    } else list.after(paragraph);
    placeCaretAtStart(paragraph);
}

function leaveCodeBlock(pre: HTMLElement, code: HTMLElement) {
    const meaningful = (code.textContent ?? "").replace(/[\u200b\u00a0\n]/g, "").trim();
    const parent = pre.parentElement;
    const next = pre.nextElementSibling;
    if (!meaningful) {
        pre.remove();
        if (next instanceof HTMLElement) placeCaretAtStart(next);
        else if (parent) {
            const paragraph = document.createElement("p");
            paragraph.appendChild(document.createElement("br"));
            parent.appendChild(paragraph);
            placeCaretAtStart(paragraph);
        }
        return;
    }
    const trailing = /(?:\n[\u200b\u00a0]*)$/.exec(code.textContent ?? "");
    if (trailing) {
        const text = code.textContent ?? "";
        selectCodeOffsets(code, text.length - trailing[0].length, text.length);
        document.execCommand("delete");
    }
    if (next instanceof HTMLElement) placeCaretAtStart(next);
    else {
        const paragraph = document.createElement("p");
        paragraph.appendChild(document.createElement("br"));
        pre.after(paragraph);
        placeCaretAtStart(paragraph);
    }
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

function dropEmptyMarks(root: HTMLElement) {
    root.querySelectorAll("b, strong, i, em, u, s, strike, del, a").forEach((node) => {
        if (!(node.textContent ?? "").replace(/[\u00a0\s]/g, "")) node.remove();
    });
}

function inlineChain(node: Node, stop: HTMLElement): HTMLElement[] {
    const chain: HTMLElement[] = [];
    let current = node.parentElement;
    while (current && current !== stop) {
        if (/^(B|STRONG|I|EM|U|S|STRIKE|DEL|A)$/.test(current.tagName)) chain.push(current);
        current = current.parentElement;
    }
    return chain;
}

function keepInlineChain(fragment: DocumentFragment, chain: HTMLElement[]) {
    if (!chain.length || [...fragment.childNodes].some((node) => node instanceof Element)) return;
    for (const source of chain) {
        const clone = source.cloneNode(false);
        if (!(clone instanceof HTMLElement)) return;
        while (fragment.firstChild) clone.appendChild(fragment.firstChild);
        fragment.appendChild(clone);
    }
}

function continueAfterPicture(caption: HTMLElement): number | null {
    const figure = caption.closest("figure");
    const selection = window.getSelection();
    if (!figure || !selection || !selection.rangeCount) return null;
    const range = selection.getRangeAt(0);
    const nodes = textPieces(caption);
    const raw = nodes.map((node) => node.data).join("");
    let offset = caretTextOffset(nodes, range.startContainer, range.startOffset);
    if (offset === null) {
        if (!raw || (range.startContainer === caption && range.startOffset === 0)) offset = 0;
        else if (range.startContainer === caption && range.startOffset >= caption.childNodes.length) offset = raw.length;
        else return null;
    }
    const cut = boundarySpaceCut(raw.slice(0, offset), raw.slice(offset));
    const keepEnd = offset - (cut?.before ?? 0);
    const restStart = offset + (cut?.after ?? 0);
    const rest = document.createDocumentFragment();
    if (restStart < raw.length) {
        let cursor = 0;
        let startNode = nodes[0];
        for (const node of nodes) {
            if (restStart < cursor + node.data.length) {
                startNode = node;
                break;
            }
            cursor += node.data.length;
        }
        const chain = inlineChain(startNode, caption);
        selectTextRange(nodes, restStart, raw.length);
        if (selection.rangeCount && !selection.isCollapsed) {
            const moved = selection.getRangeAt(0).extractContents();
            while (moved.firstChild) rest.appendChild(moved.firstChild);
            keepInlineChain(rest, chain);
        }
    }
    if (cut) {
        selectTextRange(textPieces(caption), keepEnd, restStart);
        if (selection.rangeCount && !selection.isCollapsed) selection.getRangeAt(0).deleteContents();
    }
    const paragraph = document.createElement("p");
    while (rest.firstChild) paragraph.appendChild(rest.firstChild);
    dropEmptyMarks(caption);
    dropEmptyMarks(paragraph);
    if (!(paragraph.textContent ?? "").replace(/[\u200b\u00a0\s]/g, "")) paragraph.appendChild(document.createElement("br"));
    if (!(caption.textContent ?? "").replace(/[\u200b\u00a0\s]/g, "")) caption.replaceChildren(document.createElement("br"));
    const image = figure.querySelector("img");
    if (image instanceof HTMLImageElement) {
        const alt = imageAltText(caption.textContent ?? "");
        if (alt) image.setAttribute("alt", alt);
        else image.removeAttribute("alt");
    }
    figure.after(paragraph);
    placeCaretAtStart(paragraph);
    return offset;
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
    const pictureRemoval = useRef<{ before: string; after: string } | null>(null);
    const headingSplit = useRef<{ before: string; after: string; tag: string; text: string; offset: number } | null>(null);
    const blankLine = useRef<{ before: string; after: string; path?: number[]; caret?: number; breakIndex?: number; breakSide?: "before" | "after"; sticky?: boolean; typed?: string; typedCaret?: number } | null>(null);
    const editingForward = useRef(true);
    const selectionTyping = useRef(false);
    const selectionTypeStart = useRef<number | null>(null);
    const selectionTypeLine = useRef<HTMLElement | null>(null);
    const dragUndo = useRef<{ before: string; path: number[]; caret: number } | null>(null);
    const wordGap = useRef<{ path: number[]; offset: number; gap: "before" | "after" } | null>(null);
    const styleUndo = useRef<{ before: string; after: string; path: number[]; caret: number } | null>(null);
    const styleRedo = useRef<{ undone: string; redone: string; path: number[]; caret: number } | null>(null);
    const redoPage = useRef<{
        undone: string;
        redone: string;
        kind: "blank" | "heading" | "picture";
        path?: number[];
        tag?: string;
        text?: string;
        offset?: number;
        caretPath?: number[];
        caretOffset?: number;
        undoCaret?: number;
        breakIndex?: number;
        breakSide?: "before" | "after";
        sticky?: boolean;
        typedCaret?: number;
    } | null>(null);
    const keepBlank = (page: { before: string; after: string; path?: number[]; caret?: number; breakIndex?: number; breakSide?: "before" | "after"; sticky?: boolean }) => {
        blankLine.current = page;
        redoPage.current = null;
        selectionTyping.current = false;
        selectionTypeLine.current = null;
    };
    const keepSplit = (page: { before: string; after: string; tag: string; text: string; offset: number }) => {
        headingSplit.current = page;
        redoPage.current = null;
    };
    const keepPicture = (page: { before: string; after: string }) => {
        pictureRemoval.current = page;
        redoPage.current = null;
    };
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
    const [listQuery, setListQuery] = useState("");
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
                const requested = new URLSearchParams(window.location.search);
                const requestedId = requested.get("entry");
                const month = openedEntryMonth(requested.get("month"));
                setEntryMonth(month);
                const opened = entryFromAddress(loaded, requestedId, month, requested.get("q") ?? "");
                const latest = opened.entry;
                setEntryQuery(opened.query);
                setListQuery(openedDiaryQuery(requested.get("list")));
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
                if (!latest && opened.query && loaded.length > 0 && !resumeDraft) {
                    setMode("view");
                    setSelectedEntryId(null);
                    setConfirmDelete(null);
                }
                if (!latest && !resumeDraft && mounted && (loaded.length === 0 || !opened.query)) {
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
        if (isLoading || error) return;
        const month = entryMonth && entries.some((entry) => entryInMonth(entry.createdAt, entryMonth)) ? entryMonth : "";
        const next = entryListQueryAddress(entryMonthAddress(
            entryFindAddress(entryPageAddress(diaryId, selectedEntryId, mode), mode === "compose" ? "" : entryQuery),
            month,
        ), listQuery);
        const current = `${window.location.pathname}${window.location.search}`;
        if (current === next) return;
        window.history.replaceState(window.history.state, "", next);
    }, [isLoading, error, diaryId, mode, selectedEntryId, entryQuery, listQuery, entryMonth, entries]);

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
        const editor = editorRef.current;
        if (!editor) return;
        const plain = plainMarkSpaces(plainSpacesAfterMarks(editor.innerHTML));
        if (plain !== editor.innerHTML) restoreMarkSpaces(editor);
        settleDateHeading(editor);
        const saved = pictureRemoval.current;
        if (saved && editor.innerHTML !== saved.after) pictureRemoval.current = null;
        const split = headingSplit.current;
        if (split && editor.innerHTML !== split.after) headingSplit.current = null;
        const blank = blankLine.current;
        if (blank?.sticky && blank.typed && editingForward.current && sameEditingPage(editor.innerHTML, blank.after)) {
            blankLine.current = { ...blank, typed: undefined, typedCaret: undefined };
        }
        if (blank && selectionTyping.current && (selectionTypeStart.current !== null || selectionTypeLine.current)) {
            const selection = window.getSelection();
            const block = selection?.rangeCount ? lineBlock(selection.anchorNode) : null;
            const savedLine = blank.path ? nodeAtPath(editor, blank.path) : null;
            const anchor = selection?.anchorNode;
            const caret = selection?.rangeCount && block && anchor ? textOffsetWithin(block, anchor, selection.anchorOffset) : null;
            const sameLine = Boolean(block && block === savedLine && caret !== null && selectionTypeStart.current !== null && caret >= selectionTypeStart.current);
            const continued = Boolean(block && selectionTypeLine.current && block === selectionTypeLine.current);
            if (sameLine || continued) blankLine.current = { ...blank, after: editor.innerHTML };
            else selectionTyping.current = false;
        }
        if (blankLine.current && editor.innerHTML !== blankLine.current.after) {
            const saved = blankLine.current;
            const selection = window.getSelection();
            const block = selection?.rangeCount ? lineBlock(selection.anchorNode) : null;
            const savedLine = saved.path ? nodeAtPath(editor, saved.path) : null;
            const decision = stickyUndo({
                sticky: Boolean(saved.sticky),
                matches: false,
                sameLine: Boolean(block && savedLine && block === savedLine),
            });
            if (decision === "clear") {
                blankLine.current = null;
                selectionTyping.current = false;
            } else if (decision === "keep" && editingForward.current && stickyTyped({
                sticky: true,
                sameLine: true,
                current: editor.innerHTML,
                before: saved.before,
                after: saved.after,
            }) === "record") {
                const anchor = selection?.anchorNode;
                const caret = selection?.rangeCount && block && anchor ? textOffsetWithin(block, anchor, selection.anchorOffset) : null;
                blankLine.current = { ...saved, typed: editor.innerHTML, typedCaret: caret ?? undefined };
            }
        }
        const redo = redoPage.current;
        if (redo && editor.innerHTML !== redo.undone && editor.innerHTML !== redo.redone) redoPage.current = null;
        setHtmlContent(editor.innerHTML);
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
        pictureRemoval.current = null;
        redoPage.current = null;
        setPictureQueue([]);
        setPictureTotal(0);
        setImageAlt("");
    }, [mode]);

    useEffect(() => {
        if (!pendingDiscard) return;
        discardButtonRef.current?.focus();
    }, [pendingDiscard]);

    const rememberSelectionUndo = (host: HTMLElement, range: Range) => {
        if (range.collapsed) return null;
        const block = lineBlock(range.endContainer);
        if (!(block instanceof HTMLElement) || !host.contains(block)) return null;
        const caret = styleUndoCaret(textOffsetWithin(block, range.endContainer, range.endOffset));
        if (caret === null) return null;
        return { before: host.innerHTML, path: childPath(host, block), caret };
    };

    const keepSelectionUndo = (mark: { before: string; path: number[]; caret: number } | null, host: HTMLElement | null) => {
        if (!mark || !host || host.innerHTML === mark.before) return;
        styleUndo.current = { before: mark.before, after: host.innerHTML, path: mark.path, caret: mark.caret };
        styleRedo.current = null;
    };

    const selectionUndo = (host: HTMLElement | null) => {
        if (!host) return null;
        const selection = window.getSelection();
        if (!selection?.rangeCount || !host.contains(selection.anchorNode)) return null;
        const range = selection.getRangeAt(0);
        if (replacedSelectionUndo({ collapsed: range.collapsed }) !== "place") return null;
        return rememberSelectionUndo(host, range);
    };

    const keepReplacedSelection = (mark: { before: string; path: number[]; caret: number } | null) => {
        const host = editorRef.current;
        if (!mark || !host || host.innerHTML === mark.before) return;
        keepBlank({ before: mark.before, after: host.innerHTML, path: mark.path, caret: mark.caret });
    };

    const exec = useCallback((cmd: string, value?: string) => {
        const editor = editorRef.current;
        if (editor && dateHeadingHoldsSelection(editor, window.getSelection())) return;
        editor?.focus();
        const selection = window.getSelection();
        const lists = cmd === "insertUnorderedList" || cmd === "insertOrderedList";
        const range = editor && lists && selection?.rangeCount ? selection.getRangeAt(0) : null;
        const block = range ? (range.endContainer instanceof Element ? range.endContainer : range.endContainer.parentElement)?.closest("li, p") : null;
        const caret = editor && range && block instanceof HTMLElement
            ? { fromList: block.tagName === "LI", text: (block.textContent ?? "").replace(/\u00a0/g, " "), offset: textOffsetWithin(block, range.endContainer, range.endOffset) }
            : null;
        const lifting = Boolean(editor && listCommand(cmd) === "lift");
        const listBefore = lifting && editor ? editor.innerHTML : null;
        const listCaret = lifting && editor && range && block instanceof HTMLElement && editor.contains(block)
            ? listUndoCaret(textOffsetWithin(block, range.endContainer, range.endOffset))
            : null;
        const listPath = listCaret !== null && editor && block instanceof HTMLElement ? childPath(editor, block) : undefined;
        if (selection?.rangeCount && !selection.isCollapsed && STYLE_COMMANDS.has(cmd)) excludeStyleEdges(selection.getRangeAt(0));
        const formatRange = editor && selection?.rangeCount && formatUndoCommand(cmd) ? selection.getRangeAt(0) : null;
        const formatMark = formatRange && editor ? rememberSelectionUndo(editor, formatRange) : null;
        document.execCommand(cmd, false, value);
        keepSelectionUndo(formatMark, editor);
        if (editor && lifting) liftNestedLists(editor);
        if (editor && caret) placeListCaret(editor, caret.fromList, caret.text, caret.offset);
        if (listBefore !== null && editor && editor.innerHTML !== listBefore) {
            keepBlank({ before: listBefore, after: editor.innerHTML, path: listPath, caret: listCaret ?? undefined });
        }
        if (editorRef.current) setHtmlContent(editorRef.current.innerHTML);
        updateActiveFormats();
    }, [updateActiveFormats]);

    const insertHTML = useCallback((html: string) => {
        const editor = editorRef.current;
        editor?.focus();
        document.execCommand("insertHTML", false, html);
        if (editor && /<hr\b/i.test(html)) settleDivider(editor);
        if (editor && /<pre\b/i.test(html)) settleCode(editor);
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

    const dateLineLabel = () => {
        const instant = instantFor(entryDate);
        return instant ? fmtLong(instant.toISOString()) : "";
    };

    const movePasteOffDate = (selection: Selection) => {
        const editor = editorRef.current;
        const touched = editor ? selectedDateHeading(editor, selection, dateLineLabel()) : null;
        if (!editor || !touched) return "pass" as const;
        const action = datePaste({ touchesDate: true, onlyDate: touched.onlyDate });
        if (action === "replace-writing") selectReplaceRange(editor, touched.heading, selection);
        else placeWritingCaret(touched.heading, true);
        return action;
    };

    const onPaste = (event: React.ClipboardEvent<HTMLDivElement>) => {
        if (mode === "view") return;
        const data = event.clipboardData;
        const selection = window.getSelection();
        const editor = editorRef.current;
        if (editor && selection && data.files.length === 0 && selectionInsideCode(editor, selection)) {
            const text = data.getData("text/plain");
            if (text) {
                event.preventDefault();
                const mark = pasteSelectionUndo({ collapsed: selection.isCollapsed, action: "html" }) === "place" ? selectionUndo(editor) : null;
                insertHTML(codePasteHtml(text));
                keepReplacedSelection(mark);
                return;
            }
        }
        const moved = selection ? movePasteOffDate(selection) : "pass";
        if (moved !== "pass") event.preventDefault();
        const decision = decideEntryPaste({
            files: Array.from(data.files, (file) => ({ type: file.type, size: file.size })),
            html: data.getData("text/html"),
            text: data.getData("text/plain"),
        });
        if (decision.action === "default") {
            const text = data.getData("text/plain");
            const mark = moved === "pass" && text && editor && selection && pasteSelectionUndo({ collapsed: selection.isCollapsed, action: "default" }) === "place"
                ? selectionUndo(editor)
                : null;
            if (mark) {
                event.preventDefault();
                insertText(text);
                keepReplacedSelection(mark);
                return;
            }
            if (moved !== "pass") insertText(text);
            return;
        }
        event.preventDefault();
        if (decision.action === "reject") {
            toast({ title: decision.title, description: decision.description, variant: "destructive" });
            return;
        }
        if (decision.action === "html") {
            if (decision.warning) {
                toast({ title: decision.warning.title, description: decision.warning.description, variant: "destructive" });
            }
            const mark = moved === "pass" && editor && selection && pasteSelectionUndo({ collapsed: selection.isCollapsed, action: "html" }) === "place"
                ? selectionUndo(editor)
                : null;
            insertHTML(decision.html);
            keepReplacedSelection(mark);
            return;
        }
        if (decision.action === "plain") {
            const mark = moved === "pass" && editor && selection && pasteSelectionUndo({ collapsed: selection.isCollapsed, action: "plain" }) === "place"
                ? selectionUndo(editor)
                : null;
            insertText(decision.text);
            keepReplacedSelection(mark);
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

    const onDragStart = () => {
        dragUndo.current = null;
        if (mode === "view") return;
        const editor = editorRef.current;
        const selection = window.getSelection();
        if (!editor || !selection?.rangeCount) return;
        const range = selection.getRangeAt(0);
        if (dragSelectionUndo({ collapsed: range.collapsed, inWriting: writingSelection(editor, range) }) !== "place") return;
        dragUndo.current = selectionUndo(editor);
    };

    const onDragEnd = () => {
        const mark = dragUndo.current;
        dragUndo.current = null;
        const editor = editorRef.current;
        if (!mark || !editor) return;
        keepReplacedSelection(mark);
        setHtmlContent(editor.innerHTML);
    };

    const onCut = (event: React.ClipboardEvent<HTMLDivElement>) => {
        if (mode === "view") return;
        const editor = editorRef.current;
        const selection = window.getSelection();
        if (!editor || !selection) return;
        const touched = selectedDateHeading(editor, selection, dateLineLabel());
        if (touched) {
            event.preventDefault();
            event.clipboardData.setData("text/plain", selection.toString());
            if (datePaste({ touchesDate: true, onlyDate: touched.onlyDate }) !== "replace-writing") return;
            selectReplaceRange(editor, touched.heading, selection);
            document.execCommand("delete");
            setHtmlContent(editor.innerHTML);
            return;
        }
        if (!selection.rangeCount) return;
        const range = selection.getRangeAt(0);
        if (selectionCutUndo({ collapsed: range.collapsed, inWriting: writingSelection(editor, range) }) !== "place") return;
        const mark = selectionUndo(editor);
        if (!mark) return;
        const copied = document.execCommand("copy");
        event.preventDefault();
        if (!copied) {
            event.clipboardData.setData("text/plain", selection.toString());
            event.clipboardData.setData("text/html", cutSelectionHtml(range));
        }
        const block = wordBlock(range.startContainer);
        const endBlock = wordBlock(range.endContainer);
        let gap: "before" | "after" | "none" = "none";
        if (block instanceof HTMLElement && block === endBlock) {
            const rawStart = textOffsetWithin(block, range.startContainer, range.startOffset);
            const rawEnd = textOffsetWithin(block, range.endContainer, range.endOffset);
            const removal = cutRemoval(block.textContent ?? "", rawStart, rawEnd);
            gap = removal.gap;
            const widened = selectTextSpan(block, removal.start, removal.end);
            if (widened) {
                selection.removeAllRanges();
                selection.addRange(widened);
            }
        }
        document.execCommand("delete");
        if (block instanceof HTMLElement && block === endBlock) {
            dropEmptyMarks(block);
            block.normalize();
            if (blockIsEmpty(block)) {
                block.replaceChildren(document.createElement("br"));
                placeCaretAtStart(block);
                gap = "none";
            } else relaxBlockSpaces(block);
        }
        rememberWordGap(editor, block instanceof HTMLElement && block === endBlock ? block : null, gap);
        keepReplacedSelection(mark);
        setHtmlContent(editor.innerHTML);
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
        const markSelectedPicture = () => {
            const editor = editorRef.current;
            if (!editor) return;
            const current = editor.querySelector("img.de-selected");
            const selection = window.getSelection();
            if (mode !== "view" && selection?.isCollapsed) {
                const stranded = caretInsidePicture(editor, selection);
                if (stranded) selectPictureImage(stranded);
                const instant = instantFor(entryDate);
                const label = instant ? fmtLong(instant.toISOString()) : "";
                const line = dateLineContext(editor, selection, label);
                if (line?.where === "heading") {
                    const before = editor.innerHTML;
                    const peeled = peelDateLine(line.heading, label);
                    placeCaretIn(peeled.paragraph, 0);
                    if (editor.innerHTML !== before) setHtmlContent(editor.innerHTML);
                }
            }
            const image = selection ? selectedImage(editor, selection) : null;
            if (pictureSelectionMark({ editing: mode !== "view", imageSelected: Boolean(image) }) !== "selected" || !image) {
                if (current) clearPictureMark(current);
                return;
            }
            if (current && current !== image) clearPictureMark(current);
            image.classList.add("de-selected");
        };
        document.addEventListener("selectionchange", markSelectedPicture);
        markSelectedPicture();
        return () => document.removeEventListener("selectionchange", markSelectedPicture);
    }, [mode, entryDate]);

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
            router.push(diaryReturnAddress(entryQuery, listQuery));
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
        const mark = editor ? rememberSelectionUndo(editor, range) : null;
        document.execCommand(command, false, value);
        keepSelectionUndo(mark, editor);
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
        let linkMark: { before: string; path: number[]; caret: number } | null = null;
        if (linkRange.current && selection && editor) {
            excludeStyleEdges(linkRange.current);
            selection.removeAllRanges();
            selection.addRange(linkRange.current);
            linkMark = rememberSelectionUndo(editor, linkRange.current);
        }
        document.execCommand("createLink", false, parsed.href);
        keepSelectionUndo(linkMark, editor);
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

    const selectClickedPicture = (event: React.MouseEvent) => {
        const editor = editorRef.current;
        const target = event.target;
        if (mode === "view" || event.button !== 0 || !editor || !(target instanceof Node) || !editor.contains(target)) return;
        if (pictureClick({ image: target instanceof HTMLImageElement, inEditor: true }) !== "select") return;
        if (!(target instanceof HTMLImageElement)) return;
        event.preventDefault();
        editor.focus();
        const selection = window.getSelection();
        if (!selection) return;
        const range = document.createRange();
        range.selectNode(target);
        selection.removeAllRanges();
        selection.addRange(range);
    };

    const editSelectedPicture = (e: React.KeyboardEvent) => {
        const editor = editorRef.current;
        const selection = window.getSelection();
        if (!editor || !selection || mode === "view") return false;
        const image = selectedImage(editor, selection);
        const action = selectedPictureKey({
            key: e.key,
            altKey: e.altKey,
            ctrlKey: e.ctrlKey,
            metaKey: e.metaKey,
            imageSelected: Boolean(image),
        });
        if (action === "pass" || !image) return false;
        e.preventDefault();
        const figure = image.closest("figure");
        const picture = figure instanceof HTMLElement && editor.contains(figure) ? figure : image;
        if (action === "remove") {
            editor.querySelectorAll("img.de-selected").forEach((img) => clearPictureMark(img));
            const before = editor.innerHTML;
            const next = picture.nextElementSibling;
            picture.remove();
            if (next instanceof HTMLElement && editor.contains(next)) placeCaretAtStart(next);
            else {
                const paragraph = document.createElement("p");
                paragraph.appendChild(document.createElement("br"));
                editor.appendChild(paragraph);
                placeCaretAtStart(paragraph);
            }
            keepPicture({ before, after: editor.innerHTML });
        } else if (action === "name") {
            typePictureName(picture, image, e.key, selection);
        } else {
            const next = picture.nextElementSibling;
            if (next instanceof HTMLElement && editor.contains(next)) placeCaretAtStart(next);
            else {
                const paragraph = document.createElement("p");
                paragraph.appendChild(document.createElement("br"));
                picture.after(paragraph);
                placeCaretAtStart(paragraph);
            }
        }
        setHtmlContent(editor.innerHTML);
        return true;
    };

    const holdRedo = (page: {
        undone: string;
        redone: string;
        kind: "blank" | "heading" | "picture";
        path?: number[];
        tag?: string;
        text?: string;
        offset?: number;
        undoCaret?: number;
        breakIndex?: number;
        breakSide?: "before" | "after";
        sticky?: boolean;
        typedCaret?: number;
    }) => {
        const mark = editorRef.current ? caretMark(editorRef.current) : null;
        redoPage.current = { ...page, caretPath: mark?.path, caretOffset: mark?.offset };
    };

    const undoRemovedPicture = () => {
        const editor = editorRef.current;
        const saved = pictureRemoval.current;
        const action = pictureUndo({ saved, current: editor?.innerHTML ?? "" });
        if (!editor || !saved || action !== "restore") {
            if (saved && editor && editor.innerHTML !== saved.after) pictureRemoval.current = null;
            return false;
        }
        holdRedo({ undone: saved.before, redone: saved.after, kind: "picture" });
        pictureRemoval.current = null;
        editor.innerHTML = saved.before;
        setHtmlContent(saved.before);
        editor.focus();
        const image = editor.querySelector("img");
        if (image instanceof HTMLImageElement) {
            const selection = window.getSelection();
            const range = document.createRange();
            range.selectNode(image);
            selection?.removeAllRanges();
            selection?.addRange(range);
        }
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
        const before = editor.innerHTML;
        const path = childPath(editor, line.block);
        if (action === "remove") line.block.remove();
        placeCaretAtEnd(line.caption);
        if (action === "remove") keepBlank({ before, after: editor.innerHTML, path });
        setHtmlContent(editor.innerHTML);
        return true;
    };

    const moveAroundPicture = (e: React.KeyboardEvent) => {
        const editor = editorRef.current;
        const selection = window.getSelection();
        if (!editor || !selection || mode === "view") return false;
        const context = pictureMoveContext(editor, selection);
        if (!context) return false;
        const action = pictureMoveKey({
            key: e.key,
            shiftKey: e.shiftKey,
            altKey: e.altKey,
            ctrlKey: e.ctrlKey,
            metaKey: e.metaKey,
            where: context.where,
            atStart: context.atStart,
            atEnd: context.atEnd,
        });
        if (action === "pass") return false;
        if (action === "select") {
            const forward = e.key === "ArrowDown" || e.key === "ArrowRight";
            const target = context.where === "both"
                ? (forward ? context.nextFigure : context.previousFigure)
                : context.figure;
            const image = target?.querySelector("img");
            if (!(image instanceof HTMLImageElement)) return false;
            e.preventDefault();
            editor.focus();
            selectPictureImage(image);
            return true;
        }
        if (action === "before" && !context.figure.previousElementSibling) return false;
        if (action === "name" && !context.image) return false;
        e.preventDefault();
        const before = editor.innerHTML;
        if (action === "name" && context.image) typePictureName(context.figure, context.image, e.key, selection);
        else if (action === "before" || action === "after") moveBesidePicture(context.figure, action);
        if (editor.innerHTML !== before) setHtmlContent(editor.innerHTML);
        return true;
    };

    const keepPictureBounds = (e: React.KeyboardEvent) => {
        const editor = editorRef.current;
        const selection = window.getSelection();
        if (!editor || !selection || mode === "view") return false;
        const crossed = selectionCrossesPicture(editor);
        const action = pictureBoundsKey({
            key: e.key,
            altKey: e.altKey,
            ctrlKey: e.ctrlKey,
            metaKey: e.metaKey,
            collapsed: selection.isCollapsed,
            touchesPicture: crossed.touchesPicture,
            outsideSelected: crossed.outsideSelected,
        });
        if (action === "pass") return false;
        e.preventDefault();
        const beforeHtml = editor.innerHTML;
        const host = separatePictureSelection(editor, selection, action === "type");
        if (action === "type" && e.key.length === 1) {
            const caret = selection.getRangeAt(0);
            const holder = caret.startContainer instanceof Element ? caret.startContainer : caret.startContainer.parentElement;
            const caption = holder?.closest("figcaption");
            if (caption instanceof HTMLElement && caret.collapsed && caret.startContainer instanceof Text) {
                const text = caret.startContainer;
                const offset = caret.startOffset;
                text.data = `${text.data.slice(0, offset)}${e.key}${text.data.slice(offset)}`;
                caret.setStart(text, offset + e.key.length);
                caret.collapse(true);
                selection.removeAllRanges();
                selection.addRange(caret);
                const figure = caption.closest("figure");
                if (figure instanceof HTMLElement) syncPictureAlt(figure);
            } else document.execCommand("insertText", false, e.key);
        } else if (action === "type") {
            const anchor = selection.anchorNode;
            const holder = anchor instanceof Element ? anchor : anchor?.parentElement;
            const caption = holder?.closest("figcaption");
            if (caption instanceof HTMLElement && editor.contains(caption)) {
                tidyLeadingSpace(caption);
                if (!(caption.textContent ?? "").replace(/[\u00a0\s]/g, "")) caption.replaceChildren(document.createElement("br"));
                const figure = caption.closest("figure");
                if (figure instanceof HTMLElement) {
                    syncPictureAlt(figure);
                    const paragraph = document.createElement("p");
                    paragraph.appendChild(document.createElement("br"));
                    figure.after(paragraph);
                    placeCaretAtStart(paragraph);
                }
            } else {
                const block = holder?.closest("p, h1, h2, h3, li, blockquote");
                const empty = block instanceof HTMLElement && !(block.textContent ?? "").replace(/[\u00a0\s]/g, "");
                if (!empty) document.execCommand("insertParagraph", false);
            }
        }
        const path = host instanceof HTMLElement && editor.contains(host) ? childPath(editor, host) : undefined;
        keepBlank({ before: beforeHtml, after: editor.innerHTML, path });
        setHtmlContent(editor.innerHTML);
        return true;
    };

    const keepDateLine = (e: React.KeyboardEvent) => {
        const editor = editorRef.current;
        const selection = window.getSelection();
        if (!editor || !selection || mode === "view") return false;
        const instant = instantFor(entryDate);
        const label = instant ? fmtLong(instant.toISOString()) : "";
        const touched = selectedDateHeading(editor, selection, label);
        if (touched && selection.rangeCount) {
            const range = selection.getRangeAt(0);
            const writingSelected = pointAfterDate(touched.heading, range.endContainer, range.endOffset);
            const action = dateSelectionKey({
                key: e.key,
                altKey: e.altKey,
                ctrlKey: e.ctrlKey,
                metaKey: e.metaKey,
                collapsed: selection.isCollapsed,
                touchesDate: true,
                writingSelected,
            });
            if (action === "type") {
                e.preventDefault();
                if (writingSelected) selectReplaceRange(editor, touched.heading, selection);
                else {
                    const next = touched.heading.nextElementSibling;
                    if (next instanceof HTMLElement) placeCaretAtStart(next);
                    else placeCaretAtStart(writingLineAfter(touched.heading));
                }
                if (e.key.length === 1) document.execCommand("insertText", false, e.key);
                else if (writingSelected) {
                    document.execCommand("insertParagraph", false);
                    const first = touched.heading.nextElementSibling;
                    const second = first?.nextElementSibling;
                    if (first instanceof HTMLElement && second instanceof HTMLElement && blockIsEmpty(first) && blockIsEmpty(second) && !second.nextElementSibling) {
                        second.remove();
                        placeCaretAtStart(first);
                    }
                }
                setHtmlContent(editor.innerHTML);
                return true;
            }
            if (action === "leave") {
                e.preventDefault();
                const before = editor.innerHTML;
                const next = touched.heading.nextElementSibling;
                if (next instanceof HTMLElement) placeCaretAtStart(next);
                else placeCaretAtStart(writingLineAfter(touched.heading));
                if (editor.innerHTML !== before) setHtmlContent(editor.innerHTML);
                return true;
            }
            if (action === "clear") {
                e.preventDefault();
                const before = editor.innerHTML;
                const path = clearWritingSelection(editor, touched.heading, selection);
                keepBlank({ before, after: editor.innerHTML, path });
                setHtmlContent(editor.innerHTML);
                return true;
            }
        }
        const line = dateLineContext(editor, selection, label);
        if (!line) return false;
        const action = dateHeadingKey({
            key: e.key,
            altKey: e.altKey,
            ctrlKey: e.ctrlKey,
            metaKey: e.metaKey,
            where: line.where,
            atStart: line.atStart,
            empty: line.empty,
            followed: line.followed,
        });
        if (action === "pass") return false;
        e.preventDefault();
        if (action === "hold") return true;
        if (action === "drop") {
            const next = line.block.nextElementSibling;
            const before = editor.innerHTML;
            const path = childPath(editor, line.block);
            line.block.remove();
            if (next instanceof HTMLElement) placeCaretAtStart(next);
            keepBlank({ before, after: editor.innerHTML, path });
            setHtmlContent(editor.innerHTML);
            return true;
        }
        const before = editor.innerHTML;
        const peeled = peelDateLine(line.heading, label);
        placeCaretIn(peeled.paragraph, action === "write" ? peeled.offset : 0);
        if (action === "write" && e.key.length === 1 && !document.execCommand("insertText", false, e.key)) {
            const text = peeled.paragraph.textContent ?? "";
            peeled.paragraph.textContent = `${text.slice(0, peeled.offset)}${e.key}${text.slice(peeled.offset)}`;
            placeCaretIn(peeled.paragraph, peeled.offset + 1);
        }
        if (editor.innerHTML !== before) setHtmlContent(editor.innerHTML);
        return true;
    };

    const keepStyledLine = (e: React.KeyboardEvent) => {
        if (e.key !== "Enter") return false;
        const editor = editorRef.current;
        const selection = window.getSelection();
        if (!editor || !selection?.rangeCount || mode === "view") return false;
        const anchor = selection.anchorNode;
        if (!anchor || !editor.contains(anchor)) return false;
        const chain = styleChain(selection);
        if (!chain) return false;
        const block = lineBlock(chain[chain.length - 1]);
        if (!block || !editor.contains(block)) return false;
        const carry = styledLine({
            key: e.key,
            shiftKey: e.shiftKey,
            altKey: e.altKey,
            ctrlKey: e.ctrlKey,
            metaKey: e.metaKey,
            collapsed: selection.isCollapsed,
            atBlockEnd: caretAtBlockEnd(block, selection.getRangeAt(0)),
            coversBlock: chain.map((mark) => !blockTextOutside(mark, block)),
        });
        if (carry === null) return false;
        e.preventDefault();
        const before = editor.innerHTML;
        const range = selection.getRangeAt(0);
        const caret = styledLineUndoCaret(caretTextOffset(textPieces(block), range.startContainer, range.startOffset)) ?? undefined;
        const tag = block.tagName === "LI" ? "li" : block.tagName === "BLOCKQUOTE" ? "blockquote" : "p";
        const fresh = document.createElement(tag);
        let host: HTMLElement = fresh;
        for (let index = 0; index < carry; index += 1) {
            const source = chain[index];
            const kept = document.createElement(source.tagName.toLowerCase());
            if (source instanceof HTMLAnchorElement) {
                const href = source.getAttribute("href");
                if (href) kept.setAttribute("href", href);
            }
            host.appendChild(kept);
            host = kept;
        }
        host.appendChild(document.createElement("br"));
        block.after(fresh);
        placeCaretAtStart(host);
        keepBlank({ before, after: editor.innerHTML, path: childPath(editor, block), caret });
        setHtmlContent(editor.innerHTML);
        return true;
    };

    const keepStyledSpace = (e: React.KeyboardEvent) => {
        const editor = editorRef.current;
        const selection = window.getSelection();
        if (!editor || !selection?.rangeCount || mode === "view") return false;
        const anchor = selection.anchorNode;
        if (!anchor || !editor.contains(anchor)) return false;
        const mark = spaceMark(selection);
        const decision = {
            key: e.key,
            shiftKey: e.shiftKey,
            altKey: e.altKey,
            ctrlKey: e.ctrlKey,
            metaKey: e.metaKey,
            collapsed: selection.isCollapsed,
            atMarkEnd: Boolean(mark),
            outsideText: Boolean(mark),
        };
        const punctuation = styledPunctuation({ ...decision, endsWithDigit: mark ? markEndsWithDigit(mark) : false });
        if ((styledSpace(decision) !== "outside" && punctuation !== "outside") || !mark) return false;
        e.preventDefault();
        const before = editor.innerHTML;
        const block = mark.parentElement instanceof HTMLElement ? mark.parentElement : mark;
        const caret = anchor && block.contains(anchor) ? textOffsetWithin(block, anchor, selection.anchorOffset) : undefined;
        const inserted = e.key === " " ? "\u00a0" : e.key;
        const range = document.createRange();
        if (anchor instanceof Text && !mark.contains(anchor)) {
            const at = Math.min(selection.anchorOffset, anchor.data.length);
            anchor.insertData(at, inserted);
            range.setStart(anchor, at + inserted.length);
        } else {
            const text = document.createTextNode(inserted);
            mark.after(text);
            range.setStart(text, text.data.length);
        }
        range.collapse(true);
        selection.removeAllRanges();
        selection.addRange(range);
        keepBlank({ before, after: editor.innerHTML, path: childPath(editor, block), caret });
        setHtmlContent(editor.innerHTML);
        return true;
    };

    const keepCodeLine = (e: React.KeyboardEvent) => {
        const editor = editorRef.current;
        const selection = window.getSelection();
        if (!editor || !selection?.rangeCount || mode === "view") return false;
        const anchor = selection.anchorNode;
        const host = anchor instanceof Element ? anchor : anchor?.parentElement ?? null;
        const pre = host?.closest("pre");
        if (!(pre instanceof HTMLElement) || !editor.contains(pre)) return false;
        const range = selection.getRangeAt(0);
        if (!pre.contains(range.startContainer) || !pre.contains(range.endContainer)) return false;
        const code = host?.closest("code");
        const block = code instanceof HTMLElement && pre.contains(code) ? code : pre.querySelector("code");
        const target = block instanceof HTMLElement ? block : pre;
        const state = codeLineState(target, selection);
        if (!state) return false;
        const action = codeLineKey({
            key: e.key,
            altKey: e.altKey,
            ctrlKey: e.ctrlKey,
            metaKey: e.metaKey,
            inCode: true,
            collapsed: state.collapsed,
            blankLine: state.blankLine,
            trailing: state.trailing,
        });
        if (action === "pass") return false;
        e.preventDefault();
        if (action === "leave" && codeLeaveRemoval(target.textContent ?? "")) {
            const before = editor.innerHTML;
            const path = childPath(editor, pre);
            leaveCodeBlock(pre, target);
            keepBlank({ before, after: editor.innerHTML, path });
            setHtmlContent(editor.innerHTML);
            return true;
        }
        if (action === "leave") leaveCodeBlock(pre, target);
        else insertCodeNewline(target, selection);
        setHtmlContent(editor.innerHTML);
        return true;
    };

    const keepListLine = (e: React.KeyboardEvent) => {
        const editor = editorRef.current;
        const selection = window.getSelection();
        if (!editor || !selection?.rangeCount || mode === "view") return false;
        const anchor = selection.anchorNode;
        const host = anchor instanceof Element ? anchor : anchor?.parentElement ?? null;
        const item = host?.closest("li");
        if (!(item instanceof HTMLElement) || !editor.contains(item)) return false;
        const text = (item.textContent ?? "").replace(/[\u200b\u00a0]/g, "").trim();
        const empty = text.length === 0 && !item.querySelector("img");
        const action = listLeaveKey({
            key: e.key,
            shiftKey: e.shiftKey,
            altKey: e.altKey,
            ctrlKey: e.ctrlKey,
            metaKey: e.metaKey,
            inItem: true,
            collapsed: selection.isCollapsed,
            empty,
        });
        if (action === "leave") {
            e.preventDefault();
            const before = editor.innerHTML;
            const path = childPath(editor, item);
            leaveListItem(item);
            keepBlank({ before, after: editor.innerHTML, path });
            setHtmlContent(editor.innerHTML);
            return true;
        }
        const edges = caretEdges(item, selection);
        if (!edges) return false;
        const above = listEnterKey({
            key: e.key,
            shiftKey: e.shiftKey,
            altKey: e.altKey,
            ctrlKey: e.ctrlKey,
            metaKey: e.metaKey,
            inItem: true,
            collapsed: edges.collapsed,
            empty,
            atStart: edges.atStart,
        });
        if (above !== "above") return false;
        e.preventDefault();
        const before = editor.innerHTML;
        const path = childPath(editor, item);
        openLineAboveItem(item);
        keepBlank({ before, after: editor.innerHTML, path });
        setHtmlContent(editor.innerHTML);
        return true;
    };

    const keepQuoteLine = (e: React.KeyboardEvent) => {
        const editor = editorRef.current;
        const selection = window.getSelection();
        if (!editor || !selection?.rangeCount || mode === "view") return false;
        const anchor = selection.anchorNode;
        const host = anchor instanceof Element ? anchor : anchor?.parentElement ?? null;
        const quote = host?.closest("blockquote");
        if (!(quote instanceof HTMLElement) || !editor.contains(quote)) return false;
        const text = (quote.textContent ?? "").replace(/[\u200b\u00a0]/g, "").trim();
        const action = quoteLeaveKey({
            key: e.key,
            shiftKey: e.shiftKey,
            altKey: e.altKey,
            ctrlKey: e.ctrlKey,
            metaKey: e.metaKey,
            inQuote: true,
            collapsed: selection.isCollapsed,
            empty: text.length === 0 && !quote.querySelector("img"),
        });
        if (action === "leave") {
            e.preventDefault();
            const before = editor.innerHTML;
            const path = childPath(editor, quote);
            leaveQuote(quote);
            keepBlank({ before, after: editor.innerHTML, path });
            setHtmlContent(editor.innerHTML);
            return true;
        }
        if (e.key !== "Enter" || !selection.isCollapsed) return false;
        if (lineBlock(anchor) !== quote) return false;
        const nodes = textPieces(quote);
        const range = selection.getRangeAt(0);
        const raw = nodes.map((node) => node.data).join("");
        const offset = caretTextOffset(nodes, range.startContainer, range.startOffset);
        if (offset === null) return false;
        const beside = breakBesideCaret(selection, e.key);
        const split = quoteEnterKey({
            key: e.key,
            shiftKey: e.shiftKey,
            altKey: e.altKey,
            ctrlKey: e.ctrlKey,
            metaKey: e.metaKey,
            inQuote: true,
            collapsed: true,
            before: raw.slice(0, offset),
            after: raw.slice(offset),
            besideBreak: Boolean(beside),
        });
        if (split === "pass") return false;
        e.preventDefault();
        const before = editor.innerHTML;
        const quoteText = quote.textContent ?? "";
        if (split === "above") {
            const paragraph = document.createElement("p");
            paragraph.appendChild(document.createElement("br"));
            quote.before(paragraph);
            placeCaretAtStart(paragraph);
        } else if (split === "blank" && beside) openBlankLine(beside.br, beside.side);
        else breakQuote(quote, selection);
        keepSplit({ before, after: editor.innerHTML, tag: quote.tagName, text: quoteText, offset });
        setHtmlContent(editor.innerHTML);
        return true;
    };

    const keepBrokenLine = (e: React.KeyboardEvent) => {
        if (e.key !== "Backspace" && e.key !== "Delete") return false;
        const editor = editorRef.current;
        const selection = window.getSelection();
        if (!editor || !selection?.rangeCount || mode === "view" || !selection.isCollapsed) return false;
        const anchor = selection.anchorNode;
        const host = anchor instanceof Element ? anchor : anchor?.parentElement ?? null;
        if (host?.closest("pre") || host?.closest("figcaption")) return false;
        const beside = breakBesideCaret(selection, e.key);
        if (!beside || beside.br.closest("pre") || beside.br.closest("figcaption")) return false;
        const action = breakJoinKey({
            key: e.key,
            shiftKey: e.shiftKey,
            altKey: e.altKey,
            ctrlKey: e.ctrlKey,
            metaKey: e.metaKey,
            collapsed: true,
            atBreak: beside.side,
        });
        if (action !== "join") return false;
        e.preventDefault();
        const before = editor.innerHTML;
        const block = beside.br.closest("p, li, h1, h2, h3, blockquote");
        const path = block instanceof HTMLElement ? childPath(editor, block) : undefined;
        const index = block instanceof HTMLElement ? [...block.querySelectorAll("br")].indexOf(beside.br) : -1;
        const mark = breakUndoMark({ index, side: beside.side });
        const separated = joinBrokenLine(beside.br);
        rememberWordGap(editor, block instanceof HTMLElement ? block : null, separated);
        keepBlank({ before, after: editor.innerHTML, path, ...(mark ? { breakIndex: mark.index, breakSide: mark.side } : {}) });
        setHtmlContent(editor.innerHTML);
        return true;
    };

    const pullCodeEdge = (e: React.KeyboardEvent) => {
        const editor = editorRef.current;
        const selection = window.getSelection();
        if (!editor || !selection?.rangeCount || mode === "view") return false;
        const instant = instantFor(entryDate);
        const label = instant ? fmtLong(instant.toISOString()) : "";
        const dateHeading = label ? [...editor.querySelectorAll("h2")].find((heading) => (heading.textContent ?? "").trim() === label) : null;
        const anchor = selection.anchorNode;
        const host = anchor instanceof Element ? anchor : anchor?.parentElement ?? null;
        const pre = host?.closest("pre");
        if (pre instanceof HTMLElement && editor.contains(pre)) {
            const range = selection.getRangeAt(0);
            if (!pre.contains(range.startContainer) || !pre.contains(range.endContainer)) return false;
            const code = pre.querySelector("code");
            const target = code instanceof HTMLElement ? code : pre;
            const offset = textOffsetWithin(target, range.startContainer, range.startOffset);
            const atStart = (target.textContent ?? "").slice(0, offset).replace(/[\u200b\u00a0]/g, "") === "";
            const neighbor = adjacentTextBlock(pre, "previous");
            const action = codePullKey({
                key: e.key,
                shiftKey: e.shiftKey,
                altKey: e.altKey,
                ctrlKey: e.ctrlKey,
                metaKey: e.metaKey,
                collapsed: selection.isCollapsed,
                atStart,
                atEnd: false,
                neighbor: neighbor && neighbor !== dateHeading ? "text" : "none",
            });
            if (action !== "pull" || !neighbor) return false;
            e.preventDefault();
            const before = editor.innerHTML;
            const path = childPath(editor, pre);
            const separated = pullFirstCodeLine(neighbor, pre);
            rememberWordGap(editor, writingHost(neighbor), separated);
            keepBlank({ before, after: editor.innerHTML, path });
            setHtmlContent(editor.innerHTML);
            return true;
        }
        const block = lineBlock(selection.anchorNode);
        if (!block || !editor.contains(block) || block.closest("pre") || block.closest("figcaption")) return false;
        const edges = caretEdges(block, selection);
        const code = followingCode(block);
        if (!edges) return false;
        const action = codePullKey({
            key: e.key,
            shiftKey: e.shiftKey,
            altKey: e.altKey,
            ctrlKey: e.ctrlKey,
            metaKey: e.metaKey,
            collapsed: edges.collapsed,
            atStart: edges.atStart,
            atEnd: edges.atEnd,
            neighbor: code ? "code" : "none",
        });
        if (action !== "pull" || !code) return false;
        e.preventDefault();
        const before = editor.innerHTML;
        const path = childPath(editor, block);
        const range = selection.getRangeAt(0);
        const caret = codePullUndoCaret(textOffsetWithin(block, range.startContainer, range.startOffset)) ?? undefined;
        const separated = pullFirstCodeLine(block, code);
        rememberWordGap(editor, writingHost(block), separated);
        keepBlank({ before, after: editor.innerHTML, path, caret });
        setHtmlContent(editor.innerHTML);
        return true;
    };

    const joinLines = (e: React.KeyboardEvent) => {
        const editor = editorRef.current;
        const selection = window.getSelection();
        if (!editor || !selection?.rangeCount || mode === "view") return false;
        const block = lineBlock(selection.anchorNode);
        if (!block || !editor.contains(block) || block.closest("pre") || block.closest("figcaption")) return false;
        const instant = instantFor(entryDate);
        const label = instant ? fmtLong(instant.toISOString()) : "";
        const dateHeading = label ? [...editor.querySelectorAll("h2")].find((heading) => (heading.textContent ?? "").trim() === label) : null;
        if (block === dateHeading) return false;
        const edges = caretEdges(block, selection);
        if (!edges) return false;
        const backward = e.key === "Backspace";
        const neighbor = adjacentTextBlock(block, backward ? "previous" : "next");
        const edge = listEdgeKey({
            key: e.key,
            shiftKey: e.shiftKey,
            altKey: e.altKey,
            ctrlKey: e.ctrlKey,
            metaKey: e.metaKey,
            collapsed: edges.collapsed,
            atStart: edges.atStart,
            inItem: block.tagName === "LI",
            neighbor: neighbor === dateHeading ? "date" : neighbor ? "text" : "none",
        });
        if (edge === "outdent") {
            e.preventDefault();
            const before = editor.innerHTML;
            const path = childPath(editor, block);
            outdentListItem(block);
            keepBlank({ before, after: editor.innerHTML, path });
            setHtmlContent(editor.innerHTML);
            return true;
        }
        if (neighbor === dateHeading) return false;
        const action = lineJoinKey({
            key: e.key,
            shiftKey: e.shiftKey,
            altKey: e.altKey,
            ctrlKey: e.ctrlKey,
            metaKey: e.metaKey,
            collapsed: edges.collapsed,
            atStart: edges.atStart,
            atEnd: edges.atEnd,
            neighbor: neighbor ? "text" : "none",
            blockEmpty: blockIsEmpty(block),
            neighborEmpty: neighbor ? blockIsEmpty(neighbor) : false,
        });
        if (action === "pass" || !neighbor) return false;
        e.preventDefault();
        const before = editor.innerHTML;
        const forwardJoin = action === "join" && !backward;
        const anchor = selection.anchorNode;
        const caret = joinUndoCaret({
            forward: forwardJoin,
            offset: anchor && block.contains(anchor) ? textOffsetWithin(block, anchor, selection.anchorOffset) : -1,
        }) ?? undefined;
        const path = childPath(editor, block);
        let separated: "after" | "none" = "none";
        if (action === "clear") {
            removeJoined(backward ? neighbor : block);
            placeCaretAtStart(backward ? block : neighbor);
        } else if (action === "drop") {
            removeJoined(block);
            placeCaretAtEnd(neighbor);
        } else if (backward) separated = joinBlock(neighbor, block);
        else separated = joinBlock(block, neighbor);
        rememberWordGap(editor, writingHost(backward ? neighbor : block), separated);
        keepBlank({ before, after: editor.innerHTML, path, caret });
        setHtmlContent(editor.innerHTML);
        return true;
    };

    const undoHeadingSplit = () => {
        const editor = editorRef.current;
        const saved = headingSplit.current;
        if (!editor || !saved || headingSplitUndo({ saved, current: editor.innerHTML }) !== "restore") {
            if (saved && editor && editor.innerHTML !== saved.after) headingSplit.current = null;
            return false;
        }
        holdRedo({ undone: saved.before, redone: saved.after, kind: "heading", tag: saved.tag, text: saved.text, offset: saved.offset });
        headingSplit.current = null;
        editor.innerHTML = saved.before;
        setHtmlContent(saved.before);
        editor.focus();
        const heading = [...editor.querySelectorAll(saved.tag)].find((node) => node.textContent === saved.text);
        if (heading instanceof HTMLElement) placeCaretAtTextOffset(heading, saved.offset);
        return true;
    };

    const undoBlankLine = () => {
        const editor = editorRef.current;
        const saved = blankLine.current;
        const selection = window.getSelection();
        const block = selection?.rangeCount ? lineBlock(selection.anchorNode) : null;
        const savedLine = editor && saved?.path ? nodeAtPath(editor, saved.path) : null;
        const decision = stickyUndo({
            sticky: Boolean(saved?.sticky),
            matches: headingSplitUndo({ saved, current: editor?.innerHTML ?? "" }) === "restore",
            sameLine: Boolean(block && savedLine && block === savedLine),
        });
        if (!editor || !saved || decision !== "restore") {
            if (decision === "clear") blankLine.current = null;
            return false;
        }
        holdRedo({ undone: saved.before, redone: typedRedo({ redone: saved.after, typed: saved.typed, undone: saved.before }), kind: "blank", path: saved.path, undoCaret: saved.caret, breakIndex: saved.breakIndex, breakSide: saved.breakSide, sticky: saved.sticky, typedCaret: saved.typed ? saved.typedCaret : undefined });
        blankLine.current = null;
        selectionTyping.current = false;
        selectionTypeStart.current = null;
        selectionTypeLine.current = null;
        editor.innerHTML = saved.before;
        setHtmlContent(saved.before);
        editor.focus();
        const line = saved.path ? nodeAtPath(editor, saved.path) : editor.firstElementChild?.nextElementSibling;
        const caret = blankUndoCaret(saved);
        if (line instanceof HTMLElement && placeBreakCaret(line, saved.breakIndex, saved.breakSide)) return true;
        if (line instanceof HTMLElement && caret !== null) placeCaretAtTextOffset(line, caret);
        else if (line instanceof HTMLElement) placeCaretAtStart(line);
        return true;
    };

    const pageHoldsSnapshot = () => {
        const editor = editorRef.current;
        if (!editor) return false;
        const html = editor.innerHTML;
        return Boolean(
            (blankLine.current && sameEditingPage(html, blankLine.current.after))
            || (headingSplit.current && sameEditingPage(html, headingSplit.current.after))
            || (pictureRemoval.current && sameEditingPage(html, pictureRemoval.current.after))
        );
    };

    const redoSavedPage = () => {
        const editor = editorRef.current;
        const saved = redoPage.current;
        const matches = Boolean(editor && saved && sameEditingPage(editor.innerHTML, saved.undone));
        if (!editor || !saved || savedRedo({ command: "redo", matches }) !== "restore") {
            if (saved && editor && editor.innerHTML !== saved.undone) redoPage.current = null;
            return false;
        }
        editor.innerHTML = saved.redone;
        setHtmlContent(saved.redone);
        editor.focus();
        if (saved.kind === "blank") blankLine.current = { before: saved.undone, after: saved.redone, path: saved.path, caret: saved.undoCaret, breakIndex: saved.breakIndex, breakSide: saved.breakSide, sticky: saved.sticky };
        else if (saved.kind === "heading" && saved.tag && saved.text !== undefined && saved.offset !== undefined) {
            headingSplit.current = { before: saved.undone, after: saved.redone, tag: saved.tag, text: saved.text, offset: saved.offset };
        } else pictureRemoval.current = { before: saved.undone, after: saved.redone };
        const typedLine = typeof saved.typedCaret === "number" && saved.path ? nodeAtPath(editor, saved.path) : null;
        const line = saved.caretPath ? nodeAtPath(editor, saved.caretPath) : null;
        if (typedLine instanceof HTMLElement) placeCaretAtTextOffset(typedLine, saved.typedCaret ?? 0);
        else if (line instanceof HTMLElement) placeCaretAtTextOffset(line, saved.caretOffset ?? 0);
        redoPage.current = null;
        return true;
    };

    const placeStyleCaret = (path: number[], caret: number) => {
        const editor = editorRef.current;
        if (!editor) return;
        editor.focus();
        const line = nodeAtPath(editor, path);
        if (line instanceof HTMLElement) placeCaretAtTextOffset(line, caret);
    };

    const undoStyle = () => {
        const editor = editorRef.current;
        const saved = styleUndo.current;
        if (!editor || !saved || editor.innerHTML !== saved.after) {
            if (saved && editor && editor.innerHTML !== saved.after) styleUndo.current = null;
            return false;
        }
        if (!document.execCommand("undo")) return false;
        styleUndo.current = null;
        setHtmlContent(editor.innerHTML);
        if (editor.innerHTML !== saved.before) return true;
        styleRedo.current = { undone: editor.innerHTML, redone: saved.after, path: saved.path, caret: saved.caret };
        placeStyleCaret(saved.path, saved.caret);
        return true;
    };

    const redoStyle = () => {
        const editor = editorRef.current;
        const saved = styleRedo.current;
        if (!editor || !saved || editor.innerHTML !== saved.undone) {
            if (saved && editor && editor.innerHTML !== saved.undone) styleRedo.current = null;
            return false;
        }
        if (!document.execCommand("redo")) return false;
        styleRedo.current = null;
        setHtmlContent(editor.innerHTML);
        styleUndo.current = { before: saved.undone, after: editor.innerHTML, path: saved.path, caret: saved.caret };
        placeStyleCaret(saved.path, saved.caret);
        return true;
    };

    const keepHeadingLine = (e: React.KeyboardEvent) => {
        if (e.key !== "Enter") return false;
        const editor = editorRef.current;
        const selection = window.getSelection();
        if (!editor || !selection?.rangeCount || mode === "view" || !selection.isCollapsed) return false;
        const anchor = selection.anchorNode;
        const host = anchor instanceof Element ? anchor : anchor?.parentElement ?? null;
        const heading = host?.closest("h1, h2, h3");
        if (!(heading instanceof HTMLElement) || !editor.contains(heading)) return false;
        const instant = instantFor(entryDate);
        const label = instant ? fmtLong(instant.toISOString()) : "";
        const dateHeading = label ? [...editor.querySelectorAll("h2")].find((node) => (node.textContent ?? "").trim() === label) : null;
        const nodes = textPieces(heading);
        const range = selection.getRangeAt(0);
        const raw = nodes.map((node) => node.data).join("");
        const offset = caretTextOffset(nodes, range.startContainer, range.startOffset) ?? (raw.replace(/[\s\u00a0]/g, "") ? null : 0);
        if (offset === null) return false;
        const action = headingEnterKey({
            key: e.key,
            shiftKey: e.shiftKey,
            altKey: e.altKey,
            ctrlKey: e.ctrlKey,
            metaKey: e.metaKey,
            inHeading: true,
            collapsed: true,
            dateHeading: heading === dateHeading,
            hasImage: Boolean(heading.querySelector("img")),
            before: raw.slice(0, offset),
            after: raw.slice(offset),
        });
        if (action === "pass") return false;
        e.preventDefault();
        const before = editor.innerHTML;
        const text = heading.textContent ?? "";
        const tag = heading.tagName;
        if (action === "paragraph") {
            leaveHeading(heading, selection);
        } else {
            const paragraph = document.createElement("p");
            paragraph.appendChild(document.createElement("br"));
            if (action === "above") heading.before(paragraph);
            else heading.replaceWith(paragraph);
            placeCaretAtStart(paragraph);
        }
        keepSplit({ before, after: editor.innerHTML, tag, text, offset });
        setHtmlContent(editor.innerHTML);
        return true;
    };

    const trimSplit = (e: React.KeyboardEvent) => {
        if (e.key !== "Enter") return false;
        const editor = editorRef.current;
        const selection = window.getSelection();
        if (!editor || !selection?.rangeCount || mode === "view" || !selection.isCollapsed) return false;
        const anchor = selection.anchorNode;
        const host = anchor instanceof Element ? anchor : anchor?.parentElement ?? null;
        if (host?.closest("pre") || host?.closest("figcaption")) return false;
        const block = lineBlock(anchor);
        if (!block || !editor.contains(block)) return false;
        const nodes = textPieces(block);
        const range = selection.getRangeAt(0);
        const offset = caretTextOffset(nodes, range.startContainer, range.startOffset);
        if (offset === null) return false;
        const raw = nodes.map((node) => node.data).join("");
        const action = splitSpace({
            key: e.key,
            shiftKey: e.shiftKey,
            altKey: e.altKey,
            ctrlKey: e.ctrlKey,
            metaKey: e.metaKey,
            inCode: false,
            before: raw.slice(0, offset),
            after: raw.slice(offset),
        });
        const cut = boundarySpaceCut(raw.slice(0, offset), raw.slice(offset));
        if (action !== "trim" || !cut) return false;
        e.preventDefault();
        const before = editor.innerHTML;
        const path = childPath(editor, block);
        selectTextRange(nodes, offset - cut.before, offset + cut.after);
        document.execCommand(e.shiftKey ? "insertLineBreak" : "insertParagraph", false);
        keepBlank({ before, after: editor.innerHTML, path, caret: offset });
        setHtmlContent(editor.innerHTML);
        return true;
    };

    const keepSelectionEnter = (e: React.KeyboardEvent) => {
        const editor = editorRef.current;
        const selection = window.getSelection();
        if (!editor || !selection?.rangeCount || !(e.target instanceof Node) || !editor.contains(e.target)) return false;
        const range = selection.getRangeAt(0);
        if (selectionEnterUndo({
            key: e.key,
            shiftKey: e.shiftKey,
            altKey: e.altKey,
            ctrlKey: e.ctrlKey,
            metaKey: e.metaKey,
            collapsed: range.collapsed,
            inWriting: writingSelection(editor, range),
        }) !== "place") return false;
        const mark = selectionUndo(editor);
        if (!mark) return false;
        e.preventDefault();
        document.execCommand("insertParagraph");
        keepReplacedSelection(mark);
        setHtmlContent(editor.innerHTML);
        return true;
    };

    const keepSelectionType = (e: React.KeyboardEvent) => {
        const editor = editorRef.current;
        const selection = window.getSelection();
        if (!editor || !selection?.rangeCount || !(e.target instanceof Node) || !editor.contains(e.target)) return false;
        const range = selection.getRangeAt(0);
        const block = lineBlock(range.startContainer);
        const end = lineBlock(range.endContainer);
        if (selectionTypeUndo({
            key: e.key,
            altKey: e.altKey,
            ctrlKey: e.ctrlKey,
            metaKey: e.metaKey,
            composing: e.nativeEvent.isComposing,
            collapsed: range.collapsed,
            inWriting: writingSelection(editor, range),
        }) !== "place") return false;
        const mark = selectionUndo(editor);
        if (!mark || !(block instanceof HTMLElement)) return false;
        e.preventDefault();
        const start = styleUndoCaret(textOffsetWithin(block, range.startContainer, range.startOffset));
        const crossed = block !== end;
        document.execCommand("insertText", false, e.key);
        keepReplacedSelection(mark);
        selectionTyping.current = start !== null;
        selectionTypeStart.current = start;
        selectionTypeLine.current = crossed ? lineBlock(window.getSelection()?.anchorNode ?? null) : null;
        setHtmlContent(editor.innerHTML);
        return true;
    };

    const rememberWordGap = (editor: HTMLElement, block: HTMLElement | null, gap: "before" | "after" | "none") => {
        const selection = window.getSelection();
        if (gap === "none" || !block || !selection?.rangeCount || !selection.isCollapsed || !selection.anchorNode || !block.contains(selection.anchorNode)) {
            wordGap.current = null;
            return;
        }
        wordGap.current = {
            path: childPath(editor, block),
            offset: textOffsetWithin(block, selection.anchorNode, selection.anchorOffset),
            gap,
        };
    };
    const applyWordGap = (event: InputEvent) => {
        const pending = wordGap.current;
        const pasted = event.inputType === "insertFromPaste";
        if (event.inputType !== "insertText" && !pasted) {
            if (pending) wordGap.current = null;
            return;
        }
        const typed = pasted ? (event.data ?? event.dataTransfer?.getData("text/plain") ?? "") : (event.data ?? "");
        const editor = editorRef.current;
        const selection = window.getSelection();
        if (editor && selection?.rangeCount && selection.isCollapsed && selection.anchorNode && editor.contains(selection.anchorNode) && !pasted && (typed === " " || typed === "\u00a0")) {
            const block = wordBlock(selection.anchorNode);
            const instant = instantFor(entryDate);
            const label = instant ? fmtLong(instant.toISOString()) : "";
            const dateLine = Boolean(label) && block?.tagName === "H2" && (block.textContent ?? "") === label;
            if (block instanceof HTMLElement && editor.contains(block) && !dateLine && !block.closest("pre")) {
                const offset = textOffsetWithin(block, selection.anchorNode, selection.anchorOffset);
                const pendingHere = pending && nodeAtPath(editor, pending.path) === block && offset === pending.offset ? pending.gap : null;
                const space = wordGapSpace({ text: block.textContent ?? "", offset, gap: pendingHere });
                if (space.action === "hold") {
                    event.preventDefault();
                    wordGap.current = { path: childPath(editor, block), offset, gap: space.gap };
                    return;
                }
            }
        }
        if (!pending) return;
        wordGap.current = null;
        const decision = wordGapInsert(pending.gap, typed);
        if (!decision) return;
        if (!editor || !selection?.rangeCount || !selection.isCollapsed || !selection.anchorNode) return;
        const block = nodeAtPath(editor, pending.path);
        if (!(block instanceof HTMLElement) || !block.contains(selection.anchorNode)) return;
        const offset = textOffsetWithin(block, selection.anchorNode, selection.anchorOffset);
        if (offset !== pending.offset) return;
        event.preventDefault();
        if (decision.pull) {
            const text = block.textContent ?? "";
            const previous = text[offset - 1];
            if (offset > 0 && (previous === " " || previous === "\u00a0" || previous === "\t")) {
                const live = selectTextSpan(block, offset - 1, offset);
                const next = text[offset];
                const needsSpace = Boolean(next && /[\p{L}\p{N}]/u.test(next));
                if (live) {
                    selection.removeAllRanges();
                    selection.addRange(live);
                    document.execCommand("insertText", false, needsSpace ? `${decision.text} ` : decision.text);
                    placeCaretAtTextOffset(block, offset - 1 + decision.text.length);
                    setHtmlContent(editor.innerHTML);
                }
                return;
            }
        }
        document.execCommand("insertText", false, decision.text);
        placeCaretAtTextOffset(block, offset + decision.caret);
        setHtmlContent(editor.innerHTML);
    };
    const applyWordGapRef = useRef(applyWordGap);
    applyWordGapRef.current = applyWordGap;

    const keepSelectionDelete = (e: React.KeyboardEvent) => {
        const editor = editorRef.current;
        const selection = window.getSelection();
        if (!editor || !selection?.rangeCount || !(e.target instanceof Node) || !editor.contains(e.target)) return false;
        const range = selection.getRangeAt(0);
        if (selectionDeleteUndo({
            key: e.key,
            altKey: e.altKey,
            ctrlKey: e.ctrlKey,
            metaKey: e.metaKey,
            collapsed: range.collapsed,
        }) !== "place") return false;
        if (!writingSelection(editor, range)) return false;
        const mark = selectionUndo(editor);
        if (!mark) return false;
        e.preventDefault();
        const block = wordBlock(range.startContainer);
        const end = wordBlock(range.endContainer);
        const instant = instantFor(entryDate);
        const label = instant ? fmtLong(instant.toISOString()) : "";
        let gap: "before" | "after" | "none" = "none";
        if (block instanceof HTMLElement && block === end && !selectedDateHeading(editor, selection, label)) {
            const rawStart = textOffsetWithin(block, range.startContainer, range.startOffset);
            const rawEnd = textOffsetWithin(block, range.endContainer, range.endOffset);
            gap = wordDeleteGap(block.textContent ?? "", rawStart, rawEnd);
            const span = wordDeleteSpan(block.textContent ?? "", rawStart, rawEnd);
            const widened = selectTextSpan(block, span.start, span.end);
            if (widened) {
                selection.removeAllRanges();
                selection.addRange(widened);
            }
        }
        document.execCommand("delete");
        if (block instanceof HTMLElement) {
            dropEmptyMarks(block);
            block.normalize();
            if (blockIsEmpty(block)) {
                block.replaceChildren(document.createElement("br"));
                placeCaretAtStart(block);
                gap = "none";
            } else relaxBlockSpaces(block);
        }
        rememberWordGap(editor, block instanceof HTMLElement ? block : null, gap);
        keepReplacedSelection(mark);
        setHtmlContent(editor.innerHTML);
        return true;
    };

    const keepWordDelete = (event: { nativeEvent: Event; target: EventTarget | null; preventDefault: () => void }) => {
        const native = event.nativeEvent;
        if (!(native instanceof InputEvent) || mode === "view") return;
        const word = native.inputType === "deleteWordBackward" || native.inputType === "deleteWordForward";
        const selected = native.inputType === "deleteContentBackward" || native.inputType === "deleteContentForward";
        if (!word && !selected) return;
        const editor = editorRef.current;
        const selection = window.getSelection();
        if (!editor || !selection?.rangeCount || !(event.target instanceof Node) || !editor.contains(event.target)) return;
        const range = selection.getRangeAt(0);
        if (word ? !range.collapsed : range.collapsed) return;
        const instant = instantFor(entryDate);
        const label = instant ? fmtLong(instant.toISOString()) : "";
        if (selectedDateHeading(editor, selection, label)) return;
        const target = word ? native.getTargetRanges()[0] : range;
        if (!target) return;
        const block = wordBlock(target.startContainer);
        const end = wordBlock(target.endContainer);
        if (!(block instanceof HTMLElement) || block !== end || !editor.contains(block)) {
            if (!selected || !writingSelection(editor, range)) return;
            const mark = selectionUndo(editor);
            if (!mark) return;
            event.preventDefault();
            document.execCommand("delete");
            keepReplacedSelection(mark);
            setHtmlContent(editor.innerHTML);
            return;
        }
        const rawStart = textOffsetWithin(block, target.startContainer, target.startOffset);
        const rawEnd = textOffsetWithin(block, target.endContainer, target.endOffset);
        const gap = wordDeleteGap(block.textContent ?? "", rawStart, rawEnd);
        const span = wordDeleteSpan(block.textContent ?? "", rawStart, rawEnd);
        const caret = styleUndoCaret(textOffsetWithin(block, range.endContainer, range.endOffset));
        if (caret === null || !selectTextSpan(block, span.start, span.end)) return;
        event.preventDefault();
        const before = editor.innerHTML;
        const path = childPath(editor, block);
        removeTextSpan(block, span.start, span.end);
        if (editor.innerHTML === before) return;
        keepBlank({ before, after: editor.innerHTML, path, caret, sticky: true });
        rememberWordGap(editor, block, blockIsEmpty(block) ? "none" : gap);
        setHtmlContent(editor.innerHTML);
    };
    const keepWordDeleteRef = useRef(keepWordDelete);
    keepWordDeleteRef.current = keepWordDelete;
    useEffect(() => {
        const onBefore = (event: Event) => {
            const editor = editorRef.current;
            if (!(event instanceof InputEvent) || !editor || !(event.target instanceof Node) || !editor.contains(event.target)) return;
            editingForward.current = event.inputType !== "historyUndo" && event.inputType !== "historyRedo";
            if (event.inputType === "insertText" || event.inputType === "insertFromPaste") applyWordGapRef.current(event);
            else wordGap.current = null;
            if (event.defaultPrevented) return;
            keepWordDeleteRef.current({
                nativeEvent: event,
                target: event.target,
                preventDefault() {
                    event.preventDefault();
                },
            });
        };
        document.addEventListener("beforeinput", onBefore, true);
        return () => document.removeEventListener("beforeinput", onBefore, true);
    }, []);

    const handleKeyDown = (e: React.KeyboardEvent) => {
        if (saveEntryShortcut(e)) {
            e.preventDefault();
            void handleSave();
            return;
        }
        if (mode === "view") return;
        if (wordGap.current && wordGapKey({ key: e.key, shiftKey: e.shiftKey, ctrlKey: e.ctrlKey, metaKey: e.metaKey, altKey: e.altKey }) === "clear") wordGap.current = null;
        const styleCommand = styleShortcut({
            key: e.key,
            shiftKey: e.shiftKey,
            altKey: e.altKey,
            ctrlKey: e.ctrlKey,
            metaKey: e.metaKey,
        });
        const styleEditor = editorRef.current;
        if (styleCommand && styleEditor && e.target instanceof Node && styleEditor.contains(e.target)) {
            e.preventDefault();
            exec(styleCommand);
            return;
        }
        document.execCommand("defaultParagraphSeparator", false, "p");
        if (savedRedo({
            key: e.key,
            shiftKey: e.shiftKey,
            altKey: e.altKey,
            ctrlKey: e.ctrlKey,
            metaKey: e.metaKey,
            matches: true,
        }) === "restore") {
            const editor = editorRef.current;
            if (editor && e.target instanceof Node && editor.contains(e.target) && (redoSavedPage() || redoStyle() || pageHoldsSnapshot())) {
                e.preventDefault();
                return;
            }
        }
        if ((e.key === "z" || e.key === "Z") && (e.ctrlKey || e.metaKey) && !e.altKey && !e.shiftKey) {
            const editor = editorRef.current;
            if (editor && e.target instanceof Node && editor.contains(e.target) && (undoRemovedPicture() || undoHeadingSplit() || undoBlankLine() || undoStyle())) {
                e.preventDefault();
                return;
            }
        }
        if (keepPictureBounds(e)) return;
        if (keepDateLine(e)) return;
        if (keepHeadingLine(e)) return;
        if (keepCodeLine(e)) return;
        if (keepStyledLine(e)) return;
        if (keepStyledSpace(e)) return;
        if (keepListLine(e)) return;
        if (keepQuoteLine(e)) return;
        if (editSelectedPicture(e)) return;
        if (keepPictureNameApart(e)) return;
        if (moveAroundPicture(e)) return;
        if (pullCodeEdge(e)) return;
        if (keepBrokenLine(e)) return;
        if (joinLines(e)) return;
        if (trimSplit(e)) return;
        if (keepSelectionDelete(e)) return;
        if (keepSelectionType(e)) return;
        if (keepSelectionEnter(e)) return;
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
        const editorBefore = editor.innerHTML;
        const path = childPath(editor, caption);
        if (action === "break") {
            const caret = captionUndoCaret(continueAfterPicture(caption)) ?? undefined;
            keepBlank({ before: editorBefore, after: editor.innerHTML, path, caret });
        }
        setHtmlContent(editor.innerHTML);
    };

    const runTool = (tool: ToolButton) => {
        const editorForTool = editorRef.current;
        if (pictureFormat({
            inPicture: Boolean(editorForTool && selectionTouchesPicture(editorForTool)),
            command: tool.command,
            kind: tool.kind,
        }) === "keep") return;
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
            const replaced = selectionUndo(editor);
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
            if (replaced && editor && editor.innerHTML !== replaced.before) {
                keepBlank({ before: replaced.before, after: editor.innerHTML, path: replaced.path, caret: replaced.caret });
            }
            return;
        }
        if (tool.html) {
            const editor = editorRef.current;
            const replaced = selectionUndo(editor);
            insertHTML(tool.html);
            if (replaced && editor && editor.innerHTML !== replaced.before) {
                keepBlank({ before: replaced.before, after: editor.innerHTML, path: replaced.path, caret: replaced.caret });
            }
            return;
        }
        if (tool.command === "redo") {
            editorRef.current?.focus();
            if (redoSavedPage() || redoStyle() || pageHoldsSnapshot()) return;
        }
        if (tool.command && undoButton(tool.command) === "saved" && (undoRemovedPicture() || undoHeadingSplit() || undoBlankLine() || undoStyle())) return;
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
    const months = useMemo(() => entryFindMonths(entries.map((entry) => ({
        createdAt: entry.createdAt,
        matches: entryMatchesListQuery(entry, entryQuery),
    }))), [entries, entryQuery]);
    const activeMonth = months.some((month) => month.key === entryMonth) ? entryMonth : "";
    const visibleEntries = entries.filter((entry) =>
        entryInMonth(entry.createdAt, activeMonth)
        && entryMatchesListQuery(entry, entryQuery)
    );
    const findCountLabel = entryFindCountLabel(visibleEntries.length, entryQuery);
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
            if (event.altKey || event.ctrlKey || event.metaKey || event.shiftKey) return;
            if (inField && target !== entrySearchRef.current) return;
            const step = entryListStep(
                visibleEntries.map((entry) => entry._id),
                selectedEntryId,
                event.key === "ArrowDown" ? "next" : "previous",
            );
            if (step === "find") {
                if (!entrySearchRef.current) return;
                event.preventDefault();
                entrySearchRef.current.focus();
                return;
            }
            const next = step ? visibleEntries.find((entry) => entry._id === step) : null;
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
        const marked = showFindMarks(root, entryQuery, matchAt);
        const mark = marked.mark;
        const count = marked.count;
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
            <button onClick={() => router.push(diaryReturnAddress(diaryReturnQuery(window.location.search), ""))} style={{ fontFamily: "monospace", color: "#8a7860", fontSize: 11, letterSpacing: "0.2em", textTransform: "uppercase", borderBottom: "1px solid #5a4a38", background: "none", cursor: "pointer" }}>← return</button>
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
                .de-find-count{
                    margin:0 16px 8px;
                    font-family:'JetBrains Mono',monospace;font-size:10px;letter-spacing:0.08em;color:#a79f93;
                }
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
                #de-editor ul{padding-left:28px;margin:8px 0;list-style:disc;}
                #de-editor ol{padding-left:28px;margin:8px 0;list-style:decimal;}
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
                #de-editor pre code{display:block;min-height:1.6em;white-space:pre;}
                #de-editor a{color:#c4a882;text-decoration:underline;text-underline-offset:3px;}
                #de-editor img{max-width:100%;border-radius:6px;margin:12px 0;display:block;}
                #de-editor figure{margin:12px 0 16px;}
                #de-editor figure img{margin:0;}
                #de-editor figcaption{
                    font-family:'JetBrains Mono',monospace;
                    font-style:normal;
                    font-size:12px;
                    line-height:1.4;
                    letter-spacing:0.04em;
                    color:#a79f93;
                    margin-top:6px;
                }
                #de-editor img.de-selected{outline:1px solid #c4a882;outline-offset:3px;}

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
                            href={diaryReturnAddress(entryQuery, listQuery)}
                            className="de-back"
                            onClick={(event) => {
                                if (!isDirty) return;
                                event.preventDefault();
                                askToDiscard(() => router.push(diaryReturnAddress(entryQuery, listQuery)));
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
                                aria-describedby={findCountLabel ? "entry-find-count" : undefined}
                                onKeyDown={(event) => {
                                    if (event.key !== "Enter" || event.altKey || event.ctrlKey || event.metaKey) return;
                                    if (matchCount < 2) return;
                                    event.preventDefault();
                                    setMatchAt((current) => entryMatchCursor(matchCount, current, event.shiftKey ? "previous" : "next"));
                                }}
                            />
                        )}
                        {findCountLabel && (
                            <p id="entry-find-count" className="de-find-count" role="status">{findCountLabel}</p>
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
                                onMouseDown={selectClickedPicture}
                                onFocus={updateActiveFormats}
                                onKeyUp={updateActiveFormats}
                                onMouseUp={updateActiveFormats}
                                spellCheck={false}
                                onPaste={onPaste}
                                onCut={onCut}
                                onDragStart={onDragStart}
                                onDragEnd={onDragEnd}
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
