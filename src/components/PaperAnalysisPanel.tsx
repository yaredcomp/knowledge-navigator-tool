'use client';

import { useState, useEffect } from 'react';

interface PaperAnalysis {
  paperType: string;
  paperTypeJustification: string;
  researchProblem: string;
  researchQuestion: string;
  methodology: string;
  results: string;
  noveltyScore: number;
  noveltyJustification: string;
  keyContributions: string[];
  limitations: string[];
  potentialApplications: string[];
}

interface PaperAnalysisPanelProps {
  title: string;
  abstract: string;
  authors: string[];
  paperId: string;
}

export default function PaperAnalysisPanel({ title, abstract, authors, paperId }: PaperAnalysisPanelProps) {
  const [analysis, setAnalysis] = useState<PaperAnalysis | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isExpanded, setIsExpanded] = useState(false);

  const analyzePaper = async () => {
    if (analysis) {
      setIsExpanded(!isExpanded);
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      const response = await fetch('/api/analyze-paper', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ title, abstract, authors }),
      });

      if (!response.ok) {
        throw new Error('Failed to analyze paper');
      }

      const data = await response.json();
      setAnalysis(data);
      setIsExpanded(true);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Analysis failed');
    } finally {
      setIsLoading(false);
    }
  };

  const getNoveltyColor = (score: number) => {
    if (score >= 8) return 'text-emerald-400';
    if (score >= 6) return 'text-amber-400';
    if (score >= 4) return 'text-orange-400';
    return 'text-red-400';
  };

  const getNoveltyLabel = (score: number) => {
    if (score >= 8) return 'Groundbreaking';
    if (score >= 6) return 'Highly Novel';
    if (score >= 4) return 'Moderately Novel';
    return 'Incremental';
  };

  return (
    <div className="mt-4 border-t border-gray-800/50 pt-4">
      <button
        onClick={analyzePaper}
        disabled={isLoading}
        className="flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-purple-500/20 to-blue-500/20 hover:from-purple-500/30 hover:to-blue-500/30 border border-purple-500/30 rounded-lg text-sm text-purple-400 transition-all"
      >
        {isLoading ? (
          <>
            <svg className="w-4 h-4 animate-spin" fill="none" viewBox="0 0 24 24">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
            </svg>
            <span>Analyzing...</span>
          </>
        ) : (
          <>
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
            </svg>
            <span>AI Analysis</span>
          </>
        )}
      </button>

      {error && (
        <div className="mt-3 p-3 bg-red-500/10 border border-red-500/20 rounded-lg text-red-400 text-sm">
          {error}
        </div>
      )}

      {analysis && isExpanded && (
        <div className="mt-4 bg-[#1c2128] rounded-xl border border-purple-500/20 overflow-hidden">
          <div className="px-5 py-4 bg-gradient-to-r from-purple-500/10 to-blue-500/10 border-b border-gray-800/50">
            <div className="flex items-center justify-between">
              <div>
                <span className="text-xs font-semibold text-purple-400 uppercase tracking-wider">Paper Type</span>
                <h3 className="text-lg font-semibold text-white mt-1">{analysis.paperType}</h3>
              </div>
              <div className={`px-3 py-1.5 rounded-lg text-sm font-medium ${
                analysis.paperType === 'Survey' ? 'bg-green-500/20 text-green-400' :
                analysis.paperType === 'Systematic Review' ? 'bg-blue-500/20 text-blue-400' :
                analysis.paperType === 'Meta-Analysis' ? 'bg-indigo-500/20 text-indigo-400' :
                analysis.paperType === 'Conference Paper' ? 'bg-amber-500/20 text-amber-400' :
                analysis.paperType === 'Research Article' ? 'bg-cyan-500/20 text-cyan-400' :
                analysis.paperType === 'Preprint' ? 'bg-orange-500/20 text-orange-400' :
                'bg-gray-500/20 text-gray-400'
              }`}>
                {analysis.paperType}
              </div>
            </div>
            {analysis.paperTypeJustification && (
              <p className="text-xs text-gray-500 mt-2">{analysis.paperTypeJustification}</p>
            )}
          </div>
          
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-0 divide-y lg:divide-y-0 lg:divide-x divide-gray-800/50">
            <div className="p-5 space-y-5">
              <div>
                <h4 className="text-xs font-semibold text-purple-400 uppercase tracking-wider mb-2 flex items-center gap-2">
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
                  </svg>
                  Research Problem
                </h4>
                <p className="text-sm text-gray-300 leading-relaxed">{analysis.researchProblem}</p>
              </div>

              <div>
                <h4 className="text-xs font-semibold text-purple-400 uppercase tracking-wider mb-2 flex items-center gap-2">
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M8.228 9c.549-1.165 2.03-2 3.772-2 2.21 0 4 1.343 4 3 0 1.4-1.278 2.575-3.006 2.907-.542.104-.994.54-.994 1.093m0 3h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                  Research Question
                </h4>
                <p className="text-sm text-gray-300 leading-relaxed">{analysis.researchQuestion}</p>
              </div>

              <div>
                <h4 className="text-xs font-semibold text-purple-400 uppercase tracking-wider mb-2 flex items-center gap-2">
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M19.428 15.428a2 2 0 00-1.022-.547l-2.387-.477a6 6 0 00-3.86.517l-.318.158a6 6 0 01-3.86.517L6.05 15.21a2 2 0 00-1.806.547M8 4h8l-1 1v5.172a2 2 0 00.586 1.414l5 5c1.26 1.26.367 3.414-1.415 3.414H4.828c-1.782 0-2.674-2.154-1.414-3.414l5-5A2 2 0 009 10.172V5L8 4z" />
                  </svg>
                  Methodology
                </h4>
                <p className="text-sm text-gray-300 leading-relaxed">{analysis.methodology}</p>
              </div>

              <div>
                <h4 className="text-xs font-semibold text-purple-400 uppercase tracking-wider mb-2 flex items-center gap-2">
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                  </svg>
                  Results
                </h4>
                <p className="text-sm text-gray-300 leading-relaxed">{analysis.results}</p>
              </div>
            </div>

            <div className="p-5 space-y-5">
              <div className="bg-gradient-to-br from-purple-500/10 to-blue-500/10 rounded-lg p-4 border border-purple-500/20">
                <div className="flex items-center justify-between mb-3">
                  <h4 className="text-xs font-semibold text-purple-400 uppercase tracking-wider">Novelty Score</h4>
                  <span className={`text-2xl font-bold ${getNoveltyColor(analysis.noveltyScore)}`}>
                    {analysis.noveltyScore}/10
                  </span>
                </div>
                <div className="flex items-center gap-2 mb-2">
                  <div className="flex-1 h-2 bg-gray-800 rounded-full overflow-hidden">
                    <div 
                      className={`h-full rounded-full ${analysis.noveltyScore >= 8 ? 'bg-emerald-500' : analysis.noveltyScore >= 6 ? 'bg-amber-500' : 'bg-orange-500'}`}
                      style={{ width: `${analysis.noveltyScore * 10}%` }}
                    />
                  </div>
                </div>
                <div className="flex items-center justify-between">
                  <span className={`text-sm font-medium ${getNoveltyColor(analysis.noveltyScore)}`}>
                    {getNoveltyLabel(analysis.noveltyScore)}
                  </span>
                </div>
                <p className="text-xs text-gray-400 mt-3 leading-relaxed">
                  {analysis.noveltyJustification}
                </p>
              </div>

              {analysis.keyContributions.length > 0 && (
                <div>
                  <h4 className="text-xs font-semibold text-cyan-400 uppercase tracking-wider mb-3 flex items-center gap-2">
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 12l2 2 4-4M7.835 4.697a3.42 3.42 0 001.946-.806 3.42 3.42 0 014.438 0 3.42 3.42 0 001.946.806 3.42 3.42 0 013.138 3.138 3.42 3.42 0 00.806 1.946 3.42 3.42 0 010 4.438 3.42 3.42 0 00-.806 1.946 3.42 3.42 0 01-3.138 3.138 3.42 3.42 0 00-1.946.806 3.42 3.42 0 01-4.438 0 3.42 3.42 0 00-1.946-.806 3.42 3.42 0 01-3.138-3.138 3.42 3.42 0 00-.806-1.946 3.42 3.42 0 010-4.438 3.42 3.42 0 00.806-1.946 3.42 3.42 0 013.138-3.138z" />
                    </svg>
                    Key Contributions
                  </h4>
                  <ul className="space-y-2">
                    {analysis.keyContributions.map((contrib, i) => (
                      <li key={i} className="flex items-start gap-2 text-sm text-gray-300">
                        <span className="w-1.5 h-1.5 mt-1.5 rounded-full bg-cyan-500 flex-shrink-0" />
                        <span>{contrib}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              )}

              {analysis.limitations.length > 0 && (
                <div>
                  <h4 className="text-xs font-semibold text-orange-400 uppercase tracking-wider mb-3 flex items-center gap-2">
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                    </svg>
                    Limitations
                  </h4>
                  <ul className="space-y-2">
                    {analysis.limitations.map((limit, i) => (
                      <li key={i} className="flex items-start gap-2 text-sm text-gray-400">
                        <span className="w-1.5 h-1.5 mt-1.5 rounded-full bg-orange-500/50 flex-shrink-0" />
                        <span>{limit}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              )}

              {analysis.potentialApplications.length > 0 && (
                <div>
                  <h4 className="text-xs font-semibold text-emerald-400 uppercase tracking-wider mb-3 flex items-center gap-2">
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M13 10V3L4 14h7v7l9-11h-7z" />
                    </svg>
                    Potential Applications
                  </h4>
                  <ul className="space-y-2">
                    {analysis.potentialApplications.map((app, i) => (
                      <li key={i} className="flex items-start gap-2 text-sm text-gray-300">
                        <span className="w-1.5 h-1.5 mt-1.5 rounded-full bg-emerald-500 flex-shrink-0" />
                        <span>{app}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}