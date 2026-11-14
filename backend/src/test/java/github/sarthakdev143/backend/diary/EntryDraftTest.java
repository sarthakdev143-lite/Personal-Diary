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
}
