import { useEffect, useRef, useState, type FormEvent } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../auth/AuthProvider';
import { listOwnedCareReceivers, type CareReceiver } from '../lib/careReceivers';
import {
  createCareSource,
  getCareSourceErrorMessage,
  listCareSources,
  updateCareSource,
  type CareSourceRow
} from '../lib/careSources';
import {
  hasAnotherSelfLinkedSource,
  normalizeSourceInput,
  SOURCE_TYPES,
  SOURCE_TYPE_LABELS,
  SourceValidationError,
  type SourceType
} from '../sources/sourceContract';

interface SourceFormState {
  displayName: string;
  sourceType: SourceType;
  isSelf: boolean;
}

const initialForm: SourceFormState = {
  displayName: '',
  sourceType: 'FAMILY_MEMBER',
  isSelf: false
};

export function SourceSetupPage() {
  const { session } = useAuth();
  const navigate = useNavigate();
  const [receiver, setReceiver] = useState<CareReceiver | null>(null);
  const [sources, setSources] = useState<CareSourceRow[]>([]);
  const [form, setForm] = useState<SourceFormState>(initialForm);
  const [editingSourceId, setEditingSourceId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const formCardRef = useRef<HTMLElement>(null);

  useEffect(() => {
    let active = true;

    void listOwnedCareReceivers()
      .then(async (receivers) => {
        if (!active) return;
        const ownedReceiver = receivers[0];
        if (!ownedReceiver) {
          navigate('/setup/receiver', { replace: true });
          return;
        }
        const existingSources = await listCareSources(ownedReceiver.care_receiver_id);
        if (!active) return;
        setReceiver(ownedReceiver);
        setSources(existingSources);
        setLoading(false);
      })
      .catch((loadError) => {
        console.error('Unable to load source setup', loadError);
        if (!active) return;
        setError(getCareSourceErrorMessage(loadError, 'load'));
        setLoading(false);
      });

    return () => {
      active = false;
    };
  }, [navigate]);

  const resetForm = () => {
    setForm(initialForm);
    setEditingSourceId(null);
    setError(null);
  };

  const submit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (submitting || !receiver || !session) return;
    setError(null);

    if (
      form.isSelf &&
      hasAnotherSelfLinkedSource(sources, session.user.id, editingSourceId)
    ) {
      setError('已經有一個「主要照顧者本人」來源，不能重複建立');
      return;
    }

    let input;
    try {
      input = normalizeSourceInput(form, session.user.id);
    } catch (validationError) {
      setError(
        validationError instanceof SourceValidationError
          ? validationError.message
          : '請確認照顧來源資料是否完整'
      );
      return;
    }

    setSubmitting(true);
    try {
      if (editingSourceId) {
        const updated = await updateCareSource(
          receiver.care_receiver_id,
          editingSourceId,
          input
        );
        setSources((current) => current.map(
          (source) => source.care_source_id === updated.care_source_id ? updated : source
        ));
      } else {
        const created = await createCareSource(receiver.care_receiver_id, input);
        setSources((current) => [...current, created]);
      }
      resetForm();
    } catch (saveError) {
      console.error('Unable to save care source', saveError);
      setError(getCareSourceErrorMessage(saveError, 'save'));
    } finally {
      setSubmitting(false);
    }
  };

  const editSource = (source: CareSourceRow) => {
    setEditingSourceId(source.care_source_id);
    setForm({
      displayName: source.display_name,
      sourceType: source.source_type,
      isSelf: source.user_id === session?.user.id
    });
    setError(null);
    window.requestAnimationFrame(() => formCardRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' }));
  };

  if (loading) {
    return (
      <main className="centered-page" aria-live="polite">
        <section className="status-card compact-card">正在載入照顧來源…</section>
      </main>
    );
  }

  return (
    <main className="task-setup-layout source-setup-layout">
      <header className="task-page-header">
        <div>
          <p className="eyebrow">{receiver?.display_name}的照顧安排</p>
          <h1>目前有哪些人或服務參與照顧？</h1>
          <p>
            先整理可能參與照顧的人或服務出現在這裡不代表對方已同意、有時間，或已能接手任何工作
          </p>
        </div>
        <button className="secondary-button" type="button" onClick={() => navigate('/app')}>
          返回照顧空間
        </button>
      </header>

      <div className={`task-setup-grid${editingSourceId ? ' is-editing' : ''}`}>
        <section className="task-form-card" aria-labelledby="source-form-title" ref={formCardRef}>
          <p className="eyebrow">{editingSourceId ? '修改照顧來源' : '新增照顧來源'}</p>
          <h2 id="source-form-title">
            {editingSourceId ? '調整來源資料' : '加入一位可能參與的人或服務'}
          </h2>

          <form onSubmit={submit} className="form-stack task-form">
            <label>
              來源名稱
              <input
                value={form.displayName}
                onChange={(event) => {
                  setForm((current) => ({ ...current, displayName: event.target.value }));
                  setError(null);
                }}
                maxLength={100}
                required
                disabled={submitting}
                placeholder="例如：大哥、安心居家服務"
              />
            </label>

            <label>
              來源類型
              <select
                value={form.sourceType}
                onChange={(event) => {
                  setForm((current) => ({
                    ...current,
                    sourceType: event.target.value as SourceType
                  }));
                  setError(null);
                }}
                disabled={submitting}
              >
                {SOURCE_TYPES.map((sourceType) => (
                  <option key={sourceType} value={sourceType}>{SOURCE_TYPE_LABELS[sourceType]}</option>
                ))}
              </select>
            </label>

            {form.sourceType === 'PROFESSIONAL' && (
              <p className="source-boundary-note">
                這裡只記錄服務來源服務日期、時段與實際工作內容將在後續照顧安排中確認
              </p>
            )}

            <label className="self-source-choice">
              <input
                type="checkbox"
                checked={form.isSelf}
                onChange={(event) => {
                  setForm((current) => ({ ...current, isSelf: event.target.checked }));
                  setError(null);
                }}
                disabled={submitting}
              />
              <span>
                <strong>這是我本人</strong>
                <small>將此來源連結為目前登入的主要操作照顧者</small>
              </span>
            </label>

            {error && <p className="form-message error" role="alert">{error}</p>}

            <div className="form-actions">
              <button className="primary-button" type="submit" disabled={submitting || !receiver}>
                {submitting ? '儲存中…' : editingSourceId ? '儲存修改' : '加入照顧來源'}
              </button>
              {editingSourceId && (
                <button className="secondary-button" type="button" onClick={resetForm} disabled={submitting}>
                  取消修改
                </button>
              )}
            </div>
          </form>
        </section>

        <section className="task-list-card" aria-labelledby="source-list-title">
          <p className="eyebrow">目前照顧來源</p>
          <h2 id="source-list-title">已整理 {sources.length} 個來源</h2>

          {sources.length === 0 ? (
            <div className="empty-task-state">
              <strong>還沒有照顧來源</strong>
              <p>先加入目前主要參與照顧的人或服務</p>
            </div>
          ) : (
            <div className="task-list">
              {sources.map((source) => (
                <article className="task-item source-item" key={source.care_source_id}>
                  <div>
                    <span className="task-category">{SOURCE_TYPE_LABELS[source.source_type]}</span>
                    <h3>{source.display_name}</h3>
                    {source.user_id === session?.user.id && (
                      <span className="self-source-badge">主要照顧者本人</span>
                    )}
                  </div>
                  <button className="text-button" type="button" onClick={() => editSource(source)}>
                    編輯
                  </button>
                </article>
              ))}
            </div>
          )}

          <p className="source-disclaimer">
            名單只表示可能參與照顧，不代表已同意接手或已形成備援
          </p>
          <button
            className="primary-button complete-task-button"
            type="button"
            disabled={sources.length === 0}
            onClick={() => navigate('/app')}
          >
            完成這一步
          </button>
        </section>
      </div>
    </main>
  );
}
