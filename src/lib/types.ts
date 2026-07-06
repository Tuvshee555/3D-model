export type GarmentCategory =
  | "top"
  | "bottom"
  | "dress"
  | "outerwear"
  | "accessory";

export const GARMENT_CATEGORIES: GarmentCategory[] = [
  "top",
  "bottom",
  "dress",
  "outerwear",
  "accessory",
];

export type Garment = {
  id: string;
  name: string;
  category: GarmentCategory;
  swatch: string;
  description: string;
  photoUrl: string | null;
  productUrl: string | null;
  storeId: string | null;
  brand: string | null;
  price: number | null;
  // Comma-separated size options, e.g. "S,M,L". null = not specified.
  sizes: string | null;
};

/** Parse the comma-separated `sizes` field into a clean list. */
export function parseSizes(sizes: string | null): string[] {
  if (!sizes) return [];
  return sizes
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean);
}

export type TryOnRecord = {
  id: string;
  personImageUrl: string;
  resultImageUrl: string;
  createdAt: string;
  garmentName: string;
  garmentCategory: GarmentCategory;
  isFavorite: boolean;
};

// What the shopper chose to try on: a catalog item or their own uploaded item.
export type Selection =
  | { kind: "catalog"; garment: Garment }
  | { kind: "custom"; name: string; description: string; photo: string | null };

export type User = {
  id: string;
  email: string;
};

export type Store = {
  id: string;
  userId: string;
  name: string;
  slug: string;
  plan: string;
  createdAt: string;
};
