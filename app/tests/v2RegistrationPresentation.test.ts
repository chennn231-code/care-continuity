import { describe, expect, it } from 'vitest';
import { shouldShowAccountSummary } from '../src/v2/components/PrototypeShell';
import { IDENTITY_CARD_ILLUSTRATIONS } from '../src/v2/data/identityCardIllustrations';
import { PROFESSIONAL_TYPE_OPTIONS, PROFESSIONAL_VERIFICATION_HINT } from '../src/v2/data/mockData';
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

  it('keeps professional choices and verification guidance without role descriptions', () => {
    expect(PROFESSIONAL_TYPE_OPTIONS).toHaveLength(10);
    expect(PROFESSIONAL_TYPE_OPTIONS.map((option) => option.label)).toEqual([
      '個案管理員／A單位個管員',
      '照顧服務員',
      '護理師',
      '醫師',
      '物理治療師',
      '職能治療師',
      '語言治療師',
      '營養師',
      '心理師',
      '社會工作人員'
    ]);
    expect(PROFESSIONAL_TYPE_OPTIONS.every((option) => !('description' in option))).toBe(true);
    expect(PROFESSIONAL_VERIFICATION_HINT).toBe('需完成相應身分及資格驗證後才能開通相關權限');
  });
});
