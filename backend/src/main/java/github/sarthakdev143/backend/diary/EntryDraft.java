package github.sarthakdev143.backend.diary;

import org.jsoup.Jsoup;
import org.jsoup.nodes.Document;
import org.jsoup.nodes.Element;
import org.jsoup.safety.Safelist;

public sealed interface EntryDraft permits EntryDraft.Ready, EntryDraft.Rejected {

    int CONTENT_MAX = 400_000;

    record Ready(String content, String plainText) implements EntryDraft {
    }

    record Rejected(String error) implements EntryDraft {
    }

    static EntryDraft prepare(String input) {
        if (input == null) {
            return new Rejected("Content is required.");
        }
        if (input.length() > CONTENT_MAX) {
            return new Rejected("Entry is too large. Use fewer or smaller images.");
        }

        Document document = Jsoup.parseBodyFragment(Jsoup.clean(input, safelist()));
        document.outputSettings().prettyPrint(false);
        document.select("img").forEach(EntryDraft::keepSafeImage);
        String content = document.body().html().trim();
        if (content.length() > CONTENT_MAX) {
            return new Rejected("Entry is too large. Use fewer or smaller images.");
        }

        String plainText = plainText(document);
        boolean hasImage = !document.select("img[src]").isEmpty();
        if (plainText.isEmpty() && !hasImage) {
            return new Rejected("Content is required.");
        }
        return new Ready(content, plainText.isEmpty() ? "Image" : plainText);
    }

    private static void keepSafeImage(Element image) {
        String src = image.attr("src").trim();
        if (!src.startsWith("https://") && !src.startsWith("http://")) {
            image.remove();
            return;
        }
        String alt = image.attr("alt").trim().replaceAll("\\s+", " ");
        image.clearAttributes();
        image.attr("src", src);
        if (!alt.isEmpty()) {
            image.attr("alt", alt.length() > 180 ? alt.substring(0, 180) : alt);
        }
    }

    private static String plainText(Document document) {
        String text = document.text().replaceAll("\\s+", " ").trim();
        String alts = document.select("img[alt]").eachAttr("alt").stream()
                .map(String::trim)
                .filter(alt -> !alt.isEmpty() && !text.contains(alt))
                .reduce((left, right) -> left + " " + right)
                .orElse("");
        if (alts.isEmpty()) {
            return text;
        }
        return (text + " " + alts).trim();
    }

    private static Safelist safelist() {
        return Safelist.none()
                .addTags("h1", "h2", "h3", "p", "br", "strong", "b", "em", "i", "u", "s", "strike", "del",
                        "ul", "ol", "li", "blockquote", "hr", "pre", "code", "a", "img")
                .addAttributes("a", "href")
                .addAttributes("img", "src", "alt")
                .addProtocols("a", "href", "http", "https", "mailto")
                .addProtocols("img", "src", "http", "https");
    }
}
