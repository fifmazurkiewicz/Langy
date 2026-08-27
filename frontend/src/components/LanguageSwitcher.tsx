"use client";

const LABELS: Record<string, string> = {
  "en-GB": "GB English",
  "en-US": "US English",
  de: "DE German",
  es: "ES Spanish",
  it: "IT Italian",
};

export function LanguageSwitcher({
  activeLanguage,
  languages,
  onChange,
}: {
  activeLanguage: string | null;
  languages: string[];
  onChange: (lang: string) => void;
}) {
  if (!activeLanguage) return null;
  return (
    <div className="flex items-center gap-2">
      <label htmlFor="lang-switcher" className="sr-only">
        Learning language
      </label>
      <select
        id="lang-switcher"
        className="classical-input max-w-[180px] py-2 text-sm"
        value={activeLanguage}
        onChange={(e) => onChange(e.target.value)}
      >
        {languages.map((lang) => (
          <option key={lang} value={lang}>
            {LABELS[lang] ?? lang}
          </option>
        ))}
      </select>
    </div>
  );
}
