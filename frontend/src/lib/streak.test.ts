import { describe, expect, it } from "vitest";

import { writingStreak } from "./streak";

function day(offset: number): Date {
    const date = new Date(2026, 10, 11);
    date.setDate(date.getDate() + offset);
    return date;
}

describe("writingStreak", () => {
    const today = day(0);

    it("counts today and yesterday", () => {
        expect(writingStreak([day(0), day(-1), day(-2)], today)).toBe(3);
    });

    it("keeps a streak that last wrote yesterday", () => {
        expect(writingStreak([day(-1), day(-2)], today)).toBe(2);
    });

    it("breaks when yesterday is empty", () => {
        expect(writingStreak([day(-2)], today)).toBe(0);
        expect(writingStreak([], today)).toBe(0);
    });
});
