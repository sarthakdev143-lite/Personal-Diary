import assert from "node:assert/strict";
import { describe, it } from "node:test";

import { isObjectId } from "./ids";
import { buildEntrySearchFilter, diaryCardWhen, diaryFieldsMatch, diaryListAddress, diaryListMatch, diaryListNavigation, diaryMatchPath, diaryReturnAddress, diaryReturnQuery, entriesForQuery, entryCardClock, entryCardPreview, entryListQueryAddress, entryMonthAddress, openedDiaryQuery, entryMatchCount, entryMatchCursor, entryMatchesListQuery, entryFindAddress, entryFromAddress, entryPageAddress, entryShareAddress, escapeRegExp, matchedTextParts, normalizeSearchQuery, openedEntryMonth, openedEntryQuery, textPieceHits, textRunHits, titleCardText } from "./search";
import { calendarDate, diaryFindCountLabel, emptyEntryListMessage, entryFindCountLabel, entriesWithRestored, entryCardQuery, entryFindKeyAction, entryInMonth, entryInstant, entryLayerEscape, entryLinkUrl, entryListSearchText, entryFindMonths, entryMonths, entryPlainText, entrySelectionAction, entryToOpenForFilter, entryToOpenFromLink, entryToOpenWhenHidden, entryToShowAfterDelete, entryToShowByStep, entryToShowOnOpen, entryUndoBody, entryWasRevised, entryWritingChanged, entryWritingText, dropCaretMarker, caretMarkBeside, codeLineKey, codeLeaveRemoval, dateHeadingKey, dateHeadingCommand, dateFormatReach, dateArrow, dateCaretLeave, dateLeaveTarget, dateLineTyping, freshDateLineMarkup, datePaste, dateSelectionKey, formatDiaryDate, formatEntryLong, formatEntryTime, freshEntryHtml, hasEntryContent, boundarySpaceCut, codeGap, codePullKey, codeForwardJoin, codeAhead, codeListNest, codePastItem, codePictureWords, codePullUndoCaret, codeTail, codeLead, codeForwardLead, codeMarkTail, codeTailBack, codeBlockTail, codeQuoteEnd, codeListEnd, codeNextItem, codeNestedItem, codeHeadingEnd, codeHeadingForward, codeDivForward, codeDivLine, codeDivHost, codeDivRest, codeDivNest, codeDivDeep, codeDivSide, codeDivList, codeDivHead, codeLineBreak, codeBackLine, codeListBack, codeQuoteBack, codeDivBack, codeDivJoin, codeBackBreak, codeHeldWords, codeHeldStay, codeWrappedStay, codeHeldCode, codeTableStay, tableLineBack, dividerLineKey, codeQuotedTable, codeQuotedWords, codeQuotedCode, codeQuotedCodeWords, codeQuotedDivider, codeQuotedPicture, codeNestedCode, codeNestedHeld, codeShellTable, codeShellDivider, codeShellCode, codeQuoteInline, codeQuoteDiv, codeItemLine, codeHeadingLine, codeInnerLine, codeNextBlock, codeBreakLine, codeBlankBreak, codePriorItem, codeHostItem, codeBreakLead, codeDeepHost, codeListLead, codeBeside, codeInside, codeAfterHost, codeShellLead, codeEdgeLead, codePictureLead, codeTableLead, codeTableHost, codeListHost, codePictureHost, codeDividerHost, codeQuoteHost, codeDividerLead, codeDivLead, codeQuoteShell, codeQuoteLead, dividerCaret, headingEnterKey, headingSplitUndo, splitSpace, blankUndoCaret, joinUndoCaret, typedQuoteUndoCaret, quoteItalicKey, styleStartType, linkEdgeType, plainMarkSpaces, plainSpacesAfterMarks, styleEdgeCut, styleShortcut, styleUndoCaret, formatUndoCommand, replacedSelectionUndo, dragSelectionUndo, pasteSelectionUndo, selectionCutUndo, selectionDeleteUndo, selectionEnterUndo, selectionTypeUndo, styledLine, wordDeleteSpan, wordLeadSpan, wordDeleteGap, cutRemoval, wordGapInsert, wordGapKey, wordGapSpace, stickyUndo, stickyTyped, typedRedo, styledLineUndoCaret, styledPunctuation, styledSpace, blockBesideJoin, itemBlockJoin, breakJoinSpace, joinGap, joinNeedsSpace, laterEntryTime, lineJoinKey, quoteLineEdge, quoteJoinTarget, quotePictureJoin, quoteTrailingLeave, quoteListTail, quoteAfterList, breakJoinKey, breakUndoMark, listCommand, listUndoCaret, listEdgeKey, listIndentKey, sameEditingPage, savedRedo, undoButton, listLeaveKey, nestedListJoinKey, nestedEnterKey, listLeavePlace, listEnterKey, orderedItemNumber, quoteEnterKey, quoteLeaveKey, quoteCoveredBlocks, quoteCoveredReach, quoteBreakBlock, quoteTouchedBlocks, quoteListPortion, quoteListPlan, breakHeadingAcross, writingHeadingAcross, quotedListLift, nestedListLeave, listHeading, listHeadingPicture, pictureListChange, pictureListReach, listReachBlock, pictureCodeList, pictureTableList, pictureStyle, pictureStyleHold, pictureStyleSeat, pictureLineItalic, pictureLinkField, listHeadingAcross, listBlock, listLineSpace, listBlockPlace, pictureBlockEnds, pictureItemSpan, listBlockNumbers, quoteListAgain, quotedListJoinValue, keptListNumber, listLineLeaves, quoteToggle, italicInQuote, linkUnderline, linkUnderlineShown, linkUnderlineKey, deletedStrike, deletedStrikeShown, deletedStrikeKey, separateGluedDateHeading, monthForSavedEntry, monthKey, monthLabel, nextEntryRevision, retitleEntryDate, calendarDateFromLabel, dateFieldAfterEdit, dateRetitleAction, showOpenEntry, storedPlainText, wordCount } from "./text";import { compareDiaries, compareDiaryMatches } from "./order";import { appliedPin, pinFailureMessage } from "./pin";
import {
    normalizeDescription,
    normalizePinned,
    normalizeTheme,
    normalizeThemeUpdate,
    normalizeTitle,
    parseEntryDate,
} from "./validation";
import { prepareEntryContent, presentEntry } from "./content";
import { codeBlockHtml } from "./markup";
import { buildDiaryExport, diaryToMarkdown, entryShareMarkdown, exportFilename, htmlToMarkdown } from "./export";
import { readJsonBody } from "./json";
import { CONTENT_MAX, DEFAULT_DIARY_THEME, MAX_DATA_IMAGE_LENGTH, coverForTheme } from "./constants";

describe("pinned diaries", () => {
    it("puts a pinned diary ahead of a newer unpinned diary", () => {
        const olderPinned = {
            id: "older",
            pinned: true,
            updatedAt: "2026-01-01T00:00:00.000Z",
            createdAt: "2026-01-01T00:00:00.000Z",
        };
        const newerOpen = {
            id: "newer",
            pinned: false,
            updatedAt: "2026-06-01T00:00:00.000Z",
            createdAt: "2026-06-01T00:00:00.000Z",
        };

        assert.ok(compareDiaries(olderPinned, newerOpen) < 0);
        assert.deepEqual(
            [newerOpen, olderPinned].sort(compareDiaries).map((diary) => diary.id),
            ["older", "newer"],
        );
    });

    it("treats a missing pin as not pinned", () => {
        const pinned = {
            id: "pinned",
            pinned: true,
            updatedAt: "2026-01-01T00:00:00.000Z",
            createdAt: "2026-01-01T00:00:00.000Z",
        };
        const missing = {
            id: "missing",
            updatedAt: "2026-06-01T00:00:00.000Z",
            createdAt: "2026-06-01T00:00:00.000Z",
        };
        const explicit = {
            id: "open",
            pinned: false,
            updatedAt: "2026-03-01T00:00:00.000Z",
            createdAt: "2026-03-01T00:00:00.000Z",
        };

        assert.deepEqual(
            [explicit, missing, pinned].sort(compareDiaries).map((diary) => diary.id),
            ["pinned", "missing", "open"],
        );
    });

    it("keeps the newer update first when neither diary is pinned", () => {
        const createdEarlier = {
            id: "earlier",
            pinned: false,
            updatedAt: "2026-05-01T00:00:00.000Z",
            createdAt: "2026-01-01T00:00:00.000Z",
        };
        const createdLater = {
            id: "later",
            updatedAt: "2026-05-01T00:00:00.000Z",
            createdAt: "2026-04-01T00:00:00.000Z",
        };
        const updatedLater = {
            id: "updated",
            updatedAt: "2026-08-01T00:00:00.000Z",
            createdAt: "2026-01-01T00:00:00.000Z",
        };

        assert.deepEqual(
            [createdEarlier, createdLater, updatedLater].sort(compareDiaries).map((diary) => diary.id),
            ["updated", "later", "earlier"],
        );
        assert.deepEqual(
            [createdEarlier, createdLater, updatedLater].sort(compareDiaryMatches).map((diary) => diary.id),
            ["updated", "later", "earlier"],
        );
    });

    it("puts the newer matching note ahead of a diary that was saved later", () => {
        const savedLater = {
            id: "saved-later",
            pinned: false,
            updatedAt: "2026-11-15T00:00:00.000Z",
            createdAt: "2026-01-01T00:00:00.000Z",
            matchAt: "2026-02-02T15:00:00.000Z",
        };
        const newerNote = {
            id: "newer-note",
            pinned: false,
            updatedAt: "2026-06-01T00:00:00.000Z",
            createdAt: "2026-01-01T00:00:00.000Z",
            matchAt: "2026-11-14T09:30:00.000Z",
        };
        const pinnedOlder = { ...savedLater, id: "pinned-older", pinned: true };
        const title = {
            id: "title",
            pinned: false,
            updatedAt: "2026-11-15T00:00:00.000Z",
            createdAt: "2026-01-01T00:00:00.000Z",
            matchAt: null,
        };

        assert.deepEqual(
            [savedLater, newerNote].sort(compareDiaryMatches).map((diary) => diary.id),
            ["newer-note", "saved-later"],
        );
        assert.deepEqual(
            [newerNote, pinnedOlder].sort(compareDiaryMatches).map((diary) => diary.id),
            ["pinned-older", "newer-note"],
        );
        assert.deepEqual(
            [newerNote, title].sort(compareDiaryMatches).map((diary) => diary.id),
            ["title", "newer-note"],
        );
    });

    it("accepts a boolean pin and rejects anything else", () => {
        assert.deepEqual(normalizePinned(true), { ok: true, value: true });
        assert.deepEqual(normalizePinned(false), { ok: true, value: false });
        assert.equal(normalizePinned("true").ok, false);
        assert.equal(normalizePinned(1).ok, false);
        assert.equal(normalizePinned(null).ok, false);
    });

    it("keeps the diary date when a pin is saved and names a failed pin", () => {
        const diary = { title: "Cedar Notes", pinned: false, updatedAt: "2026-01-02T00:00:00.000Z" };
        assert.deepEqual(appliedPin(diary, { pinned: true, updatedAt: "2026-01-02T00:00:00.000Z" }, true), {
            title: "Cedar Notes",
            pinned: true,
            updatedAt: "2026-01-02T00:00:00.000Z",
        });
        assert.equal(appliedPin(diary, null, true).pinned, true);
        assert.equal(pinFailureMessage({ error: "Diary not found" }), "Diary not found");
        assert.equal(pinFailureMessage(null), "Could not change the pin.");
        assert.equal(pinFailureMessage({}), "Could not change the pin.");
    });
});

describe("blank entry", () => {
    it("opens with the date and nothing to save yet", () => {
        const written = new Date(2026, 10, 14, 15, 4);
        const html = freshEntryHtml(written.toISOString());
        assert.equal(html, `<h2>${formatEntryLong(written.toISOString())}</h2><p><br></p>`);
        const label = formatEntryLong(written.toISOString());
        assert.equal(separateGluedDateHeading(`<h2>${label}Kept</h2>`), `<h2>${label}</h2><p>Kept</p>`);
        assert.equal(separateGluedDateHeading(`<h2>${label}</h2><p>Hello</p>`), `<h2>${label}</h2><p>Hello</p>`);
        assert.equal(separateGluedDateHeading("<h2>Notaday, November 14, 2026</h2><p>Kept</p>"), "<h2>Notaday, November 14, 2026</h2><p>Kept</p>");
        const plain = { altKey: false, ctrlKey: false, metaKey: false };
        assert.equal(dateHeadingKey({ ...plain, key: "K", where: "heading" }), "write");
        assert.equal(dateHeadingKey({ ...plain, key: "Enter", where: "heading" }), "write");
        assert.equal(dateHeadingKey({ ...plain, key: "Backspace", where: "heading" }), "leave");
        assert.equal(dateHeadingKey({ ...plain, key: "Delete", where: "heading" }), "leave");
        assert.equal(dateHeadingKey({ ...plain, key: "Delete", ctrlKey: true, where: "heading" }), "leave");
        assert.equal(dateHeadingKey({ ...plain, key: "Backspace", ctrlKey: true, where: "heading" }), "leave");
        assert.equal(dateHeadingKey({ ...plain, key: "Delete", metaKey: true, where: "heading" }), "leave");
        assert.equal(dateHeadingKey({ ...plain, key: "Backspace", metaKey: true, where: "heading" }), "leave");
        assert.equal(dateHeadingKey({ ...plain, key: "Delete", altKey: true, where: "heading" }), "pass");
        assert.equal(dateHeadingKey({ ...plain, key: "Backspace", ctrlKey: true, where: "after", atStart: true }), "hold");
        assert.equal(dateHeadingKey({ ...plain, key: "Delete", ctrlKey: true, where: "after", atStart: true, empty: true, followed: true }), "drop");
        assert.equal(dateHeadingKey({ ...plain, key: "Backspace", where: "after", atStart: true }), "hold");
        assert.equal(dateHeadingKey({ ...plain, key: "Backspace", where: "after", atStart: true, empty: true, followed: true }), "drop");
        assert.equal(dateHeadingKey({ ...plain, key: "Delete", where: "after", atStart: true, empty: true, followed: true }), "drop");
        assert.equal(dateHeadingKey({ ...plain, key: "Backspace", where: "after", atStart: true, empty: true }), "hold");
        assert.equal(dateHeadingKey({ ...plain, key: "Backspace", where: "after", atStart: true, empty: false, followed: true }), "hold");
        assert.equal(dateHeadingKey({ ...plain, key: "Delete", where: "after", atStart: true, empty: true }), "hold");
        assert.equal(dateHeadingKey({ ...plain, key: "Delete", where: "after", atStart: true, empty: false }), "pass");
        assert.equal(dateHeadingKey({ ...plain, key: "Backspace", where: "after", atStart: false }), "pass");
        assert.equal(dateHeadingKey({ ...plain, key: "k", ctrlKey: true, where: "heading" }), "pass");
        assert.equal(dateHeadingKey({ ...plain, key: "b", ctrlKey: true, where: "heading" }), "hold");
        assert.equal(dateHeadingCommand("undo", true), "run");
        assert.equal(dateHeadingCommand("redo", true), "run");
        assert.equal(dateHeadingCommand("bold", true), "hold");
        assert.equal(dateHeadingCommand("bold", false), "run");
        assert.equal(dateFormatReach({ command: "formatBlock", touchesDate: true, onlyDate: false }), "writing");
        assert.equal(dateFormatReach({ command: "insertUnorderedList", touchesDate: true, onlyDate: false }), "writing");
        assert.equal(dateFormatReach({ command: "insertHTML", touchesDate: true, onlyDate: false }), "writing");
        assert.equal(dateFormatReach({ command: "formatBlock", touchesDate: true, onlyDate: true }), "hold");
        assert.equal(dateFormatReach({ command: "undo", touchesDate: true, onlyDate: true }), "run");
        assert.equal(dateFormatReach({ command: "redo", touchesDate: true, onlyDate: false }), "run");
        assert.equal(dateFormatReach({ command: "bold", touchesDate: false, onlyDate: false }), "run");
        assert.equal(dateLineTyping({ writing: true, peeled: false, paragraph: true }), "new-line");
        assert.equal(dateLineTyping({ writing: false, peeled: false, paragraph: true }), "into-line");
        assert.equal(dateLineTyping({ writing: true, peeled: true, paragraph: true }), "into-line");
        assert.equal(dateLineTyping({ writing: false, peeled: false, paragraph: false }), "new-line");
        assert.equal(dateLineTyping({ writing: true, peeled: true, paragraph: false }), "into-line");
        assert.equal(dateLeaveTarget("P"), "into");
        assert.equal(dateLeaveTarget("UL"), "into");
        assert.equal(dateLeaveTarget("FIGURE"), "past");
        assert.equal(dateLeaveTarget("IMG"), "past");
        assert.equal(dateLeaveTarget("HR"), "past");
        const arrow = { where: "heading" as const, atEnd: true, next: "past" as const };
        assert.equal(dateArrow({ ...arrow, key: "ArrowRight" }), "past");
        assert.equal(dateArrow({ ...arrow, key: "ArrowDown", atEnd: false }), "past");
        assert.equal(dateArrow({ ...arrow, key: "ArrowRight", atEnd: false }), "pass");
        assert.equal(dateArrow({ ...arrow, key: "ArrowRight", next: "into" }), "pass");
        assert.equal(dateArrow({ ...arrow, key: "ArrowLeft" }), "pass");
        assert.equal(dateArrow({ ...arrow, key: "ArrowRight", shiftKey: true }), "pass");
        assert.equal(dateArrow({ ...arrow, key: "ArrowDown", where: "after" }), "pass");
        assert.equal(dateCaretLeave({ inHeading: true, exact: true, next: "past" }), "past");
        assert.equal(dateCaretLeave({ inHeading: true, exact: true, next: "into" }), "into");
        assert.equal(dateCaretLeave({ inHeading: true, exact: false, next: "past" }), "peel");
        assert.equal(dateCaretLeave({ inHeading: false, exact: true, next: "past" }), "stay");
        assert.equal(freshDateLineMarkup("H", "<p>Kept the lantern.</p>"), "<p>H</p><p>Kept the lantern.</p>");
        assert.equal(freshDateLineMarkup("<", "<p>Kept</p>"), "<p>&lt;</p><p>Kept</p>");
        assert.equal(datePaste({ touchesDate: false, onlyDate: false }), "pass");
        assert.equal(datePaste({ touchesDate: true, onlyDate: true }), "writing");
        assert.equal(datePaste({ touchesDate: true, onlyDate: false }), "replace-writing");
        const selected = { ...plain, collapsed: false, touchesDate: true, writingSelected: true };
        assert.equal(dateSelectionKey({ ...selected, key: "Backspace" }), "clear");
        assert.equal(dateSelectionKey({ ...selected, key: "Delete" }), "clear");
        assert.equal(dateSelectionKey({ ...selected, key: "Backspace", writingSelected: false }), "leave");
        assert.equal(dateSelectionKey({ ...selected, key: "Delete", writingSelected: false }), "leave");
        assert.equal(dateSelectionKey({ ...selected, key: "Backspace", collapsed: true }), "pass");
        assert.equal(dateSelectionKey({ ...selected, key: "Backspace", touchesDate: false }), "pass");
        assert.equal(dateSelectionKey({ ...selected, key: "Backspace", ctrlKey: true }), "clear");
        assert.equal(dateSelectionKey({ ...selected, key: "Delete", ctrlKey: true }), "clear");
        assert.equal(dateSelectionKey({ ...selected, key: "Backspace", metaKey: true }), "clear");
        assert.equal(dateSelectionKey({ ...selected, key: "Delete", metaKey: true }), "clear");
        assert.equal(dateSelectionKey({ ...selected, key: "Backspace", ctrlKey: true, writingSelected: false }), "leave");
        assert.equal(dateSelectionKey({ ...selected, key: "Backspace", altKey: true }), "pass");
        assert.equal(dateSelectionKey({ ...selected, key: "Delete", altKey: true }), "pass");
        assert.equal(dateSelectionKey({ ...selected, key: "S" }), "type");
        assert.equal(dateSelectionKey({ ...selected, key: "S", writingSelected: false }), "type");
        assert.equal(dateSelectionKey({ ...selected, key: "Enter" }), "type");
        assert.equal(dateSelectionKey({ ...selected, key: "Enter", writingSelected: false }), "type");
        assert.equal(dateSelectionKey({ ...selected, key: "S", ctrlKey: true }), "pass");
        assert.equal(dateSelectionKey({ ...selected, key: "ArrowLeft" }), "pass");
        assert.equal(dateHeadingKey({ ...plain, key: "i", metaKey: true, where: "heading" }), "hold");
        assert.equal(hasEntryContent(html), false);
    });
});

