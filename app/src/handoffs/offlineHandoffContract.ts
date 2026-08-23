import { BACKUP_CONFIRMATION_STATUSES, BACKUP_STATUS_LABELS, describeBackupArrangement } from '../backups/backupContract';
import type { BackupAssignmentRow } from '../lib/backupAssignments';
import type { CareSourceRow } from '../lib/careSources';
import type { CareTaskRow } from '../lib/careTasks';
import { describeOccurrence, SUPPORT_MODE_LABELS, TASK_CATEGORY_LABELS, type TaskCategory } from '../tasks/taskContract';
import {
  BATHING_METHODS,
  getHandoffReadiness,
  HANDOFF_READINESS_LABELS,
  MEDICATION_ASSISTANCE_TYPES,
  TOILETING_METHODS,
  type HandoffReadiness,
  type TaskHandoffRecordContract
} from './handoffContract';

export interface OfflineHandoffField { label: string; value: string }
export interface OfflineHandoffTaskPresentation {
  taskId: string;
  title: string;
  categoryLabel: string;
  occurrenceLabel: string;
  supportModesLabel: string;
  backupStatusLabel: string;
  readiness: HandoffReadiness;
  readinessLabel: string;
  fields: OfflineHandoffField[];
  additionalNotes: string | null;
  updatedAt: string | null;
  reviewedAt: string | null;
  medicationSafetyNote: string | null;
}

const BOOLEAN_LABEL = (value: boolean) => value ? '是' : '否';
const MEDICATION_ASSISTANCE_LABELS = Object.fromEntries(MEDICATION_ASSISTANCE_TYPES.map((value, index) => [value, ['提醒查看正式用藥資訊', '協助取藥', '協助服藥'][index]]));
const TOILETING_METHOD_LABELS = Object.fromEntries(TOILETING_METHODS.map((value, index) => [value, ['馬桶', '便盆', '尿布', '其他'][index]]));
const BATHING_METHOD_LABELS = Object.fromEntries(BATHING_METHODS.map((value, index) => [value, ['淋浴', '床上擦澡', '其他'][index]]));

const FIELD_LABELS: Record<TaskCategory, Record<string, string>> = {
  MEDICATION: { official_information_ready: '正式用藥資訊已整理', official_information_location: '正式資訊／藥袋位置', assistance_types: '需要的協助', swallowing_caution: '吞嚥或服藥注意事項' },
  MEAL: { meal_arrangement: '餐點如何取得', feeding_assistance_required: '需要協助進食', diet_form: '飲食型態', swallowing_caution: '吞嚥注意事項', equipment: '餐具／輔具' },
  TOILETING: { toileting_method: '如廁方式', accompaniment_required: '需要陪同', transfer_assistance_required: '需要移位協助', supplies_location: '用品位置' },
  BATHING: { bathing_method: '洗澡方式', transfer_assistance_required: '需要移位', continuous_supervision_required: '需要全程有人在場', equipment: '輔具', supplies_location: '用品位置' },
  MOBILITY: { mobility_method: '移動／移位方式', assistance_required: '需要他人協助', equipment: '輔具', cautions: '注意事項' },
  MEDICAL: { medical_destination: '院所／科別', transport_method: '交通方式', accompaniment_required: '需要陪同', items_to_bring: '攜帶資料', cautions: '注意事項' },
  NIGHT_CARE: { care_method: '具體夜間照顧方式', continuous_supervision_required: '需要持續有人在場', equipment: '輔具', supplies_location: '用品位置', cautions: '注意事項' },
  TRANSPORT: { origin: '出發地', destination: '目的地', transport_method: '交通方式', accompaniment_required: '需要陪同', cautions: '注意事項' },
  OTHER: { care_method: '具體照顧方式', equipment: '輔具', supplies_location: '用品位置', cautions: '注意事項' }
};

function displayValue(category: TaskCategory, field: string, value: unknown) {
  if (typeof value === 'boolean') return BOOLEAN_LABEL(value);
  if (Array.isArray(value)) {
    if (category === 'MEDICATION' && field === 'assistance_types') return value.map((item) => MEDICATION_ASSISTANCE_LABELS[String(item)] ?? String(item)).join('、');
    return value.map(String).join('、');
  }
  if (category === 'TOILETING' && field === 'toileting_method') return TOILETING_METHOD_LABELS[String(value)] ?? String(value);
  if (category === 'BATHING' && field === 'bathing_method') return BATHING_METHOD_LABELS[String(value)] ?? String(value);
  return String(value);
}

export function eligibleOfflineHandoffSources(sources: CareSourceRow[], authenticatedUserId: string) {
  return sources.filter((source) => source.user_id !== authenticatedUserId);
}

export function buildOfflineHandoffTaskPresentation(
  task: CareTaskRow,
  handoff: TaskHandoffRecordContract | null,
  backup: BackupAssignmentRow
): OfflineHandoffTaskPresentation {
  if (backup.task_id !== task.task_id || !BACKUP_CONFIRMATION_STATUSES.includes(backup.confirmation_status)) {
    throw new Error('交接摘要的備援安排資料無效');
  }
  if (handoff && handoff.task_id !== task.task_id) throw new Error('交接資訊與照顧工作不一致');
  const readiness = getHandoffReadiness(task.category, handoff);
  const fields = handoff ? Object.entries(handoff.details).flatMap(([field, value]) => {
    const label = FIELD_LABELS[task.category][field];
    if (!label || value === null || value === undefined || value === '' || (Array.isArray(value) && !value.length)) return [];
    return [{ label, value: displayValue(task.category, field, value) }];
  }) : [];
  return {
    taskId: task.task_id,
    title: task.title,
    categoryLabel: TASK_CATEGORY_LABELS[task.category],
    occurrenceLabel: describeOccurrence(task.occurrence_pattern),
    supportModesLabel: task.required_support_modes.map((mode) => SUPPORT_MODE_LABELS[mode]).join('、'),
    backupStatusLabel: backup.confirmation_status === 'POSSIBLE'
      ? BACKUP_STATUS_LABELS.POSSIBLE
      : describeBackupArrangement(backup.confirmation_status, backup.time_scope, backup.support_modes_committed),
    readiness,
    readinessLabel: HANDOFF_READINESS_LABELS[readiness],
    fields,
    additionalNotes: handoff?.additional_notes?.trim() || null,
    updatedAt: handoff?.updated_at ?? null,
    reviewedAt: handoff?.reviewed_at ?? null,
    medicationSafetyNote: task.category === 'MEDICATION' ? '正式用藥仍以最新處方、藥袋或醫療專業指示為準' : null
  };
}

export function offlinePackageIsDraft(tasks: OfflineHandoffTaskPresentation[]) {
  return tasks.some((task) => task.readiness === 'NEEDS_DETAILS');
}

export function offlineTaskCanBeSelected(task: OfflineHandoffTaskPresentation) {
  return task.readiness !== 'NOT_PREPARED';
}

export function formatOfflineTimestamp(value: string | Date) {
  const parsed = typeof value === 'string' ? new Date(value) : value;
  if (!Number.isFinite(parsed.getTime())) return '時間資料無效';
  return new Intl.DateTimeFormat('zh-TW', {
    timeZone: 'Asia/Taipei', year: 'numeric', month: '2-digit', day: '2-digit',
    hour: '2-digit', minute: '2-digit', hour12: false
  }).format(parsed);
}

export function printOfflineHandoff(print: () => void = () => window.print()) {
  print();
}

// Offline presentation is derived in memory and deliberately contains no owner, auth, email, or delivery state fields.
