package github.sarthakdev143.backend.service;

import java.time.Instant;
import java.time.ZoneId;
import java.util.Comparator;
import java.util.List;
import java.util.Map;
import java.util.stream.Collectors;
import java.util.stream.Stream;

import org.springframework.stereotype.Service;

import com.fasterxml.jackson.databind.JsonNode;

import github.sarthakdev143.backend.diary.DiaryBackup;
import github.sarthakdev143.backend.diary.DiaryDraft;
import github.sarthakdev143.backend.diary.DiaryMarkdown;
import github.sarthakdev143.backend.diary.DiarySearch;
import github.sarthakdev143.backend.model.Diary;
import github.sarthakdev143.backend.model.Entry;
import github.sarthakdev143.backend.repository.DiaryRepository;
import github.sarthakdev143.backend.repository.EntryRepository;
import lombok.RequiredArgsConstructor;

@Service
@RequiredArgsConstructor
public class DiaryService {
    private final DiaryRepository diaryRepository;
    private final EntryRepository entryRepository;

    public List<Diary> list(String userId) {
        return diaryRepository.findByUserIdOrderByUpdatedAtDescCreatedAtDesc(userId).stream()
                .sorted(Comparator
                        .comparing((Diary diary) -> !diary.isPinned())
                        .thenComparing(Diary::getUpdatedAt, Comparator.nullsLast(Comparator.reverseOrder()))
                        .thenComparing(Diary::getCreatedAt, Comparator.nullsLast(Comparator.reverseOrder())))
                .toList();
    }

    public List<ListedDiary> search(String userId, String rawQuery) {
        List<Diary> diaries = list(userId);
        Map<String, List<DiarySearch.Note>> notes = entryRepository.findByUserId(userId).stream()
                .collect(Collectors.groupingBy(
                        Entry::getDiaryId,
                        Collectors.mapping(DiaryService::note, Collectors.toList())));
        ZoneId zone = ZoneId.systemDefault();
        return diaries.stream().flatMap(diary -> {
            DiarySearch.Hit hit = DiarySearch.match(
                    diary.getTitle(),
                    diary.getDescription(),
                    notes.getOrDefault(diary.getId(), List.of()),
                    rawQuery,
                    zone);
            if (!hit.matched()) {
                return Stream.empty();
            }
            return Stream.of(new ListedDiary(diary, hit.snippet(), hit.entryId()));
        }).toList();
    }

    public record ListedDiary(Diary diary, String match, String matchEntry) {
    }

    private static DiarySearch.Note note(Entry entry) {
        return new DiarySearch.Note(
                entry.getId(),
                entry.getContent(),
                entry.getPlainText(),
                entry.getCreatedAt(),
                entry.getUpdatedAt());
    }

    public Diary open(String userId, String id) {
        return diaryRepository.findByIdAndUserId(id, userId).orElseThrow(DiaryMissingException::new);
    }

    public List<Entry> entries(String userId, String diaryId) {
        open(userId, diaryId);
        return entryRepository.findByDiaryIdAndUserIdOrderByCreatedAtDesc(diaryId, userId);
    }

    public Diary update(String userId, String id, String title, String description, String theme, Boolean pinned) {
        Diary diary = open(userId, id);
        boolean details = title != null || description != null || theme != null;
        if (!details && pinned == null) {
            throw new DiaryRejectedException("No valid fields provided for update.");
        }
        if (details) {
            DiaryDraft draft = DiaryDraft.create(
                    userId,
                    title == null ? diary.getTitle() : title,
                    description == null ? diary.getDescription() : description,
                    theme == null ? diary.getTheme() : theme);
            if (draft instanceof DiaryDraft.Rejected rejected) {
                throw new DiaryRejectedException(rejected.error());
            }
            DiaryDraft.Created created = (DiaryDraft.Created) draft;
            diary.setTitle(created.title());
            diary.setDescription(created.description());
            diary.setTheme(created.theme());
        }
        if (pinned != null) {
            diary.setPinned(pinned);
        }
        if (details) {
            diary.setUpdatedAt(Instant.now());
        }
        return diaryRepository.save(diary);
    }

    public void delete(String userId, String id) {
        open(userId, id);
        entryRepository.deleteByDiaryIdAndUserId(id, userId);
        diaryRepository.deleteById(id);
    }

    public Diary create(String userId, String title, String description, String theme, Instant now) {
        DiaryDraft draft = DiaryDraft.create(userId, title, description, theme);
        if (draft instanceof DiaryDraft.Rejected rejected) {
            throw new DiaryRejectedException(rejected.error());
        }
        DiaryDraft.Created created = (DiaryDraft.Created) draft;
        Diary diary = new Diary();
        diary.setUserId(created.userId());
        diary.setTitle(created.title());
        diary.setDescription(created.description());
        diary.setTheme(created.theme());
        diary.setCreatedAt(now);
        diary.setUpdatedAt(now);
        return diaryRepository.save(diary);
    }

    public DiaryBackup.File export(String userId, String id, Instant exportedAt) {
        Diary diary = open(userId, id);
        return DiaryBackup.write(diary, entryRepository.findByDiaryIdAndUserIdOrderByCreatedAtDesc(id, userId), exportedAt);
    }

    public MarkdownDownload markdown(String userId, String id) {
        Diary diary = open(userId, id);
        return new MarkdownDownload(
                DiaryMarkdown.filename(diary.getTitle(), "md"),
                DiaryMarkdown.diary(
                        diary,
                        entryRepository.findByDiaryIdAndUserIdOrderByCreatedAtDesc(id, userId),
                        ZoneId.systemDefault()));
    }

    public record MarkdownDownload(String filename, String body) {
    }

    public ImportedDiary importBackup(String userId, JsonNode body, Instant now) {
        DiaryBackup.Parsed parsed = DiaryBackup.read(body, now);
        if (parsed instanceof DiaryBackup.Parsed.Rejected rejected) {
            throw new DiaryRejectedException(rejected.error());
        }
        DiaryBackup.Parsed.Ready ready = (DiaryBackup.Parsed.Ready) parsed;
        Diary diary = new Diary();
        diary.setUserId(userId);
        diary.setTitle(ready.title());
        diary.setDescription(ready.description());
        diary.setTheme(ready.theme());
        diary.setPinned(ready.pinned());
        diary.setCreatedAt(now);
        diary.setUpdatedAt(now);
        Diary saved = diaryRepository.save(diary);
        try {
            List<Entry> rows = ready.entries().stream().map(entry -> {
                Entry row = new Entry();
                row.setDiaryId(saved.getId());
                row.setUserId(userId);
                row.setContent(entry.content());
                row.setPlainText(entry.plainText());
                row.setCreatedAt(entry.createdAt());
                row.setUpdatedAt(entry.updatedAt());
                return row;
            }).toList();
            if (!rows.isEmpty()) {
                entryRepository.saveAll(rows);
            }
        } catch (RuntimeException error) {
            entryRepository.deleteByDiaryIdAndUserId(saved.getId(), userId);
            diaryRepository.deleteById(saved.getId());
            throw error;
        }
        return new ImportedDiary(saved, ready.entries().size(), ready.skipped());
    }

    public record ImportedDiary(Diary diary, int importedEntries, int skippedEntries) {
    }
}
