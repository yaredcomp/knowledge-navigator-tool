import { z } from 'zod';
import type { LLMProviderType, LLMResponse } from '@/types/llm';
import { LLMError } from '@/lib/errors/SearchError';
import { getGroqProvider } from './GroqProvider';
import { getOpenRouterProvider } from './OpenRouterProvider';
import { getOllamaProvider } from './OllamaProvider';

export class LLMProviderManager {
  private fallbackOrder: LLMProviderType[];

  constructor(fallbackOrder: LLMProviderType[] = ['groq', 'openrouter', 'ollama']) {
    this.fallbackOrder = fallbackOrder;
  }

  async executeWithFallback<T>(
    prompt: string,
    processor: (content: string) => T
  ): Promise<{ result: T; provider: LLMProviderType; model: string }> {
    const errors: string[] = [];

    for (const provider of this.fallbackOrder) {
      try {
        const response = await this.getResponse(provider, prompt);
        const result = processor(response.content);
        return { result, provider, model: response.model || provider };
      } catch (error) {
        const errorMsg = error instanceof Error ? error.message : String(error);
        console.error(`LLM provider ${provider} failed:`, errorMsg);
        errors.push(`${provider}: ${errorMsg}`);
      }
    }

    throw new LLMError(
      `All LLM providers failed. Errors: ${errors.join('; ')}`,
      'all',
      false
    );
  }

  private async getResponse(provider: LLMProviderType, prompt: string): Promise<LLMResponse> {
    const groqProvider = getGroqProvider();
    const openRouterProvider = getOpenRouterProvider();
    const ollamaProvider = getOllamaProvider();

    switch (provider) {
      case 'groq':
        return groqProvider.generateResponse(prompt);
      case 'openrouter':
        return openRouterProvider.generateResponse(prompt);
      case 'ollama':
        if (await ollamaProvider.checkHealth()) {
          return ollamaProvider.generateResponse(prompt);
        }
        throw new LLMError('Ollama is not available', 'ollama', true);
      default:
        throw new LLMError(`Unsupported provider: ${provider}`, provider, false);
    }
  }

  setUserApiKey(provider: LLMProviderType, apiKey: string): void {
    const groqProvider = getGroqProvider();
    const openRouterProvider = getOpenRouterProvider();

    switch (provider) {
      case 'groq':
        groqProvider.setApiKey(apiKey);
        break;
      case 'openrouter':
        openRouterProvider.setApiKey(apiKey);
        break;
    }
  }

  setUserModel(provider: LLMProviderType, model: string): void {
    const groqProvider = getGroqProvider();
    const openRouterProvider = getOpenRouterProvider();
    const ollamaProvider = getOllamaProvider();

    switch (provider) {
      case 'groq':
        groqProvider.setModel(model);
        break;
      case 'openrouter':
        openRouterProvider.setModel(model);
        break;
      case 'ollama':
        ollamaProvider.setModel(model);
        break;
    }
  }
}

let globalProviderManager: LLMProviderManager | null = null;

export function getLLMProviderManager(): LLMProviderManager {
  if (!globalProviderManager) {
    globalProviderManager = new LLMProviderManager();
  }
  return globalProviderManager;
}

export function resetLLMProviderManager(): void {
  globalProviderManager = null;
}