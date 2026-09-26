export type QuizOption = {
  id: string;
  translation: string;
};

function shuffle<T>(items: T[], random: () => number): T[] {
  const shuffled = [...items];
  for (let index = shuffled.length - 1; index > 0; index -= 1) {
    const swapIndex = Math.floor(random() * (index + 1));
    [shuffled[index], shuffled[swapIndex]] = [shuffled[swapIndex], shuffled[index]];
  }
  return shuffled;
}

export function buildMultipleChoiceOptions(
  correct: QuizOption,
  vocabulary: QuizOption[],
  random: () => number = Math.random,
): QuizOption[] {
  const normalizedCorrect = correct.translation.trim().toLowerCase();
  const seenTranslations = new Set([normalizedCorrect]);
  const distractors = vocabulary.filter((candidate) => {
    const normalized = candidate.translation.trim().toLowerCase();
    if (candidate.id === correct.id || !normalized || seenTranslations.has(normalized)) return false;
    seenTranslations.add(normalized);
    return true;
  });

  if (distractors.length < 3) return [];
  return shuffle([correct, ...shuffle(distractors, random).slice(0, 3)], random);
}
