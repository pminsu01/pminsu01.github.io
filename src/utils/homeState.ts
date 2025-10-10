export interface RecentRoom {
  boardCode: string;
  title: string;
  hasEdit: boolean;
  lastVisited: number;
}

interface IdentityState {
  anonymousId: string;
  editTokens: Record<string, string>;
}

export class HomeState {
  private identity: IdentityState;
  private recentRooms: RecentRoom[] = [];
  private listeners: Set<() => void> = new Set();

  private readonly IDENTITY_KEY = 'choresboard:identity';
  private readonly RECENT_KEY = 'choresboard:recentRooms';

  constructor() {
    this.identity = this.loadIdentity();
    this.recentRooms = this.loadRecentRooms();
  }

  private loadIdentity(): IdentityState {
    const stored = localStorage.getItem(this.IDENTITY_KEY);
    if (stored) {
      try {
        return JSON.parse(stored);
      } catch (e) {
        console.warn('[HomeState] Failed to parse identity, creating new');
      }
    }

    const newIdentity: IdentityState = {
      anonymousId: crypto.randomUUID(),
      editTokens: {},
    };
    this.saveIdentity(newIdentity);
    return newIdentity;
  }

  private saveIdentity(identity: IdentityState): void {
    localStorage.setItem(this.IDENTITY_KEY, JSON.stringify(identity));
  }

  private loadRecentRooms(): RecentRoom[] {
    const stored = localStorage.getItem(this.RECENT_KEY);
    if (stored) {
      try {
        return JSON.parse(stored);
      } catch (e) {
        console.warn('[HomeState] Failed to parse recent rooms');
      }
    }
    return [];
  }

  private saveRecentRooms(): void {
    localStorage.setItem(this.RECENT_KEY, JSON.stringify(this.recentRooms));
  }

  subscribe(listener: () => void): () => void {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  }

  private notify(): void {
    this.listeners.forEach(listener => listener());
  }

  getAnonymousId(): string {
    return this.identity.anonymousId;
  }

  getEditToken(boardCode: string): string | null {
    return this.identity.editTokens[boardCode] || null;
  }

  saveEditToken(boardCode: string, token: string): void {
    this.identity.editTokens[boardCode] = token;
    this.saveIdentity(this.identity);
  }

  addRecentRoom(room: RecentRoom): void {
    // Remove duplicate
    this.recentRooms = this.recentRooms.filter(r => r.boardCode !== room.boardCode);

    // Add to front
    this.recentRooms.unshift({ ...room, lastVisited: Date.now() });

    // Limit to 5
    if (this.recentRooms.length > 5) {
      this.recentRooms.pop();
    }

    this.saveRecentRooms();
    this.notify();
  }

  getRecentRooms(): RecentRoom[] {
    return [...this.recentRooms].sort((a, b) => b.lastVisited - a.lastVisited);
  }
}

export const homeState = new HomeState();
