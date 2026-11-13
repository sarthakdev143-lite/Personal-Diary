import assert from "node:assert/strict";
import { describe, it } from "node:test";

import { isObjectId } from "./ids";
import { buildEntrySearchFilter, diaryFieldsMatch, escapeRegExp, normalizeSearchQuery } from "./search";
import { entryPlainText, storedPlainText, wordCount } from "./text";
import {
    normalizeDescription,
    normalizeTheme,
    normalizeThemeUpdate,
    normalizeTitle,
    parseEntryDate,
} from "./validation";
import { prepareEntryContent } from "./content";
import { readJsonBody } from "./json";
import { CONTENT_MAX, DEFAULT_DIARY_THEME, MAX_DATA_IMAGE_LENGTH } from "./constants";

describe("diary ids", () => {
    it("accepts a 24 character hex id", () => {
        assert.equal(isObjectId("507f1f77bcf86cd799439011"), true);
        assert.equal(isObjectId("507F1F77BCF86CD799439011"), true);
    });

    it("rejects ids that are only 12 characters", () => {
        assert.equal(isObjectId("timtomtamted"), false);
        assert.equal(isObjectId("507f1f77bcf86cd79943901"), false);
        assert.equal(isObjectId("507f1f77bcf86cd799439011zz"), false);
        assert.equal(isObjectId(""), false);
    });
});

describe("diary fields", () => {
    it("trims and collapses a title", () => {
        assert.deepEqual(normalizeTitle("  Morning   pages  "), { ok: true, value: "Morning pages" });
    });

    it("rejects a short title", () => {
        assert.deepEqual(normalizeTitle("  no "), { ok: false, error: "Title must be at least 3 characters." });
        assert.deepEqual(normalizeTitle(12), { ok: false, error: "Title must be at least 3 characters." });
    });

    it("rejects a very long title", () => {
        const result = normalizeTitle("a".repeat(121));
        assert.equal(result.ok, false);
        if (!result.ok) assert.match(result.error, /120/);
    });

    it("allows an empty description and caps a long one", () => {
        assert.deepEqual(normalizeDescription(undefined), { ok: true, value: "" });
        assert.deepEqual(normalizeDescription("  notes  "), { ok: true, value: "notes" });
        const result = normalizeDescription("a".repeat(501));
        assert.equal(result.ok, false);
    });

    it("defaults a missing theme and rejects an unknown one", () => {
        assert.deepEqual(normalizeTheme(undefined), { ok: true, value: DEFAULT_DIARY_THEME });
        assert.deepEqual(normalizeTheme("/textures/leather-bound.webp"), {
            ok: true,
            value: "/textures/leather-bound.webp",
        });
        assert.deepEqual(normalizeTheme("https://evil.example/cover.jpg"), {
            ok: false,
            error: "Choose a theme from the list.",
        });
        assert.equal(normalizeThemeUpdate(undefined).ok, false);
    });

    it("rejects an impossible entry date", () => {
        const now = Date.parse("2026-06-01T00:00:00.000Z");
        assert.equal(parseEntryDate("not-a-date", now).ok, false);
        assert.equal(parseEntryDate("2099-01-01T00:00:00.000Z", now).ok, false);
        const parsed = parseEntryDate("2026-05-31T12:00:00.000Z", now);
        assert.equal(parsed.ok, true);
        if (parsed.ok) assert.equal(parsed.value.toISOString(), "2026-05-31T12:00:00.000Z");
    });
});

