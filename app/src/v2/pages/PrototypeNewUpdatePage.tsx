import { useState, type FormEvent } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { DEMO_ROLE_LABELS } from '../data/mockData';
import { usePrototype } from '../state/PrototypeProvider';
import type { NewUpdateInput, SharingScope } from '../types/prototype';
import { allowedUpdateAssignees, allowedUpdateScopes, updateGrantPaths } from '../state/caseCollaborationSelectors';

const today = '2026-08-25';

export function PrototypeNewUpdatePage() {
  const { state, addUpdate } = usePrototype();
  const { caseId = '' } = useParams();
  const workspaceCase = state.workspaceCases.find((item) => item.id === caseId);
  const navigate = useNavigate();
  const updatePaths = updateGrantPaths(state, caseId);
  const activePath = updatePaths.length === 1 ? updatePaths[0] : undefined;
  const scopeOptions = allowedUpdateScopes(state, caseId);
  const assigneeOptions = allowedUpdateAssignees(state, caseId);
  const [form, setForm] = useState<NewUpdateInput>({
    caseId, kind: 'OBSERVATION', occurredDate: today, occurredTime: '09:00', content: '', source: '',
    actor: activePath
      ? { identityId: activePath.identity.id, membershipId: activePath.membership.id }
      : { identityId: '', membershipId: '' },
    actorDisplayRole: activePath?.grant.actingRole ?? state.activeRole,
    purpose: activePath?.grant.purpose ?? '',
    sharingScope: activePath?.grant.sharingScopes[0] ?? 'SHARED_CARE',
    needsAction: false,
    assignee: undefined,
    assigneeDisplayRole: undefined,
    dueAt: '2026-08-27T17:00'
  });
  const [error, setError] = useState<string | null>(null);
  const update = <K extends keyof NewUpdateInput>(key: K, value: NewUpdateInput[K]) => setForm((current) => ({ ...current, [key]: value }));
  const submit = (event: FormEvent) => {
    event.preventDefault();
    if (!form.content.trim() || !form.source.trim()) { setError('請填寫內容與來源'); return; }
    if (form.needsAction && (!form.assignee || !form.dueAt)) { setError('請選擇虛構負責人與期限'); return; }
    if (!activePath || !scopeOptions.includes(form.sharingScope) || (form.needsAction && !assigneeOptions.some(({ participant }) => participant.identityId === form.assignee?.identityId && participant.membershipId === form.assignee?.membershipId))) { setError('目前授權路徑不允許這組身分、目的、分享範圍或負責人'); return; }
    addUpdate(form);
    navigate(`/v2/prototype/cases/${caseId}/timeline`);
  };
  return (
    <section className="v2-page v2-form-page">
      <header className="v2-page-heading"><p className="eyebrow">{workspaceCase?.displayName ?? '虛構展示個案'}｜虛構展示個案</p><h1>新增照顧變化</h1><p>記錄有來源的觀察、安排或問題，不把觀察寫成醫療診斷</p></header>
      <form className="v2-card form-stack" onSubmit={submit}>
        {error && <p className="form-message error" role="alert">{error}</p>}
        <label>類型<select value={form.kind} onChange={(event) => update('kind', event.target.value as NewUpdateInput['kind'])}><option value="OBSERVATION">觀察</option><option value="ARRANGEMENT">照顧安排</option><option value="QUESTION">問題</option></select></label>
        <div className="v2-form-row"><label>發生日期<input type="date" value={form.occurredDate} onChange={(event) => update('occurredDate', event.target.value)} required /></label><label>發生時間<input type="time" value={form.occurredTime} onChange={(event) => update('occurredTime', event.target.value)} required /></label></div>
        <label>內容<textarea rows={5} value={form.content} onChange={(event) => update('content', event.target.value)} placeholder="例如：今天沐浴時注意到左手臂有一小片泛紅，長輩表示沒有疼痛" required /></label>
        <label>來源<input value={form.source} onChange={(event) => update('source', event.target.value)} placeholder="例如：家屬電話回報、日照服務觀察" required /></label>
        <div className="v2-form-row"><label>本次使用身分<input value={activePath ? DEMO_ROLE_LABELS[activePath.grant.actingRole] : '目前沒有可用身分'} readOnly /></label><label>使用目的<input value={activePath?.grant.purpose ?? '目前沒有可用目的'} readOnly /></label></div>
        <label>分享範圍<select value={form.sharingScope} onChange={(event) => update('sharingScope', event.target.value as SharingScope)}>{scopeOptions.map((scope) => <option value={scope} key={scope}>{scope === 'AUTHOR_ONLY' ? '僅作者' : scope === 'SHARED_CARE' ? '共同照顧' : scope === 'FAMILY_ONLY' ? '僅家庭' : '直接參與者'}</option>)}</select></label>
        <p className="v2-scope-note">這是 UI 模擬，不代表正式 RLS 或權限驗證；操作以唯一的具體身分與成員關係路徑投影。</p>
        <label className="v2-check"><input type="checkbox" checked={form.needsAction} onChange={(event) => update('needsAction', event.target.checked)} /><span>這筆變化需要建立後續處理事項</span></label>
        {form.needsAction && <div className="v2-followup-fields"><label>指定虛構負責人<select value={form.assignee ? `${form.assignee.identityId}|${form.assignee.membershipId}` : ''} onChange={(event) => { const matches = assigneeOptions.filter(({ participant }) => `${participant.identityId}|${participant.membershipId}` === event.target.value); if (matches.length > 1) throw new Error('MULTIPLE_EXACT_ASSIGNEE_OPTIONS'); const option = matches[0]; update('assignee', option?.participant); update('assigneeDisplayRole', option?.displayRole); }}><option value="">請選擇具名負責人</option>{assigneeOptions.map((option) => <option value={`${option.participant.identityId}|${option.participant.membershipId}`} key={`${option.participant.identityId}|${option.participant.membershipId}`}>{option.displayName}（{DEMO_ROLE_LABELS[option.displayRole]}）</option>)}</select></label><label>期限<input type="datetime-local" value={form.dueAt} onChange={(event) => update('dueAt', event.target.value)} /></label><p>建立後會先顯示「等待接受」，不會假設對方已同意處理</p></div>}
        <div className="v2-form-actions"><button className="primary-button" type="submit">加入虛構時間軸</button><button className="secondary-button" type="button" onClick={() => navigate(-1)}>取消</button></div>
      </form>
    </section>
  );
}
