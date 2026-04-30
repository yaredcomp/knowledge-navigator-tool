import { NextRequest, NextResponse } from 'next/server';
import { getPaperAnalyzer } from '@/lib/llm/PaperAnalyzer';

export async function POST(request: NextRequest) {
  try {
    const { title, abstract, authors } = await request.json();

    if (!title) {
      return NextResponse.json({ error: 'Paper title is required' }, { status: 400 });
    }

    console.log('Analyzing paper:', title.substring(0, 50));

    const analyzer = getPaperAnalyzer();
    const analysis = await analyzer.analyzePaper(title, abstract || '', authors || []);

    if (!analysis) {
      return NextResponse.json({ error: 'Analysis unavailable - no LLM configured or available' }, { status: 503 });
    }

    return NextResponse.json(analysis);
  } catch (error) {
    console.error('Error analyzing paper:', error);
    const message = error instanceof Error ? error.message : 'Unknown error';
    return NextResponse.json({ error: `Failed to analyze paper: ${message}` }, { status: 500 });
  }
}