describe("code block", () => {
    it("starts empty so the placeholder is not saved", () => {
        const html = codeBlockHtml();
        assert.equal(html.includes("code here"), false);
        assert.match(html, /<pre><code data-fresh="true"><br><\/code><\/pre>/);
    });

    it("closes the blank line a code block leaves in front of the rest of a line", () => {
        assert.equal(codeGap({ emptyLine: true, nextBlock: true }), "close");
        assert.equal(codeGap({ emptyLine: true, nextBlock: false }), "stay");
        assert.equal(codeGap({ emptyLine: false, nextBlock: true }), "stay");
    });

    it("brings the first line of code up to the line above", () => {
        const start = { key: "Backspace", collapsed: true, atStart: true, atEnd: false, neighbor: "text" as const };
        assert.equal(codePullKey(start), "pull");
        assert.equal(codePullKey({ ...start, atStart: false }), "pass");
        assert.equal(codePullKey({ ...start, neighbor: "none" }), "pass");
        assert.equal(codePullKey({ ...start, collapsed: false }), "pass");
        assert.equal(codePullKey({ ...start, shiftKey: true }), "pass");
        assert.equal(codePullKey({ ...start, ctrlKey: true }), "pull");
        assert.equal(codePullKey({ ...start, metaKey: true }), "pull");
        assert.equal(codePullKey({ ...start, ctrlKey: true, atStart: false }), "pass");
        assert.equal(codePullKey({ key: "Delete", collapsed: true, atStart: false, atEnd: true, neighbor: "code" }), "pull");
        assert.equal(codePullKey({ key: "Delete", collapsed: true, atStart: false, atEnd: true, neighbor: "text" }), "pass");
        const intoCode = { key: "Delete", collapsed: true, atEnd: true, next: "writing" as const };
        assert.equal(codeForwardJoin(intoCode), "line");
        assert.equal(codeForwardJoin({ ...intoCode, next: "list" }), "line");
        assert.equal(codeForwardJoin({ ...intoCode, next: "quote" }), "line");
        assert.equal(codeForwardJoin({ ...intoCode, next: "code" }), "line");
        assert.equal(codeForwardJoin({ ...intoCode, next: "none" }), "pass");
        assert.equal(codeForwardJoin({ ...intoCode, atEnd: false }), "pass");
        assert.equal(codeForwardJoin({ ...intoCode, collapsed: false }), "pass");
        assert.equal(codeForwardJoin({ ...intoCode, key: "Backspace" }), "pass");
        assert.equal(codeForwardJoin({ ...intoCode, shiftKey: true }), "pass");
        assert.equal(codeForwardJoin({ ...intoCode, ctrlKey: true }), "line");
        assert.equal(codeForwardJoin({ ...intoCode, metaKey: true }), "line");
        assert.equal(codeForwardJoin({ ...intoCode, ctrlKey: true, atEnd: false }), "pass");
        assert.equal(codeForwardJoin({ ...intoCode, altKey: true }), "pass");
        assert.equal(codeListNest({ nested: true }), "keep");
        assert.equal(codeListNest({ nested: false }), "drop");
        assert.equal(codePastItem({ host: "item" }), "out");
        assert.equal(codePastItem({ host: "list" }), "out");
        assert.equal(codePastItem({ host: "other" }), "stay");
        assert.equal(codePictureWords({ before: true }), "words");
        assert.equal(codePictureWords({ before: false }), "pass");
        assert.equal(codeAhead({ code: true, wordsBefore: false }), "code");
        assert.equal(codeAhead({ code: true, wordsBefore: true }), "words");
        assert.equal(codeAhead({ code: false, wordsBefore: true }), "pass");
        assert.equal(codeAhead({ code: false, wordsBefore: false }), "pass");
        assert.equal(codeTail({ text: true }), "line");
        assert.equal(codeTail({ text: false }), "pass");
        assert.equal(codeLead({ words: true }), "pull");
        assert.equal(codeLead({ words: false }), "pass");
        assert.equal(codeForwardLead({ words: true }), "pull");
        assert.equal(codeForwardLead({ words: false }), "pass");
        assert.equal(codeMarkTail({ mark: true }), "space");
        assert.equal(codeMarkTail({ mark: false }), "keep");
        assert.equal(codeTailBack({ tail: true }), "pull");
        assert.equal(codeTailBack({ tail: false }), "pass");
        assert.equal(codeBlockTail({ block: true }), "pull");
        assert.equal(codeBlockTail({ block: false }), "pass");
        assert.equal(codeQuoteEnd({ quote: true }), "pull");
        assert.equal(codeQuoteEnd({ quote: false }), "pass");
        assert.equal(codeListEnd({ list: true }), "pull");
        assert.equal(codeListEnd({ list: false }), "pass");
        assert.equal(codeNextItem({ item: true }), "pull");
        assert.equal(codeNextItem({ item: false }), "pass");
        assert.equal(codeNestedItem({ nested: true }), "pull");
        assert.equal(codeNestedItem({ nested: false }), "pass");
        assert.equal(codeHeadingEnd({ heading: true }), "pull");
        assert.equal(codeHeadingEnd({ heading: false }), "pass");
        assert.equal(codeHeadingForward({ heading: true }), "line");
        assert.equal(codeHeadingForward({ heading: false }), "pass");
        assert.equal(codeDivForward({ block: true }), "line");
        assert.equal(codeDivForward({ block: false }), "pass");
        assert.equal(codeDivLine({ block: true }), "line");
        assert.equal(codeDivLine({ block: false }), "pass");
        assert.equal(codeDivHost({ host: true }), "line");
        assert.equal(codeDivHost({ host: false }), "pass");
        assert.equal(codeDivRest({ rest: true }), "line");
        assert.equal(codeDivRest({ rest: false }), "pass");
        assert.equal(codeDivNest({ nest: true }), "line");
        assert.equal(codeDivNest({ nest: false }), "pass");
        assert.equal(codeDivDeep({ deep: true }), "line");
        assert.equal(codeDivDeep({ deep: false }), "pass");
        assert.equal(codeDivSide({ side: true }), "line");
        assert.equal(codeDivSide({ side: false }), "pass");
        assert.equal(codeDivList({ list: true }), "line");
        assert.equal(codeDivList({ list: false }), "pass");
        assert.equal(codeDivHead({ head: true }), "line");
        assert.equal(codeDivHead({ head: false }), "pass");
        assert.equal(codeLineBreak({ line: true }), "line");
        assert.equal(codeLineBreak({ line: false }), "pass");
        assert.equal(codeBackLine({ back: true }), "line");
        assert.equal(codeBackLine({ back: false }), "pass");
        assert.equal(codeListBack({ item: true }), "line");
        assert.equal(codeListBack({ item: false }), "pass");
        assert.equal(codeQuoteBack({ quote: true }), "line");
        assert.equal(codeQuoteBack({ quote: false }), "pass");
        assert.equal(codeDivBack({ line: true }), "line");
        assert.equal(codeDivBack({ line: false }), "pass");
        assert.equal(codeDivJoin({ line: true }), "line");
        assert.equal(codeDivJoin({ line: false }), "pass");
        assert.equal(codeBackBreak({ broken: true }), "line");
        assert.equal(codeBackBreak({ broken: false }), "pass");
        assert.equal(codeHeldWords({ held: true }), "words");
        assert.equal(codeHeldWords({ held: false }), "pass");
        assert.equal(codeHeldStay({ held: true }), "stay");
        assert.equal(codeHeldStay({ held: false }), "pass");
        assert.equal(codeWrappedStay({ wrapped: true }), "stay");
        assert.equal(codeWrappedStay({ wrapped: false }), "pass");
        assert.equal(codeHeldCode({ held: true }), "line");
        assert.equal(codeHeldCode({ held: false }), "pass");
        assert.equal(codeTableStay({ table: true }), "stay");
        assert.equal(codeTableStay({ table: false }), "pass");
        assert.equal(tableLineBack({ atStart: true, table: true, empty: false }), "cell");
        assert.equal(tableLineBack({ atStart: true, table: true, empty: true }), "pass");
        assert.equal(tableLineBack({ atStart: false, table: true, empty: false }), "pass");
        assert.equal(tableLineBack({ atStart: true, table: false, empty: false }), "pass");
        assert.equal(tableLineBack({ atStart: true, table: true, empty: false, word: true }), "cell");
        assert.equal(tableLineBack({ atStart: false, table: true, empty: false, word: true }), "pass");
        assert.equal(codeQuotedTable({ quoted: true }), "stay");
        assert.equal(codeQuotedTable({ quoted: false }), "pass");
        assert.equal(codeQuotedWords({ quoted: true }), "words");
        assert.equal(codeQuotedWords({ quoted: false }), "pass");
        assert.equal(codeQuotedCode({ quoted: true }), "line");
        assert.equal(codeQuotedCode({ quoted: false }), "pass");
        assert.equal(codeQuotedCodeWords({ quoted: true }), "words");
        assert.equal(codeQuotedCodeWords({ quoted: false }), "pass");
        assert.equal(codeQuotedDivider({ quoted: true }), "words");
        assert.equal(codeQuotedDivider({ quoted: false }), "pass");
        assert.equal(codeQuotedPicture({ picture: true }), "stay");
        assert.equal(codeQuotedPicture({ picture: false }), "pass");
        assert.equal(codeNestedCode({ nested: true }), "words");
        assert.equal(codeNestedCode({ nested: false }), "pass");
        assert.equal(codeNestedHeld({ nested: true }), "words");
        assert.equal(codeNestedHeld({ nested: false }), "pass");
        assert.equal(codeShellTable({ table: true, words: false }), "stay");
        assert.equal(codeShellTable({ table: true, words: true }), "words");
        assert.equal(codeShellTable({ table: false, words: false }), "pass");
        assert.equal(codeShellDivider({ divider: true, words: true }), "words");
        assert.equal(codeShellDivider({ divider: true, words: false }), "stay");
        assert.equal(codeShellDivider({ divider: false, words: false }), "pass");
        assert.equal(codeShellCode({ code: true, words: false }), "line");
        assert.equal(codeShellCode({ code: true, words: true }), "words");
        assert.equal(codeShellCode({ code: false, words: false }), "pass");
        assert.equal(codeQuoteInline({ inline: true }), "words");
        assert.equal(codeQuoteInline({ inline: false }), "pass");
        assert.equal(codeQuoteDiv({ div: true }), "line");
        assert.equal(codeQuoteDiv({ div: false }), "pass");
        assert.equal(codeItemLine({ line: true }), "words");
        assert.equal(codeItemLine({ line: false }), "pass");
        assert.equal(codeHeadingLine({ line: true }), "words");
        assert.equal(codeHeadingLine({ line: false }), "pass");
        assert.equal(codeInnerLine({ inner: true }), "words");
        assert.equal(codeInnerLine({ inner: false }), "pass");
        assert.equal(codeNextBlock({ block: true }), "words");
        assert.equal(codeNextBlock({ block: false }), "pass");
        assert.equal(codeBreakLine({ broken: true }), "line");
        assert.equal(codeBreakLine({ broken: false }), "pass");
        assert.equal(codeBlankBreak({ blank: true }), "drop");
        assert.equal(codeBlankBreak({ blank: false }), "pass");
        assert.equal(codePriorItem({ item: true }), "pull");
        assert.equal(codePriorItem({ item: false }), "pass");
        assert.equal(codeHostItem({ host: true }), "pull");
        assert.equal(codeHostItem({ host: false }), "pass");
        assert.equal(codeBreakLead({ words: true }), "pull");
        assert.equal(codeBreakLead({ words: false }), "pass");
        assert.equal(codeDeepHost({ host: true }), "pull");
        assert.equal(codeDeepHost({ host: false }), "pass");
        assert.equal(codeListLead({ block: true }), "pull");
        assert.equal(codeListLead({ block: false }), "pass");
        assert.equal(codeBeside({ code: true }), "line");
        assert.equal(codeBeside({ code: false }), "pass");
        assert.equal(codeInside({ code: true }), "line");
        assert.equal(codeInside({ code: false }), "pass");
        assert.equal(codeAfterHost({ words: true }), "pull");
        assert.equal(codeAfterHost({ words: false }), "pass");
        assert.equal(codeShellLead({ shell: true }), "pull");
        assert.equal(codeShellLead({ shell: false }), "pass");
        assert.equal(codeEdgeLead({ edge: true }), "pull");
        assert.equal(codeEdgeLead({ edge: false }), "pass");
        assert.equal(codePictureLead({ picture: true }), "pull");
        assert.equal(codePictureLead({ picture: false }), "pass");
        assert.equal(codeTableLead({ table: true }), "pull");
        assert.equal(codeTableLead({ table: false }), "pass");
        assert.equal(codeTableHost({ table: true }), "pull");
        assert.equal(codeTableHost({ table: false }), "pass");
        assert.equal(codeListHost({ list: true }), "pull");
        assert.equal(codeListHost({ list: false }), "pass");
        assert.equal(codePictureHost({ picture: true }), "pull");
        assert.equal(codePictureHost({ picture: false }), "pass");
        assert.equal(codeDividerHost({ divider: true }), "pull");
        assert.equal(codeDividerHost({ divider: false }), "pass");
        assert.equal(codeQuoteHost({ quote: true }), "pull");
        assert.equal(codeQuoteHost({ quote: false }), "pass");
        assert.equal(codeDividerLead({ divider: true }), "pull");
        assert.equal(codeDividerLead({ divider: false }), "pass");
        assert.equal(codeDivLead({ block: true }), "pull");
        assert.equal(codeDivLead({ block: false }), "pass");
        assert.equal(codeQuoteShell({ blank: true }), "close");
        assert.equal(codeQuoteShell({ blank: false }), "keep");
        assert.equal(codeQuoteLead({ leading: true }), "code");
        assert.equal(codeQuoteLead({ leading: false }), "pass");
        assert.equal(codePullKey({ key: "Backspace", collapsed: true, atStart: true, atEnd: false, neighbor: "code" }), "pull");
        assert.equal(codePullKey({ key: "Backspace", collapsed: true, atStart: false, atEnd: false, neighbor: "code" }), "pass");
        assert.equal(codePullKey({ key: "Delete", collapsed: true, atStart: false, atEnd: false, neighbor: "code" }), "pass");
        assert.equal(headingSplitUndo({ saved: { before: "<p>Harbor</p><pre><code>const a = 1;</code></pre>", after: "<p>Harbor const a = 1;</p>" }, current: "<p>Harbor const a = 1;</p>" }), "restore");
        assert.equal(codePullUndoCaret(4), 4);
        assert.equal(codePullUndoCaret(0), 0);
        assert.equal(codePullUndoCaret(null), null);
        assert.equal(codePullUndoCaret(-1), null);
    });

    it("starts the next line when Enter is pressed in the code", () => {
        const typing = { key: "Enter", inCode: true, collapsed: true, blankLine: false, trailing: true };
        assert.equal(codeLineKey(typing), "newline");
        assert.equal(codeLineKey({ ...typing, blankLine: true, trailing: false }), "newline");
        assert.equal(codeLineKey({ ...typing, blankLine: true, trailing: true }), "leave");
        assert.equal(codeLineKey({ ...typing, inCode: false }), "pass");
        assert.equal(codeLineKey({ ...typing, key: "a" }), "pass");
        assert.equal(codeLineKey({ ...typing, ctrlKey: true }), "pass");
        assert.equal(codeLeaveRemoval(""), true);
        assert.equal(codeLeaveRemoval("\n\u200b"), true);
        assert.equal(codeLeaveRemoval("const a = 1;"), false);
        assert.equal(headingSplitUndo({ saved: { before: "<pre><code>\n</code></pre>", after: "<p><br></p>" }, current: "<p><br></p>" }), "restore");
    });

    it("keeps a list on its own line", () => {
        assert.equal(listCommand("insertUnorderedList"), "lift");
        assert.equal(listCommand("insertOrderedList"), "lift");
        assert.equal(listCommand("bold"), "pass");
        assert.equal(listCommand("formatBlock"), "pass");
        assert.equal(listUndoCaret(11), 11);
        assert.equal(listUndoCaret(0), 0);
        assert.equal(listUndoCaret(null), null);
        assert.equal(listUndoCaret(-1), null);
        const edge = { key: "Backspace", collapsed: true, atStart: true, inItem: true, neighbor: "date" as const };
        assert.equal(listEdgeKey(edge), "outdent");
        assert.equal(listEdgeKey({ ...edge, neighbor: "none" }), "outdent");
        assert.equal(listEdgeKey({ ...edge, neighbor: "text" }), "pass");
        assert.equal(listEdgeKey({ ...edge, atStart: false }), "pass");
        assert.equal(listEdgeKey({ ...edge, inItem: false }), "pass");
        assert.equal(listEdgeKey({ ...edge, key: "Delete" }), "pass");
        assert.equal(listEdgeKey({ ...edge, ctrlKey: true }), "outdent");
        assert.equal(listEdgeKey({ ...edge, metaKey: true }), "outdent");
        assert.equal(listEdgeKey({ ...edge, neighbor: "none", ctrlKey: true }), "outdent");
        assert.equal(listEdgeKey({ ...edge, neighbor: "text", ctrlKey: true }), "pass");
        assert.equal(listEdgeKey({ ...edge, ctrlKey: true, atStart: false }), "pass");
        assert.equal(listEdgeKey({ ...edge, altKey: true }), "pass");
    });

    it("leaves a list when Enter is pressed on a blank item", () => {
        const blank = { key: "Enter", inItem: true, collapsed: true, empty: true };
        assert.equal(listLeaveKey(blank), "leave");
        assert.equal(listLeaveKey({ ...blank, nested: true }), "outdent");
        const nestedJoin = { key: "Backspace", collapsed: true, atNestedStart: true, atParentEnd: false };
        assert.equal(nestedListJoinKey(nestedJoin), "join");
        assert.equal(nestedListJoinKey({ ...nestedJoin, key: "Delete", atNestedStart: false, atParentEnd: true }), "join");
        assert.equal(nestedListJoinKey({ ...nestedJoin, atNestedStart: false }), "pass");
        assert.equal(nestedListJoinKey({ ...nestedJoin, key: "Delete" }), "pass");
        assert.equal(nestedListJoinKey({ ...nestedJoin, ctrlKey: true }), "join");
        assert.equal(nestedListJoinKey({ ...nestedJoin, metaKey: true }), "join");
        assert.equal(nestedListJoinKey({ ...nestedJoin, key: "Delete", atNestedStart: false, atParentEnd: true, ctrlKey: true }), "join");
        assert.equal(nestedListJoinKey({ ...nestedJoin, ctrlKey: true, atNestedStart: false }), "pass");
        assert.equal(nestedListJoinKey({ ...nestedJoin, altKey: true }), "pass");
        assert.equal(nestedListJoinKey({ ...nestedJoin, collapsed: false }), "pass");
        const nestedEnter = { key: "Enter", collapsed: true, atNestedStart: false, beforeChildList: true };
        assert.equal(nestedEnterKey(nestedEnter), "after");
        assert.equal(nestedEnterKey({ ...nestedEnter, beforeChildList: false, atNestedStart: true }), "line");
        assert.equal(nestedEnterKey({ ...nestedEnter, beforeChildList: true, atNestedStart: true }), "line");
        assert.equal(nestedEnterKey({ ...nestedEnter, beforeChildList: false }), "pass");
        assert.equal(nestedEnterKey({ ...nestedEnter, shiftKey: true }), "pass");
        assert.equal(nestedEnterKey({ ...nestedEnter, collapsed: false }), "pass");
        assert.equal(nestedEnterKey({ ...nestedEnter, key: "a" }), "pass");
        assert.equal(listLeaveKey({ ...blank, nested: false }), "leave");
        assert.equal(listLeaveKey({ ...blank, empty: false }), "pass");
        assert.equal(listLeaveKey({ ...blank, collapsed: false }), "pass");
        assert.equal(listLeaveKey({ ...blank, inItem: false }), "pass");
        assert.equal(listLeaveKey({ ...blank, key: "a" }), "pass");
        assert.equal(listLeaveKey({ ...blank, shiftKey: true }), "pass");
        assert.equal(listLeaveKey({ ...blank, ctrlKey: true }), "pass");
        assert.equal(headingSplitUndo({ saved: { before: "<ul><li>one</li><li><br></li></ul>", after: "<ul><li>one</li></ul><p><br></p>" }, current: "<ul><li>one</li></ul><p><br></p>" }), "restore");
        assert.equal(listLeavePlace({ remaining: false, preceding: false, following: false }), "replace");
        assert.equal(listLeavePlace({ remaining: true, preceding: false, following: true }), "before");
        assert.equal(listLeavePlace({ remaining: true, preceding: true, following: true }), "split");
        assert.equal(listLeavePlace({ remaining: true, preceding: true, following: false }), "after");
        const start = { key: "Enter", inItem: true, collapsed: true, empty: false, atStart: true };
        assert.equal(listEnterKey(start), "above");
        assert.equal(listEnterKey({ ...start, atStart: false }), "pass");
        assert.equal(listEnterKey({ ...start, empty: true }), "pass");
        assert.equal(listEnterKey({ ...start, collapsed: false }), "pass");
        assert.equal(listEnterKey({ ...start, inItem: false }), "pass");
        assert.equal(listEnterKey({ ...start, shiftKey: true }), "pass");
        assert.equal(listEnterKey({ ...start, key: "a" }), "pass");
        assert.equal(orderedItemNumber({ index: 0 }), 1);
        assert.equal(orderedItemNumber({ start: "3", index: 1 }), 4);
        assert.equal(orderedItemNumber({ start: "3", values: ["10"], index: 1 }), 11);
        assert.equal(orderedItemNumber({ start: "nope", index: 2 }), 3);
        assert.equal(orderedItemNumber({ start: "", index: 1 }), 2);
    });

    it("leaves a quote when Enter is pressed on a blank quote", () => {
        const blank = { key: "Enter", inQuote: true, collapsed: true, empty: true };
        assert.equal(quoteLeaveKey(blank), "leave");
        assert.equal(quoteLeaveKey({ ...blank, empty: false }), "pass");
        assert.equal(quoteLeaveKey({ ...blank, collapsed: false }), "pass");
        assert.equal(quoteLeaveKey({ ...blank, inQuote: false }), "pass");
        assert.equal(quoteLeaveKey({ ...blank, key: "a" }), "pass");
        assert.equal(quoteLeaveKey({ ...blank, shiftKey: true }), "pass");
        assert.equal(quoteLeaveKey({ ...blank, ctrlKey: true }), "pass");
        assert.equal(headingSplitUndo({ saved: { before: "<blockquote>Quiet</blockquote><blockquote><br></blockquote>", after: "<blockquote>Quiet</blockquote><p><br></p>" }, current: "<blockquote>Quiet</blockquote><p><br></p>" }), "restore");
    });

    it("keeps each paragraph when several are quoted", () => {
        assert.equal(quoteCoveredBlocks({ covered: 2, consecutive: true }), "together");
        assert.equal(quoteCoveredBlocks({ covered: 3, consecutive: true }), "together");
        assert.equal(quoteCoveredBlocks({ covered: 2, consecutive: false }), "browser");
        assert.equal(quoteCoveredBlocks({ covered: 1, consecutive: true }), "browser");
        assert.equal(quoteCoveredBlocks({ covered: 0, consecutive: true }), "browser");
        assert.equal(quoteTouchedBlocks({ touched: 2, consecutive: true, crossesList: true }), "together");
        assert.equal(quoteTouchedBlocks({ touched: 2, consecutive: true, crossesList: false }), "browser");
        assert.equal(quoteTouchedBlocks({ touched: 2, consecutive: true, crossesList: false, crossesWriting: true }), "together");
        assert.equal(quoteTouchedBlocks({ touched: 2, consecutive: true, crossesList: false, crossesWriting: false }), "browser");
        assert.equal(quoteTouchedBlocks({ touched: 2, consecutive: false, crossesList: false, crossesWriting: true }), "browser");
        assert.equal(quoteTouchedBlocks({ touched: 1, consecutive: true, crossesList: false, crossesWriting: true }), "browser");
        assert.equal(writingHeadingAcross({ crossesWriting: true, across: true }), "lines");
        assert.equal(writingHeadingAcross({ crossesWriting: true, across: false }), "pass");
        assert.equal(writingHeadingAcross({ crossesWriting: false, across: true }), "pass");
        assert.equal(quoteTouchedBlocks({ touched: 1, consecutive: true, crossesList: true }), "browser");
        assert.equal(quoteTouchedBlocks({ touched: 2, consecutive: false, crossesList: true }), "browser");
        assert.equal(quoteCoveredReach({ covered: 2, touched: 2 }), "inside");
        assert.equal(quoteCoveredReach({ covered: 2, touched: 3 }), "beyond");
        assert.equal(quoteCoveredReach({ covered: 1, touched: 3 }), "beyond");
        assert.equal(quoteTouchedBlocks({ touched: 3, consecutive: true, crossesList: false, crossesBreak: true }), "together");
        assert.equal(quoteTouchedBlocks({ touched: 2, consecutive: true, crossesList: false, crossesBreak: false }), "browser");
        assert.equal(quoteTouchedBlocks({ touched: 3, consecutive: false, crossesList: false, crossesBreak: true }), "browser");
        assert.equal(quoteTouchedBlocks({ touched: 1, consecutive: true, crossesList: false, crossesBreak: true }), "browser");
        assert.equal(quoteBreakBlock("figure"), true);
        assert.equal(quoteBreakBlock("FIGURE"), true);
        assert.equal(quoteBreakBlock("hr"), true);
        assert.equal(quoteBreakBlock("pre"), true);
        assert.equal(quoteBreakBlock("p"), false);
        assert.equal(quoteBreakBlock("h2"), false);
        assert.equal(breakHeadingAcross({ crossesBreak: true, across: true }), "lines");
        assert.equal(breakHeadingAcross({ crossesBreak: true, across: false }), "pass");
        assert.equal(breakHeadingAcross({ crossesBreak: false, across: true }), "pass");
        assert.equal(quoteListPortion({ count: 2, from: 0, to: 0 }), "part");
        assert.equal(quoteListPortion({ count: 2, from: 1, to: 1 }), "part");
        assert.equal(quoteListPortion({ count: 3, from: 1, to: 2 }), "part");
        assert.equal(quoteListPortion({ count: 2, from: 0, to: 1 }), "list");
        assert.equal(quoteListPortion({ count: 1, from: 0, to: 0 }), "list");
        assert.equal(quoteListPortion({ count: 2, from: -1, to: 0 }), "skip");
        assert.equal(quoteListPortion({ count: 1, from: 0, to: 1 }), "skip");
    });

    it("keeps a list together when that list is quoted", () => {
        assert.deepEqual(quoteListPlan({ ordered: true, start: "5", count: 3, from: 0, to: 2 }), { action: "wrap" });
        assert.deepEqual(quoteListPlan({ ordered: false, count: 2, from: 0, to: 1 }), { action: "wrap" });
        assert.deepEqual(quoteListPlan({ ordered: true, count: 3, from: 0, to: 0 }), {
            action: "split",
            quoted: { start: null },
            after: { start: 2 },
        });
        assert.deepEqual(quoteListPlan({ ordered: true, count: 3, from: 0, to: 1 }), {
            action: "split",
            quoted: { start: null },
            after: { start: 3 },
        });
        assert.deepEqual(quoteListPlan({ ordered: true, start: "3", count: 3, from: 0, to: 0 }), {
            action: "split",
            quoted: { start: 3 },
            after: { start: 4 },
        });
        assert.deepEqual(quoteListPlan({ ordered: true, count: 4, from: 1, to: 2 }), {
            action: "split",
            quoted: { start: 2 },
            after: { start: 4 },
        });
        assert.deepEqual(quoteListPlan({ ordered: true, count: 3, from: 2, to: 2 }), {
            action: "split",
            quoted: { start: 3 },
            after: null,
        });
        assert.deepEqual(quoteListPlan({ ordered: false, count: 3, from: 1, to: 1 }), {
            action: "split",
            quoted: { start: null },
            after: { start: null },
        });
        assert.deepEqual(quoteListPlan({ ordered: true, start: "3", values: [null, "10", null], count: 3, from: 1, to: 1 }), {
            action: "split",
            quoted: { start: null },
            after: { start: 11 },
        });
        assert.equal(quoteListPlan({ ordered: true, count: 3, from: 2, to: 1 }), null);
        assert.equal(quoteListPlan({ ordered: true, count: 0, from: 0, to: 0 }), null);
    });

    it("keeps a nested list inside the line when that line is quoted", () => {
        const flat = { sameParent: true, startContainsEnd: false, endContainsStart: false, startNested: false, endNested: false };
        assert.equal(quotedListLift(flat), "keep");
        assert.equal(quotedListLift({ ...flat, sameParent: false, startContainsEnd: true, endNested: true }), "keep");
        assert.equal(quotedListLift({ ...flat, sameParent: false, endContainsStart: true, startNested: true }), "keep");
        assert.equal(quotedListLift({ ...flat, sameParent: false, startNested: true }), "lift-start");
        assert.equal(quotedListLift({ ...flat, sameParent: false, endNested: true }), "lift-end");
        assert.equal(quotedListLift({ ...flat, sameParent: false, startNested: true, endNested: true }), "lift-both");
        assert.equal(quotedListLift({ ...flat, sameParent: false }), "stop");
    });

    it("keeps a nested list on its own line when that line leaves the list", () => {
        assert.equal(nestedListLeave({ nested: true, host: "P" }), "lift");
        assert.equal(nestedListLeave({ nested: true, host: "H1" }), "lift");
        assert.equal(nestedListLeave({ nested: true, host: "H2" }), "lift");
        assert.equal(nestedListLeave({ nested: true, host: "H3" }), "lift");
        assert.equal(nestedListLeave({ nested: true, host: "LI" }), "keep");
        assert.equal(nestedListLeave({ nested: true, host: "BLOCKQUOTE" }), "keep");
        assert.equal(nestedListLeave({ nested: false, host: "P" }), "keep");
    });

    it("leaves a list line that holds a picture when that list is chosen again", () => {
        assert.equal(pictureListChange({ inList: true, hasPicture: true, sameKind: true }), "leave");
        assert.equal(pictureListChange({ inList: true, hasPicture: true, sameKind: false }), "switch");
        assert.equal(pictureListChange({ inList: true, hasPicture: false, sameKind: true }), "skip");
        assert.equal(pictureListChange({ inList: false, hasPicture: true, sameKind: false }), "skip");
    });

    it("leaves a table beside the picture when a list runs into it", () => {
        assert.equal(pictureTableList({ inList: true, inTable: true, hasPicture: true }), "beside");
        assert.equal(pictureTableList({ inList: true, inTable: true, hasPicture: false }), "skip");
        assert.equal(pictureTableList({ inList: true, inTable: false, hasPicture: true }), "skip");
        assert.equal(pictureTableList({ inList: false, inTable: true, hasPicture: true }), "skip");
    });

    it("leaves a code block beside the picture when a list runs into it", () => {
        assert.equal(pictureCodeList({ inList: true, inCode: true, hasPicture: true }), "beside");
        assert.equal(pictureCodeList({ inList: true, inCode: true, hasPicture: false }), "skip");
        assert.equal(pictureCodeList({ inList: true, inCode: false, hasPicture: true }), "skip");
        assert.equal(pictureCodeList({ inList: false, inCode: true, hasPicture: true }), "skip");
    });

    it("sets a picture aside when a style runs across it", () => {
        assert.equal(pictureStyleHold({ containsEdge: false }), "aside");
        assert.equal(pictureStyleHold({ containsEdge: true }), "inside");
    });

    it("keeps a picture in the line when a style runs across the words beside it", () => {
        assert.equal(pictureStyleSeat({ inlineSibling: true }), "line");
        assert.equal(pictureStyleSeat({ inlineSibling: false }), "between");
    });

    it("italicizes the words beside a picture in a quote", () => {
        assert.equal(pictureLineItalic({ inQuote: true, covered: false }), "mark");
        assert.equal(pictureLineItalic({ inQuote: true, covered: true }), "clear");
        assert.equal(pictureLineItalic({ inQuote: false, covered: false }), "browser");
        assert.equal(pictureLineItalic({ inQuote: false, covered: true }), "browser");
    });

    it("links the words beside a picture and leaves the picture name alone", () => {
        assert.equal(pictureLinkField({ crossesPicture: true, covered: false }), "add");
        assert.equal(pictureLinkField({ crossesPicture: true, covered: true }), "edit");
        assert.equal(pictureLinkField({ crossesPicture: false, covered: false }), "pass");
        assert.equal(pictureLinkField({ crossesPicture: false, covered: true }), "pass");
    });

    it("styles the words around a picture and leaves the picture name alone", () => {
        assert.equal(pictureStyle({ command: "bold", outsideSelected: true }), "outside");
        assert.equal(pictureStyle({ command: "italic", outsideSelected: true }), "outside");
        assert.equal(pictureStyle({ command: "underline", outsideSelected: true }), "outside");
        assert.equal(pictureStyle({ command: "strikeThrough", outsideSelected: true }), "outside");
        assert.equal(pictureStyle({ command: "bold", outsideSelected: false }), "pass");
        assert.equal(pictureStyle({ command: "formatBlock", outsideSelected: true }), "pass");
    });

    it("reaches a quote when a list runs through a picture", () => {
        assert.equal(listReachBlock("blockquote"), "line");
        assert.equal(listReachBlock("P"), "line");
        assert.equal(listReachBlock("h2"), "line");
        assert.equal(listReachBlock("ul"), "list");
        assert.equal(listReachBlock("OL"), "list");
        assert.equal(listReachBlock("figure"), "skip");
    });

    it("turns the next line into a list when the selection runs through a picture", () => {
        assert.equal(pictureListReach({ inList: true, outsideList: true, hasPicture: true }), "lines");
        assert.equal(pictureListReach({ inList: true, outsideList: false, hasPicture: true }), "skip");
        assert.equal(pictureListReach({ inList: false, outsideList: true, hasPicture: true }), "skip");
        assert.equal(pictureListReach({ inList: true, outsideList: true, hasPicture: false }), "skip");
    });

    it("turns a list line into a heading and keeps the numbers on the lines that follow", () => {
        assert.equal(listHeading({ command: "formatBlock", value: "h1", inItem: true }), "line");
        assert.equal(listHeading({ command: "formatBlock", value: "h2", inItem: true }), "line");
        assert.equal(listHeading({ command: "formatBlock", value: "h3", inItem: true }), "line");
        assert.equal(listHeading({ command: "formatBlock", value: "H2", inItem: true }), "line");
        assert.equal(listHeading({ command: "formatBlock", value: "blockquote", inItem: true }), "pass");
        assert.equal(listHeading({ command: "formatBlock", value: "h2", inItem: false }), "pass");
        assert.equal(listHeading({ command: "formatBlock", inItem: true }), "pass");
        assert.equal(listHeading({ command: "bold", value: "h2", inItem: true }), "pass");
        assert.equal(listHeadingPicture({ inItem: true, hasPicture: true }), "lift");
        assert.equal(listHeadingPicture({ inItem: true, hasPicture: false }), "keep");
        assert.equal(listHeadingPicture({ inItem: false, hasPicture: true }), "keep");
        assert.equal(listHeadingAcross({ touchesList: true, across: true }), "lines");
        assert.equal(listHeadingAcross({ touchesList: true, across: false }), "pass");
        assert.equal(listHeadingAcross({ touchesList: false, across: true }), "pass");
    });

    it("keeps a divider or a code block on its own line in a list", () => {
        assert.equal(listBlock({ kind: "divider", inItem: true }), "open");
        assert.equal(listBlock({ kind: "code", inItem: true }), "open");
        assert.equal(listBlock({ kind: "divider", inItem: false }), "pass");
        assert.equal(listBlock({ kind: "image", inItem: true }), "pass");
        assert.equal(listLineSpace(" rain", "start"), "rain");
        assert.equal(listLineSpace("Harbor ", "end"), "Harbor");
        assert.equal(listLineSpace("rain", "start"), "rain");
        assert.equal(listLineSpace("Harbor", "end"), "Harbor");
        assert.equal(listBlockPlace({ inItem: true, across: true }), "span");
        assert.equal(listBlockPlace({ inItem: true, separateLists: true }), "span");
        assert.equal(listBlockPlace({ inItem: true, acrossItems: true }), "items");
        assert.equal(listBlockPlace({ inItem: true, acrossLists: true }), "items");
        assert.equal(listBlockPlace({ inItem: true, intoNested: true }), "nested");
        assert.equal(listBlockPlace({ inItem: true }), "pass");
        assert.equal(listBlockPlace({ inItem: false, across: true }), "pass");
        assert.equal(pictureBlockEnds({ start: "p", end: "p", hasPicture: true }), "writing");
        assert.equal(pictureBlockEnds({ start: "ol", end: "p", hasPicture: true }), "list");
        assert.equal(pictureBlockEnds({ start: "ul", end: "ol", hasPicture: true }), "list");
        assert.equal(pictureBlockEnds({ start: "p", end: "ol", hasPicture: true }), "list");
        assert.equal(pictureBlockEnds({ start: "h2", end: "ul", hasPicture: true }), "list");
        assert.equal(pictureBlockEnds({ start: "ol", end: "p", hasPicture: false }), "skip");
        assert.equal(pictureBlockEnds({ start: "pre", end: "p", hasPicture: true }), "skip");
        assert.equal(pictureBlockEnds({ start: "blockquote", end: "p", hasPicture: true }), "skip");
        assert.equal(pictureBlockEnds({ start: "ol", end: "ol", hasPicture: true, sameBlock: true }), "item");
        assert.equal(pictureBlockEnds({ start: "ul", end: "ul", hasPicture: true, sameBlock: true }), "item");
        assert.equal(pictureBlockEnds({ start: "p", end: "p", hasPicture: true, sameBlock: true }), "skip");
        assert.equal(pictureBlockEnds({ start: "ol", end: "p", hasPicture: true, sameBlock: true }), "skip");
        assert.equal(pictureBlockEnds({ start: "ol", end: "ol", hasPicture: false, sameBlock: true }), "skip");
        assert.equal(pictureItemSpan({ sameItem: true, hasPicture: true }), "item");
        assert.equal(pictureItemSpan({ sameItem: false, hasPicture: true }), "across");
        assert.equal(pictureItemSpan({ sameItem: false, hasPicture: false }), "skip");
        assert.equal(pictureItemSpan({ sameItem: true, hasPicture: false }), "skip");
        assert.deepEqual(listBlockNumbers({ item: 1, following: [2, 3], split: false }), [2, 3]);
        assert.deepEqual(listBlockNumbers({ item: 1, following: [2, 3], split: true }), [2, 3, 4]);
        assert.deepEqual(listBlockNumbers({ item: 1, following: [10, 11], split: true }), [2, 10, 11]);
        assert.deepEqual(listBlockNumbers({ item: 5, following: [], split: true }), [6]);
        assert.deepEqual(listBlockNumbers({ item: 3, following: [4], split: false }), [4]);
    });

    it("puts a quoted list back into one list when that quote is chosen again", () => {
        assert.deepEqual(quoteListAgain({ quoted: "ol", previous: "ol", next: "ol" }), { previous: true, next: true });
        assert.deepEqual(quoteListAgain({ quoted: "ul", previous: "ul", next: "other" }), { previous: true, next: false });
        assert.deepEqual(quoteListAgain({ quoted: "ol", previous: "ul", next: "ol" }), { previous: false, next: true });
        assert.deepEqual(quoteListAgain({ quoted: "ol", previous: "none", next: "none" }), { previous: false, next: false });
        assert.deepEqual(quoteListAgain({ quoted: "other", previous: "ol", next: "ol" }), { previous: false, next: false });
        assert.equal(quotedListJoinValue({ ordered: true, previous: 1, number: 2 }), null);
        assert.equal(quotedListJoinValue({ ordered: true, previous: 1, number: 1 }), 1);
        assert.equal(quotedListJoinValue({ ordered: true, previous: 9, number: 11 }), 11);
        assert.equal(quotedListJoinValue({ ordered: true, previous: null, number: 3 }), null);
        assert.equal(quotedListJoinValue({ ordered: false, previous: 1, number: 4 }), null);
    });

    it("keeps the number on the lines that follow when one line of a numbered list changes", () => {
        assert.equal(keptListNumber({ first: true, previous: null, number: 1 }), null);
        assert.equal(keptListNumber({ first: true, previous: null, number: 4 }), 4);
        assert.equal(keptListNumber({ first: true, previous: null, number: 3 }), 3);
        assert.equal(keptListNumber({ first: false, previous: 4, number: 5 }), null);
        assert.equal(keptListNumber({ first: false, previous: 1, number: 3 }), 3);
        assert.equal(keptListNumber({ first: false, previous: 4, number: 10 }), 10);
        assert.equal(keptListNumber({ first: false, previous: null, number: 2 }), 2);
    });

    it("keeps the numbers when backspace takes a numbered line out of the list", () => {
        assert.equal(listLineLeaves({ ordered: true, sameList: false }), true);
        assert.equal(listLineLeaves({ ordered: true, sameList: true }), false);
        assert.equal(listLineLeaves({ ordered: false, sameList: false }), false);
    });

    it("indents a list line under the line above", () => {
        const tab = { key: "Tab", inItem: true, collapsed: true, hasPrevious: true, nested: false };
        assert.equal(listIndentKey(tab), "indent");
        assert.equal(listIndentKey({ ...tab, hasPrevious: false }), "stay");
        assert.equal(listIndentKey({ ...tab, shiftKey: true, nested: true }), "outdent");
        assert.equal(listIndentKey({ ...tab, shiftKey: true, nested: false }), "stay");
        assert.equal(listIndentKey({ ...tab, collapsed: false }), "stay");
        assert.equal(listIndentKey({ ...tab, ctrlKey: true }), "pass");
        assert.equal(listIndentKey({ ...tab, inItem: false }), "pass");
        assert.equal(listIndentKey({ ...tab, key: "Enter" }), "pass");
    });

    it("leaves a quote when that quote is chosen again", () => {
        assert.equal(quoteToggle({ inside: true }), "leave");
        assert.equal(quoteToggle({ inside: false }), "quote");
    });

    it("keeps italic inside a quote on the selected words", () => {
        assert.equal(italicInQuote({ inQuote: true, inItalic: false, collapsed: false, pending: null }), "mark");
        assert.equal(italicInQuote({ inQuote: true, inItalic: true, collapsed: false, pending: null }), "clear");
        assert.equal(italicInQuote({ inQuote: true, inItalic: false, collapsed: true, pending: null }), "arm");
        assert.equal(italicInQuote({ inQuote: true, inItalic: false, collapsed: true, pending: "italic" }), "disarm");
        assert.equal(italicInQuote({ inQuote: true, inItalic: true, collapsed: true, pending: null }), "plain");
        assert.equal(italicInQuote({ inQuote: true, inItalic: true, collapsed: true, pending: "plain" }), "disarm");
        assert.equal(italicInQuote({ inQuote: false, inItalic: false, collapsed: false, pending: null }), "browser");
        assert.equal(italicInQuote({ inQuote: false, inItalic: true, collapsed: false, pending: null }), "browser");
        assert.equal(linkUnderline({ inLink: true, inUnderline: false, collapsed: false, pending: null }), "mark");
        assert.equal(linkUnderline({ inLink: true, inUnderline: true, collapsed: false, pending: null }), "clear");
        assert.equal(linkUnderline({ inLink: true, inUnderline: false, collapsed: true, pending: null }), "arm");
        assert.equal(linkUnderline({ inLink: true, inUnderline: false, collapsed: true, pending: "underline" }), "disarm");
        assert.equal(linkUnderline({ inLink: true, inUnderline: true, collapsed: true, pending: null }), "plain");
        assert.equal(linkUnderline({ inLink: true, inUnderline: true, collapsed: true, pending: "plain" }), "disarm");
        assert.equal(linkUnderline({ inLink: false, inUnderline: false, collapsed: true, pending: null }), "browser");
        assert.equal(linkUnderlineShown({ inLink: true, inUnderline: false, pending: null, browser: true }), false);
        assert.equal(linkUnderlineShown({ inLink: true, inUnderline: true, pending: null, browser: true }), true);
        assert.equal(linkUnderlineShown({ inLink: true, inUnderline: false, pending: "underline", browser: false }), true);
        assert.equal(linkUnderlineShown({ inLink: false, inUnderline: false, pending: null, browser: true }), true);
        assert.equal(linkUnderlineKey({ key: "u", ctrlKey: true, held: false }), "keep");
        assert.equal(linkUnderlineKey({ key: "ArrowLeft", held: false }), "clear");
        assert.equal(typedQuoteUndoCaret(6), 6);
        assert.equal(typedQuoteUndoCaret(0), 0);
        assert.equal(typedQuoteUndoCaret(-1), null);
        assert.equal(quoteItalicKey({ key: "i", ctrlKey: true, held: false }), "keep");
        assert.equal(quoteItalicKey({ key: "Control", held: false }), "keep");
        assert.equal(quoteItalicKey({ key: "x", held: false }), "keep");
        assert.equal(quoteItalicKey({ key: "ArrowLeft", held: false }), "clear");
        assert.equal(quoteItalicKey({ key: "Backspace", held: false }), "clear");
        assert.equal(quoteItalicKey({ key: "z", ctrlKey: true, held: true }), "release");
        assert.equal(quoteItalicKey({ key: "z", ctrlKey: true, held: false }), "clear");
    });

    it("removes the line when strikethrough is chosen on a deleted word", () => {
        assert.equal(deletedStrike({ inDeleted: true, collapsed: false, pending: null }), "clear");
        assert.equal(deletedStrike({ inDeleted: true, collapsed: true, pending: null }), "plain");
        assert.equal(deletedStrike({ inDeleted: true, collapsed: true, pending: "plain" }), "disarm");
        assert.equal(deletedStrike({ inDeleted: false, collapsed: false, pending: null }), "browser");
        assert.equal(deletedStrikeShown({ inDeleted: true, pending: null, browser: false }), true);
        assert.equal(deletedStrikeShown({ inDeleted: true, pending: "plain", browser: true }), false);
        assert.equal(deletedStrikeShown({ inDeleted: false, pending: null, browser: true }), true);
        assert.equal(deletedStrikeShown({ inDeleted: false, pending: null, browser: false }), false);
        assert.equal(deletedStrikeKey({ key: "z" }), "keep");
        assert.equal(deletedStrikeKey({ key: "ArrowLeft" }), "clear");
    });

    it("keeps a typed letter at the start of a styled word", () => {
        assert.equal(styleStartType({ inStyle: true, collapsed: true, atStart: true }), "start");
        assert.equal(styleStartType({ inStyle: true, collapsed: true, atStart: false }), "pass");
        assert.equal(styleStartType({ inStyle: true, collapsed: false, atStart: true }), "pass");
        assert.equal(styleStartType({ inStyle: false, collapsed: true, atStart: true }), "pass");
    });

    it("keeps a typed letter inside the edge of a link", () => {
        assert.equal(linkEdgeType({ inLink: true, collapsed: true, atStart: true, atEnd: false }), "start");
        assert.equal(linkEdgeType({ inLink: true, collapsed: true, atStart: true, atEnd: true }), "start");
        assert.equal(linkEdgeType({ inLink: true, collapsed: true, atStart: false, atEnd: true }), "end");
        assert.equal(linkEdgeType({ inLink: true, collapsed: true, atStart: false, atEnd: false }), "pass");
        assert.equal(linkEdgeType({ inLink: true, collapsed: false, atStart: false, atEnd: true }), "pass");
        assert.equal(linkEdgeType({ inLink: false, collapsed: true, atStart: true, atEnd: true }), "pass");
    });

    it("keeps a quote together when Enter is pressed between two words", () => {
        const middle = { key: "Enter", inQuote: true, collapsed: true, before: "Harbor", after: "rain" };
        assert.equal(quoteEnterKey(middle), "break");
        assert.equal(quoteEnterKey({ ...middle, before: "Harbor ", after: " rain" }), "break");
        assert.equal(quoteEnterKey({ ...middle, before: "Harbor.", after: "rain" }), "break");
        assert.equal(quoteEnterKey({ ...middle, after: "" }), "pass");
        assert.equal(quoteEnterKey({ ...middle, before: "", after: "rain" }), "above");
        assert.equal(quoteEnterKey({ ...middle, before: "  ", after: "rain" }), "above");
        assert.equal(quoteEnterKey({ ...middle, before: "", after: "rain", besideBreak: true }), "pass");
        assert.equal(quoteEnterKey({ ...middle, before: "  ", after: " \u00a0" }), "pass");
        assert.equal(quoteEnterKey({ ...middle, collapsed: false }), "pass");
        assert.equal(quoteEnterKey({ ...middle, inQuote: false }), "pass");
        assert.equal(quoteEnterKey({ ...middle, key: "a" }), "pass");
        assert.equal(quoteEnterKey({ ...middle, shiftKey: true }), "pass");
        assert.equal(quoteEnterKey({ ...middle, ctrlKey: true }), "pass");
        assert.equal(quoteEnterKey({ ...middle, besideBreak: true }), "blank");
        assert.equal(wordCount("<blockquote><b>Harbor</b><br><b>rain</b></blockquote>"), 2);
        assert.equal(entryWritingText("<blockquote><b>Harbor</b><br><b>rain</b></blockquote>"), "Harbor rain");
    });

    it("keeps a space when backspace joins a line inside a quote", () => {
        const nextLine = { key: "Backspace", collapsed: true, atBreak: "after" as const };
        assert.equal(breakJoinKey(nextLine), "join");
        assert.equal(breakJoinKey({ ...nextLine, key: "Delete", atBreak: "before" }), "join");
        assert.equal(breakJoinKey({ ...nextLine, key: "Delete" }), "pass");
        assert.equal(breakJoinKey({ key: "Backspace", collapsed: true, atBreak: "before" }), "pass");
        assert.equal(breakJoinKey({ ...nextLine, atBreak: "none" }), "pass");
        assert.equal(breakJoinKey({ ...nextLine, collapsed: false }), "pass");
        assert.equal(breakJoinKey({ ...nextLine, shiftKey: true }), "pass");
        assert.equal(breakJoinKey({ ...nextLine, ctrlKey: true }), "join");
        assert.equal(breakJoinKey({ ...nextLine, metaKey: true }), "join");
        assert.equal(breakJoinKey({ ...nextLine, ctrlKey: true, atBreak: "none" }), "pass");
        assert.equal(breakJoinKey({ ...nextLine, key: "Delete", atBreak: "before", ctrlKey: true }), "join");
        assert.equal(joinNeedsSpace("Harbor", "rain today"), true);
        assert.equal(joinNeedsSpace("Harbor ", "rain today"), false);
        assert.equal(joinNeedsSpace("Harbor", " rain today"), false);
        assert.deepEqual(breakUndoMark({ index: 0, side: "after" }), { index: 0, side: "after" });
        assert.deepEqual(breakUndoMark({ index: 1, side: "before" }), { index: 1, side: "before" });
        assert.equal(breakUndoMark({ index: -1, side: "after" }), null);
    });

    it("keeps a space when two lines join", () => {
        const join = { key: "Backspace", collapsed: true, atStart: true, atEnd: false, neighbor: "text" as const };
        assert.equal(quoteLineEdge({ parent: "quote", atEdge: true }), "out");
        assert.equal(quoteLineEdge({ parent: "quote", atEdge: false }), "stay");
        assert.equal(quoteLineEdge({ parent: "other", atEdge: true }), "stay");
        assert.equal(quoteJoinTarget({ direction: "next", hasLine: true }), "line");
        assert.equal(quoteJoinTarget({ direction: "next", hasLine: false }), "quote");
        assert.equal(quoteJoinTarget({ direction: "previous", hasLine: true }), "quote");
        assert.equal(quotePictureJoin({ leading: "picture" }), "part");
        assert.equal(quotePictureJoin({ leading: "writing" }), "part");
        assert.equal(quotePictureJoin({ leading: "none" }), "whole");
        assert.equal(quoteTrailingLeave({ trailing: true, outside: true }), "leave");
        assert.equal(quoteTrailingLeave({ trailing: true, outside: false }), "stay");
        assert.equal(quoteTrailingLeave({ trailing: false, outside: true }), "stay");
        assert.equal(quoteListTail({ last: "list" }), "line");
        assert.equal(quoteListTail({ last: "writing" }), "line");
        assert.equal(quoteListTail({ last: "other" }), "quote");
        assert.equal(quoteAfterList({ listParent: "quote" }), "out");
        assert.equal(quoteAfterList({ listParent: "item" }), "out");
        assert.equal(quoteAfterList({ listParent: "other" }), "stay");
        assert.equal(lineJoinKey(join), "join");
        assert.equal(lineJoinKey({ ...join, key: "Delete", atStart: false, atEnd: true }), "join");
        assert.equal(lineJoinKey({ ...join, atStart: false }), "pass");
        assert.equal(lineJoinKey({ ...join, key: "Delete", atEnd: false }), "pass");
        assert.equal(lineJoinKey({ ...join, collapsed: false }), "pass");
        assert.equal(lineJoinKey({ ...join, neighbor: "none" }), "pass");
        assert.equal(lineJoinKey({ ...join, shiftKey: true }), "pass");
        assert.equal(lineJoinKey({ ...join, ctrlKey: true }), "join");
        assert.equal(lineJoinKey({ ...join, metaKey: true }), "join");
        assert.equal(lineJoinKey({ ...join, ctrlKey: true, atStart: false }), "pass");
        assert.equal(lineJoinKey({ ...join, key: "Delete", atStart: false, atEnd: true, ctrlKey: true }), "join");
        assert.equal(lineJoinKey({ ...join, neighborEmpty: true }), "clear");
        assert.equal(lineJoinKey({ ...join, blockEmpty: true }), "drop");
        assert.equal(lineJoinKey({ ...join, blockEmpty: true, neighborEmpty: true }), "drop");
        assert.equal(headingSplitUndo({ saved: { before: "<p>Harbor</p><p>rain</p>", after: "<p>Harbor rain</p>" }, current: "<p>Harbor rain</p>" }), "restore");
        assert.equal(lineJoinKey({ ...join, key: "Delete", atStart: true, atEnd: true, blockEmpty: true }), "clear");
        assert.equal(lineJoinKey({ ...join, key: "Delete", atStart: false, atEnd: true, neighborEmpty: true }), "join");
        assert.equal(joinNeedsSpace("Harbor", "rain"), true);
        assert.equal(joinNeedsSpace("Harbor,", "rain"), true);
        assert.equal(joinNeedsSpace("Harbor ", "rain"), false);
        assert.equal(joinNeedsSpace("Harbor", " rain"), false);
        assert.equal(joinNeedsSpace("", "rain"), false);
        assert.equal(joinNeedsSpace("Harbor", ""), false);
        assert.equal(breakJoinSpace({ afterBreak: true }), "tight");
        assert.equal(breakJoinSpace({ afterBreak: false }), "pass");
        assert.equal(blockBesideJoin({ beside: "quote" }), "line");
        assert.equal(blockBesideJoin({ beside: "list" }), "line");
        assert.equal(blockBesideJoin({ beside: "none" }), "pass");
        assert.equal(itemBlockJoin({ beside: true }), "line");
        assert.equal(itemBlockJoin({ beside: false }), "pass");
        assert.deepEqual(joinGap("See  ", "rain"), { trimPrevious: 1, trimNext: 0, insert: false, separate: true });
        assert.deepEqual(joinGap("See", "  rain"), { trimPrevious: 0, trimNext: 2, insert: true, separate: true });
        assert.deepEqual(joinGap("See ", " rain"), { trimPrevious: 0, trimNext: 1, insert: false, separate: true });
        assert.deepEqual(joinGap("See", "rain"), { trimPrevious: 0, trimNext: 0, insert: true, separate: true });
        assert.deepEqual(joinGap("See ", "rain"), { trimPrevious: 0, trimNext: 0, insert: false, separate: true });
        assert.deepEqual(joinGap("See\u00a0\u00a0", "rain"), { trimPrevious: 1, trimNext: 0, insert: false, separate: true });
        assert.deepEqual(joinGap("", "rain"), { trimPrevious: 0, trimNext: 0, insert: false, separate: false });
        assert.deepEqual(joinGap("See", ",rain"), { trimPrevious: 0, trimNext: 0, insert: false, separate: false });
    });

    it("the undo button restores the saved page", () => {
        assert.equal(undoButton("undo"), "saved");
        assert.equal(undoButton("redo"), "browser");
        assert.equal(undoButton("bold"), "browser");
    });

    it("ignores a picture outline when comparing a saved page", () => {
        const plain = '<figure><img alt="Harbor rain" src="gif"><figcaption>Harbor rain</figcaption></figure>';
        const outlined = '<figure><img alt="Harbor rain" class="de-selected" src="gif"><figcaption>Harbor rain</figcaption></figure>';
        assert.equal(sameEditingPage(outlined, plain), true);
        assert.equal(sameEditingPage('<img class="de-selected kept" src="gif">', '<img class="kept" src="gif">'), true);
        assert.equal(sameEditingPage("<p>Harbor</p>", "<p>rain</p>"), false);
        assert.equal(headingSplitUndo({
            saved: { before: plain, after: "<p>today</p>" },
            current: outlined,
        }), "pass");
        assert.equal(headingSplitUndo({
            saved: { before: "<p>Before</p>", after: plain },
            current: outlined,
        }), "restore");
    });

    it("redo puts the saved page back", () => {
        const ready = { matches: true };
        assert.equal(savedRedo({ command: "redo", ...ready }), "restore");
        assert.equal(savedRedo({ key: "y", ctrlKey: true, ...ready }), "restore");
        assert.equal(savedRedo({ key: "Y", metaKey: true, ...ready }), "restore");
        assert.equal(savedRedo({ key: "z", ctrlKey: true, shiftKey: true, ...ready }), "restore");
        assert.equal(savedRedo({ key: "Z", metaKey: true, shiftKey: true, ...ready }), "restore");
        assert.equal(savedRedo({ command: "redo", matches: false }), "pass");
        assert.equal(savedRedo({ key: "y", ctrlKey: true, matches: false }), "pass");
        assert.equal(savedRedo({ key: "z", ctrlKey: true, ...ready }), "pass");
        assert.equal(savedRedo({ key: "y", ctrlKey: true, altKey: true, ...ready }), "pass");
        assert.equal(savedRedo({ command: "undo", ...ready }), "pass");
        assert.equal(savedRedo({ command: "bold", ...ready }), "pass");
    });

    it("starts the next line on the word when Enter splits two words", () => {
        const between = { key: "Enter", inCode: false, before: "Harbor", after: " rain keeps going" };
        assert.equal(splitSpace(between), "trim");
        assert.equal(splitSpace({ ...between, before: "Harbor ", after: "rain keeps going" }), "trim");
        assert.equal(splitSpace({ ...between, before: "Harbor\u00a0", after: "rain" }), "trim");
        assert.equal(splitSpace({ ...between, shiftKey: true }), "trim");
        assert.equal(splitSpace({ ...between, before: "Harbor", after: "rain" }), "keep");
        assert.equal(splitSpace({ ...between, before: "Harbor ", after: "" }), "keep");
        assert.equal(splitSpace({ ...between, before: "", after: " rain" }), "keep");
        assert.equal(splitSpace({ ...between, inCode: true }), "keep");
        assert.equal(splitSpace({ ...between, key: "Backspace" }), "keep");
        assert.equal(splitSpace({ ...between, ctrlKey: true }), "keep");
    });

    it("starts a plain line when Enter follows a styled word", () => {
        const end = { key: "Enter", collapsed: true, atBlockEnd: true, coversBlock: [false] };
        assert.equal(styledLine(end), 0);
        assert.equal(styledLine({ ...end, coversBlock: [true, false] }), 1);
        assert.equal(styledLine({ ...end, coversBlock: [false, false] }), 0);
        assert.equal(styledLine({ ...end, coversBlock: [true] }), null);
        assert.equal(styledLine({ ...end, coversBlock: [true, true] }), null);
        assert.equal(styledLine({ ...end, coversBlock: [] }), null);
        assert.equal(styledLine({ ...end, atBlockEnd: false }), null);
        assert.equal(styledLine({ ...end, collapsed: false }), null);
        assert.equal(styledLine({ ...end, shiftKey: true }), null);
        assert.equal(styledLine({ ...end, key: " " }), null);
        assert.equal(styledLine({ ...end, ctrlKey: true }), null);
        assert.equal(styledLineUndoCaret(10), 10);
        assert.equal(styledLineUndoCaret(0), 0);
        assert.equal(styledLineUndoCaret(null), null);
        assert.equal(styledLineUndoCaret(-1), null);
    });

    it("puts sentence punctuation after a styled word outside that style", () => {
        const end = { key: ".", collapsed: true, atMarkEnd: true, outsideText: true, endsWithDigit: false };
        for (const key of [".", ",", ";", ":", "!", "?", ")", "]", "}", "…"]) {
            assert.equal(styledPunctuation({ ...end, key }), "outside");
        }
        assert.equal(styledPunctuation({ ...end, key: ".", endsWithDigit: true }), "pass");
        assert.equal(styledPunctuation({ ...end, key: ",", endsWithDigit: true }), "pass");
        assert.equal(styledPunctuation({ ...end, key: "!", endsWithDigit: true }), "outside");
        assert.equal(styledPunctuation({ ...end, outsideText: false }), "pass");
        assert.equal(styledPunctuation({ ...end, atMarkEnd: false }), "pass");
        assert.equal(styledPunctuation({ ...end, collapsed: false }), "pass");
        assert.equal(styledPunctuation({ ...end, key: "s" }), "pass");
        assert.equal(styledPunctuation({ ...end, key: "'" }), "pass");
        assert.equal(styledPunctuation({ ...end, key: " " }), "pass");
        assert.equal(styledPunctuation({ ...end, ctrlKey: true }), "pass");
        assert.equal(styledPunctuation({ ...end, altKey: true }), "pass");
        assert.equal(styledPunctuation({ ...end, metaKey: true }), "pass");
    });

    it("puts a space after a styled word outside that style", () => {
        const after = { key: " ", collapsed: true, atMarkEnd: true, outsideText: true };
        assert.equal(styledSpace(after), "outside");
        assert.equal(styledSpace({ ...after, shiftKey: true }), "outside");
        assert.equal(styledSpace({ ...after, outsideText: false }), "pass");
        assert.equal(styledSpace({ ...after, atMarkEnd: false }), "pass");
        assert.equal(styledSpace({ ...after, collapsed: false }), "pass");
        assert.equal(styledSpace({ ...after, key: "t" }), "pass");
        assert.equal(styledSpace({ ...after, ctrlKey: true }), "pass");
        assert.equal(styledSpace({ ...after, altKey: true }), "pass");
        assert.equal(styledSpace({ ...after, metaKey: true }), "pass");
    });

    it("keeps the space when backspace removes the last letter of a bold word", () => {
        assert.equal(plainSpacesAfterMarks("<p><b>Harbo</b>&nbsp;rain</p>"), "<p><b>Harbo</b> rain</p>");
        assert.equal(plainSpacesAfterMarks("<p><i>Harbo</i>\u00a0rain</p>"), "<p><i>Harbo</i> rain</p>");
        assert.equal(plainSpacesAfterMarks('<p>See <a href="https://example.com">Harbo</a>&nbsp;rain</p>'), '<p>See <a href="https://example.com">Harbo</a> rain</p>');
        assert.equal(plainSpacesAfterMarks("<p>&nbsp;rain</p>"), "<p> rain</p>");
        assert.equal(plainSpacesAfterMarks("<p><b>Harbo</b> rain</p>"), "<p><b>Harbo</b> rain</p>");
        assert.equal(plainSpacesAfterMarks("<p><b>Harbo</b>&nbsp;</p>"), "<p><b>Harbo</b>&nbsp;</p>");
        assert.equal(plainSpacesAfterMarks("<p><b>Harbo</b>&nbsp;&nbsp;rain</p>"), "<p><b>Harbo</b>  rain</p>");
        assert.equal(plainSpacesAfterMarks("<p>&nbsp;</p>"), "<p>&nbsp;</p>");
        assert.equal(plainSpacesAfterMarks("<p>See &nbsp;rain</p>"), "<p>See  rain</p>");
        assert.equal(plainSpacesAfterMarks("<p>See\u00a0rain</p>"), "<p>See rain</p>");
        assert.equal(plainSpacesAfterMarks("<p><b>Harbor</b>&nbsp; rain</p>"), "<p><b>Harbor</b>  rain</p>");
        assert.equal(plainSpacesAfterMarks("<p><b>Harbor</b>&nbsp; </p>"), "<p><b>Harbor</b>&nbsp; </p>");
    });

    it("moves a trailing space out of a styled word when the line has other writing", () => {
        assert.equal(plainMarkSpaces("<p>See <b>Harbor </b>rain</p>"), "<p>See <b>Harbor</b> rain</p>");
        assert.equal(plainMarkSpaces("<p>See <b>Harbor&nbsp;</b>rain</p>"), "<p>See <b>Harbor</b> rain</p>");
        assert.equal(plainMarkSpaces("<p>See <i>Harbor </i></p>"), "<p>See <i>Harbor</i> </p>");
        assert.equal(plainMarkSpaces('<p>See <a href="https://example.com">Harbor </a>today</p>'), '<p>See <a href="https://example.com">Harbor</a> today</p>');
        assert.equal(plainMarkSpaces("<p><b>See Harbor </b></p>"), "<p><b>See Harbor </b></p>");
        assert.equal(htmlToMarkdown("<p>See <b>Harbor </b>rain</p>"), "See **Harbor** rain");
        assert.equal(htmlToMarkdown("<p>See <i>Harbor </i>today</p>"), "See *Harbor* today");
        assert.equal(htmlToMarkdown('<p>See <a href="https://example.com">Harbor </a>today</p>'), "See [Harbor](https://example.com) today");
        assert.equal(htmlToMarkdown("<p><b>See Harbor </b></p>"), "**See Harbor**");
    });

    it("moves a leading space out of a styled word when the line has other writing", () => {
        assert.equal(plainMarkSpaces("<p>See<b> Harbor</b> rain</p>"), "<p>See <b>Harbor</b> rain</p>");
        assert.equal(plainMarkSpaces("<p>See<b>&nbsp;Harbor</b> rain</p>"), "<p>See <b>Harbor</b> rain</p>");
        assert.equal(plainMarkSpaces("<p>See<i> Harbor</i></p>"), "<p>See <i>Harbor</i></p>");
        assert.equal(plainMarkSpaces('<p>See<a href="https://example.com"> Harbor</a> today</p>'), '<p>See <a href="https://example.com">Harbor</a> today</p>');
        assert.equal(plainMarkSpaces("<p>See<b> Harbor </b>rain</p>"), "<p>See <b>Harbor</b> rain</p>");
        assert.equal(plainMarkSpaces("<p><b> Harbor</b></p>"), "<p><b> Harbor</b></p>");
        assert.equal(htmlToMarkdown("<p>See<b> Harbor</b> rain</p>"), "See **Harbor** rain");
        assert.equal(htmlToMarkdown("<p>See<i> Harbor</i> today</p>"), "See *Harbor* today");
        assert.equal(htmlToMarkdown('<p>See<a href="https://example.com"> Harbor</a> today</p>'), "See [Harbor](https://example.com) today");
        assert.equal(htmlToMarkdown("<p><b> Harbor</b></p>"), "**Harbor**");
    });

    it("leaves the spaces around a word out of the style command", () => {
        assert.deepEqual(styleEdgeCut(" Harbor"), { leading: 1, trailing: 0 });
        assert.deepEqual(styleEdgeCut("Harbor "), { leading: 0, trailing: 1 });
        assert.deepEqual(styleEdgeCut(" Harbor "), { leading: 1, trailing: 1 });
        assert.deepEqual(styleEdgeCut("\u00a0Harbor\u00a0"), { leading: 1, trailing: 1 });
        assert.equal(styleEdgeCut("Harbor"), null);
        assert.equal(styleEdgeCut(" "), null);
        assert.equal(styleShortcut({ key: "b", ctrlKey: true }), "bold");
        assert.equal(styleShortcut({ key: "I", metaKey: true }), "italic");
        assert.equal(styleShortcut({ key: "u", ctrlKey: true }), "underline");
        assert.equal(styleShortcut({ key: "b", ctrlKey: true, shiftKey: true }), null);
        assert.equal(styleShortcut({ key: "b" }), null);
        assert.equal(styleUndoCaret(10), 10);
        assert.equal(styleUndoCaret(0), 0);
        assert.equal(styleUndoCaret(null), null);
        assert.equal(styleUndoCaret(-1), null);
        assert.equal(formatUndoCommand("bold"), true);
        assert.equal(formatUndoCommand("createLink"), true);
        assert.equal(formatUndoCommand("unlink"), true);
        assert.equal(formatUndoCommand("formatBlock"), true);
        assert.equal(formatUndoCommand("insertUnorderedList"), false);
        assert.equal(formatUndoCommand("undo"), false);
        assert.equal(replacedSelectionUndo({ collapsed: false }), "place");
        assert.equal(replacedSelectionUndo({ collapsed: true }), "keep");
        assert.equal(pasteSelectionUndo({ collapsed: false, action: "html" }), "place");
        assert.equal(pasteSelectionUndo({ collapsed: false, action: "plain" }), "place");
        assert.equal(pasteSelectionUndo({ collapsed: false, action: "default" }), "place");
        assert.equal(pasteSelectionUndo({ collapsed: true, action: "html" }), "keep");
        assert.equal(pasteSelectionUndo({ collapsed: false, action: "image" }), "keep");
        assert.equal(selectionDeleteUndo({ key: "Backspace", collapsed: false }), "place");
        assert.equal(selectionDeleteUndo({ key: "Delete", collapsed: false }), "place");
        assert.equal(selectionDeleteUndo({ key: "Backspace", collapsed: false, ctrlKey: true }), "place");
        assert.equal(selectionDeleteUndo({ key: "Delete", collapsed: false, ctrlKey: true }), "place");
        assert.equal(selectionDeleteUndo({ key: "Backspace", collapsed: false, metaKey: true }), "place");
        assert.equal(selectionDeleteUndo({ key: "Delete", collapsed: false, metaKey: true }), "place");
        assert.equal(selectionDeleteUndo({ key: "Backspace", collapsed: false, altKey: true }), "pass");
        assert.equal(selectionDeleteUndo({ key: "x", collapsed: false, ctrlKey: true }), "pass");
        assert.equal(selectionDeleteUndo({ key: "Backspace", collapsed: true }), "pass");
        assert.equal(selectionDeleteUndo({ key: "Enter", collapsed: false }), "pass");
        assert.equal(selectionCutUndo({ collapsed: false, inWriting: true }), "place");
        assert.equal(selectionCutUndo({ collapsed: true, inWriting: true }), "pass");
        assert.equal(selectionCutUndo({ collapsed: false, inWriting: false }), "pass");
        assert.equal(selectionTypeUndo({ key: "X", collapsed: false, inWriting: true }), "place");
        assert.equal(selectionTypeUndo({ key: " ", collapsed: false, inWriting: true }), "place");
        assert.equal(selectionTypeUndo({ key: "X", collapsed: true, inWriting: true }), "pass");
        assert.equal(selectionTypeUndo({ key: "X", collapsed: false, inWriting: false }), "pass");
        assert.equal(selectionTypeUndo({ key: "X", collapsed: false, inWriting: true, ctrlKey: true }), "pass");
        assert.equal(selectionTypeUndo({ key: "Enter", collapsed: false, inWriting: true }), "pass");
        assert.equal(selectionTypeUndo({ key: "X", collapsed: false, inWriting: true, composing: true }), "pass");
        assert.equal(selectionEnterUndo({ key: "Enter", collapsed: false, inWriting: true }), "place");
        assert.equal(selectionEnterUndo({ key: "Enter", collapsed: true, inWriting: true }), "pass");
        assert.equal(selectionEnterUndo({ key: "Enter", collapsed: false, inWriting: false }), "pass");
        assert.equal(selectionEnterUndo({ key: "Enter", collapsed: false, inWriting: true, shiftKey: true }), "pass");
        assert.equal(selectionEnterUndo({ key: "Enter", collapsed: false, inWriting: true, ctrlKey: true }), "pass");
        assert.equal(dragSelectionUndo({ collapsed: false, inWriting: true }), "place");
        assert.equal(dragSelectionUndo({ collapsed: true, inWriting: true }), "pass");
        assert.equal(dragSelectionUndo({ collapsed: false, inWriting: false }), "pass");
        assert.deepEqual(wordDeleteSpan("See Harbor rain", 4, 10), { start: 4, end: 11 });
        assert.deepEqual(wordDeleteSpan("See  Harbor rain", 5, 11), { start: 4, end: 12 });
        assert.deepEqual(wordDeleteSpan("See Harbor  rain", 4, 10), { start: 4, end: 12 });
        assert.deepEqual(wordDeleteSpan("See   Harbor   rain", 6, 12), { start: 4, end: 15 });
        assert.deepEqual(wordDeleteSpan("See  Harbor", 5, 11), { start: 3, end: 11 });
        assert.deepEqual(wordDeleteSpan("Harbor  rain", 0, 6), { start: 0, end: 8 });
        assert.deepEqual(wordDeleteSpan("See Harbor rain", 0, 3), { start: 0, end: 4 });
        assert.deepEqual(wordDeleteSpan("See Harbor", 4, 10), { start: 3, end: 10 });
        assert.deepEqual(wordDeleteSpan("See Harbor rain", 4, 7), { start: 4, end: 7 });
        assert.deepEqual(wordDeleteSpan("See Harbor rain", 10, 15), { start: 10, end: 15 });
        assert.deepEqual(wordDeleteSpan("See\u00a0Harbor rain", 4, 10), { start: 4, end: 11 });
        assert.deepEqual(wordDeleteSpan("See well-known rain", 9, 14), { start: 8, end: 14 });
        assert.deepEqual(wordDeleteSpan("See well-known rain", 8, 9), { start: 8, end: 14 });
        assert.deepEqual(wordDeleteSpan("See well-known rain", 4, 8), { start: 4, end: 9 });
        assert.deepEqual(wordDeleteSpan("See and/or rain", 8, 10), { start: 7, end: 10 });
        assert.deepEqual(wordDeleteSpan("See and/or rain", 7, 8), { start: 7, end: 10 });
        assert.deepEqual(wordDeleteSpan("See and/or rain", 4, 7), { start: 4, end: 8 });
        assert.deepEqual(wordDeleteSpan("See ada@harbor rain", 4, 7), { start: 4, end: 8 });
        assert.deepEqual(wordDeleteSpan("See ada@harbor rain", 7, 8), { start: 7, end: 14 });
        assert.deepEqual(wordDeleteSpan("See ada@harbor rain", 8, 14), { start: 7, end: 14 });
        assert.deepEqual(wordDeleteSpan("See @harbor rain", 5, 11), { start: 5, end: 11 });
        assert.equal(wordDeleteGap("See ada@harbor rain", 4, 7), "after");
        assert.equal(wordDeleteGap("See ada@harbor rain", 7, 8), "before");
        assert.equal(wordDeleteGap("See ada@harbor rain", 8, 14), "before");
        assert.deepEqual(wordDeleteSpan("See rock+roll rain", 4, 8), { start: 4, end: 9 });
        assert.deepEqual(wordDeleteSpan("See rock+roll rain", 8, 9), { start: 8, end: 13 });
        assert.deepEqual(wordDeleteSpan("See rock+roll rain", 9, 13), { start: 8, end: 13 });
        assert.equal(wordDeleteGap("See rock+roll rain", 4, 8), "after");
        assert.equal(wordDeleteGap("See rock+roll rain", 8, 9), "before");
        assert.deepEqual(wordDeleteSpan("See rock_roll rain", 4, 8), { start: 4, end: 9 });
        assert.deepEqual(wordDeleteSpan("See rock_roll rain", 8, 9), { start: 8, end: 13 });
        assert.deepEqual(wordDeleteSpan("See rock_roll rain", 9, 13), { start: 8, end: 13 });
        assert.equal(wordDeleteGap("See rock_roll rain", 4, 8), "after");
        assert.equal(wordDeleteGap("See rock_roll rain", 8, 9), "before");
        assert.equal(wordDeleteGap("See rock_roll rain", 8, 13), "before");
        assert.equal(wordDeleteGap("See rock_roll rain", 4, 9), "after");
        assert.equal(wordDeleteGap("See and/or rain", 7, 10), "before");
        assert.deepEqual(wordDeleteSpan("See _roll rain", 5, 9), { start: 5, end: 9 });
        assert.deepEqual(wordDeleteSpan("See rock*roll rain", 4, 8), { start: 4, end: 9 });
        assert.deepEqual(wordDeleteSpan("See rock*roll rain", 8, 9), { start: 8, end: 13 });
        assert.deepEqual(wordDeleteSpan("See rock*roll rain", 9, 13), { start: 8, end: 13 });
        assert.deepEqual(wordDeleteSpan("See rock*roll rain", 9, 14), { start: 8, end: 13 });
        assert.equal(wordDeleteGap("See rock*roll rain", 4, 8), "after");
        assert.equal(wordDeleteGap("See rock*roll rain", 8, 9), "before");
        assert.equal(wordDeleteGap("See rock*roll rain", 9, 13), "before");
        assert.equal(wordDeleteGap("See rock*roll rain", 9, 14), "before");
        assert.deepEqual(wordDeleteSpan("See *roll rain", 5, 9), { start: 5, end: 9 });
        assert.deepEqual(wordDeleteSpan("See 2*3 rain", 6, 7), { start: 5, end: 7 });
        assert.deepEqual(wordDeleteSpan("See rock=roll rain", 4, 8), { start: 4, end: 9 });
        assert.deepEqual(wordDeleteSpan("See rock=roll rain", 8, 9), { start: 8, end: 13 });
        assert.deepEqual(wordDeleteSpan("See rock=roll rain", 9, 13), { start: 8, end: 13 });
        assert.deepEqual(wordDeleteSpan("See rock=roll rain", 9, 14), { start: 8, end: 13 });
        assert.equal(wordDeleteGap("See rock=roll rain", 4, 8), "after");
        assert.equal(wordDeleteGap("See rock=roll rain", 8, 9), "before");
        assert.equal(wordDeleteGap("See rock=roll rain", 9, 14), "before");
        assert.deepEqual(wordDeleteSpan("See =roll rain", 5, 9), { start: 5, end: 9 });
        assert.deepEqual(wordDeleteSpan("See 2=3 rain", 6, 7), { start: 5, end: 7 });
        assert.deepEqual(wordDeleteSpan("See rock|roll rain", 4, 8), { start: 4, end: 9 });
        assert.deepEqual(wordDeleteSpan("See rock|roll rain", 8, 9), { start: 8, end: 13 });
        assert.deepEqual(wordDeleteSpan("See rock|roll rain", 9, 13), { start: 8, end: 13 });
        assert.deepEqual(wordDeleteSpan("See rock|roll rain", 9, 14), { start: 8, end: 13 });
        assert.equal(wordDeleteGap("See rock|roll rain", 4, 8), "after");
        assert.equal(wordDeleteGap("See rock|roll rain", 8, 9), "before");
        assert.equal(wordDeleteGap("See rock|roll rain", 9, 14), "before");
        assert.deepEqual(wordDeleteSpan("See |roll rain", 5, 9), { start: 5, end: 9 });
        assert.deepEqual(wordDeleteSpan("See 2|3 rain", 6, 7), { start: 5, end: 7 });
        assert.deepEqual(wordDeleteSpan("See rock~roll rain", 4, 8), { start: 4, end: 9 });
        assert.deepEqual(wordDeleteSpan("See rock~roll rain", 8, 9), { start: 8, end: 13 });
        assert.deepEqual(wordDeleteSpan("See rock~roll rain", 9, 13), { start: 8, end: 13 });
        assert.deepEqual(wordDeleteSpan("See rock~roll rain", 9, 14), { start: 8, end: 13 });
        assert.equal(wordDeleteGap("See rock~roll rain", 4, 8), "after");
        assert.equal(wordDeleteGap("See rock~roll rain", 8, 9), "before");
        assert.equal(wordDeleteGap("See rock~roll rain", 9, 14), "before");
        assert.deepEqual(wordDeleteSpan("See ~roll rain", 5, 9), { start: 5, end: 9 });
        assert.deepEqual(wordDeleteSpan("See 2~3 rain", 6, 7), { start: 5, end: 7 });
        assert.deepEqual(wordDeleteSpan("See rock\\roll rain", 4, 8), { start: 4, end: 9 });
        assert.deepEqual(wordDeleteSpan("See rock\\roll rain", 8, 9), { start: 8, end: 13 });
        assert.deepEqual(wordDeleteSpan("See rock\\roll rain", 9, 13), { start: 8, end: 13 });
        assert.deepEqual(wordDeleteSpan("See rock\\roll rain", 9, 14), { start: 8, end: 13 });
        assert.equal(wordDeleteGap("See rock\\roll rain", 4, 8), "after");
        assert.equal(wordDeleteGap("See rock\\roll rain", 8, 9), "before");
        assert.equal(wordDeleteGap("See rock\\roll rain", 9, 14), "before");
        assert.deepEqual(wordDeleteSpan("See \\roll rain", 5, 9), { start: 5, end: 9 });
        assert.deepEqual(wordDeleteSpan("See 2\\3 rain", 6, 7), { start: 5, end: 7 });
        assert.deepEqual(wordDeleteSpan("See rock^roll rain", 4, 8), { start: 4, end: 9 });
        assert.deepEqual(wordDeleteSpan("See rock^roll rain", 8, 9), { start: 8, end: 13 });
        assert.deepEqual(wordDeleteSpan("See rock^roll rain", 9, 13), { start: 8, end: 13 });
        assert.deepEqual(wordDeleteSpan("See rock^roll rain", 9, 14), { start: 8, end: 13 });
        assert.equal(wordDeleteGap("See rock^roll rain", 4, 8), "after");
        assert.equal(wordDeleteGap("See rock^roll rain", 8, 9), "before");
        assert.equal(wordDeleteGap("See rock^roll rain", 9, 14), "before");
        assert.deepEqual(wordDeleteSpan("See ^roll rain", 5, 9), { start: 5, end: 9 });
        assert.deepEqual(wordDeleteSpan("See 2^3 rain", 6, 7), { start: 5, end: 7 });
        assert.deepEqual(wordDeleteSpan("See rock+roll rain", 9, 14), { start: 8, end: 13 });
        assert.deepEqual(wordDeleteSpan("See 3.14 rain", 6, 9), { start: 5, end: 8 });
        assert.deepEqual(wordDeleteSpan("See Harbor rain", 4, 11), { start: 4, end: 11 });
        assert.deepEqual(wordDeleteSpan("Open http://example now", 12, 19), { start: 12, end: 19 });
        assert.deepEqual(wordDeleteSpan("See rock&roll rain", 9, 13), { start: 8, end: 13 });
        assert.deepEqual(wordDeleteSpan("See rock&roll rain", 8, 9), { start: 8, end: 13 });
        assert.deepEqual(wordDeleteSpan("See rock&roll rain", 4, 8), { start: 4, end: 9 });
        assert.deepEqual(wordDeleteSpan("See Harbor, rain", 4, 10), { start: 4, end: 12 });
        assert.deepEqual(wordDeleteSpan("See 12% rain", 4, 6), { start: 4, end: 8 });
        assert.deepEqual(wordDeleteSpan("See 12% rain", 6, 7), { start: 4, end: 8 });
        assert.equal(wordDeleteGap("See 12% rain", 4, 6), "after");
        assert.deepEqual(wordDeleteSpan("See $20% rain", 7, 8), { start: 4, end: 9 });
        assert.equal(wordDeleteGap("See $20% rain", 7, 8), "after");
        assert.deepEqual(wordDeleteSpan("See $20\u00b0 rain", 7, 8), { start: 4, end: 9 });
        assert.deepEqual(wordDeleteSpan("See $.50% rain", 8, 9), { start: 4, end: 10 });
        assert.deepEqual(wordDeleteSpan("See \u20ac20% rain", 7, 8), { start: 4, end: 9 });
        assert.deepEqual(wordDeleteSpan("See #20% rain", 7, 8), { start: 4, end: 9 });
        assert.deepEqual(wordDeleteSpan("See $1,000% rain", 10, 11), { start: 4, end: 12 });
        assert.deepEqual(wordDeleteSpan("See 3.14% rain", 8, 9), { start: 5, end: 9 });
        assert.deepEqual(wordDeleteSpan("See $20.50% rain", 10, 11), { start: 7, end: 11 });
        assert.deepEqual(wordDeleteSpan("See $20% rain", 4, 5), { start: 4, end: 5 });
        assert.deepEqual(wordDeleteSpan("See 72\u00b0 rain", 4, 6), { start: 4, end: 8 });
        assert.deepEqual(wordDeleteSpan("See 72\u00b0 rain", 6, 7), { start: 4, end: 8 });
        assert.equal(wordDeleteGap("See 72\u00b0 rain", 4, 6), "after");
        assert.deepEqual(wordDeleteSpan("See $12 rain", 5, 7), { start: 4, end: 8 });
        assert.deepEqual(wordDeleteSpan("See $12 rain", 4, 5), { start: 4, end: 5 });
        assert.deepEqual(wordLeadSpan("See $12 rain", 4, 5), { start: 4, end: 7 });
        assert.deepEqual(wordLeadSpan("See \u20ac12 rain", 4, 5), { start: 4, end: 7 });
        assert.deepEqual(wordLeadSpan("See \u00a312 rain", 4, 5), { start: 4, end: 7 });
        assert.deepEqual(wordLeadSpan("See \u20b9500 rain", 4, 5), { start: 4, end: 8 });
        assert.deepEqual(wordLeadSpan("See \u00a5500 rain", 4, 5), { start: 4, end: 8 });
        assert.deepEqual(wordLeadSpan("See #tag rain", 4, 5), { start: 4, end: 8 });
        assert.deepEqual(wordLeadSpan("See $20.50 rain", 4, 5), { start: 4, end: 10 });
        assert.deepEqual(wordDeleteSpan("See $20.50 rain", 4, 10), { start: 4, end: 11 });
        assert.equal(wordDeleteGap("See $20.50 rain", 4, 10), "after");
        assert.deepEqual(wordLeadSpan("See $1,000.50 rain", 4, 5), { start: 4, end: 13 });
        assert.deepEqual(wordLeadSpan("See #20.50 rain", 4, 5), { start: 4, end: 10 });
        assert.deepEqual(wordLeadSpan("See \u20ac20.50 rain", 4, 5), { start: 4, end: 10 });
        assert.deepEqual(wordLeadSpan("See \u00a33.14 rain", 4, 5), { start: 4, end: 9 });
        assert.deepEqual(wordLeadSpan("See \u20b91,500.00 rain", 4, 5), { start: 4, end: 13 });
        assert.deepEqual(wordLeadSpan("See $20. rain", 4, 5), { start: 4, end: 7 });
        assert.deepEqual(wordLeadSpan("See $20.txt rain", 4, 5), { start: 4, end: 7 });
        assert.deepEqual(wordLeadSpan("See $.50 rain", 4, 6), { start: 4, end: 8 });
        assert.deepEqual(wordLeadSpan("See $.50 rain", 4, 5), { start: 4, end: 8 });
        assert.deepEqual(wordLeadSpan("See .50 rain", 4, 5), { start: 4, end: 7 });
        assert.deepEqual(wordLeadSpan("See 3.14 rain", 5, 6), { start: 5, end: 6 });
        assert.deepEqual(wordDeleteSpan("See .50 rain", 5, 7), { start: 4, end: 8 });
        assert.deepEqual(wordDeleteSpan("See $.50 rain", 6, 8), { start: 4, end: 9 });
        assert.deepEqual(wordDeleteSpan("See $20.50 rain", 8, 10), { start: 7, end: 10 });
        assert.deepEqual(wordLeadSpan("See $12 rain", 5, 7), { start: 5, end: 7 });
        assert.deepEqual(wordLeadSpan("See C#5 rain", 5, 6), { start: 5, end: 6 });
        assert.deepEqual(wordLeadSpan("See $ rain", 4, 5), { start: 4, end: 5 });
        assert.deepEqual(wordLeadSpan("See $12 rain", 4, 4), { start: 4, end: 4 });
        assert.equal(wordDeleteGap("See $12 rain", 5, 7), "after");
        assert.deepEqual(wordDeleteSpan("See \u20ac12 rain", 5, 7), { start: 4, end: 8 });
        assert.deepEqual(wordDeleteSpan("See \u20ac12 rain", 4, 5), { start: 4, end: 5 });
        assert.equal(wordDeleteGap("See \u20ac12 rain", 5, 7), "after");
        assert.deepEqual(wordDeleteSpan("See \u00a312 rain", 5, 7), { start: 4, end: 8 });
        assert.equal(wordDeleteGap("See \u00a312 rain", 5, 7), "after");
        assert.deepEqual(wordDeleteSpan("See \u20b9500 rain", 5, 8), { start: 4, end: 9 });
        assert.deepEqual(wordDeleteSpan("See \u20b9500 rain", 4, 5), { start: 4, end: 5 });
        assert.equal(wordDeleteGap("See \u20b9500 rain", 5, 8), "after");
        assert.deepEqual(wordDeleteSpan("See \u00a5500 rain", 5, 8), { start: 4, end: 9 });
        assert.equal(wordDeleteGap("See \u00a5500 rain", 5, 8), "after");
        assert.deepEqual(wordDeleteSpan("See 1,000 rain", 6, 9), { start: 5, end: 9 });
        assert.equal(wordDeleteGap("See 1,000 rain", 6, 9), "before");
        assert.deepEqual(wordDeleteSpan("See 1,000 rain", 5, 6), { start: 5, end: 9 });
        assert.equal(wordDeleteGap("See 1,000 rain", 5, 6), "before");
        assert.deepEqual(wordDeleteSpan("See 1,000,000 rain", 10, 13), { start: 9, end: 13 });
        assert.deepEqual(wordDeleteSpan("See 1,000,000 rain", 6, 9), { start: 5, end: 9 });
        assert.deepEqual(wordDeleteSpan("See 1,000.50 rain", 10, 12), { start: 9, end: 12 });
        assert.deepEqual(wordDeleteSpan("See 1, 000 rain", 7, 10), { start: 7, end: 11 });
        assert.deepEqual(wordDeleteSpan("See U.S.A. rain", 9, 11), { start: 4, end: 11 });
        assert.deepEqual(wordDeleteSpan("See Ph.D. rain", 8, 10), { start: 4, end: 10 });
        assert.deepEqual(wordDeleteSpan("Meet at 9 a.m. sharp", 13, 15), { start: 10, end: 15 });
        assert.deepEqual(wordDeleteSpan("See U.S.A. rain", 8, 9), { start: 4, end: 11 });
        assert.equal(wordDeleteGap("See U.S.A. rain", 8, 9), "after");
        assert.deepEqual(wordDeleteSpan("See U.S.A. rain", 6, 7), { start: 4, end: 11 });
        assert.deepEqual(wordDeleteSpan("Meet at 9 a.m. sharp", 12, 13), { start: 10, end: 15 });
        assert.equal(wordDeleteGap("Meet at 9 a.m. sharp", 12, 13), "after");
        assert.deepEqual(wordDeleteSpan("See i.e. the note", 6, 7), { start: 4, end: 9 });
        assert.deepEqual(wordDeleteSpan("See e.g., rain", 6, 7), { start: 4, end: 10 });
        assert.deepEqual(wordDeleteSpan("See e.g., rain", 7, 9), { start: 4, end: 10 });
        assert.deepEqual(wordDeleteSpan("See a.m.", 6, 7), { start: 3, end: 8 });
        assert.equal(wordDeleteGap("See a.m.", 6, 7), "before");
        assert.deepEqual(wordDeleteSpan("See Ph.D. rain", 7, 8), { start: 4, end: 10 });
        assert.equal(wordDeleteGap("See Ph.D. rain", 7, 8), "after");
        assert.deepEqual(wordDeleteSpan("See Ph.D. rain", 4, 6), { start: 4, end: 10 });
        assert.deepEqual(wordDeleteSpan("See file.a rain", 9, 10), { start: 8, end: 10 });
        assert.deepEqual(wordDeleteSpan("See M.Sc. rain", 6, 8), { start: 4, end: 10 });
        assert.deepEqual(wordDeleteSpan("See M.Sc. rain", 6, 10), { start: 4, end: 10 });
        assert.deepEqual(wordDeleteSpan("See M.Sc. rain", 8, 9), { start: 4, end: 10 });
        assert.equal(wordDeleteGap("See M.Sc. rain", 6, 8), "after");
        assert.deepEqual(wordDeleteSpan("See M.Sc. rain", 4, 5), { start: 4, end: 10 });
        assert.deepEqual(wordDeleteSpan("See B.Sc. rain", 6, 8), { start: 4, end: 10 });
        assert.deepEqual(wordDeleteSpan("See #tag rain", 5, 8), { start: 4, end: 9 });
        assert.deepEqual(wordDeleteSpan("See item#tag rain", 9, 12), { start: 9, end: 12 });
        assert.equal(wordDeleteGap("See #tag rain", 5, 8), "after");
        assert.deepEqual(wordDeleteSpan("See Harbor, rain", 10, 11), { start: 4, end: 12 });
        assert.deepEqual(wordDeleteSpan("See Harbor. rain", 4, 10), { start: 4, end: 12 });
        assert.deepEqual(wordDeleteSpan("See Harbor,", 4, 10), { start: 3, end: 11 });
        assert.deepEqual(wordDeleteSpan("See 3.14 rain", 4, 5), { start: 4, end: 6 });
        assert.deepEqual(wordDeleteSpan("See 3.14 rain", 5, 6), { start: 5, end: 8 });
        assert.deepEqual(wordDeleteSpan("See 3.14 rain", 6, 8), { start: 5, end: 8 });
        assert.deepEqual(wordDeleteSpan("See 3:14 rain", 4, 5), { start: 4, end: 6 });
        assert.deepEqual(wordDeleteSpan("See 3:14 rain", 5, 6), { start: 5, end: 8 });
        assert.deepEqual(wordDeleteSpan("See 3:14 rain", 6, 8), { start: 5, end: 8 });
        assert.equal(wordDeleteGap("See 3:14 rain", 4, 5), "after");
        assert.equal(wordDeleteGap("See 3:14 rain", 5, 6), "before");
        assert.equal(wordDeleteGap("See 3:14 rain", 6, 8), "before");
        assert.equal(wordDeleteGap("See 3:14 rain", 5, 8), "before");
        assert.equal(wordDeleteGap("See 3.14 rain", 5, 8), "before");
        assert.equal(wordDeleteGap("Open http://example now", 9, 12), "after");
        assert.deepEqual(wordDeleteSpan("See file.txt rain", 4, 8), { start: 4, end: 9 });
        assert.deepEqual(wordDeleteSpan("See file.txt rain", 8, 9), { start: 8, end: 12 });
        assert.deepEqual(wordDeleteSpan("See file.txt rain", 9, 12), { start: 8, end: 12 });
        assert.deepEqual(wordDeleteSpan("See wait...then rain", 4, 8), { start: 4, end: 11 });
        assert.deepEqual(wordDeleteSpan("See wait...then rain", 8, 11), { start: 8, end: 15 });
        assert.deepEqual(wordDeleteSpan("See wait...then rain", 11, 15), { start: 8, end: 15 });
        assert.equal(wordDeleteGap("See wait...then rain", 4, 8), "after");
        assert.equal(wordDeleteGap("See wait...then rain", 8, 11), "before");
        assert.deepEqual(wordDeleteSpan("See Harbor,rain", 4, 10), { start: 4, end: 11 });
        assert.deepEqual(wordDeleteSpan("See Harbor,rain", 10, 11), { start: 4, end: 11 });
        assert.equal(wordDeleteGap("See Harbor,rain", 4, 10), "after");
        assert.deepEqual(wordDeleteSpan("See Don't rain", 4, 7), { start: 4, end: 10 });
        assert.deepEqual(wordDeleteSpan("See Don't rain", 4, 8), { start: 4, end: 10 });
        assert.deepEqual(wordDeleteSpan("See Don't rain", 7, 9), { start: 4, end: 10 });
        assert.deepEqual(wordDeleteSpan("See Don't rain", 8, 9), { start: 4, end: 10 });
        assert.deepEqual(wordDeleteSpan("See Don\u2019t rain", 4, 7), { start: 4, end: 10 });
        assert.deepEqual(wordDeleteSpan("See Harbor's rain", 4, 10), { start: 4, end: 13 });
        assert.deepEqual(wordDeleteSpan("See Harbor's rain", 10, 12), { start: 4, end: 13 });
        assert.deepEqual(wordDeleteSpan("See O'Brien rain", 4, 5), { start: 4, end: 12 });
        assert.deepEqual(wordDeleteSpan("See boys' toys", 4, 8), { start: 4, end: 10 });
        assert.deepEqual(wordDeleteSpan("See 'Harbor' rain", 5, 11), { start: 4, end: 13 });
        assert.equal(wordDeleteGap("See Don't rain", 4, 7), "after");
        assert.deepEqual(wordDeleteSpan('See "Harbor" rain', 5, 11), { start: 4, end: 13 });
        assert.deepEqual(wordDeleteSpan("See (Harbor) rain", 5, 11), { start: 4, end: 13 });
        assert.deepEqual(wordDeleteSpan('See "Harbor", rain', 5, 11), { start: 4, end: 14 });
        assert.deepEqual(wordDeleteSpan('See "Harbor", rain', 11, 12), { start: 4, end: 14 });
        assert.deepEqual(wordDeleteSpan('See "Harbor", rain', 11, 13), { start: 4, end: 14 });
        assert.deepEqual(wordDeleteSpan('See "Harbor", rain', 11, 14), { start: 4, end: 14 });
        assert.deepEqual(wordDeleteSpan('See "Harbor", rain', 4, 5), { start: 4, end: 14 });
        assert.deepEqual(wordDeleteSpan('See "Harbor," rain', 5, 11), { start: 4, end: 14 });
        assert.deepEqual(wordDeleteSpan("See 'Harbor', rain", 5, 11), { start: 4, end: 14 });
        assert.deepEqual(wordDeleteSpan("See (Harbor), rain", 5, 11), { start: 4, end: 14 });
        assert.deepEqual(wordDeleteSpan("See (Harbor), rain", 11, 12), { start: 4, end: 14 });
        assert.deepEqual(wordDeleteSpan("See \u201cHarbor\u201d, rain", 5, 11), { start: 4, end: 14 });
        assert.equal(wordDeleteGap('See "Harbor", rain', 5, 11), "after");
        assert.equal(wordDeleteGap('See "Harbor", rain', 11, 14), "after");
        assert.equal(wordDeleteGap('See "Harbor", rain', 4, 5), "after");
        assert.deepEqual(cutRemoval("See Harbor rain", 4, 10), { start: 4, end: 11, gap: "after" });
        assert.deepEqual(cutRemoval("See Harbor rain", 11, 15), { start: 10, end: 15, gap: "before" });
        assert.deepEqual(cutRemoval("See Harbor rain", 4, 7), { start: 4, end: 7, gap: "none" });
    });

    it("keeps a plus at the end of a word with that word", () => {
        assert.deepEqual(wordDeleteSpan("See C++ rain", 4, 5), { start: 4, end: 8 });
        assert.deepEqual(wordDeleteSpan("See C++ rain", 5, 6), { start: 4, end: 8 });
        assert.deepEqual(wordDeleteSpan("See C++ rain", 5, 7), { start: 4, end: 8 });
        assert.equal(wordDeleteGap("See C++ rain", 4, 5), "after");
        assert.equal(wordDeleteGap("See C++ rain", 5, 7), "after");
        assert.deepEqual(wordDeleteSpan("See C++", 4, 5), { start: 3, end: 7 });
        assert.equal(wordDeleteGap("See C++", 4, 5), "before");
        assert.deepEqual(wordDeleteSpan("A+ rain", 0, 1), { start: 0, end: 3 });
        assert.deepEqual(wordDeleteSpan("See C++, rain", 4, 5), { start: 4, end: 9 });
        assert.deepEqual(wordDeleteSpan("See C++, rain", 5, 8), { start: 4, end: 9 });
        assert.deepEqual(wordDeleteSpan("See C++, rain", 7, 8), { start: 4, end: 9 });
        assert.deepEqual(wordDeleteSpan("See C++. rain", 5, 8), { start: 4, end: 9 });
        assert.deepEqual(wordDeleteSpan("See Harbor+ rain", 4, 10), { start: 4, end: 12 });
        assert.deepEqual(wordDeleteSpan("See Harbor+ rain", 4, 7), { start: 4, end: 7 });
        assert.deepEqual(wordDeleteSpan("See rock+roll rain", 4, 8), { start: 4, end: 9 });
        assert.deepEqual(wordDeleteSpan("See rock+roll rain", 8, 9), { start: 8, end: 13 });
    });

    it("keeps a hash at the end of a word with that word", () => {
        assert.deepEqual(wordDeleteSpan("See C# rain", 4, 5), { start: 4, end: 7 });
        assert.deepEqual(wordDeleteSpan("See C# rain", 5, 6), { start: 4, end: 7 });
        assert.equal(wordDeleteGap("See C# rain", 4, 5), "after");
        assert.equal(wordDeleteGap("See C# rain", 5, 6), "after");
        assert.deepEqual(wordDeleteSpan("See C#", 4, 5), { start: 3, end: 6 });
        assert.equal(wordDeleteGap("See C#", 4, 5), "before");
        assert.deepEqual(wordDeleteSpan("See C#, rain", 4, 5), { start: 4, end: 8 });
        assert.deepEqual(wordDeleteSpan("See C#, rain", 5, 7), { start: 4, end: 8 });
        assert.deepEqual(wordDeleteSpan("See C#. rain", 5, 7), { start: 4, end: 8 });
        assert.deepEqual(wordDeleteSpan("See Harbor# rain", 4, 10), { start: 4, end: 12 });
        assert.deepEqual(wordDeleteSpan("See Harbor# rain", 4, 7), { start: 4, end: 7 });
        assert.deepEqual(wordDeleteSpan("See C#5 rain", 4, 5), { start: 4, end: 5 });
        assert.deepEqual(wordDeleteSpan("See item#tag rain", 4, 8), { start: 4, end: 8 });
        assert.deepEqual(wordDeleteSpan("See #tag rain", 5, 8), { start: 4, end: 9 });
    });

    it("keeps a mark at the end of a word with that word", () => {
        for (const mark of ["*", "_", "&", "/", "@", "=", "|", "~", "\\", "^", "-", "\u2013"]) {
            const text = `See note${mark} rain`;
            const at = text.indexOf(mark);
            assert.deepEqual(wordDeleteSpan(text, at, at + 1), { start: 4, end: at + 2 });
            assert.equal(wordDeleteGap(text, at, at + 1), "after");
            assert.deepEqual(wordDeleteSpan(text, 4, 6), { start: 4, end: 6 });
        }
        assert.deepEqual(wordDeleteSpan("See note* rain", 4, 8), { start: 4, end: 10 });
        assert.deepEqual(wordDeleteSpan("See note*star rain", 8, 9), { start: 8, end: 13 });
        assert.deepEqual(wordDeleteSpan("See note** rain", 8, 9), { start: 4, end: 11 });
        assert.deepEqual(wordDeleteSpan("See note*, rain", 8, 9), { start: 4, end: 11 });
        assert.deepEqual(wordDeleteSpan("See note*", 8, 9), { start: 3, end: 9 });
        assert.equal(wordDeleteGap("See note*", 8, 9), "before");
    });

    it("keeps a space on both sides of the word typed after a deleted word", () => {
        assert.equal(wordDeleteGap("See Harbor rain", 4, 10), "after");
        assert.equal(wordDeleteGap("See  Harbor rain", 5, 11), "after");
        assert.equal(wordDeleteGap("See  Harbor", 5, 11), "before");
        assert.equal(wordDeleteGap("See Harbor rain", 4, 11), "after");
        assert.equal(wordDeleteGap("See Harbor rain", 3, 10), "before");
        assert.equal(wordDeleteGap("Harbor rain", 0, 6), "after");
        assert.equal(wordDeleteGap("See Harbor", 4, 10), "before");
        assert.equal(wordDeleteGap("Harbor", 0, 6), "none");
        assert.equal(wordDeleteGap("See Harbor rain", 4, 7), "none");
        assert.equal(wordDeleteGap("See Harbor rain", 11, 15), "before");
        assert.equal(wordDeleteGap("See Harbor rain", 0, 3), "after");
        assert.equal(wordDeleteGap("See well-known rain", 9, 14), "before");
        assert.equal(wordDeleteGap("See well-known rain", 8, 9), "before");
        assert.equal(wordDeleteGap("See well-known rain", 4, 8), "after");
        assert.equal(wordDeleteGap("See and/or rain", 8, 10), "before");
        assert.equal(wordDeleteGap("See and/or rain", 7, 8), "before");
        assert.equal(wordDeleteGap("See and/or rain", 4, 7), "after");
        assert.equal(wordDeleteGap("See rock&roll rain", 9, 13), "before");
        assert.equal(wordDeleteGap("See rock&roll rain", 8, 9), "before");
        assert.equal(wordDeleteGap("See rock&roll rain", 4, 8), "after");
        assert.equal(wordDeleteGap("See Harbor, rain", 4, 10), "after");
        assert.equal(wordDeleteGap('See "Harbor" rain', 5, 11), "after");
        assert.equal(wordDeleteGap("See (Harbor) rain", 5, 11), "after");
        assert.deepEqual(wordGapInsert("after", "B"), { text: "B ", caret: 1, pull: false });
        assert.deepEqual(wordGapInsert("after", "Bay"), { text: "Bay ", caret: 3, pull: false });
        assert.deepEqual(wordGapInsert("before", "B"), { text: " B", caret: 2, pull: false });
        assert.deepEqual(wordGapInsert("after", ","), { text: ",", caret: 1, pull: true });
        assert.equal(wordGapInsert("before", ","), null);
        assert.equal(wordGapInsert("after", " "), null);
        assert.equal(wordGapInsert("before", " "), null);
        assert.deepEqual(wordGapInsert("after", "B."), { text: "B. ", caret: 2, pull: false });
        assert.deepEqual(wordGapInsert("after", "Bay falls"), { text: "Bay falls ", caret: 9, pull: false });
        assert.deepEqual(wordGapInsert("before", "Bay falls"), { text: " Bay falls", caret: 10, pull: false });
        assert.deepEqual(wordGapInsert("after", "Bay,"), { text: "Bay, ", caret: 4, pull: false });
        assert.equal(wordGapInsert("after", "Bay\nfalls"), null);
        assert.equal(wordGapKey({ key: "Control" }), "keep");
        assert.equal(wordGapKey({ key: "Meta" }), "keep");
        assert.equal(wordGapKey({ key: "Shift" }), "keep");
        assert.equal(wordGapKey({ key: "Alt" }), "clear");
        assert.equal(wordGapKey({ key: "v", ctrlKey: true }), "keep");
        assert.equal(wordGapKey({ key: "v", metaKey: true }), "keep");
        assert.equal(wordGapKey({ key: "Insert", shiftKey: true }), "keep");
        assert.equal(wordGapKey({ key: "b", ctrlKey: true }), "clear");
        assert.equal(wordGapKey({ key: "Backspace" }), "clear");
        assert.equal(wordGapKey({ key: "B" }), "keep");
        assert.equal(wordGapKey({ key: " " }), "keep");
        assert.deepEqual(wordGapSpace({ text: "See rain", offset: 4, gap: "after" }), { action: "hold", gap: "after" });
        assert.deepEqual(wordGapSpace({ text: "See", offset: 3, gap: "before" }), { action: "hold", gap: "before" });
        assert.deepEqual(wordGapSpace({ text: "See Bay rain", offset: 7, gap: null }), { action: "hold", gap: "before" });
        assert.deepEqual(wordGapSpace({ text: "See Bay, rain", offset: 8, gap: null }), { action: "hold", gap: "before" });
        assert.deepEqual(wordGapSpace({ text: "See Bay rain", offset: 7, gap: "after" }), { action: "hold", gap: "before" });
        assert.deepEqual(wordGapSpace({ text: "See Bay rain", offset: 8, gap: null }), { action: "hold", gap: "after" });
        assert.deepEqual(wordGapSpace({ text: "See Bay rain", offset: 8, gap: "before" }), { action: "hold", gap: "after" });
        assert.deepEqual(wordGapSpace({ text: "See Bay", offset: 7, gap: null }), { action: "type" });
    });

    it("keeps the deleted word available to undo while its replacement is typed", () => {
        assert.equal(stickyUndo({ sticky: true, matches: true, sameLine: true }), "restore");
        assert.equal(stickyUndo({ sticky: true, matches: true, sameLine: false }), "restore");
        assert.equal(stickyUndo({ sticky: true, matches: false, sameLine: true }), "keep");
        assert.equal(stickyUndo({ sticky: true, matches: false, sameLine: false }), "clear");
        assert.equal(stickyUndo({ sticky: false, matches: false, sameLine: true }), "clear");
        assert.equal(stickyUndo({ sticky: false, matches: true, sameLine: false }), "restore");
        assert.equal(stickyTyped({ sticky: true, sameLine: true, current: "<p>See Bay rain</p>", before: "<p>See Harbor rain</p>", after: "<p>See rain</p>" }), "record");
        assert.equal(stickyTyped({ sticky: true, sameLine: true, current: "<p>See rain</p>", before: "<p>See Harbor rain</p>", after: "<p>See rain</p>" }), "skip");
        assert.equal(stickyTyped({ sticky: true, sameLine: true, current: "<p>See Harbor rain</p>", before: "<p>See Harbor rain</p>", after: "<p>See rain</p>" }), "skip");
        assert.equal(stickyTyped({ sticky: true, sameLine: false, current: "<p>See Bay rain</p>", before: "<p>See Harbor rain</p>", after: "<p>See rain</p>" }), "skip");
        assert.equal(stickyTyped({ sticky: false, sameLine: true, current: "<p>See Bay rain</p>", before: "<p>See Harbor rain</p>", after: "<p>See rain</p>" }), "skip");
        assert.equal(typedRedo({ redone: "<p>See rain</p>", typed: "<p>See Bay rain</p>", undone: "<p>See Harbor rain</p>" }), "<p>See Bay rain</p>");
        assert.equal(typedRedo({ redone: "<p>See rain</p>", typed: null, undone: "<p>See Harbor rain</p>" }), "<p>See rain</p>");
        assert.equal(typedRedo({ redone: "<p>See rain</p>", typed: "<p>See rain</p>", undone: "<p>See Harbor rain</p>" }), "<p>See rain</p>");
        assert.equal(typedRedo({ redone: "<p>See rain</p>", typed: "<p>See Harbor rain</p>", undone: "<p>See Harbor rain</p>" }), "<p>See rain</p>");
    });

    it("puts the cursor back on the word when a styled space is undone", () => {
        assert.equal(blankUndoCaret({ caret: 10 }), 10);
        assert.equal(blankUndoCaret({ caret: 0 }), 0);
        assert.equal(blankUndoCaret({}), null);
        assert.equal(blankUndoCaret(null), null);
    });

    it("puts the cursor back at the end of a line when Delete joined the next one", () => {
        assert.equal(joinUndoCaret({ forward: true, offset: 10 }), 10);
        assert.equal(joinUndoCaret({ forward: true, offset: 0 }), 0);
        assert.equal(joinUndoCaret({ forward: false, offset: 10 }), null);
    });

    it("undo of a split line puts the space back", () => {
        assert.deepEqual(boundarySpaceCut("Harbor", " rain"), { before: 0, after: 1 });
        assert.deepEqual(boundarySpaceCut("Harbor ", "rain"), { before: 1, after: 0 });
        assert.deepEqual(boundarySpaceCut("Harbor\u00a0", "rain"), { before: 1, after: 0 });
        assert.deepEqual(boundarySpaceCut("Harbor  ", " rain"), { before: 2, after: 1 });
        assert.equal(boundarySpaceCut("Harbor", "rain"), null);
        assert.equal(boundarySpaceCut("Harbor ", ""), null);
    });

    it("moves the rest of a heading onto a normal line", () => {
        const middle = { key: "Enter", inHeading: true, collapsed: true, dateHeading: false, before: "Dawn", after: " watch" };
        assert.equal(headingEnterKey(middle), "paragraph");
        assert.equal(headingEnterKey({ ...middle, before: "Dawn ", after: "watch" }), "paragraph");
        assert.equal(headingEnterKey({ ...middle, before: "Dawn", after: "watch" }), "paragraph");
        assert.equal(headingEnterKey({ ...middle, after: "" }), "pass");
        assert.equal(headingEnterKey({ ...middle, before: "", after: "watch" }), "above");
        assert.equal(headingEnterKey({ ...middle, before: "  ", after: "watch" }), "above");
        assert.equal(headingEnterKey({ ...middle, before: "", after: "" }), "leave");
        assert.equal(headingEnterKey({ ...middle, before: "  ", after: " \u00a0" }), "leave");
        assert.equal(headingEnterKey({ ...middle, before: "", after: "", hasImage: true }), "pass");
        assert.equal(headingEnterKey({ ...middle, before: "", dateHeading: true }), "pass");
        assert.equal(headingEnterKey({ ...middle, dateHeading: true }), "pass");
        assert.equal(headingEnterKey({ ...middle, shiftKey: true }), "pass");
        assert.equal(headingEnterKey({ ...middle, inHeading: false }), "pass");
        const saved = { before: "<h1>Dawn watch</h1>", after: "<h1>Dawn</h1><p>watch</p>" };
        assert.equal(headingSplitUndo({ saved, current: saved.after }), "restore");
        assert.equal(headingSplitUndo({ saved, current: "<h1>Dawn</h1><p>watch!</p>" }), "pass");
        assert.equal(headingSplitUndo({ saved: null, current: saved.after }), "pass");
    });

    it("keeps the rest of a line with a divider", () => {
        assert.equal(dividerCaret({ emptyLine: true, followsRule: true, nextHasWriting: true }), "join");
        assert.equal(dividerCaret({ emptyLine: true, followsRule: true, nextHasWriting: false }), "stay");
        assert.equal(dividerCaret({ emptyLine: false, followsRule: true, nextHasWriting: true }), "stay");
        assert.equal(dividerCaret({ emptyLine: true, followsRule: false, nextHasWriting: true }), "stay");
        const besideRule = { key: "Backspace", collapsed: true, atEdge: true, rule: true, ctrlKey: true };
        assert.equal(dividerLineKey(besideRule), "rule");
        assert.equal(dividerLineKey({ ...besideRule, key: "Delete", ctrlKey: false, metaKey: true }), "rule");
        assert.equal(dividerLineKey({ ...besideRule, ctrlKey: false, metaKey: false }), "pass");
        assert.equal(dividerLineKey({ ...besideRule, altKey: true }), "pass");
        assert.equal(dividerLineKey({ ...besideRule, shiftKey: true }), "pass");
        assert.equal(dividerLineKey({ ...besideRule, atEdge: false }), "pass");
        assert.equal(dividerLineKey({ ...besideRule, rule: false }), "pass");
        assert.equal(dividerLineKey({ ...besideRule, collapsed: false }), "pass");
        assert.equal(dividerLineKey({ ...besideRule, key: "Enter" }), "pass");
    });

    it("keeps each line when the page is saved and exported", () => {
        const split = prepareEntryContent("<pre><code>const a = 1;</code><code>const b = 2;</code></pre>");
        assert.equal(split.ok, true);
        if (!split.ok) return;
        assert.equal(split.content, "<pre><code>const a = 1;\nconst b = 2;</code></pre>");
        assert.match(htmlToMarkdown(split.content), /```\nconst a = 1;\nconst b = 2;\n```/);

        const broken = prepareEntryContent("<pre><code>const a = 1;<br>const b = 2;</code></pre>");
        assert.equal(broken.ok, true);
        if (!broken.ok) return;
        assert.equal(broken.content, "<pre><code>const a = 1;\nconst b = 2;</code></pre>");

        const marked = prepareEntryContent("<pre><code>const a = 1;\n\u200bconst b = 2;</code></pre>");
        assert.equal(marked.ok, true);
        if (!marked.ok) return;
        assert.equal(marked.content, "<pre><code>const a = 1;\nconst b = 2;</code></pre>");
    });

    it("keeps a list that was nested inside a paragraph", () => {
        const saved = prepareEntryContent("<p><ul><li><b>first</b></li><li>second</li></ul></p>");
        assert.equal(saved.ok, true);
        if (!saved.ok) return;
        assert.equal(saved.content, "<ul><li><b>first</b></li><li>second</li></ul>");
        assert.equal(htmlToMarkdown(saved.content), "- **first**\n- second");
        const numbered = prepareEntryContent("<h2>Saturday, November 14, 2026</h2><p><ol><li>one</li><li>two</li></ol></p>");
        assert.equal(numbered.ok, true);
        if (!numbered.ok) return;
        assert.equal(numbered.content, "<h2>Saturday, November 14, 2026</h2><ol><li>one</li><li>two</li></ol>");
        const continued = prepareEntryContent('<ol start="2"><li>Harbor</li><li>today</li></ol>');
        assert.equal(continued.ok, true);
        if (!continued.ok) return;
        assert.equal(continued.content, '<ol start="2"><li>Harbor</li><li>today</li></ol>');
        assert.equal(htmlToMarkdown(continued.content), "2. Harbor\n3. today");
        assert.equal(htmlToMarkdown('<ol start="nope"><li>Harbor</li></ol>'), "1. Harbor");
        assert.equal(htmlToMarkdown("<ul><li><p>Harbor</p></li></ul>"), "- Harbor");
        assert.equal(
            htmlToMarkdown("<ul><li><p>Harbor</p><p>rain</p></li><li><p>today</p></li></ul>"),
            "- Harbor\n\n  rain\n- today",
        );
        assert.equal(
            htmlToMarkdown("<ol><li><p><b>Harbor</b></p><p>rain</p></li></ol>"),
            "1. **Harbor**\n\n   rain",
        );
    });

    it("keeps a line break inside the list item when the entry is copied", () => {
        assert.equal(
            htmlToMarkdown("<ul><li>Harbor<br>rain</li><li>today</li></ul>"),
            "- Harbor\n  rain\n- today",
        );
        assert.equal(
            htmlToMarkdown("<ol><li><b>Harbor</b><br>rain</li></ol>"),
            "1. **Harbor**\n   rain",
        );
        assert.equal(
            htmlToMarkdown("<ul><li>Harbor<br><br>rain</li></ul>"),
            "- Harbor\n\n  rain",
        );
    });

    it("keeps a nested list under the line above when the entry is copied", () => {
        assert.equal(
            htmlToMarkdown("<ol><li>Harbor<ol><li>rain</li></ol></li><li>today</li></ol>"),
            "1. Harbor\n   1. rain\n2. today",
        );
        assert.equal(
            htmlToMarkdown("<ul><li>Harbor<ul><li>rain</li></ul></li><li>today</li></ul>"),
            "- Harbor\n  - rain\n- today",
        );
        assert.equal(
            htmlToMarkdown("<ol><li>Harbor<ol><li>rain<ol><li>deep</li></ol></li></ol></li></ol>"),
            "1. Harbor\n   1. rain\n      1. deep",
        );
    });

    it("keeps a styled line break styled on each line when the entry is copied", () => {
        assert.equal(
            htmlToMarkdown("<ul><li><b>Harbor<br>rain</b></li></ul>"),
            "- **Harbor**\n  **rain**",
        );
        assert.equal(
            htmlToMarkdown("<ol><li><i>Harbor<br>rain</i></li></ol>"),
            "1. *Harbor*\n   *rain*",
        );
        assert.equal(
            htmlToMarkdown("<blockquote><b>Harbor<br>rain</b></blockquote>"),
            "> **Harbor**\n> **rain**",
        );
        assert.equal(
            htmlToMarkdown("<p>See <a href=\"https://example.com\">Harbor<br>rain</a> today</p>"),
            "See [Harbor](https://example.com)\n[rain](https://example.com) today",
        );
        assert.equal(htmlToMarkdown("<p><code>Harbor<br>rain</code></p>"), "`Harbor`\n`rain`");
    });

    it("keeps a line break inside a heading as a heading on each line", () => {
        assert.equal(htmlToMarkdown("<h2>Harbor<br>rain</h2>"), "## Harbor\n## rain");
        assert.equal(htmlToMarkdown("<h1>See <b>Harbor<br>rain</b></h1>"), "# See **Harbor**\n# **rain**");
        assert.equal(htmlToMarkdown("<h3>Harbor<br><br>rain</h3>"), "### Harbor\n\n### rain");
    });

    it("keeps each row of a pasted table", () => {
        const saved = prepareEntryContent("<table><tr><th>Rain</th><th>Harbor</th></tr><tr><td>Bread</td><td><b>Market</b></td></tr></table>");
        assert.equal(saved.ok, true);
        if (!saved.ok) return;
        assert.equal(saved.content, "<p>Rain Harbor</p><p>Bread <b>Market</b></p>");
        assert.equal(htmlToMarkdown(saved.content), "Rain Harbor\n\nBread **Market**");
    });

    it("keeps pasted lines that were wrapped in divs", () => {
        const saved = prepareEntryContent("<div>Monday</div><div><b>Walked</b> to the harbor</div>");
        assert.equal(saved.ok, true);
        if (!saved.ok) return;
        assert.equal(saved.content, "<p>Monday</p><p><b>Walked</b> to the harbor</p>");
        assert.equal(htmlToMarkdown(saved.content), "Monday\n\n**Walked** to the harbor");

        const wrapped = prepareEntryContent('<div class="highlight"><pre><code>const a = 1;\nconst b = 2;</code></pre></div>');
        assert.equal(wrapped.ok, true);
        if (!wrapped.ok) return;
        assert.equal(wrapped.content, "<pre><code>const a = 1;\nconst b = 2;</code></pre>");
    });
});

