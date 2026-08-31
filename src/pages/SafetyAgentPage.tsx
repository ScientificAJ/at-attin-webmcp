import {
  ArrowRight,
  Check,
  Clock,
  FileText,
} from '@phosphor-icons/react';
import { useAppServices, useBankState } from '../app/routes';
import { AgentAccessControl } from '../components/AgentAccessControl';
import { AuditTimeline } from '../components/AuditTimeline';
import { selectAgentAudit } from '../domain/selectors';

const SAFEGUARDS = [
  { number: '01', text: 'Every task requires confirmation', icon: Check },
  { number: '02', text: 'One action at a time', icon: ArrowRight },
  { number: '03', text: 'Permissions expire automatically', icon: Clock },
  { number: '04', text: 'Every action is recorded', icon: FileText },
] as const;

export function SafetyAgentPage() {
  const state = useBankState();
  const { toolBridge } = useAppServices();
  const events = [...selectAgentAudit(state), ...toolBridge.getAuditJournal().getEvents()]
    .sort((left, right) => right.timestamp.localeCompare(left.timestamp));

  return (
    <section className="safety-page" aria-labelledby="safety-title">
      <h2 className="sr-only">Safety &amp; Agent</h2>
      <div className="safety-page__top">
        <div>
          <header className="safety-page__intro">
            <p className="eyebrow">Settings · Safety &amp; Agent</p>
            <h1 id="safety-title">You are in control.</h1>
            <p>The agent can prepare anything. Only you can approve it.</p>
          </header>
          <ol className="safeguards">
            {SAFEGUARDS.map(({ number, text, icon: SafeguardIcon }) => (
              <li key={number}>
                <span>{number}</span>
                <SafeguardIcon aria-hidden="true" weight="regular" />
                <strong>{text}</strong>
              </li>
            ))}
          </ol>
        </div>
        <AgentAccessControl detailed />
      </div>
      <AuditTimeline events={events} limit={5} />
      <p className="safety-page__note">ATC is fictional and every record stays on this device.</p>
    </section>
  );
}
