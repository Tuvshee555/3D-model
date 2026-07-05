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
};

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
