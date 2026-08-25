import { Link, useParams } from 'react-router-dom';
import { usePrototype } from '../state/PrototypeProvider';
import { canCreateProfessionalRecord, currentActorProfessionalRecordProjection, professionalRecordAccess, PROFESSIONAL_RECORD_DEMO_LABEL, visibleProfessionalRecordVersions } from '../state/professionalRecordState';

export function PrototypeProfessionalRecordsPage() {
  const { caseId = 'demo-case' } = useParams();
  const { state, setRole } = usePrototype();
  const workspaceCase = state.workspaceCases.find((item) => item.id === caseId);
  const records = visibleProfessionalRecordVersions(state, caseId);
  const familyRecords = records.flatMap((record) => {
    const projection = currentActorProfessionalRecordProjection(state, record.recordId);
    return projection ? [projection] : [];
  });
  const canCreate = state.activeRole === 'NURSE' && canCreateProfessionalRecord(state, caseId);
  return (
    <section className="v2-page">
      <header className="v2-page-heading v2-heading-actions"><div><p className="eyebrow">{workspaceCase?.displayName}｜{PROFESSIONAL_RECORD_DEMO_LABEL}</p><h1>專業照顧紀錄</h1><p>本頁以日照護理師的虛構流程證明共同紀錄骨架，不代表所有專業職類已有正式模板，也不是正式病歷、護理紀錄或法定機構紀錄。</p></div>{canCreate && <Link className="primary-button" to={`/v2/prototype/cases/${caseId}/records/new`}>新增專業照顧紀錄</Link>}</header>
      {!canCreate && <section className="v2-card v2-record-acting-context"><h2>目前不是專業紀錄操作情境</h2><p>建立紀錄必須使用已驗證且具有效個案關係的日照護理師身分，不能與家庭權限合併使用。</p><button className="secondary-button" type="button" onClick={() => setRole('NURSE')}>切換至虛構日照護理師情境</button></section>}
      <div className="v2-record-list">{records.map((record) => {
        const access = professionalRecordAccess(state, record.recordId);
        const projection = familyRecords.find((item) => item.recordId === record.recordId);
        if (access?.canViewFull) return <article className="v2-card" key={record.recordId}><div className="v2-section-title"><div><span className="v2-fake-label">已發布・版本 {record.versionNumber}</span><h2>{record.content.serviceDate} 專業照顧紀錄</h2></div>{record.versionNumber > 1 && <strong>曾經更正</strong>}</div><p>{record.content.objectiveObservation}</p><dl className="v2-meta-grid"><div><dt>作者</dt><dd>{record.authorName}</dd></div><div><dt>使用身分</dt><dd>日照護理師（虛構）</dd></div><div><dt>使用目的</dt><dd>{record.purpose}</dd></div><div><dt>分享範圍</dt><dd>{record.sharingScope === 'SHARED_CARE' ? '共同照顧' : record.sharingScope === 'DIRECT_PARTICIPANTS' ? '直接參與者' : '僅作者'}</dd></div></dl><Link className="text-button" to={`/v2/prototype/cases/${caseId}/records/${record.recordId}`}>查看紀錄與版本</Link></article>;
        return projection ? <article className="v2-card" key={record.recordId}><div className="v2-section-title"><div><span className="v2-fake-label">獲授權內容</span><h2>專業照顧摘要</h2></div>{projection.wasCorrected && <strong>曾經更正</strong>}</div><p>{projection.objectiveObservation}</p><dl className="v2-meta-grid"><div><dt>作者與身分</dt><dd>{projection.authorLabel}</dd></div><div><dt>服務目的</dt><dd>{projection.purpose}</dd></div></dl><Link className="text-button" to={`/v2/prototype/cases/${caseId}/records/${record.recordId}`}>查看獲授權摘要</Link></article> : null;
      })}</div>
      {records.length === 0 && <section className="v2-empty-state"><h2>目前沒有可見的專業照顧紀錄</h2><p>這不代表沒有其他紀錄；只顯示目前授權範圍內的內容。</p>{canCreate && <Link className="primary-button" to={`/v2/prototype/cases/${caseId}/records/new`}>新增第一筆紀錄</Link>}</section>}
    </section>
  );
}
