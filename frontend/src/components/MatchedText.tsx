import { matchedTextParts } from "@/lib/diary/search";

export function MatchedText({ text, query, className }: { text: string; query: string; className?: string }) {
    return matchedTextParts(text, query).map((part, index) => (
        part.match
            ? <mark key={`${index}:${part.text}`} className={className}>{part.text}</mark>
            : <span key={`${index}:${part.text}`}>{part.text}</span>
    ));
}
