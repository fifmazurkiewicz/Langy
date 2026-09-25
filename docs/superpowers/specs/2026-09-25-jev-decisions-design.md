# Jev Decisions Integration Design

## Goal

Use Jev through OpenRouter to decide whether Langy should request a substantive correction and which correction category applies, before the existing generative correction path writes learner-facing text.

## Boundary

The backend remains the only caller. It uses `OPENROUTER_API_KEY` and posts to `https://openrouter.ai/api/alpha/decisions` with the pinned model `typesafe/jev-1.13`. Jev receives the finalized learner utterance, target language, and narrowly scoped English question criteria. It never writes correction text, changes FSRS state, or creates vocabulary records.

## Flow

1. Existing correction orchestration passes the finalized utterance to a small `JevDecider`.
2. One request asks independent questions: `needs_substantive_correction` (noul) and `mistake_category` (choice: grammar, vocabulary, word_order, pronunciation_or_transcription, other, none).
3. Code applies conservative thresholds configured as constants in the integration: use Jev only when the noul probability is at least 0.80 and choice confidence is at least 0.80; otherwise use the existing correction model unchanged.
4. If Jev says no correction at the threshold, return the existing no-tip shape without making a generative correction request. If it says yes, preserve the existing generative correction prompt and response contract, adding the category only as context.
5. On timeout, 429, 5xx, malformed response, or an under-threshold answer, preserve the previous behavior rather than suppressing correction.

## Observability and privacy

Persist an event containing question IDs, answers, distributions, model/provider/request ID, input/output token counts, latency, selected route, and failure reason. Do not persist the raw utterance in the event; retain only the existing conversation data under its established retention policy. Existing Langfuse and usage-ledger records remain the source for generative calls; Jev usage is added to the same operational trace path.

## Tests

Mock the HTTP transport. Cover valid yes/no routes, low-confidence fallback, malformed responses, 429 retry exhaustion, and no raw learner text in the decision event. No CI test calls OpenRouter.

## Non-goals

Do not use Jev to determine CEFR level, generate explanations, grade progress, or make automated educational decisions beyond the already optional correction tip.
