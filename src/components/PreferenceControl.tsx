interface PreferenceControlProps {
  label: string;
  description: string;
  enabled: boolean;
  onChange(next: boolean): void;
}

export function PreferenceControl({ label, description, enabled, onChange }: PreferenceControlProps) {
  return (
    <label className="preference-control">
      <span><strong>{label}</strong><small>{description}</small></span>
      <input checked={enabled} onChange={(event) => onChange(event.currentTarget.checked)} type="checkbox" />
      <span aria-hidden="true" className="preference-control__switch" />
    </label>
  );
}
