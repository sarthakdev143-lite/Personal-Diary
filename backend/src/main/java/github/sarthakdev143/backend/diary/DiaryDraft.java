package github.sarthakdev143.backend.diary;

import java.util.Set;

public sealed interface DiaryDraft permits DiaryDraft.Created, DiaryDraft.Rejected {

    int TITLE_MIN = 3;
    int TITLE_MAX = 120;
    int DESCRIPTION_MAX = 500;
    String DEFAULT_THEME = "/textures/leather-texture.jpg";

    Set<String> THEMES = Set.of(
            "/textures/leather-texture.jpg",
            "/textures/leather-bound.webp",
            "/textures/wooden_garage_door.webp");

    record Created(String userId, String title, String description, String theme) implements DiaryDraft {
    }

    record Rejected(String error) implements DiaryDraft {
    }

    static DiaryDraft create(String userId, String title, String description, String theme) {
        if (title == null) {
            return new Rejected("Title must be at least 3 characters.");
        }

        String normalizedTitle = title.trim().replaceAll("\\s+", " ");
        if (normalizedTitle.length() < TITLE_MIN) {
            return new Rejected("Title must be at least 3 characters.");
        }
        if (normalizedTitle.length() > TITLE_MAX) {
            return new Rejected("Title must be " + TITLE_MAX + " characters or fewer.");
        }

        String normalizedDescription = description == null ? "" : description.trim();
        if (normalizedDescription.length() > DESCRIPTION_MAX) {
            return new Rejected("Description must be " + DESCRIPTION_MAX + " characters or fewer.");
        }

        String normalizedTheme = theme == null ? "" : theme.trim();
        if (normalizedTheme.isEmpty()) {
            normalizedTheme = DEFAULT_THEME;
        } else if (!THEMES.contains(normalizedTheme)) {
            return new Rejected("Choose a theme from the list.");
        }

        return new Created(userId, normalizedTitle, normalizedDescription, normalizedTheme);
    }
}
