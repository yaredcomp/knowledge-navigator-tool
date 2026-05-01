'use client';

import { useState, useEffect, FormEvent, useMemo, lazy, Suspense, useCallback } from 'react';
import { ResearchPaper, SearchResult } from '@/types';
import { useTheme } from '@/components/ThemeProvider';

const SettingsModal = lazy(() => import('@/components/SettingsModal'));
const PaperAnalysisPanel = lazy(() => import('@/components/PaperAnalysisPanel'));

interface FilterState {
  yearRange: { start: number; end: number };
  affiliations: string[];
  sources: string[];
  minCitations: number;
  sortBy: 'relevance' | 'citations' | 'year' | 'dateAdded';
}

interface LLMProviderSettings {
  groq: { apiKey: string; model: string; enabled: boolean };
  openrouter: { apiKey: string; model: string; enabled: boolean };
  ollama: { host: string; model: string; enabled: boolean };
}

const PAPER_TYPES = ['Journal Article', 'Conference', 'Preprint', 'Book', 'Dataset', 'Thesis'];
const CURRENT_YEAR = new Date().getFullYear();
const YEAR_PRESETS = [
  { label: 'Any', start: 2000, end: CURRENT_YEAR },
  { label: '2024', start: 2024, end: 2024 },
  { label: '2023', start: 2023, end: 2023 },
  { label: '2022', start: 2022, end: 2022 },
  { label: '2021-25', start: 2021, end: 2025 },
  { label: '2016-20', start: 2016, end: 2020 },
  { label: 'Pre-2016', start: 2000, end: 2015 },
];

const CITATION_PRESETS = [
  { label: 'Any', value: 0 },
  { label: '10+', value: 10 },
  { label: '50+', value: 50 },
  { label: '100+', value: 100 },
  { label: '500+', value: 500 },
];

