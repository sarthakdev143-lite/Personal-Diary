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
        assertEquals("Quiet rain on the window.", title.snippet());
        assertEquals("rain", title.entryId());
        assertEquals(NOVEMBER, title.entryAt());
        assertEquals(1, title.count());

        DiarySearch.Hit titleOnly = DiarySearch.match("Window notes", "Two mornings", List.of(rain), "mornings", ZoneOffset.UTC);
        assertTrue(titleOnly.matched());
        assertNull(titleOnly.snippet());
        assertNull(titleOnly.entryId());
        assertNull(titleOnly.entryAt());
        assertEquals(0, titleOnly.count());

        String lateDescription = "Notes from the path. ".repeat(8) + "Harbor light at the end.";
        DiarySearch.Hit late = DiarySearch.match("Window notes", lateDescription, List.of(), "harbor", ZoneOffset.UTC);
        assertTrue(late.matched());
        assertTrue(late.snippet().contains("Harbor light"));
        assertNull(late.entryId());
        assertEquals(0, late.count());

        DiarySearch.Hit early = DiarySearch.match("Window notes", "Harbor light, then a longer story.", List.of(), "harbor", ZoneOffset.UTC);
        assertTrue(early.matched());
        assertNull(early.snippet());

        String clipped = "The morning stayed ordinary and quiet beside the window. lantern appeared before the card opening ended.";
        DiarySearch.Hit hidden = DiarySearch.match("Window notes", clipped, List.of(), "lantern", ZoneOffset.UTC);
        assertTrue(hidden.matched());
        assertTrue(hidden.snippet().contains("lantern"));
        assertTrue(hidden.snippet().replaceFirst("^…", "").toLowerCase().indexOf("lantern") <= 32);

        String shortDescription = "The morning stayed ordinary and quiet beside the window before lantern.";
        DiarySearch.Hit shortMatch = DiarySearch.match("Window notes", shortDescription, List.of(), "lantern", ZoneOffset.UTC);
        assertTrue(shortMatch.snippet().contains("lantern"));
        assertTrue(shortMatch.snippet().replaceFirst("^…", "").toLowerCase().indexOf("lantern") <= 32);

        String phrase = "extraordinary lantern festival tonight";
        String longDescription = "The morning stayed ordinary and quiet beside the old glass. The " + phrase + " kept the street warm and bright.";
        DiarySearch.Hit longPhrase = DiarySearch.match("Window notes", longDescription, List.of(), phrase, ZoneOffset.UTC);
        String longShown = longPhrase.snippet().replaceFirst("^…", "");
        assertTrue(longShown.contains(phrase));
        assertTrue(longShown.toLowerCase().indexOf(phrase) <= 48 - phrase.length());

        DiarySearch.Note shortNote = new DiarySearch.Note(
                "rain",
                "<p>The morning stayed ordinary and quiet beside the old glass before lantern.</p>",
                "The morning stayed ordinary and quiet beside the old glass before lantern.",
                NOVEMBER,
                NOVEMBER);
        DiarySearch.Hit shortNoteHit = DiarySearch.match("Window notes", "", List.of(shortNote), "lantern", ZoneOffset.UTC);
        assertTrue(shortNoteHit.matched());
        assertEquals("rain", shortNoteHit.entryId());
        assertTrue(shortNoteHit.snippet().replaceFirst("^…", "").toLowerCase().indexOf("lantern") <= 32);

        DiarySearch.Hit titled = DiarySearch.match("Harbor", lateDescription, List.of(), "harbor", ZoneOffset.UTC);
        assertNull(titled.snippet());

        String spaced = "Notes from the path. ".repeat(8) + "Harbor  light at the end.";
        DiarySearch.Hit across = DiarySearch.match("Window notes", spaced, List.of(), "harbor light", ZoneOffset.UTC);
        assertTrue(across.matched());
        assertNull(across.entryId());
        assertEquals(0, across.count());
        assertTrue(across.snippet().contains("Harbor  light"));

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

        DiarySearch.Note quiet = new DiarySearch.Note(
                "quiet",
                "<p>Quiet rain.</p>",
                "Quiet rain.",
                NOVEMBER,
                NOVEMBER);
        DiarySearch.Hit ontoLine = DiarySearch.match("Window notes", "", List.of(quiet), "2026 Quiet", ZoneOffset.UTC);
        assertTrue(ontoLine.matched());
        assertEquals("quiet", ontoLine.entryId());
        assertTrue(ontoLine.snippet().contains("2026 Quiet"));
        assertTrue(DiarySearch.pageMatches(quiet, "2026 Quiet", ZoneOffset.UTC));

        assertFalse(DiarySearch.match("Window notes", "", List.of(rain), "window. Nov", ZoneOffset.UTC).matched());
        assertFalse(DiarySearch.pageMatches(rain, "window. Nov", ZoneOffset.UTC));
        assertFalse(DiarySearch.match("Window notes", "", List.of(rain), "2026 Saturday", ZoneOffset.UTC).matched());
        assertFalse(DiarySearch.match("Window notes", "", List.of(rain), "2026 09:30", ZoneOffset.UTC).matched());
        assertFalse(DiarySearch.match("Window notes", "", List.of(revised), "AM edited", ZoneOffset.UTC).matched());

        assertEquals("hello", DiarySearch.normalize("  hello  "));
        assertEquals("Harbor light", DiarySearch.normalize("Harbor  light"));
        assertEquals("Hello,", DiarySearch.normalize("Hello ,"));
        assertEquals(80, DiarySearch.normalize("x".repeat(100)).length());

        String spacedQuery = "Notes from the path. ".repeat(8) + "Harbor  light at the end.";
        DiarySearch.Hit acrossSpaces = DiarySearch.match("Window notes", spacedQuery, List.of(), "Harbor  light", ZoneOffset.UTC);
        assertTrue(acrossSpaces.matched());
        assertNull(acrossSpaces.entryId());
        assertTrue(acrossSpaces.snippet().contains("Harbor  light"));

        DiarySearch.Note hello = new DiarySearch.Note(
                "hello",
                "<p>Hello, rain</p>",
                "Hello, rain",
                NOVEMBER,
                NOVEMBER);
        DiarySearch.Hit punctuated = DiarySearch.match("Window notes", "", List.of(hello), "Hello ,", ZoneOffset.UTC);
        assertTrue(punctuated.matched());
        assertEquals("hello", punctuated.entryId());
        assertTrue(punctuated.snippet().contains("Hello, rain"));
    }

    @Test
    void ordersANewerMatchingPageAheadOfADiarySavedLater() {
        Instant february = Instant.parse("2026-02-02T15:00:00Z");
        Instant june = Instant.parse("2026-06-01T00:00:00Z");
        Instant november = Instant.parse("2026-11-14T09:30:00Z");
        Instant saved = Instant.parse("2026-11-15T00:00:00Z");
        DiarySearch.Rank savedLater = new DiarySearch.Rank(false, saved, Instant.parse("2026-01-01T00:00:00Z"), february);
        DiarySearch.Rank newerNote = new DiarySearch.Rank(false, june, Instant.parse("2026-01-01T00:00:00Z"), november);
        DiarySearch.Rank pinnedOlder = new DiarySearch.Rank(true, saved, Instant.parse("2026-01-01T00:00:00Z"), february);
        DiarySearch.Rank title = new DiarySearch.Rank(false, saved, Instant.parse("2026-01-01T00:00:00Z"), null);

        assertTrue(DiarySearch.order(newerNote, savedLater) < 0);
        assertTrue(DiarySearch.order(pinnedOlder, newerNote) < 0);
        assertTrue(DiarySearch.order(title, newerNote) < 0);
    }
}
