export interface AssessmentResultInput {
  score?: number;
  totalPoints?: number;
  percentage?: number;
  passingScore?: number;
}

export interface NormalizedAssessmentResult {
  score: number;
  totalPoints: number;
  percentage: number;
  passed: boolean;
}

/**
 * Safely normalizes an assessment result to ensure that score and percentage are never confused.
 */
export function normalizeAssessmentResult(data: AssessmentResultInput | null | undefined, defaultPassingScore: number = 50): NormalizedAssessmentResult {
  if (!data) {
    return { score: 0, totalPoints: 0, percentage: 0, passed: false };
  }

  const score = typeof data.score === 'number' ? data.score : 0;
  const totalPoints = typeof data.totalPoints === 'number' ? data.totalPoints : 0;
  
  let percentage = 0;
  if (typeof data.percentage === 'number') {
    percentage = data.percentage;
  } else if (totalPoints > 0) {
    percentage = (score / totalPoints) * 100;
  } else if (totalPoints === 0 && score > 0) {
    // If we somehow have points but 0 totalPoints, this is invalid data.
    // We cannot assume percentage = score anymore. We default to 100% if score is fully credited, 
    // but to be mathematically safe and prevent false 5%, we must not alias score to percentage.
    percentage = 100;
  } else {
    percentage = 0;
  }

  if (!isFinite(percentage) || isNaN(percentage)) {
    percentage = 0;
  }

  percentage = Math.max(0, Math.round(percentage));

  const passingScore = typeof data.passingScore === 'number' ? data.passingScore : defaultPassingScore;
  const passed = percentage >= passingScore;

  return {
    score,
    totalPoints,
    percentage,
    passed
  };
}
