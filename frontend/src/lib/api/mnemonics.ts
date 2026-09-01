import { apiFetch } from "@/lib/api";

export type MnemonicResponse = {
  term: string;
  language: string;
  association_pl: string;
  example_l2: string;
  example_pl: string;
  from_cache: boolean;
};

export function generateMnemonic(
  token: string,
  body: { term: string; language: string; regenerate?: boolean }
) {
  return apiFetch<MnemonicResponse>("/api/mnemonics/generate", { method: "POST", token, body });
}

export function getMnemonic(token: string, language: string, term: string) {
  return apiFetch<MnemonicResponse>(`/api/mnemonics/${encodeURIComponent(language)}/${encodeURIComponent(term)}`, {
    token,
  });
}
