export function countEnglishWords(text: string): number {
  const matches = text.match(/[A-Za-z]+(?:'[A-Za-z]+)?/g);
  return matches?.length ?? 0;
}

export function calculateConvertedScore(raw: number): number {
  return Math.round((raw / 15) * 106.5 * 10) / 10;
}

export function roundToHalf(score: number): number {
  return Math.round(score * 2) / 2;
}

export function getScoreLevel(raw: number): "low" | "medium" | "high" {
  if (raw < 8.5) {
    return "low";
  }

  if (raw < 12.5) {
    return "medium";
  }

  return "high";
}
