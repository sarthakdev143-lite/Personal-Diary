package github.sarthakdev143.backend.repository;

import org.springframework.data.mongodb.repository.MongoRepository;
import org.springframework.stereotype.Repository;

import github.sarthakdev143.backend.model.User;

@Repository
public interface UserRepository extends MongoRepository<User, String> {
}
