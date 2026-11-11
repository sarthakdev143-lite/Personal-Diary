import { describe, expect, it } from "vitest";

import { ciphertextLimit, isProStatus, limits, themeAllowed } from "./plans";

describe("plans", () => {
    it("keeps free smaller than pro", () => {
        expect(limits("free").diaries).toBeLessThan(limits("pro").diaries);
        expect(limits("free").entriesPerDiary).toBeLessThan(limits("pro").entriesPerDiary);
        expect(ciphertextLimit("free")).toBeLessThan(ciphertextLimit("pro"));
    });

    it("gates covers and subscription statuses", () => {
        expect(themeAllowed("free", "/textures/leather-texture.jpg")).toBe(true);
        expect(themeAllowed("free", "/textures/leather-bound.webp")).toBe(false);
        expect(themeAllowed("pro", "/textures/wooden_garage_door.webp")).toBe(true);
        expect(themeAllowed("pro", "/textures/missing.jpg")).toBe(false);
        expect(isProStatus("active")).toBe(true);
        expect(isProStatus("past_due")).toBe(true);
        expect(isProStatus("canceled")).toBe(false);
    });
});
