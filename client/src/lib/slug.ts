export function toSlug(text: string): string {
  return text
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[đĐ]/g, "d")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

export function buildEventSlug(name: string, id: string): string {
  const base = toSlug(name);
  return base ? `${base}--${id}` : id;
}

export function parseEventIdFromSlug(slug: string): string {
  if (!slug) return "";
  const parts = slug.split("--");
  if (parts.length > 1) {
    return parts[parts.length - 1];
  }
  // Check if it's already a uuid
  return slug;
}
