import { NextRequest, NextResponse } from 'next/server';
import { SearchService } from '@/lib/search';
import { SearchParams } from '@/types';
import { QueryProcessor } from '@/lib/queryProcessor';

// Initialize the search service and query processor
// You can add your Semantic Scholar API key here if you have one
const searchService = new SearchService();
const queryProcessor = new QueryProcessor();

// Handle GET requests (traditional URL parameter-based search)
export async function GET(request: NextRequest) {
  try {
    // Get search parameters from the URL
    const searchParams = request.nextUrl.searchParams;
    const query = searchParams.get('query') || '';
    const page = parseInt(searchParams.get('page') || '1', 10);
    const limit = parseInt(searchParams.get('limit') || '10', 10);
    const ethiopianOnly = searchParams.get('ethiopianOnly') !== 'false';

    // Validate query
    if (!query) {
      return NextResponse.json(
        { error: 'Query parameter is required' },
        { status: 400 }
      );
    }

    // Log search parameters for debugging
    console.log('Search API called with parameters:', { query, page, limit, ethiopianOnly });

    // Search for papers
    const searchOptions: SearchParams = {
      query,
      page,
      limit,
      ethiopianOnly
    };

    const results = await searchService.searchPapers(searchOptions);

    // Log results for debugging
    console.log(`Search API returning ${results.papers.length} papers out of ${results.total} total`);

    // Return the search results
    return NextResponse.json(results);
  } catch (error) {
    console.error('Error in search API:', error);
    return NextResponse.json(
      { error: 'An error occurred while searching for papers' },
      { status: 500 }
    );
  }
}

// Handle POST requests (LLM-processed natural language queries)
export async function POST(request: NextRequest) {
  try {
    // Get the request body
    const body = await request.json();
    const { userQuery, page = 1, limit = 10 } = body;

    // Validate query
    if (!userQuery) {
      return NextResponse.json(
        { error: 'User query is required' },
        { status: 400 }
      );
    }

    // Process the query using Ollama
    console.log('Processing natural language query:', userQuery);
    const processedQuery = await queryProcessor.processQuery(userQuery);

    // Prepare search parameters
    const searchOptions: SearchParams = {
      query: processedQuery.query,
      page,
      limit: processedQuery.limit || limit,
      ethiopianOnly: processedQuery.ethiopianOnly,
      authorName: processedQuery.authorName,
      affiliation: processedQuery.affiliation,
      title: processedQuery.title,
      year: processedQuery.year,
      topic: processedQuery.topic,
      modelInterpretation: processedQuery.modelInterpretation
    };

    console.log('Searching with processed parameters:', searchOptions);

    // Search for papers
    const results = await searchService.searchPapers(searchOptions);

    // Log results for debugging
    console.log(`Search API returning ${results.papers.length} papers out of ${results.total} total`);

    // Return the search results
    return NextResponse.json(results);
  } catch (error) {
    console.error('Error in search API (POST):', error);
    return NextResponse.json(
      { error: 'An error occurred while searching for papers' },
      { status: 500 }
    );
  }
}
