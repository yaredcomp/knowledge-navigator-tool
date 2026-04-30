export class SearchError extends Error {
  public readonly code: string;
  public readonly statusCode: number;
  public readonly source?: string;
  public readonly isRetryable: boolean;

  constructor(
    message: string,
    code: string = 'SEARCH_ERROR',
    statusCode: number = 500,
    source?: string,
    isRetryable: boolean = true
  ) {
    super(message);
    this.name = 'SearchError';
    this.code = code;
    this.statusCode = statusCode;
    this.source = source;
    this.isRetryable = isRetryable;
  }

  static fromProviderError(
    provider: string,
    originalError: Error,
    isRetryable: boolean = true
  ): SearchError {
    return new SearchError(
      `Search failed for ${provider}: ${originalError.message}`,
      `${provider.toUpperCase()}_ERROR`,
      503,
      provider,
      isRetryable
    );
  }

  static validationError(message: string): SearchError {
    return new SearchError(message, 'VALIDATION_ERROR', 400, undefined, false);
  }

  static timeoutError(source: string): SearchError {
    return new SearchError(
      `Request timeout for ${source}`,
      'TIMEOUT_ERROR',
      504,
      source,
      true
    );
  }

  static noResultsError(): SearchError {
    return new SearchError(
      'No results found',
      'NO_RESULTS',
      200,
      undefined,
      false
    );
  }
}

export class LLMError extends Error {
  public readonly provider: string;
  public readonly isRetryable: boolean;

  constructor(message: string, provider: string, isRetryable: boolean = true) {
    super(message);
    this.name = 'LLMError';
    this.provider = provider;
    this.isRetryable = isRetryable;
  }
}

export interface ErrorResponse {
  error: {
    message: string;
    code: string;
    statusCode: number;
    source?: string;
  };
}

export function formatErrorResponse(error: Error): ErrorResponse {
  if (error instanceof SearchError) {
    return {
      error: {
        message: error.message,
        code: error.code,
        statusCode: error.statusCode,
        source: error.source,
      },
    };
  }

  return {
    error: {
      message: error.message || 'An unexpected error occurred',
      code: 'INTERNAL_ERROR',
      statusCode: 500,
    },
  };
}
