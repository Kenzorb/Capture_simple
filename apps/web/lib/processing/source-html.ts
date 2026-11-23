import {
  defaultTreeAdapter,
  parse,
  type DefaultTreeAdapterTypes,
} from "parse5";

const ignored = new Set([
  "aside",
  "button",
  "dialog",
  "footer",
  "form",
  "head",
  "iframe",
  "nav",
  "noscript",
  "script",
  "style",
  "svg",
  "template",
]);
const blocks = new Set([
  "article",
  "blockquote",
  "br",
  "div",
  "figcaption",
  "h1",
  "h2",
  "h3",
  "h4",
  "h5",
  "h6",
  "li",
  "main",
  "p",
  "pre",
  "section",
  "tr",
]);

export function readableHtml(html: string) {
  const document = parse(html);
  const fragments: string[] = [];
  const pending: Array<DefaultTreeAdapterTypes.Node | string> = [document];
  while (pending.length) {
    const node = pending.pop()!;
    if (typeof node === "string") {
      fragments.push(node);
    } else if (defaultTreeAdapter.isTextNode(node)) {
      fragments.push(node.value.replace(/\s+/g, " "));
    } else if ("childNodes" in node) {
      const element = defaultTreeAdapter.isElementNode(node) ? node : null;
      if (
        element &&
        (ignored.has(element.tagName) ||
          element.attrs.some(
            ({ name, value }) =>
              name === "hidden" || (name === "aria-hidden" && value === "true"),
          ))
      )
        continue;

      const separates = element && blocks.has(element.tagName);
      if (separates) {
        fragments.push("\n");
        pending.push("\n");
      }
      for (let i = node.childNodes.length - 1; i >= 0; i--)
        pending.push(node.childNodes[i]);
    }
  }
  return fragments.join("");
}
