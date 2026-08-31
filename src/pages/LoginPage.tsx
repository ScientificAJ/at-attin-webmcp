import {
  ArrowRight,
  ShieldCheck,
  UserCircle,
} from '@phosphor-icons/react';
import { useState, type FormEvent } from 'react';
import { Navigate, useLocation, useNavigate } from 'react-router-dom';
import {
  DEMO_PASSWORD,
  DEMO_USERNAME,
} from '../auth/session';
import {
  useAppServices,
  useSignedIn,
} from '../app/routes';

interface RedirectState {
  from?: string;
}

export function LoginPage() {
  const { session, webMcpAvailable } = useAppServices();
  const signedIn = useSignedIn();
  const navigate = useNavigate();
  const location = useLocation();
  const [message, setMessage] = useState('');

  if (signedIn) {
    return <Navigate to="/" replace />;
  }

  function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    const result = session.signIn(
      String(form.get('username') ?? ''),
      String(form.get('password') ?? ''),
    );
    if (!result.ok) {
      setMessage(result.message);
      return;
    }
    const requested = (location.state as RedirectState | null)?.from;
    navigate(requested && requested !== '/login' ? requested : '/', { replace: true });
  }

  return (
    <main className="login-page">
      <section className="login-intro" aria-labelledby="login-title">
        <p className="wordmark">At Attin</p>
        <div className="login-welcome">
          <h1 id="login-title">Welcome back</h1>
          <p className="login-lede">Banking, with you in control.</p>
          <p>Fictional funds. Real safeguards.</p>
        </div>
        <p className="login-readiness">
          <ShieldCheck aria-hidden="true" weight="regular" />
          {webMcpAvailable ? 'WebMCP ready' : 'WebMCP unavailable'}
        </p>
      </section>
      <section className="login-panel" aria-label="Prototype sign in">
        <header>
          <p className="eyebrow">Judge-ready prototype</p>
          <h2>Banking, made direct.</h2>
          <p>Sign in to At Attin</p>
        </header>
        <form onSubmit={submit}>
          <label htmlFor="username">Username</label>
          <input
            autoComplete="username"
            defaultValue={DEMO_USERNAME}
            id="username"
            name="username"
            required
          />
          <label htmlFor="password">Password</label>
          <input
            autoComplete="current-password"
            defaultValue={DEMO_PASSWORD}
            id="password"
            name="password"
            required
            type="password"
          />
          {message ? <p className="form-error" role="alert">{message}</p> : null}
          <button className="primary-action" type="submit">
            <ArrowRight aria-hidden="true" weight="regular" />
            Sign in
          </button>
        </form>
        <div className="demo-credentials">
          <UserCircle aria-hidden="true" weight="regular" />
          <div>
            <strong>Prototype-only demo credentials</strong>
            <span>{DEMO_USERNAME} / {DEMO_PASSWORD}</span>
          </div>
        </div>
        <p className="fictional-disclosure">No real money is used. ATC is fictional and has no cash value.</p>
      </section>
    </main>
  );
}
