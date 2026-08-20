import { describe, it, expect, vi } from "vitest";
import {
  sanitizeDocumentHtml,
  insertPlainTextAtCaret,
  handlePlainTextPaste,
} from "@/lib/documentHtml";

describe("sanitizeDocumentHtml", () => {
  it("keeps allowed document markup", () => {
    const html =
      '<div class="a"><h2>Umowa</h2><p style="text-align:center">Tekst <strong>gruby</strong><br><em>i</em></p>' +
      "<table><thead><tr><th>A</th></tr></thead><tbody><tr><td>B</td></tr></tbody></table>" +
      "<ul><li>x</li></ul></div>";
    const out = sanitizeDocumentHtml(html);
    expect(out).toContain("<h2>Umowa</h2>");
    expect(out).toContain("<strong>gruby</strong>");
    expect(out).toContain("<td>B</td>");
    expect(out).toContain('class="a"');
    expect(out).toContain("style=");
  });

  it("strips scripts, event handlers and disallowed tags", () => {
    const out = sanitizeDocumentHtml(
      '<p onclick="steal()">Hej</p><script>alert(1)</script><img src="x" onerror="x"><a href="http://e.vil">l</a>'
    );
    expect(out).not.toContain("script");
    expect(out).not.toContain("onclick");
    expect(out).not.toContain("<img");
    expect(out).not.toContain("<a");
    expect(out).toContain("<p>Hej</p>");
  });
});

describe("plain-text paste", () => {
  it("inserts only plain text at the caret and prevents default", () => {
    const host = document.createElement("div");
    host.contentEditable = "true";
    host.textContent = "";
    document.body.appendChild(host);

    const range = document.createRange();
    range.selectNodeContents(host);
    range.collapse(false);
    const sel = window.getSelection()!;
    sel.removeAllRanges();
    sel.addRange(range);

    const preventDefault = vi.fn();
    const text = handlePlainTextPaste({
      preventDefault,
      clipboardData: {
        getData: (type: string) =>
          type === "text/plain" ? "Zdanie pierwsze\nZdanie drugie" : "<b>bold</b>",
      },
    });

    expect(preventDefault).toHaveBeenCalled();
    expect(text).toBe("Zdanie pierwsze\nZdanie drugie");
    expect(host.textContent).toBe("Zdanie pierwszeZdanie drugie");
    expect(host.innerHTML).not.toContain("<b>");
    expect(host.innerHTML).toContain("<br>");
    host.remove();
  });

  it("does nothing when there is no text", () => {
    const preventDefault = vi.fn();
    expect(() =>
      handlePlainTextPaste({ preventDefault, clipboardData: { getData: () => "" } })
    ).not.toThrow();
    expect(preventDefault).toHaveBeenCalled();
  });

  it("is a no-op without a selection", () => {
    window.getSelection()?.removeAllRanges();
    expect(() => insertPlainTextAtCaret("abc")).not.toThrow();
  });
});
