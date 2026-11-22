export function snapshotPage(expectedUrl: string) {
  if (location.href !== expectedUrl || !document.body) return null;
  const modal = document.querySelector<HTMLElement>(
    'dialog:modal, [aria-modal="true"]',
  );
  if (modal?.checkVisibility({ checkVisibilityCSS: true, checkOpacity: true }))
    return null;

  // Chrome serializes this function into the tab, so it must be self-contained.
  const snapshot = document.implementation.createHTMLDocument(
    document.title.slice(0, 500),
  );
  const containers = new Set([
    "article",
    "main",
    "section",
    "div",
    "p",
    "header",
    "span",
    "a",
    "b",
    "strong",
    "em",
    "i",
    "time",
    "br",
    "h1",
    "h2",
    "h3",
    "h4",
    "h5",
    "h6",
    "pre",
    "code",
    "blockquote",
    "ul",
    "ol",
    "li",
    "dl",
    "dt",
    "dd",
    "table",
    "thead",
    "tbody",
    "tr",
    "th",
    "td",
    "figure",
    "figcaption",
  ]);
  const excluded = [
    "script",
    "style",
    "noscript",
    "template",
    "iframe",
    "object",
    "embed",
    "svg",
    "math",
    "img",
    "audio",
    "video",
    "canvas",
    "nav",
    "footer",
    "aside",
    "form",
    "input",
    "textarea",
    "button",
    "select",
    "dialog",
    "[contenteditable]",
    "[hidden]",
    '[aria-hidden="true"]',
    '[role="dialog"]',
    '[role="navigation"]',
  ].join(",");
  let nodesLeft = 8000;
  let textLeft = 120_000;

  function copyChildren(source: Node, parent: HTMLElement, depth: number) {
    if (depth > 64) return;
    for (const node of source.childNodes) {
      if (nodesLeft-- <= 0 || textLeft <= 0) break;
      if (node.nodeType === Node.TEXT_NODE) {
        const text = node.textContent?.slice(0, textLeft) ?? "";
        textLeft -= text.length;
        parent.append(text);
        continue;
      }
      if (!(node instanceof HTMLElement) || node.matches(excluded)) continue;
      const style = getComputedStyle(node);
      if (
        style.display === "none" ||
        style.visibility === "hidden" ||
        style.visibility === "collapse" ||
        style.opacity === "0"
      )
        continue;

      if (!containers.has(node.localName)) {
        copyChildren(node, parent, depth + 1);
        continue;
      }
      const clean = snapshot.createElement(node.localName);
      // Preserve signals for Readability without copying URLs, styles or handlers.
      for (const name of ["class", "id"]) {
        const value = node.getAttribute(name);
        if (value) clean.setAttribute(name, value.slice(0, 120));
      }
      if (node.getAttribute("rel") === "author")
        clean.setAttribute("rel", "author");
      parent.append(clean);
      copyChildren(node, clean, depth + 1);
    }
  }

  copyChildren(document.body, snapshot.body, 0);
  const author = document.querySelector<HTMLMetaElement>(
    'meta[name="author" i]',
  );
  return {
    html: snapshot.documentElement.outerHTML,
    author: author?.content.slice(0, 250),
  };
}
