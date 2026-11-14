package github.sarthakdev143.backend.diary;

import java.util.ArrayList;

import org.jsoup.nodes.Document;
import org.jsoup.nodes.Element;
import org.jsoup.nodes.Node;
import org.jsoup.nodes.TextNode;

final class PictureCaptions {
    private PictureCaptions() {
    }

    static void align(Document document) {
        for (Element figure : document.select("figure")) {
            Element image = figure.selectFirst("img");
            if (image == null) {
                figure.remove();
                continue;
            }
            Element caption = figure.selectFirst("figcaption");
            if (caption == null) {
                figure.unwrap();
                continue;
            }
            liftLooseText(figure, image);
            String name = caption.text().replaceAll("\\s+", " ").trim();
            if (name.length() > 180) {
                name = name.substring(0, 180);
            }
            if (name.isEmpty()) {
                image.removeAttr("alt");
                figure.select("figcaption").remove();
                figure.unwrap();
                continue;
            }
            image.attr("alt", name);
            caption.text(name);
            for (Element extra : figure.select("figcaption")) {
                if (extra != caption) {
                    extra.remove();
                }
            }
        }
    }

    private static void liftLooseText(Element figure, Element image) {
        StringBuilder before = new StringBuilder();
        StringBuilder after = new StringBuilder();
        boolean seenImage = false;
        for (Node child : new ArrayList<>(figure.childNodes())) {
            if (child == image) {
                seenImage = true;
                continue;
            }
            if (child instanceof Element element && element.normalName().equals("figcaption")) {
                continue;
            }
            String text = child instanceof TextNode textNode
                    ? textNode.getWholeText()
                    : child instanceof Element element ? element.text() : "";
            child.remove();
            StringBuilder target = seenImage ? after : before;
            String piece = text.replaceAll("\\s+", " ").trim();
            if (!piece.isEmpty()) {
                if (!target.isEmpty()) {
                    target.append(' ');
                }
                target.append(piece);
            }
        }
        if (!before.isEmpty()) {
            figure.before(new Element("p").text(before.toString()));
        }
        if (!after.isEmpty()) {
            figure.after(new Element("p").text(after.toString()));
        }
    }
}
