/**
 * OpenRouter API Client
 * 
 * A dedicated client for communicating with the OpenRouter API.
 * Uses the OpenAI-compatible chat completions format.
 * Supports both streaming and non-streaming requests.
 */

import { AIPerformanceMonitor } from './monitor.service.js';

interface ChatMessage {
  role: 'system' | 'user' | 'assistant';
  content: string;
}

export interface OpenRouterCompletionOptions {
  messages: ChatMessage[];
  temperature?: number;
  max_tokens?: number;
  stream?: boolean;
  response_format?: { type: 'json_object' };
  requestId?: string;
  questionCount?: number;
  validationDuration?: number;
  retryCount?: number;
}

interface OpenRouterChoice {
  message: {
    role: string;
    content: string;
  };
  finish_reason: string;
}

export interface OpenRouterResponse {
  id: string;
  choices: OpenRouterChoice[];
  usage?: {
    prompt_tokens: number;
    completion_tokens: number;
    total_tokens: number;
  };
  modelName?: string;
  durationMs?: number;
}

export class OpenRouterError extends Error {
  constructor(
    message: string,
    public statusCode: number,
    public isRetryable: boolean
  ) {
    super(message);
    this.name = 'OpenRouterError';
  }
}

export class OpenRouterClient {
  private apiKey: string;
  private primaryModel: string;
  private fallbackModel: string;
  private emergencyModel: string;
  private baseUrl: string;
  private timeoutMs: number;
  private maxRetries: number;

  constructor(options?: { timeoutMs?: number; maxRetries?: number }) {
    const apiKey = process.env.OPENROUTER_API_KEY;
    if (!apiKey || apiKey === '') {
      throw new Error('OPENROUTER_API_KEY is not configured');
    }

    this.apiKey = apiKey;
    this.primaryModel = process.env.OPENROUTER_MODEL || 'mistralai/mistral-small-24b-instruct-2501';
    this.fallbackModel = process.env.OPENROUTER_FALLBACK_MODEL || 'meta-llama/llama-3.3-70b-instruct';
    this.emergencyModel = process.env.OPENROUTER_EMERGENCY_MODEL || 'qwen/qwen-2.5-72b-instruct';
    this.baseUrl = process.env.OPENROUTER_BASE_URL || 'https://openrouter.ai/api/v1';
    this.timeoutMs = options?.timeoutMs ?? 45000;
    this.maxRetries = options?.maxRetries ?? 1;
  }

  private get headers(): Record<string, string> {
    return {
      'Authorization': `Bearer ${this.apiKey}`,
      'Content-Type': 'application/json',
      'HTTP-Referer': 'https://alsaden.edu',
      'X-Title': 'AL-SADEN Smart Math AI',
    };
  }

  /**
   * Classify an HTTP error status code and return a user-safe message.
   */
  private classifyError(status: number, body: string): OpenRouterError {
    const retryableStatuses = [408, 429, 500, 502, 503];
    const isRetryable = retryableStatuses.includes(status);

    const messages: Record<number, string> = {
      401: 'Authentication failed — invalid API key',
      403: 'Access forbidden — check API key permissions',
      404: 'Model or endpoint not found',
      408: 'Request timed out — please try again',
      429: 'Rate limit exceeded — please wait and try again',
      500: 'OpenRouter internal server error',
      502: 'OpenRouter bad gateway',
      503: 'OpenRouter service temporarily unavailable',
    };

    const message = messages[status] || `OpenRouter API error (HTTP ${status})`;
    console.error(`[OpenRouterClient] HTTP ${status}: ${body.substring(0, 300)}`);

    return new OpenRouterError(message, status, isRetryable);
  }

