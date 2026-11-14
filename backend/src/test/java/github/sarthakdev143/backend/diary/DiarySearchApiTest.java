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
class DiarySearchApiTest {

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
    void searchKeepsPinnedDiariesFirstAndHidesAnotherPersonsWriting() throws Exception {
        saveSession("token-a", "user-a");
        saveSession("token-b", "user-b");
        String olderId = create("token-a", "Older notes");
        String newerId = create("token-a", "Newer notes");
        String hiddenId = create("token-b", "Older notes");
        String entryId = JsonPath.read(mockMvc.perform(post("/api/diaries/" + newerId + "/entries")
                .cookie(cookie("token-a"))
                .contentType(MediaType.APPLICATION_JSON)
                .content("{\"content\":\"<p>Quiet rain on the window.</p>\"}"))
                .andExpect(status().isCreated())
                .andReturn().getResponse().getContentAsString(), "$._id");

        mockMvc.perform(get("/api/diaries").param("q", "quiet").cookie(cookie("token-a")))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.length()").value(1))
                .andExpect(jsonPath("$[0]._id").value(newerId))
                .andExpect(jsonPath("$[0].match").value("Quiet rain on the window."))
                .andExpect(jsonPath("$[0].matchEntry").value(entryId));

        mockMvc.perform(get("/api/diaries").param("q", "quiet").cookie(cookie("token-b")))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.length()").value(0));

        mockMvc.perform(get("/api/diaries").param("q", "notes").cookie(cookie("token-b")))
                .andExpect(jsonPath("$.length()").value(1))
                .andExpect(jsonPath("$[0]._id").value(hiddenId));

        mockMvc.perform(get("/api/diaries").param("q", "notes").cookie(cookie("token-a")))
                .andExpect(jsonPath("$.length()").value(2))
                .andExpect(jsonPath("$[0]._id").value(newerId));

        mockMvc.perform(org.springframework.test.web.servlet.request.MockMvcRequestBuilders.put("/api/diaries/" + olderId)
                .cookie(cookie("token-a"))
                .contentType(MediaType.APPLICATION_JSON)
                .content("{\"pinned\":true}"))
                .andExpect(status().isOk());

        mockMvc.perform(get("/api/diaries").param("q", "notes").cookie(cookie("token-a")))
                .andExpect(jsonPath("$[0]._id").value(olderId))
                .andExpect(jsonPath("$[0].pinned").value(true))
                .andExpect(jsonPath("$[1]._id").value(newerId));

        mockMvc.perform(get("/api/diaries").param("q", "   ").cookie(cookie("token-a")))
                .andExpect(jsonPath("$.length()").value(2));
    }

    private String create(String token, String title) throws Exception {
        MvcResult created = mockMvc.perform(post("/api/diaries")
                .cookie(cookie(token))
                .contentType(MediaType.APPLICATION_JSON)
                .content("{\"title\":\"" + title + "\"}"))
                .andExpect(status().isCreated())
                .andReturn();
        return JsonPath.read(created.getResponse().getContentAsString(), "$._id");
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
