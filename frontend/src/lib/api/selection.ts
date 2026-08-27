import { apiFetch } from "@/lib/api";

export type TranslateSelectionResponse = {
  span: string;
  translation_pl: string;
  example_l2: string;
  example_pl: string;
  from_cache: boolean;
};

export type AddSelectionPendingResponse = {
  status: "created" | "already_exists" | "reopened";
  vocab_item_id: string;
  term: string;
};

export function translateSelection(
  token: string,
  body: { span: string; language: string; context_sentence?: string; conversation_id?: string }
) {
  return apiFetch<TranslateSelectionResponse>("/api/chat/selection/translate", {
    method: "POST",
    token,
    body,
  });
}

export function addSelectionPending(
  token: string,
  body: {
    span: string;
    language: string;
    translation_pl?: string;
    context_sentence?: string;
    conversation_id?: string;
  }
) {
  return apiFetch<AddSelectionPendingResponse>("/api/chat/selection/pending", {
    method: "POST",
    token,
    body,
  });
}
