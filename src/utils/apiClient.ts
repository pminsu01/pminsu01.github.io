import { clearAuth, getAuthHeader } from './auth';
import { navigateTo } from './navigation';
import { showToast, showNetworkErrorPopup } from './domHelpers';
import { NetworkError, NetworkErrorType, createNetworkErrorFromFetch } from './errors';

/**
 * Fetch API 기반 HTTP 클라이언트
 * - Authorization Bearer 토큰 자동 전송 (localStorage)
 * - 401/403 에러 자동 처리
 * - JSON 자동 변환
 * - 타입 안전성
 */
class ApiClient {
  private baseURL: string;

  constructor(baseURL?: string) {
    // 환경별 baseURL 설정
    // - 환경 변수 우선: GitHub Actions에서 설정된 VITE_API_BASE_URL 사용
    // - 로컬 개발: HTTP (SSL 인증서 문제 회피)
    // - 프로덕션 기본값: starlight-8 도메인 (유효한 SSL 인증서)
    const defaultBaseURL =
      import.meta.env.VITE_API_BASE_URL ||
      (import.meta.env.MODE === 'production'
        ? 'https://starlight-8.asuscomm.com:8108/api'
        : 'http://chores-board-be-dns.koreacentral.cloudapp.azure.com:8108/api');

    this.baseURL = baseURL ?? defaultBaseURL;
  }

  /**
   * 공통 요청 메서드
   * - Authorization Bearer 토큰 자동 전송
   * - 401/403 에러 자동 처리 (재로그인 유도)
   * - JSON 자동 파싱
   */
  private async request<T = any>(
    endpoint: string,
    options: RequestInit = {},
    suppressAuthRedirect: boolean = false // 401 리디렉션 방지 플래그
  ): Promise<T> {
    const url = `${this.baseURL}${endpoint}`;

    // Authorization 헤더 자동 추가
    const authHeader = getAuthHeader();

    // 요청 설정
    const config: RequestInit = {
      ...options,
      cache: 'no-store', // 브라우저 캐싱 방지
      headers: {
        'Content-Type': 'application/json',
        ...authHeader, // Authorization: Bearer {token}
        ...options.headers,
      },
    };

    try {
      const response = await fetch(url, config);

      // 401 Unauthorized 또는 403 Forbidden - 토큰 만료 또는 무효
      // Safari ITP로 인해 쿠키가 전송되지 않을 경우 403 발생 가능
      if (response.status === 401 || response.status === 403) {
        if (!suppressAuthRedirect) {
          this.handleUnauthorized();
        }
        throw new Error('Unauthorized - session expired or invalid');
      }

      // 404 Not Found - 네트워크 문제로 간주
      if (response.status === 404) {
        const networkError = new NetworkError(
          NetworkErrorType.NOT_FOUND,
          '서버에 연결할 수 없습니다.',
          404,
          true
        );
        this.handleNetworkError(networkError, endpoint);
        throw networkError;
      }

      // 500+ Server Error
      if (response.status >= 500) {
        const errorMessage = await this.extractErrorMessage(response);
        throw new NetworkError(
          NetworkErrorType.SERVER_ERROR,
          errorMessage,
          response.status,
          true
        );
      }

      // HTTP 에러 처리
      if (!response.ok) {
        const errorMessage = await this.extractErrorMessage(response);
        throw new Error(errorMessage);
      }

      // 204 No Content 처리
      if (response.status === 204) {
        return null as T;
      }

      // JSON 응답 파싱
      return response.json();
    } catch (error) {
      // NetworkError는 그대로 throw
      if (error instanceof NetworkError) {
        throw error;
      }

      // TypeError: Failed to fetch - 네트워크 연결 실패
      if (error instanceof TypeError) {
        const networkError = createNetworkErrorFromFetch(error);
        this.handleNetworkError(networkError, endpoint);
        throw networkError;
      }

      // 기타 에러
      if (error instanceof Error) {
        throw error;
      }
      throw new Error('Network error or unexpected error occurred');
    }
  }

  /**
   * 에러 메시지 추출
   */
  private async extractErrorMessage(response: Response): Promise<string> {
    try {
      const data = await response.json();
      if (data && data.message) {
        return data.message;
      } else if (data && data.error && data.error.message) {
        return data.error.message;
      }
    } catch {
      // JSON 파싱 실패 시 무시
    }
    return `HTTP ${response.status}`;
  }

  /**
   * 401 에러 처리
   * - 인증 정보 제거
   * - 토스트 메시지 표시
   * - 로그인 페이지로 리다이렉트
   */
  private handleUnauthorized(): void {
    console.warn('[ApiClient] 401 Unauthorized - clearing auth and redirecting to login');
    clearAuth();
    showToast('세션이 만료되었습니다. 다시 로그인해주세요.', 'error');
    navigateTo('/');
  }

  /**
   * 네트워크 에러 처리
   * - 네트워크 에러 팝업 표시
   * - 재시도 옵션 제공
   */
  private handleNetworkError(error: NetworkError, endpoint: string): void {
    console.error('[ApiClient] Network error:', {
      type: error.type,
      endpoint,
      message: error.message,
      statusCode: error.statusCode,
    });

    // 404나 네트워크 연결 실패 시 팝업 표시
    if (error.shouldShowNetworkPopup()) {
      showNetworkErrorPopup(error.getUserMessage());
    }
  }

  /**
   * GET 요청
   */
  async get<T = any>(
    endpoint: string,
    headers?: Record<string, string>,
    suppressAuthRedirect?: boolean
  ): Promise<T> {
    return this.request<T>(endpoint, { method: 'GET', headers }, suppressAuthRedirect);
  }

  /**
   * POST 요청
   */
  async post<T = any>(endpoint: string, data?: any, headers?: Record<string, string>): Promise<T> {
    return this.request<T>(endpoint, {
      method: 'POST',
      body: data ? JSON.stringify(data) : undefined,
      headers,
    });
  }

  /**
   * PUT 요청
   */
  async put<T = any>(endpoint: string, data?: any, headers?: Record<string, string>): Promise<T> {
    return this.request<T>(endpoint, {
      method: 'PUT',
      body: data ? JSON.stringify(data) : undefined,
      headers,
    });
  }

  /**
   * PATCH 요청
   */
  async patch<T = any>(endpoint: string, data?: any, headers?: Record<string, string>): Promise<T> {
    return this.request<T>(endpoint, {
      method: 'PATCH',
      body: data ? JSON.stringify(data) : undefined,
      headers,
    });
  }

  /**
   * DELETE 요청
   */
  async delete<T = any>(endpoint: string, headers?: Record<string, string>): Promise<T> {
    return this.request<T>(endpoint, {
      method: 'DELETE',
      headers,
    });
  }
}

// 싱글톤 인스턴스 생성 및 export
export const apiClient = new ApiClient();