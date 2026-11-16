import { MAX_IMAGE_BYTES } from "./constants";
import { sanitizeEntryHtml } from "./sanitize";
import { boundarySpaceCut, joinNeedsSpace, listLineSpace, sameEditingPage } from "./text";

const IMAGE_TYPES = new Set(["image/png", "image/jpeg", "image/gif", "image/webp"]);

export type ImageFileIssue = { title: string; description: string };

const LEFT_OUT: ImageFileIssue = {
    title: "Image left out",
    description: "Use a PNG, JPEG, GIF, or WebP under 150 KB.",
};

export function imageAltText(value: string): string {
    return value.replace(/\s+/g, " ").trim().slice(0, 180);
}

export type PictureCaptionKey = "break" | "hold" | "pass";

export type PictureCaptionJoin = "stay" | "join";

export function pictureCaptionJoin(input: { inCaption: boolean }): PictureCaptionJoin {
    return input.inCaption ? "stay" : "join";
}

export function pictureCaptionKey(input: {
    key: string;
    shiftKey?: boolean;
    altKey?: boolean;
    ctrlKey?: boolean;
    metaKey?: boolean;
    collapsed: boolean;
    atStart: boolean;
    atEnd: boolean;
}): PictureCaptionKey {
    if (input.altKey || input.ctrlKey || input.metaKey) return "pass";
    if (input.key === "Enter") return "break";
    if (input.key === "Backspace" && input.collapsed && input.atStart) return "hold";
    if (input.key === "Delete" && input.collapsed && input.atEnd) return "hold";
    return "pass";
}

export type LineAfterPictureKey = "move" | "remove" | "pass";

export type PictureNameMove = "caption" | "before";

export function pictureNameMove(input: { caption: boolean }): PictureNameMove {
    return input.caption ? "caption" : "before";
}

export type PictureNameBack = "line" | "before" | "pass";

export function pictureNameBack(input: { atStart: boolean; previous: boolean; date?: boolean; word?: boolean }): PictureNameBack {
    if (!input.atStart) return "pass";
    if (!input.previous || input.date) return "before";
    return "line";
}

export function lineAfterPictureKey(input: {
    key: string;
    altKey?: boolean;
    ctrlKey?: boolean;
    metaKey?: boolean;
    collapsed: boolean;
    atStart: boolean;
    empty: boolean;
}): LineAfterPictureKey {
    if (input.altKey) return "pass";
    if (input.key !== "Backspace" || !input.collapsed || !input.atStart) return "pass";
    return input.empty ? "remove" : "move";
}

export function pictureBehindLine(input: { sibling: "picture" | "list" | "other" | "none"; tail: "picture" | "writing" | "empty" | "none" }): boolean {
    if (input.sibling === "picture") return true;
    return (input.sibling === "other" || input.sibling === "list") && input.tail === "picture";
}

export type PictureLineHost = "quote" | "self";

export function pictureLineHost(input: { parent: "quote" | "other"; leading: boolean }): PictureLineHost {
    return input.parent === "quote" && input.leading ? "quote" : "self";
}

export type PictureQuoteShell = "close" | "keep";

export function pictureQuoteShell(input: { quoted: boolean; alone: boolean }): PictureQuoteShell {
    return input.quoted && input.alone ? "close" : "keep";
}

export type PictureListTail = "picture" | "writing" | "empty" | "none";

export function pictureListTail(input: { child: "picture" | "list" | "inside" | "writing" | "empty" | "none"; nestedTail: PictureListTail }): PictureListTail {
    if (input.child === "list" || input.child === "inside") return input.nestedTail;
    if (input.child === "picture" || input.child === "writing" || input.child === "empty") return input.child;
    return "none";
}

export type PictureForwardDelete = "into" | "pass";

export function pictureForwardDelete(input: {
    key: string;
    altKey?: boolean;
    ctrlKey?: boolean;
    metaKey?: boolean;
    collapsed: boolean;
    afterPicture: boolean;
    next: "writing" | "empty" | "none";
}): PictureForwardDelete {
    if (input.altKey || input.ctrlKey || input.metaKey) return "pass";
    if (input.key !== "Delete" || !input.collapsed || !input.afterPicture || input.next !== "writing") return "pass";
    return "into";
}

export type PictureGapDelete = "into" | "pass";

