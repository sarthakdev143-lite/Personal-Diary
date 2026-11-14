package github.sarthakdev143.backend.diary;

import java.time.Instant;
import java.util.Date;
import java.util.Optional;

import org.bson.Document;
import org.bson.types.ObjectId;
import org.springframework.data.mongodb.core.MongoTemplate;
import org.springframework.stereotype.Component;

import com.mongodb.client.model.Filters;

@Component
public class MongoSessionLookup {
    static final String COLLECTION = "sessions";

    private final MongoTemplate mongo;

    public MongoSessionLookup(MongoTemplate mongo) {
        this.mongo = mongo;
    }

    public Optional<String> userId(String token, Instant now) {
        if (token == null || token.isBlank()) {
            return Optional.empty();
        }
        Document session = mongo.getCollection(COLLECTION)
                .find(Filters.eq("sessionToken", token))
                .first();
        if (session == null) {
            return Optional.empty();
        }
        return SessionCheck.userId(text(session.get("userId")), expires(session.get("expires")), now);
    }

    private static String text(Object userId) {
        if (userId instanceof ObjectId objectId) {
            return objectId.toHexString();
        }
        return userId == null ? "" : userId.toString();
    }

    private static Instant expires(Object value) {
        if (value instanceof Date date) {
            return date.toInstant();
        }
        if (value instanceof Instant instant) {
            return instant;
        }
        return null;
    }
}
