'use client';

import { useState, useEffect, FormEvent } from 'react';
import { ResearchPaper, SearchResult } from '@/types';
import SettingsModal from '@/components/SettingsModal';
import PaperAnalysisPanel from '@/components/PaperAnalysisPanel';
import { useTheme } from '@/components/ThemeProvider';

interface FilterState {
  yearRange: { start: number; end: number };
  paperTypes: string[];
  affiliations: string[];
  sources: string[];
  minCitations: number;
}

interface LLMProviderSettings {
  groq: { apiKey: string; model: string; enabled: boolean };
  openrouter: { apiKey: string; model: string; enabled: boolean };
  ollama: { host: string; model: string; enabled: boolean };
}

const PAPER_TYPES = ['Journal Article', 'Conference', 'Preprint', 'Book', 'Dataset', 'Thesis'];
const CURRENT_YEAR = new Date().getFullYear();
const YEAR_OPTIONS = Array.from({ length: 25 }, (_, i) => CURRENT_YEAR - i);

export default function Home() {
  const [query, setQuery] = useState('machine learning');
  const [ethiopianOnly, setEthiopianOnly] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [processingWithLLM, setProcessingWithLLM] = useState(false);
  const [searchResults, setSearchResults] = useState<SearchResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [modelInterpretation, setModelInterpretation] = useState<string | null>(null);
  const [showSettings, setShowSettings] = useState(false);
  const [llmSettings, setLlmSettings] = useState<LLMProviderSettings | null>(null);
  
  const [filters, setFilters] = useState<FilterState>({
    yearRange: { start: 2020, end: CURRENT_YEAR },
    paperTypes: [],
    affiliations: [],
    sources: [],
    minCitations: 0,
  });
  const [sortBy, setSortBy] = useState<'relevance' | 'citations' | 'year'>('relevance');
  const [expandedPaper, setExpandedPaper] = useState<string | null>(null);
  const { theme, toggleTheme } = useTheme();

  useEffect(() => {
    const saved = localStorage.getItem('llm_provider_settings');
    if (saved) {
      try {
        setLlmSettings(JSON.parse(saved));
      } catch {
        setLlmSettings(null);
      }
    }
  }, []);

  const applyFilters = (papers: ResearchPaper[]): ResearchPaper[] => {
    return papers.filter(paper => {
      if (filters.yearRange.start || filters.yearRange.end) {
        const paperYear = paper.publishedDate ? new Date(paper.publishedDate).getFullYear() : 0;
        if (paperYear < filters.yearRange.start || paperYear > filters.yearRange.end) return false;
      }
      if (filters.affiliations.length > 0) {
        const hasAffiliation = paper.affiliations.some(a => 
          filters.affiliations.some(fa => a.toLowerCase().includes(fa.toLowerCase()))
        );
        if (!hasAffiliation && paper.affiliations.length > 0) return false;
      }
      if (filters.sources.length > 0 && !filters.sources.includes(paper.source)) return false;
      if (filters.minCitations > 0 && (paper.citationCount || 0) < filters.minCitations) return false;
      return true;
    }).sort((a, b) => {
      if (sortBy === 'citations') return (b.citationCount || 0) - (a.citationCount || 0);
      if (sortBy === 'year') {
        const yearA = a.publishedDate ? new Date(a.publishedDate).getFullYear() : 0;
        const yearB = b.publishedDate ? new Date(b.publishedDate).getFullYear() : 0;
        return yearB - yearA;
      }
      return 0;
    });
  };

  const handleSearch = async (e?: FormEvent) => {
    if (e) e.preventDefault();
    if (!query.trim()) return;

    setError(null);
    setProcessingWithLLM(true);
    setIsLoading(true);
    setExpandedPaper(null);

    try {
      const [processRes, searchRes] = await Promise.all([
        fetch('/api/process-query', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ query }),
        }),
        fetch('/api/search', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            userQuery: query,
            page: 1,
            limit: 50,
            ethiopianOnly,
          }),
        }),
      ]);

      const processed = await processRes.json();
      const results = await searchRes.json();

      if (processed.modelInterpretation) {
        setModelInterpretation(processed.modelInterpretation);
      }

      if (!searchRes.ok) {
        throw new Error(results.error || 'Search failed');
      }

      setSearchResults(results);

      if (results.papers?.length === 0) {
        setError('No papers found. Try different keywords.');
      }
    } catch (err: any) {
      console.error('Search error:', err);
      setError(err.message || 'An error occurred');
      setSearchResults(null);
    } finally {
      setProcessingWithLLM(false);
      setIsLoading(false);
    }
  };

  const handlePageChange = async (page: number) => {
    setIsLoading(true);
    try {
      const res = await fetch('/api/search', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userQuery: query, page, limit: 50, ethiopianOnly }),
      });
      const data = await res.json();
      setSearchResults(data);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setIsLoading(false);
    }
  };

  const handleSaveSettings = (settings: LLMProviderSettings) => {
    setLlmSettings(settings);
    localStorage.setItem('llm_provider_settings', JSON.stringify(settings));
  };

  const filteredPapers = searchResults ? applyFilters(searchResults.papers) : [];
  const uniqueAffiliations = searchResults?.papers.flatMap(p => p.affiliations).filter((v, i, a) => a.indexOf(v) === i) || [];

  return (
    <div className="min-h-screen bg-[var(--bg-primary)] text-gray-300">
      <div className="fixed inset-0 pointer-events-none overflow-hidden">
        <div className="absolute top-0 left-1/4 w-[600px] h-[600px] bg-gradient-radial from-blue-900/8 to-transparent rounded-full" />
        <div className="absolute bottom-0 right-1/4 w-[500px] h-[500px] bg-gradient-radial from-amber-900/5 to-transparent rounded-full" />
        <div className="absolute inset-0 bg-[url('data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHdpZHRoPSI0MCIgaGVpZ2h0PSI0MCI+CjxyZWN0IHdpZHRoPSI0MCIgaGVpZ2h0PSI0MCIgZmlsbD0ibm9uZSIvPgo8cGF0aCBkPSJNMCAwTDQwIDQwTDAgNDRWMHptMjAgMjBMNDAgMjBMMjAgMjBMMjAgMjBNMjAgNDBMNDAgMjBMMjAgMjBMMjAgMjAiIGZpbGw9IiNmZmZmZmYiIGZpbGwtb3BhY2l0eT0iLjAyIi8+Cjwvc3ZnPg==')] opacity-30" />
      </div>

      <header className="relative border-b border-gray-800/60 bg-[var(--bg-primary)]/80 backdrop-blur-xl sticky top-0 z-50">
        <div className="max-w-[1600px] mx-auto px-6 py-4">
          <div className="flex items-center justify-between gap-6">
            <div className="flex items-center gap-4 flex-shrink-0">
              <div className="w-9 h-9 rounded-lg bg-gradient-to-br from-amber-500 to-amber-600 flex items-center justify-center">
                <svg className="w-5 h-5 text-gray-900" fill="currentColor" viewBox="0 0 24 24">
                  <path d="M12 2L2 7l10 5 10-5-10-5zM2 17l10 5 10-5M2 12l10 5 10-5" />
                </svg>
              </div>
              <span className="text-lg font-semibold text-white tracking-tight">Knowledge Navigator</span>
            </div>

            <form onSubmit={handleSearch} className="flex-1 max-w-3xl">
              <div className="relative group">
                <div className="absolute inset-0 bg-gradient-to-r from-amber-500/10 to-blue-500/10 rounded-xl opacity-0 group-hover:opacity-100 transition-opacity" />
                <div className="relative flex items-center bg-[var(--bg-card)] rounded-xl border border-gray-700/50 focus-within:border-amber-500/50 transition-colors">
                  <div className="pl-4">
                    <svg className="w-5 h-5 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                    </svg>
                  </div>
                  <input
                    type="text"
                    value={query}
                    onChange={(e) => setQuery(e.target.value)}
                    placeholder="Search papers, authors, topics, or DOIs..."
                    className="flex-1 px-4 py-3 bg-transparent text-gray-200 placeholder-gray-500 focus:outline-none"
                  />
                  <div className="pr-2">
                    <button
                      type="submit"
                      disabled={isLoading || processingWithLLM || !query.trim()}
                      className="px-4 py-2 bg-gradient-to-r from-amber-500 to-amber-600 text-gray-900 font-medium rounded-lg hover:opacity-90 transition-opacity disabled:opacity-50 text-sm"
                    >
                      {isLoading || processingWithLLM ? (
                        <span className="flex items-center gap-2">
                          <svg className="w-4 h-4 animate-spin" fill="none" viewBox="0 0 24 24">
                            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                          </svg>
                        </span>
                      ) : (
                        'Search'
                      )}
                    </button>
                  </div>
                </div>
              </div>
            </form>

            <button
              onClick={toggleTheme}
              className="p-2.5 rounded-lg hover:bg-[var(--bg-card)] border border-transparent hover:border-gray-700/50 transition-all"
              title={theme === 'dark' ? 'Switch to light mode' : 'Switch to dark mode'}
            >
              {theme === 'dark' ? (
                <svg className="w-5 h-5 text-amber-400" fill="currentColor" viewBox="0 0 24 24">
                  <path d="M12 3v1m0 16v1m9-9h-1M4 12H3m15.364 6.364l-.707-.707M6.343 6.343l-.707-.707m12.728 0l-.707.707M6.343 17.657l-.707.707M16 12a4 4 0 11-8 0 4 4 0 018 0z" />
                </svg>
              ) : (
                <svg className="w-5 h-5 text-gray-600" fill="currentColor" viewBox="0 0 24 24">
                  <path d="M20.354 15.354A9 9 0 018.646 3.646 9.003 9.003 0 0012 21a9.003 9.003 0 008.354-5.646z" />
                </svg>
              )}
            </button>

            <button
              onClick={() => setShowSettings(true)}
              className="p-2.5 rounded-lg hover:bg-[var(--bg-card)] border border-transparent hover:border-gray-700/50 transition-all"
            >
              <svg className="w-5 h-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
              </svg>
            </button>
          </div>
        </div>
      </header>

      <main className="relative max-w-[1600px] mx-auto flex gap-6 p-6">
        <aside className="w-72 flex-shrink-0 hidden lg:block">
          <div className="sticky top-24 space-y-6">
            <div className="bg-[var(--bg-card)] rounded-xl border border-gray-800/50 p-5">
              <h3 className="text-sm font-semibold text-white uppercase tracking-wider mb-4">Publication Year</h3>
              <div className="space-y-3">
                <div className="flex items-center gap-3">
                  <input
                    type="number"
                    value={filters.yearRange.start}
                    onChange={(e) => setFilters(f => ({ ...f, yearRange: { ...f.yearRange, start: parseInt(e.target.value) || 0 } }))}
                    className="w-20 px-2 py-1.5 bg-[var(--bg-primary)] border border-gray-700 rounded text-sm text-gray-300 focus:border-amber-500/50 focus:outline-none"
                    placeholder="From"
                  />
                  <span className="text-gray-500">to</span>
                  <input
                    type="number"
                    value={filters.yearRange.end}
                    onChange={(e) => setFilters(f => ({ ...f, yearRange: { ...f.yearRange, end: parseInt(e.target.value) || CURRENT_YEAR } }))}
                    className="w-20 px-2 py-1.5 bg-[var(--bg-primary)] border border-gray-700 rounded text-sm text-gray-300 focus:border-amber-500/50 focus:outline-none"
                    placeholder="To"
                  />
                </div>
                <div className="flex flex-wrap gap-2">
                  {[2024, 2023, 2022, 2021, 2020].map(year => (
                    <button
                      key={year}
                      onClick={() => setFilters(f => ({ ...f, yearRange: { start: year, end: year } }))}
                      className="px-2.5 py-1 text-xs rounded-md bg-[var(--bg-primary)] text-gray-400 hover:text-amber-400 hover:bg-amber-500/10 border border-gray-800 hover:border-amber-500/30 transition-all"
                    >
                      {year}
                    </button>
                  ))}
                </div>
              </div>
            </div>

            <div className="bg-[var(--bg-card)] rounded-xl border border-gray-800/50 p-5">
              <h3 className="text-sm font-semibold text-white uppercase tracking-wider mb-4">Sources</h3>
              <div className="space-y-2">
                {['arxiv', 'semantic_scholar', 'crossref'].map(source => (
                  <label key={source} className="flex items-center gap-3 cursor-pointer group">
                    <input
                      type="checkbox"
                      checked={filters.sources.includes(source)}
                      onChange={(e) => setFilters(f => ({
                        ...f,
                        sources: e.target.checked 
                          ? [...f.sources, source]
                          : f.sources.filter(s => s !== source)
                      }))}
className="w-4 h-4 rounded border-gray-700 bg-[var(--bg-primary)] text-amber-500 focus:ring-amber-500/30 focus:ring-offset-0"
                    />
                    <span className="text-sm text-gray-400 group-hover:text-gray-300 capitalize">{source.replace('_', ' ')}</span>
                  </label>
                ))}
              </div>
            </div>

            <div className="bg-[var(--bg-card)] rounded-xl border border-gray-800/50 p-5">
              <h3 className="text-sm font-semibold text-white uppercase tracking-wider mb-4">Citations</h3>
              <div className="space-y-3">
                <input
                  type="range"
                  min="0"
                  max="500"
                  value={filters.minCitations}
                  onChange={(e) => setFilters(f => ({ ...f, minCitations: parseInt(e.target.value) }))}
                  className="w-full accent-amber-500"
                />
                <div className="flex justify-between text-xs text-gray-500">
                  <span>0</span>
                  <span className="text-amber-400">{filters.minCitations}+ citations</span>
                  <span>500+</span>
                </div>
              </div>
            </div>

            {uniqueAffiliations.length > 0 && (
              <div className="bg-[var(--bg-card)] rounded-xl border border-gray-800/50 p-5">
                <h3 className="text-sm font-semibold text-white uppercase tracking-wider mb-4">Affiliations</h3>
                <div className="flex flex-wrap gap-2">
                  {uniqueAffiliations.slice(0, 8).map(aff => (
                    <button
                      key={aff}
                      onClick={() => setFilters(f => ({
                        ...f,
                        affiliations: f.affiliations.includes(aff) 
                          ? f.affiliations.filter(a => a !== aff)
                          : [...f.affiliations, aff]
                      }))}
                      className={`px-2.5 py-1 text-xs rounded-md border transition-all ${
                        filters.affiliations.includes(aff)
                          ? 'bg-amber-500/20 text-amber-400 border-amber-500/30'
                          : 'bg-[var(--bg-primary)] text-gray-400 border-gray-800 hover:border-gray-700'
                      }`}
                    >
                      {aff.length > 25 ? aff.slice(0, 25) + '...' : aff}
                    </button>
                  ))}
                </div>
              </div>
            )}

            <label className="flex items-center gap-3 p-4 bg-[var(--bg-card)] rounded-xl border border-gray-800/50 cursor-pointer hover:border-amber-500/30 transition-all">
              <input
                type="checkbox"
                checked={ethiopianOnly}
                onChange={(e) => setEthiopianOnly(e.target.checked)}
                className="w-4 h-4 rounded border-gray-700 bg-[var(--bg-primary)] text-amber-500 focus:ring-amber-500/30 focus:ring-offset-0"
              />
              <span className="text-sm text-gray-300">Ethiopian institutions only</span>
            </label>
          </div>
        </aside>

        <div className="flex-1 min-w-0">
          {error && (
            <div className="mb-6 p-4 bg-red-900/20 border border-red-800/30 rounded-lg text-red-400">
              {error}
            </div>
          )}

          {modelInterpretation && !processingWithLLM && !isLoading && (
            <div className="mb-6 p-4 bg-amber-500/10 border border-amber-500/20 rounded-lg">
              <div className="flex items-start gap-3">
                <svg className="w-5 h-5 text-amber-400 mt-0.5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                <div>
                  <p className="text-sm font-medium text-amber-400 mb-1">AI Query Analysis</p>
                  <p className="text-sm text-gray-400">{modelInterpretation}</p>
                </div>
              </div>
            </div>
          )}

          {searchResults && searchResults.papers.length > 0 && (
            <div>
              <div className="flex items-center justify-between mb-6 pb-4 border-b border-gray-800/50">
                <div className="flex items-center gap-4">
                  <h2 className="text-xl font-semibold text-white">
                    {filteredPapers.length} Results
                  </h2>
                  {searchResults.ethiopianCount > 0 && (
                    <span className="px-2.5 py-1 text-xs rounded-full bg-amber-500/20 text-amber-400 border border-amber-500/30">
                      {searchResults.ethiopianCount} Ethiopian
                    </span>
                  )}
                </div>
                <div className="flex items-center gap-3">
                  <span className="text-sm text-gray-500">Sort by:</span>
                  <select
                    value={sortBy}
                    onChange={(e) => setSortBy(e.target.value as any)}
                    className="px-3 py-1.5 bg-[var(--bg-card)] border border-gray-700 rounded-lg text-sm text-gray-300 focus:outline-none focus:border-amber-500/50"
                  >
                    <option value="relevance">Relevance</option>
                    <option value="citations">Citations</option>
                    <option value="year">Year</option>
                  </select>
                </div>
              </div>

              <div className="space-y-4">
                {filteredPapers.map((paper, idx) => (
                  <article
                    key={paper.id}
                    className="group bg-[var(--bg-card)] rounded-xl border border-gray-800/50 hover:border-amber-500/30 transition-all duration-300 overflow-hidden"
                    style={{ animationDelay: `${idx * 30}ms` }}
                  >
                    <div className="p-5">
                      <div className="flex items-start justify-between gap-4 mb-3">
                        <div className="flex-1 min-w-0">
                          <h3 className="text-lg font-medium text-white group-hover:text-amber-400 transition-colors line-clamp-2 leading-snug">
                            {paper.title}
                          </h3>
                        </div>
                        {(paper.citationCount || 0) > 0 && (
                          <div className="flex-shrink-0 flex items-center gap-1.5 px-2.5 py-1 bg-blue-500/10 rounded-full border border-blue-500/20">
                            <svg className="w-3.5 h-3.5 text-blue-400" fill="currentColor" viewBox="0 0 20 20">
                              <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
                            </svg>
                            <span className="text-xs font-medium text-blue-400">{paper.citationCount}</span>
                          </div>
                        )}
                      </div>

                      <div className="flex flex-wrap items-center gap-x-4 gap-y-2 text-sm text-gray-400 mb-4">
                        <div className="flex items-center gap-1.5 max-w-[300px]">
                          <svg className="w-4 h-4 text-gray-500 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
                          </svg>
                          <span className="truncate">
                            {paper.authors.slice(0, 4).join(', ')}
                            {paper.authors.length > 4 && ` +${paper.authors.length - 4} more`}
                          </span>
                        </div>
                        {paper.publishedDate && (
                          <>
                            <span className="text-gray-600">|</span>
                            <span className="text-gray-300 font-medium">{new Date(paper.publishedDate).getFullYear()}</span>
                          </>
                        )}
                        <span className="text-gray-600">|</span>
                        <span className="px-2 py-0.5 text-xs rounded bg-[var(--bg-primary)] text-gray-400 border border-gray-800">
                          {paper.source.replace('_', ' ')}
                        </span>
                      </div>

                      {paper.abstract && (
                        <div className="relative">
                          <p className={`text-sm text-gray-400 leading-relaxed ${expandedPaper === paper.id ? '' : 'line-clamp-3'}`}>
                            {paper.abstract}
                          </p>
                          {paper.abstract.length > 300 && (
                            <button
                              onClick={() => setExpandedPaper(expandedPaper === paper.id ? null : paper.id)}
                              className="mt-2 text-sm text-amber-400 hover:text-amber-300 transition-colors"
                            >
                              {expandedPaper === paper.id ? 'Show less' : 'Show more'}
                            </button>
                          )}
                        </div>
                      )}

                      {paper.affiliations.length > 0 && (
                        <div className="flex flex-wrap gap-2 mt-4 pt-4 border-t border-gray-800/50">
                          {paper.affiliations.map((aff, i) => (
                            <span key={i} className="px-2.5 py-1 text-xs rounded-md bg-amber-500/10 text-amber-400/80 border border-amber-500/20">
                              {aff}
                            </span>
                          ))}
                        </div>
                      )}

                      <div className="flex items-center gap-3 mt-4 pt-4 border-t border-gray-800/50">
                        <a
                          href={paper.url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="flex items-center gap-2 px-3 py-1.5 text-sm text-gray-300 hover:text-white hover:bg-[var(--bg-primary)] rounded-lg transition-all"
                        >
                          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
                          </svg>
                          View
                        </a>
                        {paper.pdfUrl && (
                          <a
                            href={paper.pdfUrl}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="flex items-center gap-2 px-3 py-1.5 text-sm text-amber-400 hover:text-amber-300 hover:bg-amber-500/10 rounded-lg transition-all"
                          >
                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                            </svg>
                            PDF
                          </a>
                        )}
                      </div>

                      <PaperAnalysisPanel
                        title={paper.title}
                        abstract={paper.abstract}
                        authors={paper.authors}
                        paperId={paper.id}
                      />
                    </div>
                  </article>
                ))}
              </div>

              {searchResults.total > 50 && (
                <div className="flex items-center justify-center gap-2 mt-8">
                  {Array.from({ length: Math.ceil(searchResults.total / 50) }, (_, i) => i + 1).slice(0, 7).map((page) => (
                    <button
                      key={page}
                      onClick={() => handlePageChange(page)}
                      disabled={isLoading}
                      className={`w-9 h-9 rounded-lg text-sm font-medium transition-all ${
                        page === searchResults.page
                          ? 'bg-amber-500 text-gray-900'
                          : 'bg-[var(--bg-card)] text-gray-400 hover:bg-[var(--bg-tertiary)] border border-gray-800'
                      }`}
                    >
                      {page}
                    </button>
                  ))}
                </div>
              )}
            </div>
          )}

          {!searchResults && !isLoading && (
            <div className="flex flex-col items-center justify-center py-24 text-center">
              <div className="w-20 h-20 mb-6 rounded-2xl bg-gradient-to-br from-amber-500/20 to-blue-500/20 flex items-center justify-center">
                <svg className="w-10 h-10 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                </svg>
              </div>
              <h3 className="text-xl font-semibold text-white mb-2">Discover Research</h3>
              <p className="text-gray-500 max-w-md">
                Search across academic databases to find papers, explore connections, and analyze research trends.
              </p>
            </div>
          )}
        </div>
      </main>

      <SettingsModal
        isOpen={showSettings}
        onClose={() => setShowSettings(false)}
        onSave={handleSaveSettings}
      />
    </div>
  );
}