export function pictureGapDelete(input: {
    key: string;
    altKey?: boolean;
    ctrlKey?: boolean;
    metaKey?: boolean;
    collapsed: boolean;
    gap: boolean;
    next: "writing" | "empty" | "none";
}): PictureGapDelete {
    if (!input.gap) return "pass";
    return pictureForwardDelete({
        key: input.key,
        altKey: input.altKey,
        ctrlKey: input.ctrlKey,
        metaKey: input.metaKey,
        collapsed: input.collapsed,
        afterPicture: true,
        next: input.next,
    }) === "into" ? "into" : "pass";
}

export type PictureAhead = "picture" | "space" | "none";

export type PictureAheadDelete = "remove" | "clear" | "pass";

export function pictureAheadDelete(input: {
    key: string;
    altKey?: boolean;
    ctrlKey?: boolean;
    metaKey?: boolean;
    collapsed: boolean;
    ahead: PictureAhead;
}): PictureAheadDelete {
    if (input.altKey) return "pass";
    if (input.key !== "Delete" || !input.collapsed || input.ahead === "none") return "pass";
    return input.ahead === "space" ? "clear" : "remove";
}

export type PictureRemovalJoin = "space" | "tight";

export function pictureRemovalJoin(input: { before: string; after: string }): PictureRemovalJoin {
    const before = input.before.replace(/[\u00a0\s]+$/g, "");
    const after = input.after.replace(/^[\u00a0\s]+/g, "");
    if (!before || !after) return "tight";
    return "space";
}

export type PictureRemovalSpace = "between" | "outside" | "none";

export function pictureRemovalSpace(input: {
    before: string;
    after: string;
    beforeStyled: boolean;
    afterStyled: boolean;
}): PictureRemovalSpace {
    if (pictureRemovalJoin(input) !== "space") return "none";
    if (input.beforeStyled || input.afterStyled) return "outside";
    return "between";
}

export type PictureRemovalHost = "inline" | "block";

const PICTURE_REMOVAL_BLOCKS = new Set(["P", "H1", "H2", "H3", "LI", "BLOCKQUOTE", "TD", "TH", "PRE", "DIV", "UL", "OL", "TABLE", "HR", "FIGURE", "BR", "IMG"]);

export function pictureRemovalHost(tag: string): PictureRemovalHost {
    return PICTURE_REMOVAL_BLOCKS.has(tag.toUpperCase()) ? "block" : "inline";
}

export type PictureAheadReach = "picture" | "none";

export function pictureAheadReach(input: { sameBlock: boolean; siblingBlock: boolean }): PictureAheadReach {
    if (input.sameBlock || input.siblingBlock) return "picture";
    return "none";
}

export type PictureRemovalCaret = "text" | "before" | "inside" | "previous" | "end";

export function pictureRemovalCaret(input: { next: "text" | "picture" | "block" | "none"; inLine?: boolean; previous?: boolean }): PictureRemovalCaret {
    if (input.next === "text") return "text";
    if (input.next === "picture") return input.inLine ? "before" : "previous";
    if (input.next === "block") return "inside";
    if (input.previous) return "previous";
    return "end";
}

export type PictureRemovalRoute = "ahead" | "plain";

export function pictureRemovalRoute(input: { selected: boolean }): PictureRemovalRoute {
    return input.selected ? "ahead" : "plain";
}

export type PictureInlineEnter = "split" | "pass";

export function pictureInlineEnter(input: {
    key: string;
    shiftKey?: boolean;
    altKey?: boolean;
    ctrlKey?: boolean;
    metaKey?: boolean;
    collapsed: boolean;
    besidePicture: boolean;
    side?: "before" | "after";
    atStart?: boolean;
    line?: PictureNameLine;
    above?: boolean;
}): PictureInlineEnter {
    if (input.shiftKey || input.altKey || input.ctrlKey || input.metaKey) return "pass";
    if (input.key !== "Enter" || !input.collapsed || !input.besidePicture) return "pass";
    if (input.side === "before" && input.atStart && (input.line === "item" || input.above)) return "pass";
    return "split";
}

export function pictureEdgeOffset(input: { textOffset: number | null; atStart: boolean }): number | null {
    if (input.textOffset !== null) return input.textOffset;
    return input.atStart ? 0 : null;
}

export type PictureBlockEnter = "line" | "into" | "pass";

