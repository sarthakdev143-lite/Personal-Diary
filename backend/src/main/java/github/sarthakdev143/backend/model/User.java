package github.sarthakdev143.backend.model;

import java.time.Instant;

import org.springframework.data.annotation.CreatedDate;
import org.springframework.data.annotation.Id;
import org.springframework.data.annotation.LastModifiedDate;
import org.springframework.data.mongodb.core.index.Indexed;
import org.springframework.data.mongodb.core.mapping.Document;

import lombok.AllArgsConstructor;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

@Document(collection = "users")
@Setter
@Getter
@AllArgsConstructor
@NoArgsConstructor
public class User {

    @Id
    private String id;
    private String name;

    @Indexed(unique = true)
    private String email;

    private String password;
    private String profilePictureUrl;

    @CreatedDate
    private Instant createdDate;

    @LastModifiedDate
    private Instant lastModified;
}
