/**
 * OpenRouter API Client
 * 
 * A dedicated client for communicating with the OpenRouter API.
 * Uses the OpenAI-compatible chat completions format.
 * Supports both streaming and non-streaming requests.
 */

interface ChatMessage {
  role: 'system' | 'user' | 'assistant';
  content: string;
}

interface OpenRouterCompletionOptions {
  messages: ChatMessage[];
  temperature?: number;
  max_tokens?: number;
  stream?: boolean;
  response_format?: { type: 'json_object' };
}

interface OpenRouterChoice {
  message: {
    role: string;
    content: string;
  };
  finish_reason: string;
}

interface OpenRouterResponse {
  id: string;
  choices: OpenRouterChoice[];
  usage?: {
    prompt_tokens: number;
    completion_tokens: number;
    total_tokens: number;
  };
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
  private model: string;
  private baseUrl: string;
  private timeoutMs: number;
  private maxRetries: number;

  constructor(options?: { timeoutMs?: number; maxRetries?: number }) {
    const apiKey = process.env.OPENROUTER_API_KEY;
    if (!apiKey || apiKey === '') {
      throw new Error('OPENROUTER_API_KEY is not configured');
    }

    this.apiKey = apiKey;
    this.model = process.env.OPENROUTER_MODEL || 'deepseek/deepseek-r1:free';
    this.baseUrl = process.env.OPENROUTER_BASE_URL || 'https://openrouter.ai/api/v1';
    this.timeoutMs = options?.timeoutMs ?? 30000;
    this.maxRetries = options?.maxRetries ?? 2;
  }

  private get headers(): Record<string, string> {
    return {
      'Authorization': `Bearer ${this.apiKey}`,
      'Content-Type': 'application/json',
      'HTTP-Referer': 'http://localhost',
      'X-Title': 'MIDAS Chatbot',
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
    console.error(`[OpenRouterClient] HTTP ${status}: ${body.substring(0, 500)}`);

    return new OpenRouterError(message, status, isRetryable);
  }

  /**
   * Non-streaming chat completion.
   * Used by SolverService and GeneratorService.
   */
  async chatCompletion(options: OpenRouterCompletionOptions): Promise<OpenRouterResponse> {
    const body = {
      model: this.model,
      messages: options.messages,
      temperature: options.temperature ?? 0.7,
      max_tokens: options.max_tokens,
      stream: false,
      ...(options.response_format ? { response_format: options.response_format } : {}),
    };

    let lastError: Error | null = null;

    for (let attempt = 0; attempt <= this.maxRetries; attempt++) {
      try {
        const controller = new AbortController();
        const timeout = setTimeout(() => controller.abort(), this.timeoutMs);

        const response = await fetch(`${this.baseUrl}/chat/completions`, {
          method: 'POST',
          headers: this.headers,
          body: JSON.stringify(body),
          signal: controller.signal,
        });

        clearTimeout(timeout);

        if (!response.ok) {
          const errorBody = await response.text();
          const error = this.classifyError(response.status, errorBody);

          if (error.isRetryable && attempt < this.maxRetries) {
            const delay = Math.min(1000 * Math.pow(2, attempt), 5000);
            console.warn(`[OpenRouterClient] Retrying in ${delay}ms (attempt ${attempt + 1}/${this.maxRetries})`);
            await new Promise(resolve => setTimeout(resolve, delay));
            lastError = error;
            continue;
          }

          throw error;
        }

        const data: OpenRouterResponse = await response.json();
        return data;
      } catch (error: any) {
        if (error instanceof OpenRouterError) {
          throw error;
        }

        if (error.name === 'AbortError') {
          lastError = new OpenRouterError('Request timed out', 408, true);
          if (attempt < this.maxRetries) {
            console.warn(`[OpenRouterClient] Timeout, retrying (attempt ${attempt + 1}/${this.maxRetries})`);
            continue;
          }
          throw lastError;
        }

        // Network or other unexpected errors
        console.error('[OpenRouterClient] Unexpected error:', error.message);
        lastError = new OpenRouterError(
          'Failed to connect to OpenRouter',
          0,
          true
        );
        if (attempt < this.maxRetries) {
          continue;
        }
        throw lastError;
      }
    }

    throw lastError || new Error('Unexpected error in OpenRouterClient');
  }

  /**
   * Streaming chat completion.
   * Used by ChatService for Server-Sent Events.
   * Yields content chunks as they arrive.
   */
  async *chatCompletionStream(options: OpenRouterCompletionOptions): AsyncGenerator<string> {
    const body = {
      model: this.model,
      messages: options.messages,
      temperature: options.temperature ?? 0.7,
      max_tokens: options.max_tokens,
      stream: true,
    };

    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), this.timeoutMs * 3); // Longer timeout for streaming

    try {
      const response = await fetch(`${this.baseUrl}/chat/completions`, {
        method: 'POST',
        headers: this.headers,
        body: JSON.stringify(body),
        signal: controller.signal,
      });

      if (!response.ok) {
        const errorBody = await response.text();
        throw this.classifyError(response.status, errorBody);
      }

      if (!response.body) {
        throw new Error('No response body received for streaming request');
      }

      const reader = response.body.getReader();
      const decoder = new TextDecoder('utf-8');
      let buffer = '';

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split('\n');
        // Keep the last incomplete line in the buffer
        buffer = lines.pop() || '';

        for (const line of lines) {
          const trimmed = line.trim();
          if (!trimmed || !trimmed.startsWith('data: ')) continue;

          const data = trimmed.slice(6); // Remove 'data: ' prefix
          if (data === '[DONE]') return;

          try {
            const parsed = JSON.parse(data);
            const content = parsed.choices?.[0]?.delta?.content;
            if (content) {
              yield content;
            }
          } catch {
            // Skip malformed JSON chunks
          }
        }
      }
    } finally {
      clearTimeout(timeout);
    }
  }
}
