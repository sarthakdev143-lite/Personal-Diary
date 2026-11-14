import assert from "node:assert/strict";
import { describe, it } from "node:test";

import { toastContent, toastsForPage } from "./toast-page";

describe("toasts stay on the page that raised them", () => {
    it("drops a notice from the page you left and keeps one raised here", () => {
        const leftBehind = { title: "Not imported", page: "/diary" };
        const raisedHere = { title: "Diary imported", page: "/diary/abc" };

        assert.deepEqual(toastsForPage([leftBehind, raisedHere], "/diary/abc"), [raisedHere]);
        assert.deepEqual(toastsForPage([raisedHere], "/diary/abc"), [raisedHere]);
        assert.deepEqual(toastContent(raisedHere), { title: "Diary imported" });
    });
});
