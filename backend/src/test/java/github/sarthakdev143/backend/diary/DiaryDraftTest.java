package github.sarthakdev143.backend.diary;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertInstanceOf;

import org.junit.jupiter.api.Test;

class DiaryDraftTest {

    @Test
    void rejectsATitleShorterThanThreeCharacters() {
        DiaryDraft draft = DiaryDraft.create("user-1", "  hi ", null, null);

        DiaryDraft.Rejected rejected = assertInstanceOf(DiaryDraft.Rejected.class, draft);
        assertEquals("Title must be at least 3 characters.", rejected.error());
    }

    @Test
    void keepsATrimmedDiaryForItsOwner() {
        DiaryDraft draft = DiaryDraft.create(
                "user-1",
                "  Field   notes  ",
                "  A private book  ",
                "/textures/leather-texture.jpg");

        DiaryDraft.Created created = assertInstanceOf(DiaryDraft.Created.class, draft);
        assertEquals("user-1", created.userId());
        assertEquals("Field notes", created.title());
        assertEquals("A private book", created.description());
        assertEquals("/textures/leather-texture.jpg", created.theme());
    }

    @Test
    void usesTheDefaultCoverWhenTheThemeIsBlank() {
        DiaryDraft draft = DiaryDraft.create("user-1", "Field notes", null, "  ");

        DiaryDraft.Created created = assertInstanceOf(DiaryDraft.Created.class, draft);
        assertEquals("", created.description());
        assertEquals("/textures/leather-texture.jpg", created.theme());
    }

    @Test
    void rejectsAThemeThatIsNotOneOfTheCovers() {
        DiaryDraft draft = DiaryDraft.create("user-1", "Field notes", "", "/textures/nope.jpg");

        DiaryDraft.Rejected rejected = assertInstanceOf(DiaryDraft.Rejected.class, draft);
        assertEquals("Choose a theme from the list.", rejected.error());
    }
}
