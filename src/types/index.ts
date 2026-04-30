export * from './paper';
export * from './llm';

import type { ResearchPaper } from './paper';

export type { ResearchPaper };

export interface SearchParams {
  query: string;
  page?: number;
  limit?: number;
  ethiopianOnly?: boolean;
  authorName?: string;
  affiliation?: string;
  title?: string;
  year?: string;
  topic?: string;
  modelInterpretation?: string;
}

export interface SearchResponse {
  papers: ResearchPaper[];
  total: number;
  page: number;
  limit: number;
}
