import { useEffect, useRef } from 'react';
import { Link } from 'react-router-dom';

export function UnavailableState() {
  const headingRef = useRef<HTMLHeadingElement>(null);
  useEffect(() => { headingRef.current?.focus(); });
  return (
    <section className="winwin-state-card" role="alert" aria-labelledby="winwin-unavailable-title">
      <h1 ref={headingRef} id="winwin-unavailable-title" tabIndex={-1}>目前無法使用此內容</h1>
      <p>這項內容目前無法提供。請稍後再試，或返回仍可安全使用的頁面。</p>
      <Link className="winwin-primary-action" to="/winwin/cases">返回我的個案</Link>
    </section>
  );
}

export function LoadingState({ label }: Readonly<{ label: string }>) {
  return (
    <section className="winwin-state-card" role="status" aria-live="polite" aria-busy="true">
      <h1>{label}</h1>
      <p>正在安全載入資料，請稍候。</p>
    </section>
  );
}
