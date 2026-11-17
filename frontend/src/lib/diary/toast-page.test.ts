import assert from "node:assert/strict";
import { describe, it } from "node:test";

import { toastClearance, toastContent, toastsForPage } from "./toast-page";

describe("toasts stay on the page that raised them", () => {
    it("drops a notice from the page you left and keeps one raised here", () => {
        const leftBehind = { title: "Not imported", page: "/diary" };
        const raisedHere = { title: "Diary imported", page: "/diary/abc" };

        assert.deepEqual(toastsForPage([leftBehind, raisedHere], "/diary/abc"), [raisedHere]);
        assert.deepEqual(toastsForPage([raisedHere], "/diary/abc"), [raisedHere]);
        assert.deepEqual(toastContent(raisedHere), { title: "Diary imported" });
    });
});

describe("a notice clears the bottom bars", () => {
    it("sits above the taller bar and keeps a short gap when no bar is measured", () => {
        assert.equal(toastClearance(844, [706, 760]), 138);
        assert.equal(toastClearance(844, [705.2]), 139);
        assert.equal(toastClearance(844, []), 96);
        assert.equal(toastClearance(0, [10]), 96);
    });
});
