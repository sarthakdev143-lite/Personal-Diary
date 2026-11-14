package github.sarthakdev143.backend.repository;

import java.util.List;
import java.util.Optional;

import org.springframework.data.mongodb.repository.MongoRepository;
import org.springframework.stereotype.Repository;

import github.sarthakdev143.backend.model.Diary;

@Repository
public interface DiaryRepository extends MongoRepository<Diary, String> {
    List<Diary> findByUserIdOrderByUpdatedAtDescCreatedAtDesc(String userId);

    Optional<Diary> findByIdAndUserId(String id, String userId);
}
