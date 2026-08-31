import { createSessionStore } from './session';

describe('prototype session', () => {
  it('accepts only the published demo credentials', () => {
    const session = createSessionStore();

    expect(session.signIn('john.attin', 'attin2026')).toEqual({ ok: true });
    expect(session.isSignedIn()).toBe(true);
    session.signOut();
    expect(session.isSignedIn()).toBe(false);
    expect(session.signIn('john.attin', 'wrong')).toEqual({
      ok: false,
      message: 'Use the demo credentials shown below.',
    });
  });

  it('keeps session state in memory and notifies only successful transitions', () => {
    const session = createSessionStore();
    let notifications = 0;
    const unsubscribe = session.subscribe(() => {
      notifications += 1;
    });

    expect(session.signIn('John.Attin', 'attin2026')).toMatchObject({ ok: false });
    expect(notifications).toBe(0);
    session.signOut();
    expect(notifications).toBe(0);
    session.signIn('john.attin', 'attin2026');
    session.signIn('john.attin', 'attin2026');
    session.signOut();
    session.signOut();
    expect(notifications).toBe(2);

    unsubscribe();
    session.signIn('john.attin', 'attin2026');
    expect(notifications).toBe(2);
  });
});
