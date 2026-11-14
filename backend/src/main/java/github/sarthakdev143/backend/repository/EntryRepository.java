package github.sarthakdev143.backend.repository;

import java.util.List;

import org.springframework.data.mongodb.repository.MongoRepository;
import org.springframework.stereotype.Repository;

import github.sarthakdev143.backend.model.Entry;

@Repository
public interface EntryRepository extends MongoRepository<Entry, String> {
    List<Entry> findByDiaryIdAndUserIdOrderByCreatedAtDesc(String diaryId, String userId);
}
