// Turns a title into a URL slug: lowercase, ASCII letters and digits, single dashes.
export function slugify(title) {
  return String(title)
    .toLowerCase()
    .replace(/[^a-z0-9]/g, '-');
}
