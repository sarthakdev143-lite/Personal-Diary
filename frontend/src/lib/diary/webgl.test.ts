import assert from "node:assert/strict";
import { describe, it } from "node:test";

import { webgl2Available } from "./webgl";

describe("cover graphics", () => {
    it("stays quiet when the page has no graphics context", () => {
        assert.equal(webgl2Available(), false);
    });
});
