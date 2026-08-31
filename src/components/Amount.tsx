import { formatATC } from '../domain/money';
import type { MinorATC } from '../domain/models';

interface AmountProps {
  value: MinorATC;
  sign?: 'auto' | 'credit' | 'debit' | 'none';
  className?: string;
}

export function Amount({ value, sign = 'none', className = '' }: AmountProps) {
  const prefix = sign === 'credit' ? '+' : sign === 'debit' ? '−' : sign === 'auto' && value > 0 ? '+' : '';
  return <span className={`money ${className}`.trim()}>{prefix}{formatATC(value)}</span>;
}
