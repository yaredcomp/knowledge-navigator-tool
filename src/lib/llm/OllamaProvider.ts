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

export class OllamaProvider {
  private host: string;
  private model: string;

  constructor() {
    const settings = getSettings();
    this.host = settings?.ollama?.host || 'http://localhost:11434';
    this.model = settings?.ollama?.model || 'gemma3:4b';
  }

  async generateResponse(prompt: string, options?: { temperature?: number }): Promise<LLMResponse> {
    try {
      const response = await fetch(`${this.host}/api/generate`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          model: this.model,
          prompt,
          stream: false,
          temperature: options?.temperature ?? 0.7,
        }),
      });

      if (!response.ok) {
        throw new LLMError(`Ollama API error: ${response.statusText}`, 'ollama', true);
      }

      const data = await response.json() as { response: string };
      return {
        content: data.response || '',
        model: this.model,
        provider: 'ollama',
      };
    } catch (error) {
      if (error instanceof LLMError) throw error;
      throw new LLMError(`Ollama request failed: ${(error as Error).message}`, 'ollama', true);
    }
  }

  async generateStructuredResponse<T extends z.ZodType>(
    prompt: string,
    schema: T,
    options?: { temperature?: number }
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
      throw new LLMError(`Failed to parse structured response: ${(error as Error).message}`, 'ollama', false);
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
    provider: 'ollama';
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
        provider: 'ollama' as const,
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
        provider: 'ollama' as const,
      };
    }
  }

  async checkHealth(): Promise<boolean> {
    try {
      const response = await fetch(`${this.host}/api/tags`, { method: 'GET' });
      return response.ok;
    } catch {
      return false;
    }
  }

  setHost(host: string): void {
    this.host = host;
  }

  setModel(model: string): void {
    this.model = model;
  }

  getAvailableModels(): string[] {
    return ['llama3.2', 'llama3', 'mistral', 'codellama', 'phi3'];
  }
}

let globalOllamaProvider: OllamaProvider | null = null;

export function getOllamaProvider(): OllamaProvider {
  if (!globalOllamaProvider) {
    globalOllamaProvider = new OllamaProvider();
  }
  return globalOllamaProvider;
}
