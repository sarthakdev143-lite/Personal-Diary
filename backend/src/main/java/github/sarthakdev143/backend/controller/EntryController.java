package github.sarthakdev143.backend.controller;

import java.time.Instant;
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
import org.springframework.web.bind.annotation.RestController;

import com.fasterxml.jackson.annotation.JsonProperty;

import github.sarthakdev143.backend.diary.EntryDraft;
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
    public List<EntryResponse> list(HttpServletRequest request, @PathVariable String diaryId) {
        String userId = userId(request);
        owned(diaryId, userId);
        return entries.findByDiaryIdAndUserIdOrderByCreatedAtDesc(diaryId, userId).stream()
                .map(EntryResponse::from)
                .toList();
    }

    @PostMapping("/api/diaries/{diaryId}/entries")
    public ResponseEntity<EntryResponse> create(
            HttpServletRequest request,
            @PathVariable String diaryId,
            @RequestBody EntryRequest body) {
        String userId = userId(request);
        Diary diary = owned(diaryId, userId);
        EntryDraft draft = EntryDraft.prepare(body.content());
        if (draft instanceof EntryDraft.Rejected rejected) {
            throw new DiaryRejectedException(rejected.error());
        }
        EntryDraft.Ready ready = (EntryDraft.Ready) draft;
        Instant now = Instant.now();
        Entry entry = new Entry();
        entry.setDiaryId(diary.getId());
        entry.setUserId(userId);
        entry.setContent(ready.content());
        entry.setPlainText(ready.plainText());
        entry.setCreatedAt(now);
        entry.setUpdatedAt(now);
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
            @RequestBody EntryRequest body) {
        String userId = userId(request);
        Entry entry = ownedEntry(diaryId, entryId, userId);
        if (body.content() == null) {
            throw new DiaryRejectedException("No valid fields provided for update.");
        }
        EntryDraft draft = EntryDraft.prepare(body.content());
        if (draft instanceof EntryDraft.Rejected rejected) {
            throw new DiaryRejectedException(rejected.error());
        }
        EntryDraft.Ready ready = (EntryDraft.Ready) draft;
        if (!ready.content().equals(entry.getContent())) {
            Instant now = Instant.now();
            if (!now.isAfter(entry.getCreatedAt())) {
                now = entry.getCreatedAt().plusMillis(1);
            }
            entry.setContent(ready.content());
            entry.setPlainText(ready.plainText());
            entry.setUpdatedAt(now);
            entries.save(entry);
            touchDiary(diaryId, userId, now);
        }
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

    private static String userId(HttpServletRequest request) {
        return (String) request.getAttribute(SessionUserFilter.USER_ID);
    }

    public record EntryRequest(String content) {
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
