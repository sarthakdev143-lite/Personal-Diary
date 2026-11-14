import assert from "node:assert/strict";
import { describe, it } from "node:test";

import { diaryListKeyAction, diarySearchShortcut, searchShortcutLabel } from "./keys";

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
    });
});
