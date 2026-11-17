import assert from "node:assert/strict";
import { describe, it } from "node:test";

import { accountMenuEscape, homeMenu } from "./home";

const wide = { narrow: false, signedIn: true };
const phone = { narrow: true, signedIn: true };

describe("home menu", () => {
    it("keeps book controls off the menu until the book is shown", () => {
        assert.deepEqual(homeMenu({ onHome: true, bookReady: false, ...wide }), {
            open: false,
            settings: false,
            account: false,
        });
        assert.deepEqual(homeMenu({ onHome: true, bookReady: true, ...wide }), {
            open: true,
            settings: true,
            account: false,
        });
        assert.deepEqual(homeMenu({ onHome: true, bookReady: false, ...phone }), {
            open: true,
            settings: false,
            account: true,
        });
        assert.deepEqual(homeMenu({ onHome: true, bookReady: true, ...phone }), {
            open: true,
            settings: true,
            account: true,
        });
        assert.deepEqual(homeMenu({ onHome: false, bookReady: true, ...phone }), {
            open: true,
            settings: false,
            account: true,
        });
        assert.deepEqual(homeMenu({ onHome: false, bookReady: false, narrow: true, signedIn: false }), {
            open: false,
            settings: false,
            account: false,
        });
    });

    it("closes the account menu on Escape unless a diary sheet is open", () => {
        const open = { key: "Escape", altKey: false, ctrlKey: false, metaKey: false, menuOpen: true, formOpen: false, themeOpen: false };
        assert.equal(accountMenuEscape(open), true);
        assert.equal(accountMenuEscape({ ...open, menuOpen: false }), false);
        assert.equal(accountMenuEscape({ ...open, formOpen: true }), false);
        assert.equal(accountMenuEscape({ ...open, themeOpen: true }), false);
        assert.equal(accountMenuEscape({ ...open, key: "Enter" }), false);
        assert.equal(accountMenuEscape({ ...open, ctrlKey: true }), false);
        assert.equal(accountMenuEscape({ ...open, metaKey: true }), false);
        assert.equal(accountMenuEscape({ ...open, altKey: true }), false);
    });
});
