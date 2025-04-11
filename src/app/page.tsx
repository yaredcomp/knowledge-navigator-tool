'use client';

import { useState } from 'react';
import SearchBar from '@/components/SearchBar';
import ResultsList from '@/components/ResultsList';
import { ResearchPaper, SearchResponse } from '@/types';

export default function Home() {
  const [isLoading, setIsLoading] = useState(false);
  const [processingWithLLM, setProcessingWithLLM] = useState(false);
  const [searchResults, setSearchResults] = useState<SearchResponse | null>(null);
  const [currentQuery, setCurrentQuery] = useState('');
  const [ethiopianOnly, setEthiopianOnly] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [modelInterpretation, setModelInterpretation] = useState<string | null>(null);

  const handleSearch = async (userQuery: string, ethiopianOnly: boolean) => {
    // Clear previous results and errors
    setError(null);
    setCurrentQuery(userQuery);
    setEthiopianOnly(ethiopianOnly);

    // Start LLM processing
    setProcessingWithLLM(true);

    try {
      console.log(`Processing natural language query: ${userQuery}`);

      // First, process the query with the LLM
      const processResponse = await fetch('/api/process-query', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ query: userQuery }),
      });

      if (!processResponse.ok) {
        const errorData = await processResponse.json().catch(() => ({}));
        throw new Error(errorData.error || 'Query processing failed');
      }

      const processedQuery = await processResponse.json();
      console.log('Processed query:', processedQuery);

      // Set the model's interpretation if available
      if (processedQuery.modelInterpretation) {
        setModelInterpretation(processedQuery.modelInterpretation);
      } else {
        setModelInterpretation(null);
      }

      // LLM processing complete
      setProcessingWithLLM(false);

      // Now start the actual search
      setIsLoading(true);

      // Use the POST endpoint for the processed query
      const searchResponse = await fetch('/api/search', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          userQuery,
          page: 1,
          limit: 10,
          // Use the ethiopianOnly flag from the processed query if available
          ethiopianOnly: processedQuery.ethiopianOnly !== undefined ?
            processedQuery.ethiopianOnly : ethiopianOnly
        }),
      });

      if (!searchResponse.ok) {
        const errorData = await searchResponse.json().catch(() => ({}));
        throw new Error(errorData.error || 'Search request failed');
      }

      const data = await searchResponse.json();
      console.log('Search results:', data);
      setSearchResults(data);

      // If no papers found, show a message
      if (data.papers.length === 0) {
        setError('No papers found matching your search criteria. Try different keywords or be more specific.');
      }
    } catch (error: any) {
      console.error('Error in search process:', error);
      setError(error.message || 'An error occurred while processing your search');
      setSearchResults(null);
    } finally {
      setProcessingWithLLM(false);
      setIsLoading(false);
    }
  };

  const handlePageChange = async (page: number) => {
    setIsLoading(true);
    setError(null); // Clear any previous errors

    try {
      // Use the POST endpoint for consistency
      const response = await fetch('/api/search', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          userQuery: currentQuery,
          page,
          limit: 10,
          ethiopianOnly
        }),
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.error || 'Search request failed');
      }

      const data = await response.json();
      setSearchResults(data);
    } catch (error: any) {
      console.error('Error searching papers:', error);
      setError(error.message || 'An error occurred while searching for papers');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen p-4 md:p-8 bg-gray-50 dark:bg-gray-900">
      <SearchBar onSearch={handleSearch} isLoading={isLoading} processingWithLLM={processingWithLLM} />

      {processingWithLLM && (
        <div className="w-full max-w-4xl mx-auto p-4 text-center">
          <p className="text-gray-600 dark:text-gray-300">Processing your query with AI...</p>
        </div>
      )}

      {!processingWithLLM && isLoading && (
        <div className="w-full max-w-4xl mx-auto p-4 text-center">
          <p className="text-gray-600 dark:text-gray-300">Searching for papers...</p>
        </div>
      )}

      {error && !isLoading && (
        <div className="w-full max-w-4xl mx-auto p-4 text-center">
          <p className="text-red-600 dark:text-red-400">{error}</p>
        </div>
      )}

      {modelInterpretation && !processingWithLLM && !isLoading && (
        <div className="w-full max-w-4xl mx-auto p-4 bg-blue-50 dark:bg-blue-900/20 rounded-lg mb-4">
          <h3 className="font-medium text-blue-800 dark:text-blue-300 mb-1">AI understood your query as:</h3>
          <p className="text-gray-700 dark:text-gray-300">{modelInterpretation}</p>
        </div>
      )}

      {!isLoading && !error && searchResults && (
        <ResultsList
          papers={searchResults.papers}
          total={searchResults.total}
          page={searchResults.page}
          limit={searchResults.limit}
          onPageChange={handlePageChange}
        />
      )}

      <footer className="mt-12 py-6 text-center text-sm text-gray-500 dark:text-gray-400">
        <p>AI Research Navigator - Powered by arXiv, Semantic Scholar, and Ollama LLM</p>
      </footer>
    </div>
  );
}
