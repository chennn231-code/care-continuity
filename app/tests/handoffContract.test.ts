import { describe, expect, it } from 'vitest';
import {
  formatHandoffTimestamp,
  getHandoffReadiness,
  normalizeHandoffReviewInterval,
  normalizeTaskHandoffDetails,
  shouldShowHandoffReviewReminder,
  taskCategoryChangeIsBlockedByHandoff,
  validateTaskHandoffDetails,
  validateTaskHandoffDetailsShape
} from '../src/handoffs/handoffContract';

describe('task handoff category contracts', () => {
  it('requires the medication safety fields before READY_TO_SHARE', () => {
    expect(getHandoffReadiness('MEDICATION', { details: {}, additional_notes: null })).toBe('NEEDS_DETAILS');
    expect(getHandoffReadiness('MEDICATION', {
      details: {
        official_information_ready: true,
        official_information_location: '餐桌右側抽屜',
        assistance_types: ['REMINDER']
      },
      additional_notes: null
    })).toBe('READY_TO_SHARE');
  });

  it.each([
    ['MEAL', { meal_arrangement: '送餐', feeding_assistance_required: false, diet_form: '軟質' }],
    ['TOILETING', { toileting_method: 'TOILET', accompaniment_required: true, transfer_assistance_required: false }],
    ['BATHING', { bathing_method: 'SHOWER', transfer_assistance_required: true, continuous_supervision_required: true }],
    ['MOBILITY', { mobility_method: '輪椅移位', assistance_required: true }],
    ['MEDICAL', { medical_destination: '心臟內科', transport_method: '計程車', accompaniment_required: true }],
    ['NIGHT_CARE', { care_method: '夜間如廁協助', continuous_supervision_required: false }],
    ['TRANSPORT', { origin: '家中', destination: '醫院', transport_method: '計程車', accompaniment_required: true }]
  ] as const)('accepts complete %s details', (category, details) => {
    expect(validateTaskHandoffDetails(category, details)).toEqual([]);
    expect(getHandoffReadiness(category, { details, additional_notes: null })).toBe('READY_TO_SHARE');
  });

  it('keeps unanswered booleans distinct from false', () => {
    expect(validateTaskHandoffDetails('MEAL', { meal_arrangement: '自備', diet_form: '一般' }))
      .toContainEqual({ field: 'feeding_assistance_required', message: '這項交接資訊尚未完成' });
    expect(validateTaskHandoffDetails('MEAL', {
      meal_arrangement: '自備', diet_form: '一般', feeding_assistance_required: false
    })).toEqual([]);
  });

  it('normalizes blank strings and deduplicates arrays', () => {
    expect(normalizeTaskHandoffDetails('MEAL', {
      meal_arrangement: ' 送餐 ', diet_form: ' 軟質 ', feeding_assistance_required: false,
      swallowing_caution: '   ', equipment: ['湯匙', ' 湯匙 ', '', '防滑墊']
    })).toEqual({
      meal_arrangement: '送餐', diet_form: '軟質', feeding_assistance_required: false,
      equipment: ['湯匙', '防滑墊']
    });
  });

  it('rejects fields from a different task category at the runtime boundary', () => {
    expect(validateTaskHandoffDetailsShape('BATHING', { official_information_location: '抽屜' }))
      .toContainEqual({ field: 'official_information_location', message: '這個欄位不適用於目前的照顧工作類型' });
  });

  it('requires OTHER to contain structured content or notes', () => {
    expect(getHandoffReadiness('OTHER', { details: {}, additional_notes: ' ' })).toBe('NEEDS_DETAILS');
    expect(getHandoffReadiness('OTHER', { details: {}, additional_notes: '交接前先電話聯絡' })).toBe('READY_TO_SHARE');
  });
});

describe('handoff freshness contract', () => {
  const activeDaily = { is_active: true, occurrence_pattern: { type: 'DAILY' as const, scheduled_times: ['08:00'] } };

  it.each([14, 30, 90] as const)('accepts the MVP reminder option %i', (days) => {
    expect(normalizeHandoffReviewInterval(days)).toBe(days);
  });
  it('accepts no reminder and rejects unsupported UI intervals', () => {
    expect(normalizeHandoffReviewInterval(null)).toBeNull();
    expect(() => normalizeHandoffReviewInterval(17)).toThrow('有效的交接資訊提醒頻率');
  });
  it('uses the later of updated and reviewed timestamps', () => {
    expect(shouldShowHandoffReviewReminder({
      updated_at: '2026-08-01T00:00:00+08:00', reviewed_at: '2026-08-20T00:00:00+08:00',
      review_interval_days: 14, task: activeDaily
    }, new Date('2026-09-03T00:00:00+08:00'))).toBe(true);
    expect(shouldShowHandoffReviewReminder({
      updated_at: '2026-08-01T00:00:00+08:00', reviewed_at: '2026-08-20T00:00:00+08:00',
      review_interval_days: 14, task: activeDaily
    }, new Date('2026-09-02T23:59:59+08:00'))).toBe(false);
  });
  it('excludes inactive tasks and completed ONCE tasks', () => {
    expect(shouldShowHandoffReviewReminder({
      updated_at: '2026-01-01T00:00:00+08:00', reviewed_at: null, review_interval_days: 14,
      task: { is_active: false, occurrence_pattern: { type: 'DAILY', scheduled_times: ['08:00'] } }
    }, new Date('2026-09-01T00:00:00+08:00'))).toBe(false);
    expect(shouldShowHandoffReviewReminder({
      updated_at: '2026-01-01T00:00:00+08:00', reviewed_at: null, review_interval_days: 14,
      task: { is_active: true, occurrence_pattern: { type: 'ONCE', date: '2026-08-01', scheduled_time: '08:00' } }
    }, new Date('2026-09-01T00:00:00+08:00'))).toBe(false);
  });
  it('formats timestamps in Asia/Taipei', () => {
    expect(formatHandoffTimestamp('2026-08-23T06:30:00Z')).toBe('2026/08/23');
    expect(formatHandoffTimestamp('2026-08-23T06:30:00Z', true)).toContain('14:30');
  });
  it('blocks category changes only when a handoff exists', () => {
    expect(taskCategoryChangeIsBlockedByHandoff('MEDICATION', 'BATHING', true)).toBe(true);
    expect(taskCategoryChangeIsBlockedByHandoff('MEDICATION', 'BATHING', false)).toBe(false);
    expect(taskCategoryChangeIsBlockedByHandoff('MEDICATION', 'MEDICATION', true)).toBe(false);
  });
});
