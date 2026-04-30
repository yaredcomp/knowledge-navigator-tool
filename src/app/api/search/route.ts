import { NextRequest, NextResponse } from 'next/server';
import { SearchService } from '@/lib/search';
import { SearchParams } from '@/types';
import { getQueryDecomposer, QueryDecomposer } from '@/lib/llm/QueryDecomposer';
import { getSearchInsightsGenerator, SearchInsightsGenerator } from '@/lib/llm/SearchInsightsGenerator';

const searchService = new SearchService();

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const query = searchParams.get('query') || '';
    const page = parseInt(searchParams.get('page') || '1', 10);
    const limit = parseInt(searchParams.get('limit') || '10', 10);
    const ethiopianOnly = searchParams.get('ethiopianOnly') !== 'false';

    if (!query) {
      return NextResponse.json({ error: 'Query parameter is required' }, { status: 400 });
    }

    console.log('Search API called with parameters:', { query, page, limit, ethiopianOnly });

    const searchOptions: SearchParams = {
      query,
      page,
      limit,
      ethiopianOnly,
    };

    const results = await searchService.searchPapers(searchOptions);

    console.log(`Search API returning ${results.papers.length} papers out of ${results.total} total`);

    return NextResponse.json(results);
  } catch (error) {
    console.error('Error in search API:', error);
    return NextResponse.json({ error: 'An error occurred while searching for papers' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { userQuery, page = 1, limit = 10, generateInsights = false } = body;

    if (!userQuery) {
      return NextResponse.json({ error: 'User query is required' }, { status: 400 });
    }

    console.log('Processing natural language query:', userQuery);

    const queryDecomposer = getQueryDecomposer();
    const processedQuery = await queryDecomposer.processQuery(userQuery);

    const searchOptions: SearchParams = {
      query: processedQuery.query,
      page,
      limit: processedQuery.limit || limit,
      ethiopianOnly: processedQuery.ethiopianOnly,
      authorName: processedQuery.authorName ?? undefined,
      affiliation: processedQuery.affiliation ?? undefined,
      topic: processedQuery.topic ?? undefined,
      year: processedQuery.year ?? undefined,
      modelInterpretation: processedQuery.modelInterpretation,
    };

    console.log('Searching with processed parameters:', searchOptions);

    const results = await searchService.searchPapers(searchOptions);

    if (generateInsights && results.papers.length > 0) {
      const insightsGenerator = getSearchInsightsGenerator();
      const insights = await insightsGenerator.generateInsights(results, userQuery);
      return NextResponse.json({ ...results, insights });
    }

    console.log(`Search API returning ${results.papers.length} papers out of ${results.total} total`);

    return NextResponse.json(results);
  } catch (error) {
    console.error('Error in search API (POST):', error);
    return NextResponse.json({ error: 'An error occurred while searching for papers' }, { status: 500 });
  }
}
