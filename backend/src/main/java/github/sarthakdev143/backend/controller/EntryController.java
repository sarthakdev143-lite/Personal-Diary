package github.sarthakdev143.backend.controller;

import java.time.Instant;
import java.time.ZoneId;
import java.util.List;
import java.util.Map;

import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

import com.fasterxml.jackson.annotation.JsonProperty;
import com.fasterxml.jackson.databind.JsonNode;

import github.sarthakdev143.backend.diary.DiarySearch;
import github.sarthakdev143.backend.diary.EntryDraft;
import github.sarthakdev143.backend.diary.EntryWhen;
import github.sarthakdev143.backend.diary.SessionUserFilter;
import github.sarthakdev143.backend.model.Diary;
import github.sarthakdev143.backend.model.Entry;
import github.sarthakdev143.backend.repository.DiaryRepository;
import github.sarthakdev143.backend.repository.EntryRepository;
import github.sarthakdev143.backend.service.DiaryMissingException;
import github.sarthakdev143.backend.service.DiaryRejectedException;
import github.sarthakdev143.backend.service.EntryMissingException;
import jakarta.servlet.http.HttpServletRequest;
import lombok.RequiredArgsConstructor;

@RestController
@RequiredArgsConstructor
public class EntryController {
    private final DiaryRepository diaries;
    private final EntryRepository entries;

    @GetMapping("/api/diaries/{diaryId}/entries")
    public List<EntryResponse> list(
            HttpServletRequest request,
            @PathVariable String diaryId,
            @RequestParam(name = "q", required = false) String query) {
        String userId = userId(request);
        owned(diaryId, userId);
        List<Entry> rows = entries.findByDiaryIdAndUserIdOrderByCreatedAtDesc(diaryId, userId);
        if (DiarySearch.normalize(query).isEmpty()) {
            return rows.stream().map(EntryResponse::from).toList();
        }
        ZoneId zone = ZoneId.systemDefault();
        return rows.stream()
                .filter(entry -> DiarySearch.pageMatches(note(entry), query, zone))
                .map(EntryResponse::from)
                .toList();
    }

    @PostMapping("/api/diaries/{diaryId}/entries")
    public ResponseEntity<EntryResponse> create(
            HttpServletRequest request,
            @PathVariable String diaryId,
            @RequestBody JsonNode body) {
        String userId = userId(request);
        Diary diary = owned(diaryId, userId);
        EntryDraft draft = EntryDraft.prepare(text(body, "content"));
        if (draft instanceof EntryDraft.Rejected rejected) {
            throw new DiaryRejectedException(rejected.error());
        }
        EntryDraft.Ready ready = (EntryDraft.Ready) draft;
        Instant now = Instant.now();
        Instant createdAt = instant(body, "createdAt", now, false).orElse(now);
        Instant updatedAt = instant(body, "updatedAt", now, true)
                .map(updated -> EntryWhen.later(createdAt, updated))
                .orElse(createdAt);
        Entry entry = new Entry();
        entry.setDiaryId(diary.getId());
        entry.setUserId(userId);
        entry.setContent(ready.content());
        entry.setPlainText(ready.plainText());
        entry.setCreatedAt(createdAt);
        entry.setUpdatedAt(updatedAt);
        Entry saved = entries.save(entry);
        diary.setUpdatedAt(now);
        diaries.save(diary);
        return ResponseEntity.status(HttpStatus.CREATED).body(EntryResponse.from(saved));
    }