export function pictureBlockEnter(input: {
    key: string;
    shiftKey?: boolean;
    altKey?: boolean;
    ctrlKey?: boolean;
    metaKey?: boolean;
    collapsed: boolean;
    beforePicture: boolean;
    previous: "empty" | "writing" | "none";
}): PictureBlockEnter {
    if (input.shiftKey || input.altKey || input.ctrlKey || input.metaKey) return "pass";
    if (input.key !== "Enter" || !input.collapsed || !input.beforePicture) return "pass";
    return input.previous === "empty" ? "into" : "line";
}

export type PictureAfterEnter = "line" | "into" | "pass";

export function pictureAfterEnter(input: {
    key: string;
    shiftKey?: boolean;
    altKey?: boolean;
    ctrlKey?: boolean;
    metaKey?: boolean;
    collapsed: boolean;
    afterPicture: boolean;
    next: "empty" | "writing" | "none";
}): PictureAfterEnter {
    if (input.shiftKey || input.altKey || input.ctrlKey || input.metaKey) return "pass";
    if (input.key !== "Enter" || !input.collapsed || !input.afterPicture) return "pass";
    return input.next === "empty" ? "into" : "line";
}

export type PictureBreakLine = "paragraph" | "apart" | "under" | "break";

export function pictureBreakLine(input: { next: "block" | "text" | "picture" | "none"; side?: "before" | "after" }): PictureBreakLine {
    if (input.next === "block") return "paragraph";
    if (input.next === "text") return input.side === "before" ? "apart" : "under";
    return "break";
}

export type PictureUnderLine = "close" | "pass";

export function pictureUnderLine(input: {
    key: string;
    altKey?: boolean;
    ctrlKey?: boolean;
    metaKey?: boolean;
    collapsed: boolean;
    onMark: boolean;
}): PictureUnderLine {
    if (input.altKey || input.ctrlKey || input.metaKey || !input.collapsed || !input.onMark) return "pass";
    if (input.key === "Backspace" || input.key === "Delete") return "close";
    return "pass";
}

export type PictureLineJoin = "flush" | "words";

export function pictureLineJoin(input: { besidePicture: boolean }): PictureLineJoin {
    return input.besidePicture ? "flush" : "words";
}

export type PictureJoinCaret = "before" | "writing";

export function pictureJoinCaret(input: { next: "picture" | "writing" | "none" }): PictureJoinCaret {
    return input.next === "picture" ? "before" : "writing";
}

export type PicturePieceJoin = "flush" | "space" | "tight";

export function picturePieceJoin(input: { picture: boolean; previous: string; next: string }): PicturePieceJoin {
    if (input.picture || !input.previous || !input.next) return input.picture ? "flush" : "tight";
    return joinNeedsSpace(input.previous, input.next) ? "space" : "tight";
}

export type PictureInlineBackspace = "name" | "remove" | "pass";

export function pictureInlineBackspace(input: {
    key: string;
    altKey?: boolean;
    ctrlKey?: boolean;
    metaKey?: boolean;
    collapsed: boolean;
    afterPicture: boolean;
    following: boolean;
}): PictureInlineBackspace {
    if (input.altKey || input.ctrlKey || input.metaKey) return "pass";
    if (input.key !== "Backspace" || !input.collapsed || !input.afterPicture) return "pass";
    return input.following ? "name" : "remove";
}

export function pictureBackspaceFollows(input: { inline: boolean; gap: boolean; writingFollows: boolean }): boolean {
    if (!input.inline && !input.gap) return false;
    return input.writingFollows;
}

export type SelectedPictureKey = "remove" | "name" | "after" | "pass";

export function selectedPictureKey(input: {
    key: string;
    altKey?: boolean;
    ctrlKey?: boolean;
    metaKey?: boolean;
    imageSelected: boolean;
}): SelectedPictureKey {
    if (!input.imageSelected || input.altKey || input.ctrlKey || input.metaKey) return "pass";
    if (input.key === "Backspace" || input.key === "Delete") return "remove";
    if (input.key === "Enter") return "after";
    if (input.key.length === 1) return "name";
    return "pass";
}

export type SelectedPictureEnter = "writing" | "line";

export function selectedPictureEnter(input: { next: "text" | "block" | "none"; inLine: boolean }): SelectedPictureEnter {
    if (input.next === "none" && !input.inLine) return "line";
    return "writing";
}

