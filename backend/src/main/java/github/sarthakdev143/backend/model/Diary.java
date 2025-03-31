package github.sarthakdev143.backend.model;

import java.util.List;

import org.springframework.data.annotation.CreatedDate;
import org.springframework.data.annotation.Id;
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
    private String userId;  
    private String title;  
    private List<Page> pages;  
    private boolean isPinned;
    private String theme;
    private String coverPictureUrl;
    private boolean isPublic;
    
    @CreatedDate
    private String createdDate;  
    
}
