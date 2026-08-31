import type { Budget } from '../domain/models';
import { Amount } from './Amount';

export function BudgetRow({ budget }: { budget: Budget }) {
  const percent = Math.min(100, Math.round((budget.spent / budget.limit) * 100));
  return (
    <li className="plan-row">
      <div>
        <strong>{budget.category}</strong>
        <span><Amount value={budget.spent} /> of <Amount value={budget.limit} /></span>
      </div>
      <progress aria-label={`${budget.category} budget used`} max={100} value={percent} />
      <span>{percent}%</span>
    </li>
  );
}
