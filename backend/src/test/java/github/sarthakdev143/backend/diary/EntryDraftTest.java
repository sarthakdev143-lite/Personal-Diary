package github.sarthakdev143.backend.diary;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertFalse;
import static org.junit.jupiter.api.Assertions.assertInstanceOf;
import static org.junit.jupiter.api.Assertions.assertTrue;

import org.junit.jupiter.api.Test;

class EntryDraftTest {

    @Test
    void keepsTheWritingAndDropsAScript() {
        EntryDraft draft = EntryDraft.prepare("<p>Hello <strong>there</strong></p><script>alert(1)</script>");

        EntryDraft.Ready ready = assertInstanceOf(EntryDraft.Ready.class, draft);
        assertEquals("Hello there", ready.plainText());
        assertTrue(ready.content().contains("Hello"));
        assertFalse(ready.content().toLowerCase().contains("script"));
        assertFalse(ready.content().contains("alert"));
    }

    @Test
    void rejectsAnEmptyEntry() {
        EntryDraft draft = EntryDraft.prepare("  <p><br></p>  ");

        EntryDraft.Rejected rejected = assertInstanceOf(EntryDraft.Rejected.class, draft);
        assertEquals("Content is required.", rejected.error());
    }

    @Test
    void keepsAnImageWhenThereIsNoWriting() {
        EntryDraft withAlt = EntryDraft.prepare("<img src=\"https://example.com/lantern.png\" alt=\"Lantern\">");
        EntryDraft.Ready named = assertInstanceOf(EntryDraft.Ready.class, withAlt);
        assertEquals("Lantern", named.plainText());
        assertTrue(named.content().contains("https://example.com/lantern.png"));

        EntryDraft withoutAlt = EntryDraft.prepare("<img src=\"https://example.com/lantern.png\">");
        EntryDraft.Ready unnamed = assertInstanceOf(EntryDraft.Ready.class, withoutAlt);
        assertEquals("Image", unnamed.plainText());
    }

    @Test
    void keepsAPastedPictureAndDropsAnUnsafeOne() {
        EntryDraft pasted = EntryDraft.prepare("<img src=\"data:image/png;base64,aaaa\" alt=\"sketch\">");
        EntryDraft.Ready ready = assertInstanceOf(EntryDraft.Ready.class, pasted);
        assertEquals("sketch", ready.plainText());
        assertTrue(ready.content().contains("data:image/png;base64,aaaa"));

        EntryDraft svg = EntryDraft.prepare("<p>Look</p><img src=\"data:image/svg+xml;base64,PHN2Zz4=\">");
        EntryDraft.Ready writing = assertInstanceOf(EntryDraft.Ready.class, svg);
        assertEquals("Look", writing.plainText());
        assertFalse(writing.content().contains("svg"));

        EntryDraft script = EntryDraft.prepare("<p>Look</p><img src=\"javascript:alert(1)\">");
        EntryDraft.Ready safe = assertInstanceOf(EntryDraft.Ready.class, script);
        assertEquals("Look", safe.plainText());
        assertFalse(safe.content().contains("javascript"));

        String huge = "data:image/png;base64," + "a".repeat(220_000);
        EntryDraft oversized = EntryDraft.prepare("<p>note</p><img src=\"" + huge + "\">");
        EntryDraft.Ready kept = assertInstanceOf(EntryDraft.Ready.class, oversized);
        assertEquals("note", kept.plainText());
        assertFalse(kept.content().contains("data:image"));
    }

    @Test
    void ignoresTheGeneratedDateAndRejectsAPageThatIsOnlyThatDate() {
        EntryDraft dated = EntryDraft.prepare(
                "<h2>Saturday, November 14, 2026</h2><p>Garden path</p>");
        EntryDraft.Ready ready = assertInstanceOf(EntryDraft.Ready.class, dated);
        assertEquals("Garden path", ready.plainText());
        assertTrue(ready.content().contains("Saturday, November 14, 2026"));

        EntryDraft onlyDate = EntryDraft.prepare(
                "<h2>Saturday, November 14, 2026</h2><p><br></p>");
        EntryDraft.Rejected rejected = assertInstanceOf(EntryDraft.Rejected.class, onlyDate);
        assertEquals("Content is required.", rejected.error());

        EntryDraft ownHeading = EntryDraft.prepare("<h2>Monday, November 14, 2026</h2>");
        EntryDraft.Ready kept = assertInstanceOf(EntryDraft.Ready.class, ownHeading);
        assertEquals("Monday, November 14, 2026", kept.plainText());
    }
}
