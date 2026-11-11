import { describe, expect, it } from "vitest";

import { normalizeEmail } from "./email";

describe("normalizeEmail", () => {
    it("accepts a normal address and rejects a fragment", () => {
        expect(normalizeEmail("  Ada@Example.com ")).toBe("ada@example.com");
        expect(normalizeEmail("not-an-email")).toBeNull();
    });
});
