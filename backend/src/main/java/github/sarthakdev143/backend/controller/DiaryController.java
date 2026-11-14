package github.sarthakdev143.backend.controller;

import java.time.Instant;
import java.util.List;
import java.util.Map;

import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.ExceptionHandler;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;
import org.springframework.web.bind.annotation.RestControllerAdvice;

import com.fasterxml.jackson.annotation.JsonInclude;
import com.fasterxml.jackson.annotation.JsonProperty;
import com.fasterxml.jackson.databind.JsonNode;

import github.sarthakdev143.backend.diary.DiaryBackup;
import github.sarthakdev143.backend.diary.DiarySearch;
import github.sarthakdev143.backend.diary.SessionUserFilter;
import github.sarthakdev143.backend.model.Diary;
import github.sarthakdev143.backend.service.DiaryMissingException;
import github.sarthakdev143.backend.service.DiaryRejectedException;
import github.sarthakdev143.backend.service.EntryMissingException;
import github.sarthakdev143.backend.service.DiaryService;
import jakarta.servlet.http.HttpServletRequest;
import lombok.RequiredArgsConstructor;

@RestController
@RequiredArgsConstructor
public class DiaryController {
    private final DiaryService diaryService;

    @GetMapping("/api/diaries")
    public List<DiaryResponse> list(HttpServletRequest request, @RequestParam(name = "q", required = false) String query) {
        String userId = userId(request);
        if (DiarySearch.normalize(query).isEmpty()) {
            return diaryService.list(userId).stream().map(DiaryResponse::from).toList();
        }
        return diaryService.search(userId, query).stream().map(DiaryResponse::from).toList();
    }

    @GetMapping("/api/diaries/{id}")
    public DiaryPage open(HttpServletRequest request, @PathVariable String id) {
        String userId = userId(request);
        Diary diary = diaryService.open(userId, id);
        List<EntryController.EntryResponse> entries = diaryService.entries(userId, id).stream()
                .map(EntryController.EntryResponse::from)
                .toList();
        return new DiaryPage(DiaryResponse.from(diary), entries);
    }

    @PutMapping("/api/diaries/{id}")
    public DiaryResponse update(HttpServletRequest request, @PathVariable String id, @RequestBody DiaryUpdate body) {
        return DiaryResponse.from(diaryService.update(
                userId(request),
                id,
                body.title(),
                body.description(),
                body.theme(),
                body.pinned()));
    }

    @DeleteMapping("/api/diaries/{id}")
    public Map<String, Boolean> delete(HttpServletRequest request, @PathVariable String id) {
        diaryService.delete(userId(request), id);
        return Map.of("success", true);
    }

    @GetMapping("/api/diaries/{id}/export")
    public DiaryBackup.File export(
            HttpServletRequest request,
            @PathVariable String id,
            @RequestParam(name = "format", defaultValue = "json") String format) {
        if (!"json".equalsIgnoreCase(format.trim())) {
            throw new DiaryRejectedException("Use format=json.");
        }
        return diaryService.export(userId(request), id, Instant.now());
    }

    @PostMapping("/api/diaries/import")
    public ResponseEntity<ImportResponse> importBackup(HttpServletRequest request, @RequestBody JsonNode body) {
        DiaryService.ImportedDiary imported = diaryService.importBackup(userId(request), body, Instant.now());
        return ResponseEntity.status(HttpStatus.CREATED).body(new ImportResponse(
                DiaryResponse.from(imported.diary()),
                imported.importedEntries(),
                imported.skippedEntries()));
    }

    @PostMapping("/api/diaries")
    public ResponseEntity<DiaryResponse> create(HttpServletRequest request, @RequestBody DiaryRequest body) {
        Diary diary = diaryService.create(
                userId(request),
                body.title(),
                body.description(),
                body.theme(),
                Instant.now());
        return ResponseEntity.status(HttpStatus.CREATED).body(DiaryResponse.from(diary));
    }

    private static String userId(HttpServletRequest request) {
        return (String) request.getAttribute(SessionUserFilter.USER_ID);
    }

    public record DiaryRequest(String title, String description, String theme) {
    }

    public record DiaryUpdate(String title, String description, String theme, Boolean pinned) {
    }

    public record DiaryPage(DiaryResponse diary, List<EntryController.EntryResponse> entries) {
    }

    public record ImportResponse(DiaryResponse diary, int importedEntries, int skippedEntries) {
    }

    public record DiaryResponse(
            @JsonProperty("_id") String id,
            String userId,
            String title,
            String description,
            String theme,
            boolean pinned,
            Instant createdAt,
            Instant updatedAt,
            @JsonInclude(JsonInclude.Include.NON_NULL) String match,
            @JsonInclude(JsonInclude.Include.NON_NULL) String matchEntry) {
        static DiaryResponse from(Diary diary) {
            return from(diary, null, null);
        }

        static DiaryResponse from(DiaryService.ListedDiary listed) {
            return from(listed.diary(), listed.match(), listed.matchEntry());
        }

        private static DiaryResponse from(Diary diary, String match, String matchEntry) {
            return new DiaryResponse(
                    diary.getId(),
                    diary.getUserId(),
                    diary.getTitle(),
                    diary.getDescription(),
                    diary.getTheme(),
                    diary.isPinned(),
                    diary.getCreatedAt(),
                    diary.getUpdatedAt(),
                    match,
                    matchEntry);
        }
    }
}

@RestControllerAdvice
class DiaryErrors {
    @ExceptionHandler(DiaryRejectedException.class)
    ResponseEntity<Map<String, String>> rejected(DiaryRejectedException error) {
        return ResponseEntity.badRequest().body(Map.of("error", error.getMessage()));
    }

    @ExceptionHandler(DiaryMissingException.class)
    ResponseEntity<Map<String, String>> missing() {
        return ResponseEntity.status(HttpStatus.NOT_FOUND).body(Map.of("error", "Diary not found"));
    }

    @ExceptionHandler(EntryMissingException.class)
    ResponseEntity<Map<String, String>> missingEntry() {
        return ResponseEntity.status(HttpStatus.NOT_FOUND).body(Map.of("error", "Entry not found"));
    }
}
