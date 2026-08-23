import { useEffect, useState, type FormEvent } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import {
  createCareReceiver,
  getCareReceiverErrorMessage,
  listOwnedCareReceivers,
  updateCareReceiver,
  type CareReceiver
} from '../lib/careReceivers';

export function ReceiverSetupPage() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const editing = searchParams.get('edit') === '1';
  const [receiver, setReceiver] = useState<CareReceiver | null>(null);
  const [displayName, setDisplayName] = useState('');
  const [checking, setChecking] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let active = true;

    void listOwnedCareReceivers()
      .then((receivers) => {
        if (!active) return;
        if (receivers.length > 0 && !editing) {
          navigate('/app', { replace: true });
          return;
        }
        if (editing && receivers[0]) {
          setReceiver(receivers[0]);
          setDisplayName(receivers[0].display_name);
        } else if (editing) {
          navigate('/setup/receiver', { replace: true });
          return;
        }
        setChecking(false);
      })
      .catch((loadError) => {
        console.error('Unable to load care receivers', loadError);
        if (!active) return;
        setError(getCareReceiverErrorMessage('load'));
        setChecking(false);
      });

    return () => {
      active = false;
    };
  }, [editing, navigate]);

  const submit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (submitting) return;

    const normalizedDisplayName = displayName.trim();
    setError(null);
    if (!normalizedDisplayName) {
      setError('請輸入被照顧者稱呼，不能只輸入空白。');
      return;
    }

    setSubmitting(true);
    try {
      if (editing && receiver) await updateCareReceiver(receiver.care_receiver_id, normalizedDisplayName);
      else await createCareReceiver(normalizedDisplayName);
      navigate('/app', { replace: true });
    } catch (createError) {
      console.error('Unable to create care receiver', createError);
      setError(getCareReceiverErrorMessage(editing ? 'update' : 'create'));
      setSubmitting(false);
    }
  };

  if (checking) {
    return (
      <main className="centered-page" aria-live="polite">
        <section className="status-card compact-card">正在確認照顧個案…</section>
      </main>
    );
  }

  return (
    <main className="setup-layout">
      <section className="setup-card" aria-labelledby="receiver-setup-title">
        <div className="brand-mark small left-aligned" aria-hidden="true">心</div>
        <p className="eyebrow">{editing ? '修改照顧個案' : '建立照顧空間'}</p>
        <h1 id="receiver-setup-title">{editing ? '修改被照顧者稱呼' : <>先告訴我們，<br />你目前主要在照顧誰？</>}</h1>
        <p className="setup-copy">
          先用你熟悉的稱呼就好。之後整理照顧任務時，會以這個名字呈現。
        </p>

        <form onSubmit={submit} className="form-stack receiver-form">
          <label>
            被照顧者稱呼
            <input
              value={displayName}
              onChange={(event) => setDisplayName(event.target.value)}
              autoComplete="off"
              maxLength={100}
              required
              disabled={submitting}
              placeholder="例如：王奶奶"
            />
          </label>

          <p className="field-hint">這一階段不需要填寫疾病、地址或其他敏感資料。</p>
          {error && <p className="form-message error" role="alert">{error}</p>}

          <button className="primary-button" type="submit" disabled={submitting}>
            {submitting ? '儲存中…' : editing ? '儲存稱呼' : '建立照顧個案'}
          </button>
          {editing && <button className="secondary-button" type="button" onClick={() => navigate('/app')} disabled={submitting}>取消</button>}
        </form>
      </section>
    </main>
  );
}
