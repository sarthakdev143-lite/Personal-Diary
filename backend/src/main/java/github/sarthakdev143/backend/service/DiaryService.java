package github.sarthakdev143.backend.service;

import java.time.Instant;
import java.util.List;

import org.springframework.stereotype.Service;

import github.sarthakdev143.backend.diary.DiaryDraft;
import github.sarthakdev143.backend.model.Diary;
import github.sarthakdev143.backend.repository.DiaryRepository;
import lombok.RequiredArgsConstructor;

@Service
@RequiredArgsConstructor
public class DiaryService {
    private final DiaryRepository diaryRepository;

    public List<Diary> list(String userId) {
        return diaryRepository.findByUserIdOrderByUpdatedAtDescCreatedAtDesc(userId);
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
}