export type PictureFormat = "keep" | "pass" | "lines" | "block";

export function pictureFormat(input: { inPicture: boolean; command?: string; kind?: string; leavesPicture?: boolean; outsideSelected?: boolean }): PictureFormat {
    if (!input.inPicture) return "pass";
    if (input.kind === "link") return "pass";
    if (input.kind === "image" && input.leavesPicture) return "pass";
    if (
        input.command === "bold"
        || input.command === "italic"
        || input.command === "underline"
        || input.command === "strikeThrough"
        || input.command === "undo"
        || input.command === "redo"
    ) return "pass";
    if (input.outsideSelected && input.command === "formatBlock") return "pass";
    if (input.outsideSelected && (input.command === "insertUnorderedList" || input.command === "insertOrderedList")) return "lines";
    if (input.outsideSelected && (input.kind === "code" || input.kind === "divider")) return "block";
    return "keep";
}

export type PictureNameClear = "keep" | "slice";

export function pictureNameClear(input: { startsOutside: boolean; endsOutside: boolean }): PictureNameClear {
    if (input.startsOutside && input.endsOutside) return "keep";
    return "slice";
}

export type PictureBoundsKey = "clear" | "type" | "pass";

export function pictureBoundsKey(input: {
    key: string;
    altKey?: boolean;
    ctrlKey?: boolean;
    metaKey?: boolean;
    collapsed: boolean;
    touchesPicture: boolean;
    outsideSelected: boolean;
}): PictureBoundsKey {
    if (input.altKey || input.ctrlKey || input.metaKey || input.collapsed || !input.touchesPicture || !input.outsideSelected) return "pass";
    if (input.key === "Backspace" || input.key === "Delete") return "clear";
    if (input.key === "Enter" || input.key.length === 1) return "type";
    return "pass";
}

export type PictureNameLine = "page" | "item" | "break" | "paragraph";

export function pictureNameLine(tag: string): PictureNameLine {
    if (tag === "LI") return "item";
    if (tag === "BLOCKQUOTE" || tag === "TD" || tag === "TH") return "break";
    if (tag === "DIV") return "page";
    return "paragraph";
}

export type PictureTypedPlace = "text" | "block" | "beside" | "line";

export function pictureTypedPlace(input: { next: "text" | "element" | "none"; line: PictureNameLine }): PictureTypedPlace {
    if (input.next === "text") return "text";
    if (input.next === "element") return "block";
    if (input.line === "item" || input.line === "break") return "beside";
    return "line";
}

export function pictureLetterAfter(input: {
    key: string;
    altKey?: boolean;
    ctrlKey?: boolean;
    metaKey?: boolean;
    collapsed: boolean;
    afterPicture: boolean;
    next: "text" | "empty" | "element" | "none";
    line: PictureNameLine;
}): PictureTypedPlace | "pass" {
    if (input.altKey || input.ctrlKey || input.metaKey || !input.collapsed || !input.afterPicture || input.key.length !== 1) return "pass";
    if (input.next === "text" || input.next === "element") return "pass";
    return pictureTypedPlace({ next: input.next === "empty" ? "element" : "none", line: input.line });
}

export function pictureLetterBefore(input: {
    key: string;
    altKey?: boolean;
    ctrlKey?: boolean;
    metaKey?: boolean;
    collapsed: boolean;
    beforePicture: boolean;
    previous: "text" | "empty" | "element" | "none";
    line: PictureNameLine;
}): PictureTypedPlace | "pass" {
    if (input.altKey || input.ctrlKey || input.metaKey || !input.collapsed || !input.beforePicture || input.key.length !== 1) return "pass";
    if (input.previous === "text") return "pass";
    if (input.previous === "element") return pictureTypedPlace({ next: "none", line: input.line });
    return pictureTypedPlace({ next: input.previous === "empty" ? "element" : "none", line: input.line });
}

export type PictureCutWords = "keep" | "pass";

export function pictureCutWords(input: { collapsed: boolean; touchesPicture: boolean; outsideSelected: boolean }): PictureCutWords {
    if (input.collapsed || !input.touchesPicture || !input.outsideSelected) return "pass";
    return "keep";
}

export type PictureCutText = "outside" | "selection";

export function pictureCutText(input: { startsOutside: boolean; endsOutside: boolean }): PictureCutText {
    if (input.startsOutside && input.endsOutside) return "outside";
    return "selection";
}

