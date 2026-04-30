import { LLMProviderType } from '@/types/llm';

export interface DataSourceConfig {
  name: string;
  baseUrl: string;
  requiresApiKey: boolean;
  rateLimit?: number;
  timeout: number;
}

export const DATA_SOURCE_CONFIGS: Record<string, DataSourceConfig> = {
  arxiv: {
    name: 'arXiv',
    baseUrl: 'https://export.arxiv.org/api/query',
    requiresApiKey: false,
    timeout: 30000,
  },
  semantic_scholar: {
    name: 'Semantic Scholar',
    baseUrl: 'https://api.semanticscholar.org/graph/v1',
    requiresApiKey: false,
    rateLimit: 100,
    timeout: 15000,
  },
  crossref: {
    name: 'CrossRef',
    baseUrl: 'https://api.crossref.org',
    requiresApiKey: false,
    rateLimit: 50,
    timeout: 15000,
  },
  doaj: {
    name: 'DOAJ',
    baseUrl: 'https://doaj.org/api/v2',
    requiresApiKey: false,
    timeout: 15000,
  },
  pubmed: {
    name: 'PubMed',
    baseUrl: 'https://eutils.ncbi.nlm.nih.gov/entrez/eutils',
    requiresApiKey: false,
    rateLimit: 10,
    timeout: 20000,
  },
  europe_pmc: {
    name: 'Europe PMC',
    baseUrl: 'https://europepmc.org/backend/rest',
    requiresApiKey: false,
    timeout: 15000,
  },
  core: {
    name: 'CORE',
    baseUrl: 'https://api.core.ac.uk',
    requiresApiKey: true,
    timeout: 15000,
  },
  unpaywall: {
    name: 'UnpayWall',
    baseUrl: 'https://api.unpaywall.org/v2',
    requiresApiKey: true,
    rateLimit: 1000,
    timeout: 10000,
  },
  paperswithcode: {
    name: 'Papers With Code',
    baseUrl: 'https://paperswithcode.com/api/v0.1',
    requiresApiKey: false,
    timeout: 15000,
  },
};

export interface LLMProviderEnvConfig {
  apiKey?: string;
  baseUrl?: string;
  model?: string;
  temperature?: number;
}

export const LLM_PROVIDER_ENV_PREFIX: Record<LLMProviderType, string> = {
  groq: 'GROQ',
  openrouter: 'OPENROUTER',
  ollama: 'OLLAMA',
  openai: 'OPENAI',
};

export function getLLMProviderConfig(provider: LLMProviderType): LLMProviderEnvConfig {
  const prefix = LLM_PROVIDER_ENV_PREFIX[provider];
  const tempEnv = process.env[`${prefix}_TEMPERATURE`];
  return {
    apiKey: process.env[`${prefix}_API_KEY`],
    baseUrl: process.env[`${prefix}_BASE_URL`],
    model: process.env[`${prefix}_CHAT_MODEL`],
    temperature: tempEnv ? parseFloat(tempEnv) : undefined,
  };
}

export const DEFAULT_TIMEOUTS = {
  search: 30000,
  llm: 60000,
  tool: 15000,
} as const;