describe("diary ids", () => {
    it("accepts a 24 character hex id", () => {
        assert.equal(isObjectId("507f1f77bcf86cd799439011"), true);
        assert.equal(isObjectId("507F1F77BCF86CD799439011"), true);
    });

    it("rejects ids that are only 12 characters", () => {
        assert.equal(isObjectId("timtomtamted"), false);
        assert.equal(isObjectId("507f1f77bcf86cd79943901"), false);
        assert.equal(isObjectId("507f1f77bcf86cd799439011zz"), false);
        assert.equal(isObjectId(""), false);
    });
});

describe("diary fields", () => {
    it("trims and collapses a title", () => {
        assert.deepEqual(normalizeTitle("  Morning   pages  "), { ok: true, value: "Morning pages" });
    });

    it("rejects a short title", () => {
        assert.deepEqual(normalizeTitle("  no "), { ok: false, error: "Title must be at least 3 characters." });
        assert.deepEqual(normalizeTitle(12), { ok: false, error: "Title must be at least 3 characters." });
    });

    it("rejects a very long title", () => {
        const result = normalizeTitle("a".repeat(121));
        assert.equal(result.ok, false);
        if (!result.ok) assert.match(result.error, /120/);
    });

    it("allows an empty description and caps a long one", () => {
        assert.deepEqual(normalizeDescription(undefined), { ok: true, value: "" });
        assert.deepEqual(normalizeDescription("  notes  "), { ok: true, value: "notes" });
        const result = normalizeDescription("a".repeat(501));
        assert.equal(result.ok, false);
    });

    it("names a known cover and ignores an unknown one", () => {
        assert.equal(coverForTheme("/textures/wooden_garage_door.webp")?.name, "Wooden Garage Door");
        assert.equal(coverForTheme("/textures/missing.jpg"), null);
        assert.equal(coverForTheme(null), null);
    });

    it("defaults a missing theme and rejects an unknown one", () => {
        assert.deepEqual(normalizeTheme(undefined), { ok: true, value: DEFAULT_DIARY_THEME });
        assert.deepEqual(normalizeTheme("/textures/leather-bound.webp"), {
            ok: true,
            value: "/textures/leather-bound.webp",
        });
        assert.deepEqual(normalizeTheme("https://evil.example/cover.jpg"), {
            ok: false,
            error: "Choose a theme from the list.",
        });
        assert.equal(normalizeThemeUpdate(undefined).ok, false);
    });

    it("rejects an impossible entry date", () => {
        const now = Date.parse("2026-06-01T00:00:00.000Z");
        assert.equal(parseEntryDate("not-a-date", now).ok, false);
        assert.equal(parseEntryDate("2099-01-01T00:00:00.000Z", now).ok, false);
        const parsed = parseEntryDate("2026-05-31T12:00:00.000Z", now);
        assert.equal(parsed.ok, true);
        if (parsed.ok) assert.equal(parsed.value.toISOString(), "2026-05-31T12:00:00.000Z");
    });
});

