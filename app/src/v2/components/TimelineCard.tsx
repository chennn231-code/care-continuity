import { Link } from 'react-router-dom';
import { ACTION_STATUS_LABELS, DEMO_ROLE_LABELS, QUESTION_STATUS_LABELS, SHARING_SCOPE_LABELS } from '../data/mockData';
import type { CaseActivityItem } from '../types/prototype';
import { StatusPill } from './PrototypeShell';

const sourceLabels = { TIMELINE_ENTRY: '照顧變化', PROFESSIONAL_RECORD: '專業照顧紀錄', ACTION: '處理事項' } as const;

function formatTime(value: string) {
  return new Intl.DateTimeFormat('zh-TW', { dateStyle: 'medium', timeStyle: 'short', timeZone: 'Asia/Taipei' }).format(new Date(value));
}

export function TimelineCard({ entry }: { entry: CaseActivityItem }) {
  return (
    <article className="v2-card v2-timeline-card">
      <div className="v2-card-heading">
        <div><StatusPill tone="active">{sourceLabels[entry.sourceType]}</StatusPill><h2>{entry.summary}</h2></div>
      </div>
      <dl className="v2-meta-grid">
        <div><dt>活動時間</dt><dd>{formatTime(entry.displayTimestamp)}</dd></div>
        <div><dt>執行者</dt><dd>{entry.actorLabel}（{DEMO_ROLE_LABELS[entry.actorDisplayRole]}）</dd></div>
        <div><dt>來源類型</dt><dd>{sourceLabels[entry.sourceType]}</dd></div>
        <div><dt>來源資訊</dt><dd>{entry.sourceLabel}</dd></div>
        <div><dt>分享範圍</dt><dd>{SHARING_SCOPE_LABELS[entry.sharingScope]}</dd></div>
      </dl>
      {(entry.linkedQuestionId || entry.linkedActionId) && <div className="v2-timeline-links">
        {entry.linkedQuestionId && entry.linkedQuestionStatus && <div><span>相關問題：<strong>{QUESTION_STATUS_LABELS[entry.linkedQuestionStatus]}</strong></span><Link className="text-button" to={`/v2/prototype/cases/${entry.caseId}/actions#question-${entry.linkedQuestionId}`}>查看問題</Link></div>}
        {entry.linkedActionId && entry.linkedActionStatus && <div><span>處理事項：<strong>{ACTION_STATUS_LABELS[entry.linkedActionStatus]}</strong></span><Link className="text-button" to={`/v2/prototype/cases/${entry.caseId}/actions#action-${entry.linkedActionId}`}>查看處理事項</Link></div>}
      </div>}
    </article>
  );
}
