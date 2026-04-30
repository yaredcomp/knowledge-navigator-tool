import { z } from 'zod';
import type { ResearchPaper } from '@/types/paper';
import type { LLMProviderType, SynthesisResult } from '@/types/llm';
import { FALLBACK_CHAIN } from '@/types/llm';
import { LLMError } from '@/lib/errors/SearchError';
import { getGroqProvider } from './GroqProvider';
import { getOpenRouterProvider } from './OpenRouterProvider';
import { getOllamaProvider } from './OllamaProvider';

export class SynthesisEngine {
  private groqProvider = getGroqProvider();
  private openRouterProvider = getOpenRouterProvider();
  private ollamaProvider = getOllamaProvider();
  private fallbackOrder: LLMProviderType[];

  constructor(fallbackOrder: LLMProviderType[] = FALLBACK_CHAIN) {
    this.fallbackOrder = fallbackOrder;
  }

  async synthesize(papers: ResearchPaper[], query: string): Promise<SynthesisResult> {
    if (papers.length === 0) {
      return {
        mainThemes: [],
        keyFindings: [],
        researchGaps: [],
        recommendations: [],
        summary: 'No papers to synthesize.',
      };
    }

    const papersContext = this.buildPapersContext(papers);
    const prompt = this.buildSynthesisPrompt(papersContext, query);
    const errors: Error[] = [];

    for (const provider of this.fallbackOrder) {
      try {
        const result = await this.synthesizeWithProvider(provider, prompt);
        return result;
      } catch (error) {
        console.error(`Synthesis failed with ${provider}:`, error);
        errors.push(error as Error);
      }
    }

    return this.fallbackSynthesis(papers);
  }

  async synthesizeRelatedPapers(
    mainPaper: ResearchPaper,
    relatedPapers: ResearchPaper[]
  ): Promise<{ comparison: string; similarities: string[]; differences: string[] }> {
    const prompt = this.buildComparisonPrompt(mainPaper, relatedPapers);
    const errors: Error[] = [];

    for (const provider of this.fallbackOrder) {
      try {
        const result = await this.synthesizeWithProvider(provider, prompt);
        return {
          comparison: result.summary,
          similarities: result.mainThemes,
          differences: result.keyFindings,
        };
      } catch (error) {
        console.error(`Related paper synthesis failed with ${provider}:`, error);
        errors.push(error as Error);
      }
    }

    return {
      comparison: 'Synthesis unavailable.',
      similarities: [],
      differences: [],
    };
  }

  private buildPapersContext(papers: ResearchPaper[]): string {
    return papers
      .map(
        (p, i) => `
Paper ${i + 1}:
Title: ${p.title}
Authors: ${p.authors.join(', ')}
Published: ${p.publishedDate || 'Unknown'}
Source: ${p.source}
Affiliations: ${p.affiliations.join(', ') || 'Unknown'}
Abstract: ${p.abstract}
`.trim()
      )
      .join('\n---\n');
  }

  private buildSynthesisPrompt(papersContext: string, query: string): string {
    return `Based on the following research papers, synthesize key findings related to: "${query}"

${papersContext}

Provide a structured synthesis with:
1. mainThemes: Array of main themes/trends across papers
2. keyFindings: Array of key findings
3. researchGaps: Array of identified research gaps
4. recommendations: Array of recommendations for future research
5. summary: A 2-3 paragraph summary of the overall research landscape

Format as JSON.`;
  }

  private buildComparisonPrompt(mainPaper: ResearchPaper, relatedPapers: ResearchPaper[]): string {
    return `Compare these related research papers:

Main Paper:
Title: ${mainPaper.title}
Authors: ${mainPaper.authors.join(', ')}
Abstract: ${mainPaper.abstract}

Related Papers:
${relatedPapers.map((p, i) => `
${i + 1}. Title: ${p.title}
   Authors: ${p.authors.join(', ')}
   Abstract: ${p.abstract}
`).join('\n')}

Return JSON with:
- mainThemes: Array of key similarities
- keyFindings: Array of key differences
- summary: How do these papers relate to each other?

Format as JSON.`;
  }

  private async synthesizeWithProvider(provider: LLMProviderType, prompt: string): Promise<SynthesisResult> {
    const SynthesisSchema = z.object({
      mainThemes: z.array(z.string()),
      keyFindings: z.array(z.string()),
      researchGaps: z.array(z.string()),
      recommendations: z.array(z.string()),
      summary: z.string(),
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

    return this.parseSynthesisResponse(content);
  }

  private parseSynthesisResponse(content: string): SynthesisResult {
    const jsonMatch = content.match(/```(?:json)?\s*([\s\S]*?)```/);
    const jsonStr = jsonMatch ? jsonMatch[1] : content;
    const cleaned = jsonStr.trim();

    const SynthesisSchema = z.object({
      mainThemes: z.array(z.string()),
      keyFindings: z.array(z.string()),
      researchGaps: z.array(z.string()),
      recommendations: z.array(z.string()),
      summary: z.string(),
    });

    try {
      const parsed = JSON.parse(cleaned);
      const data = SynthesisSchema.parse(parsed);
      return {
        mainThemes: data.mainThemes,
        keyFindings: data.keyFindings,
        researchGaps: data.researchGaps,
        recommendations: data.recommendations,
        summary: data.summary,
      };
    } catch {
      return {
        mainThemes: [],
        keyFindings: [],
        researchGaps: [],
        recommendations: [],
        summary: content,
      };
    }
  }

  private fallbackSynthesis(papers: ResearchPaper[]): SynthesisResult {
    return {
      mainThemes: [`Found ${papers.length} papers on the requested topic`],
      keyFindings: papers.slice(0, 5).map((p) => p.title),
      researchGaps: ['Further research needed to identify gaps'],
      recommendations: ['Consider expanding search parameters'],
      summary: `${papers.length} papers were found matching your criteria. Review individual papers for details.`,
    };
  }
}

let globalSynthesisEngine: SynthesisEngine | null = null;

export function getSynthesisEngine(): SynthesisEngine {
  if (!globalSynthesisEngine) {
    globalSynthesisEngine = new SynthesisEngine();
  }
  return globalSynthesisEngine;
}
