import DOMPurify from "dompurify";

/** Tags allowed inside a manually edited document. */
export const ALLOWED_TAGS = [
  "p", "div", "span", "br", "strong", "b", "em", "i", "u",
  "h2", "h3", "table", "thead", "tbody", "tr", "th", "td",
  "ul", "ol", "li",
];

/** Attributes allowed inside a manually edited document. */
export const ALLOWED_ATTR = ["class", "style"];

/**
 * Sanitise HTML loaded from the database before rendering it into the preview.
 * Freshly captured HTML from our own preview does not need this.
 */
export function sanitizeDocumentHtml(html: string): string {
  return DOMPurify.sanitize(html, { ALLOWED_TAGS, ALLOWED_ATTR });
}

/**
 * Insert plain text at the current caret position inside a contentEditable host.
 * Used so that pastes from Word / Google Docs never bring foreign markup.
 */
export function insertPlainTextAtCaret(text: string, doc: Document = document): void {
  if (!text) return;
  const selection = doc.defaultView?.getSelection?.() ?? null;
  if (!selection || selection.rangeCount === 0) return;
  const range = selection.getRangeAt(0);
  range.deleteContents();

  const fragment = doc.createDocumentFragment();
  const lines = text.split(/\r\n|\r|\n/);
  lines.forEach((line, i) => {
    if (i > 0) fragment.appendChild(doc.createElement("br"));
    fragment.appendChild(doc.createTextNode(line));
  });
  const last = fragment.lastChild;
  range.insertNode(fragment);

  if (last) {
    const after = doc.createRange();
    after.setStartAfter(last);
    after.collapse(true);
    selection.removeAllRanges();
    selection.addRange(after);
  }
}

interface PasteLike {
  preventDefault: () => void;
  clipboardData: { getData: (type: string) => string } | null;
}

/** Paste handler: strips all formatting, inserting plain text only. */
export function handlePlainTextPaste(event: PasteLike, doc: Document = document): string {
  event.preventDefault();
  const text = event.clipboardData?.getData("text/plain") ?? "";
  insertPlainTextAtCaret(text, doc);
  return text;
}
