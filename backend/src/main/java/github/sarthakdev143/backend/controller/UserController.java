package github.sarthakdev143.backend.controller;

import org.springframework.web.bind.annotation.RestController;

import github.sarthakdev143.backend.service.UserService;
import lombok.RequiredArgsConstructor;

@RestController
@RequiredArgsConstructor
public class UserController {
    private final UserService userService;
}
