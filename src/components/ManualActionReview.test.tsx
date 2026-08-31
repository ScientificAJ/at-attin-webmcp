import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { prepareOperation } from '../domain/operations/types';
import { createBankStore } from '../domain/store';
import { memoryStorage } from '../test/memory-storage';
import { ManualActionReview } from './ManualActionReview';

describe('ManualActionReview', () => {
  it('keeps a critical manual action blocked until YES and the math answer are correct', async () => {
    const user = userEvent.setup();
    const store = createBankStore(
      memoryStorage(),
      () => new Date('2026-08-31T09:00:00.000Z'),
    );
    const prepared = prepareOperation(store, 'secure_suspicious_charge', {
      transactionId: 'transaction-suspicious',
      reason: 'card-not-present',
    });
    render(
      <ManualActionReview
        ariaLabel="Critical action review"
        onCancel={() => undefined}
        prepared={prepared}
        successMessage="Account secured."
      />,
    );

    const typed = screen.getByLabelText('Type YES to confirm this critical task');
    const math = screen.getByLabelText(/What is \d+ \+ \d+\?/);
    const challenge = math.getAttribute('aria-label')?.match(/What is (\d+) \+ (\d+)\?/);
    if (!challenge) throw new Error('Math challenge was not exposed accessibly.');
    const answer = Number(challenge[1]) + Number(challenge[2]);
    const confirm = screen.getByRole('button', { name: 'Yes, confirm' });

    await user.type(typed, 'YES');
    expect(confirm).toBeDisabled();
    await user.type(math, String(answer - 1));
    expect(confirm).toBeDisabled();
    await user.clear(math);
    await user.type(math, String(answer));
    expect(confirm).toBeEnabled();

    await user.click(confirm);
    expect(screen.getByRole('status')).toHaveTextContent('Account secured.');
  });
});
