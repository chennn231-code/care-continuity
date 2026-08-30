import { Link, useParams } from 'react-router-dom';
import { ProfessionalRecordForm } from '../components/ProfessionalRecordForm';
import { usePrototype } from '../state/PrototypeProvider';
import { canCreateProfessionalRecord, createCorrectionDraft, professionalRecordAccess, professionalRecordVersion } from '../state/professionalRecordState';

export function PrototypeProfessionalRecordCorrectionPage() {
  const { caseId = 'demo-case', recordId = '' } = useParams();
  const { state, publishRecord } = usePrototype();
  const record = professionalRecordVersion(state, recordId);
  const caseDisplayName = state.workspaceCases.find((item) => item.id === caseId)?.displayName ?? '虛構個案';
  if (!record || record.caseId !== caseId || !professionalRecordAccess(state, recordId)?.canViewFull || !canCreateProfessionalRecord(state, caseId)) return <section className="v2-page v2-access-denied-page"><h1>目前無法更正此紀錄</h1><Link to={`/v2/prototype/cases/${caseId}/records`}>返回專業紀錄</Link></section>;
  return <ProfessionalRecordForm initialDraft={createCorrectionDraft(record)} heading="追加更正" description={`正在更正版本 ${record.versionNumber}。發布後會建立新版本；原始內容、作者、發生時間與紀錄時間不會被覆寫。`} submitLabel="發布更正版本" caseDisplayName={caseDisplayName} onPublish={publishRecord} />;
}
