import '@testing-library/jest-dom/vitest';
import { useState } from 'react';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it } from 'vitest';

function DomHarnessProof() {
  const [submitted, setSubmitted] = useState(false);
  return (
    <main aria-labelledby="proof-heading">
      <h1 id="proof-heading">DOM 測試能力確認</h1>
      <label htmlFor="proof-name">顯示名稱</label>
      <input id="proof-name" />
      <button type="button" disabled={submitted} onClick={() => setSubmitted(true)}>
        確認
      </button>
      <p role="status" aria-live="polite">
        {submitted ? '已確認' : '尚未確認'}
      </p>
    </main>
  );
}

describe('CP-F0 DOM interaction foundation', () => {
  it('supports semantic queries, accessible names, focus, typing, interaction, and status assertions', async () => {
    const user = userEvent.setup();
    render(<DomHarnessProof />);

    const input = screen.getByRole('textbox', { name: '顯示名稱' });
    const button = screen.getByRole('button', { name: '確認' });
    expect(screen.getByRole('main')).toHaveAccessibleName('DOM 測試能力確認');
    expect(screen.getByRole('status')).toHaveTextContent('尚未確認');

    await user.click(input);
    await user.keyboard('林小姐');
    expect(input).toHaveFocus();
    expect(input).toHaveValue('林小姐');

    await user.click(button);
    expect(button).toBeDisabled();
    expect(screen.getByRole('status')).toHaveTextContent('已確認');
  });
});
