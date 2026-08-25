import { Link, useParams } from 'react-router-dom';
import { ProfessionalRecordForm } from '../components/ProfessionalRecordForm';
import { usePrototype } from '../state/PrototypeProvider';
import { canCreateProfessionalRecord, createProfessionalRecordDraftForCurrentActor } from '../state/professionalRecordState';

export function PrototypeProfessionalRecordNewPage() {
  const { caseId = 'demo-case' } = useParams();
  const { state, publishRecord } = usePrototype();
  const caseDisplayName = state.workspaceCases.find((item) => item.id === caseId)?.displayName ?? '虛構個案';
  const draft = createProfessionalRecordDraftForCurrentActor(state, caseId);
  if (state.activeRole !== 'NURSE' || !canCreateProfessionalRecord(state, caseId) || !draft) return <section className="v2-page v2-access-denied-page"><header className="v2-page-heading"><p className="eyebrow">專業紀錄操作</p><h1>目前無法建立專業照顧紀錄</h1><p>請確認目前使用的專業身分已驗證，且仍具有效個案關係與操作權限。</p></header><Link className="primary-button" to={`/v2/prototype/cases/${caseId}/records`}>返回專業紀錄</Link></section>;
  return <ProfessionalRecordForm initialDraft={draft} heading="新增專業照顧紀錄" description="記錄本次服務的客觀觀察、實際處置與後續追蹤；觀察不等於診斷。" submitLabel="發布虛構紀錄" caseDisplayName={caseDisplayName} onPublish={publishRecord} />;
}
