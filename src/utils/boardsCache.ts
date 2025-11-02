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
      return;
    }

    const data = JSON.stringify(boards);
    sessionStorage.setItem(cacheKey, data);
  } catch (error) {
    // Silent fail
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
      return null;
    }

    const data = sessionStorage.getItem(cacheKey);
    if (!data) {
      return null;
    }

    const boards = JSON.parse(data) as CachedBoard[];

    // Validate cache structure
    if (!Array.isArray(boards)) {
      clearBoardsCache();
      return null;
    }

    return boards;
  } catch (error) {
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
  } catch (error) {
    // Silent fail
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
  } catch (error) {
    // Silent fail
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
