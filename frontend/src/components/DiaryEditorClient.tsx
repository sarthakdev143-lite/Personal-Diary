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
import { captionUndoCaret, codePasteHtml, decideEntryDrop, decideEntryPaste, imageAltText, imageFileIssue, imageHtml, lineAfterPictureKey, pictureBehindLine, pictureListTail, pictureLineHost, pictureQuoteShell, pictureForwardDelete, pictureGapDelete, pictureAheadDelete, pictureAheadReach, pictureRemovalCaret, pictureRemovalRoute, pictureRemovalHost, pictureRemovalSpace, pictureInlineEnter, pictureEdgeOffset, pictureBlockEnter, pictureAfterEnter, pictureBreakLine, pictureUnderLine, pictureLineJoin, pictureJoinCaret, picturePieceJoin, pictureInlineBackspace, pictureBackspaceFollows, pictureBoundsKey, pictureNameClear, pictureNameLine, pictureTypedPlace, pictureLetterAfter, pictureLetterBefore, pictureCutWords, pictureCutText, picturePasteWords, pastedPictureLine, pastedPictureLines, pictureNameEnter, pictureNameContinue, pictureHeadingContinue, pictureListContinue, pictureItemCaret, pictureHeadingBefore, pictureNameSelection, pictureNameWord, pictureWordEdge, pictureNamePaste, pictureNameAlt, pictureCopy, picturePaste, pictureNameBoundary, pictureCaptionKey, pictureCaptionJoin, pictureClick, pictureFormat, pictureInsert, datePicture, pictureMoveKey, pictureCaretNeighbor, pictureBesideTarget, pictureSelectionMark, pictureUndo, selectedPictureKey, selectedPictureEnter } from "@/lib/diary/paste";
import { diaryReturnAddress, diaryReturnQuery, entryCardClock, entryCardPreview, entryFindAddress, entryFromAddress, entryListQueryAddress, entryMatchCursor, entryMatchesListQuery, entryMonthAddress, entryPageAddress, entryShareAddress, openedDiaryQuery, openedEntryMonth, textRunHits } from "@/lib/diary/search";
import { entryListStep } from "@/lib/diary/keys";
import { commandKeyLabel, saveEntryShortcut } from "@/lib/diary/shortcut";
import { calendarDate, emptyEntryListMessage, entryFindCountLabel, entriesWithRestored, entryCardQuery, entryFindKeyAction, entryInMonth, entryInstant, entryLayerEscape, entryLinkUrl, entryFindMonths, entrySelectionAction, entryToOpenForFilter, entryToOpenWhenHidden, entryToShowAfterDelete, codeLineKey, codeLeaveRemoval, codePullKey, codeForwardJoin, codeAhead, codeListNest, codePastItem, codePictureWords, codePullUndoCaret, codeTail, codeLead, codeForwardLead, codeMarkTail, codeTailBack, codeBlockTail, codeQuoteEnd, codeListEnd, codeNextItem, codeNestedItem, codeHeadingEnd, codeHeadingForward, codeDivForward, codeDivLine, codeDivHost, codeDivRest, codeDivNest, codeDivDeep, codeDivSide, codeDivList, codeDivHead, codeLineBreak, codeBackLine, codeBackBreak, codeHeldWords, codeHeldStay, codeWrappedStay, codeHeldCode, codeTableStay, codePriorItem, codeHostItem, codeBreakLead, codeDeepHost, codeListLead, codeBeside, codeInside, codeAfterHost, codeShellLead, codeEdgeLead, codePictureLead, codeTableLead, codeTableHost, codeListHost, codePictureHost, codeDividerHost, codeQuoteHost, codeDividerLead, codeDivLead, codeQuoteShell, codeQuoteLead, dateHeadingKey, dateFormatReach, dateArrow, dateCaretLeave, dateLeaveTarget, dateLineTyping, freshDateLineMarkup, datePaste, dateSelectionKey, dateFieldAfterEdit, dateRetitleAction, entryUndoBody, leadingDateLabel, entryWritingText, dropCaretMarker, caretMarkBeside, formatEntryLong, formatDiaryDate, freshEntryHtml, blankUndoCaret, joinUndoCaret, boundarySpaceCut, codeGap, dividerCaret, hasEntryContent, headingEnterKey, headingSplitUndo, splitSpace, plainGaps, plainMarkSpaces, plainSpacesAfterMarks, styleEdgeCut, styleShortcut, styleUndoCaret, formatUndoCommand, replacedSelectionUndo, dragSelectionUndo, pasteSelectionUndo, selectionCutUndo, selectionDeleteUndo, selectionEnterUndo, selectionTypeUndo, styledLine, wordDeleteSpan, wordDeleteGap, cutRemoval, wordGapInsert, wordGapKey, wordGapSpace, stickyUndo, stickyTyped, typedRedo, styledLineUndoCaret, styledPunctuation, styledSpace, joinGap, joinNeedsSpace, lineJoinKey, quoteLineEdge, quoteJoinTarget, quotePictureJoin, quoteTrailingLeave, quoteListTail, quoteAfterList, breakJoinKey, breakUndoMark, listCommand, listUndoCaret, listEdgeKey, listIndentKey, listLeaveKey, nestedListJoinKey, nestedEnterKey, nestedListLeave, listHeading, listHeadingPicture, pictureListChange, pictureListReach, listReachBlock, pictureCodeList, pictureTableList, pictureStyle, pictureStyleHold, pictureStyleSeat, pictureLineItalic, pictureLinkField, listHeadingAcross, listBlock, listLineSpace, listBlockPlace, pictureBlockEnds, pictureItemSpan, listBlockNumbers, listLeavePlace, listEnterKey, orderedItemNumber, quoteEnterKey, quoteLeaveKey, quoteCoveredBlocks, quoteCoveredReach, quoteBreakBlock, quoteTouchedBlocks, quoteListPortion, quoteListPlan, breakHeadingAcross, writingHeadingAcross, quotedListLift, quoteListAgain, quotedListJoinValue, keptListNumber, listLineLeaves, quoteToggle, italicInQuote, linkUnderline, linkUnderlineShown, linkUnderlineKey, deletedStrike, deletedStrikeShown, deletedStrikeKey, typedQuoteUndoCaret, quoteItalicKey, styleStartType, linkEdgeType, sameEditingPage, savedRedo, undoButton, monthForSavedEntry, retitleEntryDate, showOpenEntry, wordCount } from "@/lib/diary/text";import { normalizeDescription, normalizeTitle } from "@/lib/diary/validation";

type Diary = { _id: string; title: string; description: string; theme: string; pinned?: boolean; createdAt: string; updatedAt: string; };
type Entry = { _id: string; diaryId: string; content: string; plainText?: string; createdAt: string; updatedAt: string; };
type DiaryResponse = { diary: Diary; entries: Entry[]; };
type EditorMode = "compose" | "view" | "edit";

const fmtShort = formatDiaryDate;
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
    kind?: "image" | "link" | "code" | "divider";
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
        { icon: "—", title: "Divider", html: "<hr/><p><br></p>", kind: "divider" },
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
    return [...editor.querySelectorAll("figure")].some((figure) => {
        try {
            return range.intersectsNode(figure);
        } catch {
            return false;
        }
    });
}

