export interface ResearchPaper {
  id: string;
  title: string;
  authors: string[];
  abstract: string;
  url: string;
  pdfUrl?: string;
  publishedDate?: string;
  affiliations: string[];
  source: 'arxiv' | 'semantic_scholar' | 'other';
}

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
  modelInterpretation?: string; // Added to store the model's interpretation
}

export interface SearchResponse {
  papers: ResearchPaper[];
  total: number;
  page: number;
  limit: number;
}
