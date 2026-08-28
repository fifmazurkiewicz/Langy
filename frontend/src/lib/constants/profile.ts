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

export const CEFR_LEVELS = ["A1", "A2", "B1", "B2", "C1", "C2"] as const;

export type CefrLevel = (typeof CEFR_LEVELS)[number];

/** Default self-assessment level (A2). Stored as 1–6 index in API/DB. Legacy 1–5 tops at C1. */
export const DEFAULT_SKILL_LEVEL = 2;

export const SKILL_ASPECTS = [
  { key: "reading", label: "Reading" },
  { key: "speaking", label: "Speaking" },
  { key: "writing", label: "Writing" },
  { key: "listening", label: "Listening" },
  { key: "vocabulary", label: "Vocabulary" },
] as const;

export function clampSkillLevel(level: number | null | undefined): number {
  if (level == null || level < 1) return DEFAULT_SKILL_LEVEL;
  return Math.min(level, CEFR_LEVELS.length);
}

export function skillLevelToCefr(level: number | null | undefined): CefrLevel {
  return CEFR_LEVELS[clampSkillLevel(level) - 1];
}

export type ThemeMode = "system" | "light" | "dark";

export const THEME_STORAGE_KEY = "langy-theme";
