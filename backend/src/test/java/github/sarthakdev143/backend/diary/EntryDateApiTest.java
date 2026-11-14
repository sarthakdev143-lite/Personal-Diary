package github.sarthakdev143.backend.diary;

import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.put;
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
class EntryDateApiTest {

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
    void keepsAPastDayAndMovesItWithoutCallingThePageEdited() throws Exception {
        saveSession("token-a", "user-a");
        saveSession("token-b", "user-b");
        String diaryId = id(mockMvc.perform(post("/api/diaries")
                .cookie(cookie("token-a"))
                .contentType(MediaType.APPLICATION_JSON)
                .content("{\"title\":\"Field notes\"}"))
                .andExpect(status().isCreated())
                .andReturn());

        String february = id(mockMvc.perform(post("/api/diaries/" + diaryId + "/entries")
                .cookie(cookie("token-a"))
                .contentType(MediaType.APPLICATION_JSON)
                .content("""
                        {"content":"<p>Garden path</p>","createdAt":"2026-02-02T15:08:00Z","updatedAt":"2026-02-01T00:00:00Z"}
                        """))
                .andExpect(status().isCreated())
                .andExpect(jsonPath("$.createdAt").value("2026-02-02T15:08:00Z"))
                .andExpect(jsonPath("$.updatedAt").value("2026-02-02T15:08:00Z"))
                .andReturn());

        mockMvc.perform(post("/api/diaries/" + diaryId + "/entries")
                .cookie(cookie("token-a"))
                .contentType(MediaType.APPLICATION_JSON)
                .content("{\"content\":\"<p>Tomorrow</p>\",\"createdAt\":\"2099-01-01T00:00:00Z\"}"))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.error").value("createdAt is out of range."));

        mockMvc.perform(post("/api/diaries/" + diaryId + "/entries")
                .cookie(cookie("token-a"))
                .contentType(MediaType.APPLICATION_JSON)
                .content("{\"content\":\"<p>Yesterday</p>\",\"createdAt\":\"yesterday\"}"))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.error").value("Invalid createdAt date."));

        mockMvc.perform(put("/api/diaries/" + diaryId + "/entries/" + february)
                .cookie(cookie("token-b"))
                .contentType(MediaType.APPLICATION_JSON)
                .content("{\"createdAt\":\"2026-01-15T12:00:00Z\"}"))
                .andExpect(status().isNotFound());

        mockMvc.perform(put("/api/diaries/" + diaryId + "/entries/" + february)
                .cookie(cookie("token-a"))
                .contentType(MediaType.APPLICATION_JSON)
                .content("{\"createdAt\":\"2026-01-15T12:00:00Z\"}"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.createdAt").value("2026-01-15T12:00:00Z"))
                .andExpect(jsonPath("$.updatedAt").value("2026-01-15T12:00:00Z"))
                .andExpect(jsonPath("$.plainText").value("Garden path"));

        mockMvc.perform(post("/api/diaries/" + diaryId + "/entries")
                .cookie(cookie("token-a"))
                .contentType(MediaType.APPLICATION_JSON)
                .content("""
                        {"content":"<p>Rain again</p>","createdAt":"2026-01-01T00:00:00Z","updatedAt":"2026-01-01T00:00:02.001Z"}
                        """))
                .andExpect(status().isCreated())
                .andExpect(jsonPath("$.updatedAt").value("2026-01-01T00:00:02.001Z"));

        mockMvc.perform(get("/api/diaries/" + diaryId + "/entries").cookie(cookie("token-a")))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$[0].plainText").value("Garden path"))
                .andExpect(jsonPath("$[1].plainText").value("Rain again"));

        mockMvc.perform(get("/api/diaries").param("q", "edited").cookie(cookie("token-a")))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.length()").value(1))
                .andExpect(jsonPath("$[0].match").value("edited"));
    }

    private static Cookie cookie(String token) {
        return new Cookie("next-auth.session-token", token);
    }

    private static String id(MvcResult result) throws Exception {
        return JsonPath.read(result.getResponse().getContentAsString(), "$._id");
    }

    private void saveSession(String token, String userId) {
        mongo.getCollection("sessions").insertOne(new Document("sessionToken", token)
                .append("userId", userId)
                .append("expires", Date.from(Instant.now().plusSeconds(3600))));
    }
}
