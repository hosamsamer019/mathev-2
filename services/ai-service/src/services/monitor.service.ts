export interface AIPerformanceRecord {
  requestId: string;
  model: string;
  questionCount: number;
  promptTokens: number;
  completionTokens: number;
  totalTokens: number;
  timeToFirstToken?: number;
  modelDuration: number;
  validationDuration: number;
  retryCount: number;
  totalDuration: number;
  success: boolean;
  timestamp: Date;
  fallbackUsed?: boolean;
}

export interface AIMetricsSummary {
  totalRequests: number;
  successfulRequests: number;
  failedRequests: number;
  totalQuestionsGenerated: number;
  totalTokensUsed: number;
  totalRetries: number;
  totalFallbacks: number;
  avgTotalDurationMs: number;
  avgModelDurationMs: number;
  avgValidationDurationMs: number;
  p50DurationMs: number;
  p95DurationMs: number;
  p99DurationMs: number;
  avgTokensPerQuestion: number;
  modelDistribution: Record<string, number>;
}

export class AIPerformanceMonitor {
  private static records: AIPerformanceRecord[] = [];
  private static readonly MAX_RECORDS = 1000;

  static record(entry: AIPerformanceRecord) {
    this.records.push(entry);
    if (this.records.length > this.MAX_RECORDS) {
      this.records.shift();
    }

    // Precise structured production log as requested
    console.log(
      `[AI PERF] requestId=${entry.requestId} model=${entry.model} questionCount=${entry.questionCount} ` +
      `promptTokens=${entry.promptTokens} completionTokens=${entry.completionTokens} totalTokens=${entry.totalTokens} ` +
      `timeToFirstToken=${entry.timeToFirstToken || 0}ms modelDuration=${entry.modelDuration}ms ` +
      `validationDuration=${entry.validationDuration}ms retryCount=${entry.retryCount} totalDuration=${entry.totalDuration}ms ` +
      `success=${entry.success}`
    );
  }

  static getMetrics(): AIMetricsSummary {
    const total = this.records.length;
    if (total === 0) {
      return {
        totalRequests: 0,
        successfulRequests: 0,
        failedRequests: 0,
        totalQuestionsGenerated: 0,
        totalTokensUsed: 0,
        totalRetries: 0,
        totalFallbacks: 0,
        avgTotalDurationMs: 0,
        avgModelDurationMs: 0,
        avgValidationDurationMs: 0,
        p50DurationMs: 0,
        p95DurationMs: 0,
        p99DurationMs: 0,
        avgTokensPerQuestion: 0,
        modelDistribution: {}
      };
    }

    const successes = this.records.filter(r => r.success);
    const failures = this.records.filter(r => !r.success);
    const totalQuestions = successes.reduce((acc, r) => acc + r.questionCount, 0);
    const totalTokens = this.records.reduce((acc, r) => acc + r.totalTokens, 0);
    const totalRetries = this.records.reduce((acc, r) => acc + r.retryCount, 0);
    const totalFallbacks = this.records.filter(r => r.fallbackUsed).length;

    const durations = this.records.map(r => r.totalDuration).sort((a, b) => a - b);
    const p50 = durations[Math.floor(durations.length * 0.5)] || 0;
    const p95 = durations[Math.floor(durations.length * 0.95)] || 0;
    const p99 = durations[Math.floor(durations.length * 0.99)] || 0;

    const avgTotal = Math.round(durations.reduce((a, b) => a + b, 0) / total);
    const avgModel = Math.round(this.records.reduce((acc, r) => acc + r.modelDuration, 0) / total);
    const avgValidation = Math.round(this.records.reduce((acc, r) => acc + r.validationDuration, 0) / total);

    const modelDistribution: Record<string, number> = {};
    for (const r of this.records) {
      modelDistribution[r.model] = (modelDistribution[r.model] || 0) + 1;
    }

    return {
      totalRequests: total,
      successfulRequests: successes.length,
      failedRequests: failures.length,
      totalQuestionsGenerated: totalQuestions,
      totalTokensUsed: totalTokens,
      totalRetries,
      totalFallbacks,
      avgTotalDurationMs: avgTotal,
      avgModelDurationMs: avgModel,
      avgValidationDurationMs: avgValidation,
      p50DurationMs: p50,
      p95DurationMs: p95,
      p99DurationMs: p99,
      avgTokensPerQuestion: totalQuestions > 0 ? Math.round(totalTokens / totalQuestions) : 0,
      modelDistribution
    };
  }

  static getRecentRecords(limit = 20): AIPerformanceRecord[] {
    return this.records.slice(-limit).reverse();
  }
}
