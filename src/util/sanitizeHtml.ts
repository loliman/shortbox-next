import DOMPurify from "dompurify";
import { load } from "cheerio";

const ALLOWED_TAGS = ["a", "b", "br", "em", "i", "li", "ol", "p", "strong", "u", "ul"];
const ALLOWED_ATTR = ["href", "target", "rel"];
const ALLOWED_TAG_SET = new Set(ALLOWED_TAGS);
const ALLOWED_ATTR_SET = new Set(ALLOWED_ATTR);

function hardenLinks(html: string): string {
  if (typeof globalThis.window === "undefined") return html;

  const template = document.createElement("template");
  template.innerHTML = html;

  for (const link of Array.from(template.content.querySelectorAll("a"))) {
    if (link.getAttribute("target") === "_blank") {
      link.setAttribute("rel", "noopener noreferrer nofollow");
    }
  }

  return template.innerHTML;
}

function sanitizeHtmlOnServer(input: string): string {
  const $ = load(`<body>${input}</body>`);

  $("body *").each((_, element) => {
    const tagName = element.tagName?.toLowerCase();
    if (!tagName) return;

    if (!ALLOWED_TAG_SET.has(tagName)) {
      $(element).replaceWith($(element).contents());
      return;
    }

    const attributes = Object.keys(element.attribs || {});
    for (const attr of attributes) {
      if (!ALLOWED_ATTR_SET.has(attr)) {
        $(element).removeAttr(attr);
      }
    }

    if (tagName === "a") {
      const href = $(element).attr("href");
      if (!href) {
        $(element).replaceWith($(element).contents());
        return;
      }

      const target = $(element).attr("target");
      if (target === "_blank") {
        $(element).attr("rel", "noopener noreferrer nofollow");
      } else {
        $(element).removeAttr("target");
        $(element).removeAttr("rel");
      }
    }
  });

  return $("body").html() || "";
}

export function sanitizeHtml(input: string | null | undefined): string {
  if (!input) return "";

  if (typeof globalThis.window === "undefined") {
    return sanitizeHtmlOnServer(input);
  }

  const clean = DOMPurify.sanitize(input, {
    ALLOWED_TAGS,
    ALLOWED_ATTR,
    ALLOW_DATA_ATTR: false,
  });

  return hardenLinks(clean);
}
