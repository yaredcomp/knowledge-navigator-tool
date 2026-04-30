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

export class GroqLLMProvider {
  private apiKey?: string;
  private model: string;
  private baseUrl: string = 'https://api.groq.com/openai/v1';

  constructor() {
    const settings = getSettings();
    const envKey = process.env.GROQ_API_KEY;
    const storedKey = getStoredApiKey('groq');
    this.apiKey = envKey || storedKey || settings?.groq?.apiKey || '';
    this.model = settings?.groq?.model || 'llama-3.3-70b-versatile';
  }

  async generateResponse(prompt: string, options?: { temperature?: number; maxTokens?: number }): Promise<LLMResponse> {
    if (!this.apiKey) {
      throw new LLMError('Groq API key not configured', 'groq', false);
    }

    try {
      const response = await fetch(`${this.baseUrl}/chat/completions`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${this.apiKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          model: this.model,
          messages: [{ role: 'user', content: prompt }],
          temperature: options?.temperature ?? 0.7,
          max_tokens: options?.maxTokens ?? 4096,
        }),
      });

      if (!response.ok) {
        throw new LLMError(`Groq API error: ${response.statusText}`, 'groq', true);
      }

      const data = await response.json() as { choices: Array<{ message: { content: string } }> };
      return {
        content: data.choices[0]?.message?.content || '',
        raw: data,
        model: this.model,
        provider: 'groq',
      };
    } catch (error) {
      if (error instanceof LLMError) throw error;
      throw new LLMError(`Groq request failed: ${(error as Error).message}`, 'groq', true);
    }
  }

  async generateStructuredResponse<T extends z.ZodType>(
    prompt: string,
    schema: T,
    options?: { temperature?: number; maxTokens?: number }
  ): Promise<z.infer<T>> {
    const response = await this.generateResponse(prompt, options);
    const parsed = schema.safeParse(JSON.parse(response.content));
    if (!parsed.success) {
      throw new LLMError(`Failed to parse structured response: ${parsed.error.message}`, 'groq', false);
    }
    return parsed.data;
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
    provider: 'groq';
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
      const parsed = this.parseQueryResponse(response.content, ProcessedQuerySchema);
      return {
        ...parsed,
        modelInterpretation: response.content,
        provider: 'groq',
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
        provider: 'groq',
      };
    }
  }

  private parseQueryResponse<T extends z.ZodType>(content: string, schema: T): z.infer<T> {
    const jsonMatch = content.match(/```(?:json)?\s*([\s\S]*?)```/);
    const jsonStr = jsonMatch ? jsonMatch[1] : content;
    const cleaned = jsonStr.trim();
    const parsed = JSON.parse(cleaned);
    return schema.parse(parsed);
  }

  setApiKey(apiKey: string): void {
    this.apiKey = apiKey;
  }

  setModel(model: string): void {
    this.model = model;
  }
}

let globalGroqProvider: GroqLLMProvider | null = null;

export function getGroqProvider(): GroqLLMProvider {
  if (!globalGroqProvider) {
    globalGroqProvider = new GroqLLMProvider();
  }
  return globalGroqProvider;
}
