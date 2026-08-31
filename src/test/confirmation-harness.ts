import type { ConfirmationCoordinator } from '../webmcp/confirmation';

export function trustedActivation(): Event {
  return { isTrusted: true } as Event;
}

export function untrustedActivation(): Event {
  return { isTrusted: false } as Event;
}

export function approveTrusted(
  coordinator: ConfirmationCoordinator,
  typedValue?: string,
): void {
  coordinator.approve(trustedActivation(), typedValue);
}

export async function promiseSettled(promise: Promise<unknown>): Promise<boolean> {
  const pending = Symbol('pending');
  return Promise.race([
    promise.then(() => true, () => true),
    Promise.resolve(pending),
  ]).then((value) => value !== pending);
}
