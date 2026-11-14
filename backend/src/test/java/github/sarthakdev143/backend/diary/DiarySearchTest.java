package github.sarthakdev143.backend.diary;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertFalse;
import static org.junit.jupiter.api.Assertions.assertNull;
import static org.junit.jupiter.api.Assertions.assertTrue;

import java.time.Instant;
import java.time.ZoneOffset;
import java.util.List;

import org.junit.jupiter.api.Test;

class DiarySearchTest {

    private static final Instant NOVEMBER = Instant.parse("2026-11-14T09:30:00Z");
    private static final Instant FEBRUARY = Instant.parse("2026-02-02T15:00:00Z");

    @Test
    void findsADiaryByItsTitleOrItsNewestMatchingPage() {
        DiarySearch.Note rain = new DiarySearch.Note(
                "rain",
                "<p>Quiet rain on the window.</p>",
                "Quiet rain on the window.",
                NOVEMBER,
                NOVEMBER);
        DiarySearch.Note garden = new DiarySearch.Note(
                "garden",
                "<p>Garden notes from the path.</p>",
                "Garden notes from the path.",
                FEBRUARY,
                FEBRUARY);

        DiarySearch.Hit blank = DiarySearch.match("Window notes", "Two mornings", List.of(rain), "   ", ZoneOffset.UTC);
        assertTrue(blank.matched());
        assertNull(blank.snippet());

        DiarySearch.Hit title = DiarySearch.match("Window notes", "Two mornings", List.of(rain), "window", ZoneOffset.UTC);
        assertTrue(title.matched());
        assertNull(title.snippet());
        assertNull(title.entryId());

        DiarySearch.Hit note = DiarySearch.match("Window notes", "Two mornings", List.of(garden, rain), "quiet", ZoneOffset.UTC);
        assertTrue(note.matched());
        assertEquals("Quiet rain on the window.", note.snippet());
        assertEquals("rain", note.entryId());

        DiarySearch.Hit dated = DiarySearch.match("Window notes", "Two mornings", List.of(rain), "November", ZoneOffset.UTC);
        assertTrue(dated.matched());
        assertEquals("Saturday, November 14, 2026", dated.snippet());
        assertEquals("rain", dated.entryId());

        DiarySearch.Hit older = DiarySearch.match("Window notes", "Two mornings", List.of(rain, garden), "garden", ZoneOffset.UTC);
        assertEquals("garden", older.entryId());
        assertTrue(older.snippet().contains("Garden notes"));

        DiarySearch.Hit miss = DiarySearch.match("Window notes", "Two mornings", List.of(rain), "snow", ZoneOffset.UTC);
        assertFalse(miss.matched());

        DiarySearch.Note revised = new DiarySearch.Note(
                "rain",
                rain.content(),
                rain.plainText(),
                NOVEMBER,
                NOVEMBER.plusSeconds(5));
        DiarySearch.Hit edited = DiarySearch.match("Window notes", "Two mornings", List.of(revised), "edited", ZoneOffset.UTC);
        assertTrue(edited.matched());
        assertEquals("edited", edited.snippet());

        DiarySearch.Hit fresh = DiarySearch.match("Window notes", "Two mornings", List.of(rain), "edited", ZoneOffset.UTC);
        assertFalse(fresh.matched());

        DiarySearch.Hit clock = DiarySearch.match("Window notes", "Two mornings", List.of(rain), "9:30", ZoneOffset.UTC);
        assertTrue(clock.matched());
        assertEquals("09:30 AM", clock.snippet());

        assertEquals("hello", DiarySearch.normalize("  hello  "));
        assertEquals(80, DiarySearch.normalize("x".repeat(100)).length());
    }
}
