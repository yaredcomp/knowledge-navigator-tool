import { ResearchPaper } from '@/types';
import axios from 'axios';
import { ETHIOPIAN_UNIVERSITIES } from '@/config/universities';
import { DATA_SOURCE_CONFIGS } from '@/config/api-config';

export class SemanticScholarTool {
  private apiKey?: string;
  private baseUrl: string;

  constructor(apiKey?: string) {
    this.apiKey = apiKey || process.env.SEMANTIC_SCHOLAR_API_KEY;
    this.baseUrl = DATA_SOURCE_CONFIGS.semantic_scholar.baseUrl;
  }

  async searchPapers(query: string, maxResults: number = 100): Promise<ResearchPaper[]> {
    const maxRetries = 4;
    const baseDelay = 3000;

    for (let attempt = 1; attempt <= maxRetries; attempt++) {
      try {
        console.log(`Semantic Scholar attempt ${attempt}/${maxRetries} for: "${query}"`);

        const response = await axios.get(`${this.baseUrl}/paper/search`, {
          params: {
            query: query,
            limit: Math.min(maxResults, 100),
            offset: 0,
            fields: 'title,authors,abstract,url,venue,year,externalIds,openAccessPdf,citationCount',
          },
          headers: {
            'Accept': 'application/json',
            ...(this.apiKey ? { 'x-api-key': this.apiKey } : {}),
          },
          timeout: 25000,
          validateStatus: () => true,
        });

        console.log('Semantic Scholar response status:', response.status);

        if (response.status === 429) {
          const delay = baseDelay * Math.pow(2, attempt - 1);
          console.log(`Rate limited. Waiting ${delay}ms before retry ${attempt + 1}/${maxRetries}...`);
          await new Promise(resolve => setTimeout(resolve, delay));
          continue;
        }

        if (response.status !== 200) {
          console.error('Semantic Scholar HTTP error:', response.status, response.statusText);
          if (attempt < maxRetries) {
            const delay = baseDelay * attempt;
            console.log(`Waiting ${delay}ms before retry...`);
            await new Promise(resolve => setTimeout(resolve, delay));
            continue;
          }
          return [];
        }

        const data = response.data;
        if (!data) {
          console.log('Empty response from Semantic Scholar');
          return [];
        }

        if (data.message && data.code === '429') {
          console.log('Rate limited (429 in body). Waiting before retry...');
          const delay = baseDelay * Math.pow(2, attempt - 1);
          await new Promise(resolve => setTimeout(resolve, delay));
          continue;
        }

        if (data.error) {
          console.error('Semantic Scholar API error:', data.error);
          return [];
        }

        const papersData = data.data || [];
        console.log(`Semantic Scholar returned ${papersData.length} results (total: ${data.total})`);

        if (papersData.length === 0) {
          console.log('No papers found in response');
          return [];
        }

        const papers = papersData.map((paper: any) => {
          const potentialAffiliations = this.extractPotentialAffiliations(paper);

          return {
            id: paper.paperId || `ss-${Math.random().toString(36).substring(2, 9)}`,
            title: paper.title || 'Untitled',
            authors: paper.authors?.map((author: any) => author.name).filter(Boolean) || [],
            abstract: paper.abstract || '',
            url: paper.url || (paper.paperId ? `https://www.semanticscholar.org/paper/${paper.paperId}` : ''),
            pdfUrl: paper.openAccessPdf?.url || '',
            publishedDate: paper.year ? String(paper.year) : '',
            affiliations: potentialAffiliations,
            source: 'semantic_scholar' as const,
            citationCount: paper.citationCount || 0,
          };
        });

        console.log(`Processed ${papers.length} papers from Semantic Scholar`);
        return papers;
      } catch (error: any) {
        console.error(`Semantic Scholar attempt ${attempt} error:`, error.message);

        if (attempt === maxRetries) {
          console.error('All Semantic Scholar attempts failed');
          break;
        }

        const delay = baseDelay * Math.pow(2, attempt - 1);
        console.log(`Waiting ${delay}ms before retry ${attempt + 1}/${maxRetries}...`);
        await new Promise(resolve => setTimeout(resolve, delay));
      }
    }

    return [];
  }

  extractPotentialAffiliations(paper: any): string[] {
    const affiliations: string[] = [];

    this.checkTextForAffiliations(paper.title, affiliations);
    this.checkTextForAffiliations(paper.abstract, affiliations);
    this.checkTextForAffiliations(paper.venue, affiliations);

    if (paper.authors && Array.isArray(paper.authors)) {
      paper.authors.forEach((author: any) => {
        if (author.name) {
          this.checkTextForAffiliations(author.name, affiliations);
        }
      });
    }

    return affiliations;
  }

  private checkTextForAffiliations(text: string | undefined, affiliations: string[]): void {
    if (!text) return;

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

  enhanceQueryWithEthiopianTerms(query: string): string {
    const hasEthiopianTerm = ETHIOPIAN_UNIVERSITIES.some((uni) =>
      query.toLowerCase().includes(uni.toLowerCase())
    );

    if (!hasEthiopianTerm) {
      return `${query} Ethiopia`;
    }

    return query;
  }
}