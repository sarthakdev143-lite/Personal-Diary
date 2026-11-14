package github.sarthakdev143.backend.diary;

import java.time.Instant;
import java.util.Optional;

public final class SessionCheck {

    private SessionCheck() {
    }

    public static Optional<String> userId(String userId, Instant expires, Instant now) {
        if (userId == null || userId.isBlank() || expires == null || !expires.isAfter(now)) {
            return Optional.empty();
        }
        return Optional.of(userId);
    }
}
