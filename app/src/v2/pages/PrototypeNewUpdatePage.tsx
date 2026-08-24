import { useState, type FormEvent } from 'react';
import { useNavigate } from 'react-router-dom';
import { DEMO_ROLE_LABELS } from '../data/mockData';
import { usePrototype } from '../state/PrototypeProvider';
import type { DemoRole, NewUpdateInput, SharingScope } from '../types/prototype';

const today = '2026-08-25';

export function PrototypeNewUpdatePage() {
  const { state, addUpdate } = usePrototype();
  const navigate = useNavigate();
  const [form, setForm] = useState<NewUpdateInput>({
    kind: 'OBSERVATION', occurredDate: today, occurredTime: '09:00', content: '', source: '',
    actingRole: state.activeRole, purpose: '共同照顧交接', sharingScope: 'SHARED_CARE', needsAction: false,
    assigneeRole: 'NURSE', dueAt: '2026-08-27T17:00'
  });
  const [error, setError] = useState<string | null>(null);
  const update = <K extends keyof NewUpdateInput>(key: K, value: NewUpdateInput[K]) => setForm((current) => ({ ...current, [key]: value }));
  const submit = (event: FormEvent) => {
    event.preventDefault();
    if (!form.content.trim() || !form.source.trim()) { setError('請填寫內容與來源'); return; }
    if (form.needsAction && (!form.assigneeRole || !form.dueAt)) { setError('請選擇虛構負責人與期限'); return; }
    addUpdate(form);
    navigate('/v2/prototype/cases/demo-case/timeline');
  };
  return (
    <section className="v2-page v2-form-page">
      <header className="v2-page-heading"><p className="eyebrow">林奶奶｜虛構展示個案</p><h1>新增照顧變化</h1><p>記錄有來源的觀察、安排或問題，不把觀察寫成醫療診斷</p></header>
      <form className="v2-card form-stack" onSubmit={submit}>
        {error && <p className="form-message error" role="alert">{error}</p>}
        <label>類型<select value={form.kind} onChange={(event) => update('kind', event.target.value as NewUpdateInput['kind'])}><option value="OBSERVATION">觀察</option><option value="ARRANGEMENT">照顧安排</option><option value="QUESTION">問題</option></select></label>
        <div className="v2-form-row"><label>發生日期<input type="date" value={form.occurredDate} onChange={(event) => update('occurredDate', event.target.value)} required /></label><label>發生時間<input type="time" value={form.occurredTime} onChange={(event) => update('occurredTime', event.target.value)} required /></label></div>
        <label>內容<textarea rows={5} value={form.content} onChange={(event) => update('content', event.target.value)} placeholder="例如：今天沐浴時注意到左手臂有一小片泛紅，長輩表示沒有疼痛" required /></label>
        <label>來源<input value={form.source} onChange={(event) => update('source', event.target.value)} placeholder="例如：家屬電話回報、日照服務觀察" required /></label>
        <div className="v2-form-row"><label>本次使用身分<select value={form.actingRole} onChange={(event) => update('actingRole', event.target.value as DemoRole)}>{(Object.keys(DEMO_ROLE_LABELS) as DemoRole[]).map((role) => <option value={role} key={role}>{DEMO_ROLE_LABELS[role]}</option>)}</select></label><label>使用目的<input value={form.purpose} onChange={(event) => update('purpose', event.target.value)} required /></label></div>
        <label>分享範圍<select value={form.sharingScope} onChange={(event) => update('sharingScope', event.target.value as SharingScope)}><option value="AUTHOR_ONLY">僅作者</option><option value="SHARED_CARE">共同照顧</option><option value="FAMILY_ONLY">僅家庭</option><option value="DIRECT_PARTICIPANTS">直接參與者</option></select></label>
        <p className="v2-scope-note">這是 UI 模擬，不代表正式 RLS 或權限驗證，每次只使用一個 acting role</p>
        <label className="v2-check"><input type="checkbox" checked={form.needsAction} onChange={(event) => update('needsAction', event.target.checked)} /><span>這筆變化需要建立後續處理事項</span></label>
        {form.needsAction && <div className="v2-followup-fields"><label>指定虛構負責人<select value={form.assigneeRole} onChange={(event) => update('assigneeRole', event.target.value as DemoRole)}>{(Object.keys(DEMO_ROLE_LABELS) as DemoRole[]).map((role) => <option value={role} key={role}>{DEMO_ROLE_LABELS[role]}</option>)}</select></label><label>期限<input type="datetime-local" value={form.dueAt} onChange={(event) => update('dueAt', event.target.value)} /></label><p>建立後會先顯示「等待接受」，不會假設對方已同意處理</p></div>}
        <div className="v2-form-actions"><button className="primary-button" type="submit">加入虛構時間軸</button><button className="secondary-button" type="button" onClick={() => navigate(-1)}>取消</button></div>
      </form>
    </section>
  );
}
