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
        document.select("img").forEach(DiaryMarkdown::keepSafeImage);
        document.select("a").forEach(DiaryMarkdown::keepSafeLink);
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
                String inner = renderBlocks(element.childNodes()).trim();
                if (!inner.isEmpty()) {
                    parts.add(inner.lines().map(line -> "> " + line).reduce((left, right) -> left + "\n" + right).orElse(""));
                }
                continue;
            }
            if (tag.equals("ul") || tag.equals("ol")) {
                List<String> lines = new ArrayList<>();
                int index = 1;
                for (Element item : element.children()) {
                    if (!item.normalName().equals("li")) {
                        continue;
                    }
                    String marker = tag.equals("ul") ? "-" : index + ".";
                    String text = renderInline(item.childNodes()).trim();
                    if (text.isEmpty()) {
                        text = renderBlocks(item.childNodes()).trim();
                    }
                    lines.add(marker + " " + text);
                    index += 1;
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
            String text = renderInline(List.of(element)).trim();
            if (!text.isEmpty()) {
                parts.add(text);
            }
        }
        return String.join("\n\n", parts);
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
                builder.append("**").append(inner).append("**");
            } else if (tag.equals("em") || tag.equals("i")) {
                builder.append("*").append(inner).append("*");
            } else if (tag.equals("s") || tag.equals("strike") || tag.equals("del")) {
                builder.append("~~").append(inner).append("~~");
            } else if (tag.equals("u")) {
                if (!inner.isEmpty()) {
                    builder.append("<u>").append(inner).append("</u>");
                }
            } else if (tag.equals("code")) {
                builder.append("`").append(inner).append("`");
            } else if (tag.equals("a")) {
                String href = element.attr("href");
                String label = inner.trim().isEmpty() ? href : inner.trim();
                label = label.replace("[", "").replace("]", "");
                if (!href.isEmpty()) {
                    builder.append("[").append(label).append("](").append(href).append(")");
                } else {
                    builder.append(inner);
                }
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
