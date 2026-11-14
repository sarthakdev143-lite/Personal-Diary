package github.sarthakdev143.backend.diary;

import java.util.ArrayList;
import java.util.Set;

import org.jsoup.nodes.Document;
import org.jsoup.nodes.Element;
import org.jsoup.nodes.Node;
import org.jsoup.nodes.TextNode;

final class PastedLines {
    private static final Set<String> BLOCKS = Set.of(
            "p", "div", "section", "article", "h1", "h2", "h3", "ul", "ol", "blockquote", "pre", "hr", "figure", "table");
    private static final Set<String> WRAPPERS = Set.of("div", "section", "article");

    private PastedLines() {
    }

    static void lift(Document document) {
        liftTables(document);
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

    private static void liftTables(Document document) {
        for (Element table : new ArrayList<>(document.select("table"))) {
            for (Element row : table.select("> tr, > thead > tr, > tbody > tr, > tfoot > tr")) {
                Element paragraph = new Element("p");
                for (Element cell : row.select("> td, > th")) {
                    appendCell(paragraph, cell);
                }
                if (paragraph.childNodeSize() > 0) {
                    table.before(paragraph);
                }
            }
            table.remove();
        }
    }

    private static void appendCell(Element paragraph, Element cell) {
        Element source = cell;
        if (source.children().size() == 1 && source.child(0).normalName().equals("p") && source.ownText().isBlank()) {
            source = source.child(0);
        }
        boolean meaningful = false;
        for (Node node : source.childNodes()) {
            if (node instanceof TextNode text) {
                if (!text.getWholeText().isBlank()) {
                    meaningful = true;
                }
            } else if (node instanceof Element element && !element.normalName().equals("br")) {
                meaningful = true;
            }
        }
        if (!meaningful) {
            return;
        }
        if (paragraph.childNodeSize() > 0) {
            paragraph.appendText(" ");
        }
        for (Node node : new ArrayList<>(source.childNodes())) {
            if (node instanceof TextNode text && text.getWholeText().isBlank()) {
                continue;
            }
            if (node instanceof Element element && element.normalName().equals("br")) {
                paragraph.appendText(" ");
                continue;
            }
            paragraph.appendChild(node.clone());
        }
    }
}
