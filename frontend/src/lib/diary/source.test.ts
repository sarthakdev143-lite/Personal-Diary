import assert from "node:assert/strict";
import { describe, it } from "node:test";

import { openSourceHref } from "./source";

describe("open source", () => {
    it("points at the public repository", () => {
        assert.equal(openSourceHref(), "https://github.com/sarthakdev143-lite/Personal-Diary");
    });
});
