package github.sarthakdev143.backend.controller;

import org.springframework.web.bind.annotation.RestController;

import github.sarthakdev143.backend.service.DiaryService;
import lombok.RequiredArgsConstructor;

@RestController
@RequiredArgsConstructor
public class DiaryController {
    private final DiaryService diaryService;
}
