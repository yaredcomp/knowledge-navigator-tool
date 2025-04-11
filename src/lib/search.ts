import { ArxivToolWrapper } from './tools/ArxivTool';
import { SemanticScholarTool } from './tools/SemanticScholarTool';
import { ResearchPaper, SearchParams, SearchResponse } from '@/types';

export class SearchService {
  private arxivTool: ArxivToolWrapper;
  private semanticScholarTool: SemanticScholarTool;

  constructor(semanticScholarApiKey?: string) {
    this.arxivTool = new ArxivToolWrapper();
    this.semanticScholarTool = new SemanticScholarTool(semanticScholarApiKey);
  }

  async searchPapers(params: SearchParams): Promise<SearchResponse> {
    const {
      query,
      page = 1,
      limit = 50, // Increased default limit to get more results
      ethiopianOnly = false, // Default to false now - only filter if explicitly requested
      authorName,
      affiliation,
      title,
      year,
      topic,
      modelInterpretation
    } = params;

    // Log the model's interpretation if available
    if (modelInterpretation) {
      console.log('Model interpretation of query:', modelInterpretation);
    }

    // Build enhanced query based on parameters
    let enhancedQuery = query;

    // Add author name to query if provided
    if (authorName) {
      enhancedQuery += ` author:"${authorName}"`;
    }

    // Add affiliation to query if provided
    if (affiliation) {
      enhancedQuery += ` affiliation:"${affiliation}"`;
    }

    // Add title to query if provided
    if (title) {
      enhancedQuery += ` title:"${title}"`;
    }

    // Add year to query if provided
    if (year) {
      enhancedQuery += ` year:${year}`;
    }

    // Add topic to query if provided
    if (topic) {
      enhancedQuery += ` ${topic}`;
    }

    console.log('Enhanced query:', enhancedQuery);

    try {
      // Search papers from both sources
      const [arxivPapers, semanticScholarPapers] = await Promise.all([
        this.arxivTool.searchPapers(enhancedQuery, limit * 2),
        this.semanticScholarTool.searchPapers(enhancedQuery, limit * 2)
      ]);

      console.log(`ArXiv returned ${arxivPapers.length} papers`);
      console.log(`Semantic Scholar returned ${semanticScholarPapers.length} papers`);

      // Combine and deduplicate results
      let allPapers = [...arxivPapers, ...semanticScholarPapers];
      console.log(`Combined papers before deduplication: ${allPapers.length}`);

      // Remove duplicates based on title similarity
      allPapers = this.deduplicatePapers(allPapers);
      console.log(`Papers after deduplication: ${allPapers.length}`);

      // Filter for Ethiopian affiliations if requested and if we have papers with affiliations
      if (ethiopianOnly) {
        const papersWithAffiliations = allPapers.filter(paper => paper.affiliations.length > 0);

        // Only filter if we have papers with affiliations, otherwise show all results
        if (papersWithAffiliations.length > 0) {
          allPapers = papersWithAffiliations;
          console.log(`Filtered to ${allPapers.length} papers with Ethiopian affiliations`);
        } else {
          console.log('No papers with Ethiopian affiliations found, showing all results');
        }
      }

      // Sort by relevance (for now, just by title match)
      allPapers = this.sortByRelevance(allPapers, query);

      // Paginate results
      const startIndex = (page - 1) * limit;
      const paginatedPapers = allPapers.slice(startIndex, startIndex + limit);

      return {
        papers: paginatedPapers,
        total: allPapers.length,
        page,
        limit
      };
    } catch (error) {
      console.error('Error searching papers:', error);
      return {
        papers: [],
        total: 0,
        page,
        limit
      };
    }
  }

  private deduplicatePapers(papers: ResearchPaper[]): ResearchPaper[] {
    const uniquePapers: ResearchPaper[] = [];
    const titles = new Set<string>();

    for (const paper of papers) {
      const normalizedTitle = paper.title.toLowerCase().trim();

      if (!titles.has(normalizedTitle)) {
        titles.add(normalizedTitle);
        uniquePapers.push(paper);
      }
    }

    return uniquePapers;
  }

  private sortByRelevance(papers: ResearchPaper[], query: string): ResearchPaper[] {
    const queryTerms = query.toLowerCase().split(' ');

    return papers.sort((a, b) => {
      const titleA = a.title.toLowerCase();
      const titleB = b.title.toLowerCase();

      // Count how many query terms appear in each title
      const matchesA = queryTerms.filter(term => titleA.includes(term)).length;
      const matchesB = queryTerms.filter(term => titleB.includes(term)).length;

      if (matchesB !== matchesA) {
        return matchesB - matchesA; // Sort by number of matches
      }

      // If same number of matches, prefer papers with more Ethiopian affiliations
      return b.affiliations.length - a.affiliations.length;
    });
  }
}
