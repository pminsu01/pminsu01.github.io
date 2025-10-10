/**
 * Navigation utility for client-side routing without hash (#)
 */

export function navigateTo(path: string, replace: boolean = false): void {
  window.dispatchEvent(new CustomEvent('navigate', { detail: { path, replace } }));
}

export const routes = {
  home: () => navigateTo('/'),
  register: () => navigateTo('/register'),
  boards: () => navigateTo('/boards'),
  board: (boardCode: string, editToken?: string) => {
    const url = editToken ? `/boards/${boardCode}?t=${editToken}` : `/boards/${boardCode}`;
    navigateTo(url);
  },
};
