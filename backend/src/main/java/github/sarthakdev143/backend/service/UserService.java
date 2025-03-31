package github.sarthakdev143.backend.service;

import org.springframework.stereotype.Service;

import github.sarthakdev143.backend.repository.UserRepository;
import lombok.RequiredArgsConstructor;

@Service
@RequiredArgsConstructor
public class UserService {
    private final UserRepository userRepository;
}
