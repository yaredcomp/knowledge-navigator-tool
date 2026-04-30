'use client';

import { SearchInsights } from '@/types/paper';

interface SearchInsightsProps {
  insights: SearchInsights;
  isVisible: boolean;
}

export default function SearchInsightsPanel({ insights, isVisible }: SearchInsightsProps) {
  if (!isVisible || !insights) return null;

  return (
    <div className="w-full max-w-4xl mx-auto p-4 mb-6 bg-gradient-to-r from-blue-50 to-purple-50 dark:from-blue-900/20 dark:to-purple-900/20 rounded-lg border border-blue-200 dark:border-blue-800">
      <h3 className="text-lg font-semibold mb-3 text-blue-800 dark:text-blue-200">
        Research Insights
      </h3>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div>
          <h4 className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
            Main Themes
          </h4>
          <ul className="text-sm text-gray-600 dark:text-gray-400 space-y-1">
            {insights.mainThemes.slice(0, 5).map((theme, idx) => (
              <li key={idx} className="flex items-start gap-2">
                <span className="text-blue-500 mt-1">•</span>
                <span>{theme}</span>
              </li>
            ))}
          </ul>
        </div>

        <div>
          <h4 className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
            Key Findings
          </h4>
          <ul className="text-sm text-gray-600 dark:text-gray-400 space-y-1">
            {insights.keyFindings.slice(0, 5).map((finding, idx) => (
              <li key={idx} className="flex items-start gap-2">
                <span className="text-green-500 mt-1">•</span>
                <span>{finding}</span>
              </li>
            ))}
          </ul>
        </div>

        <div>
          <h4 className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
            Research Gaps
          </h4>
          <ul className="text-sm text-gray-600 dark:text-gray-400 space-y-1">
            {insights.researchGaps.slice(0, 5).map((gap, idx) => (
              <li key={idx} className="flex items-start gap-2">
                <span className="text-amber-500 mt-1">•</span>
                <span>{gap}</span>
              </li>
            ))}
          </ul>
        </div>

        <div>
          <h4 className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
            Recommendations
          </h4>
          <ul className="text-sm text-gray-600 dark:text-gray-400 space-y-1">
            {insights.recommendations.slice(0, 5).map((rec, idx) => (
              <li key={idx} className="flex items-start gap-2">
                <span className="text-purple-500 mt-1">•</span>
                <span>{rec}</span>
              </li>
            ))}
          </ul>
        </div>
      </div>

      <div className="mt-4 pt-4 border-t border-blue-200 dark:border-blue-700">
        <p className="text-sm text-gray-700 dark:text-gray-200 italic">
          {insights.summary}
        </p>
      </div>

      {insights.statistics && (
        <div className="mt-4 pt-4 border-t border-blue-200 dark:border-blue-700">
          <h4 className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
            Search Statistics
          </h4>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
            <div>
              <span className="text-gray-500">Total Results:</span>
              <span className="ml-2 font-medium">{insights.statistics.totalResults}</span>
            </div>
            <div>
              <span className="text-gray-500">Ethiopian Papers:</span>
              <span className="ml-2 font-medium text-amber-600">
                {insights.statistics.withEthiopianAffiliation}
              </span>
            </div>
            <div>
              <span className="text-gray-500">Top Author:</span>
              <span className="ml-2 font-medium truncate">
                {insights.statistics.topAuthors[0]?.name || 'N/A'}
              </span>
            </div>
            <div>
              <span className="text-gray-500">Most Recent:</span>
              <span className="ml-2 font-medium">
                {Object.keys(insights.statistics.byYear).sort().reverse()[0] || 'N/A'}
              </span>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
