import { apiFetch } from "@/lib/api";

export type CorrectionResponse = {
  is_corrected: boolean;
  corrected_text: string | null;
  explanation_pl: string | null;
  mistake_type: "Grammar" | "Word choice" | "Pronunciation" | null;
  original_text: string;
};

export function runCorrection(
  token: string,
  body: {
    text: string;
    language: string;
    mode?: "auto" | "check";
    conversation_id?: string;
    context_before?: string;
    context_after?: string;
  }
) {
  return apiFetch<CorrectionResponse>("/api/chat/correction", {
    method: "POST",
    token,
    body,
  });
}

export function addCorrectionPending(
  token: string,
  body: {
    original_text: string;
    corrected_text: string;
    language: string;
    explanation_pl?: string;
    conversation_id?: string;
  }
) {
  return apiFetch<{ status: string; vocab_item_id: string; term: string }>(
    "/api/chat/correction/pending",
    { method: "POST", token, body }
  );
}
