// Lettere che NFKD non scompone (es. Oakley Sphæra).
const SPECIAL: Record<string, string> = { æ: "ae", œ: "oe", ø: "o", ß: "ss", đ: "d", ł: "l" };

export function slugify(input: string): string {
  return input
    .toLowerCase()
    .replace(/[æœøßđł]/g, (c) => SPECIAL[c])
    .normalize("NFKD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}
