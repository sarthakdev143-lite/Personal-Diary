package github.sarthakdev143.backend.diary;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertFalse;
import static org.junit.jupiter.api.Assertions.assertTrue;

import java.time.Instant;
import java.time.ZoneOffset;

import org.junit.jupiter.api.Test;

import github.sarthakdev143.backend.model.Diary;
import github.sarthakdev143.backend.model.Entry;

class DiaryMarkdownTest {

    @Test
    void turnsAnEntryIntoMarkdownAndDropsScripts() {
        String html = "<h2>Dawn</h2><p>Hello <strong>there</strong> &amp; welcome</p>"
                + "<ul><li>one</li><li>two</li></ul><blockquote><p>quoted</p></blockquote>"
                + "<pre><code>const a = 1;</code></pre><p><a href=\"https://example.com\">site</a></p>"
                + "<img src=\"data:image/png;base64,aaaa\" alt=\"sketch\"><script>alert(1)</script>";
        String markdown = DiaryMarkdown.htmlToMarkdown(html);
        assertTrue(markdown.startsWith("## Dawn"));
        assertTrue(markdown.contains("Hello **there** & welcome"));
        assertTrue(markdown.contains("- one\n- two"));
        assertTrue(markdown.contains("> quoted"));
        assertTrue(markdown.contains("```\nconst a = 1;\n```"));
        assertTrue(markdown.contains("[site](https://example.com)"));
        assertTrue(markdown.contains("![sketch](image)"));
        assertFalse(markdown.contains("script"));
        assertFalse(markdown.contains("alert"));
    }

    @Test
    void keepsAnUnderline() {
        assertEquals("a <u>quiet</u> rain", DiaryMarkdown.htmlToMarkdown("<p>a <u>quiet</u> rain</p>"));
        assertEquals("a  rain", DiaryMarkdown.htmlToMarkdown("<p>a <u></u> rain</p>"));
        assertEquals("**<u>both</u>**", DiaryMarkdown.htmlToMarkdown("<p><strong><u>both</u></strong></p>"));
    }

    @Test
    void writesTheDiaryInChronologicalOrder() {
        Diary diary = new Diary();
        diary.setTitle("Morning Pages!");
        diary.setDescription("Quiet notes");
        Entry older = entry("<h2>Dawn</h2><p>Hello</p>", "2026-01-01T12:00:00.000Z");
        Entry newer = entry("<p>Later</p>", "2026-02-01T12:00:00.000Z");
        String markdown = DiaryMarkdown.diary(diary, java.util.List.of(newer, older), ZoneOffset.UTC);
        assertTrue(markdown.startsWith("# Morning Pages!\n\nQuiet notes\n\n"));
        assertTrue(markdown.indexOf("Dawn") < markdown.indexOf("Later"));
        assertTrue(markdown.contains("Thursday, January 1, 2026"));
        assertEquals("morning-pages.md", DiaryMarkdown.filename("Morning Pages!", "md"));
    }

    @Test
    void doesNotRepeatTheDateAlreadyStoredOnTheEntry() {
        String createdAt = "2026-03-03T15:00:00.000Z";
        String label = "Tuesday, March 3, 2026";
        Entry entry = entry("<h2>" + label + "</h2><p>a <u>quiet</u> rain</p>", createdAt);
        Diary diary = new Diary();
        diary.setTitle("Pages");
        String markdown = DiaryMarkdown.diary(diary, java.util.List.of(entry), ZoneOffset.UTC);
        assertEquals(1, markdown.split(label, -1).length - 1);
        assertTrue(markdown.contains("a <u>quiet</u> rain"));
    }

    private static Entry entry(String content, String createdAt) {
        Entry entry = new Entry();
        entry.setContent(content);
        entry.setCreatedAt(Instant.parse(createdAt));
        entry.setUpdatedAt(entry.getCreatedAt());
        return entry;
    }
}
