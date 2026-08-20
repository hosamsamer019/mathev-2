import { describe, it, expect } from 'vitest';
import { normalizeAssessmentResult } from './assessmentResultNormalizer';

describe('normalizeAssessmentResult', () => {
  it('Case 1 - Perfect 5-question exam', () => {
    const result = normalizeAssessmentResult({ score: 5, totalPoints: 5, passingScore: 50 });
    expect(result.score).toBe(5);
    expect(result.percentage).toBe(100);
    expect(result.passed).toBe(true);
  });

  it('Case 2 - 4/5', () => {
    const result = normalizeAssessmentResult({ score: 4, totalPoints: 5 });
    expect(result.percentage).toBe(80);
    expect(result.passed).toBe(true);
  });

  it('Case 3 - 3/5', () => {
    const result = normalizeAssessmentResult({ score: 3, totalPoints: 5 });
    expect(result.percentage).toBe(60);
    expect(result.passed).toBe(true);
  });

  it('Case 4 - 2/5', () => {
    const result = normalizeAssessmentResult({ score: 2, totalPoints: 5 });
    expect(result.percentage).toBe(40);
    expect(result.passed).toBe(false);
  });

  it('Case 5 - 0/5', () => {
    const result = normalizeAssessmentResult({ score: 0, totalPoints: 5 });
    expect(result.percentage).toBe(0);
    expect(result.passed).toBe(false);
  });

  it('Case 6 - 5/10', () => {
    const result = normalizeAssessmentResult({ score: 5, totalPoints: 10 });
    expect(result.percentage).toBe(50);
  });

  it('Case 7 - Historical attempt without percentage', () => {
    const result = normalizeAssessmentResult({ score: 5, totalPoints: 5, percentage: undefined });
    expect(result.percentage).toBe(100);
  });

  it('Case 8 - Explicit 5% regression guard', () => {
    const result = normalizeAssessmentResult({ score: 5, totalPoints: 5, percentage: undefined, passingScore: 50 });
    expect(result.percentage).not.toBe(5);
    expect(result.percentage).toBe(100);
    expect(result.passed).toBe(true);
  });

  it('Case 9 - Zero total points must not produce NaN/Infinity', () => {
    const result = normalizeAssessmentResult({ score: 0, totalPoints: 0 });
    expect(result.percentage).not.toBe(NaN);
    expect(result.percentage).not.toBe(Infinity);
    expect(result.percentage).toBe(0);
  });

  it('Case 10 - Invalid numbers', () => {
    const invalidInputs: any[] = [
      { score: NaN, totalPoints: NaN },
      { score: Infinity, totalPoints: 10 },
      { score: -Infinity, totalPoints: 10 },
      { score: null, totalPoints: null },
      { score: undefined, totalPoints: undefined },
      { score: -5, totalPoints: 10 }
    ];

    invalidInputs.forEach(input => {
      const result = normalizeAssessmentResult(input);
      expect(Number.isFinite(result.percentage)).toBe(true);
      expect(Number.isNaN(result.percentage)).toBe(false);
      expect(result.percentage >= 0).toBe(true);
    });
  });
});
