package github.sarthakdev143.backend.service;

import org.springframework.stereotype.Service;

import github.sarthakdev143.backend.repository.PageRepository;
import lombok.RequiredArgsConstructor;

@Service
@RequiredArgsConstructor
public class PageService {
    private final PageRepository pageRepository;
}
