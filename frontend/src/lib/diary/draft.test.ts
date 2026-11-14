import assert from "node:assert/strict";
import { describe, it } from "node:test";

import { entryDraftKey, entryDraftRecord, offerEntryDraft, readEntryDraft, restoredDraftTarget } from "./draft";

describe("unsaved writing", () => {
    it("keeps unsaved writing for this diary and offers it until the saved entry matches", () => {
        const saved = "<h2>Monday, February 2, 2026</h2><p>February garden</p>";
        const draft = "<h2>Monday, February 2, 2026</h2><p>February garden, still writing</p>";
        const stored = entryDraftRecord({
            diaryId: "diary1",
            entryId: "garden",
            content: draft,
            baseline: saved,
            entryDate: "2026-02-02",
            savedDate: "2026-02-02",
        });

        assert.equal(entryDraftKey("diary1"), "personal-diary-draft:diary1");
        assert.equal(stored === null, false);
        const read = readEntryDraft(stored);
        assert.equal(read?.entryId, "garden");
        assert.equal(read?.content, draft);
        assert.equal(read?.baseline, saved);
        assert.equal(read?.entryDate, "2026-02-02");
        assert.equal(offerEntryDraft(read, [{ _id: "garden", content: saved }]), true);
        assert.equal(offerEntryDraft(read, [{ _id: "garden", content: draft }]), false);
        const created = new Date(2026, 1, 2, 15).toISOString();
        assert.equal(offerEntryDraft(
            { entryId: "garden", content: saved, entryDate: "2026-02-03" },
            [{ _id: "garden", content: saved, createdAt: created }],
        ), true);
        assert.equal(offerEntryDraft(read, []), true);
        assert.equal(restoredDraftTarget(read, [{ _id: "garden" }]), "edit");
        assert.equal(restoredDraftTarget(read, []), "compose");

        assert.equal(entryDraftRecord({
            diaryId: "diary1",
            entryId: "garden",
            content: saved,
            baseline: saved,
            entryDate: "2026-02-02",
            savedDate: "2026-02-02",
        }), null);
        assert.equal(entryDraftRecord({
            diaryId: "diary1",
            entryId: null,
            content: "<h2>Saturday, November 14, 2026</h2><p><br></p>",
            baseline: "<h2>Saturday, November 14, 2026</h2><p><br></p>",
            entryDate: "2026-11-14",
            savedDate: "2026-11-14",
        }), null);
        assert.equal(readEntryDraft("not json"), null);
        assert.equal(readEntryDraft(null), null);
        assert.equal(offerEntryDraft(null, []), false);
    });
});
