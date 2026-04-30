import { ResearchPaper } from '@/types';
import axios from 'axios';
import { ETHIOPIAN_UNIVERSITIES } from '@/config/universities';
import { DATA_SOURCE_CONFIGS } from '@/config/api-config';

export class CrossRefTool {
  private baseUrl: string;
  private email: string;

  constructor(email: string = 'research@example.com') {
    this.baseUrl = DATA_SOURCE_CONFIGS.crossref.baseUrl;
    this.email = email;
  }

  async searchPapers(query: string, maxResults: number = 50): Promise<ResearchPaper[]> {
    try {
      console.log('Searching CrossRef for:', query);

      const response = await axios.get(`${this.baseUrl}/works`, {
        params: {
          query: query,
          rows: Math.min(maxResults, 100),
          select: 'DOI,title,author,container-title,published-print,published-online,abstract,URL,type',
          mailto: this.email,
        },
        timeout: 15000,
        headers: {
          'User-Agent': `KnowledgeNavigator/1.0 (mailto:${this.email})`,
        },
      });

      console.log('CrossRef response status:', response.status);

      if (!response.data?.message?.items) {
        console.log('No data returned from CrossRef API');
        return [];
      }

      console.log(`CrossRef API returned ${response.data.message.items.length} results`);

      const papers = response.data.message.items.map((item: any) => {
        const potentialAffiliations = this.extractPotentialAffiliations(item);

        return {
          id: item.DOI ? `crossref-${encodeURIComponent(item.DOI)}` : `cr-${Math.random().toString(36).substring(2, 9)}`,
          title: item.title?.[0] || 'Untitled',
          authors: item.author?.map((author: any) => {
            const name = [author.given, author.family].filter(Boolean).join(' ');
            return name || '';
          }).filter(Boolean) || [],
          abstract: item.abstract || '',
          url: item.URL || (item.DOI ? `https://doi.org/${item.DOI}` : ''),
          pdfUrl: '',
          publishedDate: item['published-print']?.['date-parts']?.[0]?.[0] 
            || item['published-online']?.['date-parts']?.[0]?.[0] 
            || '',
          affiliations: potentialAffiliations,
          source: 'crossref' as const,
          citationCount: 0,
        };
      });

      console.log(`Processed ${papers.length} papers from CrossRef`);
      return papers;
    } catch (error: any) {
      if (axios.isAxiosError(error)) {
        console.error('CrossRef API Error:', {
          status: error.response?.status,
          statusText: error.response?.statusText,
          message: error.message,
        });
      } else {
        console.error('Error searching CrossRef papers:', error);
      }
      return [];
    }
  }

  extractPotentialAffiliations(item: any): string[] {
    const affiliations: string[] = [];
    const textFields = [
      item.title?.[0],
      item.abstract,
      item.container_title?.[0],
      ...(item.author?.map((a: any) => a.affiliation?.map((aff: any) => aff.name)).flat() || []),
    ];

    for (const text of textFields) {
      if (!text) continue;
      this.checkTextForAffiliations(text, affiliations);
    }

    return affiliations;
  }

  private checkTextForAffiliations(text: string, affiliations: string[]): void {
    const lowerText = text.toLowerCase();
    for (const university of ETHIOPIAN_UNIVERSITIES) {
      if (
        lowerText.includes(university.toLowerCase()) &&
        !affiliations.includes(university)
      ) {
        affiliations.push(university);
      }
    }
  }
}