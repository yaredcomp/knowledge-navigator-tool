'use client';

import { useState, useEffect, FormEvent } from 'react';

interface SearchBarProps {
  onSearch: (userQuery: string, ethiopianOnly: boolean) => void;
  isLoading: boolean;
  processingWithLLM: boolean;
}

export default function SearchBar({ onSearch, isLoading, processingWithLLM }: SearchBarProps) {
  const [query, setQuery] = useState('Find AI research papers about machine learning by Ethiopian researchers');
  const [ethiopianOnly, setEthiopianOnly] = useState(false);

  // Perform initial search on component mount
  useEffect(() => {
    if (query.trim()) {
      onSearch(query, ethiopianOnly);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleSubmit = (e: FormEvent) => {
    e.preventDefault();
    if (query.trim()) {
      onSearch(query, ethiopianOnly);
    }
  };

  return (
    <div className="w-full max-w-4xl mx-auto p-4">
      <h1 className="text-3xl font-bold text-center mb-6">
        AI Research Navigator
      </h1>
      <p className="text-center mb-8 text-gray-600 dark:text-gray-300">
        Search for AI research papers using natural language
      </p>

      <form onSubmit={handleSubmit} className="flex flex-col gap-4">
        <div className="flex flex-col md:flex-row gap-2">
          <input
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Try: 'Find papers about machine learning by Ethiopian researchers published after 2020'"
            className="flex-grow p-3 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            disabled={isLoading || processingWithLLM}
          />
          <button
            type="submit"
            className="bg-blue-600 text-white py-3 px-6 rounded-md hover:bg-blue-700 transition-colors disabled:bg-blue-400"
            disabled={isLoading || processingWithLLM || !query.trim()}
          >
            {isLoading ? 'Searching...' : processingWithLLM ? 'Processing...' : 'Search'}
          </button>
        </div>

        <div className="text-sm text-gray-500 italic">
          <p>Ask in natural language - our AI will understand what you're looking for!</p>
        </div>

        <div className="flex items-center gap-2">
          <input
            type="checkbox"
            id="ethiopianOnly"
            checked={ethiopianOnly}
            onChange={(e) => setEthiopianOnly(e.target.checked)}
            className="h-4 w-4"
          />
          <label htmlFor="ethiopianOnly" className="text-sm">
            Show only papers with Ethiopian university affiliations
          </label>
        </div>
      </form>
    </div>
  );
}
