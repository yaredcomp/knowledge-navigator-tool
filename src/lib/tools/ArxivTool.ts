import { ArXivTool as BeeArXivTool } from 'beeai-framework/tools/arxiv';
import { ResearchPaper } from '@/types';
import { ETHIOPIAN_UNIVERSITIES, extractEthiopianAffiliations } from '@/config/universities';

export class ArxivToolWrapper {
  private tool: BeeArXivTool;

  constructor() {
    this.tool = new BeeArXivTool();
  }

  async searchPapers(query: string, maxResults: number = 100): Promise<ResearchPaper[]> {
    try {
      const enhancedQuery = query;

      console.log('Sending query to ArXiv API:', enhancedQuery);

      const result = await this.tool.run({
        search_query: {
          include: [{ value: enhancedQuery, field: 'all' }],
        },
        maxResults: maxResults,
      });

      console.log('ArXiv API response received');

      if (result.isEmpty()) {
        return [];
      }

      const data = result.result;

      console.log('ArXiv raw data:', JSON.stringify(data, null, 2));

      if (!data || !data.entries || !Array.isArray(data.entries)) {
        console.error('ArXiv data does not have the expected structure:', data);
        return [];
      }

      console.log(`Processing ${data.entries.length} entries from ArXiv`);

      const papers = data.entries.map((entry: any) => {
        console.log('Processing ArXiv entry:', entry.id, entry.title);
        const ethiopianAffiliations = this.extractEthiopianAffiliations(entry);

        return {
          id: entry.id || `arxiv-${Math.random().toString(36).substring(2, 9)}`,
          title: entry.title || 'Untitled',
          authors: entry.authors?.map((author: any) => author.name) || [],
          abstract: entry.summary || '',
          url: entry.id || '',
          pdfUrl: entry.pdf_url || '',
          publishedDate: entry.published || '',
          affiliations: ethiopianAffiliations,
          source: 'arxiv' as const,
        };
      });

      console.log(`ArXiv search found ${papers.length} papers`);
      return papers;
    } catch (error) {
      console.error('Error searching ArXiv papers:', error);
      return [];
    }
  }

  enhanceQueryWithEthiopianTerms(query: string): string {
    console.log('Original query:', query);

    const hasEthiopianTerm = ETHIOPIAN_UNIVERSITIES.some((uni) =>
      query.toLowerCase().includes(uni.toLowerCase())
    );

    if (!hasEthiopianTerm) {
      const enhancedQuery = `${query} AND (Ethiopia OR Ethiopian)`;
      console.log('Enhanced query with Ethiopian terms:', enhancedQuery);
      return enhancedQuery;
    }

    console.log('Query already contains Ethiopian terms, using as is:', query);
    return query;
  }

  private extractEthiopianAffiliations(entry: any): string[] {
    const affiliations: string[] = [];

    console.log('Checking for Ethiopian affiliations in entry:', entry.id);

    if (entry.authors) {
      console.log(`Entry has ${entry.authors.length} authors`);

      entry.authors.forEach((author: any) => {
        console.log('Author:', author.name, 'Affiliation:', author.affiliation || 'None');

        if (author.affiliation && typeof author.affiliation === 'string') {
          const affiliation = author.affiliation;

          for (const university of ETHIOPIAN_UNIVERSITIES) {
            if (affiliation.toLowerCase().includes(university.toLowerCase())) {
              console.log(`Found Ethiopian affiliation: ${university} for author ${author.name}`);
              if (!affiliations.includes(university)) {
                affiliations.push(university);
              }
            }
          }
        }
      });
    } else {
      console.log('Entry has no authors information');
    }

    return affiliations;
  }
}
