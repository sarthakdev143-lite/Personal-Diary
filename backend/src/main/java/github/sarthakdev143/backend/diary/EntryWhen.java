package github.sarthakdev143.backend.diary;

import java.time.DateTimeException;
import java.time.Instant;
import java.time.LocalDate;
import java.time.format.DateTimeFormatter;
import java.time.format.ResolverStyle;
import java.util.Locale;
import java.util.regex.Matcher;
import java.util.regex.Pattern;

import com.fasterxml.jackson.databind.JsonNode;

public final class EntryWhen {
    public static final long DAY_MS = 86_400_000L;
    public static final long REVISION_GAP_MS = 2_000L;
    private static final Pattern DATE_HEADING = Pattern.compile("^<h2>([A-Za-z]+, [A-Za-z]+ \\d{1,2}, \\d{4})</h2>");
    private static final DateTimeFormatter LONG_DATE = DateTimeFormatter.ofPattern("EEEE, MMMM d, uuuu", Locale.US)
            .withResolverStyle(ResolverStyle.STRICT);

    private EntryWhen() {
    }

    public sealed interface When permits When.Absent, When.Ok, When.Bad {
        record Absent() implements When {
        }

        record Ok(Instant value) implements When {
        }

        record Bad(String error) implements When {
        }
    }

    public record Revision(Instant createdAt, Instant updatedAt) {
    }

    public static When read(JsonNode body, String field, Instant now, boolean blankIsAbsent) {
        if (body == null || !body.has(field) || body.get(field).isNull()) {
            return new When.Absent();
        }
        JsonNode node = body.get(field);
        if (!node.isTextual()) {
            return new When.Bad(field + " must be an ISO date string.");
        }
        String value = node.asText();
        if (value.isBlank()) {
            return blankIsAbsent ? new When.Absent() : new When.Bad(field + " must be an ISO date string.");
        }
        Instant parsed;
        try {
            parsed = Instant.parse(value.trim());
        } catch (DateTimeException error) {
            return new When.Bad("Invalid " + field + " date.");
        }
        if (parsed.isBefore(Instant.EPOCH) || parsed.toEpochMilli() > now.toEpochMilli() + DAY_MS) {
            return new When.Bad(field + " is out of range.");
        }
        return new When.Ok(parsed);
    }

    public static Instant later(Instant createdAt, Instant updatedAt) {
        return updatedAt.isBefore(createdAt) ? createdAt : updatedAt;
    }

    public static boolean wasRevised(Instant createdAt, Instant updatedAt) {
        return updatedAt.toEpochMilli() - createdAt.toEpochMilli() > REVISION_GAP_MS;
    }

    public static Revision revise(
            Instant createdAt,
            Instant updatedAt,
            Instant nextCreatedAt,
            boolean writingChanged,
            Instant now) {
        Instant created = nextCreatedAt == null ? createdAt : nextCreatedAt;
        boolean dateChanged = !created.equals(createdAt);
        if (!writingChanged && !dateChanged) {
            return new Revision(createdAt, updatedAt);
        }
        if (writingChanged) {
            Instant updated = now.toEpochMilli() - created.toEpochMilli() > REVISION_GAP_MS
                    ? now
                    : created.plusMillis(REVISION_GAP_MS + 1);
            return new Revision(created, updated);
        }
        if (!wasRevised(createdAt, updatedAt)) {
            return new Revision(created, created);
        }
        Instant updated = updatedAt.toEpochMilli() - created.toEpochMilli() > REVISION_GAP_MS
                ? updatedAt
                : created.plusMillis(REVISION_GAP_MS + 1);
        return new Revision(created, updated);
    }

    public static boolean writingChanged(String previous, String next) {
        return !withoutGeneratedDateHeading(previous).equals(withoutGeneratedDateHeading(next));
    }

    private static String withoutGeneratedDateHeading(String html) {
        if (html == null) {
            return "";
        }
        Matcher match = DATE_HEADING.matcher(html);
        if (!match.find()) {
            return html;
        }
        String label = match.group(1);
        try {
            LocalDate parsed = LocalDate.parse(label, LONG_DATE);
            if (!LONG_DATE.format(parsed).equals(label)) {
                return html;
            }
        } catch (DateTimeException error) {
            return html;
        }
        return html.substring(match.end());
    }
}
