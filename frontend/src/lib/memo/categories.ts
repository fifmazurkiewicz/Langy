export const UNCATEGORIZED_DUE_CATEGORY_KEY = "__other__";

export type MemoCategory = {
  id: string;
  category_key: string;
  accepted_count: number;
  due_count: number;
  is_custom: boolean;
};

export function makeCreatedCategory(
  created: Pick<MemoCategory, "id" | "category_key">,
): MemoCategory {
  return { ...created, accepted_count: 0, due_count: 0, is_custom: true };
}

export function formatCategoryLabel(categoryKey: string): string {
  return categoryKey.replace(/^custom_/, "").replace(/_/g, " ");
}

/** Mirrors backend `interest_category_key` for profile interests → flashcard set keys. */
export function interestToCategoryKey(interest: string): string {
  if (!interest) return "";
  if (interest.startsWith("other:")) {
    const slug = interest.slice(6).trim().toLowerCase().replace(/ /g, "_");
    return slug ? `custom_${slug}`.slice(0, 64) : "other";
  }
  return interest.split(":")[0].trim();
}

export function splitCategoriesByInterests<
  T extends { category_key: string },
>(categories: T[], interests: string[]): { interestCategories: T[]; customCategories: T[] } {
  const byKey = new Map(categories.map((cat) => [cat.category_key, cat]));
  const interestCategories = interests
    .map((interest) => byKey.get(interestToCategoryKey(interest)))
    .filter((cat): cat is T => cat != null);
  const interestKeySet = new Set(interestCategories.map((cat) => cat.category_key));
  const customCategories = categories.filter((cat) => !interestKeySet.has(cat.category_key));
  return { interestCategories, customCategories };
}
