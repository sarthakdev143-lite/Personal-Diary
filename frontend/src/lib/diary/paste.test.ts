import assert from "node:assert/strict";
import { describe, it } from "node:test";

import { MAX_DATA_IMAGE_LENGTH, MAX_IMAGE_BYTES } from "./constants";
import { decideEntryPaste, imageFileIssue } from "./paste";

describe("entry paste", () => {
    it("names a file that is not a supported image", () => {
        assert.deepEqual(imageFileIssue({ type: "image/svg+xml", size: 20 }), {
            title: "Not an image",
            description: "Choose a PNG, JPEG, GIF, or WebP image.",
        });
        assert.equal(imageFileIssue({ type: "image/png", size: 20 }), null);
    });

    it("names an image that is over the size limit", () => {
        assert.deepEqual(imageFileIssue({ type: "image/jpeg", size: MAX_IMAGE_BYTES + 1 }), {
            title: "Image is too large",
            description: "Choose an image under 150 KB.",
        });
    });

    it("keeps a small image file and rejects one that is too large", () => {
        assert.deepEqual(decideEntryPaste({
            files: [{ type: "image/png", size: 40 }],
            html: "",
            text: "",
        }), { action: "image" });

        assert.deepEqual(decideEntryPaste({
            files: [{ type: "image/png", size: MAX_IMAGE_BYTES + 1 }],
            html: "<p>ignore</p>",
            text: "ignore",
        }), {
            action: "reject",
            title: "Image is too large",
            description: "Choose an image under 150 KB.",
        });
    });

    it("keeps pasted formatting and drops a script", () => {
        const decision = decideEntryPaste({
            files: [],
            html: "<p>Hello <strong>there</strong></p><script>alert(1)</script>",
            text: "Hello there",
        });
        assert.equal(decision.action, "html");
        if (decision.action !== "html") return;
        assert.match(decision.html, /<strong>there<\/strong>/);
        assert.doesNotMatch(decision.html, /script|alert/i);
    });

    it("pastes the visible words when the markup is unsafe", () => {
        const decision = decideEntryPaste({
            files: [],
            html: "<script>alert(1)</script>",
            text: "Morning light",
        });
        assert.deepEqual(decision, { action: "plain", text: "Morning light" });
    });

    it("drops a paste that is only an unsafe image", () => {
        const huge = `data:image/png;base64,${"a".repeat(MAX_DATA_IMAGE_LENGTH)}`;
        const decision = decideEntryPaste({
            files: [],
            html: `<img src="${huge}" alt="sketch">`,
            text: "",
        });
        assert.equal(decision.action, "reject");
        if (decision.action !== "reject") return;
        assert.equal(decision.title, "Image left out");
    });

    it("leaves a plain text paste to the editor", () => {
        assert.deepEqual(decideEntryPaste({
            files: [],
            html: "",
            text: "Morning light",
        }), { action: "default" });
    });
});
