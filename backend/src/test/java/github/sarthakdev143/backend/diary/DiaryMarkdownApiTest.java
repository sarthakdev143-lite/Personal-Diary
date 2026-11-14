package github.sarthakdev143.backend.diary;

import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.content;
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
class DiaryMarkdownApiTest {

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
    void downloadsMarkdownForTheOwner() throws Exception {
        saveSession("token-a", "user-a");
        saveSession("token-b", "user-b");
        MvcResult created = mockMvc.perform(post("/api/diaries")
                .cookie(cookie("token-a"))
                .contentType(MediaType.APPLICATION_JSON)
                .content("{\"title\":\"Morning Pages\",\"description\":\"Quiet notes\"}"))
                .andExpect(status().isCreated())
                .andReturn();
        String diaryId = JsonPath.read(created.getResponse().getContentAsString(), "$._id");
        mockMvc.perform(post("/api/diaries/" + diaryId + "/entries")
                .cookie(cookie("token-a"))
                .contentType(MediaType.APPLICATION_JSON)
                .content("{\"content\":\"<p>Hello <strong>there</strong></p>\"}"))
                .andExpect(status().isCreated());

        mockMvc.perform(get("/api/diaries/" + diaryId + "/export")
                .param("format", "md")
                .cookie(cookie("token-a")))
                .andExpect(status().isOk())
                .andExpect(content().contentTypeCompatibleWith("text/markdown"))
                .andExpect(content().string(org.hamcrest.Matchers.containsString("# Morning Pages")))
                .andExpect(content().string(org.hamcrest.Matchers.containsString("Quiet notes")))
                .andExpect(content().string(org.hamcrest.Matchers.containsString("Hello **there**")));

        mockMvc.perform(get("/api/diaries/" + diaryId + "/export")
                .param("format", "pdf")
                .cookie(cookie("token-a")))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.error").value("Use format=md or format=json."));

        mockMvc.perform(get("/api/diaries/" + diaryId + "/export")
                .param("format", "md")
                .cookie(cookie("token-b")))
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
