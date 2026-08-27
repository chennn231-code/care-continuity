import { Component, type PropsWithChildren } from 'react';

export function LegacyLoading() {
  return <main className="centered-page" aria-live="polite"><div className="status-card" role="status">WinWin 正在載入舊版流程…</div></main>;
}

export class LegacyLoadBoundary extends Component<PropsWithChildren, { failed: boolean }> {
  state = { failed: false };

  static getDerivedStateFromError() {
    // Never display or log the exception: callback URLs can carry credentials.
    return { failed: true };
  }

  render() {
    if (this.state.failed) {
      return <main className="centered-page"><section className="status-card" role="alert">
        <h1>WinWin 無法載入舊版流程</h1>
        <p>請稍後重新載入，或返回 WinWin 展示。</p>
        <button className="primary-button" type="button" onClick={() => window.location.reload()}>重新載入</button>
        <a className="secondary-button" href="/v2/prototype">返回 WinWin</a>
      </section></main>;
    }
    return this.props.children;
  }
}
