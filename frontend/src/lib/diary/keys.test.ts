import assert from "node:assert/strict";
import { describe, it } from "node:test";

import { diaryListKeyAction, diaryListStep, diarySearchShortcut, entryListStep, searchHintVisible, searchShortcutLabel } from "./keys";

const plain = { key: "i", ctrlKey: false, metaKey: false, altKey: false, shiftKey: false };

describe("diary search shortcut", () => {
    it("focuses search from ctrl or command I, and names the key for the machine", () => {
        assert.equal(diarySearchShortcut({ ...plain, ctrlKey: true }), true);
        assert.equal(diarySearchShortcut({ ...plain, metaKey: true }), true);
        assert.equal(diarySearchShortcut({ ...plain, key: "I", ctrlKey: true }), true);
        assert.equal(diarySearchShortcut(plain), false);
        assert.equal(diarySearchShortcut({ ...plain, ctrlKey: true, shiftKey: true }), false);
        assert.equal(diarySearchShortcut({ ...plain, metaKey: true, altKey: true }), false);
        assert.equal(diarySearchShortcut({ ...plain, key: "k", metaKey: true }), false);

        assert.equal(searchShortcutLabel("MacIntel"), "⌘");
        assert.equal(searchShortcutLabel("iPhone"), "⌘");
        assert.equal(searchShortcutLabel("Linux x86_64"), "ctrl");
        assert.equal(searchShortcutLabel("Win32"), "ctrl");
    });

    it("hides the search shortcut once the field has text", () => {
        assert.equal(searchHintVisible(""), true);
        assert.equal(searchHintVisible("   "), false);
        assert.equal(searchHintVisible("rain"), false);
        assert.equal(searchHintVisible(" rain "), false);
    });

    it("leaves diary search with escape, then moves through the diaries", () => {
        const plain = {
            altKey: false,
            ctrlKey: false,
            metaKey: false,
            shiftKey: false,
            inField: false,
            searchFocused: false,
            query: "",
            formOpen: false,
            themeOpen: false,
        };
        assert.equal(diaryListKeyAction({ ...plain, key: "ArrowDown" }), "next");
        assert.equal(diaryListKeyAction({ ...plain, key: "ArrowUp" }), "previous");
        assert.equal(diaryListKeyAction({ ...plain, key: "ArrowDown", inField: true }), null);
        assert.equal(diaryListKeyAction({ ...plain, key: "ArrowDown", searchFocused: true, inField: true }), "next");
        assert.equal(diaryListKeyAction({ ...plain, key: "ArrowUp", searchFocused: true, inField: true }), null);
        assert.equal(diaryListKeyAction({ ...plain, key: "ArrowDown", searchFocused: true, formOpen: true }), null);
        assert.equal(diaryListKeyAction({ ...plain, key: "ArrowDown", searchFocused: true, shiftKey: true }), null);
        assert.equal(diaryListKeyAction({ ...plain, key: "ArrowDown", formOpen: true }), null);
        assert.equal(diaryListKeyAction({ ...plain, key: "ArrowUp", themeOpen: true }), null);
        assert.equal(diaryListKeyAction({ ...plain, key: "ArrowDown", shiftKey: true }), null);
        assert.equal(diaryListKeyAction({ ...plain, key: "ArrowDown", ctrlKey: true }), null);
        assert.equal(diaryListKeyAction({ ...plain, key: "ArrowDown", metaKey: true }), null);
        assert.equal(diaryListKeyAction({ ...plain, key: "ArrowDown", altKey: true }), null);
        assert.equal(diaryListKeyAction({ ...plain, key: "Escape", searchFocused: true, query: "rain" }), "clear");
        assert.equal(diaryListKeyAction({ ...plain, key: "Escape", searchFocused: true }), "close");
        assert.equal(diaryListKeyAction({ ...plain, key: "Escape", searchFocused: true, query: "rain", formOpen: true }), "form");
        assert.equal(diaryListKeyAction({ ...plain, key: "Escape", themeOpen: true, formOpen: true }), "theme");
        assert.equal(diaryListKeyAction({ ...plain, key: "Escape" }), null);
        assert.equal(diaryListKeyAction({ ...plain, key: "Enter" }), null);
        assert.equal(diaryListKeyAction({ ...plain, key: "Enter", searchFocused: true, inField: true }), "open");
        assert.equal(diaryListKeyAction({ ...plain, key: "Enter", searchFocused: true, query: "Garden" }), "open");
        assert.equal(diaryListKeyAction({ ...plain, key: "Enter", searchFocused: true, formOpen: true }), null);
        assert.equal(diaryListKeyAction({ ...plain, key: "Enter", searchFocused: true, themeOpen: true }), null);
        assert.equal(diaryListKeyAction({ ...plain, key: "Enter", searchFocused: true, shiftKey: true }), null);
        assert.equal(diaryListKeyAction({ ...plain, key: "Enter", searchFocused: true, ctrlKey: true }), null);
    });

    it("returns to the search from the first diary", () => {
        assert.equal(diaryListStep(["harbor", "garden"], "harbor", "previous"), "search");
        assert.equal(diaryListStep(["harbor", "garden"], "garden", "previous"), "harbor");
        assert.equal(diaryListStep(["harbor", "garden"], "harbor", "next"), "garden");
        assert.equal(diaryListStep(["harbor", "garden"], "garden", "next"), null);
        assert.equal(diaryListStep(["harbor", "garden"], null, "next"), "harbor");
        assert.equal(diaryListStep(["harbor", "garden"], null, "previous"), "garden");
        assert.equal(diaryListStep([], "harbor", "previous"), null);
    });

    it("returns to the entry find box from the first entry", () => {
        assert.equal(entryListStep(["newest", "older"], "newest", "previous"), "find");
        assert.equal(entryListStep(["newest", "older"], "older", "previous"), "newest");
        assert.equal(entryListStep(["newest", "older"], "newest", "next"), "older");
        assert.equal(entryListStep(["newest", "older"], "older", "next"), null);
        assert.equal(entryListStep(["newest", "older"], null, "next"), "newest");
        assert.equal(entryListStep([], "newest", "previous"), null);
    });
});
