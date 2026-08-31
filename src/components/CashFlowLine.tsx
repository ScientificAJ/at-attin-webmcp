import { TrendUp } from '@phosphor-icons/react';
import { Amount } from './Amount';
import type { MinorATC } from '../domain/models';

interface CashFlowLineProps {
  inflow: MinorATC;
  outflow: MinorATC;
  net: MinorATC;
}

export function CashFlowLine({ inflow, outflow, net }: CashFlowLineProps) {
  const maximum = Math.max(inflow, outflow, 1);
  return (
    <section className="cash-flow-line" aria-labelledby="cash-flow-title">
      <div>
        <p className="eyebrow">Cash flow · this week</p>
        <h2 id="cash-flow-title"><Amount sign="auto" value={net} /></h2>
        <p>Inflow <Amount value={inflow} /> <span aria-hidden="true">·</span> Outflow <Amount value={outflow} /></p>
      </div>
      <div className="cash-flow-line__visual" role="img" aria-label={`Inflow ${inflow / 100} ATC and outflow ${outflow / 100} ATC`}>
        <TrendUp aria-hidden="true" weight="regular" />
        <meter max={maximum} min={0} value={inflow}>Inflow</meter>
        <meter max={maximum} min={0} value={outflow}>Outflow</meter>
      </div>
    </section>
  );
}
