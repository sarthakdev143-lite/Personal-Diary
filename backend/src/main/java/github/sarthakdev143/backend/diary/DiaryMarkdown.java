package github.sarthakdev143.backend.diary;

import java.text.Normalizer;
import java.time.Instant;
import java.time.ZoneId;
import java.time.format.DateTimeFormatter;
import java.time.format.DateTimeParseException;
import java.time.format.ResolverStyle;
import java.util.ArrayList;
import java.util.Comparator;
import java.util.List;
import java.util.Locale;
import java.util.regex.Matcher;
import java.util.regex.Pattern;

import org.jsoup.Jsoup;
import org.jsoup.nodes.Document;
import org.jsoup.nodes.Element;
import org.jsoup.nodes.Node;
import org.jsoup.nodes.TextNode;

import github.sarthakdev143.backend.model.Diary;
import github.sarthakdev143.backend.model.Entry;

public final class DiaryMarkdown {
    private static final int MAX_DATA_IMAGE_LENGTH = 220_000;
    private static final Pattern DATA_IMAGE = Pattern.compile(
            "^data:image/(png|jpeg|gif|webp);base64,[a-z0-9+/=\\s]+$",
            Pattern.CASE_INSENSITIVE);
    private static final Pattern DATE_HEADING = Pattern.compile("^<h2>([A-Za-z]+, [A-Za-z]+ \\d{1,2}, \\d{4})</h2>");
    private static final DateTimeFormatter LONG_DATE = DateTimeFormatter.ofPattern("EEEE, MMMM d, uuuu", Locale.US)
            .withResolverStyle(ResolverStyle.STRICT);
    private static final DateTimeFormatter ENTRY_LONG = DateTimeFormatter.ofPattern("EEEE, MMMM d, yyyy", Locale.US);

    private DiaryMarkdown() {
    }

    public static String htmlToMarkdown(String html) {
        if (html == null || html.isBlank()) {
            return "";
        }
        Document document = Jsoup.parseBodyFragment(html);
        document.outputSettings().prettyPrint(false);
        document.select("script, style").remove();
        PastedLines.lift(document);
        document.select("img").forEach(DiaryMarkdown::keepSafeImage);
        document.select("a").forEach(DiaryMarkdown::keepSafeLink);
        PictureCaptions.align(document);
        CodeLines.join(document);
        return renderBlocks(document.body().childNodes()).trim();
    }

    public static String diary(Diary diary, List<Entry> entries, ZoneId zone) {
        String title = diary.getTitle() == null || diary.getTitle().isBlank() ? "Diary" : diary.getTitle().trim();
        List<String> parts = new ArrayList<>();
        parts.add("# " + title);
        String description = diary.getDescription() == null ? "" : diary.getDescription().trim();
        if (!description.isEmpty()) {
            parts.add(description);
        }
        List<Entry> sorted = entries.stream()
                .sorted(Comparator.comparing(Entry::getCreatedAt, Comparator.nullsLast(Comparator.naturalOrder())))
                .toList();
        if (sorted.isEmpty()) {
            parts.add("_No entries yet._");
        } else {
            sorted.forEach(entry -> parts.add(entrySection(entry, zone)));
        }
        return String.join("\n\n", parts).trim() + "\n";
    }

    public static String filename(String title, String extension) {
        String slug = Normalizer.normalize(title == null ? "" : title, Normalizer.Form.NFKD)
                .replaceAll("\\p{M}", "")
                .toLowerCase(Locale.ROOT)
                .replaceAll("[^a-z0-9]+", "-")
                .replaceAll("^-+|-+$", "");
        if (slug.length() > 60) {
            slug = slug.substring(0, 60);
        }
        if (slug.isEmpty()) {
            slug = "diary";
        }
        return slug + "." + extension;
    }

    private static String entrySection(Entry entry, ZoneId zone) {
        String written = htmlToMarkdown(withoutGeneratedDateHeading(entry.getContent()));
        String body = written.isEmpty() ? "_Empty entry._" : written;
        return "## " + longDate(entry.getCreatedAt(), zone) + "\n\n" + body;
    }

    private static String withoutGeneratedDateHeading(String html) {
        if (html == null) {
            return "";
        }
        Matcher match = DATE_HEADING.matcher(html);
        if (!match.find()) {
            return html;
        }
        String label = match.group(1);
        try {
            var parsed = LONG_DATE.parse(label);
            String again = LONG_DATE.format(parsed);
            if (!again.equals(label)) {
                return html;
            }
        } catch (DateTimeParseException error) {
            return html;
        }
        return html.substring(match.end());
    }

    private static String longDate(Instant instant, ZoneId zone) {
        if (instant == null) {
            return "—";
        }
        return ENTRY_LONG.format(instant.atZone(zone));
    }

    private static void keepSafeImage(Element image) {
        String src = image.attr("src").trim();
        boolean data = src.startsWith("data:") && DATA_IMAGE.matcher(src).matches() && src.length() <= MAX_DATA_IMAGE_LENGTH;
        boolean remote = src.startsWith("http://") || src.startsWith("https://");
        if (!data && !remote) {
            image.remove();
        }
    }