export function picturePasteWords(input: { collapsed: boolean; touchesPicture: boolean; outsideSelected: boolean }): PictureCutWords {
    if (input.collapsed || !input.touchesPicture || !input.outsideSelected) return "pass";
    return "keep";
}

export type PastedPictureLine = "paragraph" | "leave";

export function pastedPictureLine(input: { parent: "page" | "line"; beside: "picture" | "other" }): PastedPictureLine {
    if (input.parent === "page" && input.beside === "picture") return "paragraph";
    return "leave";
}

export type PastedPictureLines = "split" | "same";

export function pastedPictureLines(input: { text: string; besidePicture: boolean }): PastedPictureLines {
    if (input.besidePicture && /[\r\n]/.test(input.text)) return "split";
    return "same";
}

export type PictureNameSelection = "edit" | "pass";

export function pictureNameSelection(input: {
    key: string;
    altKey?: boolean;
    ctrlKey?: boolean;
    metaKey?: boolean;
    collapsed: boolean;
    inName: boolean;
}): PictureNameSelection {
    if (input.altKey || input.collapsed || !input.inName) return "pass";
    const cut = (input.ctrlKey || input.metaKey) && (input.key === "x" || input.key === "X");
    const removing = !input.ctrlKey && !input.metaKey && (input.key === "Backspace" || input.key === "Delete");
    return cut || removing ? "edit" : "pass";
}

export type PictureNameWord = "name" | "hold" | "line";

export function pictureNameWord(input: { inName: boolean; leavesName?: boolean }): PictureNameWord {
    if (!input.inName) return "line";
    return input.leavesName ? "hold" : "name";
}

export type PictureWordEdge = "hold" | "pass";

export function pictureWordEdge(input: { word: boolean; touchesPicture: boolean; outsideSelected: boolean }): PictureWordEdge {
    if (!input.word || !input.touchesPicture || !input.outsideSelected) return "pass";
    return "hold";
}

export type PictureNamePaste = "lines" | "pass";

export function pictureNamePaste(input: { inName: boolean; text: string }): PictureNamePaste {
    if (!input.inName) return "pass";
    return /[\r\n]/.test(input.text) ? "lines" : "pass";
}

export type PictureNameAlt = "sync" | "keep";

export function pictureNameAlt(input: { inName: boolean; caption: string; alt: string | null }): PictureNameAlt {
    if (!input.inName) return "keep";
    return imageAltText(input.caption) === (input.alt ?? "") ? "keep" : "sync";
}

export type PictureCopy = "picture" | "pass";

export function pictureCopy(input: { imageSelected: boolean; inFigure: boolean }): PictureCopy {
    return input.imageSelected && input.inFigure ? "picture" : "pass";
}

export type PicturePaste = "picture" | "pass";

export function picturePaste(html: string): PicturePaste {
    const text = html.trim();
    if (!/^<figure\b[^>]*>[\s\S]*<\/figure>$/i.test(text)) return "pass";
    const body = text.replace(/^<figure\b[^>]*>/i, "").replace(/<\/figure>$/i, "").trim();
    if (!/^<img\b[^>]*\/?\s*>\s*<figcaption\b[^>]*>[\s\S]*<\/figcaption>$/i.test(body)) return "pass";
    return "picture";
}

export type PictureNameBoundary = "name" | "pass";

export function pictureNameBoundary(input: {
    startsInName: boolean;
    endsInName: boolean;
    boundaryOnly: boolean;
    key: string;
    altKey?: boolean;
    ctrlKey?: boolean;
    metaKey?: boolean;
}): PictureNameBoundary {
    if (!input.startsInName || input.endsInName || !input.boundaryOnly) return "pass";
    if (input.altKey || input.ctrlKey || input.metaKey) return "pass";
    if (input.key === "Backspace" || input.key === "Delete" || input.key === "Enter") return "name";
    return input.key.length === 1 ? "name" : "pass";
}

export type PictureNameEnter = "replace" | "continue" | "pass";

export function pictureNameEnter(input: {
    key: string;
    shiftKey?: boolean;
    altKey?: boolean;
    ctrlKey?: boolean;
    metaKey?: boolean;
    collapsed: boolean;
    inName: boolean;
}): PictureNameEnter {
    if (input.altKey || input.ctrlKey || input.metaKey || input.key !== "Enter" || !input.inName) return "pass";
    return input.collapsed ? "continue" : "replace";
}

