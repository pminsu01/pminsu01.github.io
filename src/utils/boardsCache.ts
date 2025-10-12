/**
 * Boards cache management using SessionStorage
 * - Caches user's boards list from login response
 * - Reduces unnecessary API calls
 * - Automatically cleared on logout or session end
 * - User-specific cache using userId from JWT token
 */

import { getUserIdFromToken } from './auth';

const BOARDS_CACHE_PREFIX = 'choresboard:boards_cache';

export interface CachedBoard {
  code: string;
  title: string;
}

/**
 * Get user-specific cache key
 * Returns null if user is not authenticated
 */
function getCacheKey(): string | null {
  const userId = getUserIdFromToken();
  if (!userId) {
    console.warn('[BoardsCache] No userId found in token');
    return null;
  }
  return `${BOARDS_CACHE_PREFIX}:${userId}`;
}

/**
 * Save boards to session storage
 */
export function saveBoardsCache(boards: CachedBoard[]): void {
  try {
    const cacheKey = getCacheKey();
    if (!cacheKey) {
      console.warn('[BoardsCache] Cannot save - no cache key');
      return;
    }

    const data = JSON.stringify(boards);
    sessionStorage.setItem(cacheKey, data);
    console.log('[BoardsCache] Saved boards to cache:', boards.length, 'for key:', cacheKey);
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
    const cacheKey = getCacheKey();
    if (!cacheKey) {
      console.warn('[BoardsCache] Cannot get - no cache key');
      return null;
    }

    const data = sessionStorage.getItem(cacheKey);
    if (!data) {
      console.log('[BoardsCache] No cache found for key:', cacheKey);
      return null;
    }

    const boards = JSON.parse(data) as CachedBoard[];

    // Validate cache structure
    if (!Array.isArray(boards)) {
      console.warn('[BoardsCache] Invalid cache structure');
      clearBoardsCache();
      return null;
    }

    console.log('[BoardsCache] Retrieved boards from cache:', boards.length, 'for key:', cacheKey);
    return boards;
  } catch (error) {
    console.error('[BoardsCache] Failed to retrieve boards:', error);
    clearBoardsCache();
    return null;
  }
}

/**
 * Clear boards cache for current user
 */
export function clearBoardsCache(): void {
  try {
    const cacheKey = getCacheKey();
    if (!cacheKey) {
      // If no cache key, clear all boards cache (for safety during logout)
      clearAllBoardsCaches();
      return;
    }

    sessionStorage.removeItem(cacheKey);
    console.log('[BoardsCache] Cache cleared for key:', cacheKey);
  } catch (error) {
    console.error('[BoardsCache] Failed to clear cache:', error);
  }
}

/**
 * Clear all boards caches (for all users)
 * Used during logout to ensure clean state
 */
export function clearAllBoardsCaches(): void {
  try {
    // Remove all keys that start with the boards cache prefix
    const keysToRemove: string[] = [];
    for (let i = 0; i < sessionStorage.length; i++) {
      const key = sessionStorage.key(i);
      if (key && key.startsWith(BOARDS_CACHE_PREFIX)) {
        keysToRemove.push(key);
      }
    }

    keysToRemove.forEach(key => sessionStorage.removeItem(key));
    console.log('[BoardsCache] Cleared all boards caches:', keysToRemove.length);
  } catch (error) {
    console.error('[BoardsCache] Failed to clear all caches:', error);
  }
}

/**
 * Check if boards cache exists for current user
 */
export function hasBoardsCache(): boolean {
  const cacheKey = getCacheKey();
  if (!cacheKey) return false;
  return sessionStorage.getItem(cacheKey) !== null;
}
