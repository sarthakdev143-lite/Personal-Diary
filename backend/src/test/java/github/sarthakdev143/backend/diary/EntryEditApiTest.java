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
class EntryEditApiTest {

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
    void editsAndDeletesAnEntryForItsOwner() throws Exception {
        saveSession("token-a", "user-a");
        saveSession("token-b", "user-b");
        String diaryId = id(mockMvc.perform(post("/api/diaries")
                .cookie(cookie("token-a"))
                .contentType(MediaType.APPLICATION_JSON)
                .content("{\"title\":\"Field notes\"}"))
                .andExpect(status().isCreated())
                .andReturn());
        String entryId = id(mockMvc.perform(post("/api/diaries/" + diaryId + "/entries")
                .cookie(cookie("token-a"))
                .contentType(MediaType.APPLICATION_JSON)
                .content("{\"content\":\"<p>Hello</p>\"}"))
                .andExpect(status().isCreated())
                .andReturn());

        mockMvc.perform(put("/api/diaries/" + diaryId + "/entries/" + entryId)
                .cookie(cookie("token-a"))
                .contentType(MediaType.APPLICATION_JSON)
                .content("{\"content\":\"<p>Hello <strong>again</strong></p>\"}"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.plainText").value("Hello again"))
                .andExpect(jsonPath("$._id").value(entryId));

        mockMvc.perform(put("/api/diaries/" + diaryId + "/entries/" + entryId)
                .cookie(cookie("token-b"))
                .contentType(MediaType.APPLICATION_JSON)
                .content("{\"content\":\"<p>Stolen</p>\"}"))
                .andExpect(status().isNotFound());

        mockMvc.perform(delete("/api/diaries/" + diaryId + "/entries/" + entryId)
                .cookie(cookie("token-b")))
                .andExpect(status().isNotFound());

        mockMvc.perform(delete("/api/diaries/" + diaryId + "/entries/" + entryId)
                .cookie(cookie("token-a")))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.success").value(true));

        mockMvc.perform(get("/api/diaries/" + diaryId + "/entries").cookie(cookie("token-a")))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.length()").value(0));
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
