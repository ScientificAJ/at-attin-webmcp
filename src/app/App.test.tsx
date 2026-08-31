import { render, screen } from '@testing-library/react';
import { App } from './App';

it('renders the At Attin product name', () => {
  render(<App />);
  expect(screen.getByRole('heading', { name: /at attin/i })).toBeVisible();
});
