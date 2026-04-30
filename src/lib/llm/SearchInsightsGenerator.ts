import { z } from 'zod';
import type { ResearchPaper, SearchResult, SearchStatistics, SearchInsights, DataSource } from '@/types/paper';
import type { LLMProviderType } from '@/types/llm';
import { FALLBACK_CHAIN } from '@/types/llm';
import { LLMError } from '@/lib/errors/SearchError';
import { getGroqProvider } from './GroqProvider';
import { getOpenRouterProvider } from './OpenRouterProvider';
import { getOllamaProvider } from './OllamaProvider';

const ALL_DATA_SOURCES: DataSource[] = ['arxiv', 'semantic_scholar', 'crossref', 'doaj', 'pubmed', 'europe_pmc', 'core', 'unpaywall', 'paperswithcode', 'other'];

export class SearchInsightsGenerator {
  private groqProvider = getGroqProvider();
  private openRouterProvider = getOpenRouterProvider();
  private ollamaProvider = getOllamaProvider();
  private fallbackOrder: LLMProviderType[];

  constructor(fallbackOrder: LLMProviderType[] = FALLBACK_CHAIN) {
    this.fallbackOrder = fallbackOrder;
  }

  async generateInsights(searchResult: SearchResult, query: string): Promise<SearchInsights> {
    if (searchResult.papers.length === 0) {
      return this.emptyInsights();
    }

    const stats = this.calculateStatistics(searchResult);
    const prompt = this.buildInsightsPrompt(searchResult, query, stats);
    const errors: Error[] = [];

    for (const provider of this.fallbackOrder) {
      try {
        const result = await this.generateInsightsWithProvider(provider, prompt);
        return {
          ...result,
          statistics: stats,
        };
      } catch (error) {
        console.error(`Insights generation failed with ${provider}:`, error);
        errors.push(error as Error);
      }
    }

    return this.fallbackInsights(searchResult, stats);
  }

  private calculateStatistics(searchResult: SearchResult): SearchStatistics {
    const byYear: Record<string, number> = {};
    const bySource: Record<DataSource, number> = {} as Record<DataSource, number>;
    const authorCounts: Record<string, number> = {};

    for (const source of ALL_DATA_SOURCES) {
      bySource[source] = 0;
    }

    for (const paper of searchResult.papers) {
      if (paper.publishedDate) {
        const year = paper.publishedDate.substring(0, 4);
        byYear[year] = (byYear[year] || 0) + 1;
      }

      bySource[paper.source] = (bySource[paper.source] || 0) + 1;

      for (const author of paper.authors) {
        authorCounts[author] = (authorCounts[author] || 0) + 1;
      }
    }

    const topAuthors = Object.entries(authorCounts)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 10)
      .map(([name, count]) => ({ name, count }));

    return {
      totalResults: searchResult.total,
      withEthiopianAffiliation: searchResult.ethiopianCount,
      byYear,
      bySource,
      topAuthors,
    };
  }

  private buildInsightsPrompt(
    searchResult: SearchResult,
    query: string,
    stats: SearchStatistics
  ): string {
    return `Analyze these search results for the query: "${query}"

Statistics:
- Total papers found: ${stats.totalResults}
- Papers with Ethiopian affiliation: ${stats.withEthiopianAffiliation}
- Publications by year: ${JSON.stringify(stats.byYear)}
- Publications by source: ${JSON.stringify(stats.bySource)}
- Top authors: ${stats.topAuthors.map((a) => `${a.name} (${a.count})`).join(', ')}

${searchResult.papers.length > 0 ? `
Sample papers (first 10):
${searchResult.papers.slice(0, 10).map((p, i) => `
${i + 1}. "${p.title}"
   Authors: ${p.authors.slice(0, 3).join(', ')}${p.authors.length > 3 ? ' et al.' : ''}
   Year: ${p.publishedDate?.substring(0, 4) || 'Unknown'}
   Source: ${p.source}
`).join('\n')}
` : ''}

Provide a structured analysis with:
1. mainThemes: Array of main research themes/trends
2. keyFindings: Array of key findings from the papers
3. researchGaps: Array of identified research gaps or areas needing more study
4. recommendations: Array of recommendations for researchers
5. summary: A paragraph summarizing the research landscape

Format as JSON with these exact keys.`;
  }

  private async generateInsightsWithProvider(
    provider: LLMProviderType,
    prompt: string
  ): Promise<Omit<SearchInsights, 'statistics'>> {
    const InsightsSchema = z.object({
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

    return this.parseInsightsResponse(content);
  }

  private parseInsightsResponse(content: string): Omit<SearchInsights, 'statistics'> {
    const jsonMatch = content.match(/```(?:json)?\s*([\s\S]*?)```/);
    const jsonStr = jsonMatch ? jsonMatch[1] : content;
    const cleaned = jsonStr.trim();

    const InsightsSchema = z.object({
      mainThemes: z.array(z.string()),
      keyFindings: z.array(z.string()),
      researchGaps: z.array(z.string()),
      recommendations: z.array(z.string()),
      summary: z.string(),
    });

    try {
      const parsed = JSON.parse(cleaned);
      const data = InsightsSchema.parse(parsed);
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

  private emptyInsights(): SearchInsights {
    const emptyStats: SearchStatistics = {
      totalResults: 0,
      withEthiopianAffiliation: 0,
      byYear: {},
      bySource: {} as Record<DataSource, number>,
      topAuthors: [],
    };
    for (const source of ALL_DATA_SOURCES) {
      emptyStats.bySource[source] = 0;
    }
    return {
      mainThemes: [],
      keyFindings: [],
      researchGaps: [],
      recommendations: [],
      summary: 'No papers found matching your search criteria.',
      statistics: emptyStats,
    };
  }

  private fallbackInsights(searchResult: SearchResult, stats: SearchStatistics): SearchInsights {
    return {
      mainThemes: [`Found ${searchResult.total} papers on the requested topic`],
      keyFindings: searchResult.papers.slice(0, 5).map((p) => p.title),
      researchGaps: ['Further research needed to identify gaps'],
      recommendations: ['Consider expanding search parameters or trying different keywords'],
      summary: `${searchResult.total} papers were found matching your criteria. ${searchResult.ethiopianCount} papers have Ethiopian affiliations. Review individual papers for details.`,
      statistics: stats,
    };
  }
}

let globalSearchInsightsGenerator: SearchInsightsGenerator | null = null;

export function getSearchInsightsGenerator(): SearchInsightsGenerator {
  if (!globalSearchInsightsGenerator) {
    globalSearchInsightsGenerator = new SearchInsightsGenerator();
  }
  return globalSearchInsightsGenerator;
}
