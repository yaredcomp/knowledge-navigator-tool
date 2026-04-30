import { z } from 'zod';
import type { LLMResponse } from '@/types/llm';
import { LLMError } from '@/lib/errors/SearchError';

function getSettings() {
  if (typeof window === 'undefined') return null;
  try {
    const saved = localStorage.getItem('llm_provider_settings');
    return saved ? JSON.parse(saved) : null;
  } catch {
    return null;
  }
}

function getStoredApiKey(provider: string): string | undefined {
  if (typeof window === 'undefined') return undefined;
  return localStorage.getItem(`${provider}_api_key`) || undefined;
}

export class OpenRouterProvider {
  private apiKey?: string;
  private model: string;
  private baseUrl: string = 'https://openrouter.ai/api/v1';

  constructor() {
    const settings = getSettings();
    const envKey = process.env.OPENROUTER_API_KEY;
    const storedKey = getStoredApiKey('openrouter');
    this.apiKey = envKey || storedKey || settings?.openrouter?.apiKey || '';
    this.model = settings?.openrouter?.model || 'openai/gpt-4o-mini';
  }

  async generateResponse(prompt: string, options?: { temperature?: number; maxTokens?: number }): Promise<LLMResponse> {
    if (!this.apiKey) {
      throw new LLMError('OpenRouter API key not configured', 'openrouter', false);
    }

    try {
      const response = await fetch(`${this.baseUrl}/chat/completions`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${this.apiKey}`,
          'Content-Type': 'application/json',
          'HTTP-Referer': process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000',
          'X-Title': 'Knowledge Navigator',
        },
        body: JSON.stringify({
          model: this.model,
          messages: [{ role: 'user', content: prompt }],
          temperature: options?.temperature ?? 0.7,
          max_tokens: options?.maxTokens ?? 4096,
        }),
      });

      if (!response.ok) {
        const errorText = await response.text();
        throw new LLMError(`OpenRouter API error: ${response.statusText} - ${errorText}`, 'openrouter', true);
      }

      const data = await response.json() as {
        choices: Array<{ message: { content: string } }>;
        model: string;
      };
      return {
        content: data.choices[0]?.message?.content || '',
        raw: data,
        model: data.model || this.model,
        provider: 'openrouter',
      };
    } catch (error) {
      if (error instanceof LLMError) throw error;
      throw new LLMError(`OpenRouter request failed: ${(error as Error).message}`, 'openrouter', true);
    }
  }

  async generateStructuredResponse<T extends z.ZodType>(
    prompt: string,
    schema: T,
    options?: { temperature?: number; maxTokens?: number }
  ): Promise<z.infer<T>> {
    const response = await this.generateResponse(prompt, options);
    return this.parseResponse(response.content, schema);
  }

  private parseResponse<T extends z.ZodType>(content: string, schema: T): z.infer<T> {
    const jsonMatch = content.match(/```(?:json)?\s*([\s\S]*?)```/);
    const jsonStr = jsonMatch ? jsonMatch[1] : content;
    const cleaned = jsonStr.trim();
    try {
      const parsed = JSON.parse(cleaned);
      return schema.parse(parsed);
    } catch (error) {
      throw new LLMError(`Failed to parse structured response: ${(error as Error).message}`, 'openrouter', false);
    }
  }

  async processQuery(userInput: string): Promise<{
    query: string;
    authorName: string | null;
    affiliation: string | null;
    topic: string | null;
    ethiopianOnly: boolean;
    year: string | null;
    limit: number | null;
    modelInterpretation: string;
    provider: 'openrouter';
  }> {
    const ProcessedQuerySchema = z.object({
      query: z.string(),
      authorName: z.string().nullable(),
      affiliation: z.string().nullable(),
      topic: z.string().nullable(),
      ethiopianOnly: z.boolean(),
      year: z.string().nullable(),
      limit: z.number().nullable(),
    });

    try {
      const response = await this.generateResponse(
        `You are a research paper search assistant. Parse this query and extract structured data.

User query: "${userInput}"

Return JSON with: query, authorName, affiliation, topic, ethiopianOnly, year, limit`,
        { temperature: 0.1 }
      );
      const parsed = this.parseResponse(response.content, ProcessedQuerySchema);
      return {
        ...parsed,
        modelInterpretation: response.content,
        provider: 'openrouter',
      };
    } catch {
      return {
        query: userInput,
        authorName: null,
        affiliation: null,
        topic: null,
        ethiopianOnly: false,
        year: null,
        limit: null,
        modelInterpretation: '',
        provider: 'openrouter',
      };
    }
  }

  setApiKey(apiKey: string): void {
    this.apiKey = apiKey;
  }

  setModel(model: string): void {
    this.model = model;
  }

  getAvailableModels(): string[] {
    return [
      'openai/gpt-4o',
      'openai/gpt-4o-mini',
      'anthropic/claude-3.5-sonnet',
      'anthropic/claude-3-opus',
      'google/gemini-2.0-pro',
      'meta/llama-4-scout',
      'deepseek/deepseek-r1',
    ];
  }
}

let globalOpenRouterProvider: OpenRouterProvider | null = null;

export function getOpenRouterProvider(): OpenRouterProvider {
  if (!globalOpenRouterProvider) {
    globalOpenRouterProvider = new OpenRouterProvider();
  }
  return globalOpenRouterProvider;
}
