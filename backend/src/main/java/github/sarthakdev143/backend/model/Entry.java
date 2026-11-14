package github.sarthakdev143.backend.model;

import java.time.Instant;

import org.springframework.data.annotation.Id;
import org.springframework.data.mongodb.core.index.Indexed;
import org.springframework.data.mongodb.core.mapping.Document;

import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

@Document(collection = "entries")
@Getter
@Setter
@NoArgsConstructor
public class Entry {

    @Id
    private String id;

    @Indexed
    private String diaryId;

    @Indexed
    private String userId;

    private String content;
    private String plainText;
    private Instant createdAt;
    private Instant updatedAt;
}
