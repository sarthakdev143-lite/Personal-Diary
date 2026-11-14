package github.sarthakdev143.backend.model;

import java.time.Instant;

import org.springframework.data.annotation.CreatedDate;
import org.springframework.data.annotation.Id;
import org.springframework.data.mongodb.core.index.Indexed;
import org.springframework.data.mongodb.core.mapping.Document;

import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

@Document(collection = "diaries")
@Getter
@Setter
@NoArgsConstructor
public class Diary {

    @Id
    private String id;

    @Indexed
    private String userId;

    private String title;
    private String description;
    private String theme;
    private boolean pinned;

    @CreatedDate
    private Instant createdAt;

    private Instant updatedAt;
}
