package github.sarthakdev143.backend.model;

import org.springframework.data.annotation.CreatedDate;
import org.springframework.data.annotation.Id;
import org.springframework.data.annotation.LastModifiedDate;
import org.springframework.data.mongodb.core.mapping.Document;

import lombok.AllArgsConstructor;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

import java.util.List;

@Document(collection = "pages")
@Setter
@Getter
@AllArgsConstructor
@NoArgsConstructor
public class Page {

    @Id
    private String id;
    private String diaryId;

    private String encryptedContent;  // Encrypted JSON structure

    private List<String> tags;  

    private int pageNumber; 
    
    @CreatedDate
    private String createdDate;

    @LastModifiedDate
    private String lastModifiedDate;  
}
