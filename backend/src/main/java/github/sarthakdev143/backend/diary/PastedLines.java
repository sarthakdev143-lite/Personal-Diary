package github.sarthakdev143.backend.diary;

import java.util.ArrayList;
import java.util.Set;

import org.jsoup.nodes.Document;
import org.jsoup.nodes.Element;

final class PastedLines {
    private static final Set<String> BLOCKS = Set.of(
            "p", "div", "section", "article", "h1", "h2", "h3", "ul", "ol", "blockquote", "pre", "hr", "figure", "table");
    private static final Set<String> WRAPPERS = Set.of("div", "section", "article");

    private PastedLines() {
    }

    static void lift(Document document) {
        ArrayList<Element> wrappers = new ArrayList<>(document.select("div, section, article"));
        for (int index = wrappers.size() - 1; index >= 0; index -= 1) {
            Element wrapper = wrappers.get(index);
            if (!WRAPPERS.contains(wrapper.normalName())) {
                continue;
            }
            boolean hasBlock = false;
            for (Element child : wrapper.children()) {
                if (BLOCKS.contains(child.normalName())) {
                    hasBlock = true;
                    break;
                }
            }
            if (hasBlock) {
                wrapper.unwrap();
                continue;
            }
            wrapper.clearAttributes();
            wrapper.tagName("p");
            if (wrapper.text().isBlank() && wrapper.select("br, img").isEmpty()) {
                wrapper.appendElement("br");
            }
        }
    }
}
