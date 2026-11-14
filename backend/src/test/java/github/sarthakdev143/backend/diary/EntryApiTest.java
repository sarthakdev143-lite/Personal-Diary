package github.sarthakdev143.backend.diary;

import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

import java.time.Instant;
import java.util.Date;

import org.bson.Document;
import org.junit.jupiter.api.AfterEach;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.data.mongodb.core.MongoTemplate;
import org.springframework.http.MediaType;
import org.springframework.test.context.TestPropertySource;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.web.servlet.MvcResult;

import com.jayway.jsonpath.JsonPath;

import jakarta.servlet.http.Cookie;

@SpringBootTest
@AutoConfigureMockMvc
@TestPropertySource(properties = {
        "spring.data.mongodb.uri=mongodb://127.0.0.1:27017/personal-diary-api-test",
        "spring.data.mongodb.database=personal-diary-api-test"
})
class EntryApiTest {

    @Autowired
    private MockMvc mockMvc;

    @Autowired
    private MongoTemplate mongo;

    @AfterEach
    void clean() {
        mongo.getCollection("sessions").deleteMany(new Document());
        mongo.getCollection("diaries").deleteMany(new Document());
        mongo.getCollection("entries").deleteMany(new Document());
    }

    @Test
    void savesAnEntryForTheDiaryOwnerOnly() throws Exception {
        saveSession("token-a", "user-a");
        saveSession("token-b", "user-b");
        MvcResult created = mockMvc.perform(post("/api/diaries")
                .cookie(cookie("token-a"))
                .contentType(MediaType.APPLICATION_JSON)
                .content("{\"title\":\"Field notes\"}"))
                .andExpect(status().isCreated())
                .andReturn();
        String diaryId = JsonPath.read(created.getResponse().getContentAsString(), "$._id");

        mockMvc.perform(post("/api/diaries/" + diaryId + "/entries")
                .cookie(cookie("token-a"))
                .contentType(MediaType.APPLICATION_JSON)
                .content("{\"content\":\"<p>Hello <strong>there</strong></p>\"}"))
                .andExpect(status().isCreated())
                .andExpect(jsonPath("$.plainText").value("Hello there"))
                .andExpect(jsonPath("$.diaryId").value(diaryId))
                .andExpect(jsonPath("$.userId").value("user-a"));

        mockMvc.perform(post("/api/diaries/" + diaryId + "/entries")
                .cookie(cookie("token-a"))
                .contentType(MediaType.APPLICATION_JSON)
                .content("{\"content\":\"<p><br></p>\"}"))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.error").value("Content is required."));

        mockMvc.perform(get("/api/diaries/" + diaryId + "/entries").cookie(cookie("token-a")))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.length()").value(1))
                .andExpect(jsonPath("$[0].plainText").value("Hello there"));

        mockMvc.perform(get("/api/diaries/" + diaryId + "/entries").cookie(cookie("token-b")))
                .andExpect(status().isNotFound());
    }

    @Test
    void rejectsAPageThatIsOnlyTheDate() throws Exception {
        saveSession("token-a", "user-a");
        MvcResult created = mockMvc.perform(post("/api/diaries")
                .cookie(cookie("token-a"))
                .contentType(MediaType.APPLICATION_JSON)
                .content("{\"title\":\"Field notes\"}"))
                .andExpect(status().isCreated())
                .andReturn();
        String diaryId = JsonPath.read(created.getResponse().getContentAsString(), "$._id");

        mockMvc.perform(post("/api/diaries/" + diaryId + "/entries")
                .cookie(cookie("token-a"))
                .contentType(MediaType.APPLICATION_JSON)
                .content("{\"content\":\"<h2>Saturday, November 14, 2026</h2><p><br></p>\"}"))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.error").value("Content is required."));

        mockMvc.perform(post("/api/diaries/" + diaryId + "/entries")
                .cookie(cookie("token-a"))
                .contentType(MediaType.APPLICATION_JSON)
                .content("{\"content\":\"<h2>Saturday, November 14, 2026</h2><p>Garden path</p>\"}"))
                .andExpect(status().isCreated())
                .andExpect(jsonPath("$.plainText").value("Garden path"));
    }

    @Test
    void findsPagesInOneDiaryByWritingDateAndEdited() throws Exception {
        saveSession("token-a", "user-a");
        saveSession("token-b", "user-b");
        String diaryId = JsonPath.read(mockMvc.perform(post("/api/diaries")
                .cookie(cookie("token-a"))
                .contentType(MediaType.APPLICATION_JSON)
                .content("{\"title\":\"Field notes\"}"))
                .andExpect(status().isCreated())
                .andReturn().getResponse().getContentAsString(), "$._id");

        mockMvc.perform(post("/api/diaries/" + diaryId + "/entries")
                .cookie(cookie("token-a"))
                .contentType(MediaType.APPLICATION_JSON)
                .content("{\"content\":\"<p>Quiet rain</p>\",\"createdAt\":\"2026-11-14T09:30:00Z\",\"updatedAt\":\"2026-11-14T09:30:05Z\"}"))
                .andExpect(status().isCreated());
        mockMvc.perform(post("/api/diaries/" + diaryId + "/entries")
                .cookie(cookie("token-a"))
                .contentType(MediaType.APPLICATION_JSON)
                .content("{\"content\":\"<p>Garden path</p>\",\"createdAt\":\"2026-02-02T15:00:00Z\"}"))
                .andExpect(status().isCreated());

        mockMvc.perform(get("/api/diaries/" + diaryId + "/entries").param("q", "quiet").cookie(cookie("token-a")))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.length()").value(1))
                .andExpect(jsonPath("$[0].plainText").value("Quiet rain"));

        mockMvc.perform(get("/api/diaries/" + diaryId + "/entries").param("q", "February").cookie(cookie("token-a")))
                .andExpect(jsonPath("$.length()").value(1))
                .andExpect(jsonPath("$[0].plainText").value("Garden path"));

        mockMvc.perform(get("/api/diaries/" + diaryId + "/entries").param("q", "edited").cookie(cookie("token-a")))
                .andExpect(jsonPath("$.length()").value(1))
                .andExpect(jsonPath("$[0].plainText").value("Quiet rain"));

        mockMvc.perform(get("/api/diaries/" + diaryId + "/entries").param("q", "9:30").cookie(cookie("token-a")))
                .andExpect(jsonPath("$.length()").value(1))
                .andExpect(jsonPath("$[0].plainText").value("Quiet rain"));

        mockMvc.perform(get("/api/diaries/" + diaryId + "/entries").param("q", "snow").cookie(cookie("token-a")))
                .andExpect(jsonPath("$.length()").value(0));

        mockMvc.perform(get("/api/diaries/" + diaryId + "/entries").param("q", "   ").cookie(cookie("token-a")))
                .andExpect(jsonPath("$.length()").value(2))
                .andExpect(jsonPath("$[0].plainText").value("Quiet rain"))
                .andExpect(jsonPath("$[1].plainText").value("Garden path"));

        mockMvc.perform(get("/api/diaries/" + diaryId + "/entries").param("q", "quiet").cookie(cookie("token-b")))
                .andExpect(status().isNotFound());
    }

    private static Cookie cookie(String token) {
        return new Cookie("next-auth.session-token", token);
    }

    private void saveSession(String token, String userId) {
        mongo.getCollection("sessions").insertOne(new Document("sessionToken", token)
                .append("userId", userId)
                .append("expires", Date.from(Instant.now().plusSeconds(3600))));
    }
}
