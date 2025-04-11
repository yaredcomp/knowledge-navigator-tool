import { Ollama } from 'ollama';

interface ProcessedQuery {
  query: string;
  authorName?: string;
  affiliation?: string;
  title?: string;
  topic?: string;
  ethiopianOnly: boolean;
  year?: string;
  limit?: number;
  modelInterpretation?: string; // Added to store the model's interpretation
}

export class QueryProcessor {
  private ollama: Ollama;
  private model: string;

  constructor(model: string = 'llama3.2') {
    this.ollama = new Ollama({
      host: 'http://localhost:11434',
    });
    this.model = model;
  }

  async processQuery(userInput: string): Promise<ProcessedQuery> {
    try {
      console.log('Processing query with Ollama:', userInput);

      try {
        // Check if Ollama is available by making a simple request
        await fetch('http://localhost:11434/api/tags');
      } catch (error) {
        console.error('Ollama is not available:', error);
        // Fallback to basic processing without LLM
        return this.fallbackProcessing(userInput);
      }

      const prompt = `
You are a research paper search assistant. Your task is to analyze the user's search query and extract structured information.

User query: "${userInput}"

First, provide a brief interpretation of what you think the user is looking for in plain language.

Then extract the following information (if present):
1. Author name(s)
2. Affiliation(s)
3. Paper title or keywords
4. Research topic or field
5. Whether the user specifically wants Ethiopian research papers
6. Publication year
7. Number of results requested (if not specified, assume the user wants as many results as possible)

Format your response as a valid JSON object with these fields:
{
  "modelInterpretation": "Your interpretation of the user's query in plain language",
  "query": "the main search query",
  "authorName": "extracted author name or null",
  "affiliation": "extracted affiliation or null",
  "title": "extracted paper title or null",
  "topic": "extracted research topic or null",
  "ethiopianOnly": boolean (true only if user specifically mentioned Ethiopian research),
  "year": "publication year or null",
  "limit": null
}

Only respond with the JSON object, nothing else.
`;

      let parsedResponse: ProcessedQuery;

      try {
        const response = await this.ollama.chat({
          model: this.model,
          messages: [
            {
              role: 'user',
              content: prompt,
            },
          ],
          format: 'json',
        });

        console.log('Ollama response:', response.message.content);

        // Parse the JSON response
        try {
          parsedResponse = JSON.parse(response.message.content) as ProcessedQuery;
        } catch (error) {
          console.error('Failed to parse Ollama response as JSON:', error);
          return this.fallbackProcessing(userInput);
        }
      } catch (error) {
        console.error('Error calling Ollama API:', error);
        return this.fallbackProcessing(userInput);
      }

      // Ensure ethiopianOnly is set
      parsedResponse.ethiopianOnly = parsedResponse.ethiopianOnly || false;

      // If no specific query was extracted, use the original input
      if (!parsedResponse.query || parsedResponse.query.trim() === '') {
        parsedResponse.query = userInput;
      }

      console.log('Processed query:', parsedResponse);
      return parsedResponse;
    } catch (error) {
      console.error('Error processing query with Ollama:', error);
      return this.fallbackProcessing(userInput);
    }
  }

  private fallbackProcessing(userInput: string): ProcessedQuery {
    console.log('Using fallback query processing for:', userInput);

    // Basic extraction of potential parameters
    const lowerInput = userInput.toLowerCase();

    // Check for Ethiopian mentions
    const ethiopianOnly = lowerInput.includes('ethiopia') || lowerInput.includes('ethiopian');

    // Check for author mentions
    let authorName: string | undefined = undefined;
    if (lowerInput.includes('author') || lowerInput.includes('by ')) {
      const authorMatch = userInput.match(/(?:author|by)\s+([\w\s]+?)(?:\s+(?:in|from|about|published|year|on|at|with|and|or|\.|$))/i);
      if (authorMatch && authorMatch[1]) {
        authorName = authorMatch[1].trim();
      }
    }

    // Check for year mentions
    let year: string | undefined = undefined;
    const yearMatch = userInput.match(/(?:in|from|year|published in|since)\s+(\d{4})/i);
    if (yearMatch && yearMatch[1]) {
      year = yearMatch[1];
    }

    // Check for affiliation mentions
    let affiliation: string | undefined = undefined;
    if (lowerInput.includes('university') || lowerInput.includes('institute') || lowerInput.includes('college')) {
      const affiliationMatch = userInput.match(/(?:at|from|in)\s+([\w\s]+?(?:university|institute|college)[\w\s]*?)(?:\s+(?:in|from|about|published|year|on|with|and|or|\.|$))/i);
      if (affiliationMatch && affiliationMatch[1]) {
        affiliation = affiliationMatch[1].trim();
      }
    }

    // Create a model interpretation
    let modelInterpretation = `Looking for research papers about ${userInput}`;
    if (authorName) modelInterpretation += ` by ${authorName}`;
    if (affiliation) modelInterpretation += ` from ${affiliation}`;
    if (year) modelInterpretation += ` published in ${year}`;
    if (ethiopianOnly) modelInterpretation += ` with Ethiopian affiliations`;

    return {
      query: userInput,
      ethiopianOnly,
      authorName: authorName,
      year: year,
      affiliation: affiliation,
      modelInterpretation: modelInterpretation + '. (Processed without LLM)',
    };
  }
}
