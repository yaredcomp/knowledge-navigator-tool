'use client';

import { useEffect, useState } from 'react';
import { ResearchPaper } from '@/types';
import Link from 'next/link';

export default function PaperPage({ params }: { params: { id: string } }) {
  const [paper, setPaper] = useState<ResearchPaper | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchPaper = async () => {
      try {
        const response = await fetch(`/api/paper/${params.id}`);
        
        if (!response.ok) {
          throw new Error('Failed to fetch paper details');
        }
        
        const data = await response.json();
        setPaper(data);
      } catch (error) {
        console.error('Error fetching paper:', error);
        setError('Failed to load paper details. Please try again later.');
      } finally {
        setIsLoading(false);
      }
    };

    fetchPaper();
  }, [params.id]);

  if (isLoading) {
    return (
      <div className="min-h-screen p-4 md:p-8 bg-gray-50 dark:bg-gray-900">
        <div className="w-full max-w-4xl mx-auto p-4 text-center">
          <p className="text-gray-600 dark:text-gray-300">Loading paper details...</p>
        </div>
      </div>
    );
  }

  if (error || !paper) {
    return (
      <div className="min-h-screen p-4 md:p-8 bg-gray-50 dark:bg-gray-900">
        <div className="w-full max-w-4xl mx-auto p-4 text-center">
          <p className="text-red-600 dark:text-red-400">{error || 'Paper not found'}</p>
          <Link href="/" className="mt-4 inline-block text-blue-600 hover:underline">
            Return to search
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen p-4 md:p-8 bg-gray-50 dark:bg-gray-900">
      <div className="w-full max-w-4xl mx-auto p-4">
        <Link href="/" className="text-blue-600 hover:underline mb-6 inline-block">
          ← Back to search
        </Link>
        
        <div className="border rounded-lg p-6 shadow-md bg-white dark:bg-gray-800">
          <h1 className="text-2xl font-bold mb-4">{paper.title}</h1>
          
          <div className="mb-4">
            <h2 className="text-lg font-medium mb-2">Authors</h2>
            <p className="text-gray-700 dark:text-gray-300">{paper.authors.join(', ')}</p>
          </div>
          
          {paper.publishedDate && (
            <div className="mb-4">
              <h2 className="text-lg font-medium mb-2">Published</h2>
              <p className="text-gray-700 dark:text-gray-300">{paper.publishedDate}</p>
            </div>
          )}
          
          <div className="mb-4">
            <h2 className="text-lg font-medium mb-2">Affiliations</h2>
            <p className="text-gray-700 dark:text-gray-300">{paper.affiliations.join(', ')}</p>
          </div>
          
          <div className="mb-6">
            <h2 className="text-lg font-medium mb-2">Abstract</h2>
            <p className="text-gray-700 dark:text-gray-300">{paper.abstract}</p>
          </div>
          
          <div className="flex gap-4">
            <a 
              href={paper.url} 
              target="_blank" 
              rel="noopener noreferrer"
              className="bg-blue-600 text-white py-2 px-4 rounded-md hover:bg-blue-700 transition-colors"
            >
              View Paper
            </a>
            
            {paper.pdfUrl && (
              <a 
                href={paper.pdfUrl} 
                target="_blank" 
                rel="noopener noreferrer"
                className="bg-green-600 text-white py-2 px-4 rounded-md hover:bg-green-700 transition-colors"
              >
                Download PDF
              </a>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