    private static void keepSafeLink(Element link) {
        String href = link.attr("href").trim();
        if (!href.startsWith("http://") && !href.startsWith("https://") && !href.startsWith("mailto:")) {
            link.unwrap();
        }
    }

    private static int orderedItemNumber(Element list, List<Element> items, int index) {
        int number = wholeNumber(list.attr("start"), 1);
        int last = Math.max(0, index);
        for (int i = 0; i <= last && i < items.size(); i += 1) {
            String raw = items.get(i).attr("value").trim();
            if (raw.matches("-?\\d{1,9}")) {
                number = wholeNumber(raw, number);
            } else if (i > 0) {
                number += 1;
            }
        }
        return number;
    }

    private static int wholeNumber(String raw, int fallback) {
        String value = raw == null ? "" : raw.trim();
        if (!value.matches("-?\\d{1,9}")) {
            return fallback;
        }
        try {
            return Integer.parseInt(value);
        } catch (NumberFormatException error) {
            return fallback;
        }
    }

    private static boolean quoteIsInline(Element quote) {
        for (Node child : quote.childNodes()) {
            if (!(child instanceof Element element)) {
                continue;
            }
            String name = element.normalName();
            if (name.equals("p") || name.equals("div") || name.equals("section") || name.equals("article")
                    || name.equals("h1") || name.equals("h2") || name.equals("h3")
                    || name.equals("ul") || name.equals("ol") || name.equals("blockquote")
                    || name.equals("pre") || name.equals("hr") || name.equals("figure") || name.equals("table")) {
                return false;
            }
        }
        return true;
    }

    private static String renderBlocks(List<Node> nodes) {
        List<String> parts = new ArrayList<>();
        for (Node node : nodes) {
            if (node instanceof TextNode text) {
                String value = text.getWholeText().replaceAll("\\s+", " ").trim();
                if (!value.isEmpty()) {
                    parts.add(value);
                }
                continue;
            }
            if (!(node instanceof Element element)) {
                continue;
            }
            String tag = element.normalName();
            if (tag.equals("h1") || tag.equals("h2") || tag.equals("h3")) {
                String heading = renderInline(element.childNodes()).trim();
                if (!heading.isEmpty()) {
                    String level = tag.equals("h1") ? "#" : tag.equals("h2") ? "##" : "###";
                    parts.add(level + " " + heading);
                }
                continue;
            }
            if (tag.equals("p")) {
                String paragraph = renderInline(element.childNodes()).trim();
                if (!paragraph.isEmpty()) {
                    parts.add(paragraph);
                }
                continue;
            }
            if (tag.equals("blockquote")) {
                String inner = (quoteIsInline(element) ? renderInline(element.childNodes()) : renderBlocks(element.childNodes())).trim();
                if (!inner.isEmpty()) {
                    parts.add(inner.lines().map(line -> "> " + line).reduce((left, right) -> left + "\n" + right).orElse(""));
                }
                continue;
            }
            if (tag.equals("ul") || tag.equals("ol")) {
                List<Element> items = new ArrayList<>();
                for (Element item : element.children()) {
                    if (item.normalName().equals("li")) {
                        items.add(item);
                    }
                }
                List<String> lines = new ArrayList<>();
                for (int index = 0; index < items.size(); index += 1) {
                    Element item = items.get(index);
                    String marker = tag.equals("ul") ? "-" : orderedItemNumber(element, items, index) + ".";
                    String text = listItemBody(item, marker.length() + 1);
                    lines.add(marker + " " + text);
                }
                if (!lines.isEmpty()) {
                    parts.add(String.join("\n", lines));
                }
                continue;
            }
            if (tag.equals("pre")) {
                String code = textContent(element).replaceFirst("^\\n", "").replaceFirst("\\n$", "");
                parts.add("```\n" + code + "\n```");
                continue;
            }
            if (tag.equals("hr")) {
                parts.add("---");
                continue;
            }
            if (tag.equals("img")) {
                parts.add(renderInline(List.of(element)));
                continue;
            }
            if (tag.equals("figure")) {
                Element image = element.selectFirst("img");
                if (image != null) {
                    parts.add(renderInline(List.of(image)));
                    Element caption = element.selectFirst("figcaption");
                    if (caption != null && !caption.select("b, strong, i, em, u, s, strike, del, a, code").isEmpty()) {
                        String line = renderInline(caption.childNodes()).trim();
                        if (!line.isEmpty()) {
                            parts.add(line);
                        }
                    }
                    continue;
                }
            }
            String text = renderInline(List.of(element)).trim();
            if (!text.isEmpty()) {
                parts.add(text);
            }
        }
        return String.join("\n\n", parts);
    }

    private static boolean listBlock(String tag) {
        return tag.equals("p")
                || tag.equals("div")
                || tag.equals("section")
                || tag.equals("article")
                || tag.equals("h1")
                || tag.equals("h2")
                || tag.equals("h3")
                || tag.equals("ul")
                || tag.equals("ol")
                || tag.equals("blockquote")
                || tag.equals("pre")
                || tag.equals("hr")
                || tag.equals("figure")
                || tag.equals("table");
    }

