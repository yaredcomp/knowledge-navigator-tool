export interface ResearchPaper {
  id: string;
  title: string;
  authors: string[];
  abstract: string;
  url: string;
  pdfUrl?: string;
  publishedDate?: string;
  affiliations: string[];
  source: DataSource;
  doi?: string;
  citationCount?: number;
  abstractStructured?: PaperStructuredAbstract;
}

export type DataSource = 'arxiv' | 'semantic_scholar' | 'crossref' | 'doaj' | 'pubmed' | 'europe_pmc' | 'core' | 'unpaywall' | 'paperswithcode' | 'other';

export interface PaperStructuredAbstract {
  background?: string;
  objectives?: string;
  methods?: string;
  results?: string;
  conclusions?: string;
}

export interface PaperAuthor {
  name: string;
  affiliation?: string;
  email?: string;
  orcid?: string;
}

export interface PaperEntity {
  authors: PaperAuthor[];
  institutions: string[];
  fundingSources: string[];
  correspondingAuthor?: string;
  keywords: string[];
}

export interface SearchFilters {
  query: string;
  ethiopianOnly?: boolean;
  authorName?: string;
  affiliation?: string;
  topic?: string;
  year?: string;
  limit?: number;
  page?: number;
}

export interface SearchResult {
  papers: ResearchPaper[];
  total: number;
  page: number;
  limit: number;
  sources: DataSource[];
  ethiopianCount: number;
  searchInsights?: SearchInsights;
}

export interface SearchInsights {
  mainThemes: string[];
  keyFindings: string[];
  researchGaps: string[];
  recommendations: string[];
  summary: string;
  statistics: SearchStatistics;
}

export interface SearchStatistics {
  totalResults: number;
  withEthiopianAffiliation: number;
  byYear: Record<string, number>;
  bySource: Record<DataSource, number>;
  topAuthors: Array<{ name: string; count: number }>;
}

export interface AggregatedSearchResult {
  papers: ResearchPaper[];
  total: number;
  ethiopianPapers: ResearchPaper[];
  insights: SearchInsights;
  sources: DataSource[];
}