export default function Home() {
  const [query, setQuery] = useState('machine learning');
  const [ethiopianOnly, setEthiopianOnly] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [processingWithLLM, setProcessingWithLLM] = useState(false);
  const [searchResults, setSearchResults] = useState<SearchResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [modelInterpretation, setModelInterpretation] = useState<string | null>(null);
  const [modelInfo, setModelInfo] = useState<{ provider: string; model: string } | null>(null);
  const [showSettings, setShowSettings] = useState(false);
  const [llmSettings, setLlmSettings] = useState<LLMProviderSettings | null>(null);
  const [sidebarOpen, setSidebarOpen] = useState(true);
  
  const [filters, setFilters] = useState<FilterState>({
    yearRange: { start: 2020, end: CURRENT_YEAR },
    affiliations: [],
    sources: [],
    minCitations: 0,
    sortBy: 'relevance',
  });
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

  const applyFilters = useCallback((papers: ResearchPaper[]): ResearchPaper[] => {
    return papers.filter(paper => {
      const paperYear = paper.publishedDate ? new Date(paper.publishedDate).getFullYear() : 0;
      if (paperYear < filters.yearRange.start || paperYear > filters.yearRange.end) return false;
      
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
      switch (filters.sortBy) {
        case 'citations':
          return (b.citationCount || 0) - (a.citationCount || 0);
        case 'year':
          const yearA = a.publishedDate ? new Date(a.publishedDate).getFullYear() : 0;
          const yearB = b.publishedDate ? new Date(b.publishedDate).getFullYear() : 0;
          return yearB - yearA;
        case 'dateAdded':
          return new Date(b.publishedDate || 0).getTime() - new Date(a.publishedDate || 0).getTime();
        default:
          return 0;
      }
    });
  }, [filters]);

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
          body: JSON.stringify({ userQuery: query, page: 1, limit: 50, ethiopianOnly }),
        }),
      ]);

      const processed = await processRes.json();
      const results = await searchRes.json();

      if (processed.modelInterpretation) {
        setModelInterpretation(processed.modelInterpretation);
        if (processed.provider && processed.provider !== 'none') {
          setModelInfo({ provider: processed.provider, model: processed.model || 'unknown' });
        } else {
          setModelInfo(null);
        }
      }

      if (!searchRes.ok) {
        throw new Error(results.error || 'Search failed');
      }

      setSearchResults(results);

      if (results.papers?.length === 0) {
        setError('No papers found. Try different keywords.');
      }
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'An error occurred';
      console.error('Search error:', message);
      setError(message);
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
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'An error occurred';
      setError(message);
    } finally {
      setIsLoading(false);
    }
  };

  const handleSaveSettings = (settings: LLMProviderSettings) => {
    setLlmSettings(settings);
    localStorage.setItem('llm_provider_settings', JSON.stringify(settings));
  };

  const filteredPapers = useMemo(() => {
    if (!searchResults) return [];
    return applyFilters(searchResults.papers);
  }, [searchResults, applyFilters]);

  const uniqueAffiliations = useMemo(() => {
    if (!searchResults) return [];
    const affs = searchResults.papers.flatMap(p => p.affiliations);
    return [...new Set(affs)].slice(0, 10);
  }, [searchResults]);

  const toggleSource = (source: string) => {
    setFilters(f => ({
      ...f,
      sources: f.sources.includes(source)
        ? f.sources.filter(s => s !== source)
        : [...f.sources, source]
    }));
  };

  const toggleAffiliation = (aff: string) => {
    setFilters(f => ({
      ...f,
      affiliations: f.affiliations.includes(aff)
        ? f.affiliations.filter(a => a !== aff)
        : [...f.affiliations, aff]
    }));
  };

  const setYearPreset = (preset: typeof YEAR_PRESETS[number]) => {
    setFilters(f => ({ ...f, yearRange: { start: preset.start, end: preset.end } }));
  };

  const setCitationPreset = (value: number) => {
    setFilters(f => ({ ...f, minCitations: value }));
  };

  return (
    <div className="min-h-screen bg-[var(--bg-deep)] text-[var(--text-primary)]">
      <a
        href="#main-content"
        className="sr-only focus:not-sr-only focus:absolute focus:top-4 focus:left-4 focus:z-50 focus:px-5 focus:py-3 focus:bg-[var(--accent-primary)] focus:text-[var(--bg-deep)] focus:rounded-lg focus:font-semibold focus:shadow-lg"
      >
        Skip to main content
      </a>

      {/* Header */}
      <header className="sticky top-0 z-40 bg-[var(--bg-primary)]/90 backdrop-blur-2xl border-b border-[var(--border-subtle)]">
        <div className="max-w-[1800px] mx-auto px-4 sm:px-6">
          <div className="flex items-center gap-3 h-16">
            {/* Logo */}
            <div className="flex items-center gap-3 flex-shrink-0">
              <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-[var(--accent-primary)] to-[#c4943d] flex items-center justify-center shadow-lg shadow-[var(--accent-primary-dim)]">
                <svg className="w-5 h-5 text-[var(--bg-deep)]" fill="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                  <path d="M12 2L2 7l10 5 10-5-10-5zM2 17l10 5 10-5M2 12l10 5 10-5" />
                </svg>
              </div>
              <span className="font-[family-name:var(--font-display)] text-xl font-bold tracking-tight hidden sm:block">
                Knowledge<span className="text-[var(--accent-primary)]">Navigator</span>
              </span>
            </div>

            {/* Search */}
            <form onSubmit={handleSearch} className="flex-1 max-w-2xl mx-auto">
              <div className="relative group">
                <div className="absolute inset-0 bg-gradient-to-r from-[var(--accent-primary-dim)] to-[var(--accent-secondary)]/10 rounded-2xl opacity-0 group-focus-within:opacity-100 transition-opacity" />
                <div className="relative flex items-center bg-[var(--bg-card)] rounded-2xl border border-[var(--border-subtle)] group-focus-within:border-[var(--accent-primary)]/50 transition-all">
                  <div className="pl-4" aria-hidden="true">
                    <svg className="w-5 h-5 text-[var(--text-muted)]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                    </svg>
                  </div>
                  <input
                    type="text"
                    value={query}
                    onChange={(e) => setQuery(e.target.value)}
                    placeholder="Search research papers, authors, topics..."
                    className="flex-1 px-4 py-3 bg-transparent text-[var(--text-primary)] placeholder-[var(--text-muted)] focus:outline-none"
                    aria-label="Search research papers"
                  />
                  <div className="pr-2">
                    <button
                      type="submit"
                      disabled={isLoading || processingWithLLM || !query.trim()}
                      className="px-5 py-2.5 min-h-[44px] bg-gradient-to-r from-[var(--accent-primary)] to-[#c4943d] text-[var(--bg-deep)] font-semibold rounded-xl hover:opacity-90 transition-opacity disabled:opacity-50 text-sm flex items-center gap-2 shadow-lg shadow-[var(--accent-primary-dim)]"
                    >
                      {isLoading || processingWithLLM ? (
                        <>
                          <svg className="w-4 h-4 animate-spin" fill="none" viewBox="0 0 24 24" aria-hidden="true">
                            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                          </svg>
                          <span className="hidden sm:inline">Searching...</span>
                        </>
                      ) : (
                        <>
                          <span className="hidden sm:inline">Search</span>
                          <span className="sm:hidden">🔍</span>
                        </>
                      )}
                    </button>
                  </div>
                </div>
              </div>
            </form>

            {/* Actions */}
            <div className="flex items-center gap-2 flex-shrink-0">
              

              <button
                onClick={toggleTheme}
                className="p-2.5 rounded-xl hover:bg-[var(--bg-card)] border border-transparent hover:border-[var(--border-subtle)] transition-all min-w-[44px] min-h-[44px] flex items-center justify-center"
                aria-label={theme === 'dark' ? 'Switch to light mode' : 'Switch to dark mode'}
              >
                {theme === 'dark' ? (
                  <svg className="w-5 h-5 text-[var(--accent-primary)]" fill="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                    <path d="M12 3v1m0 16v1m9-9h-1M4 12H3m15.364 6.364l-.707-.707M6.343 6.343l-.707-.707m12.728 0l-.707.707M6.343 17.657l-.707.707M16 12a4 4 0 11-8 0 4 4 0 018 0z" />
                  </svg>
                ) : (
                  <svg className="w-5 h-5 text-[var(--text-secondary)]" fill="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                    <path d="M20.354 15.354A9 9 0 018.646 3.646 9.003 9.003 0 0012 21a9.003 9.003 0 008.354-5.646z" />
                  </svg>
                )}
              </button>

              <button
                onClick={() => setShowSettings(true)}
                className="p-2.5 rounded-xl hover:bg-[var(--bg-card)] border border-transparent hover:border-[var(--border-subtle)] transition-all min-w-[44px] min-h-[44px] flex items-center justify-center"
                aria-label="Open settings"
              >
                <svg className="w-5 h-5 text-[var(--text-secondary)]" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                </svg>
              </button>
            </div>
          </div>
        </div>
      </header>

      <div className="flex">
        {/* Sidebar backdrop - shadcn style overlay */}
        {sidebarOpen && (
          <div 
            className="fixed inset-0 bg-black/40 z-25 lg:hidden backdrop-blur-sm"
            onClick={() => setSidebarOpen(false)}
            aria-hidden="true"
          />
        )}

        {/* Sidebar - shadcn style */}
        <aside className={`
          fixed lg:sticky top-16 left-0 z-30 h-[calc(100vh-4rem)] 
          bg-[var(--bg-primary)] border-r border-[var(--border-subtle)]
          transition-transform duration-300 ease-in-out
          ${sidebarOpen ? 'translate-x-0 w-72' : '-translate-x-full lg:translate-x-0 lg:w-16'}
        `}>
          <div className={`h-full flex flex-col ${sidebarOpen ? 'p-5' : 'p-3'}`}>
            {/* Toggle button - shadcn style on edge */}
            <button
              onClick={() => setSidebarOpen(!sidebarOpen)}
              className="absolute top-3 -right-3 z-40 w-6 h-6 rounded-full bg-[var(--bg-primary)] border border-[var(--border-subtle)] hover:border-[var(--accent-primary)] hover:shadow-md flex items-center justify-center transition-all"
              aria-label={sidebarOpen ? 'Close sidebar' : 'Open sidebar'}
            >
              <svg 
                className={`w-3.5 h-3.5 text-[var(--text-secondary)] transition-transform duration-300 ${sidebarOpen ? 'rotate-0' : 'rotate-180'}`} 
                fill="none" 
                stroke="currentColor" 
                viewBox="0 0 24 24" 
                aria-hidden="true"
              >
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
              </svg>
            </button>

            {/* Sidebar content */}
            <div className={`flex-1 overflow-y-auto ${sidebarOpen ? 'space-y-6' : 'space-y-3'}`}>
              {/* Collapsed state - icon buttons */}
              {!sidebarOpen && (
                <div className="flex flex-col items-center gap-2">
                  <button className="w-9 h-9 rounded-lg bg-[var(--bg-card)] hover:bg-[var(--bg-card-hover)] flex items-center justify-center transition-colors group" title="Year">
                    <svg className="w-4 h-4 text-[var(--text-muted)] group-hover:text-[var(--accent-primary)]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                    </svg>
                  </button>
                  <button className="w-9 h-9 rounded-lg bg-[var(--bg-card)] hover:bg-[var(--bg-card-hover)] flex items-center justify-center transition-colors group" title="Citations">
                    <svg className="w-4 h-4 text-[var(--text-muted)] group-hover:text-[var(--accent-primary)]" fill="currentColor" viewBox="0 0 20 20">
                      <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
                    </svg>
                  </button>
                  <button className="w-9 h-9 rounded-lg bg-[var(--bg-card)] hover:bg-[var(--bg-card-hover)] flex items-center justify-center transition-colors group" title="Sources">
                    <svg className="w-4 h-4 text-[var(--text-muted)] group-hover:text-[var(--accent-primary)]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
                    </svg>
                  </button>
                  {uniqueAffiliations.length > 0 && (
                    <button className="w-9 h-9 rounded-lg bg-[var(--bg-card)] hover:bg-[var(--bg-card-hover)] flex items-center justify-center transition-colors group" title="Affiliations">
                      <svg className="w-4 h-4 text-[var(--text-muted)] group-hover:text-[var(--accent-primary)]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z" />
                      </svg>
                    </button>
                  )}
                </div>
              )}

              {/* Expanded state - full filters */}
              {sidebarOpen && (
                <div className="space-y-6">
                  {/* Sidebar Header */}
                  <div className="flex items-center justify-between">
                    <h2 className="font-[family-name:var(--font-display)] text-lg font-bold text-[var(--text-primary)]">
                      Filters
                    </h2>
                    <button
                      onClick={() => {
                        setFilters({
                          yearRange: { start: 2000, end: CURRENT_YEAR },
                          affiliations: [],
                          sources: [],
                          minCitations: 0,
                          sortBy: 'relevance',
                        });
                      }}
                      className="text-xs text-[var(--accent-primary)] hover:text-[var(--accent-secondary)] transition-colors"
                    >
                      Clear all
                    </button>
                  </div>

                {/* Year Filter */}
                <div className="space-y-3">
                  <h3 className="text-xs font-semibold uppercase tracking-wider text-[var(--text-muted)] flex items-center gap-2">
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                    </svg>
                    Publication Year
                  </h3>
                  <div className="flex flex-wrap gap-2">
                    {YEAR_PRESETS.map(preset => (
                      <button
                        key={preset.label}
                        onClick={() => setYearPreset(preset)}
                        className={`px-3 py-1.5 text-xs rounded-lg border transition-all ${
                          filters.yearRange.start === preset.start && filters.yearRange.end === preset.end
                            ? 'bg-[var(--accent-primary-dim)] text-[var(--accent-primary)] border-[var(--accent-primary)]/50'
                            : 'bg-[var(--bg-card)] text-[var(--text-secondary)] border-[var(--border-subtle)] hover:border-[var(--border-default)]'
                        }`}
                      >
                        {preset.label}
                      </button>
                    ))}
                  </div>
                  <div className="flex items-center gap-2">
                    <input
                      type="number"
                      value={filters.yearRange.start}
                      onChange={(e) => setFilters(f => ({ ...f, yearRange: { ...f.yearRange, start: parseInt(e.target.value) || 2000 } }))}
                      className="w-20 px-2 py-2 text-sm bg-[var(--bg-card)] border border-[var(--border-subtle)] rounded-lg text-[var(--text-primary)]"
                      placeholder="From"
                      aria-label="Start year"
                    />
                    <span className="text-[var(--text-muted)]">—</span>
                    <input
                      type="number"
                      value={filters.yearRange.end}
                      onChange={(e) => setFilters(f => ({ ...f, yearRange: { ...f.yearRange, end: parseInt(e.target.value) || CURRENT_YEAR } }))}
                      className="w-20 px-2 py-2 text-sm bg-[var(--bg-card)] border border-[var(--border-subtle)] rounded-lg text-[var(--text-primary)]"
                      placeholder="To"
                      aria-label="End year"
                    />
                  </div>
                </div>

                {/* Citations Filter */}
                <div className="space-y-3">
                  <h3 className="text-xs font-semibold uppercase tracking-wider text-[var(--text-muted)] flex items-center gap-2">
                    <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20" aria-hidden="true">
                      <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
                    </svg>
                    Min Citations
                  </h3>
                  <div className="flex flex-wrap gap-2">
                    {CITATION_PRESETS.map(preset => (
                      <button
                        key={preset.label}
                        onClick={() => setCitationPreset(preset.value)}
                        className={`px-3 py-1.5 text-xs rounded-lg border transition-all ${
                          filters.minCitations === preset.value
                            ? 'bg-[var(--accent-secondary)]/15 text-[var(--accent-secondary)] border-[var(--accent-secondary)]/50'
                            : 'bg-[var(--bg-card)] text-[var(--text-secondary)] border-[var(--border-subtle)] hover:border-[var(--border-default)]'
                        }`}
                      >
                        {preset.label}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Sources Filter */}
                <div className="space-y-3">
                  <h3 className="text-xs font-semibold uppercase tracking-wider text-[var(--text-muted)] flex items-center gap-2">
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
                    </svg>
                    Sources
                  </h3>
                  <div className="space-y-2">
                    {[
                      { id: 'arxiv', label: 'arXiv', icon: '📚' },
                      { id: 'semantic_scholar', label: 'Semantic Scholar', icon: '🔬' },
                      { id: 'crossref', label: 'CrossRef', icon: '📖' },
                    ].map(source => (
                      <label
                        key={source.id}
                        className="flex items-center gap-3 p-2.5 rounded-lg hover:bg-[var(--bg-card)] cursor-pointer transition-all group"
                      >
                        <input
                          type="checkbox"
                          checked={filters.sources.includes(source.id)}
                          onChange={() => toggleSource(source.id)}
                          className="w-4 h-4 rounded border-[var(--border-default)] bg-[var(--bg-elevated)] text-[var(--accent-primary)] focus:ring-[var(--accent-primary)] focus:ring-offset-0"
                        />
                        <span className="text-sm text-[var(--text-secondary)] group-hover:text-[var(--text-primary)] transition-colors">
                          {source.icon} {source.label}
                        </span>
                      </label>
                    ))}
                  </div>
                </div>

                {/* Ethiopian Filter */}
                <label className="flex items-center gap-3 p-3 bg-[var(--bg-card)] rounded-xl border border-[var(--border-subtle)] cursor-pointer hover:border-[var(--accent-primary)]/30 transition-all">
                  <input
                    type="checkbox"
                    checked={ethiopianOnly}
                    onChange={(e) => setEthiopianOnly(e.target.checked)}
                    className="w-4 h-4 rounded border-[var(--border-default)] bg-[var(--bg-elevated)] text-[var(--accent-primary)] focus:ring-[var(--accent-primary)] focus:ring-offset-0"
                  />
                  <span className="text-sm text-[var(--text-secondary)]">🇪🇹 Ethiopian institutions only</span>
                </label>

                {/* Affiliations */}
                {uniqueAffiliations.length > 0 && (
                  <div className="space-y-3">
                    <h3 className="text-xs font-semibold uppercase tracking-wider text-[var(--text-muted)] flex items-center gap-2">
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
                      </svg>
                      Affiliations
                    </h3>
                    <div className="flex flex-wrap gap-2">
                      {uniqueAffiliations.map(aff => (
                        <button
                          key={aff}
                          onClick={() => toggleAffiliation(aff)}
                          className={`px-2.5 py-1 text-xs rounded-md border transition-all ${
                            filters.affiliations.includes(aff)
                              ? 'bg-[var(--accent-tertiary)]/15 text-[var(--accent-tertiary)] border-[var(--accent-tertiary)]/40'
                              : 'bg-[var(--bg-card)] text-[var(--text-muted)] border-[var(--border-subtle)] hover:border-[var(--border-default)]'
                          }`}
                        >
                          {aff.length > 20 ? aff.slice(0, 20) + '…' : aff}
                        </button>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )}
            </div>
          </div>
        </aside>

        {/* Main Content */}
        <main id="main-content" className="flex-1 min-w-0 p-4 sm:p-6 lg:p-8">
          {/* Error */}
          {error && (
            <div className="mb-6 p-4 bg-red-500/10 border border-red-500/20 rounded-xl text-red-400 animate-scale-in" role="alert" aria-live="assertive">
              <div className="flex items-start gap-3">
                <svg className="w-5 h-5 mt-0.5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                <p>{error}</p>
              </div>
            </div>
          )}

          {/* AI Interpretation */}
          {modelInterpretation && !processingWithLLM && !isLoading && (
            <div className="mb-6 p-4 bg-gradient-to-r from-[var(--accent-primary-dim)] to-[var(--accent-secondary)]/10 border border-[var(--accent-primary)]/20 rounded-xl animate-fade-in" role="status" aria-live="polite">
              <div className="flex items-start gap-3">
                <div className="w-8 h-8 rounded-lg bg-[var(--accent-primary)]/20 flex items-center justify-center flex-shrink-0">
                  <svg className="w-4 h-4 text-[var(--accent-primary)]" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
                  </svg>
                </div>
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-1">
                    <p className="text-sm font-semibold text-[var(--accent-primary)]">AI Query Analysis</p>
                    {modelInfo ? (
                      <span className="px-2 py-0.5 text-[10px] font-medium rounded-full bg-[var(--accent-secondary)]/15 text-[var(--accent-secondary)] border border-[var(--accent-secondary)]/30">
                        {modelInfo.provider} • {modelInfo.model}
                      </span>
                    ) : (
                      <span className="px-2 py-0.5 text-[10px] font-medium rounded-full bg-[var(--text-muted)]/15 text-[var(--text-muted)] border border-[var(--border-subtle)]">
                        Basic
                      </span>
                    )}
                  </div>
                  <p className="text-sm text-[var(--text-secondary)]">{modelInterpretation}</p>
                </div>
              </div>
            </div>
          )}

          {/* Loading */}
          {(isLoading || processingWithLLM) && (
            <div className="space-y-4">
              {[1, 2, 3].map(i => (
                <div key={i} className="bg-[var(--bg-card)] rounded-2xl border border-[var(--border-subtle)] p-6 animate-fade-in" style={{ animationDelay: `${i * 100}ms` }}>
                  <div className="space-y-4">
                    <div className="h-6 bg-[var(--bg-elevated)] rounded-lg w-3/4 animate-pulse" />
                    <div className="flex gap-4">
                      <div className="h-4 bg-[var(--bg-elevated)] rounded w-1/4" />
                      <div className="h-4 bg-[var(--bg-elevated)] rounded w-16" />
                      <div className="h-4 bg-[var(--bg-elevated)] rounded w-20" />
                    </div>
                    <div className="h-4 bg-[var(--bg-elevated)] rounded w-full" />
                    <div className="h-4 bg-[var(--bg-elevated)] rounded w-2/3" />
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* Results */}
          {searchResults && searchResults.papers.length > 0 && (
            <div className="animate-fade-in">
              {/* Results Header */}
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6 pb-6 border-b border-[var(--border-subtle)]">
                <div className="flex items-center gap-4">
                  <h2 className="font-[family-name:var(--font-display)] text-2xl font-bold text-[var(--text-primary)]">
                    {filteredPapers.length} Results
                  </h2>
                  {searchResults.ethiopianCount > 0 && (
                    <span className="px-3 py-1 text-xs font-medium rounded-full bg-[var(--accent-success)]/15 text-[var(--accent-success)] border border-[var(--accent-success)]/30">
                      {searchResults.ethiopianCount} Ethiopian
                    </span>
                  )}
                </div>
                <div className="flex items-center gap-3">
                  <label htmlFor="sort-select" className="text-sm text-[var(--text-muted)]">Sort by:</label>
                  <select
                    id="sort-select"
                    value={filters.sortBy}
                    onChange={(e) => setFilters(f => ({ ...f, sortBy: e.target.value as FilterState['sortBy'] }))}
                    className="px-4 py-2 min-h-[44px] bg-[var(--bg-card)] border border-[var(--border-subtle)] rounded-xl text-sm text-[var(--text-primary)] focus:border-[var(--accent-primary)]"
                    aria-label="Sort results"
                  >
                    <option value="relevance">Relevance</option>
                    <option value="citations">Most cited</option>
                    <option value="year">Newest first</option>
                    <option value="dateAdded">Recently added</option>
                  </select>
                </div>
              </div>

              {/* Paper Cards */}
              <div className="space-y-4">
                {filteredPapers.map((paper, idx) => (
                  <article
                    key={paper.id}
                    className="group bg-[var(--bg-card)] rounded-2xl border border-[var(--border-subtle)] hover:border-[var(--accent-primary)]/30 transition-all duration-300 overflow-hidden hover:shadow-xl hover:shadow-[var(--accent-primary)]/5"
                    style={{ animationDelay: `${idx * 50}ms` }}
                    tabIndex={0}
                    aria-label={`Research paper: ${paper.title}`}
                  >
                    <div className="p-5 sm:p-6">
                      {/* Title & Citations */}
                      <div className="flex items-start justify-between gap-4 mb-4">
                        <div className="flex-1 min-w-0">
                          <h3 className="font-[family-name:var(--font-display)] text-lg font-semibold text-[var(--text-primary)] group-hover:text-[var(--accent-primary)] transition-colors line-clamp-2 leading-snug">
                            {paper.title}
                          </h3>
                        </div>
                        {(paper.citationCount || 0) > 0 && (
                          <div className="flex items-center gap-1.5 px-3 py-1.5 bg-[var(--accent-secondary)]/10 rounded-full border border-[var(--accent-secondary)]/20 flex-shrink-0">
                            <svg className="w-3.5 h-3.5 text-[var(--accent-secondary)]" fill="currentColor" viewBox="0 0 20 20" aria-hidden="true">
                              <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
                            </svg>
                            <span className="text-sm font-semibold text-[var(--accent-secondary)]">{paper.citationCount}</span>
                          </div>
                        )}
                      </div>

                      {/* Meta */}
                      <div className="flex flex-wrap items-center gap-x-4 gap-y-2 text-sm text-[var(--text-muted)] mb-4">
                        <div className="flex items-center gap-1.5 max-w-[280px]">
                          <svg className="w-4 h-4 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z" />
                          </svg>
                          <span className="truncate">
                            {paper.authors.slice(0, 3).join(', ')}
                            {paper.authors.length > 3 && ` +${paper.authors.length - 3}`}
                          </span>
                        </div>
                        {paper.publishedDate && (
                          <>
                            <span className="text-[var(--border-default)]">•</span>
                            <span className="text-[var(--text-secondary)] font-medium">
                              {new Date(paper.publishedDate).toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' })}
                            </span>
                          </>
                        )}
                        <span className="text-[var(--border-default)]">•</span>
                        <span className="px-2 py-0.5 text-xs rounded-md bg-[var(--bg-elevated)] text-[var(--text-muted)] border border-[var(--border-subtle)]">
                          {paper.source.replace('_', ' ')}
                        </span>
                      </div>

                      {/* Abstract */}
                      {paper.abstract && (
                        <div className="relative mb-4">
                          <p className={`text-sm text-[var(--text-secondary)] leading-relaxed ${expandedPaper === paper.id ? '' : 'line-clamp-3'}`}>
                            {paper.abstract}
                          </p>
                          {paper.abstract.length > 280 && (
                            <button
                              onClick={() => setExpandedPaper(expandedPaper === paper.id ? null : paper.id)}
                              className="mt-2 text-sm text-[var(--accent-primary)] hover:text-[var(--accent-secondary)] transition-colors font-medium"
                            >
                              {expandedPaper === paper.id ? 'Show less' : 'Show more'}
                            </button>
                          )}
                        </div>
                      )}

                      {/* Affiliations */}
                      {paper.affiliations.length > 0 && (
                        <div className="flex flex-wrap gap-2 mb-4 pb-4 border-b border-[var(--border-subtle)]">
                          {paper.affiliations.map((aff, i) => (
                            <span key={i} className="px-2.5 py-1 text-xs rounded-md bg-[var(--accent-primary-dim)] text-[var(--accent-primary)] border border-[var(--accent-primary)]/20">
                              {aff}
                            </span>
                          ))}
                        </div>
                      )}

                      {/* Actions */}
                      <div className="flex items-center gap-3">
                        <a
                          href={paper.url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="flex items-center gap-2 px-4 py-2 min-h-[44px] text-sm text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:bg-[var(--bg-elevated)] rounded-xl transition-all border border-transparent hover:border-[var(--border-subtle)]"
                          aria-label={`View paper: ${paper.title}`}
                        >
                          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
                          </svg>
                          View
                        </a>
                        {paper.pdfUrl && (
                          <a
                            href={paper.pdfUrl}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="flex items-center gap-2 px-4 py-2 min-h-[44px] text-sm text-[var(--accent-primary)] hover:text-[var(--accent-secondary)] hover:bg-[var(--accent-primary-dim)] rounded-xl transition-all border border-[var(--accent-primary)]/30 hover:border-[var(--accent-primary)]/50"
                            aria-label={`Download PDF: ${paper.title}`}
                          >
                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                            </svg>
                            PDF
                          </a>
                        )}
                      </div>

                      {/* Analysis Panel */}
                      <Suspense fallback={null}>
                        <PaperAnalysisPanel
                          title={paper.title}
                          abstract={paper.abstract}
                          authors={paper.authors}
                          paperId={paper.id}
                        />
                      </Suspense>
                    </div>
                  </article>
                ))}
              </div>

              {/* Pagination */}
              {searchResults.total > 50 && (
                <nav className="flex items-center justify-center gap-2 mt-10" aria-label="Pagination">
                  {Array.from({ length: Math.ceil(searchResults.total / 50) }, (_, i) => i + 1).slice(0, 7).map(page => (
                    <button
                      key={page}
                      onClick={() => handlePageChange(page)}
                      disabled={isLoading}
                      className={`w-10 h-10 min-w-[44px] rounded-xl text-sm font-semibold transition-all ${
                        page === searchResults.page
                          ? 'bg-gradient-to-r from-[var(--accent-primary)] to-[#c4943d] text-[var(--bg-deep)] shadow-lg shadow-[var(--accent-primary-dim)]'
                          : 'bg-[var(--bg-card)] text-[var(--text-secondary)] hover:bg-[var(--bg-card-hover)] border border-[var(--border-subtle)]'
                      }`}
                      aria-current={page === searchResults.page ? 'page' : undefined}
                    >
                      {page}
                    </button>
                  ))}
                </nav>
              )}
            </div>
          )}

          {/* Empty State */}
          {!searchResults && !isLoading && (
            <div className="flex flex-col items-center justify-center py-20 text-center" role="status" aria-live="polite">
              <div className="w-24 h-24 mb-6 rounded-3xl bg-gradient-to-br from-[var(--accent-primary-dim)] to-[var(--accent-secondary)]/20 flex items-center justify-center shadow-2xl">
                <svg className="w-12 h-12 text-[var(--accent-primary)]" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                </svg>
              </div>
              <h3 className="font-[family-name:var(--font-display)] text-2xl font-bold text-[var(--text-primary)] mb-3">
                Discover Research
              </h3>
              <p className="text-[var(--text-muted)] max-w-md text-lg">
                Search across academic databases to find papers, explore connections, and analyze research trends.
              </p>
              <div className="flex flex-wrap justify-center gap-3 mt-8">
                {['Machine Learning', 'Climate Change', 'Quantum Computing', 'Neural Networks'].map(tag => (
                  <button
                    key={tag}
                    onClick={() => { setQuery(tag); handleSearch(); }}
                    className="px-4 py-2 text-sm bg-[var(--bg-card)] text-[var(--text-secondary)] rounded-xl border border-[var(--border-subtle)] hover:border-[var(--accent-primary)]/50 hover:text-[var(--accent-primary)] transition-all"
                  >
                    {tag}
                  </button>
                ))}
              </div>
            </div>
          )}
        </main>
      </div>

      <Suspense fallback={null}>
        <SettingsModal
          isOpen={showSettings}
          onClose={() => setShowSettings(false)}
          onSave={handleSaveSettings}
        />
      </Suspense>
    </div>
  );
}