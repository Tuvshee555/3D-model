// Minimal CSV parser supporting quoted fields, escaped quotes ("") and commas.
export function parseCsv(text: string): string[][] {
  const rows: string[][] = [];
  let row: string[] = [];
  let field = "";
  let inQuotes = false;

  for (let i = 0; i < text.length; i++) {
    const c = text[i];
    if (inQuotes) {
      if (c === '"') {
        if (text[i + 1] === '"') {
          field += '"';
          i++;
        } else {
          inQuotes = false;
        }
      } else {
        field += c;
      }
    } else if (c === '"') {
      inQuotes = true;
    } else if (c === ",") {
      row.push(field);
      field = "";
    } else if (c === "\n" || c === "\r") {
      if (c === "\r" && text[i + 1] === "\n") i++;
      row.push(field);
      rows.push(row);
      row = [];
      field = "";
    } else {
      field += c;
    }
  }
  // Flush the final field/row if the file doesn't end with a newline.
  if (field.length > 0 || row.length > 0) {
    row.push(field);
    rows.push(row);
  }
  return rows.filter((r) => r.some((cell) => cell.trim() !== ""));
}

export type CsvGarmentRow = {
  name: string;
  description: string;
  category: string;
  photoUrl: string | null;
  productUrl: string | null;
};

/**
 * Maps CSV rows to garment fields using the header row. Recognised headers:
 * name, description, category, photo_url (or image), product_url (or url).
 */
export function csvToGarments(rows: string[][]): CsvGarmentRow[] {
  if (rows.length < 2) return [];
  const header = rows[0].map((h) => h.trim().toLowerCase());
  const idx = (names: string[]) =>
    header.findIndex((h) => names.includes(h));

  const iName = idx(["name", "title"]);
  const iDesc = idx(["description", "desc"]);
  const iCat = idx(["category", "type"]);
  const iPhoto = idx(["photo_url", "image", "image_url", "photo"]);
  const iUrl = idx(["product_url", "url", "link"]);

  const valid = new Set(["top", "dress", "outerwear"]);

  return rows
    .slice(1)
    .map((r) => {
      const name = (iName >= 0 ? r[iName] : "").trim();
      const description = (iDesc >= 0 ? r[iDesc] : "").trim() || name;
      let category = (iCat >= 0 ? r[iCat] : "").trim().toLowerCase();
      if (!valid.has(category)) category = "top";
      const photoUrl = iPhoto >= 0 ? r[iPhoto]?.trim() || null : null;
      const productUrl = iUrl >= 0 ? r[iUrl]?.trim() || null : null;
      return { name, description, category, photoUrl, productUrl };
    })
    .filter((g) => g.name.length > 0);
}
