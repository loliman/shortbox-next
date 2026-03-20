import DOMPurify from "dompurify";

const ALLOWED_TAGS = ["a", "b", "br", "em", "i", "li", "ol", "p", "strong", "u", "ul"];
const ALLOWED_ATTR = ["href", "target", "rel"];

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

function hardenLinks(html: string): string {
  if (typeof window === "undefined") return html;

  const template = document.createElement("template");
  template.innerHTML = html;

  for (const link of Array.from(template.content.querySelectorAll("a"))) {
    if (link.getAttribute("target") === "_blank") {
      link.setAttribute("rel", "noopener noreferrer nofollow");
    }
  }

  return template.innerHTML;
}

export function sanitizeHtml(input: string | null | undefined): string {
  if (!input) return "";

  if (typeof window === "undefined") {
    return escapeHtml(input);
  }

  const clean = DOMPurify.sanitize(input, {
    ALLOWED_TAGS,
    ALLOWED_ATTR,
    ALLOW_DATA_ATTR: false,
  });

  return hardenLinks(clean);
}
