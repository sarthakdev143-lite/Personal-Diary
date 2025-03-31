package github.sarthakdev143.backend.model;

import java.time.Instant;
import java.util.List;

import org.springframework.data.annotation.CreatedDate;
import org.springframework.data.annotation.Id;
import org.springframework.data.mongodb.core.index.Indexed;
import org.springframework.data.mongodb.core.mapping.Document;

import lombok.AllArgsConstructor;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

@Document(collection = "diaries")
@Setter
@Getter
@AllArgsConstructor
@NoArgsConstructor
public class Diary {

    @Id
    private String id;

    @Indexed
    private String userId;

    private String title;
    private List<Page> pages;

    private boolean pinned;  
    private String theme;
    private String coverPictureUrl;
    private boolean publicDiary;

    @CreatedDate
    private Instant createdDate;
}
