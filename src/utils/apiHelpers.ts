/**
 * API 헬퍼 유틸리티
 *
 * Re-exports from dateHelpers for backward compatibility
 * @deprecated Import directly from dateHelpers instead
 */

export { formatDateForApi } from './dateHelpers';

/**
 * Converts API date string to Date object
 */
export function parseApiDate(dateString: string | null | undefined): Date | undefined {
  return dateString ? new Date(dateString) : undefined;
}
