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
    void keepsAListThatWasNestedInsideAParagraph() {
        String markdown = DiaryMarkdown.htmlToMarkdown("<p><ol><li>one</li><li>two</li></ol></p>");
        assertTrue(markdown.contains("1. one\n2. two"));
        assertTrue(DiaryMarkdown.htmlToMarkdown("<ol start=\"3\"><li>Harbor</li><li>today</li></ol>").contains("3. Harbor\n4. today"));
    }

    @Test
    void keepsEachRowOfAPastedTable() {
        String markdown = DiaryMarkdown.htmlToMarkdown(
                "<table><tr><td>Rain</td><td>Harbor</td></tr><tr><td>Bread</td><td><b>Market</b></td></tr></table>");
        assertTrue(markdown.contains("Rain Harbor\n\nBread **Market**"));
    }

    @Test
    void keepsPastedLinesThatWereWrappedInDivs() {
        String markdown = DiaryMarkdown.htmlToMarkdown("<div>Monday</div><div><b>Walked</b> to the harbor</div>");
        assertTrue(markdown.contains("Monday\n\n**Walked** to the harbor"));
    }

    @Test
    void keepsEachLineInsideACodeFence() {
        String markdown = DiaryMarkdown.htmlToMarkdown(
                "<pre><code>const a = 1;</code><code>const b = 2;</code></pre>");
        assertTrue(markdown.contains("```\nconst a = 1;\nconst b = 2;\n```"));
    }

    @Test
    void exportsARenamedPictureOnce() {
        String markdown = DiaryMarkdown.htmlToMarkdown(
                "<figure><img src=\"data:image/png;base64,aaaa\" alt=\"Harbor\"><figcaption>Bay</figcaption></figure>");
        assertEquals("![Bay](image)", markdown);
    }

    @Test
    void keepsAStyledPictureName() {
        assertEquals("![Harbor rain](https://example.com/a.png)\n\n**Harbor** rain", DiaryMarkdown.htmlToMarkdown(
                "<figure><img src=\"https://example.com/a.png\" alt=\"old\"><figcaption><b>Harbor</b> rain</figcaption></figure>"));
        assertEquals("![Harbor](https://example.com/a.png)\n\n[Harbor](https://example.com)", DiaryMarkdown.htmlToMarkdown(
                "<figure><img src=\"https://example.com/a.png\" alt=\"old\"><figcaption><a href=\"https://example.com\">Harbor</a></figcaption></figure>"));
        assertEquals("![quiet bay](https://example.com/a.png)\n\n<u>quiet</u> bay", DiaryMarkdown.htmlToMarkdown(
                "<figure><img src=\"https://example.com/a.png\" alt=\"old\"><figcaption><u>quiet</u> bay</figcaption></figure>"));
    }

    @Test
    void keepsEachLineOfAQuote() {
        assertEquals("> **Harbor**\n> **rain**", DiaryMarkdown.htmlToMarkdown(
                "<blockquote><b>Harbor</b><br><b>rain</b></blockquote>"));
        assertEquals("> Quiet", DiaryMarkdown.htmlToMarkdown("<blockquote>Quiet</blockquote>"));
    }

    @Test
    void keepsASpaceAfterAStyledWord() {
        assertEquals("See **Harbor** rain", DiaryMarkdown.htmlToMarkdown("<p>See <b>Harbor </b>rain</p>"));
        assertEquals("See *Harbor* today", DiaryMarkdown.htmlToMarkdown("<p>See <i>Harbor </i>today</p>"));
        assertEquals("See [Harbor](https://example.com) today", DiaryMarkdown.htmlToMarkdown("<p>See <a href=\"https://example.com\">Harbor </a>today</p>"));
        assertEquals("**See Harbor**", DiaryMarkdown.htmlToMarkdown("<p><b>See Harbor </b></p>"));
        assertEquals("See **Harbor** rain", DiaryMarkdown.htmlToMarkdown("<p>See<b> Harbor</b> rain</p>"));
        assertEquals("See *Harbor* today", DiaryMarkdown.htmlToMarkdown("<p>See<i> Harbor</i> today</p>"));
        assertEquals("See [Harbor](https://example.com) today", DiaryMarkdown.htmlToMarkdown("<p>See<a href=\"https://example.com\"> Harbor</a> today</p>"));
        assertEquals("**Harbor**", DiaryMarkdown.htmlToMarkdown("<p><b> Harbor</b></p>"));
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
