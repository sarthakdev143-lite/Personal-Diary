package github.sarthakdev143.backend.repository;

import org.springframework.data.mongodb.repository.MongoRepository;
import org.springframework.stereotype.Repository;

import github.sarthakdev143.backend.model.Diary;

@Repository
public interface DiaryRepository extends MongoRepository<Diary, String> {
}
