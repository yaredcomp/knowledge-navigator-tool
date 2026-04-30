'use client';

import { ResearchPaper } from '@/types/paper';
import { SummarizationResult } from '@/types/llm';

interface PaperSummaryProps {
  paper: ResearchPaper;
  summary?: SummarizationResult;
  isExpanded: boolean;
  onToggle: () => void;
}

export default function PaperSummary({
  paper,
  summary,
  isExpanded,
  onToggle,
}: PaperSummaryProps) {
  return (
    <div className="border rounded-lg p-4 shadow-sm hover:shadow-md transition-shadow">
      <h3 className="text-lg font-medium mb-2">{paper.title}</h3>

      <div className="text-sm text-gray-600 dark:text-gray-300 mb-2">
        <span className="font-medium">Authors:</span> {paper.authors.join(', ')}
      </div>

      {paper.publishedDate && (
        <div className="text-sm text-gray-600 dark:text-gray-300 mb-2">
          <span className="font-medium">Published:</span> {paper.publishedDate}
        </div>
      )}

      {paper.affiliations.length > 0 && (
        <div className="text-sm text-gray-600 dark:text-gray-300 mb-2">
          <span className="font-medium">Affiliations:</span>{' '}
          <span className="text-amber-600 dark:text-amber-400">
            {paper.affiliations.join(', ')}
          </span>
        </div>
      )}

      <div className="text-sm text-gray-600 dark:text-gray-300 mb-2">
        <span className="font-medium">Source:</span>{' '}
        {paper.source === 'arxiv'
          ? 'arXiv'
          : paper.source === 'semantic_scholar'
          ? 'Semantic Scholar'
          : paper.source}
      </div>

      {summary && (
        <div className="mt-3 p-3 bg-blue-50 dark:bg-blue-900/20 rounded-md">
          <h4 className="text-sm font-medium text-blue-700 dark:text-blue-300 mb-2">
            AI Summary
          </h4>
          <p className="text-sm text-gray-700 dark:text-gray-200">{summary.summary}</p>
          {summary.keyPoints.length > 0 && (
            <ul className="mt-2 text-sm text-gray-600 dark:text-gray-300 list-disc list-inside">
              {summary.keyPoints.map((point, idx) => (
                <li key={idx}>{point}</li>
              ))}
            </ul>
          )}
        </div>
      )}

      {isExpanded ? (
        <div className="mt-3">
          <h4 className="text-md font-medium mb-2">Abstract</h4>
          <p className="text-sm text-gray-700 dark:text-gray-200 mb-4">{paper.abstract}</p>

          <div className="flex gap-3">
            <a
              href={paper.url}
              target="_blank"
              rel="noopener noreferrer"
              className="text-blue-600 hover:underline text-sm dark:text-blue-400"
            >
              View Paper
            </a>

            {paper.pdfUrl && (
              <a
                href={paper.pdfUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="text-blue-600 hover:underline text-sm dark:text-blue-400"
              >
                Download PDF
              </a>
            )}
          </div>

          <button
            onClick={onToggle}
            className="mt-3 text-sm text-gray-600 hover:text-gray-800 dark:text-gray-300 dark:hover:text-gray-100"
          >
            Show Less
          </button>
        </div>
      ) : (
        <button
          onClick={onToggle}
          className="text-sm text-blue-600 hover:text-blue-800 dark:text-blue-400 dark:hover:text-blue-300"
        >
          Show Abstract
        </button>
      )}
    </div>
  );
}
