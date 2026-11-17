import assert from "node:assert/strict";
import { describe, it } from "node:test";

import { showSignIn } from "./session";

describe("session sign in", () => {
    it("offers sign in only after the session is known to be absent", () => {
        assert.equal(showSignIn("loading"), false);
        assert.equal(showSignIn("authenticated"), false);
        assert.equal(showSignIn("unauthenticated"), true);
        assert.equal(showSignIn("unauthenticated", "/"), true);
        assert.equal(showSignIn("unauthenticated", "/login"), false);
    });
});
