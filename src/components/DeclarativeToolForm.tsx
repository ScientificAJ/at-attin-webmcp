import {
  useEffect,
  useRef,
  useState,
  type FormEvent,
} from 'react';
import type { ToolBridge } from '../webmcp/bridge';
import type { DeclarativeToolName } from '../webmcp/contracts';

interface DeclarativeOption {
  value: string;
  label: string;
}

export interface DeclarativeField {
  name: string;
  label: string;
  description: string;
  type: 'text' | 'date' | 'number' | 'select';
  options?: readonly DeclarativeOption[];
  required?: boolean;
  maxLength?: number;
  minimum?: number;
  maximum?: number;
  defaultValue?: string | number;
}

export interface DeclarativeToolFormProps {
  bridge: ToolBridge;
  toolName: DeclarativeToolName;
  title: string;
  description: string;
  fields: readonly DeclarativeField[];
  unlocked: boolean;
  submitLabel?: string;
  onManualSubmit(
    args: Record<string, unknown>,
  ): string | Promise<string>;
}

function formArguments(
  form: HTMLFormElement,
  fields: readonly DeclarativeField[],
): Record<string, unknown> {
  const values = new FormData(form);
  return Object.fromEntries(fields.flatMap((field) => {
    const value = values.get(field.name);
    if (typeof value !== 'string' || value === '') return [];
    return [[field.name, field.type === 'number' ? Number(value) : value]];
  }));
}

export function DeclarativeToolForm({
  bridge,
  toolName,
  title,
  description,
  fields,
  unlocked,
  submitLabel = 'Apply filter',
  onManualSubmit,
}: DeclarativeToolFormProps) {
  const formRef = useRef<HTMLFormElement>(null);
  const [announcement, setAnnouncement] = useState('');
  const descriptionId = `${toolName}-description`;
  const annotations = unlocked
    ? { toolname: toolName, tooldescription: description }
    : {};

  useEffect(() => {
    const form = formRef.current;
    if (!form) return undefined;
    const activated = () => setAnnouncement('Agent tool activated. Confirm in At Attin.');
    const cancelled = () => {
      bridge.cancel('tool-cancel');
      setAnnouncement('Agent tool cancelled.');
    };
    form.addEventListener('toolactivated', activated);
    form.addEventListener('toolcancel', cancelled);
    return () => {
      form.removeEventListener('toolactivated', activated);
      form.removeEventListener('toolcancel', cancelled);
    };
  }, [bridge]);

  const submit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const args = formArguments(event.currentTarget, fields);
    const nativeSubmit = event.nativeEvent as SubmitEvent;

    if (nativeSubmit.agentInvoked === true) {
      const response = unlocked
        ? bridge.run(
          toolName,
          args,
          nativeSubmit.signal ?? new AbortController().signal,
        )
        : Promise.reject(new Error('agent-access-locked'));
      nativeSubmit.respondWith?.(response);
      setAnnouncement(unlocked
        ? 'Agent tool activated. Confirm in At Attin.'
        : 'Agent tool cancelled. Agent access is locked.');
      void response.then(
        () => setAnnouncement('Agent tool completed.'),
        () => setAnnouncement('Agent tool cancelled.'),
      );
      return;
    }

    void Promise.resolve(onManualSubmit(args)).then(
      (result) => setAnnouncement(result),
      () => setAnnouncement('The manual request could not be completed.'),
    );
  };

  return (
    <form
      {...annotations}
      aria-describedby={descriptionId}
      aria-label={title}
      className="declarative-tool-form"
      onSubmit={submit}
      ref={formRef}
    >
      <div className="declarative-tool-form__heading">
        <h2>{title}</h2>
        <span>{unlocked ? 'Agent-ready' : 'Manual only'}</span>
      </div>
      <p id={descriptionId}>{description}</p>
      <div className="declarative-tool-form__fields">
        {fields.map((field) => {
          const fieldId = `${toolName}-${field.name}`;
          const fieldDescriptionId = `${fieldId}-description`;
          const parameterAnnotation = unlocked
            ? { toolparamdescription: field.description }
            : {};
          return (
            <div className="declarative-tool-form__field" key={field.name}>
              <label htmlFor={fieldId}>{field.label}</label>
              {field.type === 'select' ? (
                <select
                  {...parameterAnnotation}
                  aria-describedby={fieldDescriptionId}
                  defaultValue={String(field.defaultValue ?? '')}
                  id={fieldId}
                  name={field.name}
                  required={field.required}
                >
                  {(field.options ?? []).map((option) => (
                    <option key={option.value} value={option.value}>{option.label}</option>
                  ))}
                </select>
              ) : (
                <input
                  {...parameterAnnotation}
                  aria-describedby={fieldDescriptionId}
                  defaultValue={field.defaultValue}
                  id={fieldId}
                  max={field.maximum}
                  maxLength={field.maxLength}
                  min={field.minimum}
                  name={field.name}
                  required={field.required}
                  type={field.type}
                />
              )}
              <span id={fieldDescriptionId}>{field.description}</span>
            </div>
          );
        })}
      </div>
      <button className="declarative-tool-form__submit" type="submit">{submitLabel}</button>
      <p aria-live="polite" className="declarative-tool-form__status" role="status">
        {announcement}
      </p>
    </form>
  );
}
