import { useState, type FormEvent } from 'react';
import { Navigate, useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '../auth/AuthProvider';
import { getAuthErrorMessage } from '../auth/authErrorMessages';

type AuthMode = 'sign-in' | 'sign-up';

export function AuthPage() {
  const { session, loading, signIn, signUp } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [mode, setMode] = useState<AuthMode>('sign-in');
  const [displayName, setDisplayName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (!loading && session) return <Navigate to="/app" replace />;

  const submit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setError(null);

    if (mode === 'sign-up' && !displayName.trim()) {
      setError('請輸入顯示名稱，不能只輸入空白。');
      return;
    }

    setSubmitting(true);
    try {
      if (mode === 'sign-up') {
        const { needsConfirmation } = await signUp({ displayName, email, password });
        if (needsConfirmation) {
          navigate('/auth/confirm', { replace: true, state: { email: email.trim() } });
        } else {
          navigate('/app', { replace: true });
        }
      } else {
        await signIn(email, password);
        const requestedPath = (location.state as { from?: string } | null)?.from;
        navigate(requestedPath ?? '/app', { replace: true });
      }
    } catch (submitError) {
      setError(getAuthErrorMessage(submitError));
    } finally {
      setSubmitting(false);
    }
  };

  const changeMode = (nextMode: AuthMode) => {
    setMode(nextMode);
    setError(null);
  };

  return (
    <main className="auth-layout">
      <section className="brand-panel" aria-labelledby="brand-title">
        <div className="brand-mark" aria-hidden="true">心</div>
        <p className="eyebrow">照顧備援，從看清現在開始</p>
        <h1 id="brand-title">備份心</h1>
        <p className="brand-copy">
          在主要照顧者不能照顧之前，先整理哪些事情需要有人接手。
        </p>
      </section>

      <section className="auth-card" aria-labelledby="auth-title">
        <div className="auth-tabs" role="tablist" aria-label="帳號操作">
          <button
            type="button"
            role="tab"
            aria-selected={mode === 'sign-in'}
            className={mode === 'sign-in' ? 'active' : ''}
            onClick={() => changeMode('sign-in')}
          >
            登入
          </button>
          <button
            type="button"
            role="tab"
            aria-selected={mode === 'sign-up'}
            className={mode === 'sign-up' ? 'active' : ''}
            onClick={() => changeMode('sign-up')}
          >
            註冊
          </button>
        </div>

        <div className="auth-heading">
          <p className="eyebrow">{mode === 'sign-in' ? '歡迎回來' : '建立你的備援空間'}</p>
          <h2 id="auth-title">{mode === 'sign-in' ? '登入備份心' : '註冊備份心'}</h2>
        </div>

        <form onSubmit={submit} className="form-stack">
          {mode === 'sign-up' && (
            <label>
              顯示名稱
              <input
                value={displayName}
                onChange={(event) => setDisplayName(event.target.value)}
                autoComplete="name"
                maxLength={100}
                required
                placeholder="例如：小安"
              />
            </label>
          )}

          <label>
            Email
            <input
              type="email"
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              autoComplete="email"
              required
              placeholder="name@example.com"
            />
          </label>

          <label>
            密碼
            <input
              type="password"
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              autoComplete={mode === 'sign-up' ? 'new-password' : 'current-password'}
              minLength={6}
              required
              placeholder="至少 6 個字元"
            />
          </label>

          {error && <p className="form-message error" role="alert">{error}</p>}

          <button className="primary-button" type="submit" disabled={submitting || loading}>
            {submitting ? '處理中…' : mode === 'sign-in' ? '登入' : '建立帳號'}
          </button>
        </form>

        <p className="privacy-note">我們只使用必要資料建立你的照顧備援空間。</p>
      </section>
    </main>
  );
}
