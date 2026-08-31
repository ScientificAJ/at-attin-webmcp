interface OperationDetailsProps {
  disclosure: readonly string[];
  consequences: readonly string[];
  compact?: boolean;
}

export function OperationDetails({
  disclosure,
  consequences,
  compact = false,
}: OperationDetailsProps) {
  return (
    <div className={`operation-details${compact ? ' operation-details--compact' : ''}`}>
      {disclosure.length > 0 ? (
        <section aria-labelledby="operation-disclosure-title">
          <h3 id="operation-disclosure-title">Information to disclose</h3>
          <ul>{disclosure.map((item) => <li key={item}>{item}</li>)}</ul>
        </section>
      ) : null}
      {consequences.length > 0 ? (
        <section aria-labelledby="operation-consequences-title">
          <h3 id="operation-consequences-title">What will happen</h3>
          <ul>{consequences.map((item) => <li key={item}>{item}</li>)}</ul>
        </section>
      ) : null}
    </div>
  );
}
