export function UnavailableState() {
  return (
    <section className="winwin-state-card" role="alert" aria-labelledby="winwin-unavailable-title">
      <h1 id="winwin-unavailable-title">目前無法使用此內容</h1>
      <p>這項內容目前無法提供。請稍後再試，或返回仍可安全使用的頁面。</p>
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
