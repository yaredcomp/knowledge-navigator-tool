import { z } from 'zod';
import type { LLMProviderType, SummarizationResult } from '@/types/llm';
import { FALLBACK_CHAIN } from '@/types/llm';
import { LLMError } from '@/lib/errors/SearchError';
import { getGroqProvider } from './GroqProvider';
import { getOpenRouterProvider } from './OpenRouterProvider';
import { getOllamaProvider } from './OllamaProvider';

export class AbstractSummarizer {
  private groqProvider = getGroqProvider();
  private openRouterProvider = getOpenRouterProvider();
  private ollamaProvider = getOllamaProvider();
  private fallbackOrder: LLMProviderType[];

  constructor(fallbackOrder: LLMProviderType[] = FALLBACK_CHAIN) {
    this.fallbackOrder = fallbackOrder;
  }

  async summarize(abstract: string, maxSentences: number = 3): Promise<SummarizationResult> {
    const prompt = this.buildSummarizationPrompt(abstract, maxSentences);
    const errors: Error[] = [];

    for (const provider of this.fallbackOrder) {
      try {
        const result = await this.summarizeWithProvider(provider, prompt);
        return result;
      } catch (error) {
        console.error(`Summarization failed with ${provider}:`, error);
        errors.push(error as Error);
      }
    }

    return this.fallbackSummarization(abstract, maxSentences);
  }

  async summarizeBatch(abstracts: string[], maxSentences: number = 2): Promise<SummarizationResult[]> {
    return Promise.all(abstracts.map((abstract) => this.summarize(abstract, maxSentences)));
  }

  private buildSummarizationPrompt(abstract: string, maxSentences: number): string {
    return `Summarize this research paper abstract in exactly ${maxSentences} sentences:

${abstract}

Provide a concise summary that captures:
1. Main contribution or finding
2. Methodology (brief)
3. Key implications or applications

Format your response as JSON with:
{
  "summary": "The summary text...",
  "keyPoints": ["point 1", "point 2", "point 3"]
}`;
  }

  private async summarizeWithProvider(provider: LLMProviderType, prompt: string): Promise<SummarizationResult> {
    const SummarizationSchema = z.object({
      summary: z.string(),
      keyPoints: z.array(z.string()),
    });

    let content: string;

    switch (provider) {
      case 'groq':
        content = (await this.groqProvider.generateResponse(prompt)).content;
        break;
      case 'openrouter':
        content = (await this.openRouterProvider.generateResponse(prompt)).content;
        break;
      case 'ollama':
        if (!(await this.ollamaProvider.checkHealth())) {
          throw new LLMError('Ollama is not available', 'ollama', true);
        }
        content = (await this.ollamaProvider.generateResponse(prompt)).content;
        break;
      default:
        throw new LLMError(`Unsupported provider: ${provider}`, provider, false);
    }

    return this.parseSummarizationResponse(content);
  }

  private parseSummarizationResponse(content: string): SummarizationResult {
    const jsonMatch = content.match(/```(?:json)?\s*([\s\S]*?)```/);
    const jsonStr = jsonMatch ? jsonMatch[1] : content;
    const cleaned = jsonStr.trim();

    try {
      const parsed = JSON.parse(cleaned);
      return {
        summary: parsed.summary || cleaned,
        keyPoints: parsed.keyPoints || [],
        originalLength: 0,
        summarizedLength: parsed.summary?.length || 0,
      };
    } catch {
      return {
        summary: content,
        keyPoints: [],
        originalLength: 0,
        summarizedLength: content.length,
      };
    }
  }

  private fallbackSummarization(abstract: string, maxSentences: number): SummarizationResult {
    const sentences = abstract.split(/[.!?]+/).filter((s) => s.trim().length > 0);
    const summarySentences = sentences.slice(0, maxSentences);
    return {
      summary: summarySentences.join('. ').trim() + '.',
      keyPoints: summarySentences.slice(0, 3).map((s, i) => `Point ${i + 1}: ${s.trim()}`),
      originalLength: abstract.length,
      summarizedLength: 0,
    };
  }
}

let globalAbstractSummarizer: AbstractSummarizer | null = null;

export function getAbstractSummarizer(): AbstractSummarizer {
  if (!globalAbstractSummarizer) {
    globalAbstractSummarizer = new AbstractSummarizer();
  }
  return globalAbstractSummarizer;
}
