import sanitizeHtml from "sanitize-html";
import { ApiError } from "@utils/ApiError";

const MAX_DESCRIPTION_BYTES = 100 * 1024;
const FONT_SIZES = /^(12|14|16|18|20|24|28|32)px$/;
const COLORS = /^(#[0-9a-fA-F]{6}|rgb\(\s*(?:\d{1,3}\s*,\s*){2}\d{1,3}\s*\))$/;

export function sanitizeEventDescription(value: unknown): string {
  if (typeof value !== "string") throw new ApiError(400, "description must be HTML text");
  if (Buffer.byteLength(value, "utf8") > MAX_DESCRIPTION_BYTES) {
    throw new ApiError(400, "description cannot exceed 100 KiB");
  }
  return sanitizeHtml(value, {
    allowedTags: ["p", "br", "strong", "em", "u", "s", "h1", "h2", "h3", "ul", "ol", "li", "a", "span"],
    allowedAttributes: { a: ["href", "target", "rel"], span: ["style"] },
    allowedSchemes: ["http", "https", "mailto"],
    allowProtocolRelative: false,
    allowedStyles: { span: { "font-size": [FONT_SIZES], color: [COLORS] } },
    transformTags: {
      a: (_tagName, attribs) => ({
        tagName: "a",
        attribs: { href: attribs.href ?? "", target: "_blank", rel: "noopener noreferrer" },
      }),
    },
  });
}

export function eventDescriptionPreview(html: string, maxLength = 360): string {
  const text = sanitizeHtml(
    html.replace(/<br\s*\/?>|<\/(?:p|h[1-3]|li)>/gi, " "),
    {
      allowedTags: [],
      allowedAttributes: {},
    },
  )
    .replace(/&nbsp;/gi, " ")
    .replace(/&amp;/gi, "&")
    .replace(/&lt;/gi, "<")
    .replace(/&gt;/gi, ">")
    .replace(/&quot;/gi, '"')
    .replace(/&#39;/gi, "'")
    .replace(/\s+/g, " ")
    .trim();
  const characters = Array.from(text);
  return characters.length > maxLength
    ? `${characters.slice(0, maxLength).join("").trimEnd()}...`
    : text;
}
