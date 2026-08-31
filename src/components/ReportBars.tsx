import type { MinorATC } from '../domain/models';
import { Amount } from './Amount';

interface ReportBarItem {
  label: string;
  value: MinorATC;
}

interface ReportBarsProps {
  items: readonly ReportBarItem[];
  title: string;
}

export function ReportBars({ items, title }: ReportBarsProps) {
  const maximum = Math.max(...items.map(({ value }) => value), 1);
  return (
    <section className="report-bars" aria-labelledby="report-bars-title">
      <div className="section-heading">
        <h2 id="report-bars-title">{title}</h2>
        <span>ATC</span>
      </div>
      <ol>
        {items.map((item) => (
          <li key={item.label}>
            <div><span>{item.label}</span><Amount value={item.value} /></div>
            <progress aria-label={`${item.label} spending`} max={maximum} value={item.value} />
          </li>
        ))}
      </ol>
    </section>
  );
}
