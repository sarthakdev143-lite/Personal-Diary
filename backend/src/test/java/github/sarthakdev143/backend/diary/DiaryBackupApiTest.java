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
class DiaryBackupApiTest {

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
    void exportsABackupAndImportsItForTheSamePerson() throws Exception {
        saveSession("token-a", "user-a");
        saveSession("token-b", "user-b");
        String diaryId = create("token-a", "Pinned Pages");
        mockMvc.perform(put("/api/diaries/" + diaryId)
                .cookie(cookie("token-a"))
                .contentType(MediaType.APPLICATION_JSON)
                .content("{\"pinned\":true}"))
                .andExpect(status().isOk());
        mockMvc.perform(post("/api/diaries/" + diaryId + "/entries")
                .cookie(cookie("token-a"))
                .contentType(MediaType.APPLICATION_JSON)
                .content("{\"content\":\"<p>Kept in the backup.</p>\"}"))
                .andExpect(status().isCreated());

        MvcResult exported = mockMvc.perform(get("/api/diaries/" + diaryId + "/export")
                .param("format", "json")
                .cookie(cookie("token-a")))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.format").value("personal-diary-backup"))
                .andExpect(jsonPath("$.version").value(1))
                .andExpect(jsonPath("$.diary.title").value("Pinned Pages"))
                .andExpect(jsonPath("$.diary.pinned").value(true))
                .andExpect(jsonPath("$.entries.length()").value(1))
                .andExpect(jsonPath("$.entries[0].content").value("<p>Kept in the backup.</p>"))
                .andReturn();

        mockMvc.perform(get("/api/diaries/" + diaryId + "/export").cookie(cookie("token-b")))
                .andExpect(status().isNotFound());

        mockMvc.perform(post("/api/diaries/import")
                .cookie(cookie("token-a"))
                .contentType(MediaType.APPLICATION_JSON)
                .content("{\"hello\":\"no\"}"))
                .andExpect(status().isBadRequest());

        String backup = exported.getResponse().getContentAsString();
        MvcResult imported = mockMvc.perform(post("/api/diaries/import")
                .cookie(cookie("token-a"))
                .contentType(MediaType.APPLICATION_JSON)
                .content(backup))
                .andExpect(status().isCreated())
                .andExpect(jsonPath("$.diary.title").value("Pinned Pages"))
                .andExpect(jsonPath("$.diary.pinned").value(true))
                .andExpect(jsonPath("$.importedEntries").value(1))
                .andExpect(jsonPath("$.skippedEntries").value(0))
                .andReturn();
        String copyId = JsonPath.read(imported.getResponse().getContentAsString(), "$.diary._id");

        mockMvc.perform(get("/api/diaries/" + copyId).cookie(cookie("token-a")))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.entries.length()").value(1))
                .andExpect(jsonPath("$.entries[0].plainText").value("Kept in the backup."));

        mockMvc.perform(get("/api/diaries").cookie(cookie("token-b")))
                .andExpect(jsonPath("$.length()").value(0));

        mockMvc.perform(post("/api/diaries/import")
                .cookie(cookie("token-a"))
                .contentType(MediaType.APPLICATION_JSON)
                .content("""
                        {"format":"personal-diary-backup","version":1,"diary":{"title":"Script notes","pinned":"yes"},"entries":[
                          {"content":"<script>alert(1)</script>","createdAt":"2026-01-01T00:00:00.000Z"},
                          {"content":"<p>Hello <strong>there</strong></p><script>alert(1)</script>","createdAt":"2026-01-02T00:00:00.000Z"}
                        ]}
                        """))
                .andExpect(status().isCreated())
                .andExpect(jsonPath("$.diary.pinned").value(false))
                .andExpect(jsonPath("$.importedEntries").value(1))
                .andExpect(jsonPath("$.skippedEntries").value(1));

        mockMvc.perform(post("/api/diaries/import")
                .cookie(cookie("token-a"))
                .contentType(MediaType.APPLICATION_JSON)
                .content("""
                        {"format":"personal-diary-backup","version":1,"diary":{"title":"Older backup"},"entries":[]}
                        """))
                .andExpect(status().isCreated())
                .andExpect(jsonPath("$.diary.pinned").value(false))
                .andExpect(jsonPath("$.importedEntries").value(0));
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
