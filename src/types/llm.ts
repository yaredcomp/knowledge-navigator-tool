export type LLMProviderType = 'groq' | 'openrouter' | 'ollama' | 'openai';

export type LLMTaskType = 'query_decomposition' | 'entity_extraction' | 'summarization' | 'synthesis' | 'insights';

export interface LLMProviderConfig {
  provider: LLMProviderType;
  apiKey?: string;
  baseUrl?: string;
  model: string;
  maxTokens?: number;
  temperature?: number;
}

export interface ProcessedQuery {
  query: string;
  authorName: string | null;
  affiliation: string | null;
  topic: string | null;
  ethiopianOnly: boolean;
  year: string | null;
  limit: number | null;
  modelInterpretation: string;
}

export interface LLMResponse {
  content: string;
  raw?: unknown;
  model?: string;
  provider?: LLMProviderType;
}

export interface SummarizationResult {
  summary: string;
  keyPoints: string[];
  originalLength: number;
  summarizedLength: number;
}

export interface EntityExtractionResult {
  authors: Array<{
    name: string;
    affiliation?: string;
    email?: string;
  }>;
  institutions: string[];
  fundingSources: string[];
  correspondingAuthor?: string;
}

export interface SynthesisResult {
  mainThemes: string[];
  keyFindings: string[];
  researchGaps: string[];
  recommendations: string[];
  summary: string;
}

export interface SearchInsightsResult {
  text: string;
  statistics: {
    totalResults: number;
    withEthiopianAffiliation: number;
    byYear: Record<string, number>;
    topAuthors: Array<{ name: string; count: number }>;
  };
}

export const DEFAULT_MODEL_BY_TASK: Record<LLMTaskType, Record<LLMProviderType, string>> = {
  query_decomposition: {
    groq: 'llama-3.3-70b-versatile',
    openrouter: 'openai/gpt-4o-mini',
    ollama: 'llama3.2',
    openai: 'gpt-4o-mini',
  },
  entity_extraction: {
    groq: 'llama-3.3-70b-versatile',
    openrouter: 'anthropic/claude-3.5-sonnet',
    ollama: 'llama3.2',
    openai: 'gpt-4o',
  },
  summarization: {
    groq: 'llama-3.3-70b-versatile',
    openrouter: 'openai/gpt-4o',
    ollama: 'llama3.2',
    openai: 'gpt-4o',
  },
  synthesis: {
    groq: 'llama-3.3-70b-versatile',
    openrouter: 'openai/gpt-4o',
    ollama: 'llama3.2',
    openai: 'gpt-4o',
  },
  insights: {
    groq: 'llama-3.3-70b-versatile',
    openrouter: 'openai/gpt-4o-mini',
    ollama: 'llama3.2',
    openai: 'gpt-4o-mini',
  },
};

export const FALLBACK_CHAIN: LLMProviderType[] = ['groq', 'openrouter', 'ollama'];
