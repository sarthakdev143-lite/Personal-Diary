import assert from "node:assert/strict";
import { describe, it } from "node:test";

import { diaryListView } from "./view";

describe("diary list while a search loads", () => {
    const rain = { key: "auth:rain:0:0", diaries: [{ _id: "window" }], error: null };

    it("shows the previous diaries until the next search arrives", () => {
        assert.deepEqual(diaryListView({ status: "loading", result: null, requestKey: "auth::0:0" }), {
            diaries: [],
            error: null,
            loading: true,
        });
        assert.equal(diaryListView({ status: "authenticated", result: null, requestKey: "auth:rain:0:0" }).loading, true);
        assert.deepEqual(diaryListView({ status: "authenticated", result: rain, requestKey: rain.key }).diaries, rain.diaries);

        const next = diaryListView({ status: "authenticated", result: rain, requestKey: "auth:harbor:0:0" });
        assert.equal(next.loading, false);
        assert.deepEqual(next.diaries, rain.diaries);
        assert.equal(next.error, null);

        const failed = diaryListView({
            status: "authenticated",
            result: { key: "auth:rain:0:0", diaries: [], error: "Could not load diaries." },
            requestKey: "auth:harbor:0:0",
        });
        assert.equal(failed.loading, true);
        assert.deepEqual(failed.diaries, []);

        const currentError = diaryListView({
            status: "authenticated",
            result: { key: "auth:rain:0:0", diaries: [], error: "Could not load diaries." },
            requestKey: "auth:rain:0:0",
        });
        assert.equal(currentError.loading, false);
        assert.equal(currentError.error, "Could not load diaries.");
    });
});
