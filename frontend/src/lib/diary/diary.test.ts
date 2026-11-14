import assert from "node:assert/strict";
import { describe, it } from "node:test";

import { isObjectId } from "./ids";
import { buildEntrySearchFilter, diaryFieldsMatch, diaryListMatch, diaryMatchPath, entryMatchesListQuery, escapeRegExp, normalizeSearchQuery } from "./search";
import { calendarDate, emptyEntryListMessage, entryFindKeyAction, entryInMonth, entryInstant, entryLinkUrl, entryListSearchText, entryMonths, entryPlainText, entrySelectionAction, entryToOpenFromLink, entryToShowAfterDelete, entryToShowByStep, entryToShowOnOpen, entryWasRevised, entryWritingChanged, entryWritingText, formatEntryLong, monthForSavedEntry, monthKey, monthLabel, nextEntryRevision, retitleEntryDate, storedPlainText, wordCount } from "./text";
import {
    normalizeDescription,
    normalizeTheme,
    normalizeThemeUpdate,
    normalizeTitle,
    parseEntryDate,
} from "./validation";
import { prepareEntryContent, presentEntry } from "./content";
import { buildDiaryExport, diaryToMarkdown, exportFilename, htmlToMarkdown } from "./export";
import { readJsonBody } from "./json";
import { CONTENT_MAX, DEFAULT_DIARY_THEME, MAX_DATA_IMAGE_LENGTH, coverForTheme } from "./constants";

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

    it("names a known cover and ignores an unknown one", () => {
        assert.equal(coverForTheme("/textures/wooden_garage_door.webp")?.name, "Wooden Garage Door");
        assert.equal(coverForTheme("/textures/missing.jpg"), null);
        assert.equal(coverForTheme(null), null);
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

    it("opens a saved link in a new tab", () => {
        const result = prepareEntryContent('<p><a href="https://example.com/glass" target="_self" rel="opener">window</a></p>');
        assert.equal(result.ok, true);
        if (!result.ok) return;
        assert.match(result.content, /href="https:\/\/example.com\/glass"/);
        assert.match(result.content, /target="_blank"/);
        assert.match(result.content, /rel="noopener noreferrer"/);
        assert.doesNotMatch(result.content, /_self|rel="opener"/);
        assert.equal(result.plainText, "window");

        const shown = presentEntry({ content: '<p><a href="mailto:rain@example.com">rain</a>.</p>', plainText: "rain ." });
        assert.match(shown.content, /href="mailto:rain@example.com"/);
        assert.match(shown.content, /target="_blank"/);
        assert.match(shown.content, /rel="noopener noreferrer"/);
        assert.equal(shown.plainText, "rain.");
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

    it("returns stored html without scripts", () => {
        const presented = presentEntry({
            content: `<p onclick="alert(1)">Hi</p><script>alert(1)</script><img src="https://example.com/a.png" alt="sketch">`,
            plainText: "alert(1) Hi sketch",
        });
        assert.equal(presented.content.includes("script"), false);
        assert.equal(presented.content.includes("onclick"), false);
        assert.match(presented.content, /Hi/);
        assert.equal(presented.plainText.includes("alert"), false);
        assert.match(presented.plainText, /Hi/);
        assert.match(presented.plainText, /sketch/);
    });

    it("counts words from visible text", () => {
        assert.equal(entryPlainText("<p>one&nbsp;two &amp; three</p>"), "one two & three");
        assert.equal(wordCount("<p>one two <strong>three</strong></p>"), 3);
        assert.equal(wordCount("<script>secret words</script><p></p>"), 0);
        assert.equal(entryPlainText('<p>Quiet <a href="https://example.com/glass">window</a>.</p>'), "Quiet window.");
        assert.equal(wordCount('<p>Quiet <a href="https://example.com/glass">window</a>.</p>'), 2);
        assert.equal(entryPlainText("<p><strong>Hello</strong>, rain.</p>"), "Hello, rain.");
    });

    it("does not treat the inserted date heading as the entry", () => {
        const label = formatEntryLong(new Date(2026, 10, 14).toISOString());
        const blank = `<h2>${label}</h2><p><br></p>`;
        const note = `<h2>${label}</h2><p>Newest snow.</p>`;

        assert.equal(entryWritingText(blank), "");
        assert.equal(wordCount(blank), 0);
        assert.equal(entryWritingText(note), "Newest snow.");
        assert.equal(wordCount(note), 2);
        assert.deepEqual(prepareEntryContent(blank), { ok: false, error: "Content is required." });

        const saved = prepareEntryContent(note);
        assert.equal(saved.ok, true);
        if (!saved.ok) return;
        assert.match(saved.content, new RegExp(`<h2>${label}</h2>`));
        assert.equal(saved.plainText, "Newest snow.");

        const shown = presentEntry({ content: note, plainText: `${label} Newest snow.` });
        assert.equal(shown.plainText, "Newest snow.");

        const ownHeading = prepareEntryContent("<h2>Notaday, November 14, 2026</h2><p>Kept</p>");
        assert.equal(ownHeading.ok, true);
        if (ownHeading.ok) assert.equal(ownHeading.plainText, "Notaday, November 14, 2026 Kept");

        const picture = prepareEntryContent(`<h2>${label}</h2><img src="https://example.com/sunset.png" alt="sunset">`);
        assert.equal(picture.ok, true);
        if (picture.ok) assert.equal(picture.plainText, "sunset");
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

    it("finds an entry by the date and time on its card", () => {
        const created = new Date(2026, 10, 14, 9, 30).toISOString();
        const entry = {
            content: "<p>Quiet rain</p>",
            plainText: "Quiet rain",
            createdAt: created,
            updatedAt: created,
        };
        const text = entryListSearchText(entry);
        assert.equal(diaryFieldsMatch(text, "", "November"), true);
        assert.equal(diaryFieldsMatch(text, "", "09:30"), true);
        assert.equal(diaryFieldsMatch(text, "", "9:30"), true);
        assert.equal(diaryFieldsMatch(text, "", "quiet"), true);
        assert.equal(diaryFieldsMatch(text, "", "edited"), false);
        assert.equal(diaryFieldsMatch(text, "", "garden"), false);

        const revised = { ...entry, updatedAt: new Date(new Date(created).getTime() + 5000).toISOString() };
        const revisedText = entryListSearchText(revised);
        assert.equal(diaryFieldsMatch(revisedText, "", "edited"), true);
        assert.equal(diaryFieldsMatch(revisedText, "", "09:30"), true);
    });

    it("shows the note that made a diary match", () => {
        const created = new Date(2026, 10, 14, 9, 30).toISOString();
        const older = new Date(2026, 1, 2, 15, 0).toISOString();
        const entry = {
            content: "<p>Quiet rain on the window.</p>",
            plainText: "Quiet rain on the window.",
            createdAt: created,
            updatedAt: created,
        };
        const garden = {
            content: "<p>Garden notes from the path.</p>",
            plainText: "Garden notes from the path.",
            createdAt: older,
            updatedAt: older,
        };
        const diary = { title: "Window notes", description: "Two mornings" };

        const blank = diaryListMatch(diary, [entry], "   ");
        assert.equal(blank.matched, true);
        assert.equal(blank.snippet, null);

        const title = diaryListMatch(diary, [entry], "window");
        assert.equal(title.matched, true);
        assert.equal(title.snippet, null);

        const note = diaryListMatch(diary, [garden, entry], "quiet");
        assert.equal(note.matched, true);
        assert.match(note.snippet ?? "", /Quiet rain on the window/);

        const dated = diaryListMatch(diary, [entry], "November");
        assert.equal(dated.matched, true);
        assert.equal(dated.snippet, formatEntryLong(created));

        const fromOlder = diaryListMatch(diary, [entry, garden], "garden");
        assert.equal(fromOlder.matched, true);
        assert.match(fromOlder.snippet ?? "", /Garden notes/);

        const miss = diaryListMatch(diary, [entry], "snow");
        assert.equal(miss.matched, false);
        assert.equal(miss.snippet, null);
    });

    it("opens the note that made a diary match", () => {
        const created = new Date(2026, 10, 14, 9, 30).toISOString();
        const older = new Date(2026, 1, 2, 15, 0).toISOString();
        const rain = {
            id: "rain",
            content: "<p>Quiet rain on the window.</p>",
            plainText: "Quiet rain on the window.",
            createdAt: created,
            updatedAt: created,
        };
        const garden = {
            id: "garden",
            content: "<p>Garden notes from the path.</p>",
            plainText: "Garden notes from the path.",
            createdAt: older,
            updatedAt: older,
        };
        const diary = { title: "Window notes", description: "Two mornings" };

        const fromOlder = diaryListMatch(diary, [rain, garden], "garden");
        assert.equal(fromOlder.matched, true);
        assert.equal(fromOlder.entryId, "garden");
        assert.equal(diaryMatchPath("diary1", fromOlder.entryId), "/diary/diary1?entry=garden");

        const newest = diaryListMatch(diary, [garden, rain], "rain");
        assert.equal(newest.entryId, "rain");

        const title = diaryListMatch(diary, [rain, garden], "window");
        assert.equal(title.entryId, null);
        assert.equal(diaryMatchPath("diary1", title.entryId), "/diary/diary1");

        const blank = diaryListMatch(diary, [garden], " ");
        assert.equal(blank.entryId, null);
    });

    it("still matches a date search after the writing is saved", () => {
        const created = new Date(2026, 10, 14, 9, 30).toISOString();
        const entry = {
            content: "<p>Quiet rain</p>",
            plainText: "Quiet rain",
            createdAt: created,
            updatedAt: created,
        };
        assert.equal(entryMatchesListQuery(entry, "November"), true);
        assert.equal(entryMatchesListQuery(entry, "09:30"), true);
        assert.equal(entryMatchesListQuery(entry, "garden"), false);
        assert.equal(entryMatchesListQuery(entry, ""), true);
    });
});

describe("export", () => {
    const diary = { title: "Morning Pages!", description: "Quiet notes", theme: "/textures/leather-texture.jpg" };
    const older = {
        content: "<h2>Dawn</h2><p>Hello <strong>there</strong> &amp; welcome</p><ul><li>one</li><li>two</li></ul><blockquote><p>quoted</p></blockquote><pre><code>const a = 1;</code></pre><p><a href=\"https://example.com\">site</a></p><img src=\"data:image/png;base64,aaaa\" alt=\"sketch\"><script>alert(1)</script>",
        createdAt: "2026-01-01T12:00:00.000Z",
        updatedAt: "2026-01-01T12:00:00.000Z",
    };
    const newer = {
        content: "<p>Later</p>",
        createdAt: "2026-02-01T12:00:00.000Z",
        updatedAt: "2026-02-01T12:00:00.000Z",
    };

    it("turns an entry into markdown and drops scripts", () => {
        const markdown = htmlToMarkdown(older.content);
        assert.match(markdown, /^## Dawn/);
        assert.match(markdown, /Hello \*\*there\*\* & welcome/);
        assert.match(markdown, /- one\n- two/);
        assert.match(markdown, /> quoted/);
        assert.match(markdown, /```\nconst a = 1;\n```/);
        assert.match(markdown, /\[site\]\(https:\/\/example.com\)/);
        assert.match(markdown, /!\[sketch\]\(image\)/);
        assert.equal(markdown.includes("script"), false);
        assert.equal(markdown.includes("alert"), false);
    });

    it("writes the diary in chronological order", () => {
        const markdown = diaryToMarkdown(diary, [newer, older]);
        assert.match(markdown, /^# Morning Pages!\n\nQuiet notes\n\n/);
        assert.ok(markdown.indexOf("Dawn") < markdown.indexOf("Later"));
        assert.equal(exportFilename(diary.title, "md"), "morning-pages.md");
        assert.equal(exportFilename("!!!", "json"), "diary.json");
    });

    it("builds a markdown or json download and rejects an unknown format", () => {
        const markdown = buildDiaryExport(diary, [older], "markdown", "2026-03-01T00:00:00.000Z");
        assert.equal(markdown.ok, true);
        if (markdown.ok) {
            assert.equal(markdown.export.contentType, "text/markdown; charset=utf-8");
            assert.equal(markdown.export.filename, "morning-pages.md");
            assert.match(markdown.export.body, /Hello \*\*there\*\*/);
        }

        const json = buildDiaryExport(diary, [older], "json", "2026-03-01T00:00:00.000Z");
        assert.equal(json.ok, true);
        if (json.ok) {
            const parsed = JSON.parse(json.export.body) as { format: string; exportedAt: string; entries: { content: string }[] };
            assert.equal(parsed.format, "personal-diary-backup");
            assert.equal(parsed.exportedAt, "2026-03-01T00:00:00.000Z");
            assert.equal(parsed.entries[0].content.includes("script"), false);
            assert.match(parsed.entries[0].content, /Hello/);
        }

        assert.deepEqual(buildDiaryExport(diary, [], "pdf", "2026-03-01T00:00:00.000Z"), {
            ok: false,
            error: "Use format=md or format=json.",
        });
        const empty = buildDiaryExport({ title: "Empty" }, [], "md", "2026-03-01T00:00:00.000Z");
        assert.equal(empty.ok, true);
        if (empty.ok) assert.match(empty.export.body, /_No entries yet\._/);
    });
});

describe("entry date", () => {
    const now = new Date(2026, 2, 14, 15, 8, 0);

    it("keeps today and puts the same clock time on a past day", () => {
        assert.equal(calendarDate(now), "2026-03-14");
        assert.equal(entryInstant("2026-03-14", now)?.getTime(), now.getTime());

        const past = entryInstant("2026-02-02", now);
        assert.equal(past?.getFullYear(), 2026);
        assert.equal(past?.getMonth(), 1);
        assert.equal(past?.getDate(), 2);
        assert.equal(past?.getHours(), 15);
        assert.equal(past?.getMinutes(), 8);

        const clock = new Date(2026, 1, 13, 9, 30, 0);
        const kept = entryInstant("2026-02-02", now, clock);
        assert.equal(kept?.getHours(), 9);
        assert.equal(kept?.getMinutes(), 30);
        assert.equal(kept?.getDate(), 2);

        const earlierToday = entryInstant("2026-03-14", now, clock);
        assert.equal(earlierToday?.getDate(), 14);
        assert.equal(earlierToday?.getHours(), 9);
        assert.equal(earlierToday?.getMinutes(), 30);

        const laterToday = entryInstant("2026-03-14", now, new Date(2026, 2, 14, 18, 0, 0));
        assert.equal(laterToday?.getTime(), now.getTime());
    });

    it("rejects a future day, a day that does not exist, and updates only a matching heading", () => {
        assert.equal(entryInstant("2026-03-15", now), null);
        assert.equal(entryInstant("2026-02-31", now), null);
        assert.equal(entryInstant("nope", now), null);

        const html = "<h2>Monday, February 2, 2026</h2><p>Rain</p>";
        assert.equal(
            retitleEntryDate(html, "Monday, February 2, 2026", "Tuesday, February 3, 2026"),
            "<h2>Tuesday, February 3, 2026</h2><p>Rain</p>",
        );
        assert.equal(retitleEntryDate("<p>Rain</p>", "Monday, February 2, 2026", "Tuesday, February 3, 2026"), "<p>Rain</p>");
    });

    it("groups entries by month, newest first", () => {
        const february = new Date(2026, 1, 2, 15).toISOString();
        const november = new Date(2026, 10, 14, 15).toISOString();
        assert.equal(monthKey(february), "2026-02");
        assert.equal(monthLabel("2026-02"), "February 2026");
        assert.equal(monthKey("nope"), null);

        const months = entryMonths([february, february, november, "nope"]);
        assert.deepEqual(months.map((month) => [month.key, month.count]), [["2026-11", 1], ["2026-02", 2]]);
        assert.equal(entryInMonth(february, "2026-02"), true);
        assert.equal(entryInMonth(february, ""), true);
        assert.equal(entryInMonth(february, "2026-11"), false);
        assert.equal(emptyEntryListMessage("rain", "2026-02"), "No entries match “rain” in February 2026.");
        assert.equal(emptyEntryListMessage("rain", ""), "No entries match “rain”.");
        assert.equal(emptyEntryListMessage("", "2026-11"), "No entries in November 2026.");
        assert.equal(monthForSavedEntry(february, ""), "");
        assert.equal(monthForSavedEntry(february, "2026-02"), "2026-02");
        assert.equal(monthForSavedEntry(february, "2026-11"), "2026-02");
        assert.equal(monthForSavedEntry("nope", "2026-11"), "2026-11");
    });

    it("opens the newest saved entry", () => {
        const older = { id: "older", createdAt: new Date(2026, 1, 2, 15).toISOString() };
        const newer = { id: "newer", createdAt: new Date(2026, 10, 14, 15).toISOString() };
        assert.equal(entryToShowOnOpen([]), null);
        assert.equal(entryToShowOnOpen([{ id: "bad", createdAt: "nope" }]), null);
        assert.equal(entryToShowOnOpen([older, newer])?.id, "newer");
        assert.equal(entryToShowOnOpen([newer, older])?.id, "newer");
        assert.equal(entryToShowOnOpen([older, { ...older, id: "same" }])?.id, "older");
    });

    it("opens a linked entry, or the newest when that link is missing", () => {
        const older = { _id: "garden", createdAt: new Date(2026, 1, 2, 15).toISOString() };
        const newer = { _id: "rain", createdAt: new Date(2026, 10, 14, 9, 30).toISOString() };
        assert.equal(entryToOpenFromLink([newer, older], "garden")?._id, "garden");
        assert.equal(entryToOpenFromLink([older, newer], "missing")?._id, "rain");
        assert.equal(entryToOpenFromLink([older, newer], null)?._id, "rain");
        assert.equal(entryToOpenFromLink([older, newer], "")?._id, "rain");
        assert.equal(entryToOpenFromLink([], "garden"), null);
    });

    it("opens the following entry after a delete, or the one before it when it was last", () => {
        const newest = { _id: "newest" };
        const middle = { _id: "middle" };
        const oldest = { _id: "oldest" };
        const entries = [newest, middle, oldest];
        assert.equal(entryToShowAfterDelete(entries, "newest")?._id, "middle");
        assert.equal(entryToShowAfterDelete(entries, "middle")?._id, "oldest");
        assert.equal(entryToShowAfterDelete(entries, "oldest")?._id, "middle");
        assert.equal(entryToShowAfterDelete([newest], "newest"), null);
        assert.equal(entryToShowAfterDelete(entries, "missing"), null);
        assert.equal(entryToShowAfterDelete([], "newest"), null);
    });

    it("moves up and down the entry list", () => {
        const newest = { _id: "newest" };
        const middle = { _id: "middle" };
        const oldest = { _id: "oldest" };
        const entries = [newest, middle, oldest];
        assert.equal(entryToShowByStep(entries, "newest", "next")?._id, "middle");
        assert.equal(entryToShowByStep(entries, "middle", "previous")?._id, "newest");
        assert.equal(entryToShowByStep(entries, "oldest", "next"), null);
        assert.equal(entryToShowByStep(entries, "newest", "previous"), null);
        assert.equal(entryToShowByStep(entries, "missing", "next")?._id, "newest");
        assert.equal(entryToShowByStep(entries, "missing", "previous")?._id, "oldest");
        assert.equal(entryToShowByStep([], "newest", "next"), null);
    });

    it("focuses entry search with slash and clears it with escape", () => {
        const plain = { altKey: false, ctrlKey: false, metaKey: false, shiftKey: false, inField: false, searchFocused: false, query: "" };
        assert.equal(entryFindKeyAction({ ...plain, key: "/" }), "focus");
        assert.equal(entryFindKeyAction({ ...plain, key: "/", inField: true }), null);
        assert.equal(entryFindKeyAction({ ...plain, key: "/", searchFocused: true, query: "rain" }), null);
        assert.equal(entryFindKeyAction({ ...plain, key: "/", ctrlKey: true }), null);
        assert.equal(entryFindKeyAction({ ...plain, key: "/", metaKey: true }), null);
        assert.equal(entryFindKeyAction({ ...plain, key: "/", altKey: true }), null);
        assert.equal(entryFindKeyAction({ ...plain, key: "/", shiftKey: true }), null);
        assert.equal(entryFindKeyAction({ ...plain, key: "Escape", searchFocused: true, query: "rain" }), "clear");
        assert.equal(entryFindKeyAction({ ...plain, key: "Escape", searchFocused: true, query: "" }), null);
        assert.equal(entryFindKeyAction({ ...plain, key: "Escape", query: "rain" }), null);
        assert.equal(entryFindKeyAction({ ...plain, key: "ArrowDown" }), null);
    });

    it("keeps the clock time when only the date changes and marks a rewrite", () => {
        const created = new Date("2026-11-14T14:41:00.000Z");
        const now = new Date("2026-11-14T15:00:00.000Z");
        const moved = nextEntryRevision({
            createdAt: created,
            updatedAt: created,
            nextCreatedAt: new Date("2026-11-13T14:41:00.000Z"),
            writingChanged: false,
            now,
        });
        assert.equal(moved.createdAt.toISOString(), "2026-11-13T14:41:00.000Z");
        assert.equal(moved.updatedAt.toISOString(), "2026-11-13T14:41:00.000Z");
        assert.equal(entryWasRevised(moved.createdAt, moved.updatedAt), false);

        const same = nextEntryRevision({
            createdAt: created,
            updatedAt: created,
            nextCreatedAt: created,
            writingChanged: false,
            now,
        });
        assert.equal(same.updatedAt.toISOString(), created.toISOString());

        const rewritten = nextEntryRevision({
            createdAt: created,
            updatedAt: created,
            writingChanged: true,
            now,
        });
        assert.equal(rewritten.updatedAt.toISOString(), now.toISOString());
        assert.equal(entryWasRevised(rewritten.createdAt, rewritten.updatedAt), true);

        const edited = new Date("2026-11-10T12:00:00.000Z");
        const kept = nextEntryRevision({
            createdAt: new Date("2026-11-01T12:00:00.000Z"),
            updatedAt: edited,
            nextCreatedAt: new Date("2026-11-12T12:00:00.000Z"),
            writingChanged: false,
            now,
        });
        assert.equal(entryWasRevised(kept.createdAt, kept.updatedAt), true);

        const previousLabel = formatEntryLong(new Date(2026, 10, 14).toISOString());
        const nextLabel = formatEntryLong(new Date(2026, 10, 13).toISOString());
        const previous = `<h2>${previousLabel}</h2><p>Newest snow.</p>`;
        const retitled = `<h2>${nextLabel}</h2><p>Newest snow.</p>`;
        const rewrittenHtml = `<h2>${previousLabel}</h2><p>Newest snow. Again.</p>`;
        assert.equal(entryWritingChanged(previous, retitled), false);
        assert.equal(entryWritingChanged(previous, rewrittenHtml), true);
        assert.equal(entryWasRevised("nope", created), false);
    });

    it("keeps the open entry open and returns a revision to that entry", () => {
        assert.equal(entrySelectionAction("newest", "view", "newest"), "stay");
        assert.equal(entrySelectionAction("newest", "edit", "newest"), "revert");
        assert.equal(entrySelectionAction("newest", "view", "older"), "open");
        assert.equal(entrySelectionAction("newest", "edit", "older"), "open");
        assert.equal(entrySelectionAction(null, "compose", "newest"), "open");
        assert.equal(entrySelectionAction("newest", "compose", "newest"), "open");
    });
});

describe("entry links", () => {
    it("accepts an http, https, or mailto link and rejects the rest", () => {
        assert.deepEqual(entryLinkUrl("  https://example.com/rain  "), { ok: true, href: "https://example.com/rain" });
        assert.deepEqual(entryLinkUrl("mailto:rain@example.com"), { ok: true, href: "mailto:rain@example.com" });
        assert.deepEqual(entryLinkUrl("example.com"), { ok: false, error: "Enter a full http, https, or mailto URL." });
        assert.deepEqual(entryLinkUrl("javascript:alert(1)"), { ok: false, error: "Use an http, https, or mailto link." });
        assert.equal(entryLinkUrl("").ok, false);
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
