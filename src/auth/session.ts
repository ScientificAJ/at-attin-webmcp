export const DEMO_USERNAME = 'john.attin';
export const DEMO_PASSWORD = 'attin2026';

export type SignInResult =
  | { ok: true }
  | { ok: false; message: 'Use the demo credentials shown below.' };

export class SessionStore {
  private signedIn = false;
  private readonly listeners = new Set<() => void>();

  signIn(username: string, password: string): SignInResult {
    if (username !== DEMO_USERNAME || password !== DEMO_PASSWORD) {
      return { ok: false, message: 'Use the demo credentials shown below.' };
    }
    if (!this.signedIn) {
      this.signedIn = true;
      this.notify();
    }
    return { ok: true };
  }

  signOut(): void {
    if (this.signedIn) {
      this.signedIn = false;
      this.notify();
    }
  }

  isSignedIn(): boolean {
    return this.signedIn;
  }

  subscribe(listener: () => void): () => void {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  }

  private notify(): void {
    for (const listener of this.listeners) {
      listener();
    }
  }
}

export function createSessionStore(): SessionStore {
  return new SessionStore();
}