export type PictureNameContinue = "paragraph" | "under" | "break";

export function pictureNameContinue(input: { next: "block" | "text" | "picture" | "none" }): PictureNameContinue {
    if (input.next === "block" || input.next === "none") return "paragraph";
    if (input.next === "text") return "under";
    return "break";
}

export type PictureHeadingContinue = "apart" | "into";

export function pictureHeadingContinue(input: { heading: boolean; next: "text" | "block" | "none" }): PictureHeadingContinue {
    if (input.heading && input.next === "text") return "apart";
    return "into";
}

export type PictureListContinue = "apart" | "with" | "into";

export function pictureListContinue(input: { item: boolean; next: "text" | "list" | "block" | "none" }): PictureListContinue {
    if (!input.item || input.next === "none") return "into";
    if (input.next === "list") return "with";
    return "apart";
}

export type PictureItemCaret = "after" | "end";

export function pictureItemCaret(input: { endsWithPicture: boolean }): PictureItemCaret {
    return input.endsWithPicture ? "after" : "end";
}

export function pictureHeadingBefore(input: { heading: boolean }): PictureHeadingContinue {
    return input.heading ? "apart" : "into";
}

export function captionBreakText(before: string, after: string): { name: string; next: string } {
    const cut = boundarySpaceCut(before, after);
    if (!cut) return { name: before, next: after };
    return { name: before.slice(0, before.length - cut.before), next: after.slice(cut.after) };
}

export function captionUndoCaret(offset: number | null): number | null {
    if (offset === null || !Number.isFinite(offset) || offset < 0) return null;
    return Math.floor(offset);
}

export type PictureClick = "select" | "pass";

export function pictureClick(input: { image: boolean; inEditor: boolean }): PictureClick {
    if (input.image && input.inEditor) return "select";
    return "pass";
}

export type PictureSelectionMark = "selected" | "plain";

export function pictureSelectionMark(input: { editing: boolean; imageSelected: boolean }): PictureSelectionMark {
    if (input.editing && input.imageSelected) return "selected";
    return "plain";
}

export type PictureMove = "select" | "before" | "after" | "name" | "pass";

export function pictureMoveKey(input: {
    key: string;
    shiftKey?: boolean;
    altKey?: boolean;
    ctrlKey?: boolean;
    metaKey?: boolean;
    where: "before" | "after" | "both" | "caption" | "selected" | "figure";
    atStart?: boolean;
    atEnd?: boolean;
}): PictureMove {
    if (input.shiftKey || input.altKey || input.ctrlKey || input.metaKey) return "pass";
    const forward = input.key === "ArrowDown" || input.key === "ArrowRight";
    const backward = input.key === "ArrowUp" || input.key === "ArrowLeft";
    if ((input.where === "before" || input.where === "both") && forward) return "select";
    if ((input.where === "after" || input.where === "both") && backward) return "select";
    if (input.where === "selected" && forward) return "after";
    if (input.where === "selected" && backward) return "before";
    if (input.where === "caption" && backward && input.atStart) return "select";
    if (input.where === "caption" && forward && input.atEnd) return "after";
    if (input.where === "figure" && forward) return "after";
    if (input.where === "figure" && backward) return "before";
    if (input.where === "figure" && input.key.length === 1) return "name";
    return "pass";
}

export type PictureCaretSide = "picture" | "text" | "none";

export function pictureCaretNeighbor(input: { previous: PictureCaretSide; next: PictureCaretSide }): "before" | "after" | "both" | "none" {
    const previous = input.previous === "picture";
    const next = input.next === "picture";
    if (previous && next) return "both";
    if (next) return "before";
    if (previous) return "after";
    return "none";
}

export type PictureBesideTarget = "picture" | "text" | "element" | "line" | "stay";

export function pictureBesideTarget(input: {
    direction: "before" | "after";
    sibling: "picture" | "text" | "element" | "none";
    inLine: boolean;
}): PictureBesideTarget {
    if (input.sibling === "picture") return "picture";
    if (input.sibling === "text") return "text";
    if (input.sibling === "element") return "element";
    if (input.direction === "after" && !input.inLine) return "line";
    return "stay";
}

export type PictureUndo = "restore" | "keep" | "pass";

