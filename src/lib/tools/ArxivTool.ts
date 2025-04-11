import { ArXivTool as BeeArXivTool } from 'beeai-framework/tools/arxiv';
import { ResearchPaper } from '@/types';

export class ArxivToolWrapper {
  private tool: BeeArXivTool;

  constructor() {
    this.tool = new BeeArXivTool();
  }

  async searchPapers(query: string, maxResults: number = 100): Promise<ResearchPaper[]> {
    try {
      // Add Ethiopia-related terms to the query if not already present
      const enhancedQuery = this.enhanceQueryWithEthiopianTerms(query);

      console.log('Sending query to ArXiv API:', enhancedQuery);

      // Use the correct format for search_query
      const result = await this.tool.run({
        search_query: {
          include: [{ value: enhancedQuery, field: "all" }]
        },
        maxResults: maxResults,
      });

      console.log('ArXiv API response received');

      if (result.isEmpty()) {
        return [];
      }

      const data = result.result;

      // Log the raw data for debugging
      console.log('ArXiv raw data:', JSON.stringify(data, null, 2));

      // Check if data has the expected structure
      if (!data || !data.entries || !Array.isArray(data.entries)) {
        console.error('ArXiv data does not have the expected structure:', data);
        return [];
      }

      // Transform the ArXiv results to our ResearchPaper format
      console.log(`Processing ${data.entries.length} entries from ArXiv`);

      const papers = data.entries.map((entry: any) => {
        // Log each entry for debugging
        console.log('Processing ArXiv entry:', entry.id, entry.title);
        // Extract Ethiopian affiliations from the authors
        const ethiopianAffiliations = this.extractEthiopianAffiliations(entry);

        // If no Ethiopian affiliations found but query contains Ethiopia terms,
        // add Ethiopia as a default affiliation for search purposes
        const finalAffiliations = ethiopianAffiliations.length > 0
          ? ethiopianAffiliations
          : query.toLowerCase().includes('ethiopia') ? ['Ethiopia'] : [];

        return {
          id: entry.id || `arxiv-${Math.random().toString(36).substring(2, 9)}`,
          title: entry.title || 'Untitled',
          authors: entry.authors?.map((author: any) => author.name) || [],
          abstract: entry.summary || '',
          url: entry.id || '',
          pdfUrl: entry.pdf_url || '',
          publishedDate: entry.published || '',
          affiliations: finalAffiliations,
          source: 'arxiv' as const
        };
      });

      console.log(`ArXiv search found ${papers.length} papers`);
      return papers;
    } catch (error) {
      console.error('Error searching ArXiv papers:', error);
      return [];
    }
  }

  private enhanceQueryWithEthiopianTerms(query: string): string {
    console.log('Original query:', query);

    const ethiopianTerms = ['Ethiopia', 'Ethiopian', 'Addis Ababa', 'Bahir Dar', 'Mekelle', 'Jimma'];

    // Check if any Ethiopian term is already in the query
    const hasEthiopianTerm = ethiopianTerms.some(term =>
      query.toLowerCase().includes(term.toLowerCase())
    );

    // If no Ethiopian term is present, add 'Ethiopia OR Ethiopian' to the query
    if (!hasEthiopianTerm) {
      const enhancedQuery = `${query} AND (Ethiopia OR Ethiopian)`;
      console.log('Enhanced query with Ethiopian terms:', enhancedQuery);
      return enhancedQuery;
    }

    console.log('Query already contains Ethiopian terms, using as is:', query);
    return query;
  }

  private extractEthiopianAffiliations(entry: any): string[] {
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

    // Log for debugging
    console.log('Checking for Ethiopian affiliations in entry:', entry.id);

    // Extract affiliations from authors if available
    if (entry.authors) {
      console.log(`Entry has ${entry.authors.length} authors`);

      entry.authors.forEach((author: any) => {
        console.log('Author:', author.name, 'Affiliation:', author.affiliation || 'None');

        if (author.affiliation && typeof author.affiliation === 'string') {
          const affiliation = author.affiliation;

          // Check if the affiliation contains any Ethiopian university
          ethiopianUniversities.forEach(university => {
            if (affiliation && affiliation.toLowerCase().includes(university.toLowerCase())) {
              console.log(`Found Ethiopian affiliation: ${university} for author ${author.name}`);
              if (!affiliations.includes(university)) {
                affiliations.push(university);
              }
            }
          });
        }
      });
    } else {
      console.log('Entry has no authors information');
    }

    return affiliations;
  }
}

