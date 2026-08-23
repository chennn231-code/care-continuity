import { Link, Navigate, useLocation } from 'react-router-dom';
import { useAuth } from '../auth/AuthProvider';
import { getAuthErrorMessage } from '../auth/authErrorMessages';

export function ConfirmEmailPage() {
  const { session, loading } = useAuth();
  const location = useLocation();
  const email = (location.state as { email?: string } | null)?.email;
  const searchParams = new URLSearchParams(location.search);
  const hashParams = new URLSearchParams(location.hash.replace(/^#/, ''));
  const callbackError = searchParams.get('error_description') ?? hashParams.get('error_description');
  const callbackErrorCode = searchParams.get('error_code') ?? hashParams.get('error_code');

  if (!loading && session) return <Navigate to="/app" replace />;

  return (
    <main className="centered-page">
      <section className="status-card" aria-labelledby="confirmation-title">
        <div className="status-icon" aria-hidden="true">✉</div>
        <p className="eyebrow">帳號確認</p>
        <h1 id="confirmation-title">
          {callbackError ? '確認連結無法使用' : '請查看你的 Email'}
        </h1>
        {callbackError ? (
          <p className="form-message error" role="alert">{getAuthErrorMessage(callbackError, callbackErrorCode)}</p>
        ) : (
          <p>
            我們已將確認連結寄到{email ? <strong> {email}</strong> : '你的信箱'}
            完成確認後即可登入
          </p>
        )}
        <Link className="secondary-button" to="/auth">返回登入</Link>
      </section>
    </main>
  );
}
