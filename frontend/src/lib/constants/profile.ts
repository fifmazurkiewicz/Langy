export const SUPPORTED_LANGUAGES = [
  { id: "en-GB", label: "English (British)", marker: "GB" },
  { id: "en-US", label: "English (American)", marker: "US" },
  { id: "de", label: "German", marker: "DE" },
  { id: "es", label: "Spanish", marker: "ES" },
  { id: "it", label: "Italian", marker: "IT" },
] as const;

export const LANGUAGE_LABELS: Record<string, string> = Object.fromEntries(
  SUPPORTED_LANGUAGES.map((l) => [l.id, l.label])
);

export const LANGUAGE_MARKERS: Record<string, string> = Object.fromEntries(
  SUPPORTED_LANGUAGES.map((l) => [l.id, l.marker])
);

export const MOTIVATIONS = [
  "career",
  "travel",
  "relocation",
  "family",
  "academic",
  "culture",
  "heritage",
  "fun",
  "other",
] as const;

export const INTERESTS = [
  "technology",
  "sports",
  "movies",
  "music",
  "books",
  "travel",
  "food",
  "business",
  "science",
  "gaming",
  "art",
  "nature",
  "other",
] as const;

export const SKILL_ASPECTS = [
  { key: "reading", label: "Reading" },
  { key: "speaking", label: "Speaking" },
  { key: "writing", label: "Writing" },
  { key: "listening", label: "Listening" },
  { key: "vocabulary", label: "Vocabulary" },
] as const;

export type ThemeMode = "system" | "light" | "dark";

export const THEME_STORAGE_KEY = "langy-theme";
