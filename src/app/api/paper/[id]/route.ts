import { NextRequest, NextResponse } from 'next/server';
import { ArxivToolWrapper } from '@/lib/tools/ArxivTool';
import { SemanticScholarTool } from '@/lib/tools/SemanticScholarTool';

// Initialize the tools
const arxivTool = new ArxivToolWrapper();
const semanticScholarTool = new SemanticScholarTool();

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const id = params.id;
    
    if (!id) {
      return NextResponse.json(
        { error: 'Paper ID is required' },
        { status: 400 }
      );
    }
    
    // Determine which source to query based on the ID prefix
    if (id.startsWith('arxiv-')) {
      // Query arXiv
      const arxivId = id.replace('arxiv-', '');
      const papers = await arxivTool.searchPapers(`id:${arxivId}`, 1);
      
      if (papers.length === 0) {
        return NextResponse.json(
          { error: 'Paper not found' },
          { status: 404 }
        );
      }
      
      return NextResponse.json(papers[0]);
    } else if (id.startsWith('ss-')) {
      // Query Semantic Scholar
      const ssId = id.replace('ss-', '');
      const papers = await semanticScholarTool.searchPapers(`id:${ssId}`, 1);
      
      if (papers.length === 0) {
        return NextResponse.json(
          { error: 'Paper not found' },
          { status: 404 }
        );
      }
      
      return NextResponse.json(papers[0]);
    } else {
      // Try both sources
      const [arxivPapers, ssPapers] = await Promise.all([
        arxivTool.searchPapers(`id:${id}`, 1),
        semanticScholarTool.searchPapers(`id:${id}`, 1)
      ]);
      
      if (arxivPapers.length > 0) {
        return NextResponse.json(arxivPapers[0]);
      }
      
      if (ssPapers.length > 0) {
        return NextResponse.json(ssPapers[0]);
      }
      
      return NextResponse.json(
        { error: 'Paper not found' },
        { status: 404 }
      );
    }
  } catch (error) {
    console.error('Error fetching paper:', error);
    return NextResponse.json(
      { error: 'An error occurred while fetching the paper' },
      { status: 500 }
    );
  }
}
