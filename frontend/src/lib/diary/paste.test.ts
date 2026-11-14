import assert from "node:assert/strict";
import { describe, it } from "node:test";

import { MAX_DATA_IMAGE_LENGTH, MAX_IMAGE_BYTES } from "./constants";
import { decideEntryDrop, decideEntryPaste, imageAltText, imageFileIssue, imageHtml, lineAfterPictureKey, pictureCaptionKey, selectedPictureKey } from "./paste";

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
        }), { action: "image", indexes: [0] });

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

    it("keeps a dropped picture and refuses a file that is not one", () => {
        assert.deepEqual(decideEntryDrop([
            { type: "text/plain", size: 12 },
            { type: "image/webp", size: 80 },
        ]), { action: "image", indexes: [1] });
        assert.deepEqual(decideEntryDrop([
            { type: "image/png", size: 10 },
            { type: "image/jpeg", size: 20 },
        ]), { action: "image", indexes: [0, 1] });
        assert.deepEqual(decideEntryDrop([
            { type: "image/gif", size: MAX_IMAGE_BYTES + 1 },
            { type: "image/png", size: 40 },
        ]), {
            action: "image",
            indexes: [1],
            warning: {
                title: "Image is too large",
                description: "Choose an image under 150 KB.",
            },
        });
        assert.deepEqual(decideEntryDrop([]), { action: "default" });
        assert.deepEqual(decideEntryDrop([{ type: "application/pdf", size: 20 }]), {
            action: "reject",
            title: "Not an image",
            description: "Choose a PNG, JPEG, GIF, or WebP image.",
        });
        assert.deepEqual(decideEntryDrop([{ type: "image/gif", size: MAX_IMAGE_BYTES + 1 }]), {
            action: "reject",
            title: "Image is too large",
            description: "Choose an image under 150 KB.",
        });
    });

    it("names a pasted picture and keeps the name out of the markup", () => {
        assert.equal(imageAltText("  sketch   of rain  "), "sketch of rain");
        assert.equal(imageAltText("a".repeat(200)).length, 180);
        assert.equal(
            imageHtml("data:image/png;base64,aaaa", 'sketch "one"'),
            '<figure><img src="data:image/png;base64,aaaa" alt="sketch &quot;one&quot;" /><figcaption>sketch &quot;one&quot;</figcaption></figure>',
        );
        assert.equal(
            imageHtml("data:image/png;base64,aaaa", "   "),
            '<img src="data:image/png;base64,aaaa" /><p><br></p>',
        );
    });

    it("keeps the picture name on one line and lets enter continue the page", () => {
        const atEnd = { collapsed: true, atStart: false, atEnd: true };
        assert.equal(pictureCaptionKey({ key: "Enter", ...atEnd }), "break");
        assert.equal(pictureCaptionKey({ key: "Enter", shiftKey: true, ...atEnd }), "break");
        assert.equal(pictureCaptionKey({ key: "Enter", ctrlKey: true, ...atEnd }), "pass");
        assert.equal(pictureCaptionKey({ key: "Backspace", collapsed: true, atStart: true, atEnd: false }), "hold");
        assert.equal(pictureCaptionKey({ key: "Backspace", collapsed: true, atStart: false, atEnd: true }), "pass");
        assert.equal(pictureCaptionKey({ key: "Delete", collapsed: true, atStart: false, atEnd: true }), "hold");
        assert.equal(pictureCaptionKey({ key: "Delete", collapsed: false, atStart: false, atEnd: true }), "pass");
        assert.equal(pictureCaptionKey({ key: "a", collapsed: true, atStart: true, atEnd: false }), "pass");
    });

    it("keeps the next line from joining the picture name", () => {
        const atStart = { collapsed: true, atStart: true, empty: false };
        assert.equal(lineAfterPictureKey({ key: "Backspace", ...atStart }), "move");
        assert.equal(lineAfterPictureKey({ key: "Backspace", collapsed: true, atStart: true, empty: true }), "remove");
        assert.equal(lineAfterPictureKey({ key: "Backspace", collapsed: true, atStart: false, empty: false }), "pass");
        assert.equal(lineAfterPictureKey({ key: "Backspace", ctrlKey: true, ...atStart }), "pass");
        assert.equal(lineAfterPictureKey({ key: "Delete", ...atStart }), "pass");
        assert.equal(lineAfterPictureKey({ key: "Enter", ...atStart }), "pass");
    });

    it("removes a selected picture together with its name", () => {
        assert.equal(selectedPictureKey({ key: "Delete", imageSelected: true }), "remove");
        assert.equal(selectedPictureKey({ key: "Backspace", imageSelected: true }), "remove");
        assert.equal(selectedPictureKey({ key: "Delete", imageSelected: false }), "pass");
        assert.equal(selectedPictureKey({ key: "Delete", ctrlKey: true, imageSelected: true }), "pass");
        assert.equal(selectedPictureKey({ key: "Enter", imageSelected: true }), "pass");
    });
});
