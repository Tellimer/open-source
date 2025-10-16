/**
 * Exponential backoff retry logic for rate limit handling
 */

export interface RetryOptions {
  maxRetries?: number;
  initialDelayMs?: number;
  maxDelayMs?: number;
  onRetry?: (attempt: number, error: Error) => void;
}

/**
 * Fetch with exponential backoff retry
 * Handles 429 rate limit errors with increasing delays
 */
export async function fetchWithRetry(
  url: string,
  options: RequestInit,
  retryOptions: RetryOptions = {}
): Promise<Response> {
  const {
    maxRetries = 3,
    initialDelayMs = 1000,
    maxDelayMs = 10000,
    onRetry,
  } = retryOptions;

  for (let attempt = 0; attempt < maxRetries; attempt++) {
    try {
      const response = await fetch(url, options);

      // Success
      if (response.ok) {
        return response;
      }

      // Rate limit - retry with backoff
      if (response.status === 429 && attempt < maxRetries - 1) {
        const delay = Math.min(
          initialDelayMs * Math.pow(2, attempt),
          maxDelayMs
        );

        const error = new Error(
          `Rate limited (429), retrying in ${delay}ms (attempt ${attempt + 1}/${maxRetries})`
        );

        if (onRetry) {
          onRetry(attempt + 1, error);
        } else {
          console.warn(error.message);
        }

        await new Promise((r) => setTimeout(r, delay));
        continue;
      }

      // Other HTTP error
      const errorText = await response.text();
      throw new Error(
        `HTTP ${response.status}: ${response.statusText}\n${errorText}`
      );
    } catch (err) {
      // Network error or other exception
      if (attempt === maxRetries - 1) {
        throw err;
      }

      // Retry network errors with backoff
      const delay = Math.min(
        initialDelayMs * Math.pow(2, attempt),
        maxDelayMs
      );
      const error = err instanceof Error ? err : new Error(String(err));

      if (onRetry) {
        onRetry(attempt + 1, error);
      } else {
        console.warn(
          `Network error, retrying in ${delay}ms (attempt ${attempt + 1}/${maxRetries}): ${error.message}`
        );
      }

      await new Promise((r) => setTimeout(r, delay));
    }
  }

  throw new Error(`Max retries (${maxRetries}) exceeded`);
}

/**
 * Sleep helper
 */
export function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}
