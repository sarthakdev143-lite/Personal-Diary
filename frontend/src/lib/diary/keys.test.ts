import assert from "node:assert/strict";
import { describe, it } from "node:test";

import { diarySearchShortcut, searchShortcutLabel } from "./keys";

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
});
