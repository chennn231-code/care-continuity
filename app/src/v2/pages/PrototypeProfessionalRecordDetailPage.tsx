import { Link, useParams } from 'react-router-dom';
import { usePrototype } from '../state/PrototypeProvider';
import { familyProfessionalRecordProjection, professionalRecordVersion, professionalRecordVersions } from '../state/professionalRecordState';

export function PrototypeProfessionalRecordDetailPage() {
  const { caseId = 'demo-case', recordId = '' } = useParams();
  const { state, setRole } = usePrototype();
  const record = professionalRecordVersion(state, recordId);
  const versions = professionalRecordVersions(state, recordId);
  const familyView = familyProfessionalRecordProjection(state, recordId);
  if (!record || record.caseId !== caseId) return <section className="v2-page v2-access-denied-page"><h1>目前無法查看此紀錄</h1><Link to={`/v2/prototype/cases/${caseId}/records`}>返回專業紀錄</Link></section>;
  const viewingAsFamily = state.activeRole === 'FAMILY';
  return (
    <section className="v2-page v2-record-detail-page">
      <header className="v2-page-heading v2-heading-actions"><div><p className="eyebrow">已發布・版本 {record.versionNumber}</p><h1>{record.content.serviceDate} 專業照顧紀錄</h1><p>已發布內容不能直接覆寫；原始版本、作者與時間會保留。</p></div>{!viewingAsFamily && <Link className="secondary-button" to={`/v2/prototype/cases/${caseId}/records/${recordId}/correct`}>追加更正</Link>}</header>
      <div className="v2-record-view-switch" role="group" aria-label="紀錄檢視情境"><button type="button" aria-pressed={!viewingAsFamily} onClick={() => setRole('NURSE')}>專業人員檢視</button><button type="button" aria-pressed={viewingAsFamily} onClick={() => setRole('FAMILY')}>家屬可見預覽</button></div>
      {viewingAsFamily ? <FamilyRecordView projection={familyView} /> : <ProfessionalRecordView record={record} />}
      {!viewingAsFamily && <section className="v2-card v2-record-version-history"><h2>版本歷程</h2><p>共 {versions.length} 個版本。更正會新增版本，不會讓原始紀錄消失。</p><ol>{[...versions].reverse().map((version) => <li key={version.id}><strong>版本 {version.versionNumber}</strong><span>{version.authorName}｜{new Date(version.recordedAt).toLocaleString('zh-TW')}</span>{version.correctionReason && <small>更正原因：{version.correctionReason}</small>}</li>)}</ol></section>}
    </section>
  );
}

function FamilyRecordView({ projection }: { projection: ReturnType<typeof familyProfessionalRecordProjection> }) {
  if (!projection) return <section className="v2-card v2-family-record-preview"><h2>此紀錄目前不在家屬可見範圍</h2><p>不顯示專業限定內容，也不顯示被隱藏的欄位或數量。</p></section>;
  return <section className="v2-card v2-family-record-preview"><span className="v2-fake-label">家屬獲授權內容</span><h2>本次照顧摘要</h2>{projection.wasCorrected && <p className="v2-record-correction-note">這份紀錄曾經更正，目前顯示最新有效版本。</p>}<dl className="v2-meta-grid"><div><dt>作者與身分</dt><dd>{projection.authorLabel}</dd></div><div><dt>服務目的</dt><dd>{projection.purpose}</dd></div><div><dt>發生時間</dt><dd>{new Date(projection.occurredAt).toLocaleString('zh-TW')}</dd></div></dl><h3>客觀觀察</h3><p>{projection.objectiveObservation}</p><h3>本次完成的服務</h3><p>{projection.serviceProvided}</p><h3>後續追蹤</h3><p>{projection.followUpPlan}</p>{projection.followUpDueDate && <small>預計追蹤：{projection.followUpDueDate}</small>}<p className="v2-logic-note">本預覽不改寫原始語意，不顯示專業限定備註或隱藏內容數量。</p></section>;
}

function ProfessionalRecordView({ record }: { record: NonNullable<ReturnType<typeof professionalRecordVersion>> }) {
  return <div className="v2-record-published-grid"><section className="v2-card"><h2>本次服務資訊</h2><dl className="v2-meta-grid"><div><dt>作者</dt><dd>{record.authorName}</dd></div><div><dt>Acting role</dt><dd>日照護理師（虛構）</dd></div><div><dt>服務目的</dt><dd>{record.purpose}</dd></div><div><dt>分享範圍</dt><dd>{record.sharingScope === 'SHARED_CARE' ? '共同照顧' : record.sharingScope === 'DIRECT_PARTICIPANTS' ? '直接參與者' : '僅作者'}</dd></div><div><dt>發生時間</dt><dd>{new Date(record.occurredAt).toLocaleString('zh-TW')}</dd></div><div><dt>服務結束</dt><dd>{record.content.serviceDate} {record.content.endedAt}</dd></div><div><dt>紀錄時間</dt><dd>{new Date(record.recordedAt).toLocaleString('zh-TW')}</dd></div></dl></section><section className="v2-card"><h2>觀察與主述</h2><h3>主述</h3><p>{record.content.subjectReport || '本次未記錄主述'}</p><h3>客觀觀察</h3><p>{record.content.objectiveObservation}</p></section><section className="v2-card"><h2>評估與專業限定備註</h2><p>{record.content.assessmentSummary || '本次未填寫評估摘要'}</p><p className="v2-professional-only-note">專業限定：{record.content.professionalOnlyNotes || '本次未填寫專業限定備註'}</p></section><section className="v2-card"><h2>處置與後續追蹤</h2><p>{record.content.serviceProvided}</p><h3>追蹤方式</h3><p>{record.content.followUpPlan}</p></section></div>;
}
