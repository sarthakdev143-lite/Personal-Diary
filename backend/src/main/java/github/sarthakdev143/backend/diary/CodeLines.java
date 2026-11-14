package github.sarthakdev143.backend.diary;

import java.util.ArrayList;

import org.jsoup.nodes.Document;
import org.jsoup.nodes.Element;
import org.jsoup.nodes.Node;
import org.jsoup.nodes.TextNode;

final class CodeLines {
    private CodeLines() {
    }

    static void join(Document document) {
        ArrayList<Element> blocks = new ArrayList<>(document.select("pre"));
        for (int index = blocks.size() - 1; index >= 0; index -= 1) {
            join(blocks.get(index));
        }
    }

    private static void join(Element pre) {
        StringBuilder text = new StringBuilder();
        for (Node node : new ArrayList<>(pre.childNodes())) {
            if (node instanceof TextNode textNode) {
                text.append(textNode.getWholeText());
                continue;
            }
            if (!(node instanceof Element child)) {
                continue;
            }
            if (child.normalName().equals("br")) {
                text.append('\n');
                continue;
            }
            if (child.normalName().equals("code") && text.length() > 0 && text.charAt(text.length() - 1) != '\n') {
                text.append('\n');
            }
            text.append(rawText(child));
        }
        String joined = text.toString().replace("\u200b", "").replaceAll("\\n+$", "");
        pre.empty();
        pre.appendElement("code").text(joined);
    }

    private static String rawText(Element element) {
        StringBuilder text = new StringBuilder();
        for (Node node : element.childNodes()) {
            if (node instanceof TextNode textNode) {
                text.append(textNode.getWholeText());
            } else if (node instanceof Element child) {
                text.append(child.normalName().equals("br") ? "\n" : rawText(child));
            }
        }
        return text.toString();
    }
}
