export function getAuthErrorMessage(error: unknown, explicitCode?: string | null) {
  const message = error instanceof Error ? error.message : typeof error === 'string' ? error : '';
  const errorCode = typeof error === 'object' && error !== null && 'code' in error ? String(error.code) : '';
  const normalized = `${explicitCode ?? ''} ${errorCode} ${message}`.toLowerCase();

  if (normalized.includes('invalid login credentials')) return 'Email 或密碼不正確，請重新輸入。';
  if (normalized.includes('email not confirmed')) return 'Email 尚未完成確認，請先查看確認信。';
  if (normalized.includes('rate limit') || normalized.includes('over_email_send_rate_limit')) {
    return '確認信寄送次數已達暫時上限，請稍後再試。';
  }
  if (normalized.includes('otp_expired') || normalized.includes('expired') || normalized.includes('invalid or has expired')) {
    return '確認連結已失效或過期，請返回登入頁後重新操作。';
  }
  return '目前無法完成帳號操作，請稍後再試。';
}
