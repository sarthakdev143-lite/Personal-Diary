import assert from "node:assert/strict";
import { describe, it } from "node:test";

import { MAX_DATA_IMAGE_LENGTH, MAX_IMAGE_BYTES } from "./constants";
import { codePasteHtml, decideEntryDrop, decideEntryPaste, captionBreakText, captionUndoCaret, imageAltText, imageFileIssue, imageHtml, lineAfterPictureKey, pictureAheadDelete, pictureRemovalJoin, pictureRemovalSpace, pictureRemovalHost, pictureInlineEnter, pictureInlineBackspace, pictureBoundsKey, pictureNameLine, pictureTypedPlace, pictureCutWords, picturePasteWords, pictureNameEnter, pictureNameSelection, pictureNameWord, pictureWordEdge, pictureNamePaste, pictureNameAlt, pictureCopy, picturePaste, pictureNameBoundary, pictureCaptionKey, pictureClick, pictureFormat, pictureInsert, pictureListSpace, datePicture, pictureMoveKey, pictureBesideTarget, pictureSelectionMark, pictureUndo, selectedPictureKey } from "./paste";

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

    it("keeps pasted code lines inside the code block", () => {
        assert.equal(codePasteHtml("const a = 1;\r\nconst b = 2;\n"), "const a = 1;&#10;const b = 2;");
        assert.equal(codePasteHtml("a < b & c"), "a &lt; b &amp; c");
    });

    it("keeps each row when a table is pasted", () => {
        const decision = decideEntryPaste({
            files: [],
            html: "<table><tr><td>Rain</td><td>Harbor</td></tr><tr><td>Bread</td><td><b>Market</b></td></tr></table>",
            text: "Rain\tHarbor\nBread\tMarket",
        });
        assert.equal(decision.action, "html");
        if (decision.action !== "html") return;
        assert.equal(decision.html, "<p>Rain Harbor</p><p>Bread <b>Market</b></p>");
    });

    it("keeps each line when the pasted notes are wrapped in divs", () => {
        const decision = decideEntryPaste({
            files: [],
            html: "<div>Monday</div><div>Walked to the harbor</div>",
            text: "Monday\nWalked to the harbor",
        });
        assert.equal(decision.action, "html");
        if (decision.action !== "html") return;
        assert.equal(decision.html, "<p>Monday</p><p>Walked to the harbor</p>");
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

    it("keeps a picture under the date and leaves that date whole", () => {
        assert.equal(datePicture({ onDate: "only" }), "after");
        assert.equal(datePicture({ onDate: "with-writing" }), "replace");
        assert.equal(datePicture({ onDate: "none" }), "pass");
    });

    it("keeps a picture on its own line in a list and puts the next picture after it", () => {
        assert.equal(pictureInsert({ inPicture: false, inItem: true }), "line");
        assert.equal(pictureInsert({ inPicture: true, inItem: true }), "after");
        assert.equal(pictureInsert({ inPicture: true, inItem: false }), "after");
        assert.equal(pictureInsert({ inPicture: false, inItem: false }), "pass");
    });

    it("keeps a picture on its own line in the middle of a line", () => {
        assert.equal(pictureInsert({ inPicture: false, inItem: false, inLine: true }), "split");
        assert.equal(pictureInsert({ inPicture: false, inItem: true, inLine: true }), "line");
        assert.equal(pictureInsert({ inPicture: true, inItem: false, inLine: true }), "after");
        assert.equal(pictureInsert({ inPicture: false, inItem: false, inLine: false }), "pass");
    });

    it("keeps a picture on its own line in the middle of a code block", () => {
        assert.equal(pictureInsert({ inPicture: false, inItem: false, inCode: true }), "code");
        assert.equal(pictureInsert({ inPicture: false, inItem: true, inCode: true }), "line");
        assert.equal(pictureInsert({ inPicture: true, inItem: false, inCode: true }), "after");
        assert.equal(pictureInsert({ inPicture: false, inItem: false, inCode: false }), "pass");
    });

    it("keeps a picture when the selection runs from one line into the next", () => {
        assert.equal(pictureInsert({ inPicture: false, inItem: false, across: true }), "span");
        assert.equal(pictureInsert({ inPicture: false, inItem: true, across: true }), "span");
        assert.equal(pictureInsert({ inPicture: true, inItem: false, across: true }), "after");
        assert.equal(pictureInsert({ inPicture: false, inItem: false, inLine: true, across: true }), "split");
        assert.equal(pictureInsert({ inPicture: false, inItem: false, across: false }), "pass");
    });

    it("keeps a picture on its own line when the selection runs from one list line into the next", () => {
        assert.equal(pictureInsert({ inPicture: false, inItem: true, acrossItems: true }), "items");
        assert.equal(pictureInsert({ inPicture: false, inItem: true }), "line");
        assert.equal(pictureInsert({ inPicture: true, inItem: true, acrossItems: true }), "after");
        assert.equal(pictureInsert({ inPicture: false, inItem: false, acrossItems: false }), "pass");
    });

    it("keeps a picture on its own line when the selection runs from a nested list line into another list", () => {
        assert.equal(pictureInsert({ inPicture: false, inItem: true, acrossLists: true }), "items");
        assert.equal(pictureInsert({ inPicture: false, inItem: true }), "line");
        assert.equal(pictureInsert({ inPicture: true, inItem: true, acrossLists: true }), "after");
    });

    it("keeps a picture on its own line when the selection runs from one list into a later list", () => {
        assert.equal(pictureInsert({ inPicture: false, inItem: true, across: true, separateLists: true }), "span");
        assert.equal(pictureInsert({ inPicture: false, inItem: true, across: true }), "span");
        assert.equal(pictureInsert({ inPicture: true, inItem: true, separateLists: true }), "after");
    });

    it("keeps a picture on its own line when the selection runs from a list line into the following paragraph", () => {
        assert.equal(pictureInsert({ inPicture: false, inItem: true, across: true }), "span");
        assert.equal(pictureInsert({ inPicture: false, inItem: true }), "line");
        assert.equal(pictureInsert({ inPicture: true, inItem: true, across: true }), "after");
    });

    it("keeps one space off the words beside a picture in a list line", () => {
        assert.equal(pictureListSpace(" rain", "start"), "rain");
        assert.equal(pictureListSpace("Harbor ", "end"), "Harbor");
        assert.equal(pictureListSpace("rain", "start"), "rain");
        assert.equal(pictureListSpace("Harbor", "end"), "Harbor");
    });

    it("keeps a picture on its own line when the selection runs from a list line into its nested line", () => {
        assert.equal(pictureInsert({ inPicture: false, inItem: true, intoNested: true }), "nested");
        assert.equal(pictureInsert({ inPicture: false, inItem: true }), "line");
        assert.equal(pictureInsert({ inPicture: true, inItem: true, intoNested: true }), "after");
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
        assert.deepEqual(captionBreakText("Harbor", " rain"), { name: "Harbor", next: "rain" });
        assert.deepEqual(captionBreakText("Harbor ", "rain"), { name: "Harbor", next: "rain" });
        assert.deepEqual(captionBreakText("Harbor", "rain"), { name: "Harbor", next: "rain" });
        assert.deepEqual(captionBreakText("Harbor", ""), { name: "Harbor", next: "" });
        assert.equal(captionUndoCaret(11), 11);
        assert.equal(captionUndoCaret(6), 6);
        assert.equal(captionUndoCaret(0), 0);
        assert.equal(captionUndoCaret(null), null);
        assert.equal(captionUndoCaret(-1), null);
        assert.equal(pictureNameLine("LI"), "item");
        assert.equal(pictureNameLine("H1"), "paragraph");
        assert.equal(pictureNameLine("P"), "paragraph");
        assert.equal(pictureNameLine("BLOCKQUOTE"), "break");
        assert.equal(pictureNameLine("TD"), "break");
        assert.equal(pictureNameLine("DIV"), "page");
    });

    it("edits a selected picture name and leaves the picture in the line", () => {
        const selected = { collapsed: false, inName: true };
        assert.equal(pictureNameSelection({ key: "Delete", ...selected }), "edit");
        assert.equal(pictureNameSelection({ key: "Backspace", ...selected }), "edit");
        assert.equal(pictureNameSelection({ key: "Delete", collapsed: true, inName: true }), "pass");
        assert.equal(pictureNameSelection({ key: "Delete", ctrlKey: true, ...selected }), "pass");
        assert.equal(pictureNameSelection({ key: "Delete", collapsed: false, inName: false }), "pass");
        assert.equal(pictureNameSelection({ key: "x", ...selected }), "pass");
        assert.equal(pictureNameSelection({ key: "x", ctrlKey: true, ...selected }), "edit");
        assert.equal(pictureNameSelection({ key: "X", metaKey: true, ...selected }), "edit");
    });

    it("removes the selected letters of a picture name before the line continues", () => {
        const named = { inName: true };
        assert.equal(pictureNameEnter({ key: "Enter", collapsed: true, ...named }), "continue");
        assert.equal(pictureNameEnter({ key: "Enter", shiftKey: true, collapsed: false, ...named }), "replace");
        assert.equal(pictureNameEnter({ key: "Enter", collapsed: false, ...named }), "replace");
        assert.equal(pictureNameEnter({ key: "Enter", ctrlKey: true, collapsed: false, ...named }), "pass");
        assert.equal(pictureNameEnter({ key: "Enter", collapsed: false, inName: false }), "pass");
        assert.equal(pictureNameEnter({ key: "Delete", collapsed: false, ...named }), "pass");
    });

    it("deletes a word in a picture name without the words beside the picture", () => {
        assert.equal(pictureNameWord({ inName: true }), "name");
        assert.equal(pictureNameWord({ inName: true, leavesName: true }), "hold");
        assert.equal(pictureNameWord({ inName: false, leavesName: true }), "line");
        assert.equal(pictureNameWord({ inName: false }), "line");
    });

    it("continues a pasted line after a picture name", () => {
        assert.equal(pictureNamePaste({ inName: true, text: "one\ntwo" }), "lines");
        assert.equal(pictureNamePaste({ inName: true, text: "one\r\ntwo" }), "lines");
        assert.equal(pictureNamePaste({ inName: true, text: "rain" }), "pass");
        assert.equal(pictureNamePaste({ inName: false, text: "one\ntwo" }), "pass");
    });

    it("keeps a picture name with the words as they change", () => {
        assert.equal(pictureNameAlt({ inName: true, caption: "Bays", alt: "Bay" }), "sync");
        assert.equal(pictureNameAlt({ inName: true, caption: "Bay", alt: "Bay" }), "keep");
        assert.equal(pictureNameAlt({ inName: true, caption: "   ", alt: "Bay" }), "sync");
        assert.equal(pictureNameAlt({ inName: false, caption: "Bays", alt: "Bay" }), "keep");
    });

    it("copies a selected picture with its name", () => {
        assert.equal(pictureCopy({ imageSelected: true, inFigure: true }), "picture");
        assert.equal(pictureCopy({ imageSelected: true, inFigure: false }), "pass");
        assert.equal(pictureCopy({ imageSelected: false, inFigure: true }), "pass");
    });

    it("pastes a copied picture with its name", () => {
        assert.equal(picturePaste('<figure><img alt="Bay" src="data:image/gif;base64,aaaa"><figcaption>Bay</figcaption></figure>'), "picture");
        assert.equal(picturePaste('<figure><img src="data:image/gif;base64,aaaa" alt="Bay" /><figcaption><b>Bay</b></figcaption></figure>'), "picture");
        assert.equal(picturePaste('<figure><img alt="Bay" src="data:image/gif;base64,aaaa"></figure>'), "pass");
        assert.equal(picturePaste("<p>Later</p>"), "pass");
        assert.equal(picturePaste('<figure><img alt="Bay" src="data:image/gif;base64,aaaa"><figcaption>Bay</figcaption></figure><p>Later</p>'), "pass");
    });

    it("types over a picture name when the selection stops at the next line", () => {
        const boundary = { startsInName: true, endsInName: false, boundaryOnly: true };
        assert.equal(pictureNameBoundary({ ...boundary, key: "Q" }), "name");
        assert.equal(pictureNameBoundary({ ...boundary, key: "Backspace" }), "name");
        assert.equal(pictureNameBoundary({ ...boundary, key: "Enter" }), "name");
        assert.equal(pictureNameBoundary({ ...boundary, key: "Q", ctrlKey: true }), "pass");
        assert.equal(pictureNameBoundary({ ...boundary, key: "ArrowRight" }), "pass");
        assert.equal(pictureNameBoundary({ startsInName: true, endsInName: false, boundaryOnly: false, key: "Q" }), "pass");
        assert.equal(pictureNameBoundary({ startsInName: false, endsInName: false, boundaryOnly: true, key: "Q" }), "pass");
    });

    it("keeps a picture when the selection also holds the writing around it", () => {
        const crossed = { collapsed: false, touchesPicture: true, outsideSelected: true };
        assert.equal(pictureBoundsKey({ key: "Backspace", ...crossed }), "clear");
        assert.equal(pictureBoundsKey({ key: "Delete", ...crossed }), "clear");
        assert.equal(pictureBoundsKey({ key: "x", ...crossed }), "type");
        assert.equal(pictureBoundsKey({ key: "Enter", ...crossed }), "type");
        assert.equal(pictureBoundsKey({ key: "Backspace", ...crossed, collapsed: true }), "pass");
        assert.equal(pictureBoundsKey({ key: "Backspace", ...crossed, outsideSelected: false }), "pass");
        assert.equal(pictureBoundsKey({ key: "Backspace", ...crossed, touchesPicture: false }), "pass");
        assert.equal(pictureBoundsKey({ key: "Backspace", ...crossed, ctrlKey: true }), "pass");
        assert.equal(pictureBoundsKey({ key: "ArrowLeft", ...crossed }), "pass");
    });

    it("pastes over the words around a picture and leaves the picture", () => {
        const crossed = { collapsed: false, touchesPicture: true, outsideSelected: true };
        assert.equal(picturePasteWords(crossed), "keep");
        assert.equal(picturePasteWords({ ...crossed, collapsed: true }), "pass");
        assert.equal(picturePasteWords({ ...crossed, outsideSelected: false }), "pass");
        assert.equal(picturePasteWords({ ...crossed, touchesPicture: false }), "pass");
    });

    it("leaves a picture when a word delete reaches it", () => {
        const edge = { word: true, touchesPicture: true, outsideSelected: true };
        assert.equal(pictureWordEdge(edge), "hold");
        assert.equal(pictureWordEdge({ ...edge, word: false }), "pass");
        assert.equal(pictureWordEdge({ ...edge, touchesPicture: false }), "pass");
        assert.equal(pictureWordEdge({ ...edge, outsideSelected: false }), "pass");
    });

    it("cuts the words around a picture and leaves the picture", () => {
        const crossed = { collapsed: false, touchesPicture: true, outsideSelected: true };
        assert.equal(pictureCutWords(crossed), "keep");
        assert.equal(pictureCutWords({ ...crossed, collapsed: true }), "pass");
        assert.equal(pictureCutWords({ ...crossed, outsideSelected: false }), "pass");
        assert.equal(pictureCutWords({ ...crossed, touchesPicture: false }), "pass");
    });

    it("types the next word beside a picture in a list or a quote", () => {
        assert.equal(pictureTypedPlace({ next: "text", line: "item" }), "text");
        assert.equal(pictureTypedPlace({ next: "text", line: "break" }), "text");
        assert.equal(pictureTypedPlace({ next: "element", line: "page" }), "block");
        assert.equal(pictureTypedPlace({ next: "none", line: "item" }), "beside");
        assert.equal(pictureTypedPlace({ next: "none", line: "break" }), "beside");
        assert.equal(pictureTypedPlace({ next: "none", line: "page" }), "line");
        assert.equal(pictureTypedPlace({ next: "none", line: "paragraph" }), "line");
    });

    it("leaves the picture together when a heading or a list is chosen", () => {
        assert.equal(pictureFormat({ inPicture: true, command: "formatBlock" }), "keep");
        assert.equal(pictureFormat({ inPicture: true, command: "formatBlock", outsideSelected: true }), "pass");
        assert.equal(pictureFormat({ inPicture: true, command: "insertUnorderedList", outsideSelected: true }), "lines");
        assert.equal(pictureFormat({ inPicture: true, command: "insertOrderedList", outsideSelected: true }), "lines");
        assert.equal(pictureFormat({ inPicture: true, kind: "code", outsideSelected: true }), "block");
        assert.equal(pictureFormat({ inPicture: true, kind: "divider", outsideSelected: true }), "block");
        assert.equal(pictureFormat({ inPicture: true, command: "insertUnorderedList" }), "keep");
        assert.equal(pictureFormat({ inPicture: true, command: "insertOrderedList" }), "keep");
        assert.equal(pictureFormat({ inPicture: true, kind: "code" }), "keep");
        assert.equal(pictureFormat({ inPicture: true, kind: "image" }), "keep");
        assert.equal(pictureFormat({ inPicture: true }), "keep");
        assert.equal(pictureFormat({ inPicture: true, command: "bold" }), "pass");
        assert.equal(pictureFormat({ inPicture: true, command: "italic" }), "pass");
        assert.equal(pictureFormat({ inPicture: true, command: "underline" }), "pass");
        assert.equal(pictureFormat({ inPicture: true, command: "strikeThrough" }), "pass");
        assert.equal(pictureFormat({ inPicture: true, command: "undo" }), "pass");
        assert.equal(pictureFormat({ inPicture: true, command: "redo" }), "pass");
        assert.equal(pictureFormat({ inPicture: true, kind: "link" }), "pass");
        assert.equal(pictureFormat({ inPicture: false, command: "formatBlock" }), "pass");
        assert.equal(pictureFormat({ inPicture: false, kind: "code" }), "pass");
    });

    it("replaces a picture when the selection runs from that picture into the next line", () => {
        assert.equal(pictureFormat({ inPicture: true, kind: "image", leavesPicture: true }), "pass");
        assert.equal(pictureFormat({ inPicture: true, kind: "image" }), "keep");
        assert.equal(pictureInsert({ inPicture: true, inItem: false, leavesPicture: true }), "span");
        assert.equal(pictureInsert({ inPicture: true, inItem: false }), "after");
    });

    it("removes the picture in front of the cursor and keeps its name with it", () => {
        const picture = { collapsed: true, ahead: "picture" as const };
        assert.equal(pictureRemovalJoin({ before: "Harbor", after: "Later" }), "space");
        assert.equal(pictureRemovalJoin({ before: "Harbor ", after: " Later" }), "space");
        assert.equal(pictureRemovalJoin({ before: "Harbor", after: "" }), "tight");
        assert.equal(pictureRemovalJoin({ before: "", after: "Later" }), "tight");
        assert.equal(pictureRemovalJoin({ before: "   ", after: "Later" }), "tight");
        assert.equal(pictureRemovalSpace({ before: "Harbor", after: "Later", beforeStyled: false, afterStyled: false }), "between");
        assert.equal(pictureRemovalSpace({ before: "Harbor", after: "Later", beforeStyled: true, afterStyled: false }), "outside");
        assert.equal(pictureRemovalSpace({ before: "Harbor", after: "Later", beforeStyled: false, afterStyled: true }), "outside");
        assert.equal(pictureRemovalSpace({ before: "Harbor ", after: "Later", beforeStyled: true, afterStyled: true }), "outside");
        assert.equal(pictureRemovalSpace({ before: "Harbor", after: "", beforeStyled: true, afterStyled: false }), "none");
        assert.equal(pictureRemovalHost("STRONG"), "inline");
        assert.equal(pictureRemovalHost("EM"), "inline");
        assert.equal(pictureRemovalHost("A"), "inline");
        assert.equal(pictureRemovalHost("SPAN"), "inline");
        assert.equal(pictureRemovalHost("P"), "block");
        assert.equal(pictureRemovalHost("LI"), "block");
        assert.equal(pictureRemovalHost("BLOCKQUOTE"), "block");
        assert.equal(pictureRemovalHost("H2"), "block");
        assert.equal(pictureRemovalHost("FIGURE"), "block");
        assert.equal(pictureRemovalHost("BR"), "block");
        assert.equal(pictureAheadDelete({ key: "Delete", ...picture }), "remove");
        assert.equal(pictureAheadDelete({ key: "Delete", collapsed: true, ahead: "space" }), "clear");
        assert.equal(pictureAheadDelete({ key: "Delete", collapsed: true, ahead: "none" }), "pass");
        assert.equal(pictureAheadDelete({ key: "Delete", collapsed: false, ahead: "picture" }), "pass");
        assert.equal(pictureAheadDelete({ key: "Backspace", ...picture }), "pass");
        assert.equal(pictureAheadDelete({ key: "Delete", ctrlKey: true, ...picture }), "pass");
    });

    it("starts the next line beside a picture and leaves the picture whole", () => {
        const beside = { collapsed: true, besidePicture: true };
        assert.equal(pictureInlineEnter({ key: "Enter", ...beside }), "split");
        assert.equal(pictureInlineEnter({ key: "Enter", collapsed: true, besidePicture: false }), "pass");
        assert.equal(pictureInlineEnter({ key: "Enter", collapsed: false, besidePicture: true }), "pass");
        assert.equal(pictureInlineEnter({ key: "Enter", shiftKey: true, ...beside }), "pass");
        assert.equal(pictureInlineEnter({ key: "Backspace", ...beside }), "pass");
    });

    it("keeps the word after a picture in the line out of the picture name", () => {
        const beside = { collapsed: true, afterPicture: true };
        assert.equal(pictureInlineBackspace({ key: "Backspace", ...beside }), "name");
        assert.equal(pictureInlineBackspace({ key: "Backspace", collapsed: true, afterPicture: false }), "pass");
        assert.equal(pictureInlineBackspace({ key: "Backspace", collapsed: false, afterPicture: true }), "pass");
        assert.equal(pictureInlineBackspace({ key: "Delete", ...beside }), "pass");
        assert.equal(pictureInlineBackspace({ key: "Backspace", ctrlKey: true, ...beside }), "pass");
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
        assert.equal(selectedPictureKey({ key: "Enter", imageSelected: true }), "after");
        assert.equal(selectedPictureKey({ key: "s", imageSelected: true }), "name");
        assert.equal(selectedPictureKey({ key: "s", imageSelected: false }), "pass");
        assert.equal(selectedPictureKey({ key: "ArrowDown", imageSelected: true }), "pass");
    });

    it("selects a picture when it is clicked", () => {
        assert.equal(pictureClick({ image: true, inEditor: true }), "select");
        assert.equal(pictureClick({ image: false, inEditor: true }), "pass");
        assert.equal(pictureClick({ image: true, inEditor: false }), "pass");
    });

    it("undoes a picture removal while the page is otherwise unchanged", () => {
        const saved = {
            before: '<figure><img alt="Harbor"></figure><p>After</p>',
            after: "<p>After</p>",
        };
        assert.equal(pictureUndo({ saved, current: saved.after }), "restore");
        assert.equal(pictureUndo({ saved, current: "<p>After!</p>" }), "pass");
        assert.equal(pictureUndo({ saved: null, current: saved.after }), "pass");
    });

    it("moves around a picture instead of into it", () => {
        const plain = { shiftKey: false, altKey: false, ctrlKey: false, metaKey: false };
        assert.equal(pictureMoveKey({ ...plain, key: "ArrowDown", where: "before" }), "select");
        assert.equal(pictureMoveKey({ ...plain, key: "ArrowRight", where: "before" }), "select");
        assert.equal(pictureMoveKey({ ...plain, key: "ArrowUp", where: "after" }), "select");
        assert.equal(pictureMoveKey({ ...plain, key: "ArrowLeft", where: "after" }), "select");
        assert.equal(pictureMoveKey({ ...plain, key: "ArrowDown", where: "after" }), "pass");
        assert.equal(pictureMoveKey({ ...plain, key: "ArrowUp", where: "both" }), "select");
        assert.equal(pictureMoveKey({ ...plain, key: "ArrowDown", where: "both" }), "select");
        assert.equal(pictureMoveKey({ ...plain, key: "ArrowDown", where: "selected" }), "after");
        assert.equal(pictureMoveKey({ ...plain, key: "ArrowUp", where: "selected" }), "before");
        assert.equal(pictureMoveKey({ ...plain, key: "ArrowLeft", where: "caption", atStart: true, atEnd: false }), "select");
        assert.equal(pictureMoveKey({ ...plain, key: "ArrowUp", where: "caption", atStart: true, atEnd: false }), "select");
        assert.equal(pictureMoveKey({ ...plain, key: "ArrowDown", where: "caption", atStart: false, atEnd: true }), "after");
        assert.equal(pictureMoveKey({ ...plain, key: "ArrowRight", where: "caption", atStart: false, atEnd: true }), "after");
        assert.equal(pictureMoveKey({ ...plain, key: "ArrowDown", where: "caption", atStart: false, atEnd: false }), "pass");
        assert.equal(pictureMoveKey({ ...plain, key: "ArrowDown", where: "figure" }), "after");
        assert.equal(pictureMoveKey({ ...plain, key: "ArrowUp", where: "figure" }), "before");
        assert.equal(pictureMoveKey({ ...plain, key: "x", where: "figure" }), "name");
        assert.equal(pictureMoveKey({ ...plain, key: "ArrowDown", shiftKey: true, where: "before" }), "pass");
        assert.equal(pictureMoveKey({ ...plain, key: "Enter", where: "selected" }), "pass");
    });

    it("moves from a picture to the word beside it without adding a line", () => {
        const line = { inLine: true };
        assert.equal(pictureBesideTarget({ direction: "after", sibling: "text", ...line }), "text");
        assert.equal(pictureBesideTarget({ direction: "before", sibling: "text", ...line }), "text");
        assert.equal(pictureBesideTarget({ direction: "after", sibling: "element", ...line }), "element");
        assert.equal(pictureBesideTarget({ direction: "after", sibling: "picture", ...line }), "picture");
        assert.equal(pictureBesideTarget({ direction: "after", sibling: "none", ...line }), "stay");
        assert.equal(pictureBesideTarget({ direction: "after", sibling: "none", inLine: false }), "line");
        assert.equal(pictureBesideTarget({ direction: "before", sibling: "none", inLine: false }), "stay");
    });

    it("marks only the selected picture while editing", () => {
        assert.equal(pictureSelectionMark({ editing: true, imageSelected: true }), "selected");
        assert.equal(pictureSelectionMark({ editing: true, imageSelected: false }), "plain");
        assert.equal(pictureSelectionMark({ editing: false, imageSelected: true }), "plain");
    });
});
