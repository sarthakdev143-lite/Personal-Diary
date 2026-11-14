package github.sarthakdev143.backend.service;

public class DiaryMissingException extends RuntimeException {
    public DiaryMissingException() {
        super("Diary not found");
    }
}
