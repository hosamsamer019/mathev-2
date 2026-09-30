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

  it('should preserve imageUrl while stripping imageStorageKey and imageAssetId', () => {
    const payloadWithImage = [
      {
        id: '20',
        text: 'Question with image',
        options: ['Option 1', 'Option 2'],
        correct: 0,
        correctAnswer: 'Option 1',
        imageUrl: 'https://storage.example.com/assessment-assets/img-123.png',
        imageStorageKey: 'assessment-assets/img-123.png',
        imageAssetId: 'asset-uuid-456',
        solutionExplanation: 'Hidden explanation'
      }
    ];

    const sanitized = sanitizeQuestionsForStudent(payloadWithImage);
    expect(sanitized[0].imageUrl).toBe('https://storage.example.com/assessment-assets/img-123.png');
    expect(sanitized[0].imageStorageKey).toBeUndefined();
    expect(sanitized[0].imageAssetId).toBeUndefined();
    expect(sanitized[0].correct).toBeUndefined();
    expect(sanitized[0].correctAnswer).toBeUndefined();
    expect(sanitized[0].solutionExplanation).toBeUndefined();
  });
});
