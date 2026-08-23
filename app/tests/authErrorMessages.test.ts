import { describe, expect, it } from 'vitest';
import { getAuthErrorMessage } from '../src/auth/authErrorMessages';

describe('auth error mapping', () => {
  it.each([
    ['Invalid login credentials', 'Email 或密碼不正確'],
    ['Email not confirmed', 'Email 尚未完成確認'],
    ['email rate limit exceeded', '寄送次數已達'],
    ['Email link is invalid or has expired', '確認連結已失效']
  ])('maps %s', (message, expected) => expect(getAuthErrorMessage(new Error(message))).toContain(expected));
  it('maps otp_expired code', () => expect(getAuthErrorMessage('', 'otp_expired')).toContain('確認連結已失效'));
  it('does not expose unknown technical errors', () => expect(getAuthErrorMessage(new Error('database exploded'))).toBe('目前無法完成帳號操作，請稍後再試'));
});