describe("entry html", () => {
    it("keeps headings, emphasis, and safe links", () => {
        const result = prepareEntryContent("<h2>Day</h2><p>Hello <strong>there</strong></p><a href=\"https://example.com\">link</a>");
        assert.equal(result.ok, true);
        if (!result.ok) return;
        assert.match(result.content, /<h2>Day<\/h2>/);
        assert.match(result.content, /<strong>there<\/strong>/);
        assert.match(result.content, /href="https:\/\/example.com"/);
        assert.equal(result.plainText, "Day Hello there link");
    });

    it("strips scripts, handlers, and javascript links", () => {
        const result = prepareEntryContent(
            `<p onclick="alert(1)">Hi</p><script>alert(1)</script><a href="javascript:alert(1)">x</a><img src="x" onerror="alert(1)">`
        );
        assert.equal(result.ok, true);
        if (!result.ok) return;
        assert.doesNotMatch(result.content, /script|onclick|onerror|javascript:/i);
        assert.match(result.plainText, /Hi/);
        assert.doesNotMatch(result.plainText, /alert/);
    });

    it("opens a saved link in a new tab", () => {
        const result = prepareEntryContent('<p><a href="https://example.com/glass" target="_self" rel="opener">window</a></p>');
        assert.equal(result.ok, true);
        if (!result.ok) return;
        assert.match(result.content, /href="https:\/\/example.com\/glass"/);
        assert.match(result.content, /target="_blank"/);
        assert.match(result.content, /rel="noopener noreferrer"/);
        assert.doesNotMatch(result.content, /_self|rel="opener"/);
        assert.equal(result.plainText, "window");

        const shown = presentEntry({ content: '<p><a href="mailto:rain@example.com">rain</a>.</p>', plainText: "rain ." });
        assert.match(shown.content, /href="mailto:rain@example.com"/);
        assert.match(shown.content, /target="_blank"/);
        assert.match(shown.content, /rel="noopener noreferrer"/);
        assert.equal(shown.plainText, "rain.");
    });

    it("allows a small image data url and drops other data urls", () => {
        const png = `<img src="data:image/png;base64,aaaa" alt="sketch">`;
        const kept = prepareEntryContent(`<p>Look</p>${png}`);
        assert.equal(kept.ok, true);
        if (kept.ok) assert.match(kept.content, /data:image\/png;base64,aaaa/);

        const svg = prepareEntryContent(`<p>Look</p><img src="data:image/svg+xml;base64,PHN2Zz4=">`);
        assert.equal(svg.ok, true);
        if (svg.ok) assert.doesNotMatch(svg.content, /svg\+xml/);
    });

    it("keeps an entry that is only an image", () => {
        const result = prepareEntryContent('<img src="https://example.com/sunset.png" alt="sunset">');
        assert.equal(result.ok, true);
        if (result.ok) {
            assert.match(result.content, /sunset\.png/);
            assert.match(result.plainText, /sunset/);
        }
    });

    it("rejects an entry with no text", () => {
        assert.deepEqual(prepareEntryContent("<p><br></p>"), { ok: false, error: "Content is required." });
        assert.deepEqual(prepareEntryContent("   "), { ok: false, error: "Content is required." });
    });

    it("rejects an oversized entry and drops an oversized image", () => {
        assert.equal(prepareEntryContent("a".repeat(CONTENT_MAX + 1)).ok, false);
        const huge = `<p>note</p><img src="data:image/png;base64,${"a".repeat(MAX_DATA_IMAGE_LENGTH)}">`;
        const result = prepareEntryContent(huge);
        assert.equal(result.ok, true);
        if (result.ok) assert.doesNotMatch(result.content, /data:image/);
    });

    it("keeps a stored plain text and fills one in when it is missing", () => {
        assert.deepEqual(storedPlainText({ content: "<p>old</p>", plainText: "kept" }), {
            plainText: "kept",
            needsWrite: false,
        });
        assert.deepEqual(storedPlainText({ content: "<p>old</p>", plainText: "" }), {
            plainText: "",
            needsWrite: false,
        });
        assert.deepEqual(storedPlainText({ content: "<p>Hello <strong>there</strong></p>" }), {
            plainText: "Hello there",
            needsWrite: true,
        });
        assert.deepEqual(storedPlainText({ content: '<img src="https://example.com/a.png" alt="">' }), {
            plainText: "Image",
            needsWrite: true,
        });
    });

    it("returns stored html without scripts", () => {
        const presented = presentEntry({
            content: `<p onclick="alert(1)">Hi</p><script>alert(1)</script><img src="https://example.com/a.png" alt="sketch">`,
            plainText: "alert(1) Hi sketch",
        });
        assert.equal(presented.content.includes("script"), false);
        assert.equal(presented.content.includes("onclick"), false);
        assert.match(presented.content, /Hi/);
        assert.equal(presented.plainText.includes("alert"), false);
        assert.match(presented.plainText, /Hi/);
        assert.match(presented.plainText, /sketch/);
    });

    it("leaves the caret mark out of the writing after a picture", () => {
        assert.equal(entryWritingText("<ul><li>One</li><li>\u200bQ<ul><li>Nest</li></ul></li></ul>"), "One Q Nest");
        assert.equal(entryWritingText("<ul><li>One</li><li>\u200b</li></ul>"), "One");
        assert.deepEqual(dropCaretMarker({ text: "\u200bQ", offset: 2 }), { text: "Q", offset: 1 });
        assert.deepEqual(dropCaretMarker({ text: "\u200bQ\u200b", offset: 2 }), { text: "Q", offset: 1 });
        assert.equal(dropCaretMarker({ text: "\u200b", offset: 1 }), null);
        assert.equal(dropCaretMarker({ text: "Q", offset: 1 }), null);
        assert.equal(caretMarkBeside({ text: "\u200b", caretInside: false, writingBeside: true }), "drop");
        assert.equal(caretMarkBeside({ text: "\u200b", caretInside: true, writingBeside: true }), "keep");
        assert.equal(caretMarkBeside({ text: "\u200b", caretInside: false, writingBeside: false }), "keep");
        assert.equal(caretMarkBeside({ text: "\u200bQ", caretInside: false, writingBeside: true }), "keep");
        assert.equal(caretMarkBeside({ text: "Q", caretInside: false, writingBeside: true }), "keep");
        const saved = prepareEntryContent("<ul><li>One</li><li>\u200bQ</li></ul>");
        assert.equal(saved.ok, true);
        if (!saved.ok) return;
        assert.equal(saved.content.includes("\u200b"), false);
        assert.equal(saved.plainText, "One Q");
    });

    it("counts words from visible text", () => {
        assert.equal(entryPlainText("<p>one&nbsp;two &amp; three</p>"), "one two & three");
        assert.equal(wordCount("<p>one two <strong>three</strong></p>"), 3);
        assert.equal(wordCount("<script>secret words</script><p></p>"), 0);
        assert.equal(entryPlainText('<p>Quiet <a href="https://example.com/glass">window</a>.</p>'), "Quiet window.");
        assert.equal(wordCount('<p>Quiet <a href="https://example.com/glass">window</a>.</p>'), 2);
        assert.equal(entryPlainText("<p><strong>Hello</strong>, rain.</p>"), "Hello, rain.");
    });

    it("does not treat the inserted date heading as the entry", () => {
        const label = formatEntryLong(new Date(2026, 10, 14).toISOString());
        const blank = `<h2>${label}</h2><p><br></p>`;
        const note = `<h2>${label}</h2><p>Newest snow.</p>`;

        assert.equal(entryWritingText(blank), "");
        assert.equal(wordCount(blank), 0);
        assert.equal(entryWritingText(note), "Newest snow.");
        assert.equal(wordCount(note), 2);
        assert.deepEqual(prepareEntryContent(blank), { ok: false, error: "Content is required." });
        assert.deepEqual(prepareEntryContent(`<h2><b>${label}</b></h2>`), { ok: false, error: "Content is required." });
        const styled = prepareEntryContent(`<h1><em>${label}</em> Kept</h1>`);
        assert.equal(styled.ok, true);
        if (styled.ok) {
            assert.equal(styled.content, `<h2>${label}</h2><p>Kept</p>`);
            assert.equal(styled.plainText, "Kept");
        }

        const saved = prepareEntryContent(note);
        assert.equal(saved.ok, true);
        if (!saved.ok) return;
        assert.match(saved.content, new RegExp(`<h2>${label}</h2>`));
        assert.equal(saved.plainText, "Newest snow.");

        const shown = presentEntry({ content: note, plainText: `${label} Newest snow.` });
        assert.equal(shown.plainText, "Newest snow.");

        const ownHeading = prepareEntryContent("<h2>Notaday, November 14, 2026</h2><p>Kept</p>");
        assert.equal(ownHeading.ok, true);
        if (ownHeading.ok) assert.equal(ownHeading.plainText, "Notaday, November 14, 2026 Kept");

        const picture = prepareEntryContent(`<h2>${label}</h2><img src="https://example.com/sunset.png" alt="sunset">`);
        assert.equal(picture.ok, true);
        if (picture.ok) assert.equal(picture.plainText, "sunset");

        const named = prepareEntryContent(`<img src="https://example.com/sunset.png" alt="sunset"><p>sunset</p>`);
        assert.equal(named.ok, true);
        if (named.ok) assert.equal(named.plainText, "sunset");
        assert.equal(wordCount(`<img src="https://example.com/sunset.png" alt="sunset"><p>sunset</p>`), 1);
        assert.equal(
            entryPlainText('<figure><img src="https://example.com/sunset.png" alt="Harbor"><figcaption>Bay</figcaption></figure>'),
            "Bay",
        );
        assert.equal(
            wordCount('<figure><img src="https://example.com/sunset.png" alt="Harbor"><figcaption>Bay</figcaption></figure>'),
            1,
        );

        const pulled = prepareEntryContent('<figure><img src="https://example.com/sunset.png" alt="Harbor"><span>Harbor</span></figure>');
        assert.equal(pulled.ok, true);
        if (pulled.ok) {
            assert.match(pulled.content, /alt="Harbor"/);
            assert.equal(pulled.content.replace(/<[^>]+>/g, "").includes("Harbor"), true);
            assert.equal(pulled.content.includes("<figure"), false);
            assert.equal(pulled.plainText, "Harbor");
        }

        const removedPicture = prepareEntryContent('<h2>Saturday, November 14, 2026</h2><figure><figcaption>Harbor</figcaption></figure><p>After</p>');
        assert.equal(removedPicture.ok, true);
        if (removedPicture.ok) {
            assert.equal(removedPicture.content.includes("Harbor"), false);
            assert.equal(removedPicture.content.includes("<figure"), false);
            assert.match(removedPicture.content, /After/);
            assert.equal(removedPicture.plainText, "After");
        }

        const stranded = prepareEntryContent('<h2>Saturday, November 14, 2026</h2><p>Before</p><figure>x<img src="https://example.com/sunset.png" alt="Harbor"><figcaption>Harbor</figcaption></figure><p>After</p>');
        assert.equal(stranded.ok, true);
        if (stranded.ok) {
            assert.match(stranded.content, /<p>x<\/p>/);
            assert.match(stranded.content, /<figcaption>Harbor<\/figcaption>/);
            assert.match(stranded.content, /<p>After<\/p>/);
            assert.equal(stranded.content.includes("<figure>x"), false);
            assert.equal(stranded.plainText, "Before x Harbor After");
        }
        const trailing = prepareEntryContent('<figure><img src="https://example.com/sunset.png" alt="Harbor"><figcaption>Harbor</figcaption>y</figure>');
        assert.equal(trailing.ok, true);
        if (trailing.ok) {
            assert.match(trailing.content, /<p>y<\/p>/);
            assert.equal(trailing.plainText, "Harbor y");
        }

        const renamed = prepareEntryContent('<figure><img src="https://example.com/sunset.png" alt="Harbor"><figcaption>Bay</figcaption></figure>');
        assert.equal(renamed.ok, true);
        if (renamed.ok) {
            assert.match(renamed.content, /alt="Bay"/);
            assert.equal(renamed.content.includes("Harbor"), false);
            assert.equal(renamed.plainText, "Bay");
            assert.equal(wordCount(renamed.content), 1);
        }

        const boldName = prepareEntryContent('<figure><img src="https://example.com/sunset.png" alt="old"><figcaption><b>Harbor</b> rain</figcaption></figure><p>today</p>');
        assert.equal(boldName.ok, true);
        if (boldName.ok) {
            assert.match(boldName.content, /<figcaption><b>Harbor<\/b> rain<\/figcaption>/);
            assert.match(boldName.content, /alt="Harbor rain"/);
            assert.match(boldName.content, /<p>today<\/p>/);
            assert.equal(boldName.plainText, "Harbor rain today");
        }
    });
});

