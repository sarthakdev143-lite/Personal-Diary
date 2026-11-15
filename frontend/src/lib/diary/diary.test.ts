import assert from "node:assert/strict";
import { describe, it } from "node:test";

import { isObjectId } from "./ids";
import { buildEntrySearchFilter, diaryFieldsMatch, diaryListMatch, diaryMatchPath, entriesForQuery, entryCardPreview, entryMatchCount, entryMatchCursor, entryMatchesListQuery, entryPageAddress, entryShareAddress, escapeRegExp, matchedTextParts, normalizeSearchQuery, textPieceHits, textRunHits } from "./search";
import { calendarDate, emptyEntryListMessage, entriesWithRestored, entryCardQuery, entryFindKeyAction, entryInMonth, entryInstant, entryLayerEscape, entryLinkUrl, entryListSearchText, entryMonths, entryPlainText, entrySelectionAction, entryToOpenForFilter, entryToOpenFromLink, entryToOpenWhenHidden, entryToShowAfterDelete, entryToShowByStep, entryToShowOnOpen, entryUndoBody, entryWasRevised, entryWritingChanged, entryWritingText, codeLineKey, codeLeaveRemoval, dateHeadingKey, datePaste, dateSelectionKey, formatDiaryDate, formatEntryLong, formatEntryTime, freshEntryHtml, hasEntryContent, boundarySpaceCut, codeGap, codePullKey, codePullUndoCaret, dividerCaret, headingEnterKey, headingSplitUndo, splitSpace, blankUndoCaret, joinUndoCaret, plainMarkSpaces, plainSpacesAfterMarks, styleEdgeCut, styleShortcut, styleUndoCaret, formatUndoCommand, replacedSelectionUndo, dragSelectionUndo, pasteSelectionUndo, selectionCutUndo, selectionDeleteUndo, selectionEnterUndo, selectionTypeUndo, styledLine, wordDeleteSpan, wordDeleteGap, cutRemoval, wordGapInsert, wordGapKey, wordGapSpace, stickyUndo, stickyTyped, typedRedo, styledLineUndoCaret, styledPunctuation, styledSpace, joinGap, joinNeedsSpace, laterEntryTime, lineJoinKey, breakJoinKey, breakUndoMark, listCommand, listUndoCaret, listEdgeKey, sameEditingPage, savedRedo, undoButton, listLeaveKey, listLeavePlace, listEnterKey, orderedItemNumber, quoteEnterKey, quoteLeaveKey, separateGluedDateHeading, monthForSavedEntry, monthKey, monthLabel, nextEntryRevision, retitleEntryDate, showOpenEntry, storedPlainText, wordCount } from "./text";
import { compareDiaries } from "./order";
import { appliedPin, pinFailureMessage } from "./pin";
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
        assert.equal(dateSelectionKey({ ...selected, key: "Backspace", ctrlKey: true }), "pass");
        assert.equal(dateSelectionKey({ ...selected, key: "Backspace", metaKey: true }), "pass");
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
        assert.equal(codePullKey({ ...start, ctrlKey: true }), "pass");
        assert.equal(codePullKey({ key: "Delete", collapsed: true, atStart: false, atEnd: true, neighbor: "code" }), "pull");
        assert.equal(codePullKey({ key: "Delete", collapsed: true, atStart: false, atEnd: true, neighbor: "text" }), "pass");
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
        assert.equal(listEdgeKey({ ...edge, ctrlKey: true }), "pass");
    });

    it("leaves a list when Enter is pressed on a blank item", () => {
        const blank = { key: "Enter", inItem: true, collapsed: true, empty: true };
        assert.equal(listLeaveKey(blank), "leave");
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
        assert.equal(selectionDeleteUndo({ key: "Backspace", collapsed: true }), "pass");
        assert.equal(selectionDeleteUndo({ key: "Delete", collapsed: false, ctrlKey: true }), "pass");
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
        assert.deepEqual(wordDeleteSpan("See 72\u00b0 rain", 4, 6), { start: 4, end: 8 });
        assert.deepEqual(wordDeleteSpan("See 72\u00b0 rain", 6, 7), { start: 4, end: 8 });
        assert.equal(wordDeleteGap("See 72\u00b0 rain", 4, 6), "after");
        assert.deepEqual(wordDeleteSpan("See $12 rain", 5, 7), { start: 4, end: 8 });
        assert.deepEqual(wordDeleteSpan("See $12 rain", 4, 5), { start: 4, end: 5 });
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
        assert.equal(title.snippet, null);

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
        assert.equal(diaryMatchPath("diary1", fromOlder.entryId), "/diary/diary1?entry=garden");

        const newest = diaryListMatch(diary, [garden, rain], "rain");
        assert.equal(newest.entryId, "rain");

        const title = diaryListMatch(diary, [rain, garden], "window");
        assert.equal(title.entryId, null);
        assert.equal(diaryMatchPath("diary1", title.entryId), "/diary/diary1");

        const blank = diaryListMatch(diary, [garden], " ");
        assert.equal(blank.entryId, null);
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
        assert.equal(entryMatchesListQuery(written, "Quiet rain"), true);
        assert.equal(diaryListMatch({ title: "Window", description: "" }, [written], dateSeam).matched, false);

        const revised = { ...written, updatedAt: new Date(new Date(created).getTime() + 5000).toISOString() };
        const clockSeam = `${formatEntryTime(created).slice(-2)} edited`;
        assert.equal(entryListSearchText(revised).includes(clockSeam), true);
        assert.equal(entryMatchesListQuery(revised, clockSeam), false);
        assert.equal(entryMatchesListQuery(revised, "edited"), true);
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
        assert.equal(monthForSavedEntry(february, ""), "");
        assert.equal(monthForSavedEntry(february, "2026-02"), "2026-02");
        assert.equal(monthForSavedEntry(february, "2026-11"), "2026-02");
        assert.equal(monthForSavedEntry("nope", "2026-11"), "2026-11");
    });

    it("opens the newest visible entry when the current one is hidden", () => {
        const november = { _id: "rain", createdAt: new Date(2026, 10, 14, 15).toISOString() };
        const february = { _id: "garden", createdAt: new Date(2026, 1, 2, 15).toISOString() };
        const olderFebruary = { _id: "seed", createdAt: new Date(2026, 1, 1, 15).toISOString() };
        assert.equal(entryToOpenWhenHidden([november, february], "rain"), null);
        assert.equal(entryToOpenWhenHidden([february, olderFebruary], "rain")?._id, "garden");
        assert.equal(entryToOpenWhenHidden([], "rain"), null);
        assert.equal(entryToOpenWhenHidden([february, olderFebruary], null)?._id, "garden");
    });

    it("opens a match when find hides the open entry and leaves a new entry alone", () => {
        const november = { _id: "rain", createdAt: new Date(2026, 10, 14, 15).toISOString() };
        const february = { _id: "garden", createdAt: new Date(2026, 1, 2, 15).toISOString() };
        assert.equal(entryToOpenForFilter([november, february], null), null);
        assert.equal(entryToOpenForFilter([november, february], "rain"), null);
        assert.equal(entryToOpenForFilter([february], "rain")?._id, "garden");
        assert.equal(entryToOpenForFilter([], "rain"), null);
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
