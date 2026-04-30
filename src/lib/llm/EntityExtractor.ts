import { z } from 'zod';
import type { ResearchPaper } from '@/types/paper';
import type { LLMProviderType, EntityExtractionResult } from '@/types/llm';
import { FALLBACK_CHAIN } from '@/types/llm';
import { LLMError } from '@/lib/errors/SearchError';
import { getGroqProvider } from './GroqProvider';
import { getOpenRouterProvider } from './OpenRouterProvider';
import { getOllamaProvider } from './OllamaProvider';

export class EntityExtractor {
  private groqProvider = getGroqProvider();
  private openRouterProvider = getOpenRouterProvider();
  private ollamaProvider = getOllamaProvider();
  private fallbackOrder: LLMProviderType[];

  constructor(fallbackOrder: LLMProviderType[] = FALLBACK_CHAIN) {
    this.fallbackOrder = fallbackOrder;
  }

  async extractFromPaper(paper: ResearchPaper): Promise<EntityExtractionResult> {
    const prompt = this.buildExtractionPrompt(paper);
    return this.executeExtraction(prompt);
  }

  async extractFromText(text: string): Promise<EntityExtractionResult> {
    const prompt = `Extract entities from the following text:

${text}

Return JSON with: authors (name, affiliation, email), institutions, fundingSources, correspondingAuthor`;
    return this.executeExtraction(prompt);
  }

  private buildExtractionPrompt(paper: ResearchPaper): string {
    return `Extract entities from this research paper:

Title: ${paper.title}
Authors: ${paper.authors.join(', ')}
Abstract: ${paper.abstract}

Return JSON with:
- authors: array of {name, affiliation (optional), email (optional)}
- institutions: array of institution names
- fundingSources: array of funding source names (if mentioned)
- correspondingAuthor: name of corresponding author (if identified)`;
  }

  private async executeExtraction(prompt: string): Promise<EntityExtractionResult> {
    const errors: Error[] = [];

    for (const provider of this.fallbackOrder) {
      try {
        const result = await this.extractWithProvider(provider, prompt);
        return result;
      } catch (error) {
        console.error(`Entity extraction failed with ${provider}:`, error);
        errors.push(error as Error);
      }
    }

    return this.fallbackExtraction();
  }

  private async extractWithProvider(provider: LLMProviderType, prompt: string): Promise<EntityExtractionResult> {
    const EntitySchema = z.object({
      authors: z.array(z.object({
        name: z.string(),
        affiliation: z.string().optional(),
        email: z.string().optional(),
      })),
      institutions: z.array(z.string()),
      fundingSources: z.array(z.string()).optional(),
      correspondingAuthor: z.string().optional(),
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

    return this.parseExtractionResponse(content);
  }

  private parseExtractionResponse(content: string): EntityExtractionResult {
    const jsonMatch = content.match(/```(?:json)?\s*([\s\S]*?)```/);
    const jsonStr = jsonMatch ? jsonMatch[1] : content;
    const cleaned = jsonStr.trim();

    const EntitySchema = z.object({
      authors: z.array(z.object({
        name: z.string(),
        affiliation: z.string().optional(),
        email: z.string().optional(),
      })),
      institutions: z.array(z.string()),
      fundingSources: z.array(z.string()).optional(),
      correspondingAuthor: z.string().optional(),
    });

    try {
      const parsed = JSON.parse(cleaned);
      const data = EntitySchema.parse(parsed);
      return {
        authors: data.authors.map(a => ({ name: a.name, affiliation: a.affiliation, email: a.email })),
        institutions: data.institutions,
        fundingSources: data.fundingSources || [],
        correspondingAuthor: data.correspondingAuthor,
      };
    } catch {
      return {
        authors: [],
        institutions: [],
        fundingSources: [],
        correspondingAuthor: undefined,
      };
    }
  }

  private fallbackExtraction(): EntityExtractionResult {
    return {
      authors: [],
      institutions: [],
      fundingSources: [],
      correspondingAuthor: undefined,
    };
  }

  async enhancePaperWithEntities(paper: ResearchPaper): Promise<ResearchPaper> {
    try {
      const entities = await this.extractFromPaper(paper);
      return {
        ...paper,
        authors: entities.authors.map((a) => a.name),
        affiliations: [...new Set([...paper.affiliations, ...entities.institutions])],
      };
    } catch {
      return paper;
    }
  }
}

let globalEntityExtractor: EntityExtractor | null = null;

export function getEntityExtractor(): EntityExtractor {
  if (!globalEntityExtractor) {
    globalEntityExtractor = new EntityExtractor();
  }
  return globalEntityExtractor;
}
