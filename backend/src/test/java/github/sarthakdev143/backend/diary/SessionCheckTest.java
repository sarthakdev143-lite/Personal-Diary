package github.sarthakdev143.backend.diary;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertTrue;

import java.time.Instant;
import java.util.Optional;

import org.junit.jupiter.api.Test;

class SessionCheckTest {

    @Test
    void acceptsASessionThatHasNotExpired() {
        Instant now = Instant.parse("2026-11-14T12:00:00Z");

        Optional<String> userId = SessionCheck.userId("user-1", now.plusSeconds(60), now);

        assertEquals(Optional.of("user-1"), userId);
    }

    @Test
    void rejectsASessionThatHasExpired() {
        Instant now = Instant.parse("2026-11-14T12:00:00Z");

        assertTrue(SessionCheck.userId("user-1", now.minusSeconds(1), now).isEmpty());
        assertTrue(SessionCheck.userId("user-1", now, now).isEmpty());
        assertTrue(SessionCheck.userId(" ", now.plusSeconds(60), now).isEmpty());
        assertTrue(SessionCheck.userId("user-1", null, now).isEmpty());
    }
}
