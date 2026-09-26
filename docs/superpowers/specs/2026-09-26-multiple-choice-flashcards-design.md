# Multiple-choice flashcards design

## Goal

Add a recognition exercise to Memo's existing Due today flashcards. A learner sees a target-language term and chooses its Polish meaning from four mixed answers drawn from their accepted vocabulary.

## Scope

- Keep the existing reveal-and-self-grade review unchanged.
- Add a Multiple choice action beside Review for each due card.
- Mix one correct translation with three distinct translations from all accepted cards in the active learning language, regardless of category.
- Show feedback after selection. Correct answers map to the existing FSRS `good` rating; incorrect answers map to `again` when the learner advances.
- Require four distinct vocabulary entries. If there are not enough, explain why and leave normal review available.

## Data flow

1. The due-card route includes the card's owning `vocab_id`.
2. The browser loads accepted vocabulary through the existing `GET /api/vocab/accepted` route when a learner starts multiple choice.
3. A local helper excludes the current answer and duplicate translations, takes three distractors, and shuffles all four choices.
4. Selecting a choice only updates local UI. Pressing Next calls the existing card review route with `good` or `again`, then reloads the Memo data.

No generated content, additional persistence, or new endpoint is required.

## UX and accessibility

- Answer choices are native buttons with visible focus treatment inherited from `classical-btn`.
- An `aria-live` message announces whether the selected answer is correct and names the correct meaning after an error.
- Choices lock after one selection to prevent accidental double answers; Cancel remains available until Next.
- The layout is a single-column touch target list on narrow screens and a two-column grid on wider screens.

## Acceptance criteria

- A due card can start multiple choice when at least four accepted cards with distinct Polish translations exist.
- Exactly four choices appear, including exactly one correct answer, in a shuffled order.
- Distractors come from the learner's accepted vocabulary in the active language, including other categories.
- A correct result saves `good`; an incorrect result saves `again` only after Next.
- Insufficient vocabulary does not prevent the normal Reveal review flow.
