import { Marked } from "marked";
import { sanitizeHTML } from "../../Chat/Components/Room/Message/WA-HTML-Sanitizer";

const marked = new Marked({ breaks: true, gfm: true });

/** NPC replies are markdown; sanitize before the template injects the HTML. */
export function renderMarkdown(text: string): string {
    return sanitizeHTML(marked.parse(text, { async: false }));
}