describe("search", () => {
    it("escapes regex characters in a query", () => {
        assert.equal(escapeRegExp("day.one"), "day\\.one");
        const filter = buildEntrySearchFilter("user-1", "  day.one  ");
        assert.ok(filter);
        const pattern = filter?.$or[0].plainText.$regex;
        assert.equal(pattern, "day\\.one");
        assert.equal(filter?.userId, "user-1");
    });

    it("matches a diary title or description and ignores a blank query", () => {
        assert.equal(normalizeSearchQuery("  hello  "), "hello");
        assert.equal(normalizeSearchQuery("Hello ,"), "Hello,");
        assert.equal(normalizeSearchQuery("Harbor  rain"), "Harbor rain");
        assert.equal(diaryFieldsMatch("Hello, rain", "", "Hello ,"), true);
        assert.equal(diaryFieldsMatch("Harbor rain today", "", "Harbor  rain"), true);
        const spaced = buildEntrySearchFilter("user-1", "Hello ,");
        assert.equal(spaced?.$or[0].plainText.$regex, "Hello,");
        assert.deepEqual(matchedTextParts("Hello, rain", "Hello ,"), [
            { text: "Hello,", match: true },
            { text: " rain", match: false },
        ]);
        assert.deepEqual(textPieceHits(["Hello , rain"], "Hello ,"), [
            [{ piece: 0, start: 0, end: 7 }],
        ]);
        const created = new Date(2026, 10, 14, 9, 30).toISOString();
        assert.equal(entryMatchesListQuery({
            content: "<p>Hello , rain</p>",
            plainText: "Hello, rain",
            createdAt: created,
            updatedAt: created,
        }, "Hello ,"), true);
        assert.equal(diaryFieldsMatch("Morning", "garden notes", "GARDEN"), true);
        assert.equal(diaryFieldsMatch("Morning", "garden notes", "night"), false);
        assert.equal(diaryFieldsMatch("Morning", "", "   "), true);
        assert.equal(buildEntrySearchFilter("user-1", "   "), null);
    });

    it("caps a very long query", () => {
        assert.equal(normalizeSearchQuery("a".repeat(200)).length, 80);
    });

    it("finds an entry by the date and time on its card", () => {
        const created = new Date(2026, 10, 14, 9, 30).toISOString();
        const entry = {
            content: "<p>Quiet rain</p>",
            plainText: "Quiet rain",
            createdAt: created,
            updatedAt: created,
        };
        const text = entryListSearchText(entry);
        assert.equal(diaryFieldsMatch(text, "", "November"), true);
        assert.equal(diaryFieldsMatch(text, "", "09:30"), true);
        assert.equal(diaryFieldsMatch(text, "", "9:30"), true);
        assert.equal(diaryFieldsMatch(text, "", "quiet"), true);
        assert.equal(diaryFieldsMatch(text, "", "edited"), false);
        assert.equal(diaryFieldsMatch(text, "", "garden"), false);

        const revised = { ...entry, updatedAt: new Date(new Date(created).getTime() + 5000).toISOString() };
        const revisedText = entryListSearchText(revised);
        assert.equal(diaryFieldsMatch(revisedText, "", "edited"), true);
        assert.equal(diaryFieldsMatch(revisedText, "", "09:30"), true);

        const garden = {
            content: "<p>Garden notes</p>",
            plainText: "Garden notes",
            createdAt: new Date(2026, 1, 2, 15, 0).toISOString(),
            updatedAt: new Date(2026, 1, 2, 15, 0).toISOString(),
        };
        const pages = [entry, garden, revised];
        assert.deepEqual(entriesForQuery(pages, "   ").map((page) => page.plainText), ["Quiet rain", "Garden notes", "Quiet rain"]);
        assert.deepEqual(entriesForQuery(pages, " rain ").map((page) => page.plainText), ["Quiet rain", "Quiet rain"]);
        assert.deepEqual(entriesForQuery(pages, "November").map((page) => page.plainText), ["Quiet rain", "Quiet rain"]);
        assert.deepEqual(entriesForQuery(pages, "edited").map((page) => page.plainText), ["Quiet rain"]);
        assert.deepEqual(entriesForQuery(pages, "garden").map((page) => page.plainText), ["Garden notes"]);
    });

    it("shows the note that made a diary match", () => {
        const created = new Date(2026, 10, 14, 9, 30).toISOString();
        const older = new Date(2026, 1, 2, 15, 0).toISOString();
        const entry = {
            content: "<p>Quiet rain on the window.</p>",
            plainText: "Quiet rain on the window.",
            createdAt: created,
            updatedAt: created,
        };
        const garden = {
            content: "<p>Garden notes from the path.</p>",
            plainText: "Garden notes from the path.",
            createdAt: older,
            updatedAt: older,
        };
        const diary = { title: "Window notes", description: "Two mornings" };

        const blank = diaryListMatch(diary, [entry], "   ");
        assert.equal(blank.matched, true);
        assert.equal(blank.snippet, null);

        const title = diaryListMatch(diary, [entry], "window");
        assert.equal(title.matched, true);
        assert.match(title.snippet ?? "", /window/i);

        const titleOnly = diaryListMatch(diary, [entry], "mornings");
        assert.equal(titleOnly.matched, true);
        assert.equal(titleOnly.snippet, null);

        const note = diaryListMatch(diary, [garden, entry], "quiet");
        assert.equal(note.matched, true);
        assert.match(note.snippet ?? "", /Quiet rain on the window/);

        const dated = diaryListMatch(diary, [entry], "November");
        assert.equal(dated.matched, true);
        assert.equal(dated.snippet, formatEntryLong(created));

        const fromOlder = diaryListMatch(diary, [entry, garden], "garden");
        assert.equal(fromOlder.matched, true);
        assert.match(fromOlder.snippet ?? "", /Garden notes/);

        const miss = diaryListMatch(diary, [entry], "snow");
        assert.equal(miss.matched, false);
        assert.equal(miss.snippet, null);
    });

    it("shows a description word that sits past the card opening", () => {
        const description = `${"Notes from the path. ".repeat(8)}Harbor light at the end.`;
        const late = diaryListMatch({ title: "Window notes", description }, [], "harbor");
        assert.equal(late.matched, true);
        assert.equal(late.entryId, null);
        assert.equal(late.count, 0);
        assert.match(late.snippet ?? "", /Harbor light/);
        assert.deepEqual(
            matchedTextParts(late.snippet ?? "", "harbor").filter((part) => part.match).map((part) => part.text.toLowerCase()),
            ["harbor"],
        );

        const early = diaryListMatch({ title: "Window notes", description: "Harbor light, then a longer story." }, [], "harbor");
        assert.equal(early.matched, true);
        assert.equal(early.snippet, null);

        const clipped = "The morning stayed ordinary and quiet beside the window. lantern appeared before the card opening ended.";
        const hidden = diaryListMatch({ title: "Window notes", description: clipped }, [], "lantern");
        assert.match(hidden.snippet ?? "", /lantern/);
        const shown = (hidden.snippet ?? "").replace(/^…/, "");
        assert.ok(shown.toLowerCase().indexOf("lantern") <= 32);

        const short = "The morning stayed ordinary and quiet beside the window before lantern.";
        const shortMatch = diaryListMatch({ title: "Window notes", description: short }, [], "lantern");
        assert.match(shortMatch.snippet ?? "", /lantern/);
        assert.ok((shortMatch.snippet ?? "").replace(/^…/, "").toLowerCase().indexOf("lantern") <= 32);

        const titled = diaryListMatch({ title: "Harbor", description }, [], "harbor");
        assert.equal(titled.snippet, null);
    });

    it("keeps a long description phrase on the two lines of the card", () => {
        const phrase = "extraordinary lantern festival tonight";
        const description = `The morning stayed ordinary and quiet beside the old glass. The ${phrase} kept the street warm and bright.`;
        const match = diaryListMatch({ title: "Window notes", description }, [], phrase);
        const shown = (match.snippet ?? "").replace(/^…/, "");
        assert.match(shown, /extraordinary lantern festival tonight/);
        assert.ok(shown.toLowerCase().indexOf(phrase) <= 48 - phrase.length);
    });

    it("finds a description phrase across an extra space", () => {
        const description = `${"Notes from the path. ".repeat(8)}Harbor  light at the end.`;
        const match = diaryListMatch({ title: "Window notes", description }, [], "harbor light");
        assert.equal(match.matched, true);
        assert.equal(match.entryId, null);
        assert.equal(match.count, 0);
        assert.match(match.snippet ?? "", /Harbor {2}light/);
        assert.deepEqual(
            matchedTextParts(match.snippet ?? "", "harbor light").filter((part) => part.match).map((part) => part.text),
            ["Harbor  light"],
        );
        assert.equal(diaryFieldsMatch("Window notes", "Harbor  light", "harbor light"), true);
        assert.deepEqual(
            matchedTextParts("Harbor  light at the end.", "harbor light").filter((part) => part.match).map((part) => part.text),
            ["Harbor  light"],
        );
    });

    it("shows a title word the card would cut off", () => {
        const title = "Morning notes from the harbor road lantern";
        const shown = titleCardText(title, "lantern").replace(/^…/, "");
        assert.match(shown, /lantern/i);
        assert.ok(shown.toLowerCase().indexOf("lantern") <= 12);
        assert.equal(titleCardText("Lantern notes", "lantern"), "Lantern notes");
        assert.equal(titleCardText(title, "   "), title);
    });

    it("shows a title word that starts on the first line and runs past it", () => {
        const title = "Saturday morning lantern";
        const shown = titleCardText(title, "lantern").replace(/^…/, "");
        assert.notEqual(shown, title);
        assert.match(shown, /lantern/i);
        assert.ok(shown.toLowerCase().indexOf("lantern") <= 12);
        assert.ok(shown.length <= 20);
        const wide = titleCardText("Notes on the extraordinary", "extraordinary").replace(/^…/, "");
        assert.match(wide, /extraordinary/i);
        assert.ok(wide.toLowerCase().indexOf("extraordinary") <= 12);
        assert.ok(wide.length <= 19);
        assert.equal(titleCardText("Quiet harbor lantern", "lantern"), "Quiet harbor lantern");
        assert.equal(titleCardText("The old glass lantern", "lantern"), "The old glass lantern");
    });

    it("shows a short note word the diary card would cut off", () => {
        const created = new Date(2026, 10, 14, 15).toISOString();
        const writing = "The morning stayed ordinary and quiet beside the old glass before lantern.";
        const entry = {
            id: "rain",
            content: `<p>${writing}</p>`,
            plainText: writing,
            createdAt: created,
            updatedAt: created,
        };
        const match = diaryListMatch({ title: "Window notes", description: "" }, [entry], "lantern");
        assert.equal(match.matched, true);
        assert.equal(match.entryId, "rain");
        const shown = (match.snippet ?? "").replace(/^…/, "");
        assert.match(shown, /lantern/i);
        assert.ok(shown.toLowerCase().indexOf("lantern") <= 32);
        assert.equal(entryCardPreview(entry, "lantern"), writing);
    });

    it("shows an entry-list word the card would cut off", () => {
        const created = new Date(2026, 10, 14, 15).toISOString();
        const writing = `${"The morning stayed ordinary and quiet beside the old glass window. ".padEnd(82, "x")}lantern.`;
        const entry = {
            content: `<p>${writing}</p>`,
            plainText: writing,
            createdAt: created,
            updatedAt: created,
        };
        const shown = entryCardPreview(entry, "lantern").replace(/^…/, "");
        assert.match(shown, /lantern/i);
        assert.ok(shown.toLowerCase().indexOf("lantern") <= 32);
        const earlier = "The morning was ordinary and quiet beside the old glass before the late lantern.";
        assert.equal(entryCardPreview({ ...entry, content: `<p>${earlier}</p>`, plainText: earlier }, "lantern"), earlier);
    });

    it("shows the date and the first line when a search crosses them", () => {
        const created = new Date(2026, 10, 15, 9, 30).toISOString();
        const entry = {
            id: "rain",
            content: "<p>Quiet rain.</p>",
            plainText: "Quiet rain.",
            createdAt: created,
            updatedAt: created,
        };
        const match = diaryListMatch({ title: "Window", description: "" }, [entry], "2026 Quiet");
        assert.equal(match.matched, true);
        assert.equal(match.entryId, "rain");
        assert.match(match.snippet ?? "", /2026 Quiet/);
        assert.deepEqual(
            matchedTextParts(match.snippet ?? "", "2026 Quiet").filter((part) => part.match).map((part) => part.text),
            ["2026 Quiet"],
        );
        assert.match(entryCardPreview(entry, "2026 Quiet"), /2026 Quiet/);
        assert.equal(entryCardPreview(entry, "November"), "Quiet rain.");
    });

    it("opens the note that made a diary match", () => {
        const created = new Date(2026, 10, 14, 9, 30).toISOString();
        const older = new Date(2026, 1, 2, 15, 0).toISOString();
        const rain = {
            id: "rain",
            content: "<p>Quiet rain on the window.</p>",
            plainText: "Quiet rain on the window.",
            createdAt: created,
            updatedAt: created,
        };
        const garden = {
            id: "garden",
            content: "<p>Garden notes from the path.</p>",
            plainText: "Garden notes from the path.",
            createdAt: older,
            updatedAt: older,
        };
        const diary = { title: "Window notes", description: "Two mornings" };

        const fromOlder = diaryListMatch(diary, [rain, garden], "garden");
        assert.equal(fromOlder.matched, true);
        assert.equal(fromOlder.entryId, "garden");
        assert.equal(fromOlder.entryAt, older);
        assert.equal(diaryMatchPath("diary1", fromOlder.entryId), "/diary/diary1?entry=garden");
        assert.equal(diaryCardWhen({
            query: "garden",
            matchEntry: fromOlder.entryId,
            matchAt: fromOlder.entryAt,
            updatedAt: created,
            createdAt: created,
        }), formatDiaryDate(older));

        const newest = diaryListMatch(diary, [garden, rain], "rain");
        assert.equal(newest.entryId, "rain");
        assert.equal(newest.entryAt, created);

        const title = diaryListMatch(diary, [rain, garden], "window");
        assert.equal(title.matched, true);
        assert.equal(title.entryId, "rain");
        assert.equal(title.entryAt, created);
        assert.equal(title.count, 1);
        assert.match(title.snippet ?? "", /window/i);
        assert.equal(diaryMatchPath("diary1", title.entryId, "window"), "/diary/diary1?entry=rain&q=window&list=window");
        assert.equal(diaryCardWhen({
            query: "window",
            matchEntry: title.entryId,
            matchAt: title.entryAt,
            updatedAt: created,
            createdAt: created,
        }), formatDiaryDate(created));

        const titleOnly = diaryListMatch(diary, [garden], "mornings");
        assert.equal(titleOnly.matched, true);
        assert.equal(titleOnly.entryId, null);
        assert.equal(titleOnly.count, 0);
        assert.equal(diaryMatchPath("diary1", titleOnly.entryId, "mornings"), "/diary/diary1?list=mornings");

        const blank = diaryListMatch(diary, [garden], " ");
        assert.equal(blank.entryId, null);
        assert.equal(blank.entryAt, null);
        assert.equal(diaryCardWhen({
            query: "",
            matchEntry: "garden",
            matchAt: older,
            updatedAt: created,
            createdAt: created,
        }), `Updated ${formatDiaryDate(created)}`);
    });

    it("counts every note that matches a diary search", () => {
        const newer = new Date(2026, 10, 15, 9, 30).toISOString();
        const older = new Date(2026, 1, 2, 15, 0).toISOString();
        const rain = { id: "rain", content: "<p>Quiet rain.</p>", plainText: "Quiet rain.", createdAt: newer, updatedAt: newer };
        const garden = { id: "garden", content: "<p>Garden rain.</p>", plainText: "Garden rain.", createdAt: older, updatedAt: older };
        const match = diaryListMatch({ title: "Window", description: "" }, [garden, rain], "rain");
        assert.equal(match.entryId, "rain");
        assert.equal(match.entryAt, newer);
        assert.equal(match.count, 2);
        assert.equal(diaryCardWhen({
            query: "rain",
            matchEntry: match.entryId,
            matchAt: match.entryAt,
            matchCount: match.count,
            updatedAt: newer,
            createdAt: newer,
        }), `${formatDiaryDate(newer)} · 2 notes`);
        const one = diaryListMatch({ title: "Window", description: "" }, [rain], "rain");
        assert.equal(one.count, 1);
        assert.equal(diaryCardWhen({
            query: "rain",
            matchEntry: one.entryId,
            matchAt: one.entryAt,
            matchCount: one.count,
            updatedAt: newer,
            createdAt: newer,
        }), formatDiaryDate(newer));
        assert.equal(diaryListMatch({ title: "Window", description: "" }, [rain, garden], "window").count, 0);
    });

    it("keeps a diary list search in the address", () => {
        assert.equal(diaryListAddress("2026 Quiet"), "/diary?q=2026%20Quiet");
        assert.equal(diaryListAddress("  2026  Quiet  "), "/diary?q=2026%20Quiet");
        assert.equal(diaryListAddress("Hello ,"), "/diary?q=Hello%2C");
        assert.equal(diaryListAddress("   "), "/diary");
        assert.equal(openedDiaryQuery("2026 Quiet"), "2026 Quiet");
        assert.equal(openedDiaryQuery("  2026  Quiet  "), "2026 Quiet");
        assert.equal(openedDiaryQuery("   "), "");
        assert.equal(openedDiaryQuery(null), "");
        assert.equal(diaryListNavigation("/diary", "2026 Quiet"), "/diary?q=2026%20Quiet");
        assert.equal(diaryListNavigation("/diary?q=2026%20Quiet", "2026 Quiet"), null);
        assert.equal(diaryListNavigation("/diary?q=2026%20Quiet", "  2026  Quiet  "), null);
        assert.equal(diaryListNavigation("/diary?q=2026%20Quiet", ""), "/diary");
        assert.equal(diaryListNavigation("/diary/diary1?entry=rain", "Quiet"), null);
    });

    it("keeps the search that opened an entry", () => {
        const created = new Date(2026, 10, 15, 9, 30).toISOString();
        const entry = {
            content: "<p>Quiet rain.</p>",
            plainText: "Quiet rain.",
            createdAt: created,
            updatedAt: created,
        };
        assert.equal(diaryMatchPath("diary1", "rain", "2026 Quiet"), "/diary/diary1?entry=rain&q=2026%20Quiet&list=2026%20Quiet");
        assert.equal(diaryMatchPath("diary1", null, "Window"), "/diary/diary1?list=Window");
        assert.equal(diaryMatchPath("diary1", "rain", "   "), "/diary/diary1?entry=rain");
        assert.equal(entryListQueryAddress("/diary/diary1?entry=rain", "Window"), "/diary/diary1?entry=rain&list=Window");
        assert.equal(entryListQueryAddress("/diary/diary1", "   "), "/diary/diary1");
        assert.equal(diaryReturnAddress("garden", "Window"), "/diary?q=garden");
        assert.equal(diaryReturnAddress("   ", "Window"), "/diary?q=Window");
        assert.equal(diaryReturnAddress("", ""), "/diary");
        assert.equal(diaryReturnQuery("?q=garden&list=Window"), "garden");
        assert.equal(diaryReturnQuery("list=Window"), "Window");
        assert.equal(diaryReturnQuery(""), "");
        assert.equal(entryFindAddress("/diary/diary1?entry=rain", "2026 Quiet"), "/diary/diary1?entry=rain&q=2026%20Quiet");
        assert.equal(entryFindAddress("/diary/diary1?entry=rain", "   "), "/diary/diary1?entry=rain");
        assert.equal(openedEntryQuery("2026 Quiet", entry), "2026 Quiet");
        assert.equal(openedEntryQuery("  2026  Quiet  ", entry), "2026 Quiet");
        assert.equal(openedEntryQuery("snow", entry), "");
        assert.equal(openedEntryQuery("2026 Quiet", null), "");
        assert.equal(entryShareAddress("https://diary.example", "diary1", "rain"), "https://diary.example/diary/diary1?entry=rain");
    });

    it("keeps the chosen month in the address", () => {
        assert.equal(openedEntryMonth("2026-11"), "2026-11");
        assert.equal(openedEntryMonth(" 2026-11 "), "2026-11");
        assert.equal(openedEntryMonth("2026-11-01"), "");
        assert.equal(openedEntryMonth("2026-13"), "");
        assert.equal(openedEntryMonth("November"), "");
        assert.equal(openedEntryMonth(null), "");
        assert.equal(entryMonthAddress("/diary/diary1?entry=rain&q=garden", "2026-11"), "/diary/diary1?entry=rain&q=garden&month=2026-11");
        assert.equal(entryMonthAddress("/diary/diary1", "2026-10"), "/diary/diary1?month=2026-10");
        assert.equal(entryMonthAddress("/diary/diary1?entry=rain", ""), "/diary/diary1?entry=rain");
        assert.equal(entryMonthAddress("/diary/diary1?entry=rain", "November"), "/diary/diary1?entry=rain");
        assert.equal(entryShareAddress("https://diary.example", "diary1", "rain"), "https://diary.example/diary/diary1?entry=rain");
    });

    it("keeps the open entry in the address and drops it for a new entry", () => {
        assert.equal(entryPageAddress("diary1", "garden", "view"), "/diary/diary1?entry=garden");
        assert.equal(entryPageAddress("diary1", "garden", "edit"), "/diary/diary1?entry=garden");
        assert.equal(entryPageAddress("diary1", "garden", "compose"), "/diary/diary1");
        assert.equal(entryPageAddress("diary1", null, "view"), "/diary/diary1");
        assert.equal(entryPageAddress("diary1", "a b", "view"), "/diary/diary1?entry=a%20b");
        assert.equal(entryShareAddress("https://diary.example/", "diary1", "a b"), "https://diary.example/diary/diary1?entry=a%20b");
        assert.equal(entryShareAddress("https://diary.example", "diary1", null), "https://diary.example/diary/diary1");
    });

    it("shows the words that matched on the entry card", () => {
        const created = new Date(2026, 1, 2, 18).toISOString();
        const entry = {
            content: `<p>${"quiet rain ".repeat(30)}the hidden lantern by the gate</p>`,
            plainText: `${"quiet rain ".repeat(30)}the hidden lantern by the gate`,
            createdAt: created,
            updatedAt: created,
        };
        const opening = entryCardPreview(entry, "");
        assert.equal(opening.includes("lantern"), false);
        assert.equal(opening.startsWith("quiet rain"), true);
        const matched = entryCardPreview(entry, "lantern");
        assert.match(matched, /hidden lantern by the gate/);
        assert.equal(matched.startsWith("…"), true);
        assert.equal(entryCardPreview(entry, "   "), opening);
    });

    it("keeps the writing on the card when the search is the date", () => {
        const created = new Date(2026, 10, 15, 9, 30).toISOString();
        const entry = {
            content: "<p>Quiet rain.</p>",
            plainText: "Quiet rain.",
            createdAt: created,
            updatedAt: created,
        };
        assert.equal(entryMatchesListQuery(entry, "November"), true);
        assert.equal(entryCardPreview(entry, "November"), "Quiet rain.");
        assert.equal(entryCardPreview(entry, "Sunday"), "Quiet rain.");
        assert.equal(entryCardPreview(entry, "09:30"), "Quiet rain.");
        assert.equal(entryCardPreview(entry, "Quiet"), "Quiet rain.");
    });

    it("keeps the written time on an edited entry card", () => {
        const created = new Date(2026, 10, 15, 9, 30).toISOString();
        const revised = new Date(new Date(created).getTime() + 5000).toISOString();
        assert.deepEqual(entryCardClock(created, created), { time: formatEntryTime(created), edited: false });
        assert.deepEqual(entryCardClock(created, revised), { time: formatEntryTime(created), edited: true });
        assert.equal(entryMatchesListQuery({
            content: "<p>Quiet rain.</p>",
            plainText: "Quiet rain.",
            createdAt: created,
            updatedAt: revised,
        }, `${formatEntryTime(created).slice(-2)} edited`), false);
    });

    it("marks each matched word without changing its letters", () => {
        assert.deepEqual(matchedTextParts("the Quiet rain", "quiet"), [
            { text: "the ", match: false },
            { text: "Quiet", match: true },
            { text: " rain", match: false },
        ]);
        assert.deepEqual(matchedTextParts("lantern and lantern", "Lantern").filter((part) => part.match), [
            { text: "lantern", match: true },
            { text: "lantern", match: true },
        ]);
        assert.deepEqual(matchedTextParts("no match", "   "), [
            { text: "no match", match: false },
        ]);
        assert.deepEqual(matchedTextParts("", "rain"), []);
    });

    it("finds a phrase that crosses styled pieces", () => {
        assert.deepEqual(textPieceHits(["See ", "Harbor", " rain"], "Harbor rain"), [
            [
                { piece: 1, start: 0, end: 6 },
                { piece: 2, start: 0, end: 5 },
            ],
        ]);
        assert.deepEqual(textPieceHits(["See Harbor", " rain today"], "harbor rain"), [
            [
                { piece: 0, start: 4, end: 10 },
                { piece: 1, start: 0, end: 5 },
            ],
        ]);
        assert.deepEqual(textPieceHits(["See Harbor rain"], "Harbor"), [
            [{ piece: 0, start: 4, end: 10 }],
        ]);
        assert.deepEqual(textPieceHits(["aaaa"], "aa"), [
            [{ piece: 0, start: 0, end: 2 }],
            [{ piece: 0, start: 2, end: 4 }],
        ]);
        assert.deepEqual(textPieceHits(["aa", "aa"], "aaa"), [
            [
                { piece: 0, start: 0, end: 2 },
                { piece: 1, start: 0, end: 1 },
            ],
        ]);
        assert.deepEqual(textPieceHits(["xxaa", "ay"], "aaa"), [
            [
                { piece: 0, start: 2, end: 4 },
                { piece: 1, start: 0, end: 1 },
            ],
        ]);
        assert.deepEqual(textPieceHits(["See ", "Harbor"], "   "), []);
        assert.deepEqual(textPieceHits(["See ", "Harbor"], "garden"), []);
        assert.deepEqual(textPieceHits(["See Harbor  rain"], "Harbor rain"), [
            [{ piece: 0, start: 4, end: 16 }],
        ]);
        assert.deepEqual(textPieceHits(["Hello , rain"], "Hello,"), [
            [{ piece: 0, start: 0, end: 7 }],
        ]);
        assert.deepEqual(textPieceHits(["Hello , rain"], "Hello"), [
            [{ piece: 0, start: 0, end: 5 }],
        ]);
    });

    it("treats a line break as a space when finding a phrase", () => {
        assert.deepEqual(textRunHits([
            { text: "See ", breakBefore: false },
            { text: "Harbor", breakBefore: false },
            { text: " rain", breakBefore: false },
        ], "Harbor rain"), [[
            { run: 1, start: 0, end: 6 },
            { run: 2, start: 0, end: 5 },
        ]]);
        assert.deepEqual(textRunHits([
            { text: "endHarbor", breakBefore: false },
            { text: "rain start", breakBefore: true },
        ], "Harborrain"), []);
        assert.deepEqual(textRunHits([
            { text: "Harbor", breakBefore: false },
            { text: "rain", breakBefore: true },
        ], "rain"), [[
            { run: 1, start: 0, end: 4 },
        ]]);
        assert.deepEqual(textRunHits([
            { text: "2026", breakBefore: false },
            { text: "See Harbor", breakBefore: true },
        ], "6See"), []);
        assert.deepEqual(textRunHits([
            { text: "Harbor", breakBefore: false },
            { text: "rain", breakBefore: true },
        ], "Harbor rain"), [[
            { run: 0, start: 0, end: 6 },
            { run: 1, start: 0, end: 4 },
        ]]);
        assert.deepEqual(textRunHits([
            { text: "Harbor ", breakBefore: false },
            { text: "rain", breakBefore: true },
        ], "Harbor rain"), [[
            { run: 0, start: 0, end: 7 },
            { run: 1, start: 0, end: 4 },
        ]]);
        assert.deepEqual(textRunHits([
            { text: "banana", breakBefore: false },
            { text: "na today", breakBefore: true },
        ], "nana"), [[
            { run: 0, start: 2, end: 6 },
        ]]);
    });

    it("moves through each match and wraps around", () => {
        const text = "first lantern then another lantern";
        assert.equal(entryMatchCount(text, "lantern"), 2);
        assert.equal(entryMatchCount(text, "Lantern"), 2);
        assert.equal(entryMatchCount("lanternlantern", "lantern"), 2);
        assert.equal(entryMatchCount(text, ""), 0);
        assert.equal(entryMatchCount(text, "   "), 0);
        assert.equal(entryMatchCursor(2, 0, "next"), 1);
        assert.equal(entryMatchCursor(2, 1, "next"), 0);
        assert.equal(entryMatchCursor(2, 0, "previous"), 1);
        assert.equal(entryMatchCursor(0, 4, "next"), 0);
    });

    it("still matches a date search after the writing is saved", () => {
        const created = new Date(2026, 10, 14, 9, 30).toISOString();
        const entry = {
            content: "<p>Quiet rain</p>",
            plainText: "Quiet rain",
            createdAt: created,
            updatedAt: created,
        };
        assert.equal(entryMatchesListQuery(entry, "November"), true);
        assert.equal(entryMatchesListQuery(entry, "09:30"), true);
        assert.equal(entryMatchesListQuery(entry, "garden"), false);
        assert.equal(entryMatchesListQuery(entry, ""), true);

        const written = { ...entry, plainText: "Quiet rain.", content: "<p>Quiet rain.</p>" };
        const dateSeam = `rain. ${formatDiaryDate(created).slice(0, 3)}`;
        const yearSeam = `${formatDiaryDate(created).slice(-4)} ${formatEntryLong(created).slice(0, 3)}`;
        assert.equal(entryListSearchText(written).includes(dateSeam), true);
        assert.equal(entryListSearchText(written).includes(yearSeam), true);
        assert.equal(entryMatchesListQuery(written, dateSeam), false);
        assert.equal(entryMatchesListQuery(written, yearSeam), false);
        const heading = formatEntryLong(created);
        const pageSeam = `${heading.slice(-4)} Quiet`;
        assert.equal(entryListSearchText(written).includes(pageSeam), false);
        assert.equal(entryMatchesListQuery(written, pageSeam), true);
        const marked = textRunHits([
            { text: heading, breakBefore: false },
            { text: "Quiet rain.", breakBefore: true },
        ], pageSeam);
        assert.equal(marked.length, 1);
        assert.equal(heading.slice(marked[0][0].start, marked[0][0].end), heading.slice(-4));
        assert.equal("Quiet rain.".slice(marked[0][1].start, marked[0][1].end), "Quiet");
        assert.equal(entryMatchesListQuery(written, "Quiet rain"), true);
        assert.equal(diaryListMatch({ title: "Window", description: "" }, [written], dateSeam).matched, false);

        const revised = { ...written, updatedAt: new Date(new Date(created).getTime() + 5000).toISOString() };
        const clockSeam = `${formatEntryTime(created).slice(-2)} edited`;
        assert.equal(entryListSearchText(revised).includes(clockSeam), true);
        assert.equal(entryMatchesListQuery(revised, clockSeam), false);
        assert.equal(entryMatchesListQuery(revised, "edited"), true);
    });

    it("finds a note in the entry list when a space sits before the period", () => {
        const created = new Date(2026, 10, 15, 9, 30).toISOString();
        const spaced = {
            content: "<p>See rain .</p>",
            plainText: "See rain .",
            createdAt: created,
            updatedAt: created,
        };
        assert.equal(entryMatchesListQuery(spaced, "rain."), true);
        assert.equal(entryMatchesListQuery(spaced, "rain. Nov"), false);
        const doubled = { ...spaced, plainText: "Quiet  rain", content: "<p>Quiet  rain</p>" };
        assert.equal(entryMatchesListQuery(doubled, "Quiet rain"), true);
        const held = { ...spaced, plainText: "Quiet\u00a0rain", content: "<p>Quiet&nbsp;rain</p>" };
        assert.equal(entryMatchesListQuery(held, "Quiet rain"), true);
        const long = `${"word ".repeat(30)}rain .`;
        assert.equal(entryCardPreview({ ...spaced, plainText: long, content: `<p>${long}</p>` }, "rain.").includes("rain"), true);
        const shown = presentEntry({ content: "<p>See <b>Har</b>bor rain.</p>", plainText: "Har bor rain." });
        assert.equal(shown.plainText, "See Harbor rain.");
        assert.equal(entryMatchesListQuery({
            content: shown.content,
            plainText: shown.plainText,
            createdAt: created,
            updatedAt: created,
        }, "Harbor"), true);
        assert.equal(wordCount("<p>See <b>Har</b>bor rain.</p>"), 3);
    });

    it("finds a diary from the page when the saved text split a word", () => {
        const created = new Date(2026, 10, 15, 9, 30).toISOString();
        const entry = {
            id: "harbor",
            content: "<p>See <b>Har</b>bor rain.</p>",
            plainText: "See Har bor rain.",
            createdAt: created,
            updatedAt: created,
        };
        assert.equal(entryMatchesListQuery(entry, "Harbor"), true);
        const match = diaryListMatch({ title: "Window", description: "" }, [entry], "Harbor");
        assert.equal(match.matched, true);
        assert.equal(match.entryId, "harbor");
        assert.match(match.snippet ?? "", /Harbor/);
        const unnamed = {
            ...entry,
            content: '<figure><img src="https://example.com/sunset.png" alt=""></figure>',
            plainText: "Image",
        };
        assert.equal(entryMatchesListQuery(unnamed, "Image"), true);
    });
});

