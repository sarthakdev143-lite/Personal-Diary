package github.sarthakdev143.backend.diary;

import java.time.Instant;
import java.time.ZoneId;
import java.time.format.DateTimeFormatter;
import java.util.ArrayList;
import java.util.Comparator;
import java.util.List;
import java.util.Locale;

public final class DiarySearch {
    public static final int MAX = 80;
    private static final long REVISION_GAP_MS = 2_000;
    private static final DateTimeFormatter DIARY_DATE = DateTimeFormatter.ofPattern("MMM d, yyyy", Locale.US);
    private static final DateTimeFormatter ENTRY_LONG = DateTimeFormatter.ofPattern("EEEE, MMMM d, yyyy", Locale.US);
    private static final DateTimeFormatter ENTRY_TIME = DateTimeFormatter.ofPattern("hh:mm a", Locale.US);

    private DiarySearch() {
    }

    public record Note(String id, String content, String plainText, Instant createdAt, Instant updatedAt) {
    }

    public record Hit(boolean matched, String snippet, String entryId) {
    }

    public static String normalize(String raw) {
        if (raw == null) {
            return "";
        }
        String trimmed = raw.trim();
        return trimmed.length() <= MAX ? trimmed : trimmed.substring(0, MAX);
    }

    public static Hit match(String title, String description, List<Note> notes, String rawQuery, ZoneId zone) {
        String query = normalize(rawQuery);
        if (query.isEmpty()) {
            return new Hit(true, null, null);
        }
        if (contains(title, query) || contains(description == null ? "" : description, query)) {
            return new Hit(true, null, null);
        }

        Note newest = notes.stream()
                .filter(note -> contains(searchText(note, zone), query))
                .max(Comparator.comparing(Note::createdAt, Comparator.nullsFirst(Comparator.naturalOrder())))
                .orElse(null);
        if (newest == null) {
            return new Hit(false, null, null);
        }
        return new Hit(true, snippet(newest, query, zone), newest.id());
    }

    public static boolean pageMatches(Note note, String rawQuery, ZoneId zone) {
        String query = normalize(rawQuery);
        if (query.isEmpty()) {
            return true;
        }
        return contains(searchText(note, zone), query);
    }

    private static boolean contains(String haystack, String needle) {
        return haystack != null && haystack.toLowerCase(Locale.ROOT).contains(needle.toLowerCase(Locale.ROOT));
    }

    private static String searchText(Note note, ZoneId zone) {
        String clock = clock(note.createdAt(), zone);
        String looseClock = clock.startsWith("0") ? clock.substring(1) : clock;
        StringBuilder text = new StringBuilder();
        append(text, writing(note));
        append(text, diaryDate(note.createdAt(), zone));
        append(text, longDate(note.createdAt(), zone));
        append(text, clock);
        if (!looseClock.equals(clock)) {
            append(text, looseClock);
        }
        if (revised(note)) {
            append(text, "edited");
        }
        return text.toString();
    }

    private static String snippet(Note note, String query, ZoneId zone) {
        String writing = writing(note);
        String clock = clock(note.createdAt(), zone);
        String looseClock = clock.startsWith("0") ? clock.substring(1) : clock;
        List<String> pieces = new ArrayList<>();
        pieces.add(writing);
        pieces.add(longDate(note.createdAt(), zone));
        pieces.add(diaryDate(note.createdAt(), zone));
        pieces.add(clock);
        if (!looseClock.equals(clock)) {
            pieces.add(looseClock);
        }
        if (revised(note)) {
            pieces.add("edited");
        }
        String piece = pieces.stream().filter(item -> contains(item, query)).findFirst().orElse(searchText(note, zone));
        if (piece.length() <= 90) {
            return piece;
        }
        String needle = query.toLowerCase(Locale.ROOT);
        int index = piece.toLowerCase(Locale.ROOT).indexOf(needle);
        int start = Math.max(0, index - 28);
        int end = Math.min(piece.length(), Math.max(index, 0) + query.length() + 36);
        String window = piece.substring(start, end).trim();
        if (start > 0) {
            window = "…" + window;
        }
        if (end < piece.length()) {
            window = window + "…";
        }
        return window;
    }

    private static void append(StringBuilder text, String piece) {
        if (piece == null || piece.isBlank()) {
            return;
        }
        if (!text.isEmpty()) {
            text.append(' ');
        }
        text.append(piece);
    }

    private static String writing(Note note) {
        if (note.plainText() != null && !note.plainText().isBlank()) {
            return note.plainText().trim();
        }
        if (note.content() == null) {
            return "";
        }
        return note.content().replaceAll("<[^>]+>", " ").replaceAll("\\s+", " ").trim();
    }

    private static boolean revised(Note note) {
        if (note.createdAt() == null || note.updatedAt() == null) {
            return false;
        }
        return note.updatedAt().toEpochMilli() - note.createdAt().toEpochMilli() > REVISION_GAP_MS;
    }

    private static String diaryDate(Instant instant, ZoneId zone) {
        if (instant == null) {
            return "Unknown date";
        }
        return DIARY_DATE.format(instant.atZone(zone));
    }

    private static String longDate(Instant instant, ZoneId zone) {
        if (instant == null) {
            return "—";
        }
        return ENTRY_LONG.format(instant.atZone(zone));
    }

    private static String clock(Instant instant, ZoneId zone) {
        if (instant == null) {
            return "";
        }
        return ENTRY_TIME.format(instant.atZone(zone));
    }
}
