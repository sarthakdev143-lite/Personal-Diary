import assert from "node:assert/strict";
import { describe, it } from "node:test";

import { loginWaitingMessage } from "./login";

describe("login waiting", () => {
    it("explains the pause while the session is still opening", () => {
        assert.equal(loginWaitingMessage("loading"), "Opening your diaries");
        assert.equal(loginWaitingMessage("authenticated"), "Opening your diaries");
        assert.equal(loginWaitingMessage("unauthenticated"), null);
    });
});