describe("entry html", () => {
    it("keeps headings, emphasis, and safe links", () => {
        const result = prepareEntryContent("<h2>Day</h2><p>Hello <strong>there</strong></p><a href=\"https://example.com\">link</a>");
        assert.equal(result.ok, true);
        if (!result.ok) return;
        assert.match(result.content, /<h2>Day<\/h2>/);
        assert.match(result.content, /<strong>there<\/strong>/);
        assert.match(result.content, /href="https:\/\/example.com"/);
        assert.equal(result.plainText, "Day Hello there link");
    });

    it("strips scripts, handlers, and javascript links", () => {
        const result = prepareEntryContent(
            `<p onclick="alert(1)">Hi</p><script>alert(1)</script><a href="javascript:alert(1)">x</a><img src="x" onerror="alert(1)">`
        );
        assert.equal(result.ok, true);
        if (!result.ok) return;
        assert.doesNotMatch(result.content, /script|onclick|onerror|javascript:/i);
        assert.match(result.plainText, /Hi/);
        assert.doesNotMatch(result.plainText, /alert/);
    });

    it("allows a small image data url and drops other data urls", () => {
        const png = `<img src="data:image/png;base64,aaaa" alt="sketch">`;
        const kept = prepareEntryContent(`<p>Look</p>${png}`);
        assert.equal(kept.ok, true);
        if (kept.ok) assert.match(kept.content, /data:image\/png;base64,aaaa/);

        const svg = prepareEntryContent(`<p>Look</p><img src="data:image/svg+xml;base64,PHN2Zz4=">`);
        assert.equal(svg.ok, true);
        if (svg.ok) assert.doesNotMatch(svg.content, /svg\+xml/);
    });

    it("keeps an entry that is only an image", () => {
        const result = prepareEntryContent('<img src="https://example.com/sunset.png" alt="sunset">');
        assert.equal(result.ok, true);
        if (result.ok) {
            assert.match(result.content, /sunset\.png/);
            assert.match(result.plainText, /sunset/);
        }
    });

    it("rejects an entry with no text", () => {
        assert.deepEqual(prepareEntryContent("<p><br></p>"), { ok: false, error: "Content is required." });
        assert.deepEqual(prepareEntryContent("   "), { ok: false, error: "Content is required." });
    });

    it("rejects an oversized entry and drops an oversized image", () => {
        assert.equal(prepareEntryContent("a".repeat(CONTENT_MAX + 1)).ok, false);
        const huge = `<p>note</p><img src="data:image/png;base64,${"a".repeat(MAX_DATA_IMAGE_LENGTH)}">`;
        const result = prepareEntryContent(huge);
        assert.equal(result.ok, true);
        if (result.ok) assert.doesNotMatch(result.content, /data:image/);
    });

    it("keeps a stored plain text and fills one in when it is missing", () => {
        assert.deepEqual(storedPlainText({ content: "<p>old</p>", plainText: "kept" }), {
            plainText: "kept",
            needsWrite: false,
        });
        assert.deepEqual(storedPlainText({ content: "<p>old</p>", plainText: "" }), {
            plainText: "",
            needsWrite: false,
        });
        assert.deepEqual(storedPlainText({ content: "<p>Hello <strong>there</strong></p>" }), {
            plainText: "Hello there",
            needsWrite: true,
        });
        assert.deepEqual(storedPlainText({ content: '<img src="https://example.com/a.png" alt="">' }), {
            plainText: "Image",
            needsWrite: true,
        });
    });

    it("counts words from visible text", () => {
        assert.equal(entryPlainText("<p>one&nbsp;two &amp; three</p>"), "one two & three");
        assert.equal(wordCount("<p>one two <strong>three</strong></p>"), 3);
        assert.equal(wordCount("<script>secret words</script><p></p>"), 0);
    });
});

describe("search", () => {
    it("escapes regex characters in a query", () => {
        assert.equal(escapeRegExp("day.one"), "day\\.one");
        const filter = buildEntrySearchFilter("user-1", "  day.one  ");
        assert.ok(filter);
        const pattern = filter?.$or[0].plainText.$regex;
        assert.equal(pattern, "day\\.one");
        assert.equal(filter?.userId, "user-1");
    });

    it("matches a diary title or description and ignores a blank query", () => {
        assert.equal(normalizeSearchQuery("  hello  "), "hello");
        assert.equal(diaryFieldsMatch("Morning", "garden notes", "GARDEN"), true);
        assert.equal(diaryFieldsMatch("Morning", "garden notes", "night"), false);
        assert.equal(diaryFieldsMatch("Morning", "", "   "), true);
        assert.equal(buildEntrySearchFilter("user-1", "   "), null);
    });

    it("caps a very long query", () => {
        assert.equal(normalizeSearchQuery("a".repeat(200)).length, 80);
    });
});

describe("json body", () => {
    it("reads a json object", async () => {
        const request = new Request("http://local/api", {
            method: "POST",
            body: JSON.stringify({ title: "Day" }),
            headers: { "Content-Type": "application/json" },
        });
        assert.deepEqual(await readJsonBody(request), { ok: true, value: { title: "Day" } });
    });

    it("rejects a body that is not json", async () => {
        const request = new Request("http://local/api", { method: "POST", body: "nope" });
        const result = await readJsonBody(request);
        assert.equal(result.ok, false);
    });
});
