package github.sarthakdev143.backend.diary;

import java.time.Instant;
import java.time.format.DateTimeParseException;
import java.time.temporal.ChronoUnit;
import java.util.ArrayList;
import java.util.Comparator;
import java.util.List;

import com.fasterxml.jackson.databind.JsonNode;

import github.sarthakdev143.backend.model.Diary;
import github.sarthakdev143.backend.model.Entry;

public final class DiaryBackup {
    public static final String FORMAT = "personal-diary-backup";
    public static final int VERSION = 1;
    public static final int MAX_ENTRIES = 500;

    private DiaryBackup() {
    }

    public record File(
            String format,
            int version,
            Instant exportedAt,
            DiaryBody diary,
            List<EntryBody> entries) {
    }

    public record DiaryBody(String title, String description, String theme, boolean pinned) {
    }

    public record EntryBody(Instant createdAt, Instant updatedAt, String content) {
    }

    public sealed interface Parsed permits Parsed.Ready, Parsed.Rejected {
        record Ready(
                String title,
                String description,
                String theme,
                boolean pinned,
                List<StoredEntry> entries,
                int skipped) implements Parsed {
        }

        record Rejected(String error) implements Parsed {
        }

        record StoredEntry(String content, String plainText, Instant createdAt, Instant updatedAt) {
        }
    }

    public static File write(Diary diary, List<Entry> entries, Instant exportedAt) {
        List<EntryBody> body = entries.stream()
                .sorted(Comparator.comparing(Entry::getCreatedAt, Comparator.nullsLast(Comparator.naturalOrder())))
                .map(entry -> new EntryBody(entry.getCreatedAt(), entry.getUpdatedAt(), entry.getContent()))
                .toList();
        return new File(
                FORMAT,
                VERSION,
                exportedAt,
                new DiaryBody(diary.getTitle(), diary.getDescription(), diary.getTheme(), diary.isPinned()),
                body);
    }

    public static Parsed read(JsonNode body, Instant now) {
        if (body == null || !body.isObject() || !FORMAT.equals(text(body.get("format")))) {
            return new Parsed.Rejected("Choose a JSON backup from this diary.");
        }
        JsonNode version = body.get("version");
        if (version == null || !version.isIntegralNumber() || version.intValue() != VERSION) {
            return new Parsed.Rejected("This backup version is not supported.");
        }
        JsonNode diary = body.get("diary");
        if (diary == null || !diary.isObject()) {
            return new Parsed.Rejected("The backup is missing the diary.");
        }

        JsonNode titleNode = diary.get("title");
        if (titleNode != null && !titleNode.isTextual()) {
            return new Parsed.Rejected("Title must be at least 3 characters.");
        }
        JsonNode descriptionNode = diary.get("description");
        if (descriptionNode != null && !descriptionNode.isNull() && !descriptionNode.isTextual()) {
            return new Parsed.Rejected("Description must be a string.");
        }
        String requestedTheme = text(diary.get("theme"));
        String theme = requestedTheme != null && DiaryDraft.THEMES.contains(requestedTheme.trim())
                ? requestedTheme.trim()
                : DiaryDraft.DEFAULT_THEME;
        DiaryDraft draft = DiaryDraft.create(
                "import",
                titleNode == null || titleNode.isNull() ? null : titleNode.asText(),
                descriptionNode == null || descriptionNode.isNull() ? null : descriptionNode.asText(),
                theme);
        if (draft instanceof DiaryDraft.Rejected rejected) {
            return new Parsed.Rejected(rejected.error());
        }
        DiaryDraft.Created created = (DiaryDraft.Created) draft;

        JsonNode entries = body.get("entries");
        if (entries == null || !entries.isArray()) {
            return new Parsed.Rejected("The backup is missing its entries.");
        }
        if (entries.size() > MAX_ENTRIES) {
            return new Parsed.Rejected("A backup can include at most " + MAX_ENTRIES + " entries.");
        }

        List<Parsed.StoredEntry> stored = new ArrayList<>();
        int skipped = 0;
        for (int index = 0; index < entries.size(); index += 1) {
            JsonNode entry = entries.get(index);
            String label = "Entry " + (index + 1);
            if (entry == null || !entry.isObject()) {
                return new Parsed.Rejected(label + " is not an object.");
            }
            EntryDraft prepared = EntryDraft.prepare(text(entry.get("content")));
            if (prepared instanceof EntryDraft.Rejected rejected) {
                if ("Content is required.".equals(rejected.error())) {
                    skipped += 1;
                    continue;
                }
                return new Parsed.Rejected(label + ": " + rejected.error());
            }
            EntryDraft.Ready ready = (EntryDraft.Ready) prepared;
            Instant createdAt = instant(entry.get("createdAt"), now);
            if (createdAt == null) {
                return new Parsed.Rejected(dateError(entry.get("createdAt"), "createdAt"));
            }
            Instant updatedAt = createdAt;
            JsonNode updatedNode = entry.get("updatedAt");
            if (updatedNode != null && !updatedNode.isNull() && !(updatedNode.isTextual() && updatedNode.asText().isBlank())) {
                updatedAt = instant(updatedNode, now);
                if (updatedAt == null) {
                    return new Parsed.Rejected(dateError(updatedNode, "updatedAt"));
                }
                if (updatedAt.isBefore(createdAt)) {
                    updatedAt = createdAt;
                }
            }
            stored.add(new Parsed.StoredEntry(ready.content(), ready.plainText(), createdAt, updatedAt));
        }

        JsonNode pinned = diary.get("pinned");
        return new Parsed.Ready(
                created.title(),
                created.description(),
                created.theme(),
                pinned != null && pinned.isBoolean() && pinned.booleanValue(),
                stored,
                skipped);
    }

    private static String text(JsonNode node) {
        return node != null && node.isTextual() ? node.asText() : null;
    }

    private static Instant instant(JsonNode node, Instant now) {
        if (node == null || !node.isTextual() || node.asText().isBlank()) {
            return null;
        }
        try {
            Instant parsed = Instant.parse(node.asText().trim());
            Instant earliest = Instant.EPOCH;
            Instant latest = now.plus(1, ChronoUnit.DAYS);
            if (parsed.isBefore(earliest) || parsed.isAfter(latest)) {
                return null;
            }
            return parsed;
        } catch (DateTimeParseException error) {
            return null;
        }
    }

    private static String dateError(JsonNode node, String field) {
        if (node == null || !node.isTextual() || node.asText().isBlank()) {
            return field + " must be an ISO date string.";
        }
        try {
            Instant.parse(node.asText().trim());
            return field + " is out of range.";
        } catch (DateTimeParseException error) {
            return "Invalid " + field + " date.";
        }
    }
}
