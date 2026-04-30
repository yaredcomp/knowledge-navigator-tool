import { z } from 'zod';
import type { ProcessedQuery, LLMProviderType } from '@/types/llm';
import { FALLBACK_CHAIN } from '@/types/llm';
import { LLMError } from '@/lib/errors/SearchError';
import { getGroqProvider } from './GroqProvider';
import { getOpenRouterProvider } from './OpenRouterProvider';
import { getOllamaProvider } from './OllamaProvider';

export interface QueryDecompositionResult {
  query: string;
  authorName: string | null;
  affiliation: string | null;
  topic: string | null;
  ethiopianOnly: boolean;
  year: string | null;
  limit: number | null;
  modelInterpretation: string;
  provider: LLMProviderType;
}

export class QueryDecomposer {
  private groqProvider = getGroqProvider();
  private openRouterProvider = getOpenRouterProvider();
  private ollamaProvider = getOllamaProvider();
  private fallbackOrder: LLMProviderType[];

  constructor(fallbackOrder: LLMProviderType[] = FALLBACK_CHAIN) {
    this.fallbackOrder = fallbackOrder;
  }

  async processQuery(userInput: string): Promise<QueryDecompositionResult> {
    const errors: Error[] = [];

    for (const provider of this.fallbackOrder) {
      try {
        const result = await this.processWithProvider(provider, userInput);
        return result;
      } catch (error) {
        console.error(`Query decomposition failed with ${provider}:`, error);
        errors.push(error as Error);
      }
    }

    console.warn('All providers failed, using fallback regex parsing');
    return this.fallbackParsing(userInput);
  }

  private async processWithProvider(
    provider: LLMProviderType,
    userInput: string
  ): Promise<QueryDecompositionResult> {
    switch (provider) {
      case 'groq':
        return this.groqProvider.processQuery(userInput);

      case 'openrouter':
        return this.openRouterProvider.processQuery(userInput);

      case 'ollama':
        if (await this.ollamaProvider.checkHealth()) {
          return this.ollamaProvider.processQuery(userInput);
        }
        throw new LLMError('Ollama is not available', 'ollama', true);

      default:
        throw new LLMError(`Unsupported provider: ${provider}`, provider, false);
    }
  }

  private fallbackParsing(userInput: string): QueryDecompositionResult {
    const ethiopianTerms = ['ethiopia', 'ethiopian', 'addis ababa', 'bahir dar', 'mekelle', 'jimma'];
    const yearMatch = userInput.match(/\b(19|20)\d{2}\b/);
    const limitMatch = userInput.match(/\b(limit|show|return)\s+(\d+)/i);
    const ethiopianOnly = ethiopianTerms.some((term) =>
      userInput.toLowerCase().includes(term)
    );

    return {
      query: userInput,
      authorName: null,
      affiliation: null,
      topic: null,
      ethiopianOnly,
      year: yearMatch ? yearMatch[0] : null,
      limit: limitMatch ? parseInt(limitMatch[2], 10) : null,
      modelInterpretation: 'Fallback parsing - LLM unavailable',
      provider: 'ollama',
    };
  }

  setUserApiKey(provider: LLMProviderType, apiKey: string): void {
    switch (provider) {
      case 'groq':
        this.groqProvider.setApiKey(apiKey);
        break;
      case 'openrouter':
        this.openRouterProvider.setApiKey(apiKey);
        break;
      case 'ollama':
        this.ollamaProvider.setHost(apiKey);
        break;
    }
  }

  setUserModel(provider: LLMProviderType, model: string): void {
    switch (provider) {
      case 'groq':
        this.groqProvider.setModel(model);
        break;
      case 'openrouter':
        this.openRouterProvider.setModel(model);
        break;
      case 'ollama':
        this.ollamaProvider.setModel(model);
        break;
    }
  }
}

let globalQueryDecomposer: QueryDecomposer | null = null;

export function getQueryDecomposer(): QueryDecomposer {
  if (!globalQueryDecomposer) {
    globalQueryDecomposer = new QueryDecomposer();
  }
  return globalQueryDecomposer;
}
