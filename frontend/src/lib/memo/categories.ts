export const UNCATEGORIZED_DUE_CATEGORY_KEY = "__other__";

export function formatCategoryLabel(categoryKey: string): string {
  return categoryKey.replace(/^custom_/, "").replace(/_/g, " ");
}
