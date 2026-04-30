import { z } from 'zod';
import type { LLMProviderType } from '@/types/llm';
import { FALLBACK_CHAIN } from '@/types/llm';
import { LLMError } from '@/lib/errors/SearchError';
import { getGroqProvider } from './GroqProvider';
import { getOpenRouterProvider } from './OpenRouterProvider';
import { getOllamaProvider } from './OllamaProvider';

export type PaperType = 
  | 'Survey'
  | 'Systematic Review'
  | 'Meta-Analysis'
  | 'Research Article'
  | 'Conference Paper'
  | 'Workshop Paper'
  | 'Thesis/Dissertation'
  | 'Technical Report'
  | 'Preprint'
  | 'Case Study'
  | 'Protocol'
  | 'Dataset Paper'
  | 'Position Paper'
  | 'Review Article'
  | 'Original Article'
  | 'Short Communication'
  | 'Unknown';

export interface PaperAnalysis {
  paperType: PaperType;
  paperTypeJustification: string;
  researchProblem: string;
  researchQuestion: string;
  methodology: string;
  results: string;
  noveltyScore: number;
  noveltyJustification: string;
  keyContributions: string[];
  limitations: string[];
  potentialApplications: string[];
}

const PaperAnalysisSchema = z.object({
  paperType: z.string(),
  paperTypeJustification: z.string(),
  researchProblem: z.string(),
  researchQuestion: z.string(),
  methodology: z.string(),
  results: z.string(),
  noveltyScore: z.number().min(1).max(10),
  noveltyJustification: z.string(),
  keyContributions: z.array(z.string()),
  limitations: z.array(z.string()),
  potentialApplications: z.array(z.string()),
});

const PAPER_TYPES = [
  'Survey', 'Systematic Review', 'Meta-Analysis', 'Research Article', 
  'Conference Paper', 'Workshop Paper', 'Thesis/Dissertation', 'Technical Report',
  'Preprint', 'Case Study', 'Protocol', 'Dataset Paper', 'Position Paper',
  'Review Article', 'Original Article', 'Short Communication', 'Unknown'
];

function detectPaperTypeFromAbstract(abstract: string): { type: PaperType; justification: string } {
  const lower = abstract.toLowerCase();
  
  if (lower.includes('systematic review') || lower.includes('prisma') || lower.includes('prospero')) {
    return { type: 'Systematic Review', justification: 'Keywords indicate a systematic review methodology (PRISM, PROSPERO)' };
  }
  if (lower.includes('meta-analysis') || lower.includes('pooled effect') || lower.includes('forest plot')) {
    return { type: 'Meta-Analysis', justification: 'Keywords indicate statistical meta-analysis with pooled effects' };
  }
  if (lower.includes('survey') && (lower.includes('questionnaire') || lower.includes('respondents') || lower.includes('participants'))) {
    return { type: 'Survey', justification: 'Keywords indicate a questionnaire-based survey study' };
  }
  if (lower.includes('conference') || lower.includes('proceedings') || lower.includes('icml') || lower.includes('neurips') || lower.includes('iclr')) {
    return { type: 'Conference Paper', justification: 'Keywords indicate a conference proceeding' };
  }
  if (lower.includes('preprint') || lower.includes('arxiv') || lower.includes('submitted')) {
    return { type: 'Preprint', justification: 'Keywords indicate a preprint (arXiv or similar)' };
  }
  if (lower.includes('thesis') || lower.includes('dissertation') || lower.includes('phd') || lower.includes('master')) {
    return { type: 'Thesis/Dissertation', justification: 'Keywords indicate an academic thesis or dissertation' };
  }
  if (lower.includes('case study') || lower.includes('patient') || lower.includes('clinical')) {
    return { type: 'Case Study', justification: 'Keywords indicate a case study with individual observations' };
  }
  if (lower.includes('protocol') || lower.includes('methodology') && lower.includes('proposed')) {
    return { type: 'Protocol', justification: 'Keywords indicate a research protocol or methodology proposal' };
  }
  if (lower.includes('dataset') || lower.includes('benchmark') || lower.includes('corpus')) {
    return { type: 'Dataset Paper', justification: 'Keywords indicate a dataset or benchmark paper' };
  }
  if (lower.includes('position') || lower.includes('perspective') || lower.includes('argument')) {
    return { type: 'Position Paper', justification: 'Keywords indicate a position or perspective paper' };
  }
  if (lower.includes('review') && (lower.includes('literature') || lower.includes('overview'))) {
    return { type: 'Review Article', justification: 'Keywords indicate a literature review or overview' };
  }
  if (lower.includes('experiment') || lower.includes('evaluation') || lower.includes('results') || lower.includes('propose')) {
    return { type: 'Research Article', justification: 'Keywords indicate an original research article with experiments' };
  }
  
  return { type: 'Research Article', justification: 'Standard research article format detected' };
}

export class PaperAnalyzer {
  private groqProvider = getGroqProvider();
  private openRouterProvider = getOpenRouterProvider();
  private ollamaProvider = getOllamaProvider();
  private fallbackOrder: LLMProviderType[];

  constructor(fallbackOrder: LLMProviderType[] = FALLBACK_CHAIN) {
    this.fallbackOrder = fallbackOrder;
  }