export function pictureUndo(input: {
    saved: { before: string; after: string } | null;
    current: string;
}): PictureUndo {
    if (!input.saved) return "pass";
    if (sameEditingPage(input.current, input.saved.after)) return "restore";
    return "keep";
}

export type PictureInsert = "line" | "after" | "split" | "code" | "span" | "items" | "nested" | "pass";

export function pictureInsert(input: { inPicture: boolean; inItem: boolean; inLine?: boolean; inCode?: boolean; across?: boolean; acrossItems?: boolean; acrossLists?: boolean; separateLists?: boolean; intoNested?: boolean; leavesPicture?: boolean }): PictureInsert {
    if (input.inPicture && input.leavesPicture) return "span";
    if (input.inPicture) return "after";
    if (input.acrossItems || input.acrossLists) return "items";
    if (input.separateLists) return "span";
    if (input.intoNested) return "nested";
    if (input.across && input.inItem) return "span";
    if (input.inItem) return "line";
    if (input.inCode) return "code";
    if (input.inLine) return "split";
    if (input.across) return "span";
    return "pass";
}

export function pictureListSpace(text: string, edge: "start" | "end"): string {
    return listLineSpace(text, edge);
}

export type DatePicture = "after" | "replace" | "pass";

export function datePicture(input: { onDate: "only" | "with-writing" | "none" }): DatePicture {
    if (input.onDate === "only") return "after";
    if (input.onDate === "with-writing") return "replace";
    return "pass";
}

export function imageHtml(src: string, alt: string): string {
    const name = imageAltText(alt)
        .replace(/&/g, "&amp;")
        .replace(/"/g, "&quot;")
        .replace(/</g, "&lt;");
    if (!name) return `<img src="${src}" /><p><br></p>`;
    return `<figure><img src="${src}" alt="${name}" /><figcaption>${name}</figcaption></figure>`;
}

export function imageFileIssue(file: { type: string; size: number }): ImageFileIssue | null {
    if (!IMAGE_TYPES.has(file.type)) {
        return {
            title: "Not an image",
            description: "Choose a PNG, JPEG, GIF, or WebP image.",
        };
    }
    if (file.size > MAX_IMAGE_BYTES) {
        return {
            title: "Image is too large",
            description: "Choose an image under 150 KB.",
        };
    }
    return null;
}

export type PasteDecision =
    | { action: "image"; indexes?: number[]; warning?: ImageFileIssue }
    | { action: "html"; html: string; warning?: ImageFileIssue }
    | { action: "plain"; text: string }
    | { action: "default" }
    | { action: "ignore" }
    | { action: "reject"; title: string; description: string };

export function codePasteHtml(text: string): string {
    const normalized = text.replace(/\r\n/g, "\n").replace(/\r/g, "\n").replace(/\n$/, "");
    return normalized
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;")
        .replace(/\n/g, "&#10;");
}

export function decideEntryPaste(input: {
    files: { type: string; size: number }[];
    html: string;
    text: string;
}): PasteDecision {
    const imageFiles = input.files.filter((file) => file.type.startsWith("image/"));
    if (imageFiles.length) return decideEntryDrop(imageFiles);

    const html = input.html.trim();
    if (!html) return { action: "default" };

    const clean = sanitizeEntryHtml(html);
    const droppedImage = /<img\b/i.test(html) && !/<img\b/i.test(clean);
    if (droppedImage && !clean) return { action: "reject", ...LEFT_OUT };
    if (clean) return { action: "html", html: clean, ...(droppedImage ? { warning: LEFT_OUT } : {}) };

    const text = input.text.trim();
    if (text) return { action: "plain", text };
    return { action: "ignore" };
}

export function decideEntryDrop(files: { type: string; size: number }[]): PasteDecision {
    if (!files.length) return { action: "default" };
    const indexes: number[] = [];
    let warning: ImageFileIssue | undefined;
    files.forEach((file, index) => {
        if (!file.type.startsWith("image/")) return;
        const issue = imageFileIssue(file);
        if (issue) {
            warning ??= issue;
            return;
        }
        indexes.push(index);
    });
    if (!indexes.length) {
        if (warning) return { action: "reject", ...warning };
        return {
            action: "reject",
            title: "Not an image",
            description: "Choose a PNG, JPEG, GIF, or WebP image.",
        };
    }
    return { action: "image", indexes, ...(warning ? { warning } : {}) };
}