function rangeCrossesPicture(editor: HTMLElement, target: AbstractRange): { touchesPicture: boolean; outsideSelected: boolean } {
    const range = document.createRange();
    try {
        range.setStart(target.startContainer, target.startOffset);
        range.setEnd(target.endContainer, target.endOffset);
    } catch {
        return { touchesPicture: false, outsideSelected: false };
    }
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

function selectedPictureName(editor: HTMLElement, selection: Selection): HTMLElement | null {
    if (!selection.rangeCount || selection.isCollapsed) return null;
    const range = selection.getRangeAt(0);
    const captionFor = (node: Node) => {
        const host = node instanceof Element ? node : node.parentElement;
        const caption = host?.closest("figcaption");
        return caption instanceof HTMLElement ? caption : null;
    };
    const start = captionFor(range.startContainer);
    const end = captionFor(range.endContainer);
    if (!start || start !== end || !editor.contains(start)) return null;
    return start;
}

function pictureGapNext(figure: HTMLElement): "writing" | "empty" | "none" {
    let node: ChildNode | null = figure.nextSibling;
    while (node instanceof Text && !node.data.replace(/[\u00a0\s\u200b]/g, "")) node = node.nextSibling;
    if (!node) return "none";
    if (node instanceof Text) return "writing";
    if (node instanceof HTMLElement) return (node.textContent ?? "").replace(/[\u00a0\s\u200b]/g, "") ? "writing" : "empty";
    return "none";
}

function placeCaretAfterGap(figure: HTMLElement) {
    let node: ChildNode | null = figure.nextSibling;
    while (node instanceof Text && !node.data.replace(/[\u00a0\s\u200b]/g, "")) node = node.nextSibling;
    if (node instanceof Text) placeCaretInText(node, 0);
    else if (node instanceof HTMLElement) placeCaretAtStart(node);
}

function typeAfterPicture(range: Range): HTMLElement | null {
    if (!range.collapsed || !(range.startContainer instanceof Element)) return null;
    const before = range.startContainer.childNodes[range.startOffset - 1];
    return before instanceof HTMLElement && before.tagName === "FIGURE" ? before : null;
}

function typeBeforePicture(range: Range): HTMLElement | null {
    if (!range.collapsed || !(range.startContainer instanceof Element)) return null;
    const next = range.startContainer.childNodes[range.startOffset];
    return next instanceof HTMLElement && next.tagName === "FIGURE" ? next : null;
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
        const figureRange = document.createRange();
        figureRange.selectNode(figure);
        const startsOutside = range.compareBoundaryPoints(Range.START_TO_START, figureRange) <= 0;
        const endsOutside = range.compareBoundaryPoints(Range.END_TO_END, figureRange) >= 0;
        if (pictureNameClear({ startsOutside, endsOutside }) === "keep") return [];
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
        let sibling: ChildNode | null = lastFigure.nextSibling;
        while (sibling instanceof Text && !sibling.data.replace(/[\u00a0\s]/g, "")) sibling = sibling.nextSibling;
        const next = sibling instanceof HTMLElement ? sibling : lastFigure.nextElementSibling;
        const place = pictureTypedPlace({
            next: sibling instanceof Text ? "text" : next instanceof HTMLElement && editor.contains(next) ? "element" : "none",
            line: pictureNameLine(lastFigure.parentElement?.tagName ?? "DIV"),
        });
        if (place === "text" && sibling instanceof Text) {
            const caret = document.createRange();
            caret.setStart(sibling, 0);
            caret.collapse(true);
            selection.removeAllRanges();
            selection.addRange(caret);
            return sibling.parentElement instanceof HTMLElement ? sibling.parentElement : lastFigure;
        }
        if (place === "block" && next instanceof HTMLElement && editor.contains(next)) {
            placeCaretAtStart(next);
            return next;
        }
        if (place === "beside") {
            const caret = document.createRange();
            caret.setStartAfter(lastFigure);
            caret.collapse(true);
            selection.removeAllRanges();
            selection.addRange(caret);
            return lastFigure.parentElement instanceof HTMLElement ? lastFigure.parentElement : lastFigure;
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

function pictureAheadOfCaret(editor: HTMLElement, selection: Selection): { figure: HTMLElement; ahead: "picture" | "space" } | null {
    if (!selection.rangeCount || !selection.isCollapsed) return null;
    const range = selection.getRangeAt(0);
    if (!editor.contains(range.startContainer)) return null;
    const anchor = range.startContainer;
    const host = anchor instanceof Element ? anchor : anchor.parentElement;
    if (host?.closest("figcaption")) return null;
    const caret = document.createRange();
    caret.setStart(range.startContainer, range.startOffset);
    caret.collapse(true);
    for (const figure of editor.querySelectorAll("figure")) {
        if (!(figure instanceof HTMLElement) || figure.contains(range.startContainer)) continue;
        const start = document.createRange();
        start.setStartBefore(figure);
        start.collapse(true);
        if (caret.compareBoundaryPoints(Range.START_TO_START, start) > 0) continue;
        const blockSelector = "p, li, h1, h2, h3, blockquote, td, th, pre";
        const caretBlock = host?.closest(blockSelector);
        const figureBlock = figure.closest(blockSelector);
        const sameBlock = caretBlock instanceof HTMLElement && figureBlock === caretBlock;
        const siblingBlock = !(figureBlock instanceof HTMLElement) && (
            (caretBlock instanceof HTMLElement && figure.parentElement === caretBlock.parentElement)
            || (!(caretBlock instanceof HTMLElement) && figure.parentElement === editor)
        );
        if (pictureAheadReach({ sameBlock, siblingBlock }) === "none") continue;
        const gap = document.createRange();
        gap.setStart(range.startContainer, range.startOffset);
        gap.setEndBefore(figure);
        if (pictureGap(gap)) return { figure, ahead: "picture" };
        if (gap.toString().replace(/[\u00a0\s]/g, "") === "" && gap.cloneContents().querySelector("br, img, figure, table, pre") === null) {
            return { figure, ahead: "space" };
        }
    }
    return null;
}

function pictureSideText(node: Node | null, edge: "start" | "end"): Text | null {
    if (node instanceof Text) return node;
    if (!(node instanceof HTMLElement) || pictureRemovalHost(node.tagName) === "block") return null;
    return pictureSideText(edge === "end" ? node.lastChild : node.firstChild, edge);
}

function removePictureAhead(figure: HTMLElement, editor: HTMLElement) {
    const previous = figure.previousSibling;
    const next = figure.nextSibling;
    const beforeText = pictureSideText(previous, "end");
    const afterText = pictureSideText(next, "start");
    if (beforeText && afterText) {
        const place = pictureRemovalSpace({
            before: beforeText.data,
            after: afterText.data,
            beforeStyled: beforeText.parentElement !== figure.parentElement,
            afterStyled: afterText.parentElement !== figure.parentElement,
        });
        if (place !== "none") {
            const left = beforeText.data.replace(/[\u00a0\s]+$/g, "");
            const right = afterText.data.replace(/^[\u00a0\s]+/g, "");
            beforeText.data = place === "between" ? `${left} ` : left;
            afterText.data = right;
            if (place === "outside") figure.parentNode?.insertBefore(document.createTextNode(" "), figure);
        }
    }
    const parent = figure.parentElement;
    const previousBlock = figure.previousElementSibling;
    figure.remove();
    const selection = window.getSelection();
    const nextKind = next instanceof Text
        ? "text"
        : next instanceof HTMLElement && next.tagName === "FIGURE"
            ? "picture"
            : next instanceof HTMLElement
                ? "block"
                : "none";
    const inLine = parent instanceof HTMLElement && parent !== editor && pictureNameLine(parent.tagName) !== "page";
    const caretPlace = pictureRemovalCaret({
        next: nextKind,
        inLine,
        previous: previousBlock instanceof HTMLElement && editor.contains(previousBlock),
    });
    if (caretPlace === "text" && next instanceof Text) {
        const caret = document.createRange();
        caret.setStart(next, 0);
        caret.collapse(true);
        selection?.removeAllRanges();
        selection?.addRange(caret);
        return;
    }
    if (caretPlace === "before" && next instanceof HTMLElement) {
        const caret = document.createRange();
        caret.setStartBefore(next);
        caret.collapse(true);
        selection?.removeAllRanges();
        selection?.addRange(caret);
        return;
    }
    if (caretPlace === "previous" && previousBlock instanceof HTMLElement && editor.contains(previousBlock)) {
        placeCaretAtEnd(previousBlock);
        return;
    }
    if (caretPlace === "inside" && next instanceof HTMLElement && editor.contains(next)) {
        placeCaretAtStart(next);
        return;
    }
    if (parent instanceof HTMLElement && editor.contains(parent) && parent !== editor) {
        placeCaretAtEnd(parent);
        return;
    }
    const paragraph = document.createElement("p");
    paragraph.appendChild(document.createElement("br"));
    editor.appendChild(paragraph);
    placeCaretAtStart(paragraph);
}

function pictureGap(range: Range): boolean {
    if (range.toString().length !== 0) return false;
    return range.cloneContents().querySelector("br, img, figure, table, pre") === null;
}

function inlinePictureBesideCaret(editor: HTMLElement, selection: Selection): { figure: HTMLElement; side: "before" | "after" } | null {
    if (!selection.rangeCount || !selection.isCollapsed) return null;
    const range = selection.getRangeAt(0);
    if (!editor.contains(range.startContainer)) return null;
    const anchor = range.startContainer;
    const host = anchor instanceof Element ? anchor : anchor.parentElement;
    const block = host?.closest("p, li, h1, h2, h3, blockquote, td, th");
    if (!(block instanceof HTMLElement) || !editor.contains(block) || host?.closest("figcaption")) return null;
    let after: HTMLElement | null = null;
    let before: HTMLElement | null = null;
    const caret = document.createRange();
    caret.setStart(range.startContainer, range.startOffset);
    caret.collapse(true);
    for (const figure of block.querySelectorAll("figure")) {
        if (!(figure instanceof HTMLElement) || figure.contains(range.startContainer)) continue;
        const afterPoint = document.createRange();
        afterPoint.setStartAfter(figure);
        afterPoint.collapse(true);
        const order = afterPoint.compareBoundaryPoints(Range.START_TO_START, caret);
        if (order <= 0) {
            const gap = document.createRange();
            gap.setStartAfter(figure);
            gap.setEnd(range.startContainer, range.startOffset);
            if (pictureGap(gap)) after = figure;
            continue;
        }
        const gap = document.createRange();
        gap.setStart(range.startContainer, range.startOffset);
        gap.setEndBefore(figure);
        if (pictureGap(gap)) before = before ?? figure;
    }
    if (after) return { figure: after, side: "after" };
    if (before) return { figure: before, side: "before" };
    return null;
}

function openLineUnderPicture(text: Text) {
    const lead = document.createTextNode("\u200b");
    const line = document.createElement("br");
    text.before(lead, line);
    placeCaretInText(lead, lead.data.length);
}

function splitBesidePicture(block: HTMLElement, figure: HTMLElement, side: "before" | "after") {
    const line = block.tagName === "BLOCKQUOTE" || block.tagName === "TD" || block.tagName === "TH";
    if (line) {
        let neighbor: ChildNode | null = side === "after" ? figure.nextSibling : figure.previousSibling;
        while (neighbor instanceof Text && !neighbor.data.replace(/[\u00a0\s\u200b]/g, "")) {
            neighbor = side === "after" ? neighbor.nextSibling : neighbor.previousSibling;
        }
        const next = neighbor instanceof Text
            ? "text"
            : neighbor instanceof HTMLElement && neighbor.tagName === "FIGURE"
                ? "picture"
                : neighbor instanceof HTMLElement && neighbor.tagName !== "BR"
                    ? "block"
                    : "none";
        const lineBreak = pictureBreakLine({ next, side });
        if (lineBreak === "paragraph") {
            const paragraph = document.createElement("p");
            paragraph.appendChild(document.createElement("br"));
            if (side === "after") figure.after(paragraph);
            else figure.before(paragraph);
            placeCaretAtStart(paragraph);
            return;
        }
        if (lineBreak === "under" && neighbor instanceof Text) {
            openLineUnderPicture(neighbor);
            return;
        }
        if (lineBreak === "apart" && neighbor instanceof Text) {
            const opening = document.createElement("br");
            const closing = document.createElement("br");
            if (side === "after") neighbor.before(opening, closing);
            else neighbor.after(opening, closing);
            const parent = opening.parentNode;
            if (parent) {
                const caret = document.createRange();
                caret.setStart(parent, [...parent.childNodes].indexOf(closing));
                caret.collapse(true);
                const selection = window.getSelection();
                selection?.removeAllRanges();
                selection?.addRange(caret);
            }
            return;
        }
        const br = document.createElement("br");
        if (side === "after") figure.after(br);
        else figure.before(br);
        const caret = document.createRange();
        if (br.nextElementSibling?.tagName === "FIGURE") {
            const lead = document.createTextNode("\u200b");
            br.after(lead);
            caret.setStart(lead, lead.data.length);
        } else caret.setStartAfter(br);
        caret.collapse(true);
        const selection = window.getSelection();
        selection?.removeAllRanges();
        selection?.addRange(caret);
        return;
    }
    if (side === "after") {
        let neighbor: ChildNode | null = figure.nextSibling;
        while (neighbor instanceof Text && !neighbor.data.replace(/[\u00a0\s\u200b]/g, "")) neighbor = neighbor.nextSibling;
        const kind = neighbor instanceof Text ? "text" : neighbor instanceof HTMLElement ? "block" : "none";
        const heading = block.tagName === "H1" || block.tagName === "H2" || block.tagName === "H3";
        if (pictureHeadingContinue({ heading, next: kind }) === "apart" && neighbor instanceof Text) {
            const paragraph = document.createElement("p");
            paragraph.appendChild(document.createElement("br"));
            const rest = document.createElement("p");
            let moving: ChildNode | null = neighbor;
            while (moving) {
                const following: ChildNode | null = moving.nextSibling;
                rest.append(moving);
                moving = following;
            }
            block.after(paragraph);
            paragraph.after(rest);
            placeCaretAtStart(paragraph);
            return;
        }
        const listNext = neighbor instanceof Text
            ? "text"
            : neighbor instanceof HTMLElement && (neighbor.tagName === "UL" || neighbor.tagName === "OL")
                ? "list"
                : neighbor instanceof HTMLElement
                    ? "block"
                    : "none";
        const listPlace = pictureListContinue({ item: block.tagName === "LI", next: listNext });
        if (listPlace === "with" && neighbor) {
            const opening = document.createElement("li");
            const lead = document.createTextNode("\u200b");
            opening.append(lead);
            let moving: ChildNode | null = neighbor;
            while (moving) {
                const following: ChildNode | null = moving.nextSibling;
                opening.append(moving);
                moving = following;
            }
            block.after(opening);
            placeCaretInText(lead, lead.data.length);
            return;
        }
        if (listPlace === "apart" && neighbor) {
            const opening = document.createElement("li");
            opening.appendChild(document.createElement("br"));
            const rest = document.createElement("li");
            let moving: ChildNode | null = neighbor;
            while (moving) {
                const following: ChildNode | null = moving.nextSibling;
                rest.append(moving);
                moving = following;
            }
            block.after(opening);
            opening.after(rest);
            placeCaretAtStart(opening);
            return;
        }
    }
    const heading = block.tagName === "H1" || block.tagName === "H2" || block.tagName === "H3";
    if (side === "before" && pictureHeadingBefore({ heading }) === "apart") {
        const paragraph = document.createElement("p");
        paragraph.appendChild(document.createElement("br"));
        const following: ChildNode[] = [];
        let node: ChildNode | null = figure.nextSibling;
        while (node) {
            const nextNode: ChildNode | null = node.nextSibling;
            following.push(node);
            node = nextNode;
        }
        block.after(paragraph);
        paragraph.after(figure);
        const writing = following.some((child) => child instanceof Text
            ? child.data.replace(/[\u00a0\s\u200b]/g, "") !== ""
            : child instanceof HTMLElement && child.tagName !== "BR");
        if (writing) {
            const rest = document.createElement("p");
            for (const child of following) rest.append(child);
            figure.after(rest);
        } else {
            for (const child of following) child.remove();
        }
        placeCaretAtStart(paragraph);
        return;
    }
    const next = document.createElement(block.tagName === "LI" ? "li" : "p");
    let node: ChildNode | null = side === "after" ? figure.nextSibling : figure;
    while (node) {
        const following: ChildNode | null = node.nextSibling;
        next.append(node);
        node = following;
    }
    if (!next.childNodes.length) next.append(document.createElement("br"));
    block.after(next);
    const selection = window.getSelection();
    if (next.firstElementChild?.tagName === "FIGURE") {
        const lead = document.createTextNode("\u200b");
        next.insertBefore(lead, next.firstElementChild);
        const caret = document.createRange();
        caret.setStart(lead, lead.data.length);
        caret.collapse(true);
        selection?.removeAllRanges();
        selection?.addRange(caret);
        return;
    }
    placeCaretAtStart(next);
}

function inlinePictureBeforeCaret(editor: HTMLElement, selection: Selection): HTMLElement | null {
    const beside = inlinePictureBesideCaret(editor, selection);
    return beside?.side === "after" ? beside.figure : null;
}

function pictureUnderMark(selection: Selection): { br: HTMLBRElement; lead: Text | null } | null {
    if (!selection.rangeCount || !selection.isCollapsed) return null;
    const range = selection.getRangeAt(0);
    const followsPicture = (node: ChildNode | null) => {
        while (node instanceof Text && !node.data.replace(/[\u00a0\s\u200b]/g, "")) node = node.previousSibling;
        return node instanceof HTMLElement && node.tagName === "FIGURE";
    };
    const node = range.startContainer;
    if (node instanceof Text) {
        if (node.data.replace(/\u200b/g, "") || !node.data.includes("\u200b") || !(node.nextSibling instanceof HTMLBRElement)) return null;
        return followsPicture(node.previousSibling) ? { br: node.nextSibling, lead: node } : null;
    }
    if (node instanceof Element) {
        const line = node.childNodes[range.startOffset];
        if (!(line instanceof HTMLBRElement) || !followsPicture(line.previousSibling)) return null;
        return { br: line, lead: null };
    }
    return null;
}

function closePictureUnderLine(mark: { br: HTMLBRElement; lead: Text | null }) {
    const following = mark.br.nextSibling;
    const parent = mark.br.parentNode;
    mark.lead?.remove();
    mark.br.remove();
    const selection = window.getSelection();
    if (!selection || !parent) return;
    const caret = document.createRange();
    if (following instanceof Text) caret.setStart(following, 0);
    else if (following) caret.setStartBefore(following);
    else caret.setStart(parent, parent.childNodes.length);
    caret.collapse(true);
    selection.removeAllRanges();
    selection.addRange(caret);
}

function writingAfterPicture(figure: HTMLElement, selection: Selection): boolean {
    const range = selection.rangeCount ? selection.getRangeAt(0) : null;
    if (range?.startContainer instanceof Text && !figure.contains(range.startContainer) && range.startContainer.data.slice(range.startOffset).replace(/[\u00a0\s\u200b]/g, "")) return true;
    let node: ChildNode | null = figure.nextSibling;
    while (node) {
        if (node instanceof Text && node.data.replace(/[\u00a0\s\u200b]/g, "")) return true;
        if (node instanceof HTMLElement && (node.textContent ?? "").replace(/[\u00a0\s\u200b]/g, "")) return true;
        node = node.nextSibling;
    }
    return false;
}

function lineAfterPicture(editor: HTMLElement, selection: Selection): { block: HTMLElement; caption: HTMLElement; atStart: boolean; empty: boolean } | null {
    if (!selection.rangeCount || !selection.anchorNode) return null;
    const range = selection.getRangeAt(0);
    const anchor = selection.anchorNode;
    const host = anchor instanceof Element ? anchor : anchor.parentElement;
    if (host?.closest("figcaption")) return null;
    const line = host?.closest("p, h1, h2, h3, li, blockquote, pre");
    if (!(line instanceof HTMLElement) || !editor.contains(line)) return null;
    let block = line;
    while (pictureLineHost({
        parent: block.parentElement?.tagName === "BLOCKQUOTE" ? "quote" : "other",
        leading: lineLeads(block),
    }) === "quote") {
        const parent = block.parentElement;
        if (!(parent instanceof HTMLElement) || parent === editor) break;
        block = parent;
    }
    const sibling = block.previousElementSibling;
    const list = sibling instanceof HTMLElement && (sibling.tagName === "UL" || sibling.tagName === "OL");
    const skipBlank = (node: ChildNode | null) => {
        let tail = node;
        while (tail instanceof Text && !tail.data.replace(/[\u00a0\s\u200b]/g, "")) tail = tail.previousSibling;
        return tail;
    };
    const tailOf = (node: ChildNode | null): { node: ChildNode | null; kind: "picture" | "writing" | "empty" | "none" } => {
        const current = skipBlank(node);
        if (current instanceof HTMLElement && (current.tagName === "UL" || current.tagName === "OL")) {
            const item = [...current.children].reverse().find((child) => child.tagName === "LI");
            const nested = tailOf(item instanceof HTMLElement ? item.lastChild : null);
            return { node: nested.node, kind: pictureListTail({ child: "list", nestedTail: nested.kind }) };
        }
        if (current instanceof HTMLElement && current.tagName === "LI") return tailOf(current.lastChild);
        if (current instanceof HTMLElement && current.tagName === "FIGURE") return { node: current, kind: "picture" };
        if (current instanceof HTMLElement && /^(?:BLOCKQUOTE|P|H[1-3])$/.test(current.tagName)) {
            const nested = tailOf(current.lastChild);
            return { node: nested.node, kind: pictureListTail({ child: "inside", nestedTail: nested.kind }) };
        }
        if (current instanceof Text || (current instanceof HTMLElement && (current.textContent ?? "").replace(/[\u00a0\s\u200b]/g, ""))) {
            return { node: current, kind: pictureListTail({ child: "writing", nestedTail: "none" }) };
        }
        if (current) return { node: current, kind: pictureListTail({ child: "empty", nestedTail: "none" }) };
        return { node: null, kind: pictureListTail({ child: "none", nestedTail: "none" }) };
    };
    const ended = sibling instanceof HTMLElement && sibling.tagName === "FIGURE"
        ? { node: sibling, kind: "picture" as const }
        : tailOf(sibling instanceof HTMLElement ? sibling.lastChild : null);
    const tailNode = ended.node;
    const behind = pictureBehindLine({
        sibling: sibling instanceof HTMLElement && sibling.tagName === "FIGURE" ? "picture" : list ? "list" : sibling instanceof HTMLElement ? "other" : "none",
        tail: ended.kind,
    });
    const figure = sibling instanceof HTMLElement && sibling.tagName === "FIGURE"
        ? sibling
        : tailNode instanceof HTMLElement && tailNode.tagName === "FIGURE"
            ? tailNode
            : null;
    if (!behind || !(figure instanceof HTMLElement)) return null;
    const caption = figure.querySelector("figcaption");
    if (!(caption instanceof HTMLElement)) return null;
    if (!line.contains(range.startContainer) || !line.contains(range.endContainer)) return null;
    const before = document.createRange();
    before.selectNodeContents(line);
    before.setEnd(range.startContainer, range.startOffset);
    return {
        block: line,
        caption,
        atStart: before.toString().length === 0,
        empty: (line.textContent ?? "").replace(/\u00a0/g, " ").trim().length === 0,
    };
}

function quoteHoldsOnly(quote: HTMLElement, line: HTMLElement): boolean {
    for (const node of quote.childNodes) {
        if (node === line) continue;
        if (node instanceof Text && !node.data.replace(/[\u00a0\s\u200b]/g, "")) continue;
        return false;
    }
    return true;
}

function lineLeads(node: HTMLElement): boolean {
    let previous: ChildNode | null = node.previousSibling;
    while (previous instanceof Text && !previous.data.replace(/[\u00a0\s\u200b]/g, "")) previous = previous.previousSibling;
    return !previous;
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

function caretNeighborNode(selection: Selection, direction: "previous" | "next"): Node | null {
    if (!selection.rangeCount || !selection.isCollapsed) return null;
    const range = selection.getRangeAt(0);
    const container = range.startContainer;
    const offset = range.startOffset;
    const step = (node: Node | null) => direction === "next" ? node?.nextSibling ?? null : node?.previousSibling ?? null;
    let node: Node | null = null;
    if (container instanceof Text) {
        if (direction === "next" && offset < container.data.length) return container;
        if (direction === "previous" && offset > 0) return container;
        node = step(container);
    } else if (container instanceof Element) {
        node = direction === "next" ? container.childNodes[offset] ?? null : container.childNodes[offset - 1] ?? null;
    }
    while (node instanceof Text && !node.data.replace(/[\s\u00a0]/g, "")) node = step(node);
    return node;
}

function caretSide(node: Node | null): "picture" | "text" | "none" {
    if (node instanceof HTMLElement && node.tagName === "FIGURE") return "picture";
    if (node instanceof Text && node.data.replace(/[\s\u00a0]/g, "")) return "text";
    return "none";
}

function inlinePictureNeighbor(editor: HTMLElement, selection: Selection): {
    where: "before" | "after" | "both";
    atStart: boolean;
    atEnd: boolean;
    figure: HTMLElement;
    image: HTMLImageElement | null;
    previousFigure: HTMLElement | null;
    nextFigure: HTMLElement | null;
} | null {
    const where = pictureCaretNeighbor({
        previous: caretSide(caretNeighborNode(selection, "previous")),
        next: caretSide(caretNeighborNode(selection, "next")),
    });
    if (where === "none") return null;
    const nextNode = caretNeighborNode(selection, "next");
    const previousNode = caretNeighborNode(selection, "previous");
    const nextFigure = nextNode instanceof HTMLElement && nextNode.tagName === "FIGURE" ? nextNode : null;
    const previousFigure = previousNode instanceof HTMLElement && previousNode.tagName === "FIGURE" ? previousNode : null;
    const figure = (where === "after" ? previousFigure : nextFigure) ?? previousFigure;
    if (!(figure instanceof HTMLElement) || !editor.contains(figure)) return null;
    const image = figure.querySelector("img");
    return {
        where,
        atStart: false,
        atEnd: false,
        figure,
        image: image instanceof HTMLImageElement ? image : null,
        previousFigure,
        nextFigure,
    };
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
    const inline = inlinePictureNeighbor(editor, selection);
    if (inline) return inline;
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

function copiedPicture(editor: HTMLElement, selection: Selection): { html: string; text: string; figure: HTMLElement } | null {
    const image = selectedImage(editor, selection);
    const figure = image?.closest("figure");
    if (!(image instanceof HTMLImageElement) || !(figure instanceof HTMLElement) || !editor.contains(figure)) return null;
    if (pictureCopy({ imageSelected: true, inFigure: true }) !== "picture") return null;
    const copy = figure.cloneNode(true) as HTMLElement;
    copy.querySelectorAll("img").forEach((node) => clearPictureMark(node));
    const caption = copy.querySelector("figcaption");
    const text = (caption?.textContent ?? image.getAttribute("alt") ?? "").replace(/\s+/g, " ").trim();
    return { html: copy.outerHTML, text, figure };
}

function placeAfterRemovedPicture(editor: HTMLElement, figure: HTMLElement) {
    const parent = figure.parentElement;
    const next = figure.nextSibling;
    figure.remove();
    if (next instanceof HTMLElement && /^(P|H1|H2|H3|LI|BLOCKQUOTE|PRE)$/.test(next.tagName)) {
        placeCaretAtStart(next);
        return;
    }
    if (next && parent?.contains(next)) {
        const selection = window.getSelection();
        const range = document.createRange();
        range.setStartBefore(next);
        range.collapse(true);
        selection?.removeAllRanges();
        selection?.addRange(range);
        return;
    }
    if (parent instanceof HTMLElement && parent !== editor) {
        if (!parent.childNodes.length) parent.appendChild(document.createElement("br"));
        placeCaretAtStart(parent);
        return;
    }
    const paragraph = document.createElement("p");
    paragraph.appendChild(document.createElement("br"));
    editor.appendChild(paragraph);
    placeCaretAtStart(paragraph);
}

function placeCaretAfterFigure(figure: HTMLElement) {
    const next = figure.nextSibling;
    if (next instanceof HTMLElement && /^(P|H1|H2|H3|LI|BLOCKQUOTE|PRE)$/.test(next.tagName)) {
        placeCaretAtStart(next);
        return;
    }
    if (next instanceof Text) {
        placeCaretInText(next, 0);
        return;
    }
    const selection = window.getSelection();
    const range = document.createRange();
    range.setStartAfter(figure);
    range.collapse(true);
    selection?.removeAllRanges();
    selection?.addRange(range);
}

function splitBlockAroundPicture(block: HTMLElement, range: Range, figure: HTMLElement) {
    const rest = document.createRange();
    rest.selectNodeContents(block);
    rest.setStart(range.startContainer, range.startOffset);
    const tail = rest.extractContents();
    const inline = block.tagName === "LI" || block.tagName === "BLOCKQUOTE";
    if (inline) {
        block.append(figure);
        while (tail.firstChild) block.append(tail.firstChild);
        return;
    }
    if (!(block.textContent ?? "").replace(/[\u00a0\s]/g, "") && !block.querySelector("img, figure")) block.append(document.createElement("br"));
    const next = document.createElement("p");
    while (tail.firstChild) next.append(tail.firstChild);
    if (!next.childNodes.length) next.append(document.createElement("br"));
    block.after(figure);
    figure.after(next);
}

function insertPictureFigure(editor: HTMLElement, html: string) {
    const selection = window.getSelection();
    if (!selection?.rangeCount) return;
    const template = document.createElement("template");
    template.innerHTML = html;
    const figure = template.content.firstElementChild;
    if (!(figure instanceof HTMLElement)) return;
    const range = selection.getRangeAt(0);
    if (!range.collapsed) range.deleteContents();
    const live = selection.rangeCount ? selection.getRangeAt(0) : range;
    const anchor = live.startContainer;
    const host = anchor instanceof Element ? anchor : anchor.parentElement;
    const caption = host?.closest("figcaption");
    if (caption instanceof HTMLElement && editor.contains(caption)) {
        const current = caption.closest("figure");
        if (current instanceof HTMLElement) current.after(figure);
        else editor.append(figure);
        placeCaretAfterFigure(figure);
        return;
    }
    const block = host?.closest("p, h1, h2, h3, li, blockquote");
    if (!(block instanceof HTMLElement) || !editor.contains(block)) {
        live.insertNode(figure);
        placeCaretAfterFigure(figure);
        return;
    }
    const edge = captionCaret(block, selection);
    if (block.tagName === "LI" || block.tagName === "BLOCKQUOTE") {
        if (edge?.atEnd) block.append(figure);
        else if (edge?.atStart) block.prepend(figure);
        else splitBlockAroundPicture(block, live, figure);
        placeCaretAfterFigure(figure);
        return;
    }
    if (edge?.atStart && edge.atEnd) {
        const paragraph = document.createElement("p");
        paragraph.appendChild(document.createElement("br"));
        block.replaceWith(figure);
        figure.after(paragraph);
        placeCaretAtStart(paragraph);
        return;
    }
    if (edge?.atStart) {
        block.before(figure);
        placeCaretAtStart(block);
        return;
    }
    if (edge?.atEnd) {
        block.after(figure);
        placeCaretAfterFigure(figure);
        return;
    }
    splitBlockAroundPicture(block, live, figure);
    placeCaretAfterFigure(figure);
}

function pictureBesideNode(figure: HTMLElement, direction: "before" | "after"): Node | null {
    let node = direction === "before" ? figure.previousSibling : figure.nextSibling;
    while (node instanceof Text && !node.data.replace(/[\s\u00a0]/g, "")) {
        node = direction === "before" ? node.previousSibling : node.nextSibling;
    }
    return node;
}

function placeCaretInText(text: Text, offset: number) {
    const selection = window.getSelection();
    if (!selection) return;
    const caret = document.createRange();
    caret.setStart(text, Math.max(0, Math.min(offset, text.data.length)));
    caret.collapse(true);
    selection.removeAllRanges();
    selection.addRange(caret);
}

function moveBesidePicture(figure: HTMLElement, direction: "before" | "after") {
    const parent = figure.parentElement;
    const inLine = pictureNameLine(parent?.tagName ?? "DIV") !== "page";
    const node = pictureBesideNode(figure, direction);
    const sibling = node instanceof HTMLElement
        ? (node.tagName === "FIGURE" ? "picture" : "element")
        : node instanceof Text ? "text" : "none";
    const target = pictureBesideTarget({ direction, sibling, inLine });
    if (target === "picture" && node instanceof HTMLElement) {
        const image = node.querySelector("img");
        if (image instanceof HTMLImageElement) selectPictureImage(image);
        return;
    }
    if (target === "element" && node instanceof HTMLElement) {
        if (direction === "before") placeCaretAtEnd(node);
        else placeCaretAtStart(node);
        return;
    }
    if (target === "text" && node instanceof Text) {
        placeCaretInText(node, direction === "before" ? node.data.length : 0);
        return;
    }
    if (target === "line") {
        const paragraph = document.createElement("p");
        paragraph.appendChild(document.createElement("br"));
        figure.after(paragraph);
        placeCaretAtStart(paragraph);
        return;
    }
    if (parent instanceof HTMLElement && inLine) {
        if (direction === "before") placeCaretAtStart(parent);
        else placeCaretAtEnd(parent);
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
        syncPictureAlt(picture);
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

function lineUnderDate(heading: HTMLElement): HTMLElement {
    const paragraph = document.createElement("p");
    paragraph.appendChild(document.createElement("br"));
    heading.after(paragraph);
    return paragraph;
}

const DATE_LINE_MARKER = "\u200b";

function caretHomeAfter(block: Element | null): HTMLElement | null {
    if (!(block instanceof HTMLElement)) return null;
    if (block.tagName === "FIGURE") {
        const after = block.nextElementSibling;
        if (after instanceof HTMLElement) return after;
        const caption = block.querySelector("figcaption");
        return caption instanceof HTMLElement ? caption : null;
    }
    if (block.tagName === "IMG") {
        const after = block.nextElementSibling;
        return after instanceof HTMLElement ? after : null;
    }
    return block;
}

function dropDateLineMarker(editor: HTMLElement) {
    const heading = editor.firstElementChild;
    if (!(heading instanceof HTMLElement) || heading.tagName !== "H2") return;
    const next = heading.nextSibling;
    if (!(next instanceof Text) || next.data.replaceAll(DATE_LINE_MARKER, "") !== "") return;
    const home = caretHomeAfter(heading.nextElementSibling);
    if (home) placeCaretAtStart(home);
    next.remove();
}

function caretAtHeadingEnd(heading: HTMLElement, selection: Selection): boolean {
    if (!selection.rangeCount) return false;
    const range = selection.getRangeAt(0);
    if (!heading.contains(range.endContainer)) return false;
    const after = document.createRange();
    after.selectNodeContents(heading);
    after.setStart(range.endContainer, range.endOffset);
    return after.toString().length === 0;
}

function placeCaretInBlock(block: HTMLElement) {
    if (block.tagName === "UL" || block.tagName === "OL") {
        const item = block.querySelector("li");
        if (item instanceof HTMLElement) {
            placeCaretAtStart(item);
            return;
        }
    }
    placeCaretAtStart(block);
}

function leaveDateLine(heading: HTMLElement) {
    const next = heading.nextElementSibling;
    if (next instanceof HTMLElement && dateLeaveTarget(next.tagName) === "into") {
        placeCaretAtStart(next);
        return;
    }
    const after = next instanceof HTMLElement ? next.nextElementSibling : null;
    if (after instanceof HTMLElement && dateLeaveTarget(after.tagName) === "into") {
        placeCaretAtStart(after);
        return;
    }
    const paragraph = document.createElement("p");
    paragraph.appendChild(document.createElement("br"));
    if (next instanceof HTMLElement) next.after(paragraph);
    else heading.after(paragraph);
    placeCaretAtStart(paragraph);
}

function typeFreshDateLine(heading: HTMLElement, letter: string): boolean {
    const next = heading.nextElementSibling;
    if (!(next instanceof HTMLElement)) return false;
    const selection = window.getSelection();
    if (!selection) return false;
    const range = document.createRange();
    const markup = next.tagName === "P" ? freshDateLineMarkup(letter, next.outerHTML) : freshDateLineMarkup(letter, "");
    let marker: Text | null = null;
    if (next.tagName === "P") range.selectNode(next);
    else {
        marker = document.createTextNode(DATE_LINE_MARKER);
        heading.after(marker);
        range.selectNode(marker);
    }
    selection.removeAllRanges();
    selection.addRange(range);
    if (!document.execCommand("insertHTML", false, markup)) {
        marker?.remove();
        return false;
    }
    const fresh = heading.nextElementSibling;
    if (fresh instanceof HTMLElement) placeCaretAtEnd(fresh);
    return true;
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

function dateSelectionSpan(editor: HTMLElement, selection: Selection | null): "only" | "with-writing" | "none" {
    if (!selection?.rangeCount || !selection.anchorNode) return "none";
    const heading = editor.firstElementChild;
    if (!(heading instanceof HTMLElement) || !/^H[1-3]$/.test(heading.tagName)) return "none";
    const text = (heading.textContent ?? "").replace(/\u00a0/g, " ").replace(/\s+/g, " ").trim();
    if (!leadingDateLabel(text) || heading.querySelector("img")) return "none";
    const range = selection.getRangeAt(0);
    const inside = heading.contains(range.startContainer) && heading.contains(range.endContainer);
    let touches = inside || heading.contains(range.startContainer) || heading.contains(range.endContainer);
    if (!touches) {
        try {
            touches = range.intersectsNode(heading);
        } catch {
            touches = false;
        }
    }
    if (!touches) return "none";
    return pointAfterDate(heading, range.endContainer, range.endOffset) ? "with-writing" : "only";
}

function keepFormatOffDate(editor: HTMLElement, command: string): "hold" | "run" {
    const selection = window.getSelection();
    const span = dateSelectionSpan(editor, selection);
    const reach = dateFormatReach({
        command,
        touchesDate: span !== "none",
        onlyDate: span === "only",
    });
    if (reach === "hold") return "hold";
    if (reach === "writing" && selection?.rangeCount) {
        const heading = editor.firstElementChild;
        if (heading instanceof HTMLElement) selectReplaceRange(editor, heading, selection);
    }
    return "run";
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

function typeDateHeading(editor: HTMLElement, fromLabel: string, toLabel: string): boolean {
    const heading = editor.firstElementChild;
    if (!(heading instanceof HTMLElement) || heading.tagName !== "H2") return false;
    const text = (heading.textContent ?? "").replace(/\u00a0/g, " ").replace(/\s+/g, " ").trim();
    if (text !== fromLabel) return false;
    const selection = window.getSelection();
    if (!selection) return false;
    const range = document.createRange();
    range.selectNodeContents(heading);
    selection.removeAllRanges();
    selection.addRange(range);
    editor.focus();
    if (!document.execCommand("insertText", false, toLabel)) return false;
    if ((heading.textContent ?? "").replace(/\u00a0/g, " ").replace(/\s+/g, " ").trim() !== toLabel) return false;
    const writing = heading.nextElementSibling;
    if (writing instanceof HTMLElement) placeCaretAtStart(writing);
    editor.ownerDocument.querySelector<HTMLInputElement>('input[aria-label="Entry date"]')?.focus();
    return true;
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

function cutWordsBesidePicture(range: Range, names: "drop" | "keep" = "keep"): string {
    const holder = document.createElement("div");
    holder.appendChild(range.cloneContents());
    holder.querySelectorAll("figure").forEach((figure) => {
        if (names === "drop") {
            figure.remove();
            return;
        }
        const caption = figure.querySelector("figcaption");
        const words = caption ? [...caption.childNodes] : [];
        const following = figure.nextSibling;
        const breakLine = Boolean(following && (following.textContent ?? "").replace(/[\u00a0\s]/g, ""));
        figure.replaceWith(...words);
        if (breakLine && following?.parentNode) following.parentNode.insertBefore(document.createElement("br"), following);
    });
    holder.querySelectorAll("img").forEach((image) => image.remove());
    return holder.innerHTML;
}

function cutPlainBesidePicture(range: Range): string {
    const holder = document.createElement("div");
    holder.appendChild(range.cloneContents());
    holder.querySelectorAll("figure").forEach((figure) => figure.replaceWith(document.createTextNode("\n")));
    return (holder.textContent ?? "").replace(/^\n+|\n+$/g, "");
}

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

function quoteHolding(editor: HTMLElement, range: Range): HTMLElement | null {
    const startHost = range.startContainer instanceof Element ? range.startContainer : range.startContainer.parentElement;
    const endHost = range.endContainer instanceof Element ? range.endContainer : range.endContainer.parentElement;
    const startQuote = startHost?.closest("blockquote");
    const endQuote = endHost?.closest("blockquote");
    if (!(startQuote instanceof HTMLElement) || startQuote !== endQuote || !editor.contains(startQuote)) return null;
    return startQuote;
}

function listKind(node: Element | null): "ul" | "ol" | "other" | "none" {
    if (!(node instanceof HTMLElement)) return "none";
    if (node.tagName === "UL") return "ul";
    if (node.tagName === "OL") return "ol";
    return "other";
}

function itemNumber(list: HTMLElement, index: number): number {
    const items = listItems(list);
    return orderedItemNumber({
        start: list.getAttribute("start"),
        values: items.map((item) => item.getAttribute("value")),
        index,
    });
}

function absorbList(target: HTMLElement, source: HTMLElement) {
    const incoming = listItems(source);
    const value = quotedListJoinValue({
        ordered: target.tagName === "OL",
        previous: listItems(target).length ? itemNumber(target, listItems(target).length - 1) : null,
        number: incoming.length ? itemNumber(source, 0) : 1,
    });
    if (value !== null && incoming[0]) incoming[0].setAttribute("value", String(value));
    for (const item of incoming) target.append(item);
    source.remove();
}

function joinNeighboringLists(list: HTMLElement) {
    const previous = list.previousElementSibling;
    const next = list.nextElementSibling;
    const join = quoteListAgain({ quoted: listKind(list), previous: listKind(previous), next: listKind(next) });
    if (join.previous && previous instanceof HTMLElement) absorbList(previous, list);
    const host = join.previous && previous instanceof HTMLElement ? previous : list;
    const following = host.nextElementSibling;
    if (quoteListAgain({ quoted: listKind(host), previous: "none", next: listKind(following) }).next && following instanceof HTMLElement) {
        absorbList(host, following);
    }
}

function unwrapQuote(quote: HTMLElement) {
    const blocks = new Set(["P", "H1", "H2", "H3", "UL", "OL", "BLOCKQUOTE", "PRE", "FIGURE", "HR", "DIV", "LI"]);
    const nodes = [...quote.childNodes];
    const hasBlock = nodes.some((node) => node instanceof HTMLElement && blocks.has(node.tagName));
    if (hasBlock) {
        const elements = nodes.filter((node): node is HTMLElement => node instanceof HTMLElement && node.tagName !== "BR");
        const list = elements.length === 1 && (elements[0].tagName === "UL" || elements[0].tagName === "OL") ? elements[0] : null;
        quote.replaceWith(...nodes);
        if (list) joinNeighboringLists(list);
        return;
    }
    const paragraph = document.createElement("p");
    if (nodes.length === 0) paragraph.append(document.createElement("br"));
    else paragraph.append(...nodes);
    quote.replaceWith(paragraph);
}

function italicHost(node: Node | null, editor: HTMLElement): HTMLElement | null {
    const host = node instanceof Element ? node : node?.parentElement ?? null;
    const italic = host?.closest("i, em");
    if (!(italic instanceof HTMLElement) || !editor.contains(italic)) return null;
    return italic;
}

function selectionInOneItalic(editor: HTMLElement, range: Range): boolean {
    const start = italicHost(range.startContainer, editor);
    const end = italicHost(range.endContainer, editor);
    return Boolean(start && start === end);
}

function italicSlices(range: Range, root: HTMLElement): { text: Text; start: number; end: number }[] {
    const walker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT);
    const slices: { text: Text; start: number; end: number }[] = [];
    let node = walker.nextNode();
    while (node instanceof Text) {
        if (node.data.length > 0) {
            try {
                if (!range.intersectsNode(node)) {
                    node = walker.nextNode();
                    continue;
                }
            } catch {
                node = walker.nextNode();
                continue;
            }
            const bounds = document.createRange();
            bounds.selectNodeContents(node);
            const startsBefore = range.compareBoundaryPoints(Range.START_TO_START, bounds) <= 0;
            const endsAfter = range.compareBoundaryPoints(Range.END_TO_END, bounds) >= 0;
            const start = startsBefore ? 0 : node === range.startContainer ? range.startOffset : 0;
            const end = endsAfter ? node.data.length : node === range.endContainer ? range.endOffset : node.data.length;
            if (end > start) slices.push({ text: node, start, end });
        }
        node = walker.nextNode();
    }
    return slices;
}

function markItalicSlice(text: Text, start: number, end: number): HTMLElement | null {
    const slice = start > 0 ? text.splitText(start) : text;
    const length = end - start;
    if (length < slice.data.length) slice.splitText(length);
    if (slice.parentElement?.closest("i, em")) return null;
    const italic = document.createElement("i");
    slice.before(italic);
    italic.append(slice);
    return italic;
}

function clearItalicSlice(text: Text, start: number, end: number) {
    const italic = text.parentElement?.closest("i, em");
    if (!(italic instanceof HTMLElement)) return;
    const slice = start > 0 ? text.splitText(start) : text;
    const length = end - start;
    if (length < slice.data.length) slice.splitText(length);
    const after = document.createElement(italic.tagName.toLowerCase());
    let sibling = slice.nextSibling;
    while (sibling && italic.contains(sibling)) {
        const next = sibling.nextSibling;
        after.append(sibling);
        sibling = next;
    }
    if (after.childNodes.length) italic.after(after);
    italic.after(slice);
    if (!after.childNodes.length) after.remove();
    if (!italic.childNodes.length) italic.remove();
}

function applyQuoteItalic(editor: HTMLElement, range: Range, action: "mark" | "clear"): HTMLElement[] {
    const quote = quoteHolding(editor, range);
    if (!quote) return [];
    const slices = italicSlices(range, quote);
    const marked: HTMLElement[] = [];
    for (let index = slices.length - 1; index >= 0; index -= 1) {
        const slice = slices[index];
        if (action === "mark") {
            const italic = markItalicSlice(slice.text, slice.start, slice.end);
            if (italic) marked.unshift(italic);
        } else {
            clearItalicSlice(slice.text, slice.start, slice.end);
        }
    }
    return marked;
}

function linkHolding(editor: HTMLElement, range: Range): HTMLAnchorElement | null {
    const startHost = range.startContainer instanceof Element ? range.startContainer : range.startContainer.parentElement;
    const endHost = range.endContainer instanceof Element ? range.endContainer : range.endContainer.parentElement;
    const startLink = startHost?.closest("a");
    const endLink = endHost?.closest("a");
    if (!(startLink instanceof HTMLAnchorElement) || startLink !== endLink || !editor.contains(startLink)) return null;
    return startLink;
}

function underlineHost(node: Node | null, editor: HTMLElement): HTMLElement | null {
    const host = node instanceof Element ? node : node?.parentElement ?? null;
    const underline = host?.closest("u");
    if (!(underline instanceof HTMLElement) || !editor.contains(underline)) return null;
    return underline;
}

function selectionInOneUnderline(editor: HTMLElement, range: Range): boolean {
    const start = underlineHost(range.startContainer, editor);
    const end = underlineHost(range.endContainer, editor);
    return Boolean(start && start === end);
}

function markUnderlineSlice(text: Text, start: number, end: number): HTMLElement | null {
    const slice = start > 0 ? text.splitText(start) : text;
    const length = end - start;
    if (length < slice.data.length) slice.splitText(length);
    if (slice.parentElement?.closest("u")) return null;
    const underline = document.createElement("u");
    slice.before(underline);
    underline.append(slice);
    return underline;
}

function clearUnderlineSlice(text: Text, start: number, end: number) {
    const underline = text.parentElement?.closest("u");
    if (!(underline instanceof HTMLElement)) return;
    const slice = start > 0 ? text.splitText(start) : text;
    const length = end - start;
    if (length < slice.data.length) slice.splitText(length);
    const after = document.createElement("u");
    let sibling = slice.nextSibling;
    while (sibling && underline.contains(sibling)) {
        const next = sibling.nextSibling;
        after.append(sibling);
        sibling = next;
    }
    if (after.childNodes.length) underline.after(after);
    underline.after(slice);
    if (!after.childNodes.length) after.remove();
    if (!underline.childNodes.length) underline.remove();
}

function applyLinkUnderline(editor: HTMLElement, range: Range, action: "mark" | "clear"): HTMLElement[] {
    const link = linkHolding(editor, range);
    if (!link) return [];
    const slices = italicSlices(range, link);
    const marked: HTMLElement[] = [];
    for (let index = slices.length - 1; index >= 0; index -= 1) {
        const slice = slices[index];
        if (action === "mark") {
            const underline = markUnderlineSlice(slice.text, slice.start, slice.end);
            if (underline) marked.unshift(underline);
        } else {
            clearUnderlineSlice(slice.text, slice.start, slice.end);
        }
    }
    return marked;
}

function deletedHost(node: Node | null, editor: HTMLElement): HTMLElement | null {
    const host = node instanceof Element ? node : node?.parentElement ?? null;
    const deleted = host?.closest("del");
    if (!(deleted instanceof HTMLElement) || !editor.contains(deleted)) return null;
    return deleted;
}

function selectionInOneDeleted(editor: HTMLElement, range: Range): boolean {
    const start = deletedHost(range.startContainer, editor);
    const end = deletedHost(range.endContainer, editor);
    return Boolean(start && start === end);
}

function clearDeletedSlice(text: Text, start: number, end: number) {
    const deleted = text.parentElement?.closest("del");
    if (!(deleted instanceof HTMLElement)) return;
    const slice = start > 0 ? text.splitText(start) : text;
    const length = end - start;
    if (length < slice.data.length) slice.splitText(length);
    const after = document.createElement("del");
    let sibling = slice.nextSibling;
    while (sibling && deleted.contains(sibling)) {
        const next = sibling.nextSibling;
        after.append(sibling);
        sibling = next;
    }
    if (after.childNodes.length) deleted.after(after);
    deleted.after(slice);
    if (!after.childNodes.length) after.remove();
    if (!deleted.childNodes.length) deleted.remove();
}

function applyDeletedStrike(editor: HTMLElement, range: Range) {
    const deleted = deletedHost(range.startContainer, editor);
    if (!deleted) return;
    const slices = italicSlices(range, deleted);
    for (let index = slices.length - 1; index >= 0; index -= 1) {
        const slice = slices[index];
        clearDeletedSlice(slice.text, slice.start, slice.end);
    }
}

function insertUnderlineCharacter(range: Range, text: string) {
    const underline = document.createElement("u");
    underline.textContent = text;
    const node = range.startContainer;
    const offset = range.startOffset;
    if (node instanceof Text) {
        if (offset > 0 && offset < node.data.length) node.splitText(offset);
        if (offset === 0) node.before(underline);
        else node.after(underline);
        if (node.data.length === 0) node.remove();
    } else {
        range.insertNode(underline);
    }
    const written = underline.firstChild;
    if (written) placeCaretAt(written, written.textContent?.length ?? 0);
}

function placeCaretAt(node: Node, offset: number) {
    const selection = window.getSelection();
    if (!selection) return;
    const range = document.createRange();
    range.setStart(node, offset);
    range.collapse(true);
    selection.removeAllRanges();
    selection.addRange(range);
}

function insertItalicCharacter(range: Range, text: string) {
    const italic = document.createElement("i");
    italic.textContent = text;
    const node = range.startContainer;
    const offset = range.startOffset;
    if (node instanceof Text) {
        if (offset > 0 && offset < node.data.length) node.splitText(offset);
        if (offset === 0) node.before(italic);
        else node.after(italic);
        if (node.data.length === 0) node.remove();
    } else {
        range.insertNode(italic);
    }
    const written = italic.firstChild;
    if (written) placeCaretAt(written, written.textContent?.length ?? 0);
}

function insertPlainCharacter(range: Range, text: string, selector = "i, em") {
    const node = range.startContainer;
    const offset = range.startOffset;
    const host = node instanceof Element ? node : node.parentElement;
    const italic = host?.closest(selector);
    if (!(italic instanceof HTMLElement) || !(node instanceof Text) || !italic.contains(node)) {
        if (node instanceof Text) {
            node.insertData(offset, text);
            placeCaretAt(node, offset + text.length);
        }
        return;
    }
    if (offset <= 0) {
        const written = document.createTextNode(text);
        italic.before(written);
        placeCaretAt(written, text.length);
        return;
    }
    if (offset >= node.data.length && node === italic.lastChild) {
        const next = italic.nextSibling;
        if (next instanceof Text) {
            next.insertData(0, text);
            placeCaretAt(next, text.length);
            return;
        }
        const written = document.createTextNode(text);
        italic.after(written);
        placeCaretAt(written, text.length);
        return;
    }
    if (offset < node.data.length) node.splitText(offset);
    const after = document.createElement(italic.tagName.toLowerCase());
    let sibling = node.nextSibling;
    while (sibling && italic.contains(sibling)) {
        const next = sibling.nextSibling;
        after.append(sibling);
        sibling = next;
    }
    const written = document.createTextNode(text);
    italic.after(written);
    if (after.childNodes.length) written.after(after);
    if (!italic.textContent) italic.remove();
    if (!after.textContent) after.remove();
    placeCaretAt(written, text.length);
}

function insertStyleStart(style: HTMLElement, range: Range, text: string) {
    const node = range.startContainer;
    if (node instanceof Text && style.contains(node)) {
        node.insertData(0, text);
        placeCaretAt(node, text.length);
        return;
    }
    const written = document.createTextNode(text);
    style.prepend(written);
    placeCaretAt(written, text.length);
}

function enterStyleAtCaret() {
    const selection = window.getSelection();
    if (!selection?.rangeCount || !selection.isCollapsed) return;
    const node = selection.anchorNode;
    if (!(node instanceof Text) || selection.anchorOffset !== node.data.length) return;
    const next = node.nextSibling;
    if (!(next instanceof HTMLElement) || !/^(B|STRONG|I|EM|U|S|STRIKE|DEL|CODE)$/.test(next.tagName) || next.closest("pre")) return;
    const text = next.firstChild;
    if (text instanceof Text) placeCaretAt(text, 0);
    else placeCaretAtStart(next);
}

function insertLinkEdge(link: HTMLElement, range: Range, edge: "start" | "end", text: string) {
    const node = range.startContainer;
    if (node instanceof Text && link.contains(node)) {
        const offset = edge === "start" ? 0 : node.data.length;
        node.insertData(offset, text);
        placeCaretAt(node, offset + text.length);
        return;
    }
    const written = document.createTextNode(text);
    if (edge === "start") link.prepend(written);
    else link.append(written);
    placeCaretAt(written, text.length);
}

function edgeText(element: HTMLElement, edge: "start" | "end"): Text | null {
    const walker = document.createTreeWalker(element, NodeFilter.SHOW_TEXT);
    let node = walker.nextNode();
    let last: Text | null = null;
    while (node instanceof Text) {
        if (node.data.length > 0) {
            if (edge === "start") return node;
            last = node;
        }
        node = walker.nextNode();
    }
    return last;
}

function elementFullyInside(range: Range, element: HTMLElement): boolean {
    try {
        if (!range.intersectsNode(element)) return false;
    } catch {
        return false;
    }
    const start = edgeText(element, "start");
    const end = edgeText(element, "end");
    const bounds = document.createRange();
    if (start && end) {
        bounds.setStart(start, 0);
        bounds.setEnd(end, end.data.length);
    } else {
        bounds.selectNodeContents(element);
    }
    return range.compareBoundaryPoints(Range.START_TO_START, bounds) <= 0
        && range.compareBoundaryPoints(Range.END_TO_END, bounds) >= 0;
}

function snapshotOrderedNumbers(editor: HTMLElement): Map<HTMLElement, number> {
    const numbers = new Map<HTMLElement, number>();
    for (const list of editor.querySelectorAll("ol")) {
        if (!(list instanceof HTMLOListElement)) continue;
        const items = listItems(list);
        items.forEach((item, index) => {
            numbers.set(item, orderedItemNumber({
                start: list.getAttribute("start"),
                values: items.map((entry) => entry.getAttribute("value")),
                index,
            }));
        });
    }
    return numbers;
}

function restoreOrderedNumbers(numbers: Map<HTMLElement, number>) {
    const lists = new Set<HTMLOListElement>();
    for (const item of numbers.keys()) {
        if (item.parentElement instanceof HTMLOListElement) lists.add(item.parentElement);
    }
    for (const list of lists) {
        const items = listItems(list);
        let previous: number | null = null;
        items.forEach((item, index) => {
            const number = numbers.get(item);
            if (number === undefined) {
                previous = orderedItemNumber({
                    start: list.getAttribute("start"),
                    values: items.map((entry) => entry.getAttribute("value")),
                    index,
                });
                return;
            }
            const kept = keptListNumber({ first: index === 0, previous, number });
            if (index === 0) {
                if (kept === null) list.removeAttribute("start");
                else list.setAttribute("start", String(kept));
                item.removeAttribute("value");
            } else if (kept === null) item.removeAttribute("value");
            else item.setAttribute("value", String(kept));
            previous = number;
        });
    }
}

function listItems(list: HTMLElement): HTMLElement[] {
    return [...list.children].filter((child): child is HTMLElement => child instanceof HTMLElement && child.tagName === "LI");
}

function quoteListTarget(editor: HTMLElement, range: Range): { list: HTMLElement; items: HTMLElement[]; from: number; to: number } | null {
    const startHost = range.startContainer instanceof Element ? range.startContainer : range.startContainer.parentElement;
    const endHost = range.endContainer instanceof Element ? range.endContainer : range.endContainer.parentElement;
    let startItem = startHost?.closest("li") ?? null;
    let endItem = endHost?.closest("li") ?? null;
    if (!(startItem instanceof HTMLElement) || !(endItem instanceof HTMLElement) || !editor.contains(startItem) || !editor.contains(endItem)) return null;
    for (let depth = 0; depth < 8; depth += 1) {
        if (startItem.contains(endItem) && startItem !== endItem) endItem = startItem;
        else if (endItem.contains(startItem) && endItem !== startItem) startItem = endItem;
        const lift = quotedListLift({
            sameParent: startItem.parentElement === endItem.parentElement,
            startContainsEnd: startItem.contains(endItem) && startItem !== endItem,
            endContainsStart: endItem.contains(startItem) && endItem !== startItem,
            startNested: startItem.parentElement?.parentElement instanceof HTMLLIElement,
            endNested: endItem.parentElement?.parentElement instanceof HTMLLIElement,
        });
        if (lift === "keep") break;
        if (lift === "stop") return null;
        if ((lift === "lift-start" || lift === "lift-both") && startItem.parentElement?.parentElement instanceof HTMLLIElement) {
            startItem = startItem.parentElement.parentElement;
        }
        if ((lift === "lift-end" || lift === "lift-both") && endItem.parentElement?.parentElement instanceof HTMLLIElement) {
            endItem = endItem.parentElement.parentElement;
        }
    }
    const list = startItem.parentElement;
    if (!(list instanceof HTMLElement) || list !== endItem.parentElement) return null;
    if (list.tagName !== "UL" && list.tagName !== "OL") return null;
    if (!editor.contains(list) || !list.contains(range.startContainer) || !list.contains(range.endContainer)) return null;
    const items = listItems(list);
    const start = items.indexOf(startItem);
    const end = items.indexOf(endItem);
    if (start < 0 || end < 0) return null;
    return { list, items, from: Math.min(start, end), to: Math.max(start, end) };
}

function applyListStart(list: HTMLElement, start: number | null) {
    if (list.tagName !== "OL" || start === null || start === 1) list.removeAttribute("start");
    else list.setAttribute("start", String(start));
}

function placeInQuotedList(quote: HTMLElement) {
    const quoted = quote.querySelector(":scope > ul, :scope > ol");
    const items = quoted instanceof HTMLElement ? listItems(quoted) : [];
    const item = items[items.length - 1];
    if (item) placeCaretAtEnd(item);
}

function applyQuoteList(list: HTMLElement, items: HTMLElement[], from: number, to: number, plan: NonNullable<ReturnType<typeof quoteListPlan>>) {
    if (plan.action === "wrap") {
        const quote = document.createElement("blockquote");
        list.before(quote);
        quote.append(list);
        placeInQuotedList(quote);
        return;
    }
    const quotedList = document.createElement(list.tagName.toLowerCase());
    applyListStart(quotedList, plan.quoted.start);
    for (const item of items.slice(from, to + 1)) quotedList.append(item);
    const quote = document.createElement("blockquote");
    quote.append(quotedList);
    const after = items.slice(to + 1);
    if (from > 0) {
        list.after(quote);
        if (after.length) {
            const afterList = document.createElement(list.tagName.toLowerCase());
            applyListStart(afterList, plan.after?.start ?? null);
            for (const item of after) afterList.append(item);
            quote.after(afterList);
        }
        placeInQuotedList(quote);
        return;
    }
    if (after.length) applyListStart(list, plan.after?.start ?? null);
    list.before(quote);
    if (!listItems(list).length) list.remove();
    placeInQuotedList(quote);
}

function selectedListSpan(list: HTMLElement, range: Range): { from: number; to: number } | null {
    const indexes = listItems(list).flatMap((item, index) => {
        try {
            return range.intersectsNode(item) ? [index] : [];
        } catch {
            return [];
        }
    });
    if (!indexes.length) return null;
    return { from: indexes[0], to: indexes[indexes.length - 1] };
}

function quoteListPiece(list: HTMLElement, from: number, to: number): HTMLElement | null {
    const items = listItems(list);
    const portion = quoteListPortion({ count: items.length, from, to });
    if (portion === "list") return list;
    if (portion !== "part") return null;
    const plan = quoteListPlan({
        ordered: list.tagName === "OL",
        start: list.getAttribute("start"),
        values: items.map((item) => item.getAttribute("value")),
        count: items.length,
        from,
        to,
    });
    if (!plan || plan.action !== "split") return null;
    const quotedList = document.createElement(list.tagName.toLowerCase());
    applyListStart(quotedList, plan.quoted.start);
    for (const item of items.slice(from, to + 1)) quotedList.append(item);
    list.after(quotedList);
    const after = items.slice(to + 1);
    if (after.length) {
        const afterList = document.createElement(list.tagName.toLowerCase());
        applyListStart(afterList, plan.after?.start ?? null);
        for (const item of after) afterList.append(item);
        quotedList.after(afterList);
    }
    if (!listItems(list).length) list.remove();
    return quotedList;
}

function coveredQuoteBlocks(editor: HTMLElement, range: Range): HTMLElement[] {
    return quoteBlockCandidates(editor).filter((child) => elementFullyInside(range, child));
}

function blockIntersects(block: HTMLElement, range: Range): boolean {
    if (block.matches("ul, ol")) {
        return listItems(block).some((item) => {
            try {
                return range.intersectsNode(item);
            } catch {
                return false;
            }
        });
    }
    try {
        return range.intersectsNode(block);
    } catch {
        return false;
    }
}

function touchedQuoteBlocks(editor: HTMLElement, range: Range): HTMLElement[] {
    return quoteBlockCandidates(editor).filter((child) => blockIntersects(child, range));
}

function quoteBlockCandidates(editor: HTMLElement): HTMLElement[] {
    return [...editor.children].filter((child): child is HTMLElement => {
        if (!(child instanceof HTMLElement)) return false;
        const text = (child.textContent ?? "").replace(/\u00a0/g, " ").replace(/\s+/g, " ").trim();
        if (child === editor.firstElementChild && child.tagName === "H2" && leadingDateLabel(text) === text && text.length > 0) return false;
        return true;
    });
}

function blocksAreConsecutive(editor: HTMLElement, blocks: HTMLElement[]): boolean {
    const children = [...editor.children];
    const indexes = blocks.map((block) => children.indexOf(block));
    return indexes.every((index, position) => index >= 0 && (position === 0 || index === indexes[position - 1] + 1));
}

function wrapQuotedBlocks(blocks: HTMLElement[]) {
    const quoted = document.createElement("blockquote");
    blocks[0].before(quoted);
    for (const block of blocks) quoted.append(block);
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
    const host = node instanceof Element ? node : node?.parentElement ?? null;
    const name = host?.closest("figcaption");
    if (name instanceof HTMLElement && pictureNameWord({ inName: true }) === "name") return name;
    const line = lineBlock(node);
    if (line) return line;
    const block = host?.closest("pre");
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

function lastListItem(list: HTMLElement): HTMLElement | null {
    const item = [...list.children].reverse().find((node) => node instanceof HTMLElement && node.tagName === "LI");
    if (!(item instanceof HTMLElement)) return null;
    const last = [...item.children].reverse().find((node) => node instanceof HTMLElement);
    if (last instanceof HTMLElement && (last.tagName === "UL" || last.tagName === "OL")) {
        const deeper = lastListItem(last);
        if (deeper) return deeper;
    }
    return item;
}

function lastQuoteLine(quote: HTMLElement): HTMLElement | null {
    for (const child of [...quote.children].reverse()) {
        if (!(child instanceof HTMLElement)) continue;
        if (child.tagName === "P" || /^H[1-3]$/.test(child.tagName)) return quoteListTail({ last: "writing" }) === "line" ? child : null;
        if (child.tagName === "BLOCKQUOTE") {
            const nested = lastQuoteLine(child);
            if (nested) return nested;
            continue;
        }
        if ((child.tagName === "UL" || child.tagName === "OL") && quoteListTail({ last: "list" }) === "line") {
            return lastListItem(child);
        }
        return null;
    }
    return null;
}

function trailingQuoteBlock(line: HTMLElement): HTMLElement | null {
    let current = line;
    while (current.parentElement instanceof HTMLElement && current.parentElement.tagName !== "BLOCKQUOTE") {
        if (current.nextElementSibling) return null;
        const parent = current.parentElement;
        if (parent.tagName !== "UL" && parent.tagName !== "OL" && parent.tagName !== "LI") return null;
        current = parent;
    }
    const quote = current.parentElement;
    if (!(quote instanceof HTMLElement) || quote.tagName !== "BLOCKQUOTE" || current.nextElementSibling) return null;
    return current;
}

function leaveClosedQuotes(line: HTMLElement, from: HTMLElement) {
    let guard = 0;
    while (guard < 8) {
        guard += 1;
        const block = trailingQuoteBlock(line);
        if (!(block instanceof HTMLElement)) break;
        const quote = block.parentElement;
        if (!(quote instanceof HTMLElement) || quoteTrailingLeave({ trailing: true, outside: !quote.contains(from) }) !== "leave") break;
        quote.after(block);
        closeEmptyHost(quote);
    }
}

function quoteJoinHost(into: HTMLElement, from: HTMLElement): HTMLElement {
    if (blockIsEmpty(from)) return into;
    const line = into.tagName === "BLOCKQUOTE" ? lastQuoteLine(into) : into;
    if (!(line instanceof HTMLElement)) return into;
    const edge = trailingQuoteBlock(line);
    const quote = edge?.parentElement;
    if (!(edge instanceof HTMLElement) || !(quote instanceof HTMLElement) || quoteTrailingLeave({
        trailing: true,
        outside: !quote.contains(from),
    }) !== "leave") return into.tagName === "BLOCKQUOTE" ? into : line;
    leaveClosedQuotes(line, from);
    return line;
}

function firstQuoteLine(quote: HTMLElement): HTMLElement | null {
    for (const child of quote.children) {
        if (!(child instanceof HTMLElement)) continue;
        if (child.tagName === "FIGURE") return quotePictureJoin({ leading: "picture" }) === "part" ? child : null;
        if (child.tagName === "P" || /^H[1-3]$/.test(child.tagName)) return child;
        if (child.tagName === "BLOCKQUOTE") {
            const nested = firstQuoteLine(child);
            if (nested) return nested;
            continue;
        }
        if (child.tagName === "UL" || child.tagName === "OL") {
            const item = [...child.children].find((node) => node.tagName === "LI");
            if (item instanceof HTMLElement) return item;
        }
    }
    return null;
}

function adjacentTextBlock(block: HTMLElement, direction: "previous" | "next"): HTMLElement | null {
    const siblingOf = (node: Element) => direction === "previous" ? node.previousElementSibling : node.nextElementSibling;
    let sibling = siblingOf(block);
    let edge = block.parentElement;
    let guard = 0;
    while (!sibling && edge instanceof HTMLElement && guard < 12) {
        guard += 1;
        if (edge.tagName === "UL" || edge.tagName === "OL") {
            sibling = siblingOf(edge);
            if (sibling) break;
            const parent = edge.parentElement;
            const listParent = parent?.tagName === "BLOCKQUOTE" ? "quote" : direction === "next" && parent?.tagName === "LI" ? "item" : "other";
            if (quoteAfterList({ listParent }) !== "out") break;
            edge = parent;
            continue;
        }
        if (direction === "next" && edge.tagName === "LI") {
            sibling = siblingOf(edge);
            if (sibling) break;
            edge = edge.parentElement;
            continue;
        }
        if (quoteLineEdge({ parent: edge.tagName === "BLOCKQUOTE" ? "quote" : "other", atEdge: true }) !== "out") break;
        sibling = siblingOf(edge);
        edge = edge.parentElement;
    }
    if (!sibling) return null;
    if (sibling.tagName === "UL" || sibling.tagName === "OL") {
        const items = [...sibling.children].filter((child) => child.tagName === "LI");
        const item = direction === "previous" ? items[items.length - 1] : items[0];
        return item instanceof HTMLElement ? item : null;
    }
    if (sibling instanceof HTMLElement && sibling.tagName === "BLOCKQUOTE") {
        const line = firstQuoteLine(sibling);
        if (quoteJoinTarget({ direction, hasLine: line instanceof HTMLElement }) === "line" && line instanceof HTMLElement) return line;
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

const PICTURE_STYLE: Record<string, { tag: string; host: string }> = {
    bold: { tag: "b", host: "b, strong" },
    italic: { tag: "i", host: "i, em" },
    underline: { tag: "u", host: "u" },
    strikeThrough: { tag: "s", host: "s, strike, del" },
};

const INLINE_PICTURE_SIBLING = new Set(["B", "STRONG", "I", "EM", "U", "S", "STRIKE", "DEL", "SPAN", "A", "CODE", "SUB", "SUP", "MARK"]);

let pictureStyleDirect = false;

function inlinePictureSibling(figure: HTMLElement): boolean {
    return [...(figure.parentNode?.childNodes ?? [])].some((child) => {
        if (child === figure) return false;
        if (child instanceof Text) return child.data.replace(/[\s\u00a0\u200b]/g, "") !== "";
        return child instanceof HTMLElement && INLINE_PICTURE_SIBLING.has(child.tagName);
    });
}

function indexPath(root: Node, node: Node): number[] {
    const path: number[] = [];
    let current: Node | null = node;
    while (current && current !== root) {
        const parent: Node | null = current.parentNode;
        if (!parent) return [];
        path.unshift(Array.prototype.indexOf.call(parent.childNodes, current));
        current = parent;
    }
    return path;
}

function nodeAtIndex(root: Node, path: number[]): Node | null {
    let current: Node = root;
    for (const index of path) {
        const next = current.childNodes[index];
        if (!next) return null;
        current = next;
    }
    return current;
}

function pictureStyleHost(editor: HTMLElement, range: Range, figures: HTMLElement[]): HTMLElement {
    const fits = (node: HTMLElement) => node.contains(range.startContainer)
        && node.contains(range.endContainer)
        && figures.every((figure) => node.contains(figure));
    let host: HTMLElement | null = figures[0]?.parentElement ?? null;
    while (host && host !== editor && !fits(host)) host = host.parentElement;
    return host && fits(host) ? host : editor;
}

function quoteItalicCovered(editor: HTMLElement, range: Range): boolean {
    const quote = quoteHolding(editor, range);
    if (!quote) return false;
    const slices = italicSlices(range, quote).filter((slice) => !slice.text.parentElement?.closest("figure"));
    return slices.length > 0 && slices.every((slice) => slice.text.parentElement?.closest("i, em"));
}

function styledQuoteAroundPicture(editor: HTMLElement, range: Range, action: "mark" | "clear"): string | null {
    const quote = quoteHolding(editor, range);
    if (!quote) return null;
    const scratch = document.createElement("div");
    scratch.innerHTML = editor.innerHTML;
    const quoteCopy = nodeAtPath(scratch, childPath(editor, quote));
    const start = nodeAtIndex(scratch, indexPath(editor, range.startContainer));
    const end = nodeAtIndex(scratch, indexPath(editor, range.endContainer));
    if (!(quoteCopy instanceof HTMLElement) || !start || !end) return null;
    const copy = document.createRange();
    copy.setStart(start, range.startOffset);
    copy.setEnd(end, range.endOffset);
    const slices = italicSlices(copy, quoteCopy).filter((slice) => !slice.text.parentElement?.closest("figure"));
    for (let index = slices.length - 1; index >= 0; index -= 1) {
        const slice = slices[index];
        if (action === "mark") markItalicSlice(slice.text, slice.start, slice.end);
        else clearItalicSlice(slice.text, slice.start, slice.end);
    }
    return scratch.innerHTML;
}

function styledCopyAroundPicture(editor: HTMLElement, range: Range, command: string, lineFigures: HTMLElement[], between: HTMLElement[]): string | null {
    const scratch = document.createElement("div");
    scratch.contentEditable = "true";
    scratch.style.position = "fixed";
    scratch.style.left = "-10000px";
    scratch.style.top = "0";
    scratch.innerHTML = editor.innerHTML;
    document.body.append(scratch);
    try {
        const copies = [...lineFigures, ...between].map((figure) => nodeAtIndex(scratch, indexPath(editor, figure)));
        if (copies.some((copy) => !(copy instanceof HTMLElement))) return null;
        const holds = copies.map((copy) => {
            const hold = document.createElement("span");
            hold.contentEditable = "false";
            const figure = copy as HTMLElement;
            figure.replaceWith(hold);
            return { figure, hold };
        });
        const start = nodeAtIndex(scratch, indexPath(editor, range.startContainer));
        const end = nodeAtIndex(scratch, indexPath(editor, range.endContainer));
        if (!start || !end) return null;
        const copy = document.createRange();
        copy.setStart(start, range.startOffset);
        copy.setEnd(end, range.endOffset);
        const selection = window.getSelection();
        if (!selection) return null;
        selection.removeAllRanges();
        selection.addRange(copy);
        document.execCommand(command, false);
        for (const hold of holds) {
            if (hold.hold.isConnected) hold.hold.replaceWith(hold.figure);
            else scratch.append(hold.figure);
        }
        return scratch.innerHTML;
    } finally {
        scratch.remove();
    }
}

function pageInsertNests(current: string, next: string): boolean {
    const currentBox = document.createElement("div");
    const nextBox = document.createElement("div");
    currentBox.innerHTML = current;
    nextBox.innerHTML = next;
    const currentFirst = currentBox.firstElementChild;
    const nextFirst = nextBox.firstElementChild;
    if (!currentFirst || !nextFirst) return false;
    const list = currentFirst.tagName === "UL" || currentFirst.tagName === "OL";
    const nextList = nextFirst.tagName === "UL" || nextFirst.tagName === "OL";
    return list && nextList && nextBox.children.length > 1;
}

function replacePictureHost(editor: HTMLElement, host: HTMLElement, afterHtml: string) {
    const template = document.createElement("div");
    template.innerHTML = afterHtml;
    const selection = window.getSelection();
    if (!selection) return;
    const range = document.createRange();
    if (host === editor && pageInsertNests(editor.innerHTML, template.innerHTML)) {
        editor.innerHTML = template.innerHTML;
        pictureStyleDirect = true;
        return;
    }
    if (host === editor) {
        range.selectNodeContents(editor);
        selection.removeAllRanges();
        selection.addRange(range);
        document.execCommand("insertHTML", false, template.innerHTML);
        return;
    }
    const path = childPath(editor, host);
    const copy = nodeAtPath(template, path);
    const target = nodeAtPath(editor, path);
    if (!(copy instanceof HTMLElement) || !(target instanceof HTMLElement)) return;
    range.selectNodeContents(target);
    selection.removeAllRanges();
    selection.addRange(range);
    document.execCommand("insertHTML", false, copy.innerHTML);
}

function stylePictureInLine(editor: HTMLElement, range: Range, command: string, lineFigures: HTMLElement[], between: HTMLElement[]) {
    const host = pictureStyleHost(editor, range, [...lineFigures, ...between]);
    const quoteAction = pictureLineItalic({
        inQuote: command === "italic" && Boolean(quoteHolding(editor, range)),
        covered: quoteItalicCovered(editor, range),
    });
    const after = quoteAction === "browser"
        ? styledCopyAroundPicture(editor, range, command, lineFigures, between)
        : styledQuoteAroundPicture(editor, range, quoteAction);
    if (!after) return;
    editor.focus();
    replacePictureHost(editor, host, after);
}

function styleOutsidePicture(editor: HTMLElement, range: Range, command: string): boolean {
    if (!PICTURE_STYLE[command] || !editor.contains(range.commonAncestorContainer)) return false;
    const figures = [...editor.querySelectorAll("figure")].filter((figure) => {
        const containsEdge = figure.contains(range.startContainer) || figure.contains(range.endContainer);
        if (pictureStyleHold({ containsEdge }) !== "aside") return false;
        try {
            return range.intersectsNode(figure);
        } catch {
            return false;
        }
    });
    if (!figures.length) return false;
    pictureStyleDirect = false;
    const line = figures.filter((figure) => pictureStyleSeat({ inlineSibling: inlinePictureSibling(figure) }) === "line");
    if (line.length) {
        stylePictureInLine(editor, range, command, line, figures.filter((figure) => !line.includes(figure)));
        return true;
    }
    const spots = figures.map((figure) => ({ figure, parent: figure.parentNode, next: figure.nextSibling }));
    for (const figure of figures) figure.remove();
    const selection = window.getSelection();
    if (!selection) {
        for (const spot of spots) spot.parent?.insertBefore(spot.figure, spot.next);
        return false;
    }
    selection.removeAllRanges();
    selection.addRange(range);
    document.execCommand(command, false);
    for (const spot of spots) {
        if (spot.parent?.isConnected) spot.parent.insertBefore(spot.figure, spot.next);
        else editor.append(spot.figure);
    }
    return true;
}

function asidePictures(editor: HTMLElement, range: Range): HTMLElement[] {
    return [...editor.querySelectorAll("figure")].filter((figure) => {
        const containsEdge = figure.contains(range.startContainer) || figure.contains(range.endContainer);
        if (pictureStyleHold({ containsEdge }) !== "aside") return false;
        try {
            return range.intersectsNode(figure);
        } catch {
            return false;
        }
    });
}

function linkedOutsidePicture(editor: HTMLElement, range: Range): { covered: boolean; href: string } {
    const root = range.commonAncestorContainer instanceof Element
        ? range.commonAncestorContainer
        : range.commonAncestorContainer.parentElement;
    if (!(root instanceof HTMLElement) || !editor.contains(root)) return { covered: false, href: "" };
    const slices: Text[] = [];
    const walker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT);
    let node = walker.nextNode();
    while (node instanceof Text) {
        if (node.data.length && !node.parentElement?.closest("figure")) {
            try {
                if (range.intersectsNode(node)) slices.push(node);
            } catch {
                // The text left the document.
            }
        }
        node = walker.nextNode();
    }
    const hrefs = slices.map((slice) => slice.parentElement?.closest("a")?.getAttribute("href") ?? "");
    const covered = slices.length > 0 && hrefs.every((href) => href !== "");
    const href = covered && hrefs.every((item) => item === hrefs[0]) ? hrefs[0] : "";
    return { covered, href };
}

function commandOutsidePicture(editor: HTMLElement, range: Range, command: "createLink" | "unlink", value?: string): { applied: boolean; direct: boolean } {
    const figures = asidePictures(editor, range);
    if (!figures.length) return { applied: false, direct: false };
    const scratch = document.createElement("div");
    scratch.contentEditable = "true";
    scratch.style.position = "fixed";
    scratch.style.left = "-10000px";
    scratch.style.top = "0";
    scratch.innerHTML = editor.innerHTML;
    document.body.append(scratch);
    let after = "";
    try {
        const copies = figures.map((figure) => nodeAtIndex(scratch, indexPath(editor, figure)));
        if (copies.some((copy) => !(copy instanceof HTMLElement))) return { applied: false, direct: false };
        const holds = copies.map((copy) => {
            const hold = document.createElement("span");
            hold.contentEditable = "false";
            const figure = copy as HTMLElement;
            figure.replaceWith(hold);
            return { figure, hold };
        });
        const start = nodeAtIndex(scratch, indexPath(editor, range.startContainer));
        const end = nodeAtIndex(scratch, indexPath(editor, range.endContainer));
        if (!start || !end) return { applied: false, direct: false };
        const copy = document.createRange();
        copy.setStart(start, range.startOffset);
        copy.setEnd(end, range.endOffset);
        const selection = window.getSelection();
        if (!selection) return { applied: false, direct: false };
        selection.removeAllRanges();
        selection.addRange(copy);
        document.execCommand(command, false, value);
        for (const hold of holds) {
            if (hold.hold.isConnected) hold.hold.replaceWith(hold.figure);
            else scratch.append(hold.figure);
        }
        after = scratch.innerHTML;
    } finally {
        scratch.remove();
    }
    if (!after) return { applied: false, direct: false };
    const host = pictureStyleHost(editor, range, figures);
    const template = document.createElement("div");
    template.innerHTML = after;
    const selection = window.getSelection();
    if (!selection) return { applied: false, direct: false };
    editor.focus();
    if (host === editor && pageInsertNests(editor.innerHTML, template.innerHTML)) {
        editor.innerHTML = template.innerHTML;
        return { applied: true, direct: true };
    }
    const placed = document.createRange();
    if (host === editor) {
        placed.selectNodeContents(editor);
        selection.removeAllRanges();
        selection.addRange(placed);
        document.execCommand("insertHTML", false, template.innerHTML);
        return { applied: true, direct: false };
    }
    const path = childPath(editor, host);
    const copy = nodeAtPath(template, path);
    const target = nodeAtPath(editor, path);
    if (!(copy instanceof HTMLElement) || !(target instanceof HTMLElement)) return { applied: false, direct: false };
    placed.selectNodeContents(target);
    selection.removeAllRanges();
    selection.addRange(placed);
    document.execCommand("insertHTML", false, copy.innerHTML);
    return { applied: true, direct: false };
}

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

function quoteIsBlank(quote: HTMLElement): boolean {
    for (const node of quote.childNodes) {
        if (node instanceof Text && !node.data.replace(/[\u00a0\s\u200b]/g, "")) continue;
        if (node instanceof HTMLBRElement) continue;
        return false;
    }
    return true;
}

function closeEmptyHost(parent: HTMLElement | null) {
    let current = parent;
    if (current && (current.tagName === "UL" || current.tagName === "OL") && !current.querySelector("li")) {
        const list = current;
        current = list.parentElement;
        list.remove();
    }
    while (current instanceof HTMLElement && current.tagName === "BLOCKQUOTE" && pictureQuoteShell({ quoted: true, alone: quoteIsBlank(current) }) === "close") {
        const quote = current;
        current = quote.parentElement;
        quote.remove();
    }
    while (current instanceof HTMLElement && current.tagName === "DIV" && current.getAttribute("contenteditable") !== "true" && codeDivHost({ host: true }) === "line" && blankPlainShell(current)) {
        const shell = current;
        current = shell.parentElement;
        shell.remove();
    }
}

function removeJoined(source: HTMLElement) {
    const parent = source.parentElement;
    source.remove();
    closeEmptyHost(parent);
}

function piecesOf(source: HTMLElement): Node[] {
    if (source.tagName === "FIGURE" && quotePictureJoin({ leading: "picture" }) === "part") return [source];
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

function stopsCodeLead(node: Node): boolean {
    if (node instanceof HTMLBRElement) return true;
    if (!(node instanceof HTMLElement)) return false;
    if (/^(P|H1|H2|H3|UL|OL|LI|PRE|BLOCKQUOTE|HR|TABLE|FIGURE|DIV)$/.test(node.tagName)) return true;
    return node.querySelector("pre, ul, ol, table, hr, figure, blockquote") !== null;
}

function leadBeforeCode(pre: HTMLElement): string | null {
    let text = "";
    let sibling = pre.previousSibling;
    while (sibling && !stopsCodeLead(sibling)) {
        text = (sibling.textContent ?? "") + text;
        sibling = sibling.previousSibling;
    }
    const plain = text.replace(/\u200b/g, "").replace(/\u00a0/g, " ");
    if (!plain.trim() || codeLead({ words: true }) !== "pull") return null;
    return plain;
}

function trimLeadEdge(pre: HTMLElement, count: number) {
    let left = count;
    let sibling = pre.previousSibling;
    while (sibling && left > 0 && !stopsCodeLead(sibling)) {
        if (sibling instanceof Text) left = trimTextData(sibling, "end", left);
        else if (sibling instanceof HTMLElement) left = trimEdgeSpaces(sibling, "end", left);
        if (left <= 0) return;
        sibling = sibling.previousSibling;
    }
}

function itemBeforeCode(pre: HTMLElement): HTMLElement | null {
    const item = pre.parentElement;
    if (!(item instanceof HTMLLIElement) || pre.previousElementSibling) return null;
    const list = item.parentElement;
    if (!(list instanceof HTMLElement) || (list.tagName !== "UL" && list.tagName !== "OL")) return null;
    const previous = item.previousElementSibling;
    if (!(previous instanceof HTMLLIElement) || codePriorItem({ item: true }) !== "pull") return null;
    return previous;
}

function textBeforeNode(boundary: ChildNode): string {
    let text = "";
    let sibling = boundary.previousSibling;
    while (sibling && !stopsCodeLead(sibling)) {
        text = (sibling.textContent ?? "") + text;
        sibling = sibling.previousSibling;
    }
    return text.replace(/\u200b/g, "").replace(/\u00a0/g, " ");
}

function trimBeforeNode(boundary: ChildNode, count: number) {
    let left = count;
    let sibling = boundary.previousSibling;
    while (sibling && left > 0 && !stopsCodeLead(sibling)) {
        if (sibling instanceof Text) left = trimTextData(sibling, "end", left);
        else if (sibling instanceof HTMLElement) left = trimEdgeSpaces(sibling, "end", left);
        if (left <= 0) return;
        sibling = sibling.previousSibling;
    }
}

function listElement(node: Element | null): HTMLElement | null {
    return node instanceof HTMLElement && (node.tagName === "UL" || node.tagName === "OL") ? node : null;
}

function deepHostBeforeCode(pre: HTMLElement): { list: HTMLElement; text: string } | null {
    const item = pre.parentElement;
    if (!(item instanceof HTMLLIElement) || pre.previousElementSibling || item.previousElementSibling) return null;
    let list = listElement(item.parentElement);
    const immediate = list?.parentElement;
    if (!list || !(immediate instanceof HTMLLIElement) || textBeforeNode(list).trim()) return null;
    let guard = 0;
    while (guard < 8) {
        const host = list.parentElement;
        if (!(host instanceof HTMLLIElement) || host.previousElementSibling) return null;
        const parentList = listElement(host.parentElement);
        if (!parentList || !(parentList.parentElement instanceof HTMLLIElement)) return null;
        const text = textBeforeNode(parentList);
        if (text.trim() && codeDeepHost({ host: true }) === "pull") return { list: parentList, text };
        list = parentList;
        guard += 1;
    }
    return null;
}

function dropEmptyCodeChain(item: HTMLElement) {
    let current: HTMLElement | null = item;
    let guard = 0;
    while (current instanceof HTMLElement && current.tagName === "LI" && guard < 8) {
        if (current.querySelector("img, figure, pre, ul, ol, table")) return;
        if ((current.textContent ?? "").replace(/[\u200b\u00a0\s]/g, "") !== "") return;
        const list: HTMLElement | null = current.parentElement;
        current.remove();
        if (!(list instanceof HTMLElement)) return;
        const parent: HTMLElement | null = list.parentElement instanceof HTMLElement ? list.parentElement : null;
        closeEmptyHost(list);
        if (list.isConnected) return;
        current = parent;
        guard += 1;
    }
}

function blockBeforeCodeList(pre: HTMLElement): HTMLElement | null {
    const item = pre.parentElement;
    if (!(item instanceof HTMLLIElement) || pre.previousElementSibling || item.previousElementSibling) return null;
    const list = listElement(item.parentElement);
    if (!list) return null;
    let edge: HTMLElement | null = list;
    let guard = 0;
    while (edge && guard < 6) {
        const sibling = edge.previousElementSibling;
        if (sibling instanceof HTMLElement) {
            const line = sibling.tagName === "BLOCKQUOTE" ? firstQuoteLine(sibling) : sibling;
            const target = line instanceof HTMLElement ? line : null;
            if (!target || !/^(P|H1|H2|H3|LI)$/.test(target.tagName) || target.querySelector("table, hr, pre")) return null;
            if (codeListLead({ block: true }) !== "pull") return null;
            return target;
        }
        const parent: HTMLElement | null = edge.parentElement;
        if (!(parent instanceof HTMLElement) || parent.tagName !== "BLOCKQUOTE") return null;
        edge = parent;
        guard += 1;
    }
    return null;
}

function hostBeforeCode(pre: HTMLElement): { list: HTMLElement; text: string } | null {
    const item = pre.parentElement;
    if (!(item instanceof HTMLLIElement) || pre.previousElementSibling || item.previousElementSibling) return null;
    const list = item.parentElement;
    if (!(list instanceof HTMLElement) || (list.tagName !== "UL" && list.tagName !== "OL")) return null;
    if (!(list.parentElement instanceof HTMLLIElement)) return null;
    const text = textBeforeNode(list);
    if (!text.trim() || codeHostItem({ host: true }) !== "pull") return null;
    return { list, text };
}

function breakBeforeCode(pre: HTMLElement): { breakNode: HTMLBRElement; text: string } | null {
    let sibling = pre.previousSibling;
    while (sibling instanceof Text && !sibling.data.replace(/[\u200b\u00a0\s]/g, "")) sibling = sibling.previousSibling;
    if (!(sibling instanceof HTMLBRElement)) return null;
    const text = textBeforeNode(sibling);
    if (!text.trim() || codeBreakLead({ words: true }) !== "pull") return null;
    return { breakNode: sibling, text };
}

function pullCodeAcrossBreak(pre: HTMLElement, breakNode: HTMLBRElement, previous: string): "after" | "none" {
    const code = pre.querySelector("code");
    const source = code instanceof HTMLElement ? code : pre;
    const lines = codeLines(source);
    const line = lines[0] ?? "";
    const rest = lines.slice(1).join("\n");
    const parent = breakNode.parentElement;
    let separated: "after" | "none" = "none";
    if (line.trim() && parent) {
        const gap = joinGap(previous, line);
        trimBeforeNode(breakNode, gap.trimPrevious);
        const text = document.createTextNode(`${gap.insert ? " " : ""}${line.slice(gap.trimNext)}`);
        parent.insertBefore(text, breakNode);
        placeCaretOn(text, parent);
        separated = gap.separate ? "after" : "none";
    } else if (parent) {
        const selection = window.getSelection();
        const caret = document.createRange();
        caret.setStartBefore(breakNode);
        caret.collapse(true);
        selection?.removeAllRanges();
        selection?.addRange(caret);
    }
    let extra = breakNode.nextSibling;
    breakNode.remove();
    while (extra && extra !== pre && extra instanceof Text && !extra.data.replace(/[\u200b\u00a0\s]/g, "")) {
        const next = extra.nextSibling;
        extra.remove();
        extra = next;
    }
    if (!rest.trim()) pre.remove();
    else source.textContent = rest;
    return separated;
}

function pullCodeBeforeList(pre: HTMLElement, list: HTMLElement, previous: string, chain = false): "after" | "none" {
    const code = pre.querySelector("code");
    const source = code instanceof HTMLElement ? code : pre;
    const lines = codeLines(source);
    const line = lines[0] ?? "";
    const rest = lines.slice(1).join("\n");
    const parent = list.parentElement;
    let separated: "after" | "none" = "none";
    if (line.trim() && parent) {
        const gap = joinGap(previous, line);
        trimBeforeNode(list, gap.trimPrevious);
        const text = document.createTextNode(`${gap.insert ? " " : ""}${line.slice(gap.trimNext)}`);
        parent.insertBefore(text, list);
        placeCaretOn(text, parent);
        separated = gap.separate ? "after" : "none";
    } else if (parent) {
        const selection = window.getSelection();
        const caret = document.createRange();
        caret.setStartBefore(list);
        caret.collapse(true);
        selection?.removeAllRanges();
        selection?.addRange(caret);
    }
    const item = pre.parentElement;
    if (!rest.trim()) pre.remove();
    else source.textContent = rest;
    if (item instanceof HTMLElement) {
        if (chain) dropEmptyCodeChain(item);
        else dropEmptyCodeItem(item);
    }
    return separated;
}

function dropEmptyCodeItem(item: HTMLElement) {
    if (item.querySelector("img, figure, pre, ul, ol, table")) return;
    if ((item.textContent ?? "").replace(/[\u200b\u00a0\s]/g, "") !== "") return;
    const list = item.parentElement;
    item.remove();
    if (list instanceof HTMLElement) closeEmptyHost(list);
}

function pullCodeOntoLead(pre: HTMLElement, previous: string, caret: "line" | "tail" = "line"): "after" | "none" {
    const code = pre.querySelector("code");
    const source = code instanceof HTMLElement ? code : pre;
    const lines = codeLines(source);
    const line = lines[0] ?? "";
    const rest = lines.slice(1).join("\n");
    const parent = pre.parentElement;
    let separated: "after" | "none" = "none";
    if (line.trim() && parent) {
        const gap = joinGap(previous, line);
        trimLeadEdge(pre, gap.trimPrevious);
        const text = document.createTextNode(`${gap.insert ? " " : ""}${line.slice(gap.trimNext)}`);
        parent.insertBefore(text, pre);
        placeCaretOn(text, parent);
        separated = gap.separate ? "after" : "none";
        if (!rest.trim()) {
            const following = pre.nextSibling;
            pre.remove();
            separatePulledTail(text, following);
            if (caret === "tail") placeCaretAtTail(following);
        } else source.textContent = rest;
        return separated;
    } else if (parent) {
        const selection = window.getSelection();
        const caret = document.createRange();
        caret.setStartBefore(pre);
        caret.collapse(true);
        selection?.removeAllRanges();
        selection?.addRange(caret);
    }
    if (!rest.trim()) pre.remove();
    else source.textContent = rest;
    return separated;
}

const LEADING_MARK = /^(B|STRONG|I|EM|U|S|STRIKE|DEL|A|SPAN)$/;

function trimLeadingText(node: HTMLElement, count: number) {
    let left = count;
    const walker = document.createTreeWalker(node, NodeFilter.SHOW_TEXT);
    let current: Node | null = walker.nextNode();
    while (current instanceof Text && left > 0) {
        const take = Math.min(left, current.data.length);
        current.data = current.data.slice(take);
        left -= take;
        const empty = current;
        current = walker.nextNode();
        if (!empty.data) empty.remove();
    }
}

function separatePulledTail(inserted: Text, following: ChildNode | null) {
    if (following instanceof Text) {
        const after = joinGap(inserted.data, following.data);
        if (after.trimNext) following.data = following.data.slice(after.trimNext);
        if (after.insert) following.data = ` ${following.data}`;
        return;
    }
    if (!(following instanceof HTMLElement) || !LEADING_MARK.test(following.tagName) || codeMarkTail({ mark: true }) !== "space") return;
    const after = joinGap(inserted.data, following.textContent ?? "");
    if (after.trimNext) trimLeadingText(following, after.trimNext);
    if (after.insert) following.before(document.createTextNode(" "));
}

function placeCaretAtTail(following: ChildNode | null) {
    const selection = window.getSelection();
    if (!selection) return;
    const caret = document.createRange();
    if (following instanceof Text && following.parentNode) {
        const skip = following.data.match(/^[\s\u00a0]*/)?.[0].length ?? 0;
        caret.setStart(following, Math.min(skip, following.data.length));
    } else if (following instanceof HTMLElement) {
        const walker = document.createTreeWalker(following, NodeFilter.SHOW_TEXT);
        const text = walker.nextNode();
        if (text instanceof Text) caret.setStart(text, 0);
        else caret.setStart(following, 0);
    } else return;
    caret.collapse(true);
    selection.removeAllRanges();
    selection.addRange(caret);
}

function pullLastCodeLine(pre: HTMLElement, previous: string): "after" | "none" {
    const code = pre.querySelector("code");
    const source = code instanceof HTMLElement ? code : pre;
    const lines = codeLines(source);
    const line = lines[lines.length - 1] ?? "";
    const rest = lines.slice(0, -1).join("\n");
    if (!rest.trim()) return pullCodeOntoLead(pre, previous, "tail");
    const parent = pre.parentElement;
    if (!parent) return "none";
    const following = pre.nextSibling;
    if (!line.trim()) {
        source.textContent = rest;
        placeCaretAtTail(following);
        return "none";
    }
    const words = following instanceof Text || following instanceof HTMLElement ? following.textContent ?? "" : "";
    const gap = joinGap(line, words);
    source.textContent = rest;
    const text = document.createTextNode(line);
    parent.insertBefore(text, following);
    separatePulledTail(text, following);
    placeCaretAtTail(following);
    return gap.separate ? "after" : "none";
}

function nodeAfterCaret(range: Range): Node | null {
    const start = range.startContainer;
    if (start instanceof Text) {
        if (start.data.slice(range.startOffset).replace(/[\u00a0\s\u200b]/g, "")) return null;
        let current: Node = start;
        while (!current.nextSibling) {
            const parent = current.parentElement;
            if (!(parent instanceof HTMLElement) || !LEADING_MARK.test(parent.tagName)) return null;
            current = parent;
        }
        return current.nextSibling;
    }
    if (start instanceof Element) return start.childNodes[range.startOffset] ?? null;
    return null;
}

function preAfterCaret(selection: Selection): HTMLPreElement | null {
    if (!selection.rangeCount || !selection.isCollapsed) return null;
    let node = nodeAfterCaret(selection.getRangeAt(0));
    while (node) {
        if (node instanceof HTMLPreElement) {
            if (!textBeforeNode(node).trim() || codeForwardLead({ words: true }) !== "pull") return null;
            return node;
        }
        if (node instanceof Text && !node.data.replace(/[\u00a0\s\u200b]/g, "")) {
            node = node.nextSibling;
            continue;
        }
        return null;
    }
    return null;
}

function nodeBeforeCaret(range: Range): Node | null {
    const start = range.startContainer;
    if (start instanceof Text) {
        if (start.data.slice(0, range.startOffset).replace(/[\u00a0\s\u200b]/g, "")) return null;
        let current: Node = start;
        while (!current.previousSibling) {
            const parent = current.parentElement;
            if (!(parent instanceof HTMLElement) || !LEADING_MARK.test(parent.tagName)) return null;
            current = parent;
        }
        return current.previousSibling;
    }
    if (start instanceof Element) {
        const child = start.childNodes[range.startOffset] ?? null;
        return child ? child.previousSibling : start.lastChild;
    }
    return null;
}

function preBeforeCaret(selection: Selection): HTMLPreElement | null {
    if (!selection.rangeCount || !selection.isCollapsed) return null;
    let node = nodeBeforeCaret(selection.getRangeAt(0));
    while (node) {
        if (node instanceof HTMLPreElement) {
            if (codeTailBack({ tail: true }) !== "pull") return null;
            return node;
        }
        if (node instanceof Text && !node.data.replace(/[\u00a0\s\u200b]/g, "")) {
            node = node.previousSibling;
            continue;
        }
        if (node instanceof HTMLElement && LEADING_MARK.test(node.tagName) && !(node.textContent ?? "").replace(/[\u00a0\s\u200b]/g, "")) {
            node = node.previousSibling;
            continue;
        }
        return null;
    }
    return null;
}

function preAtEnd(node: HTMLElement): HTMLPreElement | null {
    let last: ChildNode | null = node.lastChild;
    while (last instanceof Text && !last.data.replace(/[\u00a0\s\u200b]/g, "")) last = last.previousSibling;
    if (last instanceof HTMLBRElement) {
        let before: ChildNode | null = last.previousSibling;
        while (before instanceof Text && !before.data.replace(/[\u00a0\s\u200b]/g, "")) before = before.previousSibling;
        return before instanceof HTMLPreElement ? before : null;
    }
    if (last instanceof HTMLPreElement) return last;
    if (last instanceof HTMLDivElement && !last.querySelector("p, h1, h2, h3, blockquote, ul, ol, table, hr, img, figure")) return preAtEnd(last);
    return null;
}

function preBeforeWriting(block: HTMLElement): HTMLPreElement | null {
    if (!/^(P|H1|H2|H3|BLOCKQUOTE)$/.test(block.tagName) || codeBlockTail({ block: true }) !== "pull") return null;
    let current: HTMLElement | null = block;
    let guard = 0;
    while (current && guard < 4) {
        let sibling: ChildNode | null = current.previousSibling;
        while (sibling instanceof Text && !sibling.data.replace(/[\u00a0\s\u200b]/g, "")) sibling = sibling.previousSibling;
        if (sibling instanceof HTMLPreElement) return sibling;
        if (sibling instanceof HTMLDivElement && !sibling.querySelector("table, hr, img, figure, ul, ol, blockquote")) {
            const pre = preAtEnd(sibling);
            if (pre) return pre;
            return null;
        }
        if (sibling instanceof HTMLElement && sibling.tagName === "BLOCKQUOTE" && codeQuoteEnd({ quote: true }) === "pull") {
            const pre = preAtEnd(sibling);
            if (pre) return pre;
            return null;
        }
        if (sibling instanceof HTMLElement && (sibling.tagName === "UL" || sibling.tagName === "OL") && codeListEnd({ list: true }) === "pull") {
            const item = [...sibling.children].reverse().find((child) => child instanceof HTMLElement && child.tagName === "LI");
            const pre = item instanceof HTMLElement ? preAtEnd(item) : null;
            if (pre) return pre;
            return null;
        }
        if (sibling) return null;
        const parent: HTMLElement | null = current.parentElement;
        if (!(parent instanceof HTMLElement) || parent.tagName !== "BLOCKQUOTE") return null;
        current = parent;
        guard += 1;
    }
    return null;
}

function closeEmptyItem(home: HTMLElement | null) {
    if (!(home instanceof HTMLLIElement)) return;
    if (home.querySelector("img, figure, pre, ul, ol, table, hr")) return;
    if ((home.textContent ?? "").replace(/[\u200b\u00a0\s]/g, "")) return;
    const list = home.parentElement;
    home.remove();
    if (list instanceof HTMLElement) closeEmptyHost(list);
}

function pullCodeIntoBlock(pre: HTMLElement, block: HTMLElement): "after" | "none" {
    const code = pre.querySelector("code");
    const source = code instanceof HTMLElement ? code : pre;
    const lines = codeLines(source);
    const line = lines[lines.length - 1] ?? "";
    const rest = lines.slice(0, -1).join("\n");
    if (!line.trim()) {
        if (!rest.trim()) pre.remove();
        else source.textContent = rest;
        placeCaretAtStart(block);
        return "none";
    }
    const gap = joinGap(line, block.textContent ?? "");
    if (!rest.trim()) pre.remove();
    else source.textContent = rest;
    if (gap.trimNext) trimLeadingText(block, gap.trimNext);
    let following: ChildNode | null = block.firstChild;
    while (following instanceof Text && !following.data.replace(/[\u00a0\s\u200b]/g, "")) following = following.nextSibling;
    if (following instanceof HTMLBRElement && !following.nextSibling) {
        following.remove();
        following = null;
    }
    const text = document.createTextNode(`${line.slice(0, Math.max(0, line.length - gap.trimPrevious))}${gap.insert ? " " : ""}`);
    block.insertBefore(text, block.firstChild);
    if (following?.parentNode) placeCaretAtTail(following);
    else {
        const selection = window.getSelection();
        const caret = document.createRange();
        caret.setStart(text, text.data.length);
        caret.collapse(true);
        selection?.removeAllRanges();
        selection?.addRange(caret);
    }
    return gap.separate ? "after" : "none";
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

function plainCodeLine(block: HTMLElement): boolean {
    return block.querySelector("img, figure, table, pre, hr") === null;
}

function nestedListNode(node: Node): boolean {
    return node instanceof HTMLElement && (node.tagName === "UL" || node.tagName === "OL");
}

function wordsBeforePicture(block: HTMLElement): string | null {
    if (!block.querySelector("img, figure")) return null;
    let text = "";
    const visit = (node: Node): boolean => {
        for (const child of node.childNodes) {
            if (nestedListNode(child)) continue;
            if (child instanceof HTMLElement && (child.tagName === "IMG" || child.tagName === "FIGURE")) return true;
            if (child instanceof HTMLElement && child.querySelector("img, figure")) {
                if (visit(child)) return true;
                continue;
            }
            text += child.textContent ?? "";
        }
        return false;
    };
    visit(block);
    return text.replace(/\u200b/g, "").replace(/\u00a0/g, " ").trim();
}

function pictureWords(block: HTMLElement): string | null {
    const words = wordsBeforePicture(block);
    if (!words || codePictureWords({ before: true }) !== "words") return null;
    return words;
}

function dropWordsBeforePicture(block: HTMLElement) {
    const strip = (node: Node): boolean => {
        for (const child of [...node.childNodes]) {
            if (nestedListNode(child)) continue;
            if (child instanceof HTMLElement && (child.tagName === "IMG" || child.tagName === "FIGURE")) return true;
            if (child instanceof HTMLElement && child.querySelector("img, figure")) {
                if (strip(child)) return true;
                continue;
            }
            child.remove();
        }
        return false;
    };
    strip(block);
}

function wordsBeforeCode(block: HTMLElement): string | null {
    const code = [...block.children].find((child) => child instanceof HTMLPreElement);
    if (!(code instanceof HTMLElement)) return null;
    let text = "";
    for (const child of block.childNodes) {
        if (child === code) break;
        if (nestedListNode(child)) continue;
        text += child.textContent ?? "";
    }
    const words = text.replace(/\u200b/g, "").replace(/\u00a0/g, " ").trim();
    if (!words || codeAhead({ code: true, wordsBefore: true }) !== "words") return null;
    return words;
}

function itemCode(item: HTMLElement): HTMLElement | null {
    const code = [...item.children].find((child) => child instanceof HTMLPreElement);
    if (!(code instanceof HTMLElement)) return null;
    if (wordsBeforeCode(item)) return item;
    if (codeAhead({ code: true, wordsBefore: false }) === "code") return code;
    return null;
}

function dropWordsBeforeCode(block: HTMLElement) {
    for (const child of [...block.childNodes]) {
        if (nestedListNode(child)) continue;
        if (child instanceof HTMLPreElement) return;
        child.remove();
    }
}

function heldBlock(block: HTMLElement): HTMLElement | null {
    const tags = /^(P|H1|H2|H3)$/.test(block.tagName) ? /^(UL|OL|TABLE|HR|PRE)$/ : block.tagName === "LI" ? /^(TABLE|HR)$/ : null;
    if (!tags) return null;
    const held = [...block.children].find((child): child is HTMLElement => child instanceof HTMLElement && tags.test(child.tagName));
    return held ?? null;
}

function wordsBeforeHeld(block: HTMLElement): string | null {
    const held = heldBlock(block);
    if (!held) return null;
    let text = "";
    for (const child of block.childNodes) {
        if (child === held) break;
        text += child.textContent ?? "";
    }
    const words = text.replace(/\u200b/g, "").replace(/\u00a0/g, " ").trim();
    if (!words || codeHeldWords({ held: true }) !== "words") return null;
    return words;
}

function dropWordsBeforeHeld(block: HTMLElement) {
    const held = heldBlock(block);
    if (!held) return;
    for (const child of [...block.childNodes]) {
        if (child === held) break;
        child.remove();
    }
}

function removeCodeTarget(next: HTMLElement) {
    const parent = next.parentElement;
    removeJoined(next);
    if (!(parent instanceof HTMLElement) || parent.tagName !== "LI" || parent.querySelector("img, figure, pre, ul, ol, table")) return;
    if ((parent.textContent ?? "").replace(/[\u200b\u00a0\s]/g, "") !== "") return;
    const list = parent.parentElement;
    parent.remove();
    if (list instanceof HTMLElement) closeEmptyHost(list);
}

function tailAfterCode(pre: HTMLElement): { text: string; nodes: ChildNode[] } | null {
    const nodes: ChildNode[] = [];
    let text = "";
    let sibling = pre.nextSibling;
    while (sibling) {
        const blocked = sibling instanceof HTMLBRElement || (sibling instanceof HTMLElement && (/^(P|H1|H2|H3|UL|OL|LI|PRE|BLOCKQUOTE|HR|TABLE|FIGURE|DIV|IMG)$/.test(sibling.tagName) || sibling.querySelector("pre, ul, ol, table, hr, img, figure, blockquote") !== null));
        if (blocked) break;
        text += sibling.textContent ?? "";
        nodes.push(sibling);
        sibling = sibling.nextSibling;
    }
    const words = text.replace(/\u200b/g, "").replace(/\u00a0/g, " ").trim();
    if (!words || codeTail({ text: true }) !== "line") return null;
    return { text: words, nodes };
}

function blockStaysBeforeCode(block: HTMLElement): boolean {
    return block.tagName === "IMG" || block.tagName === "FIGURE" || block.tagName === "TABLE" || block.tagName === "HR";
}

function contentAfterInnerCode(block: HTMLDivElement): boolean {
    let inner: HTMLPreElement | null = null;
    for (const child of block.children) {
        if (child instanceof HTMLPreElement) inner = child;
    }
    if (!inner) return false;
    let after: ChildNode | null = inner.nextSibling;
    while (after) {
        if (after instanceof Text) {
            if (after.data.replace(/[\u00a0\s\u200b]/g, "")) return true;
        } else return true;
        after = after.nextSibling;
    }
    return false;
}

function wordsAfterCodeBlock(node: Node | null, editor: HTMLElement): HTMLElement | null {
    const host = node instanceof Element ? node : node?.parentElement ?? null;
    const block = host?.closest("div");
    if (!(block instanceof HTMLDivElement) || block === editor || !editor.contains(block)) return null;
    if (block.closest("pre, blockquote, li, td, th, figure")) return null;
    if (!contentAfterInnerCode(block) || codeAfterHost({ words: true }) !== "pull") return null;
    return block;
}

function wrappedCodeShell(pre: HTMLElement): HTMLDivElement | null {
    const shell = pre.parentElement;
    if (!(shell instanceof HTMLDivElement)) return null;
    let before: ChildNode | null = pre.previousSibling;
    while (before) {
        if (!(before instanceof Text) || before.data.replace(/[\u00a0\s\u200b]/g, "")) return null;
        before = before.previousSibling;
    }
    return shell;
}

function lastWritingLine(block: HTMLElement): HTMLElement | null {
    const last = [...block.children].reverse().find((child) => child instanceof HTMLElement);
    if (!(last instanceof HTMLElement)) return null;
    if (/^(P|H1|H2|H3|LI)$/.test(last.tagName)) return last;
    if (last.tagName === "UL" || last.tagName === "OL") {
        const item = [...last.children].reverse().find((node) => node.tagName === "LI");
        return item instanceof HTMLElement ? item : null;
    }
    if (last.tagName === "BLOCKQUOTE") return lastWritingLine(last);
    return null;
}

function followingShell(block: HTMLElement): HTMLDivElement | null {
    let current: HTMLElement = block;
    let guard = 0;
    while (guard < 6) {
        guard += 1;
        const next = current.nextElementSibling;
        if (next instanceof HTMLDivElement) return next;
        if (next) return null;
        const parent = current.parentElement;
        if (!(parent instanceof HTMLElement)) return null;
        if (parent.tagName !== "UL" && parent.tagName !== "OL" && parent.tagName !== "BLOCKQUOTE") return null;
        current = parent;
    }
    return null;
}

function lineBeforeWrappedCode(pre: HTMLElement): HTMLElement | null {
    const shell = wrappedCodeShell(pre);
    if (!shell) return null;
    const previous = shell.previousElementSibling;
    if (!(previous instanceof HTMLElement)) return null;
    if (/^(P|H1|H2|H3)$/.test(previous.tagName)) return codeShellLead({ shell: true }) === "pull" ? previous : null;
    if (codeEdgeLead({ edge: true }) !== "pull") return null;
    if (previous.tagName === "UL" || previous.tagName === "OL") {
        const item = [...previous.children].reverse().find((node) => node.tagName === "LI");
        return item instanceof HTMLElement ? item : null;
    }
    if (previous.tagName === "BLOCKQUOTE") return lastWritingLine(previous);
    return null;
}

function leadingShellCode(block: HTMLElement): HTMLPreElement | null {
    const next = followingShell(block);
    if (!(next instanceof HTMLDivElement)) return null;
    const direct = block.nextElementSibling === next && /^(P|H1|H2|H3)$/.test(block.tagName);
    if ((direct ? codeShellLead({ shell: true }) : codeEdgeLead({ edge: true })) !== "pull") return null;
    let node: ChildNode | null = next.firstChild;
    while (node instanceof Text && !node.data.replace(/[\u00a0\s\u200b]/g, "")) node = node.nextSibling;
    return node instanceof HTMLPreElement ? node : null;
}

function dropBlankCodeShell(shell: HTMLElement | null, editor: HTMLElement) {
    if (!(shell instanceof HTMLDivElement) || shell === editor) return;
    if (shell.querySelector("img, figure, table, pre, hr, ul, ol, blockquote")) return;
    if ((shell.textContent ?? "").replace(/[\u200b\u00a0\s]/g, "")) return;
    shell.remove();
}

function divBeforeCode(pre: HTMLElement): HTMLElement | null {
    const previous = pre.previousElementSibling;
    if (!(previous instanceof HTMLDivElement)) return null;
    if (previous.querySelector("pre")) {
        if (!contentAfterInnerCode(previous) || codeAfterHost({ words: true }) !== "pull") return null;
        return previous;
    }
    if (previous.querySelector("img, figure")) {
        if (codePictureHost({ picture: true }) !== "pull") return null;
        return previous;
    }
    if (previous.querySelector("ul, ol")) {
        if (codeListHost({ list: true }) !== "pull") return null;
        return previous;
    }
    if (previous.querySelector("table")) {
        if (codeTableHost({ table: true }) !== "pull") return null;
        return previous;
    }
    if (previous.querySelector("hr")) {
        if (codeDividerHost({ divider: true }) !== "pull") return null;
        return previous;
    }
    if (previous.querySelector("blockquote")) {
        if (codeQuoteHost({ quote: true }) !== "pull") return null;
        return previous;
    }
    if (codeDivLead({ block: true }) !== "pull") return null;
    return previous;
}

function dividerBeforeCode(pre: HTMLElement): HTMLElement | null {
    const previous = pre.previousElementSibling;
    if (!(previous instanceof HTMLHRElement) || textBeforeNode(pre).trim()) return null;
    if (codeDividerLead({ divider: true }) !== "pull") return null;
    return previous;
}

function tableBeforeCode(pre: HTMLElement): HTMLElement | null {
    const previous = pre.previousElementSibling;
    if (!(previous instanceof HTMLTableElement) || textBeforeNode(pre).trim()) return null;
    if (codeTableLead({ table: true }) !== "pull") return null;
    return previous;
}

function pictureBeforeCode(pre: HTMLElement): HTMLElement | null {
    const previous = pre.previousElementSibling;
    if (!(previous instanceof HTMLElement) || textBeforeNode(pre).trim()) return null;
    const direct = previous.tagName === "IMG" || previous.tagName === "FIGURE";
    const holder = /^(P|H1|H2|H3|DIV)$/.test(previous.tagName) && previous.querySelector("img, figure") !== null && !(previous.textContent ?? "").replace(/[\u200b\u00a0]/g, "").trim() && previous.querySelector("table, pre, hr, ul, ol, blockquote") === null;
    if (!direct && !holder) return null;
    if (codePictureLead({ picture: true }) !== "pull") return null;
    return previous;
}

function pullCodeAfterPicture(picture: HTMLElement, pre: HTMLElement): "after" | "none" {
    const code = pre.querySelector("code");
    const source = code instanceof HTMLElement ? code : pre;
    const lines = codeLines(source);
    const line = (lines[0] ?? "").trim();
    const rest = lines.slice(1).join("\n");
    const parent = picture.parentElement;
    const into = blockStaysBeforeCode(picture) ? null : picture;
    let separated: "after" | "none" = "none";
    if (line && parent) {
        const space = document.createTextNode(" ");
        const text = document.createTextNode(line);
        if (into) {
            into.append(space, text);
            placeCaretOn(text, into);
        } else {
            picture.after(text);
            picture.after(space);
            placeCaretOn(text, parent);
        }
        separated = "after";
    } else if (parent) {
        const selection = window.getSelection();
        const caret = document.createRange();
        caret.setStartAfter(picture);
        caret.collapse(true);
        selection?.removeAllRanges();
        selection?.addRange(caret);
    }
    if (!rest.trim()) pre.remove();
    else source.textContent = rest;
    return separated;
}

function codeBeforeThis(pre: HTMLElement): HTMLElement | null {
    const previous = pre.previousElementSibling;
    if (!(previous instanceof HTMLPreElement)) return null;
    if (codeBeside({ code: true }) !== "line") return null;
    return previous;
}

function codeInsideBlock(pre: HTMLElement): HTMLElement | null {
    const previous = pre.previousElementSibling;
    if (!(previous instanceof HTMLDivElement)) return null;
    let inner: HTMLPreElement | null = null;
    for (const child of previous.children) {
        if (child instanceof HTMLPreElement) inner = child;
    }
    if (!inner || inner.nextElementSibling) return null;
    let after: ChildNode | null = inner.nextSibling;
    while (after) {
        if (!(after instanceof Text) || after.data.replace(/[\u00a0\s\u200b]/g, "")) return null;
        after = after.nextSibling;
    }
    if (codeInside({ code: true }) !== "line") return null;
    return inner;
}

function joinCodeBefore(previous: HTMLElement, pre: HTMLElement) {
    const earlier = previous.querySelector("code");
    const source = earlier instanceof HTMLElement ? earlier : previous;
    const later = pre.querySelector("code");
    const incoming = later instanceof HTMLElement ? later : pre;
    const body = (incoming.textContent ?? "").replace(/\u200b/g, "").replace(/\u00a0/g, " ").replace(/^\n+/, "").replace(/\n+$/, "");
    if (!(source.textContent ?? "").replace(/[\u200b\u00a0]/g, "").trim()) {
        for (const child of [...source.childNodes]) {
            if (child instanceof HTMLBRElement || (child instanceof Text && !child.data.replace(/[\u200b\u00a0]/g, "").trim())) child.remove();
        }
    }
    source.removeAttribute("data-fresh");
    const existing = (source.textContent ?? "").replace(/\u200b/g, "");
    const oldLength = existing.replace(/\u00a0/g, " ").length;
    const broken = existing.length > 0 && !existing.endsWith("\n");
    if (body) {
        source.appendChild(document.createTextNode(`${broken ? "\n" : ""}${body}`));
        placeCaretAtTextOffset(source, oldLength + (broken ? 1 : 0));
    } else placeCaretAtEnd(source);
    pre.remove();
}

function joinTailIntoCode(pre: HTMLElement, tail: { text: string; nodes: ChildNode[] }) {
    const code = pre.querySelector("code");
    const source = code instanceof HTMLElement ? code : pre;
    source.removeAttribute("data-fresh");
    const existing = (source.textContent ?? "").replace(/\u200b/g, "");
    const oldLength = existing.replace(/\u00a0/g, " ").length;
    const broken = existing.length > 0 && !existing.endsWith("\n");
    source.appendChild(document.createTextNode(`${broken ? "\n" : ""}${tail.text}`));
    placeCaretAtTextOffset(source, oldLength + (broken ? 1 : 0));
    for (const node of tail.nodes) node.remove();
}

function leadingDivider(block: HTMLElement, depth = 0): HTMLElement | null {
    if (depth > 6 || codeWrappedStay({ wrapped: true }) !== "stay") return null;
    if (block.tagName === "HR") return block;
    for (const node of block.childNodes) {
        if (node instanceof Text && node.data.replace(/[\u00a0\s\u200b]/g, "") === "") continue;
        if (node instanceof HTMLHRElement) return node;
        if (node instanceof HTMLElement && /^(P|H1|H2|H3|LI|DIV|BLOCKQUOTE|UL|OL)$/.test(node.tagName)) return leadingDivider(node, depth + 1);
        return null;
    }
    return null;
}

function leadingTable(block: HTMLElement, depth = 0): HTMLElement | null {
    if (depth > 6 || codeTableStay({ table: true }) !== "stay") return null;
    if (block.tagName === "TABLE") return block;
    for (const node of block.childNodes) {
        if (node instanceof Text && node.data.replace(/[\u00a0\s\u200b]/g, "") === "") continue;
        if (node instanceof HTMLTableElement) return node;
        if (node instanceof HTMLElement && /^(P|H1|H2|H3|LI|DIV|BLOCKQUOTE|UL|OL)$/.test(node.tagName)) return leadingTable(node, depth + 1);
        return null;
    }
    return null;
}

function writingAfterCode(pre: HTMLElement): HTMLElement | null {
    let sibling = pre.nextElementSibling;
    let edge = pre.parentElement;
    let guard = 0;
    while (!sibling && edge instanceof HTMLElement && guard < 12) {
        const listHost = edge.tagName === "LI" ? "item" : edge.tagName === "UL" || edge.tagName === "OL" ? "list" : "other";
        const throughList = listHost !== "other" && codePastItem({ host: listHost }) === "out";
        const throughHeading = /^H[1-3]$/.test(edge.tagName) && codeHeadingForward({ heading: true }) === "line";
        const throughBlock = edge.tagName === "DIV" && edge.getAttribute("contenteditable") !== "true" && codeDivForward({ block: true }) === "line";
        if (!throughList && edge.tagName !== "BLOCKQUOTE" && !throughHeading && !throughBlock) break;
        sibling = edge.nextElementSibling;
        edge = edge.parentElement;
        guard += 1;
    }
    if (!(sibling instanceof HTMLElement)) return null;
    if (sibling.tagName === "DIV" && sibling.getAttribute("contenteditable") !== "true" && codeDivHost({ host: true }) === "line") {
        const hosted = hostedPlainBlock(sibling);
        if (hosted) sibling = hosted;
    }
    if (!(sibling instanceof HTMLElement)) return null;
    const divider = leadingDivider(sibling);
    if (divider) return divider;
    if (sibling.tagName === "LI") {
        if (sibling.querySelector("img, figure") && !pictureWords(sibling)) return null;
        const nested = itemCode(sibling);
        if (nested) return nested;
        if (sibling.querySelector("pre")) return null;
        const table = heldTable(sibling);
        if (table) return table;
        return sibling;
    }
    if (/^(P|H1|H2|H3)$/.test(sibling.tagName)) {
        if (wordsBeforeHeld(sibling) || firstBrokenLine(sibling) || pictureWords(sibling)) return sibling;
        const held = heldBlock(sibling);
        if (held?.tagName === "HR" && codeHeldStay({ held: true }) === "stay") return held;
        if (held?.tagName === "PRE" && codeHeldCode({ held: true }) === "line") return held;
        const extra = [...sibling.childNodes].some((node) => node !== held && node instanceof Text && node.data.replace(/[\u00a0\s\u200b]/g, "") !== "");
        if (held && !extra && /^(UL|OL)$/.test(held.tagName)) {
            const line = hostedBlockLine(held);
            if (line) return line;
        }
        if (held || (sibling.querySelector("img, figure") && !pictureWords(sibling))) return null;
        return sibling;
    }
    if (sibling.tagName === "UL" || sibling.tagName === "OL" || sibling.tagName === "BLOCKQUOTE") return hostedBlockLine(sibling);
    const plain = plainDivWriting(sibling);
    if (plain) return plain;
    if (sibling.tagName === "HR" && codeHeldStay({ held: true }) === "stay") return sibling;
    if (sibling.tagName === "PRE") return sibling;
    return null;
}

function codeBehindWriting(block: HTMLElement): HTMLPreElement | null {
    let sibling = block.previousElementSibling;
    let edge = block.parentElement;
    let guard = 0;
    while (!sibling && edge instanceof HTMLElement && guard < 12) {
        if (edge.getAttribute("contenteditable") === "true") break;
        const listHost = edge.tagName === "LI" ? "item" : edge.tagName === "UL" || edge.tagName === "OL" ? "list" : "other";
        const throughList = listHost !== "other" && codePastItem({ host: listHost }) === "out";
        const throughHeading = /^H[1-3]$/.test(edge.tagName) && codeHeadingForward({ heading: true }) === "line";
        const throughBlock = edge.tagName === "DIV" && edge.getAttribute("contenteditable") !== "true" && codeDivForward({ block: true }) === "line";
        if (!throughList && edge.tagName !== "BLOCKQUOTE" && !throughHeading && !throughBlock) break;
        sibling = edge.previousElementSibling;
        edge = edge.parentElement;
        guard += 1;
    }
    if (!(sibling instanceof HTMLPreElement)) return null;
    return writingAfterCode(sibling) === block ? sibling : null;
}

function blankPlainShell(block: HTMLElement): boolean {
    if (block.querySelector("img, figure, table, pre, hr, ul, ol, blockquote, li")) return false;
    return (block.textContent ?? "").replace(/[\u200b\u00a0\s]/g, "") === "";
}

function hostedPlainBlock(block: HTMLElement): HTMLElement | null {
    let current: HTMLElement = block;
    for (let guard = 0; guard < 8; guard += 1) {
        const elements = [...current.children].filter((child): child is HTMLElement => child instanceof HTMLElement);
        const extra = [...current.childNodes].some((node) => node instanceof Text && node.data.replace(/[\u00a0\s\u200b]/g, "") !== "");
        if (extra || elements.length !== 1) return null;
        const only = elements[0];
        if (/^(UL|OL|BLOCKQUOTE)$/.test(only.tagName)) return only;
        if (only.tagName !== "DIV" || only.getAttribute("contenteditable") === "true" || codeDivDeep({ deep: true }) !== "line") return null;
        current = only;
    }
    return null;
}

function heldTable(block: HTMLElement): HTMLElement | null {
    const held = heldBlock(block);
    if (held?.tagName === "TABLE" && !wordsBeforeHeld(block) && codeTableStay({ table: true }) === "stay") return held;
    return null;
}

function hostedBlockLine(host: HTMLElement): HTMLElement | null {
    if (host.tagName === "UL" || host.tagName === "OL") {
        const item = [...host.children].find((child) => child instanceof HTMLElement && child.tagName === "LI");
        if (!(item instanceof HTMLElement)) return null;
        if (item.querySelector("img, figure") && !pictureWords(item)) return null;
        const nested = itemCode(item);
        if (nested) return nested;
        if (item.querySelector("pre")) return null;
        const table = heldTable(item);
        if (table) return table;
        return item;
    }
    if (host.tagName === "BLOCKQUOTE") {
        const table = leadingTable(host);
        if (table) return table;
        const first = host.firstElementChild;
        if (first instanceof HTMLPreElement && codeAhead({ code: true, wordsBefore: false }) === "code") return first;
        const line = firstQuoteLine(host);
        if (!(line instanceof HTMLElement) || !/^(P|H1|H2|H3|LI)$/.test(line.tagName)) return null;
        if (line.tagName === "LI") {
            if (line.querySelector("img, figure") && !pictureWords(line)) return null;
            const nested = itemCode(line);
            if (nested) return nested;
            if (line.querySelector("pre")) return null;
        }
        if (line.querySelector("table, pre, hr")) {
            if (wordsBeforeHeld(line)) return line;
            const held = heldBlock(line);
            if (held?.tagName === "PRE" && codeHeldCode({ held: true }) === "line") return held;
            if (held?.tagName === "TABLE" && codeTableStay({ table: true }) === "stay") return held;
            return null;
        }
        if (!plainCodeLine(line) && !pictureWords(line)) return null;
        return line;
    }
    return null;
}

function plainDivWriting(block: HTMLElement): HTMLElement | null {
    if (block.tagName !== "DIV" || block.getAttribute("contenteditable") === "true" || codeDivLine({ block: true }) !== "line") return null;
    const blocks = [...block.children].filter((child): child is HTMLElement => child instanceof HTMLElement && /^(P|H1|H2|H3|DIV|UL|OL|PRE|BLOCKQUOTE|TABLE|HR|FIGURE|LI)$/.test(child.tagName));
    if (blocks.length > 1) {
        const first = blocks[0];
        if (first.tagName === "DIV" && first.getAttribute("contenteditable") !== "true" && codeDivSide({ side: true }) === "line") {
            const writing = plainDivWriting(first);
            if (writing) return writing;
            if (codeDivList({ list: true }) === "line") {
                const hosted = hostedPlainBlock(first);
                const line = hosted ? hostedBlockLine(hosted) : null;
                if (line) return line;
            }
        }
        if (/^(UL|OL|BLOCKQUOTE)$/.test(first.tagName) && codeDivHead({ head: true }) === "line") {
            const line = hostedBlockLine(first);
            if (line) return line;
        }
        if (!/^(P|H1|H2|H3)$/.test(first.tagName) || codeDivRest({ rest: true }) !== "line") {
            if (first.tagName === "PRE" && codeHeldCode({ held: true }) === "line") return first;
            return null;
        }
        if (first.querySelector("table, pre, ul, ol, hr, blockquote")) {
            if (wordsBeforeHeld(first)) return first;
            const held = heldBlock(first);
            if (held?.tagName === "PRE" && codeHeldCode({ held: true }) === "line") return held;
            return null;
        }
        if (first.querySelector("img, figure") && !pictureWords(first)) return null;
        return first;
    }
    if (block.querySelector("table, pre, ul, ol, hr, blockquote")) {
        const first = blocks[0];
        if (first && wordsBeforeHeld(first)) return first;
        if (first?.tagName === "PRE" && codeHeldCode({ held: true }) === "line") return first;
        const held = first ? heldBlock(first) : null;
        if (held?.tagName === "PRE" && codeHeldCode({ held: true }) === "line") return held;
        return null;
    }
    if (blocks.length === 1 && blocks[0].tagName === "DIV" && block.children.length === 1 && codeDivNest({ nest: true }) === "line") return plainDivWriting(blocks[0]);
    if (blocks.length === 1 && (!/^(P|H1|H2|H3)$/.test(blocks[0].tagName) || block.children.length !== 1)) return null;
    if (block.querySelector("img, figure") && !pictureWords(block)) return null;
    return block;
}

function codeForwardKind(next: HTMLElement | null): "writing" | "list" | "quote" | "code" | "none" {
    if (!(next instanceof HTMLElement)) return "none";
    if (next.tagName === "LI") return "list";
    if (next.tagName === "PRE") return "code";
    if (next.parentElement?.tagName === "BLOCKQUOTE") return "quote";
    return "writing";
}

function codeJoinText(next: HTMLElement): string {
    const pictured = pictureWords(next);
    if (pictured) return pictured;
    const ahead = wordsBeforeCode(next);
    if (ahead) return ahead;
    const root = next.tagName === "PRE" ? next.querySelector("code") ?? next : next;
    let text = "";
    if (next.tagName === "LI") {
        for (const child of next.childNodes) {
            if (child instanceof HTMLElement && (child.tagName === "UL" || child.tagName === "OL")) continue;
            text += child.textContent ?? "";
        }
    } else text = root.textContent ?? "";
    return text.replace(/\u200b/g, "").replace(/\u00a0/g, " ").trim();
}

function keepNestedList(next: HTMLElement) {
    const lists = [...next.children].filter((child): child is HTMLElement => child instanceof HTMLElement && (child.tagName === "UL" || child.tagName === "OL"));
    for (const child of [...next.childNodes]) {
        if (child instanceof HTMLElement && (child.tagName === "UL" || child.tagName === "OL")) continue;
        child.remove();
    }
    const parent = next.parentElement;
    const leftover = [...next.childNodes].some((child) => !(child instanceof HTMLElement && (child.tagName === "UL" || child.tagName === "OL")));
    if (!(parent instanceof HTMLElement) || leftover) return;
    for (const list of lists) {
        for (const item of [...list.children]) parent.insertBefore(item, next);
        list.remove();
    }
    next.remove();
    closeEmptyHost(parent);
}

function leaveTrailingCode(pre: HTMLElement, from: HTMLElement) {
    let guard = 0;
    while (guard < 8) {
        guard += 1;
        const quote = pre.parentElement;
        if (!(quote instanceof HTMLElement) || quote.tagName !== "BLOCKQUOTE" || pre.nextElementSibling) break;
        if (quoteTrailingLeave({ trailing: true, outside: !quote.contains(from) }) !== "leave") break;
        quote.after(pre);
        closeEmptyHost(quote);
    }
}

function textBeforeBreak(block: HTMLElement, br: HTMLBRElement): string {
    let text = "";
    const walk = (node: Node): boolean => {
        if (node === br) return true;
        if (node instanceof HTMLElement && (node.tagName === "UL" || node.tagName === "OL")) return false;
        if (node instanceof Text) {
            text += node.data;
            return false;
        }
        for (const child of node.childNodes) {
            if (walk(child)) return true;
        }
        return false;
    };
    walk(block);
    return text.replace(/\u200b/g, "").replace(/\u00a0/g, " ").trim();
}

function firstBrokenLine(block: HTMLElement): { text: string; br: HTMLBRElement } | null {
    if (codeLineBreak({ line: true }) !== "line") return null;
    for (const node of block.querySelectorAll("br")) {
        if (!(node instanceof HTMLBRElement)) continue;
        const list = node.closest("ul, ol");
        if (list && list !== block && block.contains(list)) continue;
        const text = textBeforeBreak(block, node);
        if (text) return { text, br: node };
    }
    return null;
}

function dropThroughBreak(block: HTMLElement, br: HTMLBRElement) {
    const removeBefore = (parent: Node): boolean => {
        for (const child of [...parent.childNodes]) {
            if (child === br) return true;
            if (child instanceof HTMLElement && (child.tagName === "UL" || child.tagName === "OL")) continue;
            if (child instanceof HTMLElement && child.contains(br)) {
                if (removeBefore(child)) return true;
            }
            child.remove();
        }
        return false;
    };
    removeBefore(block);
    let shell = br.parentElement;
    br.remove();
    while (shell && shell !== block && shell.parentElement && !(shell.textContent ?? "").replace(/[\u200b\u00a0\s]/g, "") && !shell.querySelector("img, figure, br, ul, ol, pre, table")) {
        const parent = shell.parentElement;
        shell.remove();
        shell = parent;
    }
    if ((block.textContent ?? "").replace(/[\u200b\u00a0\s]/g, "") === "" && !block.querySelector("img, figure, table, pre, ul, ol, hr")) removeCodeTarget(block);
}

function joinWritingIntoCode(pre: HTMLElement, next: HTMLElement) {
    const code = pre.querySelector("code");
    const source = code instanceof HTMLElement ? code : pre;
    if (next.tagName === "HR" && codeHeldStay({ held: true }) === "stay") return;
    if (next.tagName === "TABLE" && codeTableStay({ table: true }) === "stay") return;
    const keepPicture = pictureWords(next) !== null;
    const lineFirst = !keepPicture && /^(P|H1|H2|H3)$/.test(next.tagName) ? firstBrokenLine(next) : null;
    const heldWords = !keepPicture && !lineFirst ? wordsBeforeHeld(next) : null;
    const keepCode = !keepPicture && !lineFirst && !heldWords && wordsBeforeCode(next) !== null;
    const brokenLine = lineFirst ?? (!keepPicture && !keepCode && !heldWords ? firstBrokenLine(next) : null);
    const body = heldWords ?? (brokenLine ? brokenLine.text : codeJoinText(next));
    const nested = !keepPicture && !keepCode && !brokenLine && !heldWords && next.tagName === "LI" && next.querySelector("ul, ol") !== null && codeListNest({ nested: true }) === "keep";
    const shell = next.closest("p, h1, h2, h3");
    const finish = () => {
        if (keepPicture) dropWordsBeforePicture(next);
        else if (keepCode) dropWordsBeforeCode(next);
        else if (brokenLine) dropThroughBreak(next, brokenLine.br);
        else if (heldWords) dropWordsBeforeHeld(next);
        else if (nested) keepNestedList(next);
        else removeCodeTarget(next);
        if (shell instanceof HTMLElement && shell.isConnected && shell !== next && blankPlainShell(shell)) removeJoined(shell);
    };
    leaveTrailingCode(pre, next);
    source.removeAttribute("data-fresh");
    if (!body) {
        placeCaretAtEnd(source);
        finish();
        return;
    }
    const existing = (source.textContent ?? "").replace(/\u200b/g, "");
    const oldLength = existing.replace(/\u00a0/g, " ").length;
    const broken = existing.length > 0 && !existing.endsWith("\n");
    source.appendChild(document.createTextNode(`${broken ? "\n" : ""}${body}`));
    placeCaretAtTextOffset(source, oldLength + (broken ? 1 : 0));
    finish();
}

function followingCode(block: HTMLElement): HTMLPreElement | null {
    let next = block.nextElementSibling;
    const parent = block.parentElement;
    if (!next && parent && (parent.tagName === "UL" || parent.tagName === "OL")) next = parent.nextElementSibling;
    return next instanceof HTMLPreElement ? next : null;
}

function leadingQuoteCode(quote: HTMLElement): HTMLPreElement | null {
    let current: HTMLElement | null = quote;
    let guard = 0;
    while (current && guard < 12) {
        const first: Element | null = current.firstElementChild;
        if (first instanceof HTMLPreElement) return first;
        if (!(first instanceof HTMLElement) || first.tagName !== "BLOCKQUOTE") return null;
        current = first;
        guard += 1;
    }
    return null;
}

function quoteCodeLead(block: HTMLElement): HTMLPreElement | null {
    let next = block.nextElementSibling;
    const parent = block.parentElement;
    if (!next && parent && (parent.tagName === "UL" || parent.tagName === "OL")) next = parent.nextElementSibling;
    if (!(next instanceof HTMLElement) || next.tagName !== "BLOCKQUOTE") return null;
    const pre = leadingQuoteCode(next);
    if (!(pre instanceof HTMLPreElement) || codeQuoteLead({ leading: true }) !== "code") return null;
    return pre;
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

function writingWithoutPicture(node: Node): string {
    if (node instanceof Text) return node.data;
    if (node instanceof HTMLElement && (node.tagName === "FIGURE" || node.tagName === "FIGCAPTION")) return "";
    let text = "";
    for (const child of node.childNodes) text += writingWithoutPicture(child);
    return text;
}

function pictureAtEnd(host: HTMLElement): boolean {
    let node: ChildNode | null = host.lastChild;
    while (node instanceof Text && !node.data.replace(/[\u00a0\s\u200b]/g, "")) node = node.previousSibling;
    return node instanceof HTMLElement && node.tagName === "FIGURE";
}

function joinBlock(target: HTMLElement, source: HTMLElement): "after" | "none" {
    const into = writingHost(target);
    const home = source.parentElement;
    const keepPicture = source.tagName === "FIGURE" && quotePictureJoin({ leading: "picture" }) === "part";
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
    const pieces = piecesOf(source);
    const start = pieces.find((node) => {
        if (node instanceof Text) return node.data.replace(/[\u200b\u00a0]/g, "") !== "";
        return !(node instanceof HTMLBRElement);
    }) ?? pieces[0] ?? null;
    const startsWithPicture = start instanceof HTMLElement && start.tagName === "FIGURE";
    const gap = startsWithPicture
        ? { trimPrevious: 0, trimNext: 0, insert: false, separate: false }
        : joinGap(writingWithoutPicture(into), writingWithoutPicture(source));
    trimEdgeSpaces(into, "end", gap.trimPrevious);
    trimEdgeSpaces(source, "start", gap.trimNext);
    for (const node of pieces) {
        const picture = node instanceof HTMLElement && node.tagName === "FIGURE";
        const besidePicture = picture || pictureAtEnd(into);
        const joined = picturePieceJoin({
            picture,
            previous: besidePicture ? "" : (into.textContent ?? ""),
            next: picture ? "" : (node.textContent ?? ""),
        });
        if (joined === "space") into.appendChild(document.createTextNode(" "));
        into.appendChild(node);
    }
    if (keepPicture) closeEmptyHost(home);
    else removeJoined(source);
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

function pictureBesideBreak(br: HTMLBRElement): boolean {
    const beside = (direction: "previous" | "next") => {
        let node: ChildNode | null = direction === "previous" ? br.previousSibling : br.nextSibling;
        while (node instanceof Text && !node.data.replace(/[\u00a0\s\u200b]/g, "")) {
            node = direction === "previous" ? node.previousSibling : node.nextSibling;
        }
        return node instanceof HTMLElement && node.tagName === "FIGURE";
    };
    return beside("previous") || beside("next");
}

function joinBrokenLine(br: HTMLBRElement): "after" | "none" {
    const block = br.closest("p, li, h1, h2, h3, blockquote");
    const before = textBesideBreak(br, "previous");
    const after = textBesideBreak(br, "next");
    const following = firstTextAfter(br);
    const marker = br.nextSibling;
    let neighbor: ChildNode | null = br.nextSibling;
    while (neighbor instanceof Text && !neighbor.data.replace(/[\u00a0\s\u200b]/g, "")) neighbor = neighbor.nextSibling;
    const next = neighbor instanceof HTMLElement && neighbor.tagName === "FIGURE"
        ? "picture"
        : neighbor instanceof Text || (neighbor instanceof HTMLElement && (neighbor.textContent ?? "").replace(/[\u00a0\s\u200b]/g, ""))
            ? "writing"
            : "none";
    const picture = next === "picture" && neighbor instanceof HTMLElement ? neighbor : null;
    const gap = pictureLineJoin({ besidePicture: pictureBesideBreak(br) }) === "flush"
        ? { trimPrevious: 0, trimNext: 0, insert: false, separate: false }
        : joinGap(before, after);
    trimSpacesBeside(br, "previous", gap.trimPrevious);
    trimSpacesBeside(br, "next", gap.trimNext);
    if (gap.insert) {
        const previous = br.previousSibling;
        if (previous instanceof Text) previous.data = `${previous.data} `;
        else br.before(document.createTextNode(" "));
    }
    br.remove();
    const fallback = block instanceof HTMLElement ? block : following?.parentElement;
    if (pictureJoinCaret({ next }) === "before" && picture?.isConnected) {
        const selection = window.getSelection();
        const caret = document.createRange();
        caret.setStartBefore(picture);
        caret.collapse(true);
        selection?.removeAllRanges();
        selection?.addRange(caret);
    } else if (following?.isConnected && fallback instanceof HTMLElement) placeCaretOn(following, fallback);
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

function leavingOrderedNumbers(item: HTMLElement, other: HTMLElement | null): Map<HTMLElement, number> | null {
    const list = item.parentElement;
    const sameList = other instanceof HTMLElement && other.tagName === "LI" && other.parentElement === list;
    if (!(list instanceof HTMLOListElement) || !listLineLeaves({ ordered: true, sameList })) return null;
    const items = listItems(list);
    const numbers = new Map<HTMLElement, number>();
    items.forEach((entry, index) => {
        numbers.set(entry, orderedItemNumber({
            start: list.getAttribute("start"),
            values: items.map((node) => node.getAttribute("value")),
            index,
        }));
    });
    return numbers;
}

function directNestedLists(item: HTMLElement): HTMLElement[] {
    return [...item.children].filter((child): child is HTMLElement => child instanceof HTMLElement && (child.tagName === "UL" || child.tagName === "OL"));
}

function detachNestedLists(source: HTMLElement, host: string): HTMLElement[] {
    const nested = directNestedLists(source);
    if (nestedListLeave({ nested: nested.length > 0, host }) !== "lift") return [];
    for (const list of nested) list.remove();
    return nested;
}

function placeLiftedLists(anchor: HTMLElement, lists: HTMLElement[]) {
    let current = anchor;
    for (const list of lists) {
        current.after(list);
        current = list;
    }
}

function selectedListItems(editor: HTMLElement, range: Range): HTMLElement[] | null {
    const startHost = range.startContainer instanceof Element ? range.startContainer : range.startContainer.parentElement;
    const endHost = range.endContainer instanceof Element ? range.endContainer : range.endContainer.parentElement;
    let startItem = startHost?.closest("li") ?? null;
    let endItem = endHost?.closest("li") ?? null;
    if (!(startItem instanceof HTMLElement) || !(endItem instanceof HTMLElement) || !editor.contains(startItem) || !editor.contains(endItem)) return null;
    if (startItem.contains(endItem)) endItem = startItem;
    else if (endItem.contains(startItem)) startItem = endItem;
    const list = startItem.parentElement;
    if (!(list instanceof HTMLUListElement || list instanceof HTMLOListElement) || list !== endItem.parentElement) return [startItem];
    const items = listItems(list);
    const start = items.indexOf(startItem);
    const end = items.indexOf(endItem);
    if (start < 0 || end < 0) return [startItem];
    return items.slice(Math.min(start, end), Math.max(start, end) + 1);
}

function headingNodesAroundPictures(item: HTMLElement, tag: "h1" | "h2" | "h3"): HTMLElement[] {
    const nodes: HTMLElement[] = [];
    let heading: HTMLElement | null = null;
    const flush = () => {
        if (!heading || blockIsEmpty(heading)) {
            heading = null;
            return;
        }
        nodes.push(heading);
        heading = null;
    };
    for (const child of [...item.childNodes]) {
        if (child instanceof HTMLElement && child.tagName === "FIGURE") {
            flush();
            child.remove();
            nodes.push(child);
            continue;
        }
        if (!heading) heading = document.createElement(tag);
        heading.appendChild(child);
    }
    flush();
    return nodes;
}

function turnListItemIntoHeading(item: HTMLElement, tag: "h1" | "h2" | "h3"): HTMLElement | null {
    const list = item.parentElement;
    if (!(list instanceof HTMLUListElement || list instanceof HTMLOListElement)) return null;
    const numbers = leavingOrderedNumbers(item, null);
    const lifted = detachNestedLists(item, tag.toUpperCase());
    const pictures = [...item.children].some((child) => child.tagName === "FIGURE");
    const around = listHeadingPicture({ inItem: true, hasPicture: pictures }) === "lift"
        ? headingNodesAroundPictures(item, tag)
        : [];
    const heading = document.createElement(tag);
    if (!around.length) {
        while (item.firstChild) heading.appendChild(item.firstChild);
        if (blockIsEmpty(heading)) {
            heading.replaceChildren();
            heading.appendChild(document.createElement("br"));
        }
    }
    const placed = around.length ? around : [heading];
    const items = listItems(list);
    const index = items.indexOf(item);
    const before = index > 0;
    const following = items.slice(index + 1);
    item.remove();
    const after = following.length ? document.createElement(list.tagName.toLowerCase()) : null;
    if (after) for (const next of following) after.append(next);
    const lead = placed[0];
    if (!before) {
        if (after) list.after(after);
        list.replaceWith(lead);
    } else {
        if (after) list.after(after);
        list.after(lead);
    }
    let anchor = lead;
    for (const node of placed.slice(1)) {
        anchor.after(node);
        anchor = node;
    }
    placeLiftedLists(anchor, lifted);
    if (numbers) restoreOrderedNumbers(numbers);
    return placed.find((node) => node.tagName === tag.toUpperCase()) ?? lead;
}

function turnListItemsIntoHeadings(items: HTMLElement[], tag: string): HTMLElement | null {
    const level = tag.toLowerCase();
    if (level !== "h1" && level !== "h2" && level !== "h3") return null;
    let first: HTMLElement | null = null;
    for (const item of [...items].reverse()) {
        if (!item.isConnected) continue;
        const heading = turnListItemIntoHeading(item, level);
        if (heading) first = heading;
    }
    if (first) placeCaretAtStart(first);
    return first;
}

function sidePiece(block: HTMLElement, range: Range, edge: "before" | "after"): DocumentFragment {
    const piece = document.createRange();
    piece.selectNodeContents(block);
    if (edge === "before") {
        if (block.contains(range.startContainer)) piece.setEnd(range.startContainer, range.startOffset);
        else piece.collapse(true);
    } else if (block.contains(range.endContainer)) piece.setStart(range.endContainer, range.endOffset);
    else piece.collapse(false);
    return piece.cloneContents();
}

function pieceKept(fragment: DocumentFragment): boolean {
    if ((fragment.textContent ?? "").length > 0) return true;
    return [...fragment.childNodes].some((node) => node instanceof HTMLElement && node.tagName !== "BR");
}

function directListItem(list: HTMLElement, node: Node): HTMLElement | null {
    const host = node instanceof Element ? node : node.parentElement;
    const item = host?.closest("li");
    if (!(item instanceof HTMLElement) || !list.contains(item)) return null;
    return listItems(list).find((entry) => entry === item || entry.contains(item)) ?? null;
}

function shapeListAroundPicture(list: HTMLElement, range: Range, role: "start" | "end") {
    const numbers = orderedListNumbers(list);
    const items = listItems(list);
    if (role === "start") {
        const item = directListItem(list, range.startContainer);
        const index = item ? items.indexOf(item) : -1;
        if (!item || index < 0) {
            list.remove();
            return;
        }
        const prefix = sidePiece(item, range, "before");
        if (pieceKept(prefix)) item.replaceChildren(prefix);
        else item.remove();
        for (const later of items.slice(index + 1)) later.remove();
    } else {
        const item = directListItem(list, range.endContainer);
        const index = item ? items.indexOf(item) : items.length;
        for (const earlier of items.slice(0, index)) earlier.remove();
        if (item) {
            const suffix = sidePiece(item, range, "after");
            if (pieceKept(suffix)) item.replaceChildren(suffix);
            else item.remove();
        }
    }
    if (!listItems(list).length) list.remove();
    else if (numbers) restoreOrderedNumbers(numbers);
}

function placeBlockInsideListItem(editor: HTMLElement, range: Range, kind: "divider" | "code", list: HTMLElement): boolean {
    const startItem = directListItem(list, range.startContainer);
    const endItem = directListItem(list, range.endContainer);
    if (!startItem || !endItem) return false;
    const boundaryHost = (node: Node) => node instanceof Element ? node : node.parentElement;
    if (boundaryHost(range.startContainer)?.closest("figure") || boundaryHost(range.endContainer)?.closest("figure")) return false;
    const items = listItems(list);
    const startIndex = items.indexOf(startItem);
    const endIndex = items.indexOf(endItem);
    if (startIndex < 0 || endIndex < startIndex) return false;
    const covered = items.slice(startIndex, endIndex + 1);
    const figures = covered.flatMap((item) => [...item.querySelectorAll("figure")]).filter((figure): figure is HTMLElement => {
        try {
            return range.intersectsNode(figure);
        } catch {
            return false;
        }
    });
    const span = pictureItemSpan({ sameItem: startItem === endItem, hasPicture: figures.length > 0 });
    if (span === "skip") return false;
    const numbers = orderedListNumbers(list);
    const following = items.slice(endIndex + 1);
    const itemNumber = numbers?.get(startItem) ?? startIndex + 1;
    const prefix = sidePiece(startItem, range, "before");
    const suffix = sidePiece(endItem, range, "after");
    for (const figure of figures) figure.remove();
    let keptPrefix = false;
    if (pieceKept(prefix)) {
        startItem.replaceChildren(prefix);
        trimPictureEdge(startItem, "end");
        if (blockIsEmpty(startItem)) startItem.remove();
        else keptPrefix = true;
    } else startItem.remove();
    for (const item of items.slice(startIndex + 1, endIndex)) item.remove();
    const suffixItem = span === "across" ? endItem : document.createElement("li");
    let keptSuffix = false;
    if (pieceKept(suffix)) {
        suffixItem.replaceChildren(suffix);
        trimPictureEdge(suffixItem, "start");
        if (blockIsEmpty(suffixItem)) suffixItem.remove();
        else keptSuffix = true;
    } else suffixItem.remove();
    const afterItems = [...(keptSuffix ? [suffixItem] : []), ...following];
    const afterList = afterItems.length ? document.createElement(list.tagName.toLowerCase()) : null;
    if (afterList) for (const item of afterItems) afterList.append(item);
    let anchor: ChildNode | null = list.isConnected && listItems(list).length ? list : list.previousSibling;
    if (!listItems(list).length) list.remove();
    const built = listBlockNodes(kind);
    const placed: HTMLElement[] = [...built.nodes, ...figures];
    if (afterList) placed.push(afterList);
    const insert = (node: HTMLElement) => {
        if (anchor?.parentNode) anchor.after(node);
        else editor.insertBefore(node, editor.firstChild);
        anchor = node;
    };
    for (const node of placed) insert(node);
    if (numbers && afterList) {
        const followingNumbers = following.map((item) => numbers.get(item) ?? itemNumber);
        const bumped = new Map<HTMLElement, number>();
        if (span === "across") {
            if (keptSuffix) {
                const endNumber = numbers.get(endItem);
                if (endNumber !== undefined) bumped.set(endItem, endNumber);
            }
            following.forEach((item) => {
                const number = numbers.get(item);
                if (number !== undefined) bumped.set(item, number);
            });
        } else if (keptPrefix && keptSuffix) {
            const assigned = listBlockNumbers({ item: itemNumber, following: followingNumbers, split: true });
            afterItems.forEach((item, position) => bumped.set(item, assigned[position] ?? itemNumber + 1 + position));
        } else if (keptSuffix) {
            bumped.set(suffixItem, itemNumber);
            following.forEach((item, position) => bumped.set(item, followingNumbers[position] ?? itemNumber));
        } else following.forEach((item, position) => bumped.set(item, followingNumbers[position] ?? itemNumber));
        restoreOrderedNumbers(bumped);
    }
    if (kind === "code") {
        finishListBlock(editor, kind, built.code, built.caret);
        return true;
    }
    built.caret.remove();
    if (afterList) {
        const first = listItems(afterList)[0];
        if (first) placeCaretAtStart(first);
        return true;
    }
    const paragraph = document.createElement("p");
    paragraph.appendChild(document.createElement("br"));
    const lastFigure = figures[figures.length - 1];
    if (lastFigure?.isConnected) lastFigure.after(paragraph);
    else editor.append(paragraph);
    placeCaretAtStart(paragraph);
    return true;
}

function placeBlockAroundPicture(editor: HTMLElement, range: Range, kind: "divider" | "code"): boolean {
    if (range.collapsed) return false;
    const children = [...editor.childNodes].filter((node): node is HTMLElement => node instanceof HTMLElement);
    const top = (node: Node) => {
        const host = node instanceof Element ? node : node.parentElement;
        if (!(host instanceof HTMLElement) || !editor.contains(host)) return null;
        let block: HTMLElement = host;
        while (block.parentElement && block.parentElement !== editor) block = block.parentElement;
        return block.parentElement === editor ? block : null;
    };
    const start = top(range.startContainer);
    const end = top(range.endContainer);
    if (!start || !end) return false;
    if (start === end) {
        return pictureBlockEnds({ start: start.tagName, end: end.tagName, hasPicture: true, sameBlock: true }) === "item"
            && placeBlockInsideListItem(editor, range, kind, start);
    }
    const startIndex = children.indexOf(start);
    const endIndex = children.indexOf(end);
    if (startIndex < 0 || endIndex <= startIndex) return false;
    const between = children.slice(startIndex, endIndex + 1);
    const figure = between.find((block) => block.tagName === "FIGURE");
    const ends = pictureBlockEnds({ start: start.tagName, end: end.tagName, hasPicture: Boolean(figure) });
    if (ends === "skip" || !figure) return false;
    if (between.some((block) => !block.matches("p, h1, h2, h3, ul, ol, figure"))) return false;
    if (start.matches("ul, ol")) shapeListAroundPicture(start, range, "start");
    else {
        const prefix = sidePiece(start, range, "before");
        if (pieceKept(prefix)) start.replaceChildren(prefix);
        else start.remove();
    }
    if (end.matches("ul, ol")) shapeListAroundPicture(end, range, "end");
    else {
        const suffix = sidePiece(end, range, "after");
        if (pieceKept(suffix)) end.replaceChildren(suffix);
        else end.remove();
    }
    for (const block of between.slice(1, -1)) {
        if (block.tagName !== "FIGURE") block.remove();
    }
    if (ends === "list") {
        if (start.isConnected) trimPictureEdge(start, "end");
        if (end.isConnected) trimPictureEdge(end, "start");
    }
    const built = listBlockNodes(kind);
    if (start.isConnected) {
        let point: HTMLElement = start;
        for (const node of built.nodes) {
            point.after(node);
            point = node;
        }
    } else {
        for (const node of built.nodes) figure.before(node);
    }
    if (kind === "code") {
        finishListBlock(editor, kind, built.code, built.caret);
        return true;
    }
    built.caret.remove();
    if (end.isConnected) {
        const caretTarget = end.matches("ul, ol") ? listItems(end)[0] ?? end : end;
        placeCaretAtStart(caretTarget);
        return true;
    }
    const lastFigure = [...between].reverse().find((block) => block.tagName === "FIGURE" && block.isConnected) ?? figure;
    const paragraph = document.createElement("p");
    paragraph.appendChild(document.createElement("br"));
    lastFigure.after(paragraph);
    placeCaretAtStart(paragraph);
    return true;
}

function nodesAroundListPicture(item: HTMLElement, tag: "p" | "li"): HTMLElement[] {
    const nodes: HTMLElement[] = [];
    let block: HTMLElement | null = null;
    const flush = () => {
        if (!block || blockIsEmpty(block)) {
            block = null;
            return;
        }
        nodes.push(block);
        block = null;
    };
    for (const child of [...item.childNodes]) {
        const separates = child instanceof HTMLElement && (
            child.tagName === "FIGURE" || (tag === "p" && (child.tagName === "UL" || child.tagName === "OL"))
        );
        if (separates) {
            flush();
            child.remove();
            nodes.push(child);
            continue;
        }
        if (!block) block = document.createElement(tag);
        block.appendChild(child);
    }
    flush();
    return nodes;
}

function changeListAroundPicture(editor: HTMLElement, range: Range, command: "insertUnorderedList" | "insertOrderedList"): boolean {
    const startHost = range.startContainer instanceof Element ? range.startContainer : range.startContainer.parentElement;
    const endHost = range.endContainer instanceof Element ? range.endContainer : range.endContainer.parentElement;
    const startItem = startHost?.closest("li");
    const endItem = endHost?.closest("li");
    if (!(startItem instanceof HTMLElement) || !(endItem instanceof HTMLElement)) return false;
    const list = startItem.parentElement;
    if (!(list instanceof HTMLUListElement || list instanceof HTMLOListElement) || list !== endItem.parentElement) return false;
    const items = listItems(list);
    const startIndex = items.indexOf(startItem);
    const endIndex = items.indexOf(endItem);
    if (startIndex < 0 || endIndex < startIndex) return false;
    const covered = items.slice(startIndex, endIndex + 1);
    const hasPicture = covered.some((item) => [...item.children].some((child) => {
        if (child.tagName !== "FIGURE") return false;
        try {
            return range.intersectsNode(child);
        } catch {
            return false;
        }
    }));
    const sameKind = (command === "insertUnorderedList" && list.tagName === "UL") || (command === "insertOrderedList" && list.tagName === "OL");
    const change = pictureListChange({ inList: true, hasPicture, sameKind });
    if (change === "skip") return false;
    const numbers = orderedListNumbers(list);
    const following = items.slice(endIndex + 1);
    const tag = change === "leave" ? "p" : "li";
    const produced: HTMLElement[] = [];
    for (const item of covered) {
        produced.push(...nodesAroundListPicture(item, tag));
        item.remove();
    }
    const afterList = following.length ? document.createElement(list.tagName.toLowerCase()) : null;
    if (afterList) for (const item of following) afterList.append(item);
    const sequence: HTMLElement[] = [];
    let bucket: HTMLElement | null = null;
    const flush = () => {
        if (!bucket) return;
        sequence.push(bucket);
        bucket = null;
    };
    for (const node of produced) {
        if (node.tagName !== "LI") {
            flush();
            sequence.push(node);
            continue;
        }
        if (!bucket) bucket = document.createElement(command === "insertOrderedList" ? "ol" : "ul");
        bucket.append(node);
    }
    flush();
    if (afterList) sequence.push(afterList);
    let anchor: ChildNode | null = list.isConnected && listItems(list).length ? list : list.previousSibling;
    if (!listItems(list).length) list.remove();
    for (const node of sequence) {
        if (anchor?.parentNode) anchor.after(node);
        else editor.insertBefore(node, editor.firstChild);
        anchor = node;
    }
    if (numbers && afterList instanceof HTMLOListElement) {
        const bumped = new Map<HTMLElement, number>();
        for (const item of following) {
            const number = numbers.get(item);
            if (number !== undefined) bumped.set(item, number);
        }
        restoreOrderedNumbers(bumped);
    }
    const home = sequence.find((node) => node.matches("p, ul, ol"));
    const caret = home?.matches("p") ? home : home?.querySelector("li");
    if (caret instanceof HTMLElement) placeCaretAtStart(caret);
    return true;
}

function linesFromQuote(quote: HTMLElement, range: Range): HTMLElement[] {
    const children = [...quote.children].filter((child): child is HTMLElement => child instanceof HTMLElement);
    const touched = children.filter((child) => {
        try {
            return range.intersectsNode(child);
        } catch {
            return false;
        }
    });
    if (!touched.length) return nodesAroundListPicture(quote, "li");
    const nodes: HTMLElement[] = [];
    const first = children.indexOf(touched[0]);
    const last = children.indexOf(touched[touched.length - 1]);
    const keep = (group: HTMLElement[]) => {
        if (!group.length) return;
        const stay = document.createElement("blockquote");
        for (const child of group) stay.append(child);
        nodes.push(stay);
    };
    keep(children.slice(0, first));
    for (const child of touched) {
        if (listReachBlock(child.tagName) === "line" && child.tagName !== "BLOCKQUOTE") nodes.push(...nodesAroundListPicture(child, "li"));
        else nodes.push(child);
        child.remove();
    }
    keep(children.slice(last + 1));
    return nodes;
}

function reachListAroundPicture(editor: HTMLElement, range: Range, command: "insertUnorderedList" | "insertOrderedList"): boolean {
    const blocks = touchedQuoteBlocks(editor, range);
    if (blocks.length < 2 || !blocksAreConsecutive(editor, blocks)) return false;
    const startHost = range.startContainer instanceof Element ? range.startContainer : range.startContainer.parentElement;
    const endHost = range.endContainer instanceof Element ? range.endContainer : range.endContainer.parentElement;
    const startItem = startHost?.closest("li");
    const endItem = endHost?.closest("li");
    if (
        startItem instanceof HTMLElement
        && endItem instanceof HTMLElement
        && startItem.parentElement === endItem.parentElement
        && (startItem.parentElement instanceof HTMLUListElement || startItem.parentElement instanceof HTMLOListElement)
    ) return false;
    const outsideList = blocks.some((block) => listReachBlock(block.tagName) === "line");
    const inList = blocks.some((block) => listReachBlock(block.tagName) === "list");
    const inCode = blocks.some((block) => block.tagName === "PRE");
    const inTable = blocks.some((block) => block.tagName === "TABLE");
    const hasPicture = blocks.some((block) => {
        const figures = block.tagName === "FIGURE" ? [block] : [...block.querySelectorAll("figure")];
        return figures.some((figure) => {
            try {
                return range.intersectsNode(figure);
            } catch {
                return false;
            }
        });
    });
    const beside = pictureCodeList({ inList, inCode, hasPicture }) === "beside"
        || pictureTableList({ inList, inTable, hasPicture }) === "beside";
    if (pictureListReach({ inList, outsideList, hasPicture }) !== "lines" && !beside) return false;
    const anchor = blocks[0].previousSibling;
    const produced: HTMLElement[] = [];
    const keptNumbers: { list: HTMLOListElement; items: HTMLElement[]; numbers: Map<HTMLElement, number> }[] = [];
    for (const block of blocks) {
        if (block.matches("ul, ol")) {
            const items = listItems(block);
            const touched = items.filter((item) => {
                try {
                    return range.intersectsNode(item);
                } catch {
                    return false;
                }
            });
            if (!touched.length) continue;
            const first = items.indexOf(touched[0]);
            const last = items.indexOf(touched[touched.length - 1]);
            const before = items.slice(0, first);
            const after = items.slice(last + 1);
            const numbers = orderedListNumbers(block);
            if (before.length) {
                const stay = document.createElement(block.tagName.toLowerCase());
                for (const item of before) stay.append(item);
                produced.push(stay);
                if (numbers && stay instanceof HTMLOListElement) keptNumbers.push({ list: stay, items: before, numbers });
            }
            const sameKind = (command === "insertUnorderedList" && block.tagName === "UL")
                || (command === "insertOrderedList" && block.tagName === "OL");
            const itemTag = beside && !outsideList && sameKind ? "p" : "li";
            for (const item of touched) {
                produced.push(...nodesAroundListPicture(item, itemTag));
                item.remove();
            }
            if (after.length) {
                const afterList = document.createElement(block.tagName.toLowerCase());
                for (const item of after) afterList.append(item);
                produced.push(afterList);
                if (numbers && afterList instanceof HTMLOListElement) keptNumbers.push({ list: afterList, items: after, numbers });
            }
            if (!listItems(block).length) block.remove();
            continue;
        }
        if (listReachBlock(block.tagName) === "line") {
            if (block.tagName === "BLOCKQUOTE") {
                produced.push(...linesFromQuote(block, range));
                continue;
            }
            produced.push(...nodesAroundListPicture(block, "li"));
            block.remove();
            continue;
        }
        produced.push(block);
    }
    const sequence: HTMLElement[] = [];
    let bucket: HTMLElement | null = null;
    const flush = () => {
        if (!bucket) return;
        sequence.push(bucket);
        bucket = null;
    };
    for (const node of produced) {
        if (node.tagName !== "LI") {
            flush();
            sequence.push(node);
            continue;
        }
        if (!bucket) bucket = document.createElement(command === "insertOrderedList" ? "ol" : "ul");
        bucket.append(node);
    }
    flush();
    let point: ChildNode | null = anchor;
    for (const node of sequence) {
        if (point?.parentNode) point.after(node);
        else editor.insertBefore(node, editor.firstChild);
        point = node;
    }
    for (const block of blocks) {
        if (block.isConnected && !sequence.includes(block)) block.remove();
    }
    for (const kept of keptNumbers) {
        const bumped = new Map<HTMLElement, number>();
        for (const item of kept.items) {
            const number = kept.numbers.get(item);
            if (number !== undefined) bumped.set(item, number);
        }
        restoreOrderedNumbers(bumped);
    }
    const home = sequence.find((node) => node.matches("p, ul, ol"));
    const caret = home?.matches("p") ? home : home?.querySelector("li");
    if (caret instanceof HTMLElement) placeCaretAtStart(caret);
    return sequence.length > 0;
}

function listWritingAroundPicture(editor: HTMLElement, range: Range, ordered: boolean): boolean {
    const blocks = touchedQuoteBlocks(editor, range);
    if (blocks.length < 2 || !blocksAreConsecutive(editor, blocks)) return false;
    if (!blocks.some((block) => block.tagName === "FIGURE")) return false;
    if (!blocks.some((block) => block.matches("p, h1, h2, h3"))) return false;
    let number = 1;
    let index = 0;
    let firstList: HTMLElement | null = null;
    while (index < blocks.length) {
        if (!blocks[index].matches("p, h1, h2, h3")) {
            index += 1;
            continue;
        }
        const group: HTMLElement[] = [];
        while (index < blocks.length && blocks[index].matches("p, h1, h2, h3")) {
            group.push(blocks[index]);
            index += 1;
        }
        const list = document.createElement(ordered ? "ol" : "ul");
        if (!firstList) firstList = list;
        if (ordered && number !== 1) list.setAttribute("start", String(number));
        for (const block of group) {
            const item = document.createElement("li");
            while (block.firstChild) item.appendChild(block.firstChild);
            if (blockIsEmpty(item)) item.appendChild(document.createElement("br"));
            list.appendChild(item);
            number += 1;
        }
        group[0].before(list);
        for (const block of group) block.remove();
    }
    const first = firstList?.querySelector("li");
    if (first instanceof HTMLElement) placeCaretAtStart(first);
    return true;
}

function turnTouchedBlocksIntoHeadings(editor: HTMLElement, range: Range, tag: "h1" | "h2" | "h3"): HTMLElement | null {
    const blocks = touchedQuoteBlocks(editor, range);
    if (blocks.length < 2 || !blocksAreConsecutive(editor, blocks) || !blocks.some((block) => block.matches("ul, ol, p, h1, h2, h3") || quoteBreakBlock(block.tagName))) return null;
    let first: HTMLElement | null = null;
    for (const block of blocks) {
        if (block.matches("ul, ol")) {
            const items = listItems(block).filter((item) => {
                try {
                    return range.intersectsNode(item);
                } catch {
                    return false;
                }
            });
            const heading = turnListItemsIntoHeadings(items, tag);
            if (heading && !first) first = heading;
            continue;
        }
        if (!block.matches("p, h1, h2, h3")) continue;
        const heading = document.createElement(tag);
        while (block.firstChild) heading.appendChild(block.firstChild);
        if (blockIsEmpty(heading)) heading.appendChild(document.createElement("br"));
        block.replaceWith(heading);
        if (!first) first = heading;
    }
    if (first) placeCaretAtStart(first);
    return first;
}

function itemCaretEdge(item: HTMLElement, range: Range): { atStart: boolean; atEnd: boolean } {
    const before = document.createRange();
    before.selectNodeContents(item);
    before.setEnd(range.startContainer, range.startOffset);
    const after = document.createRange();
    after.selectNodeContents(item);
    after.setStart(range.endContainer, range.endOffset);
    const plain = (fragment: DocumentFragment) => (fragment.textContent ?? "").replace(/[\u200b\u00a0]/g, "").trim() === "" && !fragment.querySelector("ul, ol, img, hr, pre");
    return { atStart: plain(before.cloneContents()), atEnd: plain(after.cloneContents()) };
}

function onlyNestedLists(fragment: DocumentFragment): HTMLElement[] | null {
    const lists: HTMLElement[] = [];
    for (const node of [...fragment.childNodes]) {
        if (node instanceof Text && node.data.replace(/[\u200b\u00a0]/g, "").trim() === "") continue;
        if (node instanceof HTMLElement && (node.tagName === "UL" || node.tagName === "OL")) {
            lists.push(node);
            continue;
        }
        return null;
    }
    return lists;
}

function splitListAtCaret(item: HTMLElement, range: Range): { before: HTMLElement | null; after: HTMLElement | null; path: number[] } | null {
    const list = item.parentElement;
    if (!(list instanceof HTMLUListElement || list instanceof HTMLOListElement)) return null;
    const editor = item.closest("#de-editor");
    if (!(editor instanceof HTMLElement)) return null;
    if (!range.collapsed) {
        const endHost = range.endContainer instanceof Element ? range.endContainer : range.endContainer.parentElement;
        if (endHost?.closest("li") !== item) return null;
        range.deleteContents();
    }
    const path = childPath(editor, item);
    const numbers = leavingOrderedNumbers(item, null);
    const items = listItems(list);
    const index = items.indexOf(item);
    if (index < 0) return null;
    const following = items.slice(index + 1);
    const itemNumber = numbers?.get(item) ?? index + 1;
    const edge = itemCaretEdge(item, range);
    const lifted: HTMLElement[] = [];
    let afterItems: HTMLElement[] = [];
    let split = false;
    if (edge.atStart) afterItems = [item, ...following];
    else if (edge.atEnd) afterItems = [...following];
    else {
        const tail = document.createRange();
        tail.selectNodeContents(item);
        tail.setStart(range.startContainer, range.startOffset);
        const fragment = tail.extractContents();
        const lists = onlyNestedLists(fragment);
        if (lists) {
            lifted.push(...lists);
            afterItems = [...following];
        } else {
            const fresh = document.createElement("li");
            fresh.append(fragment);
            if (blockIsEmpty(fresh)) fresh.appendChild(document.createElement("br"));
            afterItems = [fresh, ...following];
            split = true;
        }
    }
    if (blockIsEmpty(item)) item.appendChild(document.createElement("br"));
    const afterList = afterItems.length ? document.createElement(list.tagName.toLowerCase()) : null;
    let point: HTMLElement = list;
    for (const nested of lifted) {
        point.after(nested);
        point = nested;
    }
    if (afterList) {
        for (const node of afterItems) afterList.append(node);
        point.after(afterList);
    }
    const kept = listItems(list);
    const previous = list.previousElementSibling;
    if (!kept.length) list.remove();
    if (numbers) {
        const assigned = listBlockNumbers({
            item: itemNumber,
            following: following.map((node) => numbers.get(node) ?? itemNumber),
            split,
        });
        const bumped = new Map<HTMLElement, number>();
        if (split) afterItems.forEach((node, position) => bumped.set(node, assigned[position] ?? itemNumber + position));
        else if (edge.atStart) {
            bumped.set(item, itemNumber);
            following.forEach((node, position) => bumped.set(node, assigned[position] ?? itemNumber));
        } else following.forEach((node, position) => bumped.set(node, assigned[position] ?? itemNumber));
        restoreOrderedNumbers(numbers);
        if (bumped.size) restoreOrderedNumbers(bumped);
    }
    const before = kept.length ? list : previous instanceof HTMLElement ? previous : null;
    return { before, after: lifted[0] ?? afterList, path };
}

function trimListBlockEdges(slot: { before: HTMLElement | null; after: HTMLElement | null }) {
    if (slot.before instanceof HTMLElement) trimPictureEdge(slot.before, "end");
    if (slot.after instanceof HTMLElement) trimPictureEdge(slot.after, "start");
}

function listBlockNodes(kind: "divider" | "code"): { nodes: HTMLElement[]; code: HTMLElement | null; caret: HTMLElement } {
    const paragraph = document.createElement("p");
    paragraph.appendChild(document.createElement("br"));
    if (kind === "divider") {
        const rule = document.createElement("hr");
        return { nodes: [rule, paragraph], code: null, caret: paragraph };
    }
    const code = document.createElement("code");
    code.setAttribute("data-fresh", "true");
    code.appendChild(document.createElement("br"));
    const pre = document.createElement("pre");
    pre.append(code);
    return { nodes: [pre, paragraph], code, caret: paragraph };
}

function finishListBlock(editor: HTMLElement, kind: "divider" | "code", code: HTMLElement | null, caret: HTMLElement) {
    if (kind === "divider") {
        placeCaretAtStart(caret);
        settleDivider(editor);
        return;
    }
    settleCode(editor);
    code?.removeAttribute("data-fresh");
    if (!code) return;
    const range = document.createRange();
    range.selectNodeContents(code);
    const nextSelection = window.getSelection();
    nextSelection?.removeAllRanges();
    nextSelection?.addRange(range);
}

function placeListBlock(nodes: HTMLElement[], slot: { before: HTMLElement | null; after: HTMLElement | null }) {
    if (slot.after) {
        for (const node of nodes) slot.after.before(node);
        return;
    }
    let point = slot.before;
    if (!point) return;
    for (const node of nodes) {
        point.after(node);
        point = node;
    }
}

function anchoredPicture(range: Range, editor: HTMLElement): HTMLElement | null {
    const fromNode = (node: Node | null) => {
        const element = node instanceof Element ? node : node?.parentElement ?? null;
        if (!(element instanceof HTMLElement) || !editor.contains(element)) return null;
        if (element.tagName === "IMG") return element;
        const figure = element.closest("figure");
        return figure instanceof HTMLElement && editor.contains(figure) ? figure : null;
    };
    const inside = fromNode(range.startContainer);
    if (inside) return inside;
    if (range.startContainer instanceof Element) {
        const selected = fromNode(range.startContainer.childNodes[range.startOffset] ?? null);
        if (selected) return selected;
    }
    return null;
}

function buildPicture(src: string, name: string): HTMLElement {
    const alt = imageAltText(name);
    if (!alt) {
        const image = document.createElement("img");
        image.src = src;
        return image;
    }
    const figure = document.createElement("figure");
    const image = document.createElement("img");
    image.src = src;
    image.alt = alt;
    const caption = document.createElement("figcaption");
    caption.textContent = alt;
    figure.append(image, caption);
    return figure;
}

function placeCaretInPicture(picture: HTMLElement) {
    const caption = picture.querySelector("figcaption");
    const range = document.createRange();
    if (caption instanceof HTMLElement) {
        range.selectNodeContents(caption);
        range.collapse(false);
    } else {
        range.selectNode(picture);
    }
    const selection = window.getSelection();
    selection?.removeAllRanges();
    selection?.addRange(range);
}

function openPictureOnDate(editor: HTMLElement, range: Range, src: string, name: string): { before: string; path: number[] } | null {
    const span = dateSelectionSpan(editor, window.getSelection());
    const action = datePicture({ onDate: span });
    if (action === "pass") return null;
    const heading = editor.firstElementChild;
    if (!(heading instanceof HTMLElement) || !editor.contains(heading)) return null;
    const before = editor.innerHTML;
    if (action === "replace") {
        const clipped = range.cloneRange();
        if (!pointAfterDate(heading, range.startContainer, range.startOffset)) clipped.setStartAfter(heading);
        clipped.deleteContents();
    }
    const picture = buildPicture(src, name);
    const next = heading.nextSibling;
    if (next) next.before(picture);
    else heading.after(picture);
    placeCaretInPicture(picture);
    return { before, path: childPath(editor, heading) };
}

function placePictureInLine(block: HTMLParagraphElement, range: Range, picture: HTMLElement) {
    if (!range.collapsed && block.contains(range.startContainer) && block.contains(range.endContainer)) range.deleteContents();
    if (blockIsEmpty(block) || !block.contains(range.startContainer)) {
        block.replaceWith(picture);
        return;
    }
    const before = range.cloneRange();
    before.selectNodeContents(block);
    before.setEnd(range.startContainer, range.startOffset);
    const after = range.cloneRange();
    after.selectNodeContents(block);
    after.setStart(range.endContainer, range.endOffset);
    const blank = (value: string) => value.replace(/[\u200b\u00a0]/g, "").trim() === "";
    if (blank(after.toString())) {
        block.after(picture);
        return;
    }
    if (blank(before.toString())) {
        block.before(picture);
        return;
    }
    const next = document.createElement("p");
    next.append(after.extractContents());
    trimPictureEdge(block, "end");
    trimPictureEdge(next, "start");
    if (blockIsEmpty(block)) block.appendChild(document.createElement("br"));
    if (blockIsEmpty(next)) next.appendChild(document.createElement("br"));
    block.after(picture);
    picture.after(next);
}

function trimPictureEdge(block: HTMLElement, edge: "start" | "end") {
    const texts: Text[] = [];
    const walker = document.createTreeWalker(block, NodeFilter.SHOW_TEXT);
    let current = walker.nextNode();
    while (current) {
        if (current instanceof Text) texts.push(current);
        current = walker.nextNode();
    }
    const node = edge === "start" ? texts[0] : texts[texts.length - 1];
    if (!node) return;
    const space = /^[\s\u00a0]/.test(node.data);
    const endSpace = /[\s\u00a0]$/.test(node.data);
    if (edge === "start" ? !space : !endSpace) return;
    node.data = listLineSpace(node.data, edge);
    if (!node.data) node.remove();
}

function placePictureInCode(block: HTMLElement, range: Range, picture: HTMLElement) {
    if (!range.collapsed && block.contains(range.startContainer) && block.contains(range.endContainer)) range.deleteContents();
    if (blockIsEmpty(block) || !block.contains(range.startContainer)) {
        block.replaceWith(picture);
        return;
    }
    const before = range.cloneRange();
    before.selectNodeContents(block);
    before.setEnd(range.startContainer, range.startOffset);
    const after = range.cloneRange();
    after.selectNodeContents(block);
    after.setStart(range.endContainer, range.endOffset);
    const blank = (value: string) => value.replace(/[\u200b\u00a0]/g, "").trim() === "";
    if (blank(after.toString())) {
        block.after(picture);
        return;
    }
    if (blank(before.toString())) {
        block.before(picture);
        return;
    }
    const next = document.createElement("pre");
    next.append(after.extractContents());
    trimPictureEdge(block, "end");
    trimPictureEdge(next, "start");
    fillEmptyCode(block);
    fillEmptyCode(next);
    block.after(picture);
    picture.after(next);
}

function fillEmptyCode(block: HTMLElement) {
    if (!blockIsEmpty(block)) return;
    let code = block.querySelector("code");
    if (!(code instanceof HTMLElement)) {
        code = document.createElement("code");
        block.append(code);
    }
    if (!code.querySelector("br")) code.appendChild(document.createElement("br"));
}

function pictureCode(editor: HTMLElement, range: Range): HTMLElement | null {
    const host = range.startContainer instanceof Element ? range.startContainer : range.startContainer.parentElement;
    const block = host?.closest("pre");
    if (!(block instanceof HTMLElement) || !editor.contains(block)) return null;
    if (!range.collapsed) {
        const endHost = range.endContainer instanceof Element ? range.endContainer : range.endContainer.parentElement;
        if (endHost?.closest("pre") !== block) return null;
    }
    return block;
}

function listItemAt(node: Node): HTMLElement | null {
    const host = node instanceof Element ? node : node.parentElement;
    const item = host?.closest("li") ?? null;
    return item instanceof HTMLElement ? item : null;
}

function listItemFrom(node: Node, offset: number, edge: "start" | "end"): HTMLElement | null {
    const direct = listItemAt(node);
    if (direct) return direct;
    if (!(node instanceof HTMLUListElement || node instanceof HTMLOListElement)) return null;
    const child = node.childNodes[edge === "end" ? offset - 1 : offset];
    return child instanceof HTMLLIElement ? child : null;
}

function pictureItemEnds(editor: HTMLElement, range: Range): { start: HTMLElement; end: HTMLElement } | null {
    if (range.collapsed) return null;
    const start = listItemFrom(range.startContainer, range.startOffset, "start");
    const end = listItemFrom(range.endContainer, range.endOffset, "end");
    if (!start || !end || start === end || !editor.contains(start) || !editor.contains(end)) return null;
    if (start.contains(end) || end.contains(start)) return null;
    const startList = start.parentElement;
    const endList = end.parentElement;
    if (!(startList instanceof HTMLUListElement || startList instanceof HTMLOListElement)) return null;
    if (!(endList instanceof HTMLUListElement || endList instanceof HTMLOListElement)) return null;
    return { start, end };
}

function pictureItems(editor: HTMLElement, range: Range): HTMLElement | null {
    const ends = pictureItemEnds(editor, range);
    if (!ends || ends.start.parentElement !== ends.end.parentElement) return null;
    return ends.start;
}

function pictureAcrossLists(editor: HTMLElement, range: Range): HTMLElement | null {
    const ends = pictureItemEnds(editor, range);
    if (!ends || ends.start.parentElement === ends.end.parentElement) return null;
    let node = ends.start.parentElement;
    while (node && node !== editor) {
        if ((node instanceof HTMLUListElement || node instanceof HTMLOListElement) && node.contains(ends.end)) return ends.start;
        node = node.parentElement;
    }
    return null;
}

function pictureSeparateLists(editor: HTMLElement, range: Range): HTMLElement | null {
    const ends = pictureItemEnds(editor, range);
    if (!ends || ends.start.parentElement === ends.end.parentElement || pictureAcrossLists(editor, range)) return null;
    return ends.start;
}

function pictureIntoNested(editor: HTMLElement, range: Range): HTMLElement | null {
    if (range.collapsed) return null;
    const start = listItemFrom(range.startContainer, range.startOffset, "start");
    const end = listItemFrom(range.endContainer, range.endOffset, "end");
    if (!start || !end || start === end || !editor.contains(start) || !editor.contains(end)) return null;
    if (start.contains(end)) return start;
    if (end.contains(start)) return end;
    return null;
}

function placePictureIntoNested(range: Range, nodes: HTMLElement[]) {
    const first = nodes[0];
    const last = nodes[nodes.length - 1];
    if (!first || !last) return;
    const start = listItemFrom(range.startContainer, range.startOffset, "start");
    const end = listItemFrom(range.endContainer, range.endOffset, "end");
    const outer = start && end && start.contains(end) ? start : end && start && end.contains(start) ? end : null;
    const inner = outer && start && end ? (outer === start ? end : start) : null;
    const list = outer?.parentElement ?? null;
    if (!(outer instanceof HTMLElement) || !(list instanceof HTMLUListElement || list instanceof HTMLOListElement)) return;
    const atStart = itemCaretEdge(outer, range).atStart;
    const numbers = orderedListNumbers(list);
    const nestedNumbers = inner?.parentElement && inner.parentElement !== list ? orderedListNumbers(inner.parentElement) : null;
    range.deleteContents();
    const fragment = document.createDocumentFragment();
    for (const node of nodes) fragment.append(node);
    if (atStart) outer.prepend(fragment);
    else if (range.startContainer === outer || outer.contains(range.startContainer)) range.insertNode(fragment);
    else outer.append(fragment);
    const lifted: Node[] = [];
    let sibling = last.nextSibling;
    while (sibling) {
        const next = sibling.nextSibling;
        lifted.push(sibling);
        sibling.remove();
        sibling = next;
    }
    const afterList = document.createElement(list.tagName.toLowerCase());
    sibling = outer.nextSibling;
    while (sibling) {
        const next = sibling.nextSibling;
        afterList.append(sibling);
        sibling = next;
    }
    for (const node of nodes) node.remove();
    if (outer.isConnected) trimPictureEdge(outer, "end");
    clearPictureItem(outer);
    let point: HTMLElement = first;
    if (list.isConnected && listItems(list).length) list.after(first);
    else if (list.isConnected) list.replaceWith(first);
    else return;
    for (const node of nodes.slice(1)) {
        point.after(node);
        point = node;
    }
    for (const node of lifted) {
        if (node instanceof HTMLUListElement || node instanceof HTMLOListElement) {
            const first = listItems(node)[0] ?? null;
            if (first) trimPictureEdge(first, "start");
            for (const item of [...listItems(node)]) clearPictureItem(item);
            if (!listItems(node).length) continue;
            point.after(node);
            point = node;
            continue;
        }
        if (node instanceof Text && node.data.replace(/[\s\u00a0]/g, "") === "") continue;
        if (node instanceof Text) {
            const paragraph = document.createElement("p");
            paragraph.append(node);
            point.after(paragraph);
            point = paragraph;
            continue;
        }
        if (!(node instanceof HTMLElement)) continue;
        point.after(node);
        point = node;
    }
    if (afterList.childNodes.length) point.after(afterList);
    if (!listItems(list).length) list.remove();
    if (numbers) restoreOrderedNumbers(numbers);
    if (nestedNumbers) restoreOrderedNumbers(nestedNumbers);
}

function orderedListNumbers(list: HTMLElement | null): Map<HTMLElement, number> | null {
    if (!(list instanceof HTMLOListElement)) return null;
    const items = listItems(list);
    const numbers = new Map<HTMLElement, number>();
    items.forEach((entry, index) => {
        numbers.set(entry, orderedItemNumber({
            start: list.getAttribute("start"),
            values: items.map((node) => node.getAttribute("value")),
            index,
        }));
    });
    return numbers;
}

function sharedPictureList(start: HTMLElement, end: HTMLElement | null): HTMLElement | null {
    let node = start.parentElement;
    while (node) {
        if ((node instanceof HTMLUListElement || node instanceof HTMLOListElement) && (!end || node.contains(end))) return node;
        node = node.parentElement;
    }
    return start.parentElement instanceof HTMLUListElement || start.parentElement instanceof HTMLOListElement ? start.parentElement : null;
}

function clearPictureItem(item: HTMLElement | null) {
    if (!item) return;
    for (const nested of [...item.children]) {
        if (!(nested instanceof HTMLUListElement || nested instanceof HTMLOListElement)) continue;
        for (const child of [...listItems(nested)]) clearPictureItem(child);
        if (!listItems(nested).length) nested.remove();
    }
    if (blockIsEmpty(item) && !directNestedLists(item).length) item.remove();
}

function placePictureBetweenItems(range: Range, nodes: HTMLElement[]) {
    const start = listItemAt(range.startContainer);
    const end = listItemAt(range.endContainer);
    const list = start ? sharedPictureList(start, end) : null;
    if (!(start instanceof HTMLElement) || !(list instanceof HTMLUListElement || list instanceof HTMLOListElement)) return;
    const numbers = orderedListNumbers(list);
    range.deleteContents();
    const splitList = range.startContainer instanceof HTMLUListElement || range.startContainer instanceof HTMLOListElement
        ? range.startContainer
        : list;
    const offset = range.startContainer === splitList ? range.startOffset : splitList.childNodes.length;
    const afterList = document.createElement(splitList.tagName.toLowerCase());
    for (const node of [...splitList.childNodes].slice(offset)) afterList.append(node);
    if (afterList.childNodes.length) splitList.after(afterList);
    if (afterList.parentElement) {
        for (const node of nodes) afterList.before(node);
    } else {
        for (const node of nodes) splitList.after(node);
    }
    const previous = listItems(splitList).at(-1) ?? null;
    const following = listItems(afterList)[0] ?? null;
    if (previous) trimPictureEdge(previous, "end");
    if (following) trimPictureEdge(following, "start");
    clearPictureItem(previous);
    clearPictureItem(following);
    if (!listItems(splitList).length) splitList.remove();
    if (!listItems(afterList).length) afterList.remove();
    if (numbers) restoreOrderedNumbers(numbers);
}

function pictureAcross(editor: HTMLElement, range: Range): HTMLElement | null {
    if (range.collapsed) return null;
    const top = (node: Node) => {
        const host = node instanceof Element ? node : node.parentElement;
        if (!(host instanceof HTMLElement) || !editor.contains(host)) return null;
        let block: HTMLElement = host;
        while (block.parentElement && block.parentElement !== editor) block = block.parentElement;
        return block === editor ? null : block;
    };
    const start = top(range.startContainer);
    const end = top(range.endContainer);
    return start && end && start !== end ? start : null;
}

function pictureBlock(editor: HTMLElement, node: Node): HTMLElement | null {
    const host = node instanceof Element ? node : node.parentElement;
    if (!(host instanceof HTMLElement) || !editor.contains(host)) return null;
    const figure = host.closest("figure");
    if (figure instanceof HTMLElement && editor.contains(figure)) return figure;
    if (host.tagName === "IMG") return host;
    const image = host.closest("img");
    return image instanceof HTMLElement && editor.contains(image) ? image : null;
}

function pictureLeaves(editor: HTMLElement, range: Range): boolean {
    if (range.collapsed) return false;
    const start = pictureBlock(editor, range.startContainer);
    const end = pictureBlock(editor, range.endContainer);
    if (start && !start.contains(range.endContainer)) return true;
    if (end && !end.contains(range.startContainer)) return true;
    return false;
}

function coverTouchedPictures(editor: HTMLElement, range: Range) {
    const start = pictureBlock(editor, range.startContainer);
    if (start && !start.contains(range.endContainer)) range.setStartBefore(start);
    const end = pictureBlock(editor, range.endContainer);
    if (end && !end.contains(range.startContainer)) range.setEndAfter(end);
}

function placePictureAcross(editor: HTMLElement, range: Range, nodes: HTMLElement[]) {
    const first = nodes[0];
    const last = nodes[nodes.length - 1];
    if (!first || !last) return;
    coverTouchedPictures(editor, range);
    range.deleteContents();
    const atEditor = range.startContainer === editor;
    const next = atEditor ? editor.childNodes[range.startOffset] ?? null : null;
    const insert = (before: ChildNode | null) => {
        if (before) for (const node of nodes) before.before(node);
        else for (const node of nodes) editor.append(node);
    };
    if (atEditor) insert(next);
    else {
        const host = range.startContainer instanceof Element ? range.startContainer : range.startContainer.parentElement;
        let block: HTMLElement | null = host instanceof HTMLElement ? host : null;
        while (block && block.parentElement && block.parentElement !== editor) block = block.parentElement;
        if (block && block.parentElement === editor) insert(block);
        else insert(null);
    }
    const previous = first.previousElementSibling;
    const following = last.nextElementSibling;
    if (previous instanceof HTMLElement) trimPictureEdge(previous, "end");
    if (following instanceof HTMLElement) trimPictureEdge(following, "start");
    if (previous instanceof HTMLElement && blockIsEmpty(previous)) previous.remove();
    if (following instanceof HTMLElement && blockIsEmpty(following)) following.remove();
    clearPictureListEdge(first.previousElementSibling, "end");
    clearPictureListEdge(last.nextElementSibling, "start");
}

function clearPictureListEdge(block: Element | null, edge: "start" | "end") {
    if (!(block instanceof HTMLUListElement || block instanceof HTMLOListElement)) return;
    const items = listItems(block);
    clearPictureItem(edge === "end" ? items.at(-1) ?? null : items[0] ?? null);
    if (!listItems(block).length) block.remove();
}

function pictureLine(editor: HTMLElement, range: Range): HTMLParagraphElement | null {
    const host = range.startContainer instanceof Element ? range.startContainer : range.startContainer.parentElement;
    const block = host?.closest("p");
    if (!(block instanceof HTMLParagraphElement) || !editor.contains(block)) return null;
    if (block.closest("li, pre, figure")) return null;
    if (!range.collapsed) {
        const endHost = range.endContainer instanceof Element ? range.endContainer : range.endContainer.parentElement;
        if (endHost?.closest("p") !== block) return null;
    }
    return block;
}

function openPicture(editor: HTMLElement, range: Range, src: string, name: string): { before: string; path: number[] } | null {
    const anchor = anchoredPicture(range, editor);
    const host = range.startContainer instanceof Element ? range.startContainer : range.startContainer.parentElement;
    const item = host?.closest("li");
    const inItem = item instanceof HTMLElement && editor.contains(item);
    const line = pictureLine(editor, range);
    const code = pictureCode(editor, range);
    const across = pictureAcross(editor, range);
    const items = pictureItems(editor, range);
    const lists = pictureAcrossLists(editor, range);
    const separate = pictureSeparateLists(editor, range);
    const nested = pictureIntoNested(editor, range);
    const leaves = pictureLeaves(editor, range);
    const action = pictureInsert({ inPicture: Boolean(anchor), inItem, inLine: Boolean(line), inCode: Boolean(code), across: Boolean(across), acrossItems: Boolean(items), acrossLists: Boolean(lists), separateLists: Boolean(separate), intoNested: Boolean(nested), leavesPicture: leaves });
    if (action === "pass") return null;
    const before = editor.innerHTML;
    const picture = buildPicture(src, name);
    if (action === "after" && anchor) {
        const path = childPath(editor, anchor);
        anchor.after(picture);
        placeCaretInPicture(picture);
        return { before, path };
    }
    if (action === "code" && code) {
        const path = childPath(editor, code);
        placePictureInCode(code, range, picture);
        placeCaretInPicture(picture);
        return { before, path };
    }
    if (action === "items" && (items || lists)) {
        const path = childPath(editor, items ?? lists!);
        placePictureBetweenItems(range, [picture]);
        placeCaretInPicture(picture);
        return { before, path };
    }
    if (action === "nested" && nested) {
        const path = childPath(editor, nested);
        placePictureIntoNested(range, [picture]);
        placeCaretInPicture(picture);
        return { before, path };
    }
    if (action === "span" && (across || separate)) {
        const path = childPath(editor, across ?? separate!);
        placePictureAcross(editor, range, [picture]);
        placeCaretInPicture(picture);
        return { before, path };
    }
    if (action === "split" && line) {
        const path = childPath(editor, line);
        placePictureInLine(line, range, picture);
        placeCaretInPicture(picture);
        return { before, path };
    }
    if (!(item instanceof HTMLElement) || !inItem) return null;
    const slot = splitListAtCaret(item, range);
    if (!slot) return null;
    placeListBlock([picture], slot);
    const previous = picture.previousElementSibling;
    const following = picture.nextElementSibling;
    if (previous instanceof HTMLElement) trimPictureEdge(previous, "end");
    if (following instanceof HTMLElement) trimPictureEdge(following, "start");
    placeCaretInPicture(picture);
    return { before, path: slot.path };
}

function outdentListItem(item: HTMLElement) {
    const list = item.parentElement;
    if (!(list instanceof HTMLUListElement || list instanceof HTMLOListElement)) return;
    const numbers = leavingOrderedNumbers(item, null);
    const lifted = detachNestedLists(item, "P");
    const paragraph = document.createElement("p");
    while (item.firstChild) paragraph.appendChild(item.firstChild);
    if (blockIsEmpty(paragraph)) paragraph.appendChild(document.createElement("br"));
    const following = [...list.children].some((child) => child !== item && child.tagName === "LI" && (item.compareDocumentPosition(child) & Node.DOCUMENT_POSITION_FOLLOWING) !== 0);
    item.remove();
    const remaining = [...list.children].some((child) => child.tagName === "LI");
    if (!remaining) list.replaceWith(paragraph);
    else if (following) list.before(paragraph);
    else list.after(paragraph);
    placeLiftedLists(paragraph, lifted);
    if (numbers) restoreOrderedNumbers(numbers);
    placeCaretAtStart(paragraph);
}

function indentListItem(item: HTMLElement) {
    const list = item.parentElement;
    if (!(list instanceof HTMLUListElement || list instanceof HTMLOListElement)) return;
    const items = listItems(list);
    const index = items.indexOf(item);
    if (index <= 0) return;
    const previous = items[index - 1];
    const last = previous.lastElementChild;
    const nested = last instanceof HTMLElement && last.tagName === list.tagName ? last : document.createElement(list.tagName.toLowerCase());
    if (nested.parentElement !== previous) previous.append(nested);
    item.removeAttribute("value");
    nested.append(item);
}

function outdentNestedItem(item: HTMLElement) {
    const list = item.parentElement;
    if (!(list instanceof HTMLUListElement || list instanceof HTMLOListElement)) return;
    const parentItem = list.parentElement;
    if (!(parentItem instanceof HTMLLIElement)) return;
    const parentList = parentItem.parentElement;
    if (!(parentList instanceof HTMLUListElement || parentList instanceof HTMLOListElement)) return;
    const following = listItems(list).filter((entry) => entry !== item && (item.compareDocumentPosition(entry) & Node.DOCUMENT_POSITION_FOLLOWING) !== 0);
    item.removeAttribute("value");
    parentItem.after(item);
    if (following.length) {
        const last = item.lastElementChild;
        const nested = last instanceof HTMLElement && last.tagName === list.tagName ? last : document.createElement(list.tagName.toLowerCase());
        if (nested.parentElement !== item) item.append(nested);
        for (const next of following) {
            next.removeAttribute("value");
            nested.append(next);
        }
    }
    if (!listItems(list).length) list.remove();
}

function joinNestedItem(item: HTMLElement) {
    const list = item.parentElement;
    const parent = list?.parentElement;
    if (!(list instanceof HTMLUListElement || list instanceof HTMLOListElement) || !(parent instanceof HTMLLIElement)) return;
    const following = listItems(list).find((entry) => entry !== item && (item.compareDocumentPosition(entry) & Node.DOCUMENT_POSITION_FOLLOWING) !== 0) ?? null;
    const holder = document.createElement("span");
    while (parent.firstChild && parent.firstChild !== list) holder.appendChild(parent.firstChild);
    parent.insertBefore(holder, parent.firstChild);
    for (const child of [...item.children]) {
        if (!(child instanceof HTMLElement) || (child.tagName !== "UL" && child.tagName !== "OL")) continue;
        if (child.tagName === list.tagName) {
            for (const nested of listItems(child)) {
                nested.removeAttribute("value");
                if (following) list.insertBefore(nested, following);
                else list.appendChild(nested);
            }
            child.remove();
        } else parent.insertBefore(child, list);
    }
    const inline = document.createElement("span");
    while (item.firstChild) inline.appendChild(item.firstChild);
    item.remove();
    if (!listItems(list).length) list.remove();
    const joinedStart = inline.firstChild;
    let pulled = false;
    if (codeNestedItem({ nested: true }) === "pull") {
        const ending = preAtEnd(holder);
        if (ending) {
            pullLastCodeLine(ending, textBeforeNode(ending));
            pulled = true;
        }
    }
    joinBlock(holder, inline);
    const caret = window.getSelection();
    const anchor = caret?.anchorNode ?? null;
    while (holder.firstChild) parent.insertBefore(holder.firstChild, holder);
    holder.remove();
    if (pulled && joinedStart && parent.contains(joinedStart)) {
        if (joinedStart instanceof Text) placeCaretOn(joinedStart, parent);
        else placeCaretAtTail(joinedStart);
    } else if (!anchor || !parent.contains(anchor)) {
        const boundary = parent.querySelector(":scope > ul, :scope > ol");
        if (boundary) placeCaretAtEndOfInline(parent, boundary);
        else placeCaretAtEnd(parent);
    }
}

function nestedItemToJoin(block: HTMLElement, selection: Selection, event: { key: string; shiftKey: boolean; altKey: boolean; ctrlKey: boolean; metaKey: boolean }): HTMLElement | null {
    if (block.tagName !== "LI" || !selection.rangeCount || !selection.isCollapsed) return null;
    const range = selection.getRangeAt(0);
    const nestedList = block.parentElement;
    const atNestedStart = (nestedList instanceof HTMLUListElement || nestedList instanceof HTMLOListElement)
        && nestedList.parentElement instanceof HTMLLIElement
        && listItems(nestedList)[0] === block
        && caretEdges(block, selection)?.atStart === true;
    let parentTarget: HTMLElement | null = null;
    for (const child of block.children) {
        if (!(child instanceof HTMLElement) || (child.tagName !== "UL" && child.tagName !== "OL")) continue;
        if (range.comparePoint(child, 0) !== 1) continue;
        const between = range.cloneRange();
        between.setEndBefore(child);
        if (between.toString().replace(/[\u200b\u00a0\s]/g, "")) continue;
        parentTarget = listItems(child)[0] ?? null;
        break;
    }
    const action = nestedListJoinKey({
        key: event.key,
        shiftKey: event.shiftKey,
        altKey: event.altKey,
        ctrlKey: event.ctrlKey,
        metaKey: event.metaKey,
        collapsed: true,
        atNestedStart,
        atParentEnd: parentTarget !== null,
    });
    if (action !== "join") return null;
    return event.key === "Backspace" ? block : parentTarget;
}

function placeCaretAtEndOfInline(parent: HTMLElement, boundary: Element) {
    const selection = window.getSelection();
    if (!selection) return;
    const caret = document.createRange();
    caret.setStartBefore(boundary);
    caret.collapse(true);
    selection.removeAllRanges();
    selection.addRange(caret);
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

function childListAfterCaret(item: HTMLElement, selection: Selection): boolean {
    if (!selection.rangeCount || !selection.isCollapsed || item.tagName !== "LI") return false;
    const range = selection.getRangeAt(0);
    for (const child of item.children) {
        if (!(child instanceof HTMLElement) || (child.tagName !== "UL" && child.tagName !== "OL")) continue;
        if (range.comparePoint(child, 0) !== 1) continue;
        const between = range.cloneRange();
        between.setEndBefore(child);
        return between.toString().replace(/[\u200b\u00a0\s]/g, "") === "";
    }
    return false;
}

function openNestedLineAbove(item: HTMLElement) {
    const list = item.parentElement;
    if (!(list instanceof HTMLUListElement || list instanceof HTMLOListElement)) return;
    if (!(list.parentElement instanceof HTMLLIElement)) return;
    const blank = document.createElement("li");
    blank.appendChild(document.createElement("br"));
    item.before(blank);
    placeCaretAtStart(blank);
}

function openItemAfter(item: HTMLElement) {
    const list = item.parentElement;
    if (!(list instanceof HTMLUListElement || list instanceof HTMLOListElement)) return;
    const blank = document.createElement("li");
    blank.appendChild(document.createElement("br"));
    item.after(blank);
    placeCaretAtStart(blank);
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

function blockEndsWithPicture(block: HTMLElement): boolean {
    let node: ChildNode | null = block.lastChild;
    while ((node instanceof Text && !node.data.replace(/[\u00a0\s\u200b]/g, "")) || node instanceof HTMLBRElement) node = node.previousSibling;
    return node instanceof HTMLElement && node.tagName === "FIGURE";
}

function holdCaretAfterFigure(figure: HTMLElement) {
    const lead = document.createTextNode("\u200b");
    figure.after(lead);
    placeCaretInText(lead, lead.data.length);
}

function placeCaretAfterPicture(block: HTMLElement) {
    let node: ChildNode | null = block.lastChild;
    while ((node instanceof Text && !node.data.replace(/[\u00a0\s\u200b]/g, "")) || node instanceof HTMLBRElement) node = node.previousSibling;
    if (!(node instanceof HTMLElement) || node.tagName !== "FIGURE") {
        placeCaretAtEnd(block);
        return;
    }
    holdCaretAfterFigure(node);
}

function writingBesideMark(node: Text): boolean {
    const visible = (value: string) => value.replace(/[\u00a0\s\u200b]/g, "") !== "";
    for (const step of ["previousSibling", "nextSibling"] as const) {
        let sibling: ChildNode | null = node[step];
        while (sibling instanceof Text && !visible(sibling.data)) sibling = sibling[step];
        if (sibling instanceof Text && visible(sibling.data)) return true;
    }
    return false;
}

function dropTypedCaretMarkers(editor: HTMLElement) {
    const selection = window.getSelection();
    const range = selection?.rangeCount ? selection.getRangeAt(0) : null;
    const nodes = [editor, ...editor.querySelectorAll("*")].flatMap((element) => element.closest("pre") ? [] : [...element.childNodes]);
    const texts = nodes.filter((node): node is Text => node instanceof Text && node.data.includes("\u200b"));
    for (const node of texts) {
        if (!node.isConnected || node.parentElement?.closest("pre")) continue;
        if (caretMarkBeside({
            text: node.data,
            caretInside: range?.startContainer === node,
            writingBeside: writingBesideMark(node),
        }) === "drop") {
            node.remove();
            continue;
        }
        const offset = range?.startContainer === node ? range.startOffset : node.data.length;
        const dropped = dropCaretMarker({ text: node.data, offset });
        if (!dropped) continue;
        node.data = dropped.text;
        if (range?.startContainer !== node || !selection) continue;
        const caret = document.createRange();
        caret.setStart(node, Math.min(dropped.offset, node.data.length));
        caret.collapse(true);
        selection.removeAllRanges();
        selection.addRange(caret);
    }
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
    placeNameContinuation(figure, paragraph);
    return offset;
}

function placeNameContinuation(figure: HTMLElement, block: HTMLElement) {
    const parent = figure.parentElement;
    const line = pictureNameLine(parent?.tagName ?? "DIV");
    if (!parent || line === "page") {
        figure.after(block);
        placeCaretAtStart(block);
        return;
    }
    if (line === "break") {
        const onlyBreak = block.childNodes.length === 1 && block.firstChild instanceof HTMLBRElement;
        let neighbor: ChildNode | null = figure.nextSibling;
        while (neighbor instanceof Text && !neighbor.data.replace(/[\u00a0\s\u200b]/g, "")) neighbor = neighbor.nextSibling;
        const next = neighbor instanceof Text
            ? "text"
            : neighbor instanceof HTMLElement && neighbor.tagName === "FIGURE"
                ? "picture"
                : neighbor instanceof HTMLElement && neighbor.tagName !== "BR"
                    ? "block"
                    : "none";
        if (onlyBreak) {
            const continued = pictureNameContinue({ next });
            if (continued === "under" && neighbor instanceof Text) {
                openLineUnderPicture(neighbor);
                return;
            }
            if (continued === "paragraph") {
                const paragraph = document.createElement("p");
                paragraph.appendChild(document.createElement("br"));
                figure.after(paragraph);
                placeCaretAtStart(paragraph);
                return;
            }
        }
        const br = document.createElement("br");
        figure.after(br);
        if (!onlyBreak) {
            let anchor: ChildNode = br;
            while (block.firstChild) {
                const child = block.firstChild;
                anchor.after(child);
                anchor = child;
            }
            if (anchor.nextSibling && !(anchor.nextSibling instanceof HTMLBRElement)) {
                const split = document.createElement("br");
                anchor.after(split);
            }
        }
        const caret = document.createRange();
        caret.setStartAfter(br);
        caret.collapse(true);
        const selection = window.getSelection();
        selection?.removeAllRanges();
        selection?.addRange(caret);
        return;
    }
    const following: ChildNode[] = [];
    let node = figure.nextSibling;
    while (node) {
        const next: ChildNode | null = node.nextSibling;
        following.push(node);
        node = next;
    }
    const remainder = (block.textContent ?? "").replace(/[\u200b\u00a0\s]/g, "") !== "";
    const heading = parent.tagName === "H1" || parent.tagName === "H2" || parent.tagName === "H3";
    const firstText = following.find((child): child is Text => child instanceof Text && child.data.replace(/[\u00a0\s\u200b]/g, "") !== "");
    if (!remainder && line !== "item" && firstText && pictureHeadingContinue({ heading, next: "text" }) === "apart") {
        if (!block.querySelector("br")) block.appendChild(document.createElement("br"));
        const rest = document.createElement("p");
        for (const child of following) rest.append(child);
        parent.after(block);
        block.after(rest);
        placeCaretAtStart(block);
        return;
    }
    if (!remainder && following.length) block.replaceChildren();
    const continued = line === "item" ? document.createElement("li") : block;
    if (line === "item") while (block.firstChild) continued.append(block.firstChild);
    if (!continued.childNodes.length && following.length === 0) continued.append(document.createElement("br"));
    parent.after(continued);
    if (remainder && following.length) {
        const rest = document.createElement(line === "item" ? "li" : "p");
        for (const child of following) rest.append(child);
        continued.after(rest);
    } else {
        for (const child of following) continued.append(child);
    }
    placeCaretAtStart(continued);
}

function pictureNameHost(editor: HTMLElement, selection: Selection): HTMLElement | null {
    if (!selection.rangeCount) return null;
    const range = selection.getRangeAt(0);
    const captionFor = (node: Node) => {
        const host = node instanceof Element ? node : node.parentElement;
        const caption = host?.closest("figcaption");
        return caption instanceof HTMLElement && editor.contains(caption) ? caption : null;
    };
    const start = captionFor(range.startContainer);
    const end = captionFor(range.endContainer);
    if (!start || start !== end) return null;
    return start;
}

function writePastedPictureLines(editor: HTMLElement, text: string) {
    const lines = text.replace(/\r\n/g, "\n").replace(/\r/g, "\n").split("\n");
    if (!lines[0]) {
        const paragraph = document.createElement("p");
        paragraph.appendChild(document.createElement("br"));
        const selection = window.getSelection();
        const range = selection?.rangeCount ? selection.getRangeAt(0) : null;
        const anchor = range?.startContainer ?? editor;
        const host = anchor instanceof Element ? anchor : anchor.parentElement;
        const figure = host === editor ? editor.childNodes[range?.startOffset ?? 0] : host?.closest("figure");
        if (figure instanceof HTMLElement && figure.tagName === "FIGURE") figure.before(paragraph);
        else editor.prepend(paragraph);
        placeCaretAtStart(paragraph);
    }
    lines.forEach((line, index) => {
        if (index > 0) document.execCommand("insertParagraph", false);
        writeCaretText(line);
        if (index === 0 && line) settlePastedPictureLine(editor);
    });
}

function settlePastedPictureLine(editor: HTMLElement) {
    const selection = window.getSelection();
    if (!selection?.rangeCount) return;
    const node = selection.anchorNode;
    if (!(node instanceof Text) || node.parentElement !== editor) return;
    const next = node.nextSibling;
    const previous = node.previousSibling;
    const beside = (next instanceof HTMLElement && next.tagName === "FIGURE")
        || (previous instanceof HTMLElement && previous.tagName === "FIGURE")
        ? "picture"
        : "other";
    if (pastedPictureLine({ parent: "page", beside }) !== "paragraph") return;
    const paragraph = document.createElement("p");
    node.before(paragraph);
    paragraph.appendChild(node);
    const caret = document.createRange();
    caret.setStart(node, node.data.length);
    caret.collapse(true);
    selection.removeAllRanges();
    selection.addRange(caret);
}

function writeCaretText(text: string) {
    if (!text) return;
    const selection = window.getSelection();
    if (!selection?.rangeCount) return;
    const range = selection.getRangeAt(0);
    if (range.startContainer instanceof Text) {
        const node = range.startContainer;
        const offset = range.startOffset;
        node.data = `${node.data.slice(0, offset)}${text}${node.data.slice(offset)}`;
        range.setStart(node, offset + text.length);
        range.collapse(true);
        selection.removeAllRanges();
        selection.addRange(range);
        return;
    }
    const node = document.createTextNode(text);
    const parent = range.startContainer instanceof Element ? range.startContainer : range.startContainer.parentElement;
    if (parent instanceof HTMLElement && parent.childNodes.length === 1 && parent.firstChild instanceof HTMLBRElement) parent.replaceChildren(node);
    else range.insertNode(node);
    const next = document.createRange();
    next.setStart(node, node.data.length);
    next.collapse(true);
    selection.removeAllRanges();
    selection.addRange(next);
}

function pastePictureNameLines(caption: HTMLElement, text: string) {
    const lines = text.replace(/\r\n/g, "\n").replace(/\r/g, "\n").split("\n");
    const selection = window.getSelection();
    if (selection?.rangeCount && !selection.getRangeAt(0).collapsed) selection.getRangeAt(0).deleteContents();
    writeCaretText(lines[0] ?? "");
    dropEmptyMarks(caption);
    caption.normalize();
    const figure = caption.closest("figure");
    if (figure instanceof HTMLElement) syncPictureAlt(figure);
    lines.slice(1).forEach((line, index) => {
        if (index === 0) continueAfterPicture(caption);
        else document.execCommand("insertParagraph", false);
        writeCaretText(line);
    });
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
    const pictureRangeSaved = useRef(false);
    const pictureRemoval = useRef<{ before: string; after: string } | null>(null);
    const headingSplit = useRef<{ before: string; after: string; tag: string; text: string; offset: number } | null>(null);
    const blankLine = useRef<{ before: string; after: string; path?: number[]; caret?: number; breakIndex?: number; breakSide?: "before" | "after"; sticky?: boolean; typed?: string; typedCaret?: number; resume?: "plain"; enterStyle?: boolean } | null>(null);
    const editingForward = useRef(true);
    const selectionTyping = useRef(false);
    const selectionTypeStart = useRef<number | null>(null);
    const selectionTypeLine = useRef<HTMLElement | null>(null);
    const dragUndo = useRef<{ before: string; path: number[]; caret: number } | null>(null);
    const wordGap = useRef<{ path: number[]; offset: number; gap: "before" | "after" } | null>(null);
    const quoteItalic = useRef<"italic" | "plain" | null>(null);
    const quoteItalicHold = useRef(false);
    const linkUnderlineMode = useRef<"underline" | "plain" | null>(null);
    const linkUnderlineHold = useRef(false);
    const deletedStrikeMode = useRef<"plain" | null>(null);
    const styleUndo = useRef<{ before: string; after: string; path: number[]; caret: number; direct?: boolean } | null>(null);
    const styleRedo = useRef<{ undone: string; redone: string; path: number[]; caret: number; direct?: boolean } | null>(null);
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
        resume?: "plain";
        enterStyle?: boolean;
    } | null>(null);
    const keepBlank = (page: { before: string; after: string; path?: number[]; caret?: number; breakIndex?: number; breakSide?: "before" | "after"; sticky?: boolean; resume?: "plain"; enterStyle?: boolean }) => {
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
        const formatHost = anchor instanceof Element ? anchor : anchor.parentElement;
        const formatLink = formatHost?.closest("a");
        const formatUnderline = formatHost?.closest("u");
        if (linkUnderlineShown({
            inLink: Boolean(formatLink && editorRef.current.contains(formatLink)),
            inUnderline: Boolean(formatUnderline && editorRef.current.contains(formatUnderline)),
            pending: linkUnderlineMode.current,
            browser: document.queryCommandState("underline"),
        })) fmt.add("underline");
        const formatDeleted = formatHost?.closest("del");
        if (deletedStrikeShown({
            inDeleted: Boolean(formatDeleted && editorRef.current.contains(formatDeleted)),
            pending: deletedStrikeMode.current,
            browser: document.queryCommandState("strikeThrough"),
        })) fmt.add("strikethrough");
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
        const quote = linkHost?.closest("blockquote");
        const inQuote = Boolean(quote && editorRef.current.contains(quote));
        if (inQuote) fmt.add("blockquote");
        const italic = linkHost?.closest("i, em");
        const inItalic = Boolean(italic && editorRef.current.contains(italic));
        if (quoteItalic.current === "italic" || (quoteItalic.current !== "plain" && (inQuote ? inItalic : document.queryCommandState("italic")))) fmt.add("italic");
        setActiveFormats(fmt);
    }, []);

    // Sync editor DOM -> htmlContent state
    const onInput = useCallback(() => {
        const editor = editorRef.current;
        if (!editor) return;
        dropDateLineMarker(editor);
        dropTypedCaretMarkers(editor);
        const plain = plainMarkSpaces(plainSpacesAfterMarks(editor.innerHTML));
        if (plain !== editor.innerHTML) restoreMarkSpaces(editor);
        settleDateHeading(editor);
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
        const selection = window.getSelection();
        const anchor = selection?.anchorNode;
        const host = anchor instanceof Element ? anchor : anchor?.parentElement ?? null;
        const caption = host?.closest("figcaption");
        const figure = caption?.closest("figure");
        const image = figure?.querySelector("img");
        if (
            caption instanceof HTMLElement
            && figure instanceof HTMLElement
            && image instanceof HTMLImageElement
            && editor.contains(caption)
            && pictureNameAlt({ inName: true, caption: caption.textContent ?? "", alt: image.getAttribute("alt") }) === "sync"
        ) syncPictureAlt(figure);
        setHtmlContent(editor.innerHTML);
        const followed = dateFieldAfterEdit(editor.innerHTML, entryDate);
        if (followed !== entryDate) setEntryDate(followed);
        updateActiveFormats();
    }, [entryDate, updateActiveFormats]);

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

    const keepSelectionUndo = (mark: { before: string; path: number[]; caret: number } | null, host: HTMLElement | null, direct = false) => {
        const page = direct || pictureStyleDirect;
        pictureStyleDirect = false;
        if (!mark || !host || host.innerHTML === mark.before) return;
        styleUndo.current = { before: mark.before, after: host.innerHTML, path: mark.path, caret: mark.caret, direct: page };
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
        if (editor && keepFormatOffDate(editor, cmd) === "hold") return;
        editor?.focus();
        const selection = window.getSelection();
        if (editor && selection?.rangeCount && pictureStyle({ command: cmd, outsideSelected: selectionCrossesPicture(editor).outsideSelected }) === "outside") {
            const range = selection.getRangeAt(0);
            const mark = rememberSelectionUndo(editor, range);
            if (styleOutsidePicture(editor, range, cmd)) {
                keepSelectionUndo(mark, editor);
                setHtmlContent(editor.innerHTML);
                updateActiveFormats();
                return;
            }
        }
        if (cmd === "italic" && editor && selection?.rangeCount) {
            const italicRange = selection.getRangeAt(0);
            const quote = quoteHolding(editor, italicRange);
            const action = italicInQuote({
                inQuote: Boolean(quote),
                inItalic: selectionInOneItalic(editor, italicRange),
                collapsed: selection.isCollapsed,
                pending: quoteItalic.current,
            });
            if (!quote) quoteItalic.current = null;
            if (action === "arm" || action === "plain" || action === "disarm") {
                quoteItalic.current = action === "arm" ? "italic" : action === "plain" ? "plain" : null;
                quoteItalicHold.current = false;
                updateActiveFormats();
                return;
            }
            if (action === "mark" || action === "clear") {
                quoteItalic.current = null;
                const before = editor.innerHTML;
                const block = lineBlock(italicRange.startContainer);
                const path = block instanceof HTMLElement ? childPath(editor, block) : undefined;
                const marked = applyQuoteItalic(editor, italicRange, action);
                if (action === "mark" && marked.length) {
                    const kept = document.createRange();
                    if (marked.length === 1) kept.selectNodeContents(marked[0]);
                    else {
                        kept.setStart(marked[0], 0);
                        kept.collapse(true);
                    }
                    selection.removeAllRanges();
                    selection.addRange(kept);
                }
                keepBlank({ before, after: editor.innerHTML, path });
                setHtmlContent(editor.innerHTML);
                updateActiveFormats();
                return;
            }
        }
        if (cmd === "underline" && editor && selection?.rangeCount) {
            const underlineRange = selection.getRangeAt(0);
            const link = linkHolding(editor, underlineRange);
            const action = linkUnderline({
                inLink: Boolean(link),
                inUnderline: selectionInOneUnderline(editor, underlineRange),
                collapsed: selection.isCollapsed,
                pending: linkUnderlineMode.current,
            });
            if (!link) linkUnderlineMode.current = null;
            if (action === "arm" || action === "plain" || action === "disarm") {
                linkUnderlineMode.current = action === "arm" ? "underline" : action === "plain" ? "plain" : null;
                linkUnderlineHold.current = false;
                updateActiveFormats();
                return;
            }
            if (action === "mark" || action === "clear") {
                linkUnderlineMode.current = null;
                const before = editor.innerHTML;
                const block = lineBlock(underlineRange.startContainer);
                const path = block instanceof HTMLElement ? childPath(editor, block) : undefined;
                const marked = applyLinkUnderline(editor, underlineRange, action);
                if (action === "mark" && marked.length) {
                    const kept = document.createRange();
                    if (marked.length === 1) kept.selectNodeContents(marked[0]);
                    else {
                        kept.setStart(marked[0], 0);
                        kept.collapse(true);
                    }
                    selection.removeAllRanges();
                    selection.addRange(kept);
                }
                keepBlank({ before, after: editor.innerHTML, path });
                setHtmlContent(editor.innerHTML);
                updateActiveFormats();
                return;
            }
        }
        if (cmd === "strikeThrough" && editor && selection?.rangeCount) {
            const deletedRange = selection.getRangeAt(0);
            const action = deletedStrike({
                inDeleted: selectionInOneDeleted(editor, deletedRange),
                collapsed: selection.isCollapsed,
                pending: deletedStrikeMode.current,
            });
            if (action === "plain" || action === "disarm") {
                deletedStrikeMode.current = action === "plain" ? "plain" : null;
                updateActiveFormats();
                return;
            }
            if (action === "clear") {
                deletedStrikeMode.current = null;
                const before = editor.innerHTML;
                const block = lineBlock(deletedRange.startContainer);
                const path = block instanceof HTMLElement ? childPath(editor, block) : undefined;
                applyDeletedStrike(editor, deletedRange);
                keepBlank({ before, after: editor.innerHTML, path });
                setHtmlContent(editor.innerHTML);
                updateActiveFormats();
                return;
            }
        }
        if (cmd === "formatBlock" && value === "blockquote" && editor && selection?.rangeCount) {
            const quoteRange = selection.getRangeAt(0);
            const quote = quoteHolding(editor, quoteRange);
            if (quote && quoteToggle({ inside: true }) === "leave") {
                const before = editor.innerHTML;
                const path = childPath(editor, quote);
                unwrapQuote(quote);
                keepBlank({ before, after: editor.innerHTML, path });
                setHtmlContent(editor.innerHTML);
                updateActiveFormats();
                return;
            }
            const listed = quoteListTarget(editor, quoteRange);
            if (listed) {
                const plan = quoteListPlan({
                    ordered: listed.list.tagName === "OL",
                    start: listed.list.getAttribute("start"),
                    values: listed.items.map((item) => item.getAttribute("value")),
                    count: listed.items.length,
                    from: listed.from,
                    to: listed.to,
                });
                if (plan) {
                    const before = editor.innerHTML;
                    const path = childPath(editor, listed.list);
                    applyQuoteList(listed.list, listed.items, listed.from, listed.to, plan);
                    keepBlank({ before, after: editor.innerHTML, path });
                    setHtmlContent(editor.innerHTML);
                    updateActiveFormats();
                    return;
                }
            }
            if (!selection.isCollapsed) {
                const range = selection.getRangeAt(0);
                const covered = coveredQuoteBlocks(editor, range);
                const reached = touchedQuoteBlocks(editor, range);
                const coveredTogether = quoteCoveredReach({ covered: covered.length, touched: reached.length }) === "inside"
                    && quoteCoveredBlocks({ covered: covered.length, consecutive: blocksAreConsecutive(editor, covered) }) === "together";
                const touched = coveredTogether ? covered : reached;
                const together = coveredTogether || quoteTouchedBlocks({
                    touched: touched.length,
                    consecutive: blocksAreConsecutive(editor, touched),
                    crossesList: touched.some((block) => block.matches("ul, ol")),
                    crossesBreak: touched.some((block) => quoteBreakBlock(block.tagName)),
                    crossesWriting: touched.some((block) => block.matches("p, h1, h2, h3")),
                }) === "together";
                const before = editor.innerHTML;
                const path = touched[0] ? childPath(editor, touched[0]) : undefined;
                const spans = together
                    ? touched.map((block) => block.matches("ul, ol") ? selectedListSpan(block, range) : { from: 0, to: 0 })
                    : [];
                const blocks = together && spans.every((span) => span)
                    ? touched.flatMap((block, index) => {
                        if (!block.matches("ul, ol")) return [block];
                        const span = spans[index];
                        const piece = span ? quoteListPiece(block, span.from, span.to) : null;
                        return piece ? [piece] : [];
                    })
                    : [];
                if (together && blocks.length === touched.length && blocksAreConsecutive(editor, blocks) && blocks[0]) {
                    wrapQuotedBlocks(blocks);
                    keepBlank({ before, after: editor.innerHTML, path });
                    setHtmlContent(editor.innerHTML);
                    updateActiveFormats();
                    return;
                }
                if (editor.innerHTML !== before) editor.innerHTML = before;
            }
        }
        if (cmd === "formatBlock" && editor && selection?.rangeCount) {
            const headingValue = (value ?? "").toLowerCase();
            const headingRange = selection.getRangeAt(0);
            const touched = touchedQuoteBlocks(editor, headingRange);
            const across = Boolean(pictureAcross(editor, headingRange));
            const headingLines = (headingValue === "h1" || headingValue === "h2" || headingValue === "h3") && (
                listHeadingAcross({ touchesList: touched.some((block) => block.matches("ul, ol")), across }) === "lines"
                || breakHeadingAcross({ crossesBreak: touched.some((block) => quoteBreakBlock(block.tagName)), across }) === "lines"
                || writingHeadingAcross({ crossesWriting: touched.some((block) => block.matches("p, h1, h2, h3")), across }) === "lines"
            );
            if (headingLines) {
                const before = editor.innerHTML;
                const path = childPath(editor, touched[0]);
                const heading = turnTouchedBlocksIntoHeadings(editor, headingRange, headingValue);
                if (heading) {
                    keepBlank({ before, after: editor.innerHTML, path });
                    setHtmlContent(editor.innerHTML);
                    updateActiveFormats();
                    return;
                }
            }
            const listed = selectedListItems(editor, headingRange);
            if (listed && listHeading({ command: cmd, value: headingValue, inItem: true }) === "line") {
                const before = editor.innerHTML;
                const path = childPath(editor, listed[0]);
                const heading = turnListItemsIntoHeadings(listed, headingValue);
                if (heading) {
                    keepBlank({ before, after: editor.innerHTML, path });
                    setHtmlContent(editor.innerHTML);
                    updateActiveFormats();
                    return;
                }
            }
        }
        const lists = cmd === "insertUnorderedList" || cmd === "insertOrderedList";
        const range = editor && lists && selection?.rangeCount ? selection.getRangeAt(0) : null;
        const block = range ? (range.endContainer instanceof Element ? range.endContainer : range.endContainer.parentElement)?.closest("li, p") : null;
        const caret = editor && range && block instanceof HTMLElement
            ? { fromList: block.tagName === "LI", text: (block.textContent ?? "").replace(/\u00a0/g, " "), offset: textOffsetWithin(block, range.endContainer, range.endOffset) }
            : null;
        const lifting = Boolean(editor && listCommand(cmd) === "lift");
        const orderedNumbers = lifting && editor ? snapshotOrderedNumbers(editor) : null;
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
        if (orderedNumbers) restoreOrderedNumbers(orderedNumbers);
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

    const rememberPictureRange = () => {
        const editor = editorRef.current;
        const selection = window.getSelection();
        if (!editor || !selection?.rangeCount || !editor.contains(selection.anchorNode)) return false;
        imageRange.current = selection.getRangeAt(0).cloneRange();
        return true;
    };

    const startPictureQueue = (files: File[], saved = false) => {
        if (!files.length) return;
        if (!saved) {
            const editor = editorRef.current;
            const selection = window.getSelection();
            imageRange.current = selection && selection.rangeCount > 0 && editor?.contains(selection.anchorNode)
                ? selection.getRangeAt(0).cloneRange()
                : null;
        }
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

    const insertImageFile = (file: File, saved = false) => {
        startPictureQueue([file], saved);
    };

    const handleImageUpload = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        e.target.value = "";
        if (!file) {
            pictureRangeSaved.current = false;
            return;
        }
        const issue = imageFileIssue(file);
        if (issue) {
            pictureRangeSaved.current = false;
            toast({ title: issue.title, description: issue.description, variant: "destructive" });
            return;
        }
        insertImageFile(file, pictureRangeSaved.current);
        pictureRangeSaved.current = false;
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
        if (editor && selection && data.files.length === 0) {
            const crossed = selectionCrossesPicture(editor);
            if (picturePasteWords({ collapsed: selection.isCollapsed, touchesPicture: crossed.touchesPicture, outsideSelected: crossed.outsideSelected }) === "keep") {
                const decision = decideEntryPaste({
                    files: [],
                    html: data.getData("text/html"),
                    text: data.getData("text/plain"),
                });
                event.preventDefault();
                if (decision.action === "reject") {
                    toast({ title: decision.title, description: decision.description, variant: "destructive" });
                    return;
                }
                if (decision.action === "ignore") return;
                const mark = selectionUndo(editor);
                separatePictureSelection(editor, selection, false);
                const plain = decision.action === "plain"
                    ? decision.text
                    : decision.action === "default"
                        ? data.getData("text/plain")
                        : "";
                if (decision.action === "html" && picturePaste(decision.html) === "picture") insertPictureFigure(editor, decision.html);
                else if (decision.action === "html") document.execCommand("insertHTML", false, decision.html);
                else if (plain && pastedPictureLines({ text: plain, besidePicture: true }) === "split") writePastedPictureLines(editor, plain);
                else if (plain) {
                    writeCaretText(plain);
                    settlePastedPictureLine(editor);
                }
                keepReplacedSelection(mark);
                setHtmlContent(editor.innerHTML);
                return;
            }
            const caption = pictureNameHost(editor, selection);
            const text = data.getData("text/plain");
            if (caption && pictureNamePaste({ inName: true, text }) === "lines") {
                event.preventDefault();
                const before = editor.innerHTML;
                const path = childPath(editor, caption);
                pastePictureNameLines(caption, text);
                keepBlank({ before, after: editor.innerHTML, path });
                setHtmlContent(editor.innerHTML);
                return;
            }
        }
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
            if (editor && picturePaste(decision.html) === "picture") {
                const before = editor.innerHTML;
                insertPictureFigure(editor, decision.html);
                if (editor.innerHTML !== before) {
                    pictureRemoval.current = null;
                    keepBlank({ before, after: editor.innerHTML });
                }
                setHtmlContent(editor.innerHTML);
                return;
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

    const writePictureClipboard = (event: React.ClipboardEvent<HTMLDivElement>, picture: { html: string; text: string }) => {
        event.preventDefault();
        event.clipboardData.setData("text/html", picture.html);
        event.clipboardData.setData("text/plain", picture.text);
    };

    const onCopy = (event: React.ClipboardEvent<HTMLDivElement>) => {
        if (mode === "view") return;
        const editor = editorRef.current;
        const selection = window.getSelection();
        if (!editor || !selection) return;
        const picture = copiedPicture(editor, selection);
        if (!picture) return;
        writePictureClipboard(event, picture);
    };

    const onCut = (event: React.ClipboardEvent<HTMLDivElement>) => {
        if (mode === "view") return;
        const editor = editorRef.current;
        const selection = window.getSelection();
        if (!editor || !selection) return;
        const picture = copiedPicture(editor, selection);
        if (picture) {
            writePictureClipboard(event, picture);
            const before = editor.innerHTML;
            placeAfterRemovedPicture(editor, picture.figure);
            keepPicture({ before, after: editor.innerHTML });
            setHtmlContent(editor.innerHTML);
            return;
        }
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
        const crossed = selectionCrossesPicture(editor);
        if (pictureCutWords({ collapsed: selection.isCollapsed, touchesPicture: crossed.touchesPicture, outsideSelected: crossed.outsideSelected }) === "keep") {
            event.preventDefault();
            const figures = [...editor.querySelectorAll("figure")].filter((figure): figure is HTMLElement => {
                try {
                    return range.intersectsNode(figure);
                } catch {
                    return false;
                }
            });
            const outside = figures.length > 0 && figures.every((figure) => {
                const figureRange = document.createRange();
                figureRange.selectNode(figure);
                return pictureCutText({
                    startsOutside: range.compareBoundaryPoints(Range.START_TO_START, figureRange) <= 0,
                    endsOutside: range.compareBoundaryPoints(Range.END_TO_END, figureRange) >= 0,
                }) === "outside";
            });
            event.clipboardData.setData("text/plain", outside ? cutPlainBesidePicture(range) : selection.toString());
            event.clipboardData.setData("text/html", cutWordsBesidePicture(range, outside ? "drop" : "keep"));
            const mark = selectionUndo(editor);
            separatePictureSelection(editor, selection, false);
            const kept = editor.querySelector("figure");
            if (outside && kept instanceof HTMLElement && selection.rangeCount && !selection.isCollapsed) {
                const paragraph = document.createElement("p");
                paragraph.appendChild(document.createElement("br"));
                kept.after(paragraph);
                placeCaretAtStart(paragraph);
            }
            keepReplacedSelection(mark);
            setHtmlContent(editor.innerHTML);
            return;
        }
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
                    const next = line.heading.nextElementSibling;
                    const exact = (line.heading.textContent ?? "").replace(/\u00a0/g, " ") === label;
                    const leave = dateCaretLeave({
                        inHeading: true,
                        exact,
                        next: next instanceof HTMLElement ? dateLeaveTarget(next.tagName) : "none",
                    });
                    const before = editor.innerHTML;
                    if (leave === "past") leaveDateLine(line.heading);
                    else if (leave === "into" && next instanceof HTMLElement) placeCaretInBlock(next);
                    else {
                        const peeled = peelDateLine(line.heading, label);
                        placeCaretIn(peeled.paragraph, 0);
                    }
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
        const nextLabel = fmtLong(nextInstant.toISOString());
        const action = dateRetitleAction(htmlContent, previousLabel, nextLabel);
        setEntryDate(next);
        if (action === "keep") return;
        const editor = editorRef.current;
        if (editor && typeDateHeading(editor, previousLabel, nextLabel)) {
            setHtmlContent(editor.innerHTML);
            return;
        }
        const updated = retitleEntryDate(htmlContent, previousLabel, nextLabel);
        setHtmlContent(updated);
        if (editor) editor.innerHTML = updated;
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
        const outside = range && editor ? linkedOutsidePicture(editor, range) : { covered: false, href: "" };
        const crossesPicture = Boolean(range && editor && asidePictures(editor, range).length);
        const field = pictureLinkField({ crossesPicture, covered: outside.covered });
        const href = field === "edit" ? outside.href : rangeAnchor(range)?.getAttribute("href") ?? "";
        const parsed = href ? entryLinkUrl(href) : null;
        setLinkHasAnchor(field === "edit" || Boolean(parsed?.ok));
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
        const editor = editorRef.current;
        const saved = linkRange.current;
        if (editor && saved && asidePictures(editor, saved).length) {
            editor.focus();
            excludeStyleEdges(saved);
            const selection = window.getSelection();
            if (selection) {
                selection.removeAllRanges();
                selection.addRange(saved);
            }
            const linkMark = rememberSelectionUndo(editor, saved);
            const linked = commandOutsidePicture(editor, saved, "createLink", parsed.href);
            if (linked.applied) {
                keepSelectionUndo(linkMark, editor, linked.direct);
                writeLinkChange();
            } else {
                closeLinkField();
            }
            return;
        }
        const anchor = rangeAnchor(saved);
        if (anchor) {
            editAnchor(anchor, "createLink", parsed.href);
            writeLinkChange();
            return;
        }
        editor?.focus();
        const selection = window.getSelection();
        let linkMark: { before: string; path: number[]; caret: number } | null = null;
        if (saved && selection && editor) {
            excludeStyleEdges(saved);
            selection.removeAllRanges();
            selection.addRange(saved);
            linkMark = rememberSelectionUndo(editor, saved);
        }
        document.execCommand("createLink", false, parsed.href);
        keepSelectionUndo(linkMark, editor);
        writeLinkChange();
    };

    const removeLink = () => {
        const editor = editorRef.current;
        const saved = linkRange.current;
        if (editor && saved && asidePictures(editor, saved).length) {
            editor.focus();
            const selection = window.getSelection();
            if (selection) {
                selection.removeAllRanges();
                selection.addRange(saved);
            }
            const mark = rememberSelectionUndo(editor, saved);
            const linked = commandOutsidePicture(editor, saved, "unlink");
            if (linked.applied) {
                keepSelectionUndo(mark, editor, linked.direct);
                writeLinkChange();
            } else {
                closeLinkField();
            }
            return;
        }
        const anchor = rangeAnchor(saved);
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
        const onDate = editor && selection?.rangeCount
            ? openPictureOnDate(editor, selection.getRangeAt(0), current, imageAlt)
            : null;
        const opened = !onDate && editor && selection?.rangeCount
            ? openPicture(editor, selection.getRangeAt(0), current, imageAlt)
            : null;
        const placed = onDate ?? opened;
        if (placed && editor) {
            keepBlank({ before: placed.before, after: editor.innerHTML, path: placed.path });
            setHtmlContent(editor.innerHTML);
            updateActiveFormats();
        } else {
            insertHTML(imageHtml(current, imageAlt));
        }
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
            if (pictureRemovalRoute({ selected: true }) === "ahead") removePictureAhead(picture, editor);
            keepPicture({ before, after: editor.innerHTML });
        } else if (action === "name") {
            typePictureName(picture, image, e.key, selection);
        } else if (picture instanceof HTMLElement) {
            const sibling = pictureBesideNode(picture, "after");
            const next = sibling instanceof Text ? "text" : sibling instanceof HTMLElement ? "block" : "none";
            const inLine = pictureNameLine(picture.parentElement?.tagName ?? "DIV") !== "page";
            if (selectedPictureEnter({ next, inLine }) === "line") {
                const paragraph = document.createElement("p");
                paragraph.appendChild(document.createElement("br"));
                picture.after(paragraph);
                placeCaretAtStart(paragraph);
            } else if (next === "none") {
                const lead = document.createTextNode("\u200b");
                picture.after(lead);
                placeCaretInText(lead, lead.data.length);
            } else moveBesidePicture(picture, "after");
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
        resume?: "plain";
        enterStyle?: boolean;
    }) => {
        const mark = editorRef.current ? caretMark(editorRef.current) : null;
        redoPage.current = { ...page, caretPath: mark?.path, caretOffset: mark?.offset };
    };

    const undoRemovedPicture = () => {
        const editor = editorRef.current;
        const saved = pictureRemoval.current;
        const action = pictureUndo({ saved, current: editor?.innerHTML ?? "" });
        if (!editor || !saved || action !== "restore") return false;
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

    const keepPictureNameBoundary = (event: React.KeyboardEvent) => {
        const editor = editorRef.current;
        const selection = window.getSelection();
        if (!editor || !selection?.rangeCount || selection.isCollapsed || mode === "view" || event.nativeEvent.isComposing) return false;
        if (!(event.target instanceof Node) || !editor.contains(event.target)) return false;
        const range = selection.getRangeAt(0);
        const startHost = range.startContainer instanceof Element ? range.startContainer : range.startContainer.parentElement;
        const caption = startHost?.closest("figcaption");
        const startsInName = caption instanceof HTMLElement && editor.contains(caption);
        const endsInName = Boolean(startsInName && caption instanceof HTMLElement && (caption === range.endContainer || caption.contains(range.endContainer)));
        let boundaryOnly = false;
        if (startsInName && caption instanceof HTMLElement && !endsInName) {
            try {
                const gap = document.createRange();
                gap.setStartAfter(caption);
                gap.setEnd(range.endContainer, range.endOffset);
                boundaryOnly = gap.toString().replace(/[\u00a0\s]/g, "").length === 0 && gap.cloneContents().querySelector("img") === null;
            } catch {
                boundaryOnly = false;
            }
        }
        if (pictureNameBoundary({
            startsInName,
            endsInName,
            boundaryOnly,
            key: event.key,
            altKey: event.altKey,
            ctrlKey: event.ctrlKey,
            metaKey: event.metaKey,
        }) !== "name" || !(caption instanceof HTMLElement)) return false;
        event.preventDefault();
        const next = document.createRange();
        next.setStart(range.startContainer, range.startOffset);
        next.setEnd(caption, caption.childNodes.length);
        selection.removeAllRanges();
        selection.addRange(next);
        if (event.key === "Enter") {
            const before = editor.innerHTML;
            const path = childPath(editor, caption);
            if (!next.collapsed) next.deleteContents();
            dropEmptyMarks(caption);
            if (!imageAltText(caption.textContent ?? "")) caption.replaceChildren(document.createElement("br"));
            const offset = captionUndoCaret(continueAfterPicture(caption)) ?? undefined;
            keepBlank({ before, after: editor.innerHTML, path, caret: offset });
        } else if (event.key === "Backspace" || event.key === "Delete") {
            const before = editor.innerHTML;
            const path = childPath(editor, caption);
            if (!next.collapsed) next.deleteContents();
            dropEmptyMarks(caption);
            if (!imageAltText(caption.textContent ?? "")) caption.replaceChildren(document.createElement("br"));
            const figure = caption.closest("figure");
            if (figure instanceof HTMLElement) syncPictureAlt(figure);
            keepBlank({ before, after: editor.innerHTML, path, caret: 0 });
        } else {
            document.execCommand("insertText", false, event.key);
            const figure = caption.closest("figure");
            if (figure instanceof HTMLElement) syncPictureAlt(figure);
        }
        setHtmlContent(editor.innerHTML);
        return true;
    };

    const keepPictureNameEnter = (e: React.KeyboardEvent) => {
        if (e.key !== "Enter") return false;
        const editor = editorRef.current;
        const selection = window.getSelection();
        if (!editor || !selection || mode === "view") return false;
        const anchor = selection.anchorNode;
        const host = anchor instanceof Element ? anchor : anchor?.parentElement ?? null;
        const caption = host?.closest("figcaption");
        if (!(caption instanceof HTMLElement) || !editor.contains(caption)) return false;
        const caret = captionCaret(caption, selection);
        if (!caret) return false;
        const action = pictureNameEnter({
            key: e.key,
            shiftKey: e.shiftKey,
            altKey: e.altKey,
            ctrlKey: e.ctrlKey,
            metaKey: e.metaKey,
            collapsed: caret.collapsed,
            inName: true,
        });
        if (action === "pass") return false;
        e.preventDefault();
        const before = editor.innerHTML;
        const path = childPath(editor, caption);
        if (action === "replace" && selection.rangeCount) {
            const range = selection.getRangeAt(0);
            const at = textOffsetWithin(caption, range.startContainer, range.startOffset);
            range.deleteContents();
            dropEmptyMarks(caption);
            caption.normalize();
            if (!imageAltText(caption.textContent ?? "")) caption.replaceChildren(document.createElement("br"));
            placeCaretAtTextOffset(caption, at);
        }
        const offset = captionUndoCaret(continueAfterPicture(caption)) ?? undefined;
        keepBlank({ before, after: editor.innerHTML, path, caret: offset });
        setHtmlContent(editor.innerHTML);
        return true;
    };

    const keepPictureNameSelection = (e: React.KeyboardEvent) => {
        const editor = editorRef.current;
        const selection = window.getSelection();
        if (!editor || !selection || mode === "view") return false;
        const caption = selectedPictureName(editor, selection);
        const action = pictureNameSelection({
            key: e.key,
            altKey: e.altKey,
            ctrlKey: e.ctrlKey,
            metaKey: e.metaKey,
            collapsed: selection.isCollapsed,
            inName: Boolean(caption),
        });
        if (action !== "edit" || !caption || !selection.rangeCount) return false;
        e.preventDefault();
        const before = editor.innerHTML;
        const path = childPath(editor, caption);
        const range = selection.getRangeAt(0);
        const caret = textOffsetWithin(caption, range.startContainer, range.startOffset);
        const cutting = ((e.ctrlKey || e.metaKey) && (e.key === "x" || e.key === "X")) || (e.shiftKey && e.key === "Delete");
        if (cutting) document.execCommand("copy");
        range.deleteContents();
        dropEmptyMarks(caption);
        caption.normalize();
        if (!imageAltText(caption.textContent ?? "")) caption.replaceChildren(document.createElement("br"));
        const figure = caption.closest("figure");
        if (figure instanceof HTMLElement) syncPictureAlt(figure);
        placeCaretAtTextOffset(caption, caret);
        keepBlank({ before, after: editor.innerHTML, path, caret });
        setHtmlContent(editor.innerHTML);
        return true;
    };

    const keepPictureAhead = (e: React.KeyboardEvent) => {
        const editor = editorRef.current;
        const selection = window.getSelection();
        if (!editor || !selection || mode === "view") return false;
        const ahead = pictureAheadOfCaret(editor, selection);
        const action = pictureAheadDelete({
            key: e.key,
            altKey: e.altKey,
            ctrlKey: e.ctrlKey,
            metaKey: e.metaKey,
            collapsed: selection.isCollapsed,
            ahead: ahead?.ahead ?? "none",
        });
        if (action === "pass" || !ahead) return false;
        e.preventDefault();
        const before = editor.innerHTML;
        if (action === "clear") {
            const gap = document.createRange();
            const caret = selection.getRangeAt(0);
            gap.setStart(caret.startContainer, caret.startOffset);
            gap.setEndBefore(ahead.figure);
            gap.deleteContents();
            keepBlank({ before, after: editor.innerHTML });
        } else {
            removePictureAhead(ahead.figure, editor);
            keepPicture({ before, after: editor.innerHTML });
        }
        setHtmlContent(editor.innerHTML);
        return true;
    };

    const keepInlinePictureEnter = (e: React.KeyboardEvent) => {
        const editor = editorRef.current;
        const selection = window.getSelection();
        if (!editor || !selection || mode === "view") return false;
        const beside = inlinePictureBesideCaret(editor, selection);
        const anchor = selection.anchorNode;
        const host = anchor instanceof Element ? anchor : anchor?.parentElement ?? null;
        const block = host?.closest("p, li, h1, h2, h3, blockquote, td, th");
        const edges = block instanceof HTMLElement ? caretEdges(block, selection) : null;
        const action = pictureInlineEnter({
            key: e.key,
            shiftKey: e.shiftKey,
            altKey: e.altKey,
            ctrlKey: e.ctrlKey,
            metaKey: e.metaKey,
            collapsed: selection.isCollapsed,
            besidePicture: Boolean(beside),
            side: beside?.side,
            atStart: Boolean(edges?.atStart),
            line: block instanceof HTMLElement ? pictureNameLine(block.tagName) : "page",
            above: block instanceof HTMLElement && /^(BLOCKQUOTE|H1|H2|H3)$/.test(block.tagName),
        });
        if (action !== "split" || !beside || !(block instanceof HTMLElement) || !editor.contains(block)) return false;
        e.preventDefault();
        const before = editor.innerHTML;
        const path = childPath(editor, block);
        splitBesidePicture(block, beside.figure, beside.side);
        keepBlank({ before, after: editor.innerHTML, path });
        setHtmlContent(editor.innerHTML);
        return true;
    };

    const keepPictureUnderLine = (e: React.KeyboardEvent) => {
        const editor = editorRef.current;
        const selection = window.getSelection();
        if (!editor || !selection || mode === "view") return false;
        const mark = pictureUnderMark(selection);
        const action = pictureUnderLine({
            key: e.key,
            altKey: e.altKey,
            ctrlKey: e.ctrlKey,
            metaKey: e.metaKey,
            collapsed: selection.isCollapsed,
            onMark: Boolean(mark && editor.contains(mark.br)),
        });
        if (action !== "close" || !mark) return false;
        e.preventDefault();
        const before = editor.innerHTML;
        const block = mark.br.parentElement;
        const path = block instanceof HTMLElement ? childPath(editor, block) : undefined;
        const breakIndex = block instanceof HTMLElement ? [...block.querySelectorAll("br")].indexOf(mark.br) : -1;
        closePictureUnderLine(mark);
        keepBlank({ before, after: editor.innerHTML, path, ...(breakIndex >= 0 ? { breakIndex, breakSide: "before" as const } : {}) });
        setHtmlContent(editor.innerHTML);
        return true;
    };

    const keepPictureBlockEnter = (e: React.KeyboardEvent) => {
        const editor = editorRef.current;
        const selection = window.getSelection();
        if (!editor || !selection?.rangeCount || mode === "view" || !selection.isCollapsed) return false;
        const figure = typeBeforePicture(selection.getRangeAt(0));
        if (!(figure instanceof HTMLElement) || !editor.contains(figure)) return false;
        const previous = figure.previousElementSibling;
        const empty = previous instanceof HTMLElement && !(previous.textContent ?? "").replace(/[\u00a0\s]/g, "");
        const place = pictureBlockEnter({
            key: e.key,
            shiftKey: e.shiftKey,
            altKey: e.altKey,
            ctrlKey: e.ctrlKey,
            metaKey: e.metaKey,
            collapsed: true,
            beforePicture: true,
            previous: empty ? "empty" : previous instanceof HTMLElement ? "writing" : "none",
        });
        if (place === "pass") return false;
        e.preventDefault();
        const before = editor.innerHTML;
        if (place === "into" && previous instanceof HTMLElement) {
            if (!previous.querySelector("br")) previous.appendChild(document.createElement("br"));
            placeCaretAtStart(previous);
        } else {
            const paragraph = document.createElement("p");
            paragraph.appendChild(document.createElement("br"));
            figure.before(paragraph);
            placeCaretAtStart(paragraph);
        }
        if (editor.innerHTML !== before) keepBlank({ before, after: editor.innerHTML });
        setHtmlContent(editor.innerHTML);
        return true;
    };

    const keepPictureAfterEnter = (e: React.KeyboardEvent) => {
        const editor = editorRef.current;
        const selection = window.getSelection();
        if (!editor || !selection?.rangeCount || mode === "view" || !selection.isCollapsed) return false;
        const figure = typeAfterPicture(selection.getRangeAt(0));
        if (!(figure instanceof HTMLElement) || !editor.contains(figure)) return false;
        let sibling: ChildNode | null = figure.nextSibling;
        while (sibling instanceof Text && !sibling.data.replace(/[\u00a0\s\u200b]/g, "")) sibling = sibling.nextSibling;
        const empty = sibling instanceof HTMLElement && !(sibling.textContent ?? "").replace(/[\u00a0\s]/g, "");
        const place = pictureAfterEnter({
            key: e.key,
            shiftKey: e.shiftKey,
            altKey: e.altKey,
            ctrlKey: e.ctrlKey,
            metaKey: e.metaKey,
            collapsed: true,
            afterPicture: true,
            next: sibling instanceof Text ? "writing" : sibling instanceof HTMLElement ? (empty ? "empty" : "writing") : "none",
        });
        if (place === "pass") return false;
        e.preventDefault();
        const before = editor.innerHTML;
        if (place === "into" && sibling instanceof HTMLElement) {
            if (!sibling.querySelector("br")) sibling.appendChild(document.createElement("br"));
            placeCaretAtStart(sibling);
        } else {
            const paragraph = document.createElement("p");
            paragraph.appendChild(document.createElement("br"));
            figure.after(paragraph);
            placeCaretAtStart(paragraph);
        }
        if (editor.innerHTML !== before) keepBlank({ before, after: editor.innerHTML });
        setHtmlContent(editor.innerHTML);
        return true;
    };

    const keepPictureGapDelete = (e: React.KeyboardEvent) => {
        const editor = editorRef.current;
        const selection = window.getSelection();
        if (!editor || !selection?.rangeCount || mode === "view") return false;
        const figure = typeAfterPicture(selection.getRangeAt(0));
        if (!(figure instanceof HTMLElement) || !editor.contains(figure)) return false;
        const action = pictureGapDelete({
            key: e.key,
            altKey: e.altKey,
            ctrlKey: e.ctrlKey,
            metaKey: e.metaKey,
            collapsed: selection.isCollapsed,
            gap: true,
            next: pictureGapNext(figure),
        });
        if (action !== "into") return false;
        e.preventDefault();
        placeCaretAfterGap(figure);
        return true;
    };

    const keepInlinePictureBackspace = (e: React.KeyboardEvent) => {
        const editor = editorRef.current;
        const selection = window.getSelection();
        if (!editor || !selection || mode === "view") return false;
        const inline = inlinePictureBeforeCaret(editor, selection);
        const range = selection.rangeCount ? selection.getRangeAt(0) : null;
        const gap = range ? typeAfterPicture(range) : null;
        const figure = inline ?? gap;
        const action = pictureInlineBackspace({
            key: e.key,
            altKey: e.altKey,
            ctrlKey: e.ctrlKey,
            metaKey: e.metaKey,
            collapsed: selection.isCollapsed,
            afterPicture: Boolean(figure),
            following: pictureBackspaceFollows({
                inline: inline instanceof HTMLElement,
                gap: gap instanceof HTMLElement,
                writingFollows: figure instanceof HTMLElement && writingAfterPicture(figure, selection),
            }),
        });
        if (action === "remove" && figure instanceof HTMLElement) {
            e.preventDefault();
            const before = editor.innerHTML;
            removePictureAhead(figure, editor);
            keepPicture({ before, after: editor.innerHTML });
            setHtmlContent(editor.innerHTML);
            return true;
        }
        if (action !== "name" || !(figure instanceof HTMLElement)) return false;
        e.preventDefault();
        const caption = figure.querySelector("figcaption");
        if (caption instanceof HTMLElement) placeCaretAtEnd(caption);
        else {
            const caret = document.createRange();
            caret.setStartBefore(figure);
            caret.collapse(true);
            selection.removeAllRanges();
            selection.addRange(caret);
        }
        return true;
    };

    const keepPictureNameApart = (e: React.KeyboardEvent) => {
        const editor = editorRef.current;
        const selection = window.getSelection();
        if (!editor || !selection || mode === "view") return false;
        const line = lineAfterPicture(editor, selection);
        if (!line || line.block.tagName === "PRE") return false;
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
        const figure = line.caption.closest("figure");
        if (action === "remove") {
            const parent = line.block.parentElement;
            const quote = parent instanceof HTMLElement && parent.tagName === "BLOCKQUOTE" ? parent : null;
            const alone = quote instanceof HTMLElement && quoteHoldsOnly(quote, line.block);
            line.block.remove();
            if (quote && pictureQuoteShell({ quoted: true, alone }) === "close") quote.remove();
        }
        if (action === "remove" && figure instanceof HTMLElement && pictureItemCaret({ endsWithPicture: true }) === "after") holdCaretAfterFigure(figure);
        else placeCaretAtEnd(line.caption);
        if (action === "remove") keepBlank({ before, after: editor.innerHTML, path });
        setHtmlContent(editor.innerHTML);
        return true;
    };

    const keepPictureLetter = (e: React.KeyboardEvent) => {
        const editor = editorRef.current;
        const selection = window.getSelection();
        if (!editor || !selection?.rangeCount || mode === "view" || !selection.isCollapsed) return false;
        const range = selection.getRangeAt(0);
        const after = typeAfterPicture(range);
        const figure = after ?? typeBeforePicture(range);
        if (!(figure instanceof HTMLElement) || !editor.contains(figure)) return false;
        let sibling: ChildNode | null = after ? figure.nextSibling : figure.previousSibling;
        while (sibling instanceof Text && !sibling.data.replace(/[\u00a0\s\u200b]/g, "")) sibling = after ? sibling.nextSibling : sibling.previousSibling;
        const empty = sibling instanceof HTMLElement && !(sibling.textContent ?? "").replace(/[\u00a0\s]/g, "");
        const side = sibling instanceof Text ? "text" : sibling instanceof HTMLElement ? (empty ? "empty" : "element") : "none";
        const parent = figure.parentElement;
        const line = pictureNameLine(parent?.tagName ?? "DIV");
        const place = after
            ? pictureLetterAfter({ key: e.key, altKey: e.altKey, ctrlKey: e.ctrlKey, metaKey: e.metaKey, collapsed: true, afterPicture: true, next: side, line })
            : pictureLetterBefore({ key: e.key, altKey: e.altKey, ctrlKey: e.ctrlKey, metaKey: e.metaKey, collapsed: true, beforePicture: true, previous: side, line });
        if (place !== "beside" && place !== "line" && place !== "block") return false;
        e.preventDefault();
        const before = editor.innerHTML;
        if (place === "beside") {
            const text = document.createTextNode(e.key);
            if (after) figure.after(text);
            else figure.before(text);
            placeCaretInText(text, text.data.length);
        } else if (place === "block" && sibling instanceof HTMLElement) {
            sibling.replaceChildren(document.createTextNode(e.key));
            placeCaretAtEnd(sibling);
        } else {
            const paragraph = document.createElement("p");
            paragraph.appendChild(document.createTextNode(e.key));
            const host = parent instanceof HTMLElement && parent !== editor && /^(P|H1|H2|H3|LI|BLOCKQUOTE)$/.test(parent.tagName) ? parent : figure;
            if (after) host.after(paragraph);
            else host.before(paragraph);
            placeCaretAtEnd(paragraph);
        }
        keepBlank({ before, after: editor.innerHTML });
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
            const beside = typeAfterPicture(caret);
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
            } else if (beside) {
                const text = document.createTextNode(e.key);
                beside.after(text);
                const next = document.createRange();
                next.setStart(text, text.data.length);
                next.collapse(true);
                selection.removeAllRanges();
                selection.addRange(next);
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
                    const paragraph = next instanceof HTMLElement && next.tagName === "P";
                    const writing = paragraph && (next.textContent ?? "").replace(/\u00a0/g, " ").trim().length > 0;
                    if (e.key.length === 1 && dateLineTyping({ writing, peeled: false, paragraph }) === "new-line") {
                        if (typeFreshDateLine(touched.heading, e.key)) {
                            setHtmlContent(editor.innerHTML);
                            return true;
                        }
                        placeCaretAtStart(lineUnderDate(touched.heading));
                    } else leaveDateLine(touched.heading);
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
                const next = touched.heading.nextElementSibling;
                if (!(next instanceof HTMLElement) || dateLeaveTarget(next.tagName) === "past") return true;
                const before = editor.innerHTML;
                placeCaretAtStart(next);
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
        const nextBlock = line.heading.nextElementSibling;
        const arrow = dateArrow({
            key: e.key,
            altKey: e.altKey,
            ctrlKey: e.ctrlKey,
            metaKey: e.metaKey,
            shiftKey: e.shiftKey,
            where: line.where,
            atEnd: caretAtHeadingEnd(line.heading, selection),
            next: nextBlock instanceof HTMLElement ? dateLeaveTarget(nextBlock.tagName) : "none",
        });
        if (arrow === "past") {
            e.preventDefault();
            const before = editor.innerHTML;
            leaveDateLine(line.heading);
            if (editor.innerHTML !== before) setHtmlContent(editor.innerHTML);
            return true;
        }
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
        if (action === "leave") {
            const next = line.heading.nextElementSibling;
            if (!(next instanceof HTMLElement) || dateLeaveTarget(next.tagName) === "past") return true;
        }
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
        const followed = line.heading.nextElementSibling;
        const followedParagraph = followed instanceof HTMLElement && followed.tagName === "P";
        if (
            action === "write"
            && e.key.length === 1
            && dateLineTyping({ writing: false, peeled: false, paragraph: followedParagraph }) === "new-line"
            && typeFreshDateLine(line.heading, e.key)
        ) {
            if (editor.innerHTML !== before) setHtmlContent(editor.innerHTML);
            return true;
        }
        const peeled = peelDateLine(line.heading, label);
        const writing = (peeled.paragraph.textContent ?? "").replace(/\u00a0/g, " ").trim().length > 0;
        const fresh = action === "write"
            && e.key.length === 1
            && dateLineTyping({ writing, peeled: peeled.offset > 0, paragraph: true }) === "new-line";
        if (fresh && typeFreshDateLine(line.heading, e.key)) {
            if (editor.innerHTML !== before) setHtmlContent(editor.innerHTML);
            return true;
        }
        const paragraph = fresh ? lineUnderDate(line.heading) : peeled.paragraph;
        const offset = fresh ? 0 : (action === "write" ? peeled.offset : 0);
        placeCaretIn(paragraph, offset);
        if (action === "write" && e.key.length === 1 && !document.execCommand("insertText", false, e.key)) {
            const text = paragraph.textContent ?? "";
            paragraph.textContent = `${text.slice(0, offset)}${e.key}${text.slice(offset)}`;
            placeCaretIn(paragraph, offset + 1);
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
            nested: item.parentElement?.parentElement instanceof HTMLLIElement,
        });
        if (action === "outdent") {
            e.preventDefault();
            const before = editor.innerHTML;
            const path = childPath(editor, item);
            outdentNestedItem(item);
            const caret = window.getSelection();
            if (!caret?.anchorNode || !item.contains(caret.anchorNode)) placeCaretAtStart(item);
            keepBlank({ before, after: editor.innerHTML, path });
            setHtmlContent(editor.innerHTML);
            return true;
        }
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
        const nestedEnter = nestedEnterKey({
            key: e.key,
            shiftKey: e.shiftKey,
            altKey: e.altKey,
            ctrlKey: e.ctrlKey,
            metaKey: e.metaKey,
            collapsed: edges.collapsed,
            atNestedStart: item.parentElement?.parentElement instanceof HTMLLIElement && edges.atStart,
            beforeChildList: childListAfterCaret(item, selection),
        });
        if (nestedEnter === "line" || nestedEnter === "after") {
            e.preventDefault();
            const before = editor.innerHTML;
            const path = childPath(editor, item);
            if (nestedEnter === "line") openNestedLineAbove(item);
            else openItemAfter(item);
            keepBlank({ before, after: editor.innerHTML, path });
            setHtmlContent(editor.innerHTML);
            return true;
        }
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
        const offset = pictureEdgeOffset({
            textOffset: caretTextOffset(nodes, range.startContainer, range.startOffset),
            atStart: Boolean(caretEdges(quote, selection)?.atStart),
        });
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
        dropTypedCaretMarkers(editor);
        rememberWordGap(editor, block instanceof HTMLElement ? block : null, separated);
        keepBlank({ before, after: editor.innerHTML, path, ...(mark ? { breakIndex: mark.index, breakSide: mark.side } : {}) });
        setHtmlContent(editor.innerHTML);
        return true;
    };

    const pullWritingBack = (e: React.KeyboardEvent) => {
        const editor = editorRef.current;
        const selection = window.getSelection();
        if (!editor || !selection?.rangeCount || mode === "view") return false;
        if (e.key !== "Backspace" || e.shiftKey || e.altKey || e.ctrlKey || e.metaKey || !selection.isCollapsed) return false;
        if (codeBackLine({ back: true }) !== "line") return false;
        const anchor = selection.anchorNode;
        const host = anchor instanceof Element ? anchor : anchor?.parentElement ?? null;
        if (!host || host.closest("li, pre, table")) return false;
        const block = host.closest("p, h1, h2, h3, blockquote, div");
        if (!(block instanceof HTMLElement) || !editor.contains(block) || block === editor || block.getAttribute("contenteditable") === "true") return false;
        const edges = caretEdges(block, selection);
        if (!edges?.collapsed || !edges.atStart) return false;
        if (codeBackBreak({ broken: firstBrokenLine(block) !== null }) !== "line") return false;
        const instant = instantFor(entryDate);
        const label = instant ? fmtLong(instant.toISOString()) : "";
        const dateHeading = label ? [...editor.querySelectorAll("h2")].find((heading) => (heading.textContent ?? "").trim() === label) : null;
        if (block === dateHeading) return false;
        const pre = codeBehindWriting(block);
        if (!(pre instanceof HTMLPreElement) || !editor.contains(pre)) return false;
        e.preventDefault();
        const before = editor.innerHTML;
        const path = childPath(editor, pre);
        joinWritingIntoCode(pre, block);
        keepBlank({ before, after: editor.innerHTML, path });
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
            const tail = tailAfterCode(pre);
            const tailForward = codeForwardJoin({
                key: e.key,
                shiftKey: e.shiftKey,
                altKey: e.altKey,
                ctrlKey: e.ctrlKey,
                metaKey: e.metaKey,
                collapsed: selection.isCollapsed,
                atEnd: caretAtBlockEnd(target, range),
                next: tail ? "writing" : "none",
            });
            if (tail && tailForward === "line") {
                e.preventDefault();
                const before = editor.innerHTML;
                const path = childPath(editor, pre);
                joinTailIntoCode(pre, tail);
                keepBlank({ before, after: editor.innerHTML, path });
                setHtmlContent(editor.innerHTML);
                return true;
            }
            const nextWriting = writingAfterCode(pre);
            const forward = codeForwardJoin({
                key: e.key,
                shiftKey: e.shiftKey,
                altKey: e.altKey,
                ctrlKey: e.ctrlKey,
                metaKey: e.metaKey,
                collapsed: selection.isCollapsed,
                atEnd: caretAtBlockEnd(target, range),
                next: nextWriting && nextWriting !== dateHeading ? codeForwardKind(nextWriting) : "none",
            });
            if (forward === "line" && nextWriting && nextWriting !== dateHeading) {
                e.preventDefault();
                const before = editor.innerHTML;
                const path = childPath(editor, pre);
                joinWritingIntoCode(pre, nextWriting);
                keepBlank({ before, after: editor.innerHTML, path });
                setHtmlContent(editor.innerHTML);
                return true;
            }
            const beside = codeBeforeThis(pre);
            const besidePull = codePullKey({
                key: e.key,
                shiftKey: e.shiftKey,
                altKey: e.altKey,
                ctrlKey: e.ctrlKey,
                metaKey: e.metaKey,
                collapsed: selection.isCollapsed,
                atStart,
                atEnd: false,
                neighbor: beside ? "code" : "none",
            });
            if (beside && besidePull === "pull") {
                e.preventDefault();
                const before = editor.innerHTML;
                const path = childPath(editor, beside);
                joinCodeBefore(beside, pre);
                keepBlank({ before, after: editor.innerHTML, path });
                setHtmlContent(editor.innerHTML);
                return true;
            }
            const housed = codeInsideBlock(pre);
            const housedPull = codePullKey({
                key: e.key,
                shiftKey: e.shiftKey,
                altKey: e.altKey,
                ctrlKey: e.ctrlKey,
                metaKey: e.metaKey,
                collapsed: selection.isCollapsed,
                atStart,
                atEnd: false,
                neighbor: housed ? "code" : "none",
            });
            if (housed && housedPull === "pull") {
                e.preventDefault();
                const before = editor.innerHTML;
                const path = childPath(editor, housed);
                joinCodeBefore(housed, pre);
                keepBlank({ before, after: editor.innerHTML, path });
                setHtmlContent(editor.innerHTML);
                return true;
            }
            const ruled = dividerBeforeCode(pre) ?? tableBeforeCode(pre);
            const ruledPull = codePullKey({
                key: e.key,
                shiftKey: e.shiftKey,
                altKey: e.altKey,
                ctrlKey: e.ctrlKey,
                metaKey: e.metaKey,
                collapsed: selection.isCollapsed,
                atStart,
                atEnd: false,
                neighbor: ruled ? "text" : "none",
            });
            if (ruled && ruledPull === "pull") {
                e.preventDefault();
                const before = editor.innerHTML;
                const path = childPath(editor, ruled);
                const separated = pullCodeAfterPicture(ruled, pre);
                const host = ruled.parentElement instanceof HTMLElement ? ruled.parentElement : editor;
                rememberWordGap(editor, writingHost(host), separated);
                keepBlank({ before, after: editor.innerHTML, path });
                setHtmlContent(editor.innerHTML);
                return true;
            }
            const pictured = pictureBeforeCode(pre);
            const picturePull = codePullKey({
                key: e.key,
                shiftKey: e.shiftKey,
                altKey: e.altKey,
                ctrlKey: e.ctrlKey,
                metaKey: e.metaKey,
                collapsed: selection.isCollapsed,
                atStart,
                atEnd: false,
                neighbor: pictured ? "text" : "none",
            });
            if (pictured && picturePull === "pull") {
                e.preventDefault();
                const before = editor.innerHTML;
                const path = childPath(editor, pictured);
                const separated = pullCodeAfterPicture(pictured, pre);
                const host = pictured.parentElement instanceof HTMLElement ? pictured.parentElement : editor;
                rememberWordGap(editor, writingHost(blockStaysBeforeCode(pictured) ? host : pictured), separated);
                keepBlank({ before, after: editor.innerHTML, path });
                setHtmlContent(editor.innerHTML);
                return true;
            }
            const previous = leadBeforeCode(pre);
            const lead = codePullKey({
                key: e.key,
                shiftKey: e.shiftKey,
                altKey: e.altKey,
                ctrlKey: e.ctrlKey,
                metaKey: e.metaKey,
                collapsed: selection.isCollapsed,
                atStart,
                atEnd: false,
                neighbor: previous && codeLead({ words: true }) === "pull" ? "text" : "none",
            });
            if (previous && lead === "pull") {
                e.preventDefault();
                const before = editor.innerHTML;
                const path = childPath(editor, pre);
                const host = pre.parentElement instanceof HTMLElement ? pre.parentElement : editor;
                const separated = pullCodeOntoLead(pre, previous);
                rememberWordGap(editor, writingHost(host), separated);
                keepBlank({ before, after: editor.innerHTML, path });
                setHtmlContent(editor.innerHTML);
                return true;
            }
            const prior = itemBeforeCode(pre);
            const priorPull = codePullKey({
                key: e.key,
                shiftKey: e.shiftKey,
                altKey: e.altKey,
                ctrlKey: e.ctrlKey,
                metaKey: e.metaKey,
                collapsed: selection.isCollapsed,
                atStart,
                atEnd: false,
                neighbor: prior ? "text" : "none",
            });
            if (prior && priorPull === "pull") {
                e.preventDefault();
                const before = editor.innerHTML;
                const path = childPath(editor, pre);
                const item = pre.parentElement;
                const separated = pullFirstCodeLine(prior, pre);
                if (item instanceof HTMLElement) dropEmptyCodeItem(item);
                rememberWordGap(editor, writingHost(prior), separated);
                keepBlank({ before, after: editor.innerHTML, path });
                setHtmlContent(editor.innerHTML);
                return true;
            }
            const hostLead = hostBeforeCode(pre);
            const hostPull = codePullKey({
                key: e.key,
                shiftKey: e.shiftKey,
                altKey: e.altKey,
                ctrlKey: e.ctrlKey,
                metaKey: e.metaKey,
                collapsed: selection.isCollapsed,
                atStart,
                atEnd: false,
                neighbor: hostLead ? "text" : "none",
            });
            if (hostLead && hostPull === "pull") {
                e.preventDefault();
                const before = editor.innerHTML;
                const path = childPath(editor, pre);
                const host = hostLead.list.parentElement instanceof HTMLElement ? hostLead.list.parentElement : editor;
                const separated = pullCodeBeforeList(pre, hostLead.list, hostLead.text);
                rememberWordGap(editor, writingHost(host), separated);
                keepBlank({ before, after: editor.innerHTML, path });
                setHtmlContent(editor.innerHTML);
                return true;
            }
            const deepHost = deepHostBeforeCode(pre);
            const deepPull = codePullKey({
                key: e.key,
                shiftKey: e.shiftKey,
                altKey: e.altKey,
                ctrlKey: e.ctrlKey,
                metaKey: e.metaKey,
                collapsed: selection.isCollapsed,
                atStart,
                atEnd: false,
                neighbor: deepHost ? "text" : "none",
            });
            if (deepHost && deepPull === "pull") {
                e.preventDefault();
                const before = editor.innerHTML;
                const path = childPath(editor, pre);
                const host = deepHost.list.parentElement instanceof HTMLElement ? deepHost.list.parentElement : editor;
                const separated = pullCodeBeforeList(pre, deepHost.list, deepHost.text, true);
                rememberWordGap(editor, writingHost(host), separated);
                keepBlank({ before, after: editor.innerHTML, path });
                setHtmlContent(editor.innerHTML);
                return true;
            }
            const listLead = blockBeforeCodeList(pre);
            const listPull = codePullKey({
                key: e.key,
                shiftKey: e.shiftKey,
                altKey: e.altKey,
                ctrlKey: e.ctrlKey,
                metaKey: e.metaKey,
                collapsed: selection.isCollapsed,
                atStart,
                atEnd: false,
                neighbor: listLead && listLead !== dateHeading ? "text" : "none",
            });
            if (listLead && listLead !== dateHeading && listPull === "pull") {
                e.preventDefault();
                const before = editor.innerHTML;
                const path = childPath(editor, pre);
                const item = pre.parentElement;
                const separated = pullFirstCodeLine(listLead, pre);
                if (item instanceof HTMLElement) dropEmptyCodeItem(item);
                rememberWordGap(editor, writingHost(listLead), separated);
                keepBlank({ before, after: editor.innerHTML, path });
                setHtmlContent(editor.innerHTML);
                return true;
            }
            const broken = breakBeforeCode(pre);
            const breakPull = codePullKey({
                key: e.key,
                shiftKey: e.shiftKey,
                altKey: e.altKey,
                ctrlKey: e.ctrlKey,
                metaKey: e.metaKey,
                collapsed: selection.isCollapsed,
                atStart,
                atEnd: false,
                neighbor: broken ? "text" : "none",
            });
            if (broken && breakPull === "pull") {
                e.preventDefault();
                const before = editor.innerHTML;
                const path = childPath(editor, pre);
                const host = broken.breakNode.parentElement instanceof HTMLElement ? broken.breakNode.parentElement : editor;
                const separated = pullCodeAcrossBreak(pre, broken.breakNode, broken.text);
                rememberWordGap(editor, writingHost(host), separated);
                keepBlank({ before, after: editor.innerHTML, path });
                setHtmlContent(editor.innerHTML);
                return true;
            }
            const plainBlock = divBeforeCode(pre);
            const plainPull = codePullKey({
                key: e.key,
                shiftKey: e.shiftKey,
                altKey: e.altKey,
                ctrlKey: e.ctrlKey,
                metaKey: e.metaKey,
                collapsed: selection.isCollapsed,
                atStart,
                atEnd: false,
                neighbor: plainBlock ? "text" : "none",
            });
            if (plainBlock && plainPull === "pull") {
                e.preventDefault();
                const before = editor.innerHTML;
                const path = childPath(editor, plainBlock);
                const separated = pullFirstCodeLine(plainBlock, pre);
                rememberWordGap(editor, writingHost(plainBlock), separated);
                keepBlank({ before, after: editor.innerHTML, path });
                setHtmlContent(editor.innerHTML);
                return true;
            }
            const neighbor = lineBeforeWrappedCode(pre) ?? adjacentTextBlock(pre, "previous");
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
            const home = pre.parentElement;
            const separated = pullFirstCodeLine(neighbor, pre);
            if (home instanceof HTMLElement && codeQuoteShell({ blank: home.tagName === "BLOCKQUOTE" && quoteIsBlank(home) }) === "close") closeEmptyHost(home);
            dropBlankCodeShell(home, editor);
            rememberWordGap(editor, writingHost(neighbor), separated);
            keepBlank({ before, after: editor.innerHTML, path });
            setHtmlContent(editor.innerHTML);
            return true;
        }
        const ahead = preAfterCaret(selection);
        if (ahead && editor.contains(ahead) && !ahead.closest("figcaption")) {
            const forward = codePullKey({
                key: e.key,
                shiftKey: e.shiftKey,
                altKey: e.altKey,
                ctrlKey: e.ctrlKey,
                metaKey: e.metaKey,
                collapsed: selection.isCollapsed,
                atStart: false,
                atEnd: true,
                neighbor: "code",
            });
            if (forward === "pull") {
                e.preventDefault();
                const before = editor.innerHTML;
                const host = ahead.parentElement instanceof HTMLElement ? ahead.parentElement : editor;
                const path = childPath(editor, host);
                const separated = pullCodeOntoLead(ahead, textBeforeNode(ahead));
                rememberWordGap(editor, writingHost(host), separated);
                keepBlank({ before, after: editor.innerHTML, path });
                setHtmlContent(editor.innerHTML);
                return true;
            }
        }
        const behind = preBeforeCaret(selection);
        if (behind && editor.contains(behind) && !behind.closest("figcaption")) {
            const backward = codePullKey({
                key: e.key,
                shiftKey: e.shiftKey,
                altKey: e.altKey,
                ctrlKey: e.ctrlKey,
                metaKey: e.metaKey,
                collapsed: selection.isCollapsed,
                atStart: true,
                atEnd: false,
                neighbor: "text",
            });
            if (backward === "pull") {
                e.preventDefault();
                const before = editor.innerHTML;
                const host = behind.parentElement instanceof HTMLElement ? behind.parentElement : editor;
                const path = childPath(editor, host);
                const separated = pullLastCodeLine(behind, textBeforeNode(behind));
                rememberWordGap(editor, writingHost(host), separated);
                keepBlank({ before, after: editor.innerHTML, path });
                setHtmlContent(editor.innerHTML);
                return true;
            }
        }
        const writing = lineBlock(selection.anchorNode);
        const writingEdges = writing ? caretEdges(writing, selection) : null;
        const behindBlock = writing && writing !== dateHeading && writingEdges?.collapsed && writingEdges.atStart ? preBeforeWriting(writing) : null;
        if (writing && behindBlock && editor.contains(behindBlock) && !behindBlock.closest("figcaption") && !writing.closest("figcaption")) {
            const intoBlock = codePullKey({
                key: e.key,
                shiftKey: e.shiftKey,
                altKey: e.altKey,
                ctrlKey: e.ctrlKey,
                metaKey: e.metaKey,
                collapsed: selection.isCollapsed,
                atStart: true,
                atEnd: false,
                neighbor: "text",
            });
            if (intoBlock === "pull") {
                e.preventDefault();
                const before = editor.innerHTML;
                const path = childPath(editor, writing);
                const home = behindBlock.parentElement;
                const separated = pullCodeIntoBlock(behindBlock, writing);
                dropBlankCodeShell(home instanceof HTMLElement ? home : null, editor);
                if (home instanceof HTMLElement) closeEmptyHost(home);
                closeEmptyItem(home instanceof HTMLElement ? home : null);
                rememberWordGap(editor, writingHost(writing), separated);
                keepBlank({ before, after: editor.innerHTML, path });
                setHtmlContent(editor.innerHTML);
                return true;
            }
        }
        const block = lineBlock(selection.anchorNode) ?? wordsAfterCodeBlock(selection.anchorNode, editor);
        if (!block || !editor.contains(block) || block.closest("pre") || block.closest("figcaption")) return false;
        const edges = caretEdges(block, selection);
        const code = followingCode(block) ?? quoteCodeLead(block) ?? (block === dateHeading ? null : leadingShellCode(block));
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
        const home = code.parentElement;
        const separated = pullFirstCodeLine(block, code);
        if (home instanceof HTMLElement && codeQuoteShell({ blank: home.tagName === "BLOCKQUOTE" && quoteIsBlank(home) }) === "close") closeEmptyHost(home);
        dropBlankCodeShell(home, editor);
        rememberWordGap(editor, writingHost(block), separated);
        keepBlank({ before, after: editor.innerHTML, path, caret });
        setHtmlContent(editor.innerHTML);
        return true;
    };

    const joinLines = (e: React.KeyboardEvent) => {
        const editor = editorRef.current;
        const selection = window.getSelection();
        if (!editor || !selection?.rangeCount || mode === "view") return false;
        const anchorHost = selection.anchorNode instanceof Element ? selection.anchorNode : selection.anchorNode?.parentElement ?? null;
        if (anchorHost?.closest("pre")) return false;
        const block = lineBlock(selection.anchorNode);
        if (!block || !editor.contains(block) || block.closest("pre") || block.closest("figcaption")) return false;
        const captionHost = selection.anchorNode instanceof Element ? selection.anchorNode : selection.anchorNode?.parentElement ?? null;
        if (pictureCaptionJoin({ inCaption: Boolean(captionHost?.closest("figcaption")) }) === "stay") return false;
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
        const nestedTarget = nestedItemToJoin(block, selection, e);
        if (nestedTarget) {
            e.preventDefault();
            const before = editor.innerHTML;
            const path = childPath(editor, nestedTarget);
            joinNestedItem(nestedTarget);
            keepBlank({ before, after: editor.innerHTML, path });
            setHtmlContent(editor.innerHTML);
            return true;
        }
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
        const pictureRange = selection.getRangeAt(0);
        const endFigure = typeAfterPicture(pictureRange);
        let afterFigure: ChildNode | null = endFigure instanceof HTMLElement && block.contains(endFigure) ? endFigure.nextSibling : null;
        while (afterFigure instanceof Text && !afterFigure.data.replace(/[\u00a0\s\u200b]/g, "")) afterFigure = afterFigure.nextSibling;
        if (afterFigure instanceof HTMLElement && afterFigure.tagName === "BR") {
            let beyond: ChildNode | null = afterFigure.nextSibling;
            while (beyond instanceof Text && !beyond.data.replace(/[\u00a0\s\u200b]/g, "")) beyond = beyond.nextSibling;
            if (!beyond) afterFigure = null;
        }
        const forward = pictureForwardDelete({
            key: e.key,
            altKey: e.altKey,
            ctrlKey: e.ctrlKey,
            metaKey: e.metaKey,
            collapsed: edges.collapsed,
            afterPicture: endFigure instanceof HTMLElement && block.contains(endFigure) && !afterFigure,
            next: blockIsEmpty(neighbor) ? "empty" : "writing",
        });
        if (forward === "into") {
            e.preventDefault();
            placeCaretAtStart(neighbor);
            return true;
        }
        e.preventDefault();
        const before = editor.innerHTML;
        const removed = ((action === "clear" && backward) || (action === "join" && !backward)) ? neighbor : block;
        const stayed = removed === block ? neighbor : block;
        const numbers = leavingOrderedNumbers(removed, stayed);
        const forwardJoin = action === "join" && !backward;
        const anchor = selection.anchorNode;
        const caret = joinUndoCaret({
            forward: forwardJoin,
            offset: anchor && block.contains(anchor) ? textOffsetWithin(block, anchor, selection.anchorOffset) : -1,
        }) ?? undefined;
        const path = childPath(editor, block);
        let separated: "after" | "none" = "none";
        let joined: HTMLElement | null = null;
        if (action === "clear") {
            removeJoined(backward ? neighbor : block);
            placeCaretAtStart(backward ? block : neighbor);
        } else if (action === "drop") {
            removeJoined(block);
            if (pictureItemCaret({ endsWithPicture: blockEndsWithPicture(neighbor) }) === "after") placeCaretAfterPicture(neighbor);
            else placeCaretAtEnd(neighbor);
        } else if (backward) {
            if (neighbor.tagName === "LI" && block.tagName === "LI" && codeNextItem({ item: true }) === "pull") {
                const ending = preAtEnd(neighbor);
                if (ending) pullLastCodeLine(ending, textBeforeNode(ending));
            }
            if (/^H[1-3]$/.test(neighbor.tagName) && codeHeadingEnd({ heading: true }) === "pull") {
                const ending = preAtEnd(neighbor);
                if (ending) pullLastCodeLine(ending, textBeforeNode(ending));
            }
            joined = quoteJoinHost(neighbor, block);
            const lifted = detachNestedLists(block, joined.tagName);
            separated = joinBlock(joined, block);
            placeLiftedLists(joined, lifted);
        } else {
            joined = quoteJoinHost(block, neighbor);
            const lifted = detachNestedLists(neighbor, joined.tagName);
            separated = joinBlock(joined, neighbor);
            placeLiftedLists(joined, lifted);
        }
        if (numbers) restoreOrderedNumbers(numbers);
        rememberWordGap(editor, writingHost(joined ?? (backward ? neighbor : block)), separated);
        dropTypedCaretMarkers(editor);
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
        holdRedo({ undone: saved.before, redone: typedRedo({ redone: saved.after, typed: saved.typed, undone: saved.before }), kind: "blank", path: saved.path, undoCaret: saved.caret, breakIndex: saved.breakIndex, breakSide: saved.breakSide, sticky: saved.sticky, typedCaret: saved.typed ? saved.typedCaret : undefined, resume: saved.resume, enterStyle: saved.enterStyle });
        blankLine.current = null;
        selectionTyping.current = false;
        selectionTypeStart.current = null;
        selectionTypeLine.current = null;
        editor.innerHTML = saved.before;
        setHtmlContent(saved.before);
        editor.focus();
        const line = saved.path ? nodeAtPath(editor, saved.path) : editor.firstElementChild?.nextElementSibling;
        const caret = blankUndoCaret(saved);
        const resumePlain = () => {
            if (saved.resume !== "plain") return;
            quoteItalic.current = "plain";
            quoteItalicHold.current = true;
            updateActiveFormats();
        };
        if (line instanceof HTMLElement && placeBreakCaret(line, saved.breakIndex, saved.breakSide)) {
            resumePlain();
            return true;
        }
        if (line instanceof HTMLElement && caret !== null) placeCaretAtTextOffset(line, caret);
        else if (line instanceof HTMLElement) placeCaretAtStart(line);
        if (saved.enterStyle) enterStyleAtCaret();
        resumePlain();
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
        if (saved.kind === "blank") {
            blankLine.current = { before: saved.undone, after: saved.redone, path: saved.path, caret: saved.undoCaret, breakIndex: saved.breakIndex, breakSide: saved.breakSide, sticky: saved.sticky, resume: saved.resume, enterStyle: saved.enterStyle };
            if (saved.resume === "plain") {
                quoteItalic.current = null;
                quoteItalicHold.current = false;
            }
        }
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
        if (saved.direct) {
            editor.innerHTML = saved.before;
            styleUndo.current = null;
            setHtmlContent(editor.innerHTML);
            styleRedo.current = { undone: editor.innerHTML, redone: saved.after, path: saved.path, caret: saved.caret, direct: true };
            placeStyleCaret(saved.path, saved.caret);
            return true;
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
        if (saved.direct) {
            editor.innerHTML = saved.redone;
            styleRedo.current = null;
            setHtmlContent(editor.innerHTML);
            styleUndo.current = { before: saved.undone, after: editor.innerHTML, path: saved.path, caret: saved.caret, direct: true };
            placeStyleCaret(saved.path, saved.caret);
            return true;
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
        const offset = pictureEdgeOffset({
            textOffset: caretTextOffset(nodes, range.startContainer, range.startOffset),
            atStart: Boolean(caretEdges(heading, selection)?.atStart),
        });
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
    const applyQuoteItalicType = (event: InputEvent) => {
        const pending = quoteItalic.current;
        if (!pending || event.inputType !== "insertText") return;
        const typed = event.data ?? "";
        if (!typed) return;
        const editor = editorRef.current;
        const selection = window.getSelection();
        if (!editor || !selection?.rangeCount || !selection.isCollapsed || !selection.anchorNode || !editor.contains(selection.anchorNode)) return;
        const range = selection.getRangeAt(0);
        if (!quoteHolding(editor, range)) {
            quoteItalic.current = null;
            return;
        }
        event.preventDefault();
        quoteItalic.current = null;
        const before = editor.innerHTML;
        const block = lineBlock(range.startContainer);
        const path = block instanceof HTMLElement ? childPath(editor, block) : undefined;
        const caret = block instanceof HTMLElement ? typedQuoteUndoCaret(textOffsetWithin(block, range.startContainer, range.startOffset)) : null;
        if (pending === "italic") insertItalicCharacter(range, typed);
        else insertPlainCharacter(range, typed);
        keepBlank({ before, after: editor.innerHTML, path, ...(caret !== null ? { caret } : {}), ...(pending === "plain" ? { resume: "plain" as const } : {}) });
        setHtmlContent(editor.innerHTML);
    };
    const applyLinkUnderlineType = (event: InputEvent) => {
        const pending = linkUnderlineMode.current;
        if (!pending || event.inputType !== "insertText") return;
        const typed = event.data ?? "";
        if (!typed || /^\s+$/.test(typed)) {
            linkUnderlineMode.current = null;
            return;
        }
        const editor = editorRef.current;
        const selection = window.getSelection();
        if (!editor || !selection?.rangeCount || !selection.isCollapsed || !selection.anchorNode || !editor.contains(selection.anchorNode)) return;
        const range = selection.getRangeAt(0);
        if (!linkHolding(editor, range)) {
            linkUnderlineMode.current = null;
            return;
        }
        event.preventDefault();
        linkUnderlineMode.current = null;
        const before = editor.innerHTML;
        const block = lineBlock(range.startContainer);
        const path = block instanceof HTMLElement ? childPath(editor, block) : undefined;
        const caret = block instanceof HTMLElement ? typedQuoteUndoCaret(textOffsetWithin(block, range.startContainer, range.startOffset)) : null;
        if (pending === "underline") insertUnderlineCharacter(range, typed);
        else insertPlainCharacter(range, typed, "u");
        keepBlank({ before, after: editor.innerHTML, path, ...(caret !== null ? { caret } : {}) });
        setHtmlContent(editor.innerHTML);
    };
    const applyDeletedStrikeType = (event: InputEvent) => {
        const pending = deletedStrikeMode.current;
        if (!pending || event.inputType !== "insertText") return;
        const typed = event.data ?? "";
        if (!typed) return;
        const editor = editorRef.current;
        const selection = window.getSelection();
        if (!editor || !selection?.rangeCount || !selection.isCollapsed || !selection.anchorNode || !editor.contains(selection.anchorNode)) return;
        const range = selection.getRangeAt(0);
        if (!deletedHost(range.startContainer, editor)) {
            deletedStrikeMode.current = null;
            return;
        }
        event.preventDefault();
        deletedStrikeMode.current = null;
        const before = editor.innerHTML;
        const block = lineBlock(range.startContainer);
        const path = block instanceof HTMLElement ? childPath(editor, block) : undefined;
        const caret = block instanceof HTMLElement ? typedQuoteUndoCaret(textOffsetWithin(block, range.startContainer, range.startOffset)) : null;
        insertPlainCharacter(range, typed, "del");
        keepBlank({ before, after: editor.innerHTML, path, ...(caret !== null ? { caret } : {}) });
        setHtmlContent(editor.innerHTML);
    };
    const applyStyleStart = (event: InputEvent) => {
        if (event.inputType !== "insertText") return;
        const typed = event.data ?? "";
        if (!typed || /^\s+$/.test(typed)) return;
        const editor = editorRef.current;
        const selection = window.getSelection();
        if (!editor || !selection?.rangeCount || !selection.isCollapsed || !selection.anchorNode || !editor.contains(selection.anchorNode)) return;
        const range = selection.getRangeAt(0);
        const host = range.startContainer instanceof Element ? range.startContainer : range.startContainer.parentElement;
        const style = host?.closest("b, strong, i, em, u, s, strike, del, code");
        if (!(style instanceof HTMLElement) || !editor.contains(style) || style.closest("pre")) return;
        const offset = textOffsetWithin(style, range.startContainer, range.startOffset);
        if (styleStartType({ inStyle: true, collapsed: true, atStart: offset <= 0 }) !== "start") return;
        event.preventDefault();
        const before = editor.innerHTML;
        const block = lineBlock(range.startContainer);
        const path = block instanceof HTMLElement ? childPath(editor, block) : undefined;
        const caret = block instanceof HTMLElement ? styleUndoCaret(textOffsetWithin(block, range.startContainer, range.startOffset)) : null;
        insertStyleStart(style, range, typed);
        keepBlank({ before, after: editor.innerHTML, path, ...(caret !== null ? { caret } : {}), enterStyle: true });
        setHtmlContent(editor.innerHTML);
    };
    const applyLinkEdge = (event: InputEvent) => {
        if (event.inputType !== "insertText") return;
        const typed = event.data ?? "";
        if (!typed || /^\s+$/.test(typed) || quoteItalic.current) return;
        const editor = editorRef.current;
        const selection = window.getSelection();
        if (!editor || !selection?.rangeCount || !selection.isCollapsed || !selection.anchorNode || !editor.contains(selection.anchorNode)) return;
        const range = selection.getRangeAt(0);
        const host = range.startContainer instanceof Element ? range.startContainer : range.startContainer.parentElement;
        const link = host?.closest("a");
        if (!(link instanceof HTMLAnchorElement) || !editor.contains(link)) return;
        const offset = textOffsetWithin(link, range.startContainer, range.startOffset);
        const length = link.textContent?.length ?? 0;
        const edge = linkEdgeType({ inLink: true, collapsed: true, atStart: offset <= 0, atEnd: offset >= length });
        if (edge === "pass") return;
        event.preventDefault();
        const before = editor.innerHTML;
        const block = lineBlock(range.startContainer);
        const path = block instanceof HTMLElement ? childPath(editor, block) : undefined;
        const caret = block instanceof HTMLElement ? styleUndoCaret(textOffsetWithin(block, range.startContainer, range.startOffset)) : null;
        insertLinkEdge(link, range, edge, typed);
        keepBlank({ before, after: editor.innerHTML, path, ...(caret !== null ? { caret } : {}) });
        setHtmlContent(editor.innerHTML);
    };
    const applyWordGapRef = useRef(applyWordGap);
    applyWordGapRef.current = applyWordGap;
    const applyQuoteItalicTypeRef = useRef(applyQuoteItalicType);
    applyQuoteItalicTypeRef.current = applyQuoteItalicType;
    const applyLinkUnderlineTypeRef = useRef(applyLinkUnderlineType);
    applyLinkUnderlineTypeRef.current = applyLinkUnderlineType;
    const applyDeletedStrikeTypeRef = useRef(applyDeletedStrikeType);
    applyDeletedStrikeTypeRef.current = applyDeletedStrikeType;
    const applyStyleStartRef = useRef(applyStyleStart);
    applyStyleStartRef.current = applyStyleStart;
    const applyLinkEdgeRef = useRef(applyLinkEdge);
    applyLinkEdgeRef.current = applyLinkEdge;

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
        if (word) {
            const caretHost = range.startContainer instanceof Element ? range.startContainer : range.startContainer.parentElement;
            const caption = caretHost?.closest("figcaption");
            const inName = caption instanceof HTMLElement && editor.contains(caption);
            const inside = (node: Node) => Boolean(inName && caption instanceof HTMLElement && (node === caption || caption.contains(node)));
            const crossed = rangeCrossesPicture(editor, target);
            if (pictureWordEdge({ word: true, touchesPicture: crossed.touchesPicture, outsideSelected: crossed.outsideSelected }) === "hold" || pictureNameWord({
                inName,
                leavesName: inName && (!inside(target.startContainer) || !inside(target.endContainer)),
            }) === "hold") {
                event.preventDefault();
                return;
            }
        }
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
        if (block.tagName === "FIGCAPTION") {
            const figure = block.closest("figure");
            if (figure instanceof HTMLElement) syncPictureAlt(figure);
        }
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
            if (event.inputType === "insertText") applyDeletedStrikeTypeRef.current(event);
            if (event.defaultPrevented) return;
            if (event.inputType === "insertText") applyLinkUnderlineTypeRef.current(event);
            if (event.defaultPrevented) return;
            if (event.inputType === "insertText") applyLinkEdgeRef.current(event);
            if (event.defaultPrevented) return;
            if (event.inputType === "insertText" || event.inputType === "insertFromPaste") applyWordGapRef.current(event);
            else wordGap.current = null;
            if (event.defaultPrevented) return;
            if (event.inputType === "insertText") applyQuoteItalicTypeRef.current(event);
            else if (quoteItalic.current) quoteItalic.current = null;
            if (event.defaultPrevented) return;
            if (event.inputType === "insertText") applyStyleStartRef.current(event);
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

    const keepListIndent = (e: React.KeyboardEvent) => {
        const editor = editorRef.current;
        const selection = window.getSelection();
        if (!editor || !selection?.rangeCount || !(e.target instanceof Node) || !editor.contains(e.target)) return false;
        const anchor = selection.anchorNode;
        const host = anchor instanceof Element ? anchor : anchor?.parentElement ?? null;
        const item = host?.closest("li");
        if (!(item instanceof HTMLElement) || !editor.contains(item)) return false;
        const list = item.parentElement;
        const items = list instanceof HTMLElement ? listItems(list) : [];
        const action = listIndentKey({
            key: e.key,
            shiftKey: e.shiftKey,
            altKey: e.altKey,
            ctrlKey: e.ctrlKey,
            metaKey: e.metaKey,
            inItem: true,
            collapsed: selection.isCollapsed,
            hasPrevious: items.indexOf(item) > 0,
            nested: item.parentElement?.parentElement instanceof HTMLLIElement,
        });
        if (action === "pass") return false;
        e.preventDefault();
        if (action === "stay") return true;
        const before = editor.innerHTML;
        const path = childPath(editor, item);
        if (action === "indent") indentListItem(item);
        else outdentNestedItem(item);
        if (editor.innerHTML === before) return true;
        if (!selection.anchorNode || !item.contains(selection.anchorNode)) placeCaretAtEnd(item);
        keepBlank({ before, after: editor.innerHTML, path });
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
        if (e.key === "Tab" && keepListIndent(e)) return;
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
        if (keepPictureNameBoundary(e)) return;
        if (keepPictureBounds(e)) return;
        if (keepDateLine(e)) return;
        if (keepPictureAhead(e)) return;
        if (keepPictureNameEnter(e)) return;
        if (keepPictureNameSelection(e)) return;
        if (keepInlinePictureEnter(e)) return;
        if (keepPictureUnderLine(e)) return;
        if (keepHeadingLine(e)) return;
        if (keepCodeLine(e)) return;
        if (keepStyledLine(e)) return;
        if (keepStyledSpace(e)) return;
        if (keepListLine(e)) return;
        if (keepQuoteLine(e)) return;
        if (keepPictureBlockEnter(e)) return;
        if (keepPictureAfterEnter(e)) return;
        if (editSelectedPicture(e)) return;
        if (keepPictureLetter(e)) return;
        if (keepPictureGapDelete(e)) return;
        if (keepInlinePictureBackspace(e)) return;
        if (keepPictureNameApart(e)) return;
        if (moveAroundPicture(e)) return;
        if (pullWritingBack(e)) return;
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
        const toolSelection = window.getSelection();
        const leavesPicture = Boolean(editorForTool && toolSelection?.rangeCount && pictureLeaves(editorForTool, toolSelection.getRangeAt(0)));
        const crossedPicture = editorForTool ? selectionCrossesPicture(editorForTool) : { touchesPicture: false, outsideSelected: false };
        const pictureAction = pictureFormat({
            inPicture: Boolean(editorForTool && selectionTouchesPicture(editorForTool)),
            command: tool.command,
            kind: tool.kind,
            leavesPicture,
            outsideSelected: crossedPicture.outsideSelected,
        });
        if (pictureAction === "lines" && editorForTool && toolSelection?.rangeCount && (tool.command === "insertUnorderedList" || tool.command === "insertOrderedList")) {
            const before = editorForTool.innerHTML;
            const range = toolSelection.getRangeAt(0);
            const touched = touchedQuoteBlocks(editorForTool, range);
            const path = touched[0] ? childPath(editorForTool, touched[0]) : undefined;
            const ordered = tool.command === "insertOrderedList";
            if (
                listWritingAroundPicture(editorForTool, range, ordered)
                || changeListAroundPicture(editorForTool, range, tool.command)
                || reachListAroundPicture(editorForTool, range, tool.command)
            ) {
                keepBlank({ before, after: editorForTool.innerHTML, path });
                setHtmlContent(editorForTool.innerHTML);
                updateActiveFormats();
            }
            return;
        }
        if (pictureAction === "block" && editorForTool && toolSelection?.rangeCount && (tool.kind === "divider" || tool.kind === "code")) {
            const before = editorForTool.innerHTML;
            const range = toolSelection.getRangeAt(0);
            const host = range.startContainer instanceof Element ? range.startContainer : range.startContainer.parentElement;
            let block: HTMLElement | null = host instanceof HTMLElement ? host : null;
            while (block && block.parentElement && block.parentElement !== editorForTool) block = block.parentElement;
            const path = block && block.parentElement === editorForTool ? childPath(editorForTool, block) : undefined;
            if (placeBlockAroundPicture(editorForTool, range, tool.kind)) {
                keepBlank({ before, after: editorForTool.innerHTML, path });
                setHtmlContent(editorForTool.innerHTML);
                updateActiveFormats();
            }
            return;
        }
        if (pictureAction === "keep") return;
        if (tool.kind === "image") {
            pictureRangeSaved.current = rememberPictureRange();
            fileInputRef.current?.click();
            return;
        }
        if (tool.kind === "link") {
            openLinkField();
            return;
        }
        const openedListBlock = (kind: "divider" | "code") => {
            const editor = editorRef.current;
            const selection = window.getSelection();
            if (!editor || !selection?.rangeCount) return false;
            const anchor = selection.anchorNode;
            const host = anchor instanceof Element ? anchor : anchor?.parentElement ?? null;
            const item = host?.closest("li");
            if (!(item instanceof HTMLElement) || !editor.contains(item) || listBlock({ kind, inItem: true }) !== "open") return false;
            const range = selection.getRangeAt(0);
            const place = listBlockPlace({
                inItem: true,
                across: Boolean(pictureAcross(editor, range)),
                acrossItems: Boolean(pictureItems(editor, range)),
                acrossLists: Boolean(pictureAcrossLists(editor, range)),
                separateLists: Boolean(pictureSeparateLists(editor, range)),
                intoNested: Boolean(pictureIntoNested(editor, range)),
            });
            if (place !== "pass") {
                const before = editor.innerHTML;
                const anchor = place === "items"
                    ? pictureItems(editor, range) ?? pictureAcrossLists(editor, range)
                    : place === "nested"
                        ? pictureIntoNested(editor, range)
                        : pictureAcross(editor, range) ?? pictureSeparateLists(editor, range);
                if (!anchor) return false;
                const path = childPath(editor, anchor);
                const built = listBlockNodes(kind);
                if (place === "items") placePictureBetweenItems(range, built.nodes);
                else if (place === "nested") placePictureIntoNested(range, built.nodes);
                else placePictureAcross(editor, range, built.nodes);
                finishListBlock(editor, kind, built.code, built.caret);
                keepBlank({ before, after: editor.innerHTML, path });
                setHtmlContent(editor.innerHTML);
                updateActiveFormats();
                return true;
            }
            const before = editor.innerHTML;
            const slot = splitListAtCaret(item, range);
            if (!slot) return false;
            const built = listBlockNodes(kind);
            placeListBlock(built.nodes, slot);
            finishListBlock(editor, kind, built.code, built.caret);
            trimListBlockEdges(slot);
            keepBlank({ before, after: editor.innerHTML, path: slot.path });
            setHtmlContent(editor.innerHTML);
            updateActiveFormats();
            return true;
        };
        if (tool.kind === "code") {
            const editor = editorRef.current;
            if (editor && keepFormatOffDate(editor, "insertHTML") === "hold") return;
            editor?.focus();
            const selection = window.getSelection();
            const anchor = selection?.anchorNode ?? null;
            const host = anchor instanceof Element ? anchor : anchor?.parentElement ?? null;
            const pre = host?.closest("pre");
            const insideCode = Boolean(editor && pre && editor.contains(pre));
            if (editor && pre && editor.contains(pre) && selection) {
                const range = document.createRange();
                range.setStartAfter(pre);
                range.collapse(true);
                selection.removeAllRanges();
                selection.addRange(range);
            }
            if (!insideCode && openedListBlock("code")) return;
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
            if (editor && keepFormatOffDate(editor, "insertHTML") === "hold") return;
            editor?.focus();
            if (tool.html.includes("<hr") && openedListBlock("divider")) return;
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
                                        mode,
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
                                        mode,
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
                                const clock = entryCardClock(entry.createdAt, entry.updatedAt);
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
                                            <span style={{ fontSize: 9, color: "#7d746a", flexShrink: 0, display: "flex", flexDirection: "column", alignItems: "flex-end", gap: 2 }}>
                                                {clock.time ? <span><MatchedText text={clock.time} query={entryQuery} /></span> : null}
                                                {clock.edited ? <span><MatchedText text="edited" query={entryQuery} /></span> : null}
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
                                onKeyUp={(event) => {
                                    const action = quoteItalicKey({
                                        key: event.key,
                                        shiftKey: event.shiftKey,
                                        altKey: event.altKey,
                                        ctrlKey: event.ctrlKey,
                                        metaKey: event.metaKey,
                                        held: quoteItalicHold.current,
                                    });
                                    if (action === "clear") quoteItalic.current = null;
                                    if (action === "release") quoteItalicHold.current = false;
                                    const underlineAction = linkUnderlineKey({
                                        key: event.key,
                                        shiftKey: event.shiftKey,
                                        altKey: event.altKey,
                                        ctrlKey: event.ctrlKey,
                                        metaKey: event.metaKey,
                                        held: linkUnderlineHold.current,
                                    });
                                    if (underlineAction === "clear") linkUnderlineMode.current = null;
                                    if (underlineAction === "release") linkUnderlineHold.current = false;
                                    if (deletedStrikeKey({
                                        key: event.key,
                                        altKey: event.altKey,
                                        ctrlKey: event.ctrlKey,
                                        metaKey: event.metaKey,
                                    }) === "clear") deletedStrikeMode.current = null;
                                    updateActiveFormats();
                                }}
                                onMouseUp={() => {
                                    quoteItalic.current = null;
                                    quoteItalicHold.current = false;
                                    linkUnderlineMode.current = null;
                                    linkUnderlineHold.current = false;
                                    deletedStrikeMode.current = null;
                                    updateActiveFormats();
                                }}
                                spellCheck={false}
                                onPaste={onPaste}
                                onCopy={onCopy}
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
