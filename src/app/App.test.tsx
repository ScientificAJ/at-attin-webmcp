import { render, screen } from '@testing-library/react';
import { App } from './App';

it('renders the At Attin product heading', () => {
  render(<App />);
  expect(screen.getByRole('heading', { name: 'At Attin' })).toBeVisible();
});
