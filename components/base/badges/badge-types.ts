export const badgeColors = [
  "gray",
  "brand",
  "error",
  "warning",
  "success",
  "blue",
  "indigo",
  "purple",
  "pink",
  "orange",
] as const;

export type BadgeColors = (typeof badgeColors)[number];

export const badgeTypes = ["pill-color", "color", "modern"] as const;

export type BadgeTypes = (typeof badgeTypes)[number];

export type BadgeSizes = "sm" | "md" | "lg";

export type BadgeColor<T extends BadgeTypes = BadgeTypes> = T extends BadgeTypes ? BadgeColors : never;
