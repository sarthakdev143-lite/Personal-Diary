import assert from "node:assert/strict";
import { describe, it } from "node:test";

import { commandKeyLabel, saveEntryShortcut } from "./shortcut";

const plain = { key: "s", ctrlKey: false, metaKey: false, altKey: false, shiftKey: false };

describe("save shortcut", () => {
    it("saves from ctrl or command S and names the key for the machine", () => {
        assert.equal(saveEntryShortcut({ ...plain, ctrlKey: true }), true);
        assert.equal(saveEntryShortcut({ ...plain, metaKey: true }), true);
        assert.equal(saveEntryShortcut({ ...plain, key: "S", ctrlKey: true }), true);
        assert.equal(saveEntryShortcut(plain), false);
        assert.equal(saveEntryShortcut({ ...plain, ctrlKey: true, shiftKey: true }), false);
        assert.equal(saveEntryShortcut({ ...plain, metaKey: true, altKey: true }), false);
        assert.equal(saveEntryShortcut({ ...plain, key: "i", metaKey: true }), false);

        assert.equal(commandKeyLabel("MacIntel"), "⌘");
        assert.equal(commandKeyLabel("iPad"), "⌘");
        assert.equal(commandKeyLabel("Linux x86_64"), "ctrl");
        assert.equal(commandKeyLabel("Win32"), "ctrl");
    });
});