    private static String listItemBody(Element item, int indent) {
        boolean block = false;
        for (Element child : item.children()) {
            if (listBlock(child.normalName())) {
                block = true;
                break;
            }
        }
        String text = (block ? renderBlocks(item.childNodes()) : renderInline(item.childNodes())).trim();
        String pad = " ".repeat(indent);
        String[] lines = text.split("\n", -1);
        StringBuilder body = new StringBuilder();
        for (int index = 0; index < lines.length; index += 1) {
            if (index > 0) {
                body.append('\n');
            }
            if (index > 0 && !lines[index].isEmpty()) {
                body.append(pad);
            }
            body.append(lines[index]);
        }
        return body.toString();
    }

    private static boolean isGap(char value) {
        return Character.isWhitespace(value) || value == '\u00a0';
    }

    private static String wrapInline(String inner, String open, String close) {
        String[] lines = inner.split("\n", -1);
        StringBuilder body = new StringBuilder();
        for (int index = 0; index < lines.length; index += 1) {
            if (index > 0) {
                body.append('\n');
            }
            body.append(wrapInlineLine(lines[index], open, close));
        }
        return body.toString();
    }

    private static String wrapInlineLine(String inner, String open, String close) {
        int start = 0;
        int end = inner.length();
        while (start < end && isGap(inner.charAt(start))) {
            start += 1;
        }
        while (end > start && isGap(inner.charAt(end - 1))) {
            end -= 1;
        }
        String core = inner.substring(start, end);
        if (core.isBlank()) {
            return inner;
        }
        return inner.substring(0, start) + open + core + close + inner.substring(end);
    }

    private static String wrapCode(String inner) {
        String[] lines = inner.split("\n", -1);
        StringBuilder body = new StringBuilder();
        for (int index = 0; index < lines.length; index += 1) {
            if (index > 0) {
                body.append('\n');
            }
            if (!lines[index].isEmpty()) {
                body.append('`').append(lines[index]).append('`');
            }
        }
        return body.toString();
    }

    private static String renderLink(String inner, String href) {
        String[] lines = inner.split("\n", -1);
        StringBuilder body = new StringBuilder();
        for (int index = 0; index < lines.length; index += 1) {
            if (index > 0) {
                body.append('\n');
            }
            body.append(linkLine(lines[index], href, lines.length == 1));
        }
        return body.toString();
    }

    private static String linkLine(String line, String href, boolean only) {
        int start = 0;
        int end = line.length();
        while (start < end && isGap(line.charAt(start))) {
            start += 1;
        }
        while (end > start && isGap(line.charAt(end - 1))) {
            end -= 1;
        }
        String label = line.substring(start, end);
        if (label.isEmpty()) {
            if (!only) {
                return line;
            }
            label = href;
        }
        label = label.replace("[", "").replace("]", "");
        return line.substring(0, start) + "[" + label + "](" + href + ")" + line.substring(end);
    }

    private static String renderInline(List<Node> nodes) {
        StringBuilder builder = new StringBuilder();
        for (Node node : nodes) {
            if (node instanceof TextNode text) {
                builder.append(text.getWholeText().replaceAll("\\s+", " "));
                continue;
            }
            if (!(node instanceof Element element)) {
                continue;
            }
            String tag = element.normalName();
            if (tag.equals("br")) {
                builder.append('\n');
                continue;
            }
            if (tag.equals("img")) {
                String alt = element.attr("alt").replace("[", "").replace("]", "");
                if (alt.isEmpty()) {
                    alt = "image";
                }
                String src = element.attr("src");
                builder.append(src.isEmpty() || src.startsWith("data:")
                        ? "![" + alt + "](image)"
                        : "![" + alt + "](" + src + ")");
                continue;
            }
            String inner = renderInline(element.childNodes());
            if (tag.equals("strong") || tag.equals("b")) {
                builder.append(wrapInline(inner, "**", "**"));
            } else if (tag.equals("em") || tag.equals("i")) {
                builder.append(wrapInline(inner, "*", "*"));
            } else if (tag.equals("s") || tag.equals("strike") || tag.equals("del")) {
                builder.append(wrapInline(inner, "~~", "~~"));
            } else if (tag.equals("u")) {
                builder.append(inner.isBlank() ? inner : wrapInline(inner, "<u>", "</u>"));
            } else if (tag.equals("code")) {
                builder.append(wrapCode(inner));
            } else if (tag.equals("a")) {
                String href = element.attr("href");
                builder.append(href.isEmpty() ? inner : renderLink(inner, href));
            } else {
                builder.append(inner);
            }
        }
        return builder.toString();
    }

    private static String textContent(Element element) {
        StringBuilder builder = new StringBuilder();
        for (Node node : element.childNodes()) {
            if (node instanceof TextNode text) {
                builder.append(text.getWholeText());
            } else if (node instanceof Element child) {
                builder.append(textContent(child));
            }
        }
        return builder.toString();
    }
}
