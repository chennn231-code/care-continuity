import { describe, expect, it } from 'vitest';
import type { BackupAssignmentRow } from '../src/lib/backupAssignments';
import type { CareSourceRow } from '../src/lib/careSources';
import type { CareTaskRow } from '../src/lib/careTasks';
import type { TaskHandoffRecordContract } from '../src/handoffs/handoffContract';
import {
  buildOfflineHandoffTaskPresentation,
  eligibleOfflineHandoffSources,
  offlinePackageIsDraft,
  offlineTaskCanBeSelected,
  printOfflineHandoff
} from '../src/handoffs/offlineHandoffContract';

const task: CareTaskRow = { task_id: 'task-a', care_receiver_id: 'receiver-a', title: '早上協助用藥', category: 'MEDICATION', occurrence_pattern: { type: 'DAILY', scheduled_times: ['08:00'] }, required_support_modes: ['ON_SITE'], is_active: true, created_at: '2026-08-23T00:00:00Z' };
const backup: BackupAssignmentRow = { backup_id: 'backup-a', task_id: 'task-a', care_source_id: 'source-a', confirmation_status: 'POSSIBLE', time_scope: null, support_modes_committed: [], updated_at: '2026-08-23T00:00:00Z' };
const handoff: TaskHandoffRecordContract = { handoff_id: 'handoff-a', task_id: 'task-a', details: { official_information_ready: true, official_information_location: '餐桌抽屜', assistance_types: ['REMINDER'] }, additional_notes: '先確認最新藥袋', created_at: '2026-08-23T00:00:00Z', updated_at: '2026-08-23T00:00:00Z', reviewed_at: null, review_interval_days: 30 };

describe('offline handoff presentation contract', () => {
  it('excludes the authenticated primary caregiver without requiring other sources to have accounts', () => {
    const sources: CareSourceRow[] = [
      { care_source_id: 'self', care_receiver_id: 'receiver-a', display_name: '我', source_type: 'FAMILY_MEMBER', user_id: 'user-a', created_at: '' },
      { care_source_id: 'offline', care_receiver_id: 'receiver-a', display_name: '哥哥', source_type: 'FAMILY_MEMBER', user_id: null, created_at: '' }
    ];
    expect(eligibleOfflineHandoffSources(sources, 'user-a').map((source) => source.display_name)).toEqual(['哥哥']);
  });

  it('maps validated medication details to readable labels without internal identity fields', () => {
    const result = buildOfflineHandoffTaskPresentation(task, handoff, backup);
    expect(result.readiness).toBe('READY_TO_SHARE');
    expect(result.backupStatusLabel).toContain('尚未確認');
    expect(result.fields).toContainEqual({ label: '正式資訊／藥袋位置', value: '餐桌抽屜' });
    expect(result.fields).toContainEqual({ label: '需要的協助', value: '提醒查看正式用藥資訊' });
    expect(result.medicationSafetyNote).toContain('最新處方');
    expect(JSON.stringify(result)).not.toContain('receiver-a');
    expect(JSON.stringify(result)).not.toContain('source-a');
    expect(JSON.stringify(result)).not.toContain('user-a');
  });

  it('does not make POSSIBLE confirmed when preparing a presentation', () => {
    expect(buildOfflineHandoffTaskPresentation(task, handoff, backup).backupStatusLabel).toBe('可能可以協助｜尚未確認');
    expect(backup.confirmation_status).toBe('POSSIBLE');
  });

  it('blocks NOT_PREPARED from selection and marks NEEDS_DETAILS as a draft', () => {
    const missing = buildOfflineHandoffTaskPresentation(task, null, backup);
    const incomplete = buildOfflineHandoffTaskPresentation(task, { ...handoff, details: {} }, backup);
    expect(offlineTaskCanBeSelected(missing)).toBe(false);
    expect(offlineTaskCanBeSelected(incomplete)).toBe(true);
    expect(offlinePackageIsDraft([incomplete])).toBe(true);
  });

  it('rejects a mismatched task and backup pair', () => {
    expect(() => buildOfflineHandoffTaskPresentation(task, handoff, { ...backup, task_id: 'other' })).toThrow('資料無效');
  });

  it.each([
    ['MEAL', { meal_arrangement: '冰箱冷藏餐', feeding_assistance_required: false, diet_form: '軟質' }, '餐點如何取得'],
    ['TOILETING', { toileting_method: 'TOILET', accompaniment_required: true, transfer_assistance_required: true }, '如廁方式'],
    ['BATHING', { bathing_method: 'SHOWER', transfer_assistance_required: true, continuous_supervision_required: true }, '洗澡方式'],
    ['MOBILITY', { mobility_method: '輪椅移位', assistance_required: true }, '移動／移位方式'],
    ['MEDICAL', { medical_destination: '心臟內科', transport_method: '計程車', accompaniment_required: true }, '院所／科別'],
    ['TRANSPORT', { origin: '住家', destination: '日照中心', transport_method: '接送車', accompaniment_required: false }, '出發地'],
    ['NIGHT_CARE', { care_method: '夜間如廁協助', continuous_supervision_required: true }, '具體夜間照顧方式'],
    ['OTHER', { care_method: '先電話聯絡' }, '具體照顧方式']
  ] as const)('maps %s details to readable print fields', (category, details, expectedLabel) => {
    const categoryTask = { ...task, category } as CareTaskRow;
    const categoryHandoff = { ...handoff, details } as TaskHandoffRecordContract;
    expect(buildOfflineHandoffTaskPresentation(categoryTask, categoryHandoff, backup).fields.map((field) => field.label)).toContain(expectedLabel);
  });

  it('invokes only the supplied browser print action', () => {
    let printCalls = 0;
    printOfflineHandoff(() => { printCalls += 1; });
    expect(printCalls).toBe(1);
    expect(backup.confirmation_status).toBe('POSSIBLE');
  });
});
