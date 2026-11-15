package github.sarthakdev143.backend.diary;

import java.time.Instant;
import java.time.ZoneId;
import java.time.format.DateTimeFormatter;
import java.util.Arrays;
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

    public record Hit(boolean matched, String snippet, String entryId, Instant entryAt, int count) {
    }

    public record Rank(boolean pinned, Instant updatedAt, Instant createdAt, Instant matchAt) {
    }

    public static int order(Rank first, Rank second) {
        int byPin = Boolean.compare(second.pinned(), first.pinned());
        if (byPin != 0) {
            return byPin;
        }
        if (first.matchAt() != null && second.matchAt() != null) {
            int byNote = second.matchAt().compareTo(first.matchAt());
            if (byNote != 0) {
                return byNote;
            }
        }
        int byUpdated = compareTime(second.updatedAt(), first.updatedAt());
        if (byUpdated != 0) {
            return byUpdated;
        }
        return compareTime(second.createdAt(), first.createdAt());
    }

    private static int compareTime(Instant left, Instant right) {
        if (left == null && right == null) {
            return 0;
        }
        if (left == null) {
            return -1;
        }
        if (right == null) {
            return 1;
        }
        return left.compareTo(right);
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
            return new Hit(true, null, null, null, 0);
        }
        List<Note> hits = notes.stream()
                .filter(note -> noteMatches(note, query, zone))
                .sorted(Comparator.comparing(Note::createdAt, Comparator.nullsFirst(Comparator.naturalOrder())).reversed())
                .toList();
        if (!hits.isEmpty()) {
            Note newest = hits.get(0);
            return new Hit(true, snippet(newest, query, zone), newest.id(), newest.createdAt(), hits.size());
        }
        if (contains(title, query)) {
            return new Hit(true, null, null, null, 0);
        }
        if (contains(description, query)) {
            return new Hit(true, descriptionSnippet(description, query), null, null, 0);
        }
        return new Hit(false, null, null, null, 0);
    }

    public static boolean pageMatches(Note note, String rawQuery, ZoneId zone) {
        String query = normalize(rawQuery);
        if (query.isEmpty()) {
            return true;
        }
        return noteMatches(note, query, zone);
    }

    private static boolean noteMatches(Note note, String query, ZoneId zone) {
        if (pieces(note, zone).stream().anyMatch(item -> contains(item, query))) {
            return true;
        }
        String page = pageText(note, zone);
        return !page.isBlank() && contains(page, query);
    }

    private static String pageText(Note note, ZoneId zone) {
        String writing = writing(note);
        String date = longDate(note.createdAt(), zone);
        if (writing.isBlank() || date.isBlank() || "—".equals(date)) {
            return "";
        }
        return date + " " + writing;
    }

    private static List<String> pieces(Note note, ZoneId zone) {
        String clock = clock(note.createdAt(), zone);
        String looseClock = clock.startsWith("0") ? clock.substring(1) : clock;
        List<String> pieces = new ArrayList<>();
        pieces.add(writing(note));
        pieces.add(diaryDate(note.createdAt(), zone));
        pieces.add(longDate(note.createdAt(), zone));
        pieces.add(clock);
        if (!looseClock.equals(clock)) {
            pieces.add(looseClock);
        }
        if (revised(note)) {
            pieces.add("edited");
        }
        return pieces.stream().filter(item -> item != null && !item.isBlank()).toList();
    }

    private record Fold(String text, int[] starts, int[] ends) {
    }

    private static boolean contains(String haystack, String needle) {
        if (haystack == null || needle == null) {
            return false;
        }
        return fold(haystack).text().toLowerCase(Locale.ROOT).contains(needle.toLowerCase(Locale.ROOT));
    }

    private static boolean isSearchSpace(char value) {
        return Character.isWhitespace(value) || value == '\u00a0';
    }

    private static Fold fold(String text) {
        StringBuilder chars = new StringBuilder();
        int[] starts = new int[text.length()];
        int[] ends = new int[text.length()];
        int count = 0;
        int index = 0;
        while (index < text.length()) {
            char current = text.charAt(index);
            if (!isSearchSpace(current)) {
                chars.append(current);
                starts[count] = index;
                ends[count] = index + 1;
                count += 1;
                index += 1;
                continue;
            }
            int next = index + 1;
            while (next < text.length() && isSearchSpace(text.charAt(next))) {
                next += 1;
            }
            boolean punctuation = next < text.length() && ".,;:!?".indexOf(text.charAt(next)) >= 0;
            if (next >= text.length() || punctuation || chars.isEmpty()) {
                index = next;
                continue;
            }
            chars.append(' ');
            starts[count] = index;
            ends[count] = next;
            count += 1;
            index = next;
        }
        return new Fold(chars.toString(), Arrays.copyOf(starts, count), Arrays.copyOf(ends, count));
    }

    private static String descriptionSnippet(String description, String query) {
        // Two lines of a diary card fit about this many characters.
        String opening = description.length() <= 48 ? description : description.substring(0, 48);
        if (contains(opening, query)) {
            return null;
        }
        return matchWindow(description, query);
    }

    private static String textWindow(String text, String query) {
        if (text.length() <= 90 && matchStart(text, query) < 48) {
            return text;
        }
        return matchWindow(text, query);
    }

    private static int matchStart(String text, String query) {
        Fold folded = fold(text);
        int index = folded.text().toLowerCase(Locale.ROOT).indexOf(query.toLowerCase(Locale.ROOT));
        if (index < 0) {
            return 0;
        }
        return folded.starts()[index];
    }

    private static String matchWindow(String text, String query) {
        Fold folded = fold(text);
        int index = folded.text().toLowerCase(Locale.ROOT).indexOf(query.toLowerCase(Locale.ROOT));
        int origin = index >= 0 ? folded.starts()[index] : text.toLowerCase(Locale.ROOT).indexOf(query.toLowerCase(Locale.ROOT));
        int matchLength = index >= 0 ? folded.ends()[index + query.length() - 1] - origin : query.length();
        int lead = Math.min(28, Math.max(0, 48 - matchLength));
        int start = Math.max(0, origin - lead);
        int end = Math.min(text.length(), Math.max(origin, 0) + matchLength + 36);
        String window = text.substring(start, end).trim();
        if (start > 0) {
            window = "…" + window;
        }
        if (end < text.length()) {
            window = window + "…";
        }
        return window;
    }

    private static String snippet(Note note, String query, ZoneId zone) {
        String piece = pieces(note, zone).stream().filter(item -> contains(item, query)).findFirst().orElse(pageText(note, zone));
        return textWindow(piece, query);
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
