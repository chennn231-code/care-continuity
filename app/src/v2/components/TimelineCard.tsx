import { DEMO_ROLE_LABELS, SHARING_SCOPE_LABELS } from '../data/mockData';
import type { TimelineEntry } from '../types/prototype';
import { StatusPill } from './PrototypeShell';

const kindLabels = { OBSERVATION: '觀察', ARRANGEMENT: '照顧安排', QUESTION: '問題', ANSWER: '回覆', ACTION_EVENT: '處理事項' } as const;

function formatTime(value: string) {
  return new Intl.DateTimeFormat('zh-TW', { dateStyle: 'medium', timeStyle: 'short', timeZone: 'Asia/Taipei' }).format(new Date(value));
}

export function TimelineCard({ entry }: { entry: TimelineEntry }) {
  return (
    <article className={`v2-card v2-timeline-card ${entry.isCurrentVersion ? '' : 'is-superseded'}`}>
      <div className="v2-card-heading">
        <div><StatusPill tone={entry.isCurrentVersion ? 'active' : 'neutral'}>{kindLabels[entry.kind]}</StatusPill><h2>{entry.summary}</h2></div>
        <span className="v2-version">第 {entry.version} 版</span>
      </div>
      {!entry.isCurrentVersion && <p className="v2-inline-note">此紀錄已有更新版本，原始內容仍保留</p>}
      {entry.supersedesId && <p className="v2-inline-note">這是更正後的目前版本</p>}
      <dl className="v2-meta-grid">
        <div><dt>發生時間</dt><dd>{formatTime(entry.occurredAt)}</dd></div>
        <div><dt>紀錄時間</dt><dd>{formatTime(entry.recordedAt)}</dd></div>
        <div><dt>作者角色</dt><dd>{DEMO_ROLE_LABELS[entry.authorRole]}</dd></div>
        <div><dt>來源</dt><dd>{entry.source}</dd></div>
        <div><dt>分享範圍</dt><dd>{SHARING_SCOPE_LABELS[entry.sharingScope]}</dd></div>
        <div><dt>版本狀態</dt><dd>{entry.isCurrentVersion ? '目前版本' : '已由後續版本取代'}</dd></div>
      </dl>
    </article>
  );
}