  /**
   * Non-streaming chat completion with automatic model fallback.
   * Used by SolverService and GeneratorService.
   */
  async chatCompletion(options: OpenRouterCompletionOptions): Promise<OpenRouterResponse> {
    const candidateModels = [this.primaryModel, this.fallbackModel, this.emergencyModel];
    let lastError: Error | null = null;
    const reqId = options.requestId || `req_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
    const qCount = options.questionCount || 1;

    for (let mIdx = 0; mIdx < candidateModels.length; mIdx++) {
      const model = candidateModels[mIdx];
      const isFallback = mIdx > 0;

      const body = {
        model,
        messages: options.messages,
        temperature: options.temperature ?? 0.2,
        max_tokens: options.max_tokens || 1200,
        stream: false,
        reasoning: { max_tokens: 0 }, // Disable hidden reasoning to prevent latency bloat
        ...(options.response_format ? { response_format: options.response_format } : {}),
      };

      for (let attempt = 0; attempt <= this.maxRetries; attempt++) {
        const tStart = performance.now();
        try {
          const controller = new AbortController();
          const timeout = setTimeout(() => controller.abort(), this.timeoutMs);

          const response = await fetch(`${this.baseUrl}/chat/completions`, {
            method: 'POST',
            headers: {
              ...this.headers,
              'X-Request-ID': reqId
            },
            body: JSON.stringify(body),
            signal: controller.signal,
          });

          clearTimeout(timeout);
          const duration = Math.round(performance.now() - tStart);

          if (!response.ok) {
            const errorBody = await response.text();
            const error = this.classifyError(response.status, errorBody);

            if (error.isRetryable && attempt < this.maxRetries) {
              const delay = 300 * Math.pow(2, attempt);
              console.warn(`[OpenRouterClient] Retrying ${model} in ${delay}ms (attempt ${attempt + 1}/${this.maxRetries})`);
              await new Promise(resolve => setTimeout(resolve, delay));
              lastError = error;
              continue;
            }

            lastError = error;
            break; // Try next fallback model
          }

          const data: OpenRouterResponse = await response.json();
          data.modelName = model;
          data.durationMs = duration;

          AIPerformanceMonitor.record({
            requestId: reqId,
            model,
            questionCount: qCount,
            promptTokens: data.usage?.prompt_tokens || 0,
            completionTokens: data.usage?.completion_tokens || 0,
            totalTokens: data.usage?.total_tokens || 0,
            modelDuration: duration,
            validationDuration: options.validationDuration || 0,
            retryCount: options.retryCount || attempt,
            totalDuration: duration + (options.validationDuration || 0),
            success: true,
            timestamp: new Date(),
            fallbackUsed: isFallback
          });

          return data;
        } catch (error: any) {
          const duration = Math.round(performance.now() - tStart);
          if (error.name === 'AbortError') {
            console.warn(`[AI] model=${model} TIMED OUT after ${duration}ms`);
            lastError = new OpenRouterError('Request timed out', 408, true);
          } else {
            console.error(`[AI] model=${model} ERROR after ${duration}ms:`, error.message);
            lastError = error;
          }

          AIPerformanceMonitor.record({
            requestId: reqId,
            model,
            questionCount: qCount,
            promptTokens: 0,
            completionTokens: 0,
            totalTokens: 0,
            modelDuration: duration,
            validationDuration: 0,
            retryCount: attempt,
            totalDuration: duration,
            success: false,
            timestamp: new Date(),
            fallbackUsed: isFallback
          });

          if (attempt < this.maxRetries && error.name !== 'AbortError') {
            continue;
          }
          break; // Try next fallback model
        }
      }
    }

    throw lastError || new Error('All candidate AI models failed');
  }

  /**
   * Streaming chat completion with fallback.
   * Used by ChatService for Server-Sent Events.
   */
  async *chatCompletionStream(options: OpenRouterCompletionOptions): AsyncGenerator<string> {
    const candidateModels = [this.primaryModel, this.fallbackModel, this.emergencyModel];
    let streamedSuccessfully = false;

    for (const model of candidateModels) {
      if (streamedSuccessfully) break;

      const body = {
        model,
        messages: options.messages,
        temperature: options.temperature ?? 0.7,
        max_tokens: options.max_tokens,
        stream: true,
        reasoning: { max_tokens: 0 },
      };

      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), this.timeoutMs * 2);
      const tStart = performance.now();

      try {
        const response = await fetch(`${this.baseUrl}/chat/completions`, {
          method: 'POST',
          headers: this.headers,
          body: JSON.stringify(body),
          signal: controller.signal,
        });

        if (!response.ok) {
          const errorBody = await response.text();
          console.warn(`[AI-Stream] model=${model} HTTP ${response.status}: ${errorBody.substring(0, 150)}. Trying fallback.`);
          continue;
        }

        if (!response.body) {
          continue;
        }

        const reader = response.body.getReader();
        const decoder = new TextDecoder('utf-8');
        let buffer = '';

        while (true) {
          const { done, value } = await reader.read();
          if (done) break;

          buffer += decoder.decode(value, { stream: true });
          const lines = buffer.split('\n');
          buffer = lines.pop() || '';

          for (const line of lines) {
            const trimmed = line.trim();
            if (!trimmed || !trimmed.startsWith('data: ')) continue;

            const data = trimmed.slice(6);
            if (data === '[DONE]') {
              streamedSuccessfully = true;
              console.log(`[AI-Stream] model=${model} duration=${Math.round(performance.now() - tStart)}ms completed`);
              return;
            }

            try {
              const parsed = JSON.parse(data);
              const content = parsed.choices?.[0]?.delta?.content;
              if (content) {
                streamedSuccessfully = true;
                yield content;
              }
            } catch {
              // Ignore partial JSON
            }
          }
        }
        return;
      } catch (err: any) {
        console.warn(`[AI-Stream] model=${model} failed: ${err.message}. Trying fallback.`);
      } finally {
        clearTimeout(timeout);
      }
    }
  }
}
