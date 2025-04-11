import { NextRequest, NextResponse } from 'next/server';
import { QueryProcessor } from '@/lib/queryProcessor';

// Initialize the query processor
const queryProcessor = new QueryProcessor();

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { query } = body;

    if (!query) {
      return NextResponse.json(
        { error: 'Query is required' },
        { status: 400 }
      );
    }

    // Process the query using Ollama
    const processedQuery = await queryProcessor.processQuery(query);

    // Return the processed query
    return NextResponse.json(processedQuery);
  } catch (error) {
    console.error('Error in process-query API:', error);
    return NextResponse.json(
      { error: 'An error occurred while processing the query' },
      { status: 500 }
    );
  }
}
