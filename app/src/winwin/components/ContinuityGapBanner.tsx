import { Link } from 'react-router-dom';
import type { ContinuityGapView } from '../contracts/frontendContract';

export function ContinuityGapBanner({
  gap,
  caseId,
  headingId,
  showActionLink = false
}: Readonly<{
  gap: ContinuityGapView;
  caseId: string;
  headingId: string;
  showActionLink?: boolean;
}>) {
  return (
    <section className="winwin-gap-banner" role="status" aria-labelledby={headingId}>
      <h2 id={headingId}>{gap.currentHolderDisplay}</h2>
      <p>這項處理事項需要重新安排。系統不會自動指定其他人。</p>
      <p><strong>{gap.careNeedDisplay}</strong>・{gap.followUpDisplay}</p>
      {showActionLink && (
        <Link
          to={`/winwin/cases/${caseId}/actions/${gap.actionId}`}
          aria-label={`查看處理事項：${gap.careNeedDisplay}`}
        >
          查看處理事項
        </Link>
      )}
    </section>
  );
}
