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

import jakarta.servlet.http.Cookie;

@SpringBootTest
@AutoConfigureMockMvc
@TestPropertySource(properties = {
        "spring.data.mongodb.uri=mongodb://127.0.0.1:27017/personal-diary-api-test",
        "spring.data.mongodb.database=personal-diary-api-test"
})
class DiaryApiTest {

    @Autowired
    private MockMvc mockMvc;

    @Autowired
    private MongoTemplate mongo;

    @AfterEach
    void clean() {
        mongo.getCollection("sessions").deleteMany(new Document());
        mongo.getCollection("diaries").deleteMany(new Document());
    }

    @Test
    void listsOnlyTheSignedInPersonsDiaries() throws Exception {
        org.junit.jupiter.api.Assertions.assertEquals("personal-diary-api-test", mongo.getDb().getName());
        saveSession("token-a", "user-a");
        saveSession("token-b", "user-b");

        mockMvc.perform(get("/api/diaries"))
                .andExpect(status().isUnauthorized());

        mockMvc.perform(post("/api/diaries")
                .cookie(new Cookie("next-auth.session-token", "token-a"))
                .contentType(MediaType.APPLICATION_JSON)
                .content("{\"title\":\"  Field   notes  \",\"description\":\"A book\",\"theme\":\"/textures/leather-texture.jpg\"}"))
                .andExpect(status().isCreated())
                .andExpect(jsonPath("$.title").value("Field notes"))
                .andExpect(jsonPath("$.userId").value("user-a"))
                .andExpect(jsonPath("$._id").isNotEmpty());

        mockMvc.perform(post("/api/diaries")
                .cookie(new Cookie("next-auth.session-token", "token-a"))
                .contentType(MediaType.APPLICATION_JSON)
                .content("{\"title\":\"no\"}"))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.error").value("Title must be at least 3 characters."));

        mockMvc.perform(get("/api/diaries").cookie(new Cookie("next-auth.session-token", "token-a")))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.length()").value(1))
                .andExpect(jsonPath("$[0].title").value("Field notes"));

        mockMvc.perform(get("/api/diaries").cookie(new Cookie("next-auth.session-token", "token-b")))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.length()").value(0));

        org.bson.types.ObjectId owner = new org.bson.types.ObjectId();
        mongo.getCollection("sessions").insertOne(new Document("sessionToken", "token-oid")
                .append("userId", owner)
                .append("expires", Date.from(Instant.now().plusSeconds(3600))));
        mockMvc.perform(post("/api/diaries")
                .cookie(new Cookie("next-auth.session-token", "token-oid"))
                .contentType(MediaType.APPLICATION_JSON)
                .content("{\"title\":\"Object diary\"}"))
                .andExpect(status().isCreated())
                .andExpect(jsonPath("$.userId").value(owner.toHexString()));
    }

    private void saveSession(String token, String userId) {
        mongo.getCollection("sessions").insertOne(new Document("sessionToken", token)
                .append("userId", userId)
                .append("expires", Date.from(Instant.now().plusSeconds(3600))));
    }
}
