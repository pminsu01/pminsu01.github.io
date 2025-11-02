/**
 * Google Identity Services 타입 정의
 * https://developers.google.com/identity/gsi/web/reference/js-reference
 */

interface CredentialResponse {
  credential: string; // Google ID Token (JWT)
  select_by: string;
  clientId?: string;
}

interface GoogleIdentityService {
  initialize(config: {
    client_id: string;
    callback: (response: CredentialResponse) => void;
    auto_select?: boolean;
    cancel_on_tap_outside?: boolean;
  }): void;

  renderButton(
    parent: HTMLElement,
    options: {
      theme?: 'outline' | 'filled_blue' | 'filled_black';
      size?: 'large' | 'medium' | 'small';
      text?: 'signin_with' | 'signup_with' | 'continue_with' | 'signin';
      shape?: 'rectangular' | 'pill' | 'circle' | 'square';
      logo_alignment?: 'left' | 'center';
      width?: number;
      locale?: string;
    }
  ): void;

  prompt(momentListener?: (notification: PromptMomentNotification) => void): void;

  disableAutoSelect(): void;

  revoke(hint: string, callback: (response: RevocationResponse) => void): void;
}

interface GoogleAccounts {
  accounts: {
    id: GoogleIdentityService;
  };
}

interface PromptMomentNotification {
  isDisplayMoment(): boolean;
  isDisplayed(): boolean;
  isNotDisplayed(): boolean;
  getNotDisplayedReason(): string;
  isSkippedMoment(): boolean;
  getSkippedReason(): string;
  isDismissedMoment(): boolean;
  getDismissedReason(): string;
  getMomentType(): string;
}

interface RevocationResponse {
  successful: boolean;
  error?: string;
}

interface Window {
  google?: GoogleAccounts;
}

declare const google: GoogleAccounts;
