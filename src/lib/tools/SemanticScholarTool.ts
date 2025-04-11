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
      console.log('Searching Semantic Scholar for:', query);

      // Don't automatically add Ethiopian terms - only if specifically requested
      const enhancedQuery = query;

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
        console.log('No data returned from Semantic Scholar API');
        return [];
      }

      console.log(`Semantic Scholar API returned ${response.data.data.length} results`);

      // Transform the Semantic Scholar results to our ResearchPaper format
      const papers = response.data.data.map((paper: any) => {
        // Extract potential affiliations from author names and paper title
        const potentialAffiliations = this.extractPotentialAffiliations(paper);

        return {
          id: paper.paperId || `ss-${Math.random().toString(36).substring(2, 9)}`,
          title: paper.title || 'Untitled',
          authors: paper.authors?.map((author: any) => author.name) || [],
          abstract: paper.abstract || '',
          url: paper.url || `https://www.semanticscholar.org/paper/${paper.paperId}`,
          pdfUrl: paper.openAccessPdf?.url || '',
          publishedDate: paper.year ? `${paper.year}` : '',
          affiliations: potentialAffiliations,
          source: 'semantic_scholar' as const
        };
      });

      console.log(`Processed ${papers.length} papers from Semantic Scholar`);
      return papers;
    } catch (error) {
      console.error('Error searching Semantic Scholar papers:', error);
      return [];
    }
  }

  private extractPotentialAffiliations(paper: any): string[] {
    const affiliations: string[] = [];
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

    // Check paper title
    if (paper.title) {
      const title = paper.title.toLowerCase();
      ethiopianUniversities.forEach(university => {
        if (title.includes(university.toLowerCase()) && !affiliations.includes(university)) {
          affiliations.push(university);
        }
      });
    }

    // Check abstract
    if (paper.abstract) {
      const abstract = paper.abstract.toLowerCase();
      ethiopianUniversities.forEach(university => {
        if (abstract.includes(university.toLowerCase()) && !affiliations.includes(university)) {
          affiliations.push(university);
        }
      });
    }

    // Check venue
    if (paper.venue) {
      const venue = paper.venue.toLowerCase();
      ethiopianUniversities.forEach(university => {
        if (venue.includes(university.toLowerCase()) && !affiliations.includes(university)) {
          affiliations.push(university);
        }
      });
    }

    // Check authors
    if (paper.authors && Array.isArray(paper.authors)) {
      paper.authors.forEach((author: any) => {
        if (author.name) {
          const authorName = author.name.toLowerCase();
          ethiopianUniversities.forEach(university => {
            if (authorName.includes(university.toLowerCase()) && !affiliations.includes(university)) {
              affiliations.push(university);
            }
          });
        }
      });
    }

    return affiliations;
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
