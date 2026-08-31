import type { Goal } from '../domain/models';
import { Amount } from './Amount';

export function GoalProgress({ goal }: { goal: Goal }) {
  const percent = Math.min(100, Math.round((goal.savedAmount / goal.target) * 100));
  return (
    <article className="goal-progress">
      <div>
        <p className="eyebrow">Savings goal</p>
        <h3>{goal.name}</h3>
        <p><Amount value={goal.savedAmount} /> saved toward <Amount value={goal.target} /></p>
      </div>
      <strong className="goal-progress__percent">{percent}%</strong>
      <progress aria-label={`${goal.name} goal progress`} max={100} value={percent} />
      <time dateTime={goal.deadline}>Target {new Intl.DateTimeFormat('en-US', { month: 'long', year: 'numeric' }).format(new Date(`${goal.deadline}T00:00:00Z`))}</time>
    </article>
  );
}
