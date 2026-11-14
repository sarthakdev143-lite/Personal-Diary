package github.sarthakdev143.backend.diary;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertFalse;
import static org.junit.jupiter.api.Assertions.assertInstanceOf;
import static org.junit.jupiter.api.Assertions.assertTrue;

import java.time.Instant;

import org.junit.jupiter.api.Test;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.fasterxml.jackson.databind.node.ObjectNode;

class EntryWhenTest {
    private static final Instant NOW = Instant.parse("2026-03-14T15:08:00Z");
    private static final ObjectMapper JSON = new ObjectMapper();

    @Test
    void keepsAPastDayAndRejectsADateThatIsNotOne() {
        ObjectNode past = JSON.createObjectNode();
        past.put("createdAt", "2026-02-02T15:08:00Z");
        EntryWhen.When dated = EntryWhen.read(past, "createdAt", NOW, false);
        EntryWhen.When.Ok ok = assertInstanceOf(EntryWhen.When.Ok.class, dated);
        assertEquals(Instant.parse("2026-02-02T15:08:00Z"), ok.value());

        ObjectNode missing = JSON.createObjectNode();
        assertInstanceOf(EntryWhen.When.Absent.class, EntryWhen.read(missing, "createdAt", NOW, false));

        ObjectNode blank = JSON.createObjectNode();
        blank.put("updatedAt", "");
        assertInstanceOf(EntryWhen.When.Absent.class, EntryWhen.read(blank, "updatedAt", NOW, true));

        ObjectNode word = JSON.createObjectNode();
        word.put("createdAt", "yesterday");
        EntryWhen.When.Bad invalid = assertInstanceOf(EntryWhen.When.Bad.class, EntryWhen.read(word, "createdAt", NOW, false));
        assertEquals("Invalid createdAt date.", invalid.error());

        ObjectNode number = JSON.createObjectNode();
        number.put("createdAt", 1);
        EntryWhen.When.Bad typed = assertInstanceOf(EntryWhen.When.Bad.class, EntryWhen.read(number, "createdAt", NOW, false));
        assertEquals("createdAt must be an ISO date string.", typed.error());

        ObjectNode future = JSON.createObjectNode();
        future.put("createdAt", "2026-03-16T15:08:01Z");
        EntryWhen.When.Bad late = assertInstanceOf(EntryWhen.When.Bad.class, EntryWhen.read(future, "createdAt", NOW, false));
        assertEquals("createdAt is out of range.", late.error());

        assertEquals(
                Instant.parse("2026-02-02T15:08:00Z"),
                EntryWhen.later(Instant.parse("2026-02-02T15:08:00Z"), Instant.parse("2026-02-01T00:00:00Z")));
    }

    @Test
    void movesTheDayWithoutMarkingAnUneditedPage() {
        Instant created = Instant.parse("2026-11-14T18:00:00Z");
        Instant moved = Instant.parse("2026-11-13T14:41:00Z");
        EntryWhen.Revision revision = EntryWhen.revise(created, created, moved, false, NOW);
        assertEquals(moved, revision.createdAt());
        assertEquals(moved, revision.updatedAt());
        assertFalse(EntryWhen.wasRevised(revision.createdAt(), revision.updatedAt()));

        Instant edited = created.plusMillis(2_001);
        EntryWhen.Revision kept = EntryWhen.revise(created, edited, moved, false, NOW);
        assertEquals(edited, kept.updatedAt());
        assertTrue(EntryWhen.wasRevised(kept.createdAt(), kept.updatedAt()));

        assertFalse(EntryWhen.writingChanged(
                "<h2>Saturday, November 14, 2026</h2><p>Hello</p>",
                "<h2>Friday, November 13, 2026</h2><p>Hello</p>"));
        assertTrue(EntryWhen.writingChanged("<p>Hello</p>", "<p>Hello again</p>"));
    }
}
