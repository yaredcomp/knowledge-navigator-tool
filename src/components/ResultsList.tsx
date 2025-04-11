'use client';

import { useState } from 'react';
import { ResearchPaper } from '@/types';

interface ResultsListProps {
  papers: ResearchPaper[];
  total: number;
  page: number;
  limit: number;
  onPageChange: (page: number) => void;
}

export default function ResultsList({ 
  papers, 
  total, 
  page, 
  limit, 
  onPageChange 
}: ResultsListProps) {
  const [expandedPaper, setExpandedPaper] = useState<string | null>(null);

  const totalPages = Math.ceil(total / limit);

  const toggleExpand = (paperId: string) => {
    if (expandedPaper === paperId) {
      setExpandedPaper(null);
    } else {
      setExpandedPaper(paperId);
    }
  };

  if (papers.length === 0) {
    return (
      <div className="w-full max-w-4xl mx-auto p-4 text-center">
        <p className="text-gray-600 dark:text-gray-300">No papers found. Try a different search query.</p>
      </div>
    );
  }

  return (
    <div className="w-full max-w-4xl mx-auto p-4">
      <h2 className="text-xl font-semibold mb-4">
        Found {total} research papers
      </h2>
      
      <div className="space-y-6">
        {papers.map((paper) => (
          <div 
            key={paper.id} 
            className="border rounded-lg p-4 shadow-sm hover:shadow-md transition-shadow"
          >
            <h3 className="text-lg font-medium mb-2">{paper.title}</h3>
            
            <div className="text-sm text-gray-600 dark:text-gray-300 mb-2">
              <span className="font-medium">Authors:</span> {paper.authors.join(', ')}
            </div>
            
            {paper.publishedDate && (
              <div className="text-sm text-gray-600 dark:text-gray-300 mb-2">
                <span className="font-medium">Published:</span> {paper.publishedDate}
              </div>
            )}
            
            <div className="text-sm text-gray-600 dark:text-gray-300 mb-2">
              <span className="font-medium">Affiliations:</span> {paper.affiliations.join(', ')}
            </div>
            
            <div className="text-sm text-gray-600 dark:text-gray-300 mb-2">
              <span className="font-medium">Source:</span> {paper.source === 'arxiv' ? 'arXiv' : 'Semantic Scholar'}
            </div>
            
            {expandedPaper === paper.id ? (
              <div className="mt-3">
                <h4 className="text-md font-medium mb-2">Abstract</h4>
                <p className="text-sm text-gray-700 dark:text-gray-200 mb-4">{paper.abstract}</p>
                
                <div className="flex gap-3">
                  <a 
                    href={paper.url} 
                    target="_blank" 
                    rel="noopener noreferrer"
                    className="text-blue-600 hover:underline text-sm"
                  >
                    View Paper
                  </a>
                  
                  {paper.pdfUrl && (
                    <a 
                      href={paper.pdfUrl} 
                      target="_blank" 
                      rel="noopener noreferrer"
                      className="text-blue-600 hover:underline text-sm"
                    >
                      Download PDF
                    </a>
                  )}
                </div>
                
                <button 
                  onClick={() => toggleExpand(paper.id)}
                  className="mt-3 text-sm text-gray-600 hover:text-gray-800 dark:text-gray-300 dark:hover:text-gray-100"
                >
                  Show Less
                </button>
              </div>
            ) : (
              <button 
                onClick={() => toggleExpand(paper.id)}
                className="text-sm text-blue-600 hover:text-blue-800 dark:text-blue-400 dark:hover:text-blue-300"
              >
                Show Abstract
              </button>
            )}
          </div>
        ))}
      </div>
      
      {totalPages > 1 && (
        <div className="flex justify-center mt-8">
          <div className="flex gap-2">
            <button
              onClick={() => onPageChange(page - 1)}
              disabled={page === 1}
              className="px-3 py-1 border rounded-md disabled:opacity-50"
            >
              Previous
            </button>
            
            <span className="px-3 py-1">
              Page {page} of {totalPages}
            </span>
            
            <button
              onClick={() => onPageChange(page + 1)}
              disabled={page === totalPages}
              className="px-3 py-1 border rounded-md disabled:opacity-50"
            >
              Next
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
