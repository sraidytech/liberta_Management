/**
 * Query Timeout Utility
 * 
 * Prevents long-running queries from causing 500 errors
 * Adds timeout handling for all analytics queries
 */

export class QueryTimeoutError extends Error {
  constructor(message: string, public timeout: number) {
    super(message);
    this.name = 'QueryTimeoutError';
  }
}

/**
 * Wraps a promise with a timeout
 * @param promise The promise to wrap
 * @param timeoutMs Timeout in milliseconds (default: 15 seconds)
 * @param operation Description of the operation for error messages
 */
export function withTimeout<T>(
  promise: Promise<T>, 
  timeoutMs: number = 15000, 
  operation: string = 'Database query'
): Promise<T> {
  const timeoutPromise = new Promise<never>((_, reject) => {
    setTimeout(() => {
      reject(new QueryTimeoutError(
        `${operation} timed out after ${timeoutMs}ms. This usually indicates a performance issue that needs optimization.`,
        timeoutMs
      ));
    }, timeoutMs);
  });

  return Promise.race([promise, timeoutPromise]);
}

/**
 * Wraps multiple promises with timeout and handles partial failures
 * @param promises Array of promises to execute
 * @param timeoutMs Timeout for each promise
 * @param operation Description for error messages
 */
export async function withTimeoutBatch<T>(
  promises: Promise<T>[], 
  timeoutMs: number = 15000,
  operation: string = 'Batch database queries'
): Promise<(T | Error)[]> {
  const wrappedPromises = promises.map((promise, index) => 
    withTimeout(promise, timeoutMs, `${operation} [${index}]`)
      .catch(error => error)
  );

  return Promise.all(wrappedPromises);
}

/**
 * Enhanced error handler for analytics queries
 * @param error The error that occurred
 * @param operation Description of the operation
 * @param res Express response object
 */
export function handleAnalyticsError(error: any, operation: string, res: any) {
  console.error(`Analytics error in ${operation}:`, error);

  if (error instanceof QueryTimeoutError) {
    return res.status(408).json({
      success: false,
      error: {
        message: `${operation} is taking longer than expected. Please try again or contact support if the issue persists.`,
        code: 'QUERY_TIMEOUT',
        statusCode: 408,
        timeout: error.timeout,
        suggestion: 'Try using more specific filters to reduce the data size, or contact support for optimization.'
      }
    });
  }

  // Database connection errors
  if (error.code === 'P1001' || error.code === 'P1008' || error.code === 'P1017') {
    return res.status(503).json({
      success: false,
      error: {
        message: 'Database connection issue. Please try again in a moment.',
        code: 'DATABASE_CONNECTION_ERROR',
        statusCode: 503
      }
    });
  }

  // Query errors
  if (error.code?.startsWith('P2')) {
    return res.status(400).json({
      success: false,
      error: {
        message: 'Invalid query parameters. Please check your filters and try again.',
        code: 'INVALID_QUERY',
        statusCode: 400
      }
    });
  }

  // Generic server error
  return res.status(500).json({
    success: false,
    error: {
      message: `Failed to fetch ${operation.toLowerCase()}. Please try again or contact support.`,
      code: 'INTERNAL_SERVER_ERROR',
      statusCode: 500
    }
  });
}