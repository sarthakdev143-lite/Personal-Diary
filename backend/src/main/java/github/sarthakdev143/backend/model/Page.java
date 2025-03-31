package github.sarthakdev143.backend.model;

import org.springframework.data.annotation.CreatedDate;
import org.springframework.data.annotation.Id;
import org.springframework.data.annotation.LastModifiedDate;
import org.springframework.data.mongodb.core.index.Indexed;
import org.springframework.data.mongodb.core.mapping.Document;

import lombok.AllArgsConstructor;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

import java.time.Instant;
import java.util.List;

@Document(collection = "pages")
@Setter
@Getter
@AllArgsConstructor
@NoArgsConstructor
public class Page {

    @Id
    private String id;

    @Indexed
    private String diaryId;

    private String encryptedContent;  
    private List<String> tags;
    private int pageNumber;  

    @CreatedDate
    private Instant createdDate;

    @LastModifiedDate
    private Instant lastModifiedDate;  
}