    @PutMapping("/api/diaries/{diaryId}/entries/{entryId}")
    public EntryResponse update(
            HttpServletRequest request,
            @PathVariable String diaryId,
            @PathVariable String entryId,
            @RequestBody JsonNode body) {
        String userId = userId(request);
        Entry entry = ownedEntry(diaryId, entryId, userId);
        boolean hasContent = body != null && body.has("content") && !body.get("content").isNull();
        boolean hasCreatedAt = body != null && body.has("createdAt") && !body.get("createdAt").isNull();
        if (!hasContent && !hasCreatedAt) {
            throw new DiaryRejectedException("No valid fields provided for update.");
        }
        String content = entry.getContent();
        String plainText = entry.getPlainText();
        boolean writingChanged = false;
        if (hasContent) {
            EntryDraft draft = EntryDraft.prepare(text(body, "content"));
            if (draft instanceof EntryDraft.Rejected rejected) {
                throw new DiaryRejectedException(rejected.error());
            }
            EntryDraft.Ready ready = (EntryDraft.Ready) draft;
            writingChanged = EntryWhen.writingChanged(entry.getContent(), ready.content());
            content = ready.content();
            plainText = ready.plainText();
        }
        Instant now = Instant.now();
        Instant nextCreatedAt = hasCreatedAt ? requiredInstant(body, "createdAt", now) : null;
        EntryWhen.Revision revision = EntryWhen.revise(
                entry.getCreatedAt(),
                entry.getUpdatedAt(),
                nextCreatedAt,
                writingChanged,
                now);
        boolean dateChanged = !revision.createdAt().equals(entry.getCreatedAt());
        boolean contentChanged = hasContent && !content.equals(entry.getContent());
        if (!writingChanged && !dateChanged && !contentChanged) {
            return EntryResponse.from(entry);
        }
        entry.setContent(content);
        entry.setPlainText(plainText);
        entry.setCreatedAt(revision.createdAt());
        entry.setUpdatedAt(revision.updatedAt());
        entries.save(entry);
        touchDiary(diaryId, userId, now);
        return EntryResponse.from(entry);
    }

    @DeleteMapping("/api/diaries/{diaryId}/entries/{entryId}")
    public Map<String, Boolean> delete(
            HttpServletRequest request,
            @PathVariable String diaryId,
            @PathVariable String entryId) {
        String userId = userId(request);
        Entry entry = ownedEntry(diaryId, entryId, userId);
        entries.delete(entry);
        touchDiary(diaryId, userId, Instant.now());
        return Map.of("success", true);
    }

    private static DiarySearch.Note note(Entry entry) {
        return new DiarySearch.Note(
                entry.getId(),
                entry.getContent(),
                entry.getPlainText(),
                entry.getCreatedAt(),
                entry.getUpdatedAt());
    }

    private Entry ownedEntry(String diaryId, String entryId, String userId) {
        return entries.findByIdAndDiaryIdAndUserId(entryId, diaryId, userId)
                .orElseThrow(EntryMissingException::new);
    }

    private void touchDiary(String diaryId, String userId, Instant now) {
        diaries.findByIdAndUserId(diaryId, userId).ifPresent(diary -> {
            diary.setUpdatedAt(now);
            diaries.save(diary);
        });
    }

    private Diary owned(String diaryId, String userId) {
        return diaries.findByIdAndUserId(diaryId, userId).orElseThrow(DiaryMissingException::new);
    }

    private static java.util.Optional<Instant> instant(JsonNode body, String field, Instant now, boolean blankIsAbsent) {
        EntryWhen.When when = EntryWhen.read(body, field, now, blankIsAbsent);
        if (when instanceof EntryWhen.When.Bad bad) {
            throw new DiaryRejectedException(bad.error());
        }
        if (when instanceof EntryWhen.When.Ok ok) {
            return java.util.Optional.of(ok.value());
        }
        return java.util.Optional.empty();
    }

    private static Instant requiredInstant(JsonNode body, String field, Instant now) {
        return instant(body, field, now, false)
                .orElseThrow(() -> new DiaryRejectedException(field + " must be an ISO date string."));
    }

    private static String text(JsonNode body, String field) {
        if (body == null || !body.has(field) || !body.get(field).isTextual()) {
            return null;
        }
        return body.get(field).asText();
    }

    private static String userId(HttpServletRequest request) {
        return (String) request.getAttribute(SessionUserFilter.USER_ID);
    }

    public record EntryResponse(
            @JsonProperty("_id") String id,
            String diaryId,
            String userId,
            String content,
            String plainText,
            Instant createdAt,
            Instant updatedAt) {
        static EntryResponse from(Entry entry) {
            return new EntryResponse(
                    entry.getId(),
                    entry.getDiaryId(),
                    entry.getUserId(),
                    entry.getContent(),
                    entry.getPlainText(),
                    entry.getCreatedAt(),
                    entry.getUpdatedAt());
        }
    }
}