  async analyzePaper(
    title: string,
    abstract: string,
    authors: string[]
  ): Promise<PaperAnalysis | null> {
    const detected = detectPaperTypeFromAbstract(abstract || '');
    
    if (!abstract || abstract.length < 50) {
      return this.getFallbackAnalysis(title, detected.type, detected.justification);
    }

    const prompt = this.buildAnalysisPrompt(title, abstract, authors, detected.type);

    for (const provider of this.fallbackOrder) {
      try {
        const result = await this.analyzeWithProvider(provider, prompt);
        return {
          ...result,
          paperType: this.mapPaperType(result.paperType),
          paperTypeJustification: result.paperTypeJustification || detected.justification,
        };
      } catch (error) {
        console.error(`Paper analysis failed with ${provider}:`, error);
        continue;
      }
    }

    return this.getFallbackAnalysis(title, detected.type, detected.justification);
  }

  private mapPaperType(typeStr: string): PaperType {
    const normalized = typeStr.trim();
    for (const pt of PAPER_TYPES) {
      if (normalized.toLowerCase().includes(pt.toLowerCase())) {
        return pt as PaperType;
      }
    }
    return 'Unknown';
  }

  private buildAnalysisPrompt(
    title: string,
    abstract: string,
    authors: string[],
    detectedType: string
  ): string {
    return `Analyze this academic paper and provide a structured breakdown.

Paper Title: "${title}"
Authors: ${authors.slice(0, 5).join(', ')}${authors.length > 5 ? ' et al.' : ''}

Abstract:
${abstract}

Based on the title and abstract, analyze this paper and provide:

1. **Paper Type**: Classify the paper type. Choose from: Survey, Systematic Review, Meta-Analysis, Research Article, Conference Paper, Workshop Paper, Thesis/Dissertation, Technical Report, Preprint, Case Study, Protocol, Dataset Paper, Position Paper, Review Article, Original Article, Short Communication, Unknown
2. **Paper Type Justification**: Brief explanation of why you classified it this way
3. **Research Problem**: What real-world problem or gap does this research address?
4. **Research Question**: What specific question does this paper aim to answer?
5. **Methodology**: What research approach, methods, or techniques were used?
6. **Results**: What were the main findings or outcomes?
7. **Novelty Score**: Rate from 1-10 how novel/innovative this paper is (1=incremental, 10=groundbreaking)
8. **Novelty Justification**: Explain why you gave this score
9. **Key Contributions**: List 3-5 main contributions of this paper
10. **Limitations**: What are the potential limitations or weaknesses?
11. **Potential Applications**: How could this research be applied in practice?

Format as JSON with these exact keys:
{
  "paperType": "Research Article",
  "paperTypeJustification": "...",
  "researchProblem": "...",
  "researchQuestion": "...",
  "methodology": "...",
  "results": "...",
  "noveltyScore": 7,
  "noveltyJustification": "...",
  "keyContributions": ["...", "..."],
  "limitations": ["...", "..."],
  "potentialApplications": ["...", "..."]
}`;
  }

  private async analyzeWithProvider(
    provider: LLMProviderType,
    prompt: string
  ): Promise<PaperAnalysis> {
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

    return this.parseAnalysisResponse(content);
  }

  private parseAnalysisResponse(content: string): PaperAnalysis {
    const jsonMatch = content.match(/```(?:json)?\s*([\s\S]*?)```/);
    const jsonStr = jsonMatch ? jsonMatch[1] : content;
    const cleaned = jsonStr.trim();

    try {
      const parsed = JSON.parse(cleaned);
      const data = PaperAnalysisSchema.parse(parsed);
      return {
        paperType: this.mapPaperType(data.paperType),
        paperTypeJustification: data.paperTypeJustification,
        researchProblem: data.researchProblem,
        researchQuestion: data.researchQuestion,
        methodology: data.methodology,
        results: data.results,
        noveltyScore: data.noveltyScore,
        noveltyJustification: data.noveltyJustification,
        keyContributions: data.keyContributions,
        limitations: data.limitations,
        potentialApplications: data.potentialApplications,
      };
    } catch (error) {
      console.error('Failed to parse paper analysis:', error);
      throw new Error('Failed to parse analysis response');
    }
  }

  private getFallbackAnalysis(title: string, type: PaperType, justification: string): PaperAnalysis {
    return {
      paperType: type,
      paperTypeJustification: justification,
      researchProblem: 'Configure an LLM in Settings to enable AI analysis',
      researchQuestion: 'Configure an LLM in Settings to enable AI analysis',
      methodology: 'Configure an LLM in Settings to enable AI analysis',
      results: 'Configure an LLM in Settings to enable AI analysis',
      noveltyScore: 5,
      noveltyJustification: 'Unable to analyze - no LLM configured. Add your API key in Settings.',
      keyContributions: ['Configure an LLM in Settings to see key contributions'],
      limitations: ['Configure an LLM in Settings to see limitations'],
      potentialApplications: ['Configure an LLM in Settings to see potential applications'],
    };
  }
}

let globalPaperAnalyzer: PaperAnalyzer | null = null;

export function getPaperAnalyzer(): PaperAnalyzer {
  if (!globalPaperAnalyzer) {
    globalPaperAnalyzer = new PaperAnalyzer();
  }
  return globalPaperAnalyzer;
}