import { describe, expect, it } from 'vitest';
import { shouldShowAccountSummary } from '../src/v2/components/PrototypeShell';
import { IDENTITY_CARD_ILLUSTRATIONS } from '../src/v2/data/identityCardIllustrations';
import { IDENTITY_CAROUSEL_HINT, REGISTRATION_BOUNDARY_LABELS } from '../src/v2/data/registrationCopy';

describe('v2 registration presentation', () => {
  it('hides an existing identity summary until registration is complete', () => {
    expect(shouldShowAccountSummary('/v2/prototype/register')).toBe(false);
    expect(shouldShowAccountSummary('/v2/prototype/register/identity')).toBe(false);
    expect(shouldShowAccountSummary('/v2/prototype/register/profession')).toBe(false);
    expect(shouldShowAccountSummary('/v2/prototype/register/verification')).toBe(false);
    expect(shouldShowAccountSummary('/v2/prototype/register/complete')).toBe(true);
    expect(shouldShowAccountSummary('/v2/prototype/profile/identities')).toBe(true);
  });

  it('uses Chinese-first boundary terms and an explicit swipe hint', () => {
    expect(REGISTRATION_BOUNDARY_LABELS.map((item) => item.title)).toEqual([
      '帳號身分',
      '身分驗證',
      '個案成員關係',
      '角色授權與操作權限'
    ]);
    expect(IDENTITY_CAROUSEL_HINT).toBe('左右滑動，查看更多身分');
  });

  it('maps each identity card to its dedicated WinWin illustration', () => {
    expect(IDENTITY_CARD_ILLUSTRATIONS.SELF).toContain('winwin-identity-older-adult.png');
    expect(IDENTITY_CARD_ILLUSTRATIONS.FAMILY).toContain('winwin-identity-family-caregiver.png');
    expect(IDENTITY_CARD_ILLUSTRATIONS.PROFESSIONAL).toContain('winwin-identity-professional-care-team.png');
  });
});
