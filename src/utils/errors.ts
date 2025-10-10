/**
 * Custom error classes for better error handling
 */

/**
 * Network error types
 */
export enum NetworkErrorType {
  NOT_FOUND = 'NOT_FOUND',           // 404
  NETWORK_FAILURE = 'NETWORK_FAILURE', // fetch failed (TypeError)
  TIMEOUT = 'TIMEOUT',                // request timeout
  SERVER_ERROR = 'SERVER_ERROR',      // 500+
}

/**
 * Custom network error class
 */
export class NetworkError extends Error {
  public readonly type: NetworkErrorType;
  public readonly statusCode?: number;
  public readonly retryable: boolean;

  constructor(
    type: NetworkErrorType,
    message: string,
    statusCode?: number,
    retryable: boolean = true
  ) {
    super(message);
    this.name = 'NetworkError';
    this.type = type;
    this.statusCode = statusCode;
    this.retryable = retryable;

    // Maintains proper stack trace for where our error was thrown (only available on V8)
    if ((Error as any).captureStackTrace) {
      (Error as any).captureStackTrace(this, NetworkError);
    }
  }

  /**
   * Check if this error should show network error popup
   */
  shouldShowNetworkPopup(): boolean {
    return this.type === NetworkErrorType.NOT_FOUND || this.type === NetworkErrorType.NETWORK_FAILURE;
  }

  /**
   * Get user-friendly error message
   */
  getUserMessage(): string {
    switch (this.type) {
      case NetworkErrorType.NOT_FOUND:
        return '서버에 연결할 수 없습니다.\n네트워크 연결을 확인해주세요.';
      case NetworkErrorType.NETWORK_FAILURE:
        return '네트워크 연결에 실패했습니다.\n연결 상태를 확인해주세요.';
      case NetworkErrorType.TIMEOUT:
        return '요청 시간이 초과되었습니다.\n다시 시도해주세요.';
      case NetworkErrorType.SERVER_ERROR:
        return '서버 오류가 발생했습니다.\n잠시 후 다시 시도해주세요.';
      default:
        return this.message;
    }
  }
}

/**
 * Check if error is a network error
 */
export function isNetworkError(error: unknown): error is NetworkError {
  return error instanceof NetworkError;
}

/**
 * Create NetworkError from fetch error
 */
export function createNetworkErrorFromFetch(error: Error): NetworkError {
  // TypeError: Failed to fetch - 네트워크 연결 실패
  if (error.name === 'TypeError' && error.message.includes('fetch')) {
    return new NetworkError(
      NetworkErrorType.NETWORK_FAILURE,
      '네트워크 연결에 실패했습니다.',
      undefined,
      true
    );
  }

  // 기타 에러
  return new NetworkError(
    NetworkErrorType.NETWORK_FAILURE,
    error.message,
    undefined,
    true
  );
}
