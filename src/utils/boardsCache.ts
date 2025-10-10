/**
 * Boards cache management using SessionStorage
 * - Caches user's boards list from login response
 * - Reduces unnecessary API calls
 * - Automatically cleared on logout or session end
 */

const BOARDS_CACHE_KEY = 'choresboard:boards_cache';

export interface CachedBoard {
  code: string;
  title: string;
}

/**
 * Save boards to session storage
 */
export function saveBoardsCache(boards: CachedBoard[]): void {
  try {
    const data = JSON.stringify(boards);
    sessionStorage.setItem(BOARDS_CACHE_KEY, data);
    console.log('[BoardsCache] Saved boards to cache:', boards.length);
  } catch (error) {
    console.error('[BoardsCache] Failed to save boards:', error);
  }
}

/**
 * Get boards from session storage
 * Returns null if cache doesn't exist or is invalid
 */
export function getBoardsCache(): CachedBoard[] | null {
  try {
    const data = sessionStorage.getItem(BOARDS_CACHE_KEY);
    if (!data) {
      console.log('[BoardsCache] No cache found');
      return null;
    }

    const boards = JSON.parse(data) as CachedBoard[];

    // Validate cache structure
    if (!Array.isArray(boards)) {
      console.warn('[BoardsCache] Invalid cache structure');
      clearBoardsCache();
      return null;
    }

    console.log('[BoardsCache] Retrieved boards from cache:', boards.length);
    return boards;
  } catch (error) {
    console.error('[BoardsCache] Failed to retrieve boards:', error);
    clearBoardsCache();
    return null;
  }
}

/**
 * Clear boards cache
 */
export function clearBoardsCache(): void {
  try {
    sessionStorage.removeItem(BOARDS_CACHE_KEY);
    console.log('[BoardsCache] Cache cleared');
  } catch (error) {
    console.error('[BoardsCache] Failed to clear cache:', error);
  }
}

/**
 * Check if boards cache exists
 */
export function hasBoardsCache(): boolean {
  return sessionStorage.getItem(BOARDS_CACHE_KEY) !== null;
}
