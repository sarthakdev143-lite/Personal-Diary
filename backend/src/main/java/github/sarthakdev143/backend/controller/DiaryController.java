package github.sarthakdev143.backend.controller;

import java.time.Instant;
import java.util.List;
import java.util.Map;

import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.ExceptionHandler;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RestController;
import org.springframework.web.bind.annotation.RestControllerAdvice;

import com.fasterxml.jackson.annotation.JsonProperty;

import github.sarthakdev143.backend.diary.SessionUserFilter;
import github.sarthakdev143.backend.model.Diary;
import github.sarthakdev143.backend.service.DiaryMissingException;
import github.sarthakdev143.backend.service.DiaryRejectedException;
import github.sarthakdev143.backend.service.DiaryService;
import jakarta.servlet.http.HttpServletRequest;
import lombok.RequiredArgsConstructor;

@RestController
@RequiredArgsConstructor
public class DiaryController {
    private final DiaryService diaryService;

    @GetMapping("/api/diaries")
    public List<DiaryResponse> list(HttpServletRequest request) {
        return diaryService.list(userId(request)).stream().map(DiaryResponse::from).toList();
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

    public record DiaryResponse(
            @JsonProperty("_id") String id,
            String userId,
            String title,
            String description,
            String theme,
            Instant createdAt,
            Instant updatedAt) {
        static DiaryResponse from(Diary diary) {
            return new DiaryResponse(
                    diary.getId(),
                    diary.getUserId(),
                    diary.getTitle(),
                    diary.getDescription(),
                    diary.getTheme(),
                    diary.getCreatedAt(),
                    diary.getUpdatedAt());
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
}