describe("export", () => {
    const diary = { title: "Morning Pages!", description: "Quiet notes", theme: "/textures/leather-texture.jpg" };
    const older = {
        content: "<h2>Dawn</h2><p>Hello <strong>there</strong> &amp; welcome</p><ul><li>one</li><li>two</li></ul><blockquote><p>quoted</p></blockquote><pre><code>const a = 1;</code></pre><p><a href=\"https://example.com\">site</a></p><img src=\"data:image/png;base64,aaaa\" alt=\"sketch\"><script>alert(1)</script>",
        createdAt: "2026-01-01T12:00:00.000Z",
        updatedAt: "2026-01-01T12:00:00.000Z",
    };
    const newer = {
        content: "<p>Later</p>",
        createdAt: "2026-02-01T12:00:00.000Z",
        updatedAt: "2026-02-01T12:00:00.000Z",
    };

    it("turns an entry into markdown and drops scripts", () => {
        const markdown = htmlToMarkdown(older.content);
        assert.match(markdown, /^## Dawn/);
        assert.match(markdown, /Hello \*\*there\*\* & welcome/);
        assert.match(markdown, /- one\n- two/);
        assert.match(markdown, /> quoted/);
        assert.equal(
            htmlToMarkdown("<blockquote><b>Harbor</b><br><b>rain</b></blockquote>"),
            "> **Harbor**\n> **rain**",
        );
        assert.equal(htmlToMarkdown("<blockquote>Quiet</blockquote>"), "> Quiet");
        assert.match(markdown, /```\nconst a = 1;\n```/);
        assert.match(markdown, /\[site\]\(https:\/\/example.com\)/);
        assert.match(markdown, /!\[sketch\]\(image\)/);
        assert.equal(markdown.includes("script"), false);
        assert.equal(markdown.includes("alert"), false);
        assert.equal(
            htmlToMarkdown('<figure><img src="data:image/png;base64,aaaa" alt="Harbor"><figcaption>Bay</figcaption></figure>'),
            "![Bay](image)",
        );
    });

    it("keeps a styled picture name in the copied text", () => {
        assert.equal(
            htmlToMarkdown('<figure><img src="https://example.com/a.png" alt="old"><figcaption><b>Harbor</b> rain</figcaption></figure>'),
            "![Harbor rain](https://example.com/a.png)\n\n**Harbor** rain",
        );
        assert.equal(
            htmlToMarkdown('<figure><img src="https://example.com/a.png" alt="old"><figcaption><a href="https://example.com">Harbor</a></figcaption></figure>'),
            "![Harbor](https://example.com/a.png)\n\n[Harbor](https://example.com)",
        );
        assert.equal(
            htmlToMarkdown('<figure><img src="https://example.com/a.png" alt="old"><figcaption><u>quiet</u> bay</figcaption></figure>'),
            "![quiet bay](https://example.com/a.png)\n\n<u>quiet</u> bay",
        );
        assert.equal(
            htmlToMarkdown('<figure><img src="data:image/png;base64,aaaa" alt="Harbor"><figcaption>Bay</figcaption></figure>'),
            "![Bay](image)",
        );
    });

    it("keeps an underline in the markdown", () => {
        assert.equal(htmlToMarkdown("<p>a <u>quiet</u> rain</p>"), "a <u>quiet</u> rain");
        assert.equal(htmlToMarkdown("<p>a <u></u> rain</p>"), "a  rain");
        assert.equal(htmlToMarkdown("<p><strong><u>both</u></strong></p>"), "**<u>both</u>**");
    });

    it("copies one entry as markdown", () => {
        const entry = {
            content: "<p>a <u>quiet</u> rain</p><ul><li>one</li></ul>",
            createdAt: "2026-03-03T15:00:00.000Z",
        };
        assert.equal(
            entryShareMarkdown(entry),
            `## ${formatEntryLong(entry.createdAt)}\n\n${htmlToMarkdown(entry.content)}\n`,
        );
        assert.match(entryShareMarkdown(entry), /<u>quiet<\/u>/);
        assert.match(entryShareMarkdown(entry), /- one/);
        assert.equal(
            entryShareMarkdown({ content: "<p></p>", createdAt: entry.createdAt }),
            `## ${formatEntryLong(entry.createdAt)}\n\n_Empty entry._\n`,
        );
    });

    it("does not repeat the date already stored on the entry", () => {
        const createdAt = "2026-03-03T15:00:00.000Z";
        const label = formatEntryLong(createdAt);
        const copied = entryShareMarkdown({
            content: `<h2>${label}</h2><p>a <u>quiet</u> rain</p>`,
            createdAt,
        });
        assert.equal(copied, `## ${label}\n\na <u>quiet</u> rain\n`);
        assert.equal(copied.split(label).length - 1, 1);
        assert.equal(
            entryShareMarkdown({ content: "<h2>Dawn</h2><p>Hello</p>", createdAt }),
            `## ${label}\n\n## Dawn\n\nHello\n`,
        );
    });

    it("writes the diary in chronological order", () => {
        const markdown = diaryToMarkdown(diary, [newer, older]);
        assert.match(markdown, /^# Morning Pages!\n\nQuiet notes\n\n/);
        assert.ok(markdown.indexOf("Dawn") < markdown.indexOf("Later"));
        assert.equal(exportFilename(diary.title, "md"), "morning-pages.md");
        assert.equal(exportFilename("!!!", "json"), "diary.json");
    });

    it("builds a markdown or json download and rejects an unknown format", () => {
        const markdown = buildDiaryExport(diary, [older], "markdown", "2026-03-01T00:00:00.000Z");
        assert.equal(markdown.ok, true);
        if (markdown.ok) {
            assert.equal(markdown.export.contentType, "text/markdown; charset=utf-8");
            assert.equal(markdown.export.filename, "morning-pages.md");
            assert.match(markdown.export.body, /Hello \*\*there\*\*/);
        }

        const json = buildDiaryExport(diary, [older], "json", "2026-03-01T00:00:00.000Z");
        assert.equal(json.ok, true);
        if (json.ok) {
            const parsed = JSON.parse(json.export.body) as { format: string; exportedAt: string; entries: { content: string }[] };
            assert.equal(parsed.format, "personal-diary-backup");
            assert.equal(parsed.exportedAt, "2026-03-01T00:00:00.000Z");
            assert.equal(parsed.entries[0].content.includes("script"), false);
            assert.match(parsed.entries[0].content, /Hello/);
        }

        assert.deepEqual(buildDiaryExport(diary, [], "pdf", "2026-03-01T00:00:00.000Z"), {
            ok: false,
            error: "Use format=md or format=json.",
        });
        const empty = buildDiaryExport({ title: "Empty" }, [], "md", "2026-03-01T00:00:00.000Z");
        assert.equal(empty.ok, true);
        if (empty.ok) assert.match(empty.export.body, /_No entries yet\._/);
    });
});

describe("entry date", () => {
    const now = new Date(2026, 2, 14, 15, 8, 0);

    it("keeps today and puts the same clock time on a past day", () => {
        assert.equal(calendarDate(now), "2026-03-14");
        assert.equal(entryInstant("2026-03-14", now)?.getTime(), now.getTime());

        const past = entryInstant("2026-02-02", now);
        assert.equal(past?.getFullYear(), 2026);
        assert.equal(past?.getMonth(), 1);
        assert.equal(past?.getDate(), 2);
        assert.equal(past?.getHours(), 15);
        assert.equal(past?.getMinutes(), 8);

        const clock = new Date(2026, 1, 13, 9, 30, 0);
        const kept = entryInstant("2026-02-02", now, clock);
        assert.equal(kept?.getHours(), 9);
        assert.equal(kept?.getMinutes(), 30);
        assert.equal(kept?.getDate(), 2);

        const earlierToday = entryInstant("2026-03-14", now, clock);
        assert.equal(earlierToday?.getDate(), 14);
        assert.equal(earlierToday?.getHours(), 9);
        assert.equal(earlierToday?.getMinutes(), 30);

        const laterToday = entryInstant("2026-03-14", now, new Date(2026, 2, 14, 18, 0, 0));
        assert.equal(laterToday?.getTime(), now.getTime());
    });

    it("rejects a future day, a day that does not exist, and updates only a matching heading", () => {
        assert.equal(entryInstant("2026-03-15", now), null);
        assert.equal(entryInstant("2026-02-31", now), null);
        assert.equal(entryInstant("nope", now), null);

        const html = "<h2>Monday, February 2, 2026</h2><p>Rain</p>";
        assert.equal(
            retitleEntryDate(html, "Monday, February 2, 2026", "Tuesday, February 3, 2026"),
            "<h2>Tuesday, February 3, 2026</h2><p>Rain</p>",
        );
        assert.equal(retitleEntryDate("<p>Rain</p>", "Monday, February 2, 2026", "Tuesday, February 3, 2026"), "<p>Rain</p>");
    });

    it("puts the date field back when the date line is undone", () => {
        const page = "<h2>Sunday, November 15, 2026</h2><p>Kept the lantern.</p>";
        const moved = "<h2>Saturday, January 3, 2026</h2><p>Kept the lantern.</p>";
        assert.equal(dateRetitleAction(page, "Sunday, November 15, 2026", "Saturday, January 3, 2026"), "type");
        assert.equal(dateRetitleAction(page, "Sunday, November 15, 2026", "Sunday, November 15, 2026"), "keep");
        assert.equal(dateRetitleAction("<p>Kept the lantern.</p>", "Sunday, November 15, 2026", "Saturday, January 3, 2026"), "keep");
        assert.equal(calendarDateFromLabel("Saturday, January 3, 2026"), "2026-01-03");
        assert.equal(calendarDateFromLabel("Monday, February 31, 2026"), null);
        assert.equal(dateFieldAfterEdit(moved, "2026-11-15"), "2026-01-03");
        assert.equal(dateFieldAfterEdit(page, "2026-01-03"), "2026-11-15");
        assert.equal(dateFieldAfterEdit("<p>Kept the lantern.</p>", "2026-11-15"), "2026-11-15");
    });

    it("groups entries by month, newest first", () => {
        const february = new Date(2026, 1, 2, 15).toISOString();
        const november = new Date(2026, 10, 14, 15).toISOString();
        assert.equal(monthKey(february), "2026-02");
        assert.equal(monthLabel("2026-02"), "February 2026");
        assert.equal(monthKey("nope"), null);

        const months = entryMonths([february, february, november, "nope"]);
        assert.deepEqual(months.map((month) => [month.key, month.count]), [["2026-11", 1], ["2026-02", 2]]);
        assert.equal(entryInMonth(february, "2026-02"), true);
        assert.equal(entryInMonth(february, ""), true);
        assert.equal(entryInMonth(february, "2026-11"), false);
        assert.equal(emptyEntryListMessage("rain", "2026-02"), "No entries match “rain” in February 2026.");
        assert.equal(emptyEntryListMessage("rain", ""), "No entries match “rain”.");
        assert.equal(emptyEntryListMessage("", "2026-11"), "No entries in November 2026.");
        assert.equal(entryFindCountLabel(2, "rain"), "2 entries");
        assert.equal(entryFindCountLabel(1, "rain"), "1 entry");
        assert.equal(entryFindCountLabel(0, "rain"), null);
        assert.equal(entryFindCountLabel(4, "   "), null);
        assert.equal(entryFindCountLabel(4, ""), null);
        assert.equal(diaryFindCountLabel(2, "rain"), "2 diaries");
        assert.equal(diaryFindCountLabel(1, "rain"), "1 diary");
        assert.equal(diaryFindCountLabel(0, "rain"), null);
        assert.equal(diaryFindCountLabel(4, "   "), null);
        assert.equal(diaryFindCountLabel(4, ""), null);
        assert.equal(monthForSavedEntry(february, ""), "");
        assert.equal(monthForSavedEntry(february, "2026-02"), "2026-02");
        assert.equal(monthForSavedEntry(february, "2026-11"), "2026-02");
        assert.equal(monthForSavedEntry("nope", "2026-11"), "2026-11");

        const found = entryFindMonths([
            { createdAt: february, matches: true },
            { createdAt: february, matches: false },
            { createdAt: november, matches: false },
            { createdAt: "nope", matches: true },
        ]);
        assert.deepEqual(found.map((month) => [month.key, month.count]), [["2026-11", 0], ["2026-02", 1]]);
    });

    it("opens the newest visible entry when the current one is hidden", () => {
        const november = { _id: "rain", createdAt: new Date(2026, 10, 14, 15).toISOString() };
        const february = { _id: "garden", createdAt: new Date(2026, 1, 2, 15).toISOString() };
        const olderFebruary = { _id: "seed", createdAt: new Date(2026, 1, 1, 15).toISOString() };
        assert.equal(entryToOpenWhenHidden([november, february], "rain"), null);
        assert.equal(entryToOpenWhenHidden([february, olderFebruary], "rain")?._id, "garden");
        assert.equal(entryToOpenWhenHidden([], "rain"), null);
        assert.equal(entryToOpenWhenHidden([february, olderFebruary], null)?._id, "garden");
        assert.equal(entryToOpenWhenHidden([february, olderFebruary], "rain", "edit"), null);
        assert.equal(entryToOpenWhenHidden([february, olderFebruary], null, "compose"), null);
        assert.equal(entryToOpenWhenHidden([february, olderFebruary], "rain", "view")?._id, "garden");
    });

    it("opens a match when find hides the open entry and leaves a new entry alone", () => {
        const november = { _id: "rain", createdAt: new Date(2026, 10, 14, 15).toISOString() };
        const february = { _id: "garden", createdAt: new Date(2026, 1, 2, 15).toISOString() };
        assert.equal(entryToOpenForFilter([november, february], null), null);
        assert.equal(entryToOpenForFilter([november, february], "rain"), null);
        assert.equal(entryToOpenForFilter([february], "rain")?._id, "garden");
        assert.equal(entryToOpenForFilter([], "rain"), null);
        assert.equal(entryToOpenForFilter([february], "rain", "edit"), null);
        assert.equal(entryToOpenForFilter([february], "rain", "compose"), null);
        assert.equal(entryToOpenForFilter([february], "rain", "view")?._id, "garden");
    });

    it("hides a viewed entry that the list filtered out and keeps one being written", () => {
        const rain = { _id: "rain" };
        const garden = { _id: "garden" };
        assert.equal(showOpenEntry([rain, garden], "rain", "view"), true);
        assert.equal(showOpenEntry([garden], "rain", "view"), false);
        assert.equal(showOpenEntry([], "rain", "view"), false);
        assert.equal(showOpenEntry([], "rain", "edit"), true);
        assert.equal(showOpenEntry([], null, "compose"), true);
        assert.equal(showOpenEntry([garden], "rain", "view", true), true);
        assert.equal(showOpenEntry([], null, "view"), false);
        assert.equal(showOpenEntry([garden], null, "view"), true);
    });

    it("keeps a find that matches nothing in the chosen month", () => {
        const garden = {
            _id: "garden",
            createdAt: new Date(2026, 1, 2, 15).toISOString(),
            updatedAt: new Date(2026, 1, 2, 15).toISOString(),
            content: "<p>Garden path.</p>",
            plainText: "Garden path.",
        };
        const rain = {
            _id: "rain",
            createdAt: new Date(2026, 10, 14, 15).toISOString(),
            updatedAt: new Date(2026, 10, 14, 15).toISOString(),
            content: "<p>Quiet rain.</p>",
            plainText: "Quiet rain.",
        };
        const light = {
            _id: "light",
            createdAt: new Date(2026, 10, 15, 9).toISOString(),
            updatedAt: new Date(2026, 10, 15, 9).toISOString(),
            content: "<p>Window light.</p>",
            plainText: "Window light.",
        };

        const missed = entryFromAddress([garden, rain], "rain", "2026-02", "rain");
        assert.equal(missed.entry, null);
        assert.equal(missed.query, "rain");

        const named = entryFromAddress([garden], "garden", "2026-02", "rain");
        assert.equal(named.entry, null);
        assert.equal(named.query, "rain");

        const older = entryFromAddress([light, rain], "light", "2026-11", "rain");
        assert.equal(older.entry?._id, "rain");
        assert.equal(older.query, "rain");

        const plain = entryFromAddress([garden, rain], "rain", "2026-02", "");
        assert.equal(plain.entry?._id, "garden");
        assert.equal(plain.query, "");
    });

    it("opens the newest saved entry", () => {
        const older = { id: "older", createdAt: new Date(2026, 1, 2, 15).toISOString() };
        const newer = { id: "newer", createdAt: new Date(2026, 10, 14, 15).toISOString() };
        assert.equal(entryToShowOnOpen([]), null);
        assert.equal(entryToShowOnOpen([{ id: "bad", createdAt: "nope" }]), null);
        assert.equal(entryToShowOnOpen([older, newer])?.id, "newer");
        assert.equal(entryToShowOnOpen([newer, older])?.id, "newer");
        assert.equal(entryToShowOnOpen([older, { ...older, id: "same" }])?.id, "older");
    });

    it("opens a linked entry, or the newest when that link is missing", () => {
        const older = { _id: "garden", createdAt: new Date(2026, 1, 2, 15).toISOString() };
        const newer = { _id: "rain", createdAt: new Date(2026, 10, 14, 9, 30).toISOString() };
        assert.equal(entryToOpenFromLink([newer, older], "garden")?._id, "garden");
        assert.equal(entryToOpenFromLink([older, newer], "missing")?._id, "rain");
        assert.equal(entryToOpenFromLink([older, newer], null)?._id, "rain");
        assert.equal(entryToOpenFromLink([older, newer], "")?._id, "rain");
        assert.equal(entryToOpenFromLink([], "garden"), null);
    });

    it("opens the following entry after a delete, or the one before it when it was last", () => {
        const newest = { _id: "newest" };
        const middle = { _id: "middle" };
        const oldest = { _id: "oldest" };
        const entries = [newest, middle, oldest];
        assert.equal(entryToShowAfterDelete(entries, "newest")?._id, "middle");
        assert.equal(entryToShowAfterDelete(entries, "middle")?._id, "oldest");
        assert.equal(entryToShowAfterDelete(entries, "oldest")?._id, "middle");
        assert.equal(entryToShowAfterDelete([newest], "newest"), null);
        assert.equal(entryToShowAfterDelete(entries, "missing"), null);
        assert.equal(entryToShowAfterDelete([], "newest"), null);
    });

    it("puts a deleted entry back on its date and keeps the edited mark", () => {
        const created = new Date(2026, 1, 2, 18).toISOString();
        const updated = new Date(2026, 10, 14, 18).toISOString();
        const body = entryUndoBody({
            content: "<p>February garden</p>",
            createdAt: created,
            updatedAt: updated,
        });
        assert.equal(body.content, "<p>February garden</p>");
        assert.equal(body.createdAt, created);
        assert.equal(body.updatedAt, updated);
        assert.equal(laterEntryTime(new Date(created), new Date(updated)).toISOString(), updated);
        assert.equal(laterEntryTime(new Date(created), new Date(2026, 0, 1)).toISOString(), created);
        assert.equal(entryWasRevised(body.createdAt, laterEntryTime(new Date(body.createdAt), new Date(body.updatedAt)).toISOString()), true);

        const rain = { _id: "rain", createdAt: new Date(2026, 10, 14, 18).toISOString() };
        const older = { _id: "older", createdAt: new Date(2026, 0, 1).toISOString() };
        const restored = { _id: "garden", createdAt: created };
        assert.deepEqual(
            entriesWithRestored([rain, older], restored).map((entry) => entry._id),
            ["rain", "garden", "older"],
        );
        assert.deepEqual(
            entriesWithRestored([rain, restored], restored).map((entry) => entry._id),
            ["rain", "garden"],
        );
    });

    it("moves up and down the entry list", () => {
        const newest = { _id: "newest" };
        const middle = { _id: "middle" };
        const oldest = { _id: "oldest" };
        const entries = [newest, middle, oldest];
        assert.equal(entryToShowByStep(entries, "newest", "next")?._id, "middle");
        assert.equal(entryToShowByStep(entries, "middle", "previous")?._id, "newest");
        assert.equal(entryToShowByStep(entries, "oldest", "next"), null);
        assert.equal(entryToShowByStep(entries, "newest", "previous"), null);
        assert.equal(entryToShowByStep(entries, "missing", "next")?._id, "newest");
        assert.equal(entryToShowByStep(entries, "missing", "previous")?._id, "oldest");
        assert.equal(entryToShowByStep([], "newest", "next"), null);
        assert.equal(entryCardQuery("middle"), 'button[data-entry-id="middle"]');
        assert.equal(entryCardQuery('a"b'), 'button[data-entry-id="a\\"b"]');
    });

    it("focuses entry search with slash, clears it with escape, and leaves an empty find", () => {
        const plain = { altKey: false, ctrlKey: false, metaKey: false, shiftKey: false, inField: false, searchFocused: false, query: "" };
        assert.equal(entryFindKeyAction({ ...plain, key: "/" }), "focus");
        assert.equal(entryFindKeyAction({ ...plain, key: "/", inField: true }), null);
        assert.equal(entryFindKeyAction({ ...plain, key: "/", searchFocused: true, query: "rain" }), null);
        assert.equal(entryFindKeyAction({ ...plain, key: "/", ctrlKey: true }), null);
        assert.equal(entryFindKeyAction({ ...plain, key: "/", metaKey: true }), null);
        assert.equal(entryFindKeyAction({ ...plain, key: "/", altKey: true }), null);
        assert.equal(entryFindKeyAction({ ...plain, key: "/", shiftKey: true }), null);
        assert.equal(entryFindKeyAction({ ...plain, key: "Escape", searchFocused: true, query: "rain" }), "clear");
        assert.equal(entryFindKeyAction({ ...plain, key: "Escape", searchFocused: true, query: "" }), "close");
        assert.equal(entryFindKeyAction({ ...plain, key: "Escape", query: "rain" }), null);
        assert.equal(entryFindKeyAction({ ...plain, key: "ArrowDown" }), null);
    });

    it("escape leaves the top layer and leaves a plain editor alone", () => {
        const closed = {
            key: "Escape",
            altKey: false,
            ctrlKey: false,
            metaKey: false,
            pendingDiscard: false,
            linkOpen: false,
            confirmDelete: false,
            detailsOpen: false,
        };
        assert.equal(entryLayerEscape(closed), null);
        assert.equal(entryLayerEscape({ ...closed, detailsOpen: true }), "details");
        assert.equal(entryLayerEscape({ ...closed, detailsOpen: true, confirmDelete: true }), "delete");
        assert.equal(entryLayerEscape({ ...closed, confirmDelete: true, linkOpen: true }), "link");
        assert.equal(entryLayerEscape({ ...closed, linkOpen: true, pendingDiscard: true }), "discard");
        assert.equal(entryLayerEscape({ ...closed, detailsOpen: true, ctrlKey: true }), null);
        assert.equal(entryLayerEscape({ ...closed, detailsOpen: true, metaKey: true }), null);
        assert.equal(entryLayerEscape({ ...closed, detailsOpen: true, altKey: true }), null);
        assert.equal(entryLayerEscape({ ...closed, key: "Enter", detailsOpen: true }), null);
    });

    it("keeps the clock time when only the date changes and marks a rewrite", () => {
        const created = new Date("2026-11-14T14:41:00.000Z");
        const now = new Date("2026-11-14T15:00:00.000Z");
        const moved = nextEntryRevision({
            createdAt: created,
            updatedAt: created,
            nextCreatedAt: new Date("2026-11-13T14:41:00.000Z"),
            writingChanged: false,
            now,
        });
        assert.equal(moved.createdAt.toISOString(), "2026-11-13T14:41:00.000Z");
        assert.equal(moved.updatedAt.toISOString(), "2026-11-13T14:41:00.000Z");
        assert.equal(entryWasRevised(moved.createdAt, moved.updatedAt), false);

        const same = nextEntryRevision({
            createdAt: created,
            updatedAt: created,
            nextCreatedAt: created,
            writingChanged: false,
            now,
        });
        assert.equal(same.updatedAt.toISOString(), created.toISOString());

        const rewritten = nextEntryRevision({
            createdAt: created,
            updatedAt: created,
            writingChanged: true,
            now,
        });
        assert.equal(rewritten.updatedAt.toISOString(), now.toISOString());
        assert.equal(entryWasRevised(rewritten.createdAt, rewritten.updatedAt), true);

        const edited = new Date("2026-11-10T12:00:00.000Z");
        const kept = nextEntryRevision({
            createdAt: new Date("2026-11-01T12:00:00.000Z"),
            updatedAt: edited,
            nextCreatedAt: new Date("2026-11-12T12:00:00.000Z"),
            writingChanged: false,
            now,
        });
        assert.equal(entryWasRevised(kept.createdAt, kept.updatedAt), true);

        const previousLabel = formatEntryLong(new Date(2026, 10, 14).toISOString());
        const nextLabel = formatEntryLong(new Date(2026, 10, 13).toISOString());
        const previous = `<h2>${previousLabel}</h2><p>Newest snow.</p>`;
        const retitled = `<h2>${nextLabel}</h2><p>Newest snow.</p>`;
        const rewrittenHtml = `<h2>${previousLabel}</h2><p>Newest snow. Again.</p>`;
        assert.equal(entryWritingChanged(previous, retitled), false);
        assert.equal(entryWritingChanged(previous, rewrittenHtml), true);
        assert.equal(entryWasRevised("nope", created), false);
    });

    it("keeps the open entry open and returns a revision to that entry", () => {
        assert.equal(entrySelectionAction("newest", "view", "newest"), "stay");
        assert.equal(entrySelectionAction("newest", "edit", "newest"), "revert");
        assert.equal(entrySelectionAction("newest", "view", "older"), "open");
        assert.equal(entrySelectionAction("newest", "edit", "older"), "open");
        assert.equal(entrySelectionAction(null, "compose", "newest"), "open");
        assert.equal(entrySelectionAction("newest", "compose", "newest"), "open");
    });
});

describe("entry links", () => {
    it("accepts an http, https, or mailto link and rejects the rest", () => {
        assert.deepEqual(entryLinkUrl("  https://example.com/rain  "), { ok: true, href: "https://example.com/rain" });
        assert.deepEqual(entryLinkUrl("mailto:rain@example.com"), { ok: true, href: "mailto:rain@example.com" });
        assert.deepEqual(entryLinkUrl("example.com"), { ok: false, error: "Enter a full http, https, or mailto URL." });
        assert.deepEqual(entryLinkUrl("javascript:alert(1)"), { ok: false, error: "Use an http, https, or mailto link." });
        assert.equal(entryLinkUrl("").ok, false);
    });
});

describe("json body", () => {
    it("reads a json object", async () => {
        const request = new Request("http://local/api", {
            method: "POST",
            body: JSON.stringify({ title: "Day" }),
            headers: { "Content-Type": "application/json" },
        });
        assert.deepEqual(await readJsonBody(request), { ok: true, value: { title: "Day" } });
    });

    it("rejects a body that is not json", async () => {
        const request = new Request("http://local/api", { method: "POST", body: "nope" });
        const result = await readJsonBody(request);
        assert.equal(result.ok, false);
    });
});
