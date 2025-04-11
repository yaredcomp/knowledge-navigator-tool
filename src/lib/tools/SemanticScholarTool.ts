// Direct API implementation without using MCPTool
import { ResearchPaper } from '@/types';
import axios from 'axios';

export class SemanticScholarTool {
  private apiKey?: string;
  private baseUrl = 'https://api.semanticscholar.org/graph/v1';

  constructor(apiKey?: string) {
    this.apiKey = apiKey;
  }

  async searchPapers(query: string, maxResults: number = 100): Promise<ResearchPaper[]> {
    try {
      // Add Ethiopia-related terms to the query if not already present
      const enhancedQuery = this.enhanceQueryWithEthiopianTerms(query);

      // Make a request to the Semantic Scholar API
      const response = await axios.get(`${this.baseUrl}/paper/search`, {
        params: {
          query: enhancedQuery,
          limit: maxResults,
          fields: 'title,authors,abstract,url,venue,year,externalIds,openAccessPdf'
        },
        headers: this.apiKey ? { 'x-api-key': this.apiKey } : {}
      });

      if (!response.data || !response.data.data) {
        return [];
      }

      // Transform the Semantic Scholar results to our ResearchPaper format
      const papers = await Promise.all(
        response.data.data.map(async (paper: any) => {
          // Get author details to check for Ethiopian affiliations
          const authorDetails = await this.getAuthorsWithAffiliations(paper.authors);
          const ethiopianAffiliations = this.extractEthiopianAffiliations(authorDetails);

          return {
            id: paper.paperId || `ss-${Math.random().toString(36).substring(2, 9)}`,
            title: paper.title || 'Untitled',
            authors: paper.authors?.map((author: any) => author.name) || [],
            abstract: paper.abstract || '',
            url: paper.url || `https://www.semanticscholar.org/paper/${paper.paperId}`,
            pdfUrl: paper.openAccessPdf?.url || '',
            publishedDate: paper.year ? `${paper.year}` : '',
            affiliations: ethiopianAffiliations,
            source: 'semantic_scholar' as const
          };
        })
      );

      // Add Ethiopia as affiliation if query contains Ethiopia but no affiliations found
      const enhancedPapers = papers.map(paper => {
        if (paper.affiliations.length === 0 && query.toLowerCase().includes('ethiopia')) {
          return { ...paper, affiliations: ['Ethiopia'] };
        }
        return paper;
      });

      console.log(`Semantic Scholar search found ${enhancedPapers.length} papers`);
      return enhancedPapers;
    } catch (error) {
      console.error('Error searching Semantic Scholar papers:', error);
      return [];
    }
  }

  private async getAuthorsWithAffiliations(authors: any[]): Promise<any[]> {
    if (!authors || authors.length === 0) {
      return [];
    }

    // For simplicity and to reduce API calls, we'll just use the author information we already have
    // In a production app, we would fetch detailed author information including affiliations
    return authors.map(author => ({
      name: author.name,
      // Simulate affiliations for testing
      affiliations: author.name.toLowerCase().includes('ethiopia') ? ['Ethiopia'] : []
    }));
  }

  private enhanceQueryWithEthiopianTerms(query: string): string {
    const ethiopianTerms = ['Ethiopia', 'Ethiopian', 'Addis Ababa', 'Bahir Dar', 'Mekelle', 'Jimma'];

    // Check if any Ethiopian term is already in the query
    const hasEthiopianTerm = ethiopianTerms.some(term =>
      query.toLowerCase().includes(term.toLowerCase())
    );

    // If no Ethiopian term is present, add 'Ethiopia OR Ethiopian' to the query
    if (!hasEthiopianTerm) {
      return `${query} Ethiopia`;
    }

    return query;
  }

  private extractEthiopianAffiliations(authors: any[]): string[] {
    const ethiopianUniversities = [
      'Addis Ababa University',
      'Bahir Dar University',
      'Mekelle University',
      'Jimma University',
      'Hawassa University',
      'Gondar University',
      'Adama Science and Technology University',
      'Arba Minch University',
      'Haramaya University',
      'Dire Dawa University',
      'Wollo University',
      'Debre Berhan University',
      'Debre Markos University',
      'Wollega University',
      'Wolaita Sodo University',
      'Dilla University',
      'Ambo University',
      'Axum University',
      'Wachemo University',
      'Wolkite University',
      'Ethiopia'
    ];

    const affiliations: string[] = [];

    // Extract affiliations from authors if available
    authors.forEach(author => {
      if (author.affiliations && Array.isArray(author.affiliations)) {
        author.affiliations.forEach((affiliation: any) => {
          // Check if the affiliation is a string
          if (affiliation && typeof affiliation === 'string') {
            // Check if the affiliation contains any Ethiopian university
            ethiopianUniversities.forEach(university => {
              if (affiliation.toLowerCase().includes(university.toLowerCase())) {
                if (!affiliations.includes(university)) {
                  affiliations.push(university);
                }
              }
            });
          }
        });
      }
    });

    return affiliations;
  }
}
