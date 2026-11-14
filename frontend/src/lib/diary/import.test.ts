import assert from "node:assert/strict";
import { describe, it } from "node:test";

import { CONTENT_MAX, DEFAULT_DIARY_THEME, MAX_IMPORT_ENTRIES } from "./constants";
import { diaryToBackup } from "./export";
import { importNotice, importedDiaryPath, parseDiaryBackup } from "./import";

const now = Date.parse("2026-03-02T00:00:00.000Z");

describe("import backup", () => {
    const diary = { title: "Morning Pages", description: "Quiet notes", theme: "/textures/leather-texture.jpg" };
    const entry = {
        content: "<p>Hello <strong>there</strong></p><script>alert(1)</script>",
        createdAt: "2026-01-01T12:00:00.000Z",
        updatedAt: "2026-01-02T12:00:00.000Z",
    };

    it("opens a saved import and says what was kept", () => {
        assert.equal(importedDiaryPath("507f1f77bcf86cd799439011"), "/diary/507f1f77bcf86cd799439011");
        assert.equal(importedDiaryPath("not-an-id"), null);
        assert.equal(importedDiaryPath(undefined), null);

        const opened = importNotice({
            title: "Morning Pages",
            importedEntries: 1,
            skippedEntries: 2,
            opened: true,
        });
        assert.equal(opened.title, "Diary imported");
        assert.equal(opened.description, "Morning Pages is open. 1 entry saved. 2 empty entries were left out.");

        const listed = importNotice({ title: "   ", importedEntries: 0, skippedEntries: 1, opened: false });
        assert.equal(listed.description, "Diary is in your list. 1 empty entry was left out.");
    });

    it("reads a backup this app wrote and drops a script", () => {
        const backup = diaryToBackup(diary, [entry], "2026-03-01T00:00:00.000Z");
        const parsed = parseDiaryBackup(backup, now);
        assert.equal(parsed.ok, true);
        if (!parsed.ok) return;
        assert.equal(parsed.diary.title, "Morning Pages");
        assert.equal(parsed.diary.description, "Quiet notes");
        assert.equal(parsed.diary.theme, "/textures/leather-texture.jpg");
        assert.equal(parsed.diary.skipped, 0);
        assert.equal(parsed.diary.entries.length, 1);
        assert.match(parsed.diary.entries[0].content, /Hello/);
        assert.equal(parsed.diary.entries[0].content.includes("script"), false);
        assert.equal(parsed.diary.entries[0].plainText, "Hello there");
        assert.equal(parsed.diary.entries[0].createdAt.toISOString(), "2026-01-01T12:00:00.000Z");
        assert.equal(parsed.diary.entries[0].updatedAt.toISOString(), "2026-01-02T12:00:00.000Z");
        assert.equal(parsed.diary.pinned, false);
    });

    it("keeps a pin from the backup and ignores a pin that is not true or false", () => {
        const pinned = diaryToBackup({ ...diary, pinned: true }, [entry], "2026-03-01T00:00:00.000Z");
        const restored = parseDiaryBackup(pinned, now);
        assert.equal(restored.ok, true);
        if (restored.ok) assert.equal(restored.diary.pinned, true);

        const loose = diaryToBackup(diary, [], "2026-03-01T00:00:00.000Z");
        (loose.diary as { pinned: unknown }).pinned = "yes";
        const ignored = parseDiaryBackup(loose, now);
        assert.equal(ignored.ok, true);
        if (ignored.ok) assert.equal(ignored.diary.pinned, false);
    });

    it("uses the default cover when a backup names an unknown one", () => {
        const backup = diaryToBackup(diary, [], "2026-03-01T00:00:00.000Z");
        backup.diary.theme = "/textures/missing.jpg";
        const parsed = parseDiaryBackup(backup, now);
        assert.equal(parsed.ok, true);
        if (parsed.ok) assert.equal(parsed.diary.theme, DEFAULT_DIARY_THEME);
    });

    it("skips an entry that has no writing and rejects a file that is not a backup", () => {
        const backup = diaryToBackup(diary, [entry], "2026-03-01T00:00:00.000Z");
        backup.entries.push({
            createdAt: "2026-01-03T12:00:00.000Z",
            updatedAt: "2026-01-03T12:00:00.000Z",
            content: "<script>alert(1)</script>",
            markdown: "",
        });
        const parsed = parseDiaryBackup(backup, now);
        assert.equal(parsed.ok, true);
        if (parsed.ok) {
            assert.equal(parsed.diary.entries.length, 1);
            assert.equal(parsed.diary.skipped, 1);
        }

        assert.deepEqual(parseDiaryBackup({ hello: "no" }, now), {
            ok: false,
            error: "Choose a JSON backup from this diary.",
        });
        assert.deepEqual(parseDiaryBackup({ ...backup, version: 2 }, now), {
            ok: false,
            error: "This backup version is not supported.",
        });
    });

    it("rejects an impossible date, an oversized entry, and too many entries", () => {
        const backup = diaryToBackup(diary, [entry], "2026-03-01T00:00:00.000Z");
        backup.entries[0].createdAt = "yesterday";
        assert.equal(parseDiaryBackup(backup, now).ok, false);

        const huge = diaryToBackup(diary, [{
            content: `<p>${"a".repeat(CONTENT_MAX + 1)}</p>`,
            createdAt: entry.createdAt,
            updatedAt: entry.updatedAt,
        }], "2026-03-01T00:00:00.000Z");
        const oversized = parseDiaryBackup(huge, now);
        assert.equal(oversized.ok, false);
        if (!oversized.ok) assert.match(oversized.error, /Entry 1/);

        const many = diaryToBackup(diary, [], "2026-03-01T00:00:00.000Z");
        many.entries = Array.from({ length: MAX_IMPORT_ENTRIES + 1 }, () => backup.entries[0]);
        const tooMany = parseDiaryBackup(many, now);
        assert.equal(tooMany.ok, false);
        if (!tooMany.ok) assert.match(tooMany.error, /500/);
    });
});
