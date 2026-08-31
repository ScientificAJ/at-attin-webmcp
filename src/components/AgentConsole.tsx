import {
  ArrowUp,
  LockSimple,
  Sparkle,
  X,
} from '@phosphor-icons/react';
import {
  useEffect,
  useRef,
  useState,
  type FormEvent,
} from 'react';
import { Link } from 'react-router-dom';
import type {
  AgentStage,
  EmbeddedAgentRuntime,
} from '../agent/runtime';

interface AgentConsoleProps {
  runtime: EmbeddedAgentRuntime;
  unlocked: boolean;
}

interface TranscriptMessage {
  id: number;
  role: 'user' | 'agent';
  text: string;
}

const SUGGESTIONS = [
  'Show my account overview',
  'Pay 420 ATC to Mara from Daily Account',
  'Check my cards for anything that needs attention',
] as const;

function readableToolName(toolName?: string): string {
  return toolName ? toolName.replaceAll('_', ' ') : 'banking task';
}

function messageForError(error: unknown): string {
  const message = error instanceof Error ? error.message : '';
  if (message.includes('confirmation-')) {
    return 'Nothing was shared or changed because the confirmation was cancelled.';
  }
  if (message.includes('agent-unavailable') || message.includes('http-404')) {
    return 'The Featherless agent is available on the deployed At Attin site.';
  }
  if (message.includes('AbortError') || message.includes('aborted')) {
    return 'The request was cancelled.';
  }
  return 'The agent could not complete that request. No unconfirmed banking action was taken.';
}

export function AgentConsole({ runtime, unlocked }: AgentConsoleProps) {
  const [open, setOpen] = useState(false);
  const [input, setInput] = useState('');
  const [messages, setMessages] = useState<TranscriptMessage[]>([]);
  const [busy, setBusy] = useState(false);
  const [stage, setStage] = useState<AgentStage | null>(null);
  const [activeTool, setActiveTool] = useState<string>();
  const [status, setStatus] = useState('');
  const sequence = useRef(0);
  const activeController = useRef<AbortController | null>(null);
  const transcriptRef = useRef<HTMLDivElement>(null);

  useEffect(() => () => activeController.current?.abort(), []);
  useEffect(() => {
    if (!unlocked) activeController.current?.abort();
  }, [unlocked]);
  useEffect(() => {
    const transcript = transcriptRef.current;
    if (transcript) transcript.scrollTop = transcript.scrollHeight;
  }, [messages, stage]);

  const send = async (rawText: string) => {
    const text = rawText.trim();
    if (!text || busy || !unlocked) return;
    const userMessage: TranscriptMessage = {
      id: ++sequence.current,
      role: 'user',
      text,
    };
    setMessages((current) => [...current, userMessage]);
    setInput('');
    setStatus('');
    setBusy(true);
    const controller = new AbortController();
    activeController.current = controller;
    try {
      const result = await runtime.runTurn(text, controller.signal, (nextStage, toolName) => {
        setStage(nextStage);
        setActiveTool(toolName);
      });
      setMessages((current) => [...current, {
        id: ++sequence.current,
        role: 'agent',
        text: result.reply,
      }]);
      setStatus(result.usedTools > 0
        ? `${result.usedTools} confirmed WebMCP ${result.usedTools === 1 ? 'action' : 'actions'} completed.`
        : 'Featherless replied without accessing banking data.');
    } catch (error) {
      setMessages((current) => [...current, {
        id: ++sequence.current,
        role: 'agent',
        text: messageForError(error),
      }]);
    } finally {
      if (activeController.current === controller) activeController.current = null;
      setBusy(false);
      setStage(null);
      setActiveTool(undefined);
    }
  };

  const submit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    void send(input);
  };

  const stageText = stage === 'confirmation'
    ? `Waiting for your confirmation: ${readableToolName(activeTool)}`
    : stage === 'finishing'
      ? 'Featherless is reviewing the confirmed result…'
      : 'Featherless is choosing the right WebMCP tool…';

  return (
    <aside className={`agent-console${open ? ' is-open' : ''}`} aria-label="At Attin agent">
      {!open ? (
        <button
          aria-label="Open At Attin agent"
          className="agent-console__launcher"
          onClick={() => setOpen(true)}
          type="button"
        >
          <Sparkle aria-hidden="true" weight="fill" />
          <span>
            <strong>Ask At Attin</strong>
            <small>Featherless · WebMCP</small>
          </span>
        </button>
      ) : (
        <section className="agent-console__panel" aria-labelledby="agent-console-title">
          <header className="agent-console__header">
            <div>
              <p className="eyebrow">At Attin agent</p>
              <h2 id="agent-console-title">Ask At Attin</h2>
              <p>Powered by Featherless · Kimi K3</p>
            </div>
            <button
              aria-label="Close At Attin agent"
              className="agent-console__close"
              onClick={() => setOpen(false)}
              type="button"
            >
              <X aria-hidden="true" />
            </button>
          </header>

          <div className="agent-console__safety">
            <span>Fictional ATC only</span>
            <p>Every read and change pauses for your confirmation.</p>
          </div>

          <div className="agent-console__transcript" ref={transcriptRef} aria-live="polite">
            {messages.length === 0 ? (
              <div className="agent-console__welcome">
                <Sparkle aria-hidden="true" weight="regular" />
                <p>Tell me what you need. Featherless provides the reasoning; At Attin’s WebMCP tools perform the banking.</p>
                {unlocked ? (
                  <div className="agent-console__suggestions">
                    {SUGGESTIONS.map((suggestion) => (
                      <button key={suggestion} onClick={() => void send(suggestion)} type="button">
                        {suggestion}
                      </button>
                    ))}
                  </div>
                ) : null}
              </div>
            ) : (
              messages.map((message) => (
                <p className={`agent-console__message agent-console__message--${message.role}`} key={message.id}>
                  <span>{message.role === 'agent' ? 'At Attin' : 'You'}</span>
                  {message.text}
                </p>
              ))
            )}
            {busy ? <p className="agent-console__progress">{stageText}</p> : null}
          </div>

          {!unlocked ? (
            <div className="agent-console__locked">
              <LockSimple aria-hidden="true" />
              <p>A person must unlock Agent Access before the model can request any tool.</p>
              <Link to="/settings/agent">Unlock Agent Access</Link>
            </div>
          ) : null}

          <form className="agent-console__composer" onSubmit={submit}>
            <label className="sr-only" htmlFor="agent-banking-request">Banking request</label>
            <textarea
              disabled={!unlocked || busy}
              id="agent-banking-request"
              maxLength={1_500}
              onChange={(event) => setInput(event.currentTarget.value)}
              placeholder={unlocked ? 'What would you like done?' : 'Unlock Agent Access first'}
              rows={2}
              value={input}
            />
            <button
              aria-label="Send to At Attin"
              disabled={!unlocked || busy || !input.trim()}
              type="submit"
            >
              <ArrowUp aria-hidden="true" weight="bold" />
            </button>
          </form>
          {status ? <p className="agent-console__status" role="status">{status}</p> : null}
        </section>
      )}
    </aside>
  );
}
