package github.sarthakdev143.backend.service;

public class EntryMissingException extends RuntimeException {
    public EntryMissingException() {
        super("Entry not found");
    }
}
