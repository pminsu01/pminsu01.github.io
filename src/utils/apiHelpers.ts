/**
 * API 헬퍼 유틸리티
 *
 * HttpOnly Cookie 방식을 사용하므로 헤더 관련 함수는 제거됨
 * apiClient.ts에서 모든 API 요청을 처리
 */

/**
 * Formats date to YYYY-MM-DD
 */
export function formatDateForApi(date: Date = new Date()): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

/**
 * Converts API date string to Date object
 */
export function parseApiDate(dateString: string | null | undefined): Date | undefined {
  return dateString ? new Date(dateString) : undefined;
}
