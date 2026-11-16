import assert from "node:assert/strict";
import { describe, it } from "node:test";

import { newDiaryTitleNote } from "./validation";

describe("new diary title", () => {
    it("explains the length before the title is long enough", () => {
        assert.deepEqual(newDiaryTitleNote(""), { tone: "hint", text: "At least 3 characters." });
        assert.deepEqual(newDiaryTitleNote("  "), { tone: "hint", text: "At least 3 characters." });
        assert.deepEqual(newDiaryTitleNote("ab"), { tone: "error", text: "Title must be at least 3 characters." });
        assert.equal(newDiaryTitleNote("Harbor"), null);
        assert.equal(newDiaryTitleNote("a".repeat(121))?.tone, "error");
    });
});
