import { describe, it, expect } from 'vitest';
import { sanitizeQuestionsForStudent } from './assessment.controller.js';

describe('sanitizeQuestionsForStudent', () => {
  it('should explicitly remove forbidden pedagogical and AI metadata', () => {
    const maliciousPayload = [
      {
        id: '1',
        text: 'What is 2 + 2?',
        options: ['3', '4', '5'],
        correct: 1,
        correctAnswer: '4',
        generationLogic: { prompt: 'Make it easy' },
        solutionSteps: ['2+2', '=4'],
        solutionExplanation: 'Basic addition',
        validationStatus: 'VERIFIED',
        points: 5
      }
    ];

    const sanitized = sanitizeQuestionsForStudent(maliciousPayload);

    expect(sanitized[0]).toBeDefined();
    expect(sanitized[0].id).toBe('1');
    expect(sanitized[0].text).toBe('What is 2 + 2?');
    expect(sanitized[0].options).toEqual(['3', '4', '5']);
    expect(sanitized[0].points).toBe(5);

    // Assert explicit removal
    expect(sanitized[0].correct).toBeUndefined();
    expect(sanitized[0].correctAnswer).toBeUndefined();
    expect(sanitized[0].generationLogic).toBeUndefined();
    expect(sanitized[0].solutionSteps).toBeUndefined();
    expect(sanitized[0].solutionExplanation).toBeUndefined();
    expect(sanitized[0].validationStatus).toBeUndefined();
  });

  it('should handle null, undefined, or malformed questions arrays safely', () => {
    expect(sanitizeQuestionsForStudent(null)).toEqual([]);
    expect(sanitizeQuestionsForStudent(undefined)).toEqual([]);
    expect(sanitizeQuestionsForStudent("not_an_array" as any)).toEqual([]);
  });

  it('should preserve non-sensitive fields seamlessly', () => {
    const normalPayload = [
      {
        id: '10',
        text: 'A safe question',
        options: [{ id: 'a', text: 'Option A' }],
        type: 'mcq'
      }
    ];

    const sanitized = sanitizeQuestionsForStudent(normalPayload);
    expect(sanitized[0].type).toBe('mcq');
    expect(sanitized[0].options[0].text).toBe('Option A');
  });
});
