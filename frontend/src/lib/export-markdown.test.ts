import { describe, expect, it } from "vitest";

import { diaryToMarkdown, htmlToMarkdown, markdownFilename } from "./export-markdown";

describe("export markdown", () => {
    it("turns editor html into markdown", () => {
        const markdown = htmlToMarkdown("<h1>Day</h1><p>Hello&nbsp;<strong>there</strong></p><img src='x'><li>One</li>");
        expect(markdown).toContain("# Day");
        expect(markdown).toContain("Hello there");
        expect(markdown).toContain("[image]");
        expect(markdown).toContain("- One");
    });

    it("builds a diary file", () => {
        const file = diaryToMarkdown(
            { title: "Morning", description: "Notes" },
            [{ heading: "Nov 11", content: "<p>Coffee</p>" }]
        );
        expect(file).toBe("# Morning\n\nNotes\n\n## Nov 11\n\nCoffee\n");
        expect(markdownFilename("Morning Pages!")).toBe("morning-pages.md");
        expect(markdownFilename("???")).toBe("diary.md");
    });
});
