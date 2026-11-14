package github.sarthakdev143.backend.diary;

import org.jsoup.nodes.Document;
import org.jsoup.nodes.Element;

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
}
