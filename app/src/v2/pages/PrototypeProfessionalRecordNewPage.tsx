import { Link, useParams } from 'react-router-dom';
import { ProfessionalRecordForm } from '../components/ProfessionalRecordForm';
import { usePrototype } from '../state/PrototypeProvider';
import { canCreateProfessionalRecord, EMPTY_PROFESSIONAL_RECORD_DRAFT } from '../state/professionalRecordState';

export function PrototypeProfessionalRecordNewPage() {
  const { caseId = 'demo-case' } = useParams();
  const { state, publishRecord } = usePrototype();
  if (state.activeRole !== 'NURSE' || !canCreateProfessionalRecord(state, caseId)) return <section className="v2-page v2-access-denied-page"><header className="v2-page-heading"><p className="eyebrow">專業紀錄操作</p><h1>目前無法建立專業照顧紀錄</h1><p>請使用一條完整有效且已驗證的專業 grant path。</p></header><Link className="primary-button" to={`/v2/prototype/cases/${caseId}/records`}>返回專業紀錄</Link></section>;
  return <ProfessionalRecordForm initialDraft={{ ...structuredClone(EMPTY_PROFESSIONAL_RECORD_DRAFT), caseId }} heading="新增專業照顧紀錄" description="記錄本次服務的客觀觀察、實際處置與後續追蹤；觀察不等於診斷。" submitLabel="發布虛構紀錄" onPublish={publishRecord} />;
}
