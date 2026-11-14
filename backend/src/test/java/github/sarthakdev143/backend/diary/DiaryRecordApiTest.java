package github.sarthakdev143.backend.diary;

import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.delete;
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
class DiaryRecordApiTest {

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
    void opensRenamesAndRemovesADiaryForItsOwner() throws Exception {
        saveSession("token-a", "user-a");
        saveSession("token-b", "user-b");
        String olderId = create("token-a", "Older notes");
        String newerId = create("token-a", "Newer notes");
        mockMvc.perform(post("/api/diaries/" + olderId + "/entries")
                .cookie(cookie("token-a"))
                .contentType(MediaType.APPLICATION_JSON)
                .content("{\"content\":\"<p>Kept page</p>\"}"))
                .andExpect(status().isCreated());

        mockMvc.perform(get("/api/diaries/" + olderId).cookie(cookie("token-a")))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.diary.title").value("Older notes"))
                .andExpect(jsonPath("$.diary.pinned").value(false))
                .andExpect(jsonPath("$.entries.length()").value(1))
                .andExpect(jsonPath("$.entries[0].plainText").value("Kept page"));

        mockMvc.perform(get("/api/diaries/" + olderId).cookie(cookie("token-b")))
                .andExpect(status().isNotFound());

        String updatedAt = JsonPath.read(
                mockMvc.perform(get("/api/diaries/" + olderId).cookie(cookie("token-a")))
                        .andReturn().getResponse().getContentAsString(),
                "$.diary.updatedAt");

        mockMvc.perform(put("/api/diaries/" + olderId)
                .cookie(cookie("token-a"))
                .contentType(MediaType.APPLICATION_JSON)
                .content("{\"pinned\":true}"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.pinned").value(true))
                .andExpect(jsonPath("$.updatedAt").value(updatedAt));

        mockMvc.perform(get("/api/diaries").cookie(cookie("token-a")))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$[0]._id").value(olderId))
                .andExpect(jsonPath("$[1]._id").value(newerId));

        mockMvc.perform(put("/api/diaries/" + olderId)
                .cookie(cookie("token-a"))
                .contentType(MediaType.APPLICATION_JSON)
                .content("{\"title\":\"  Renamed   notes  \"}"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.title").value("Renamed notes"))
                .andExpect(jsonPath("$.pinned").value(true));

        mockMvc.perform(delete("/api/diaries/" + olderId).cookie(cookie("token-b")))
                .andExpect(status().isNotFound());

        mockMvc.perform(delete("/api/diaries/" + olderId).cookie(cookie("token-a")))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.success").value(true));

        mockMvc.perform(get("/api/diaries/" + olderId).cookie(cookie("token-a")))
                .andExpect(status().isNotFound());
        mockMvc.perform(get("/api/diaries/" + olderId + "/entries").cookie(cookie("token-a")))
                .andExpect(status().isNotFound());
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
