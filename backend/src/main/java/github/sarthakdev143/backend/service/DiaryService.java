package github.sarthakdev143.backend.service;

import org.springframework.stereotype.Service;

import github.sarthakdev143.backend.repository.DiaryRepository;
import lombok.RequiredArgsConstructor;

@Service
@RequiredArgsConstructor
public class DiaryService {
    private final DiaryRepository diaryRepository;
}
