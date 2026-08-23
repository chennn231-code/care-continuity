import type { OccurrencePattern, SupportMode, TaskCategory } from '../tasks/taskContract';

export const HANDOFF_READINESS = ['NOT_PREPARED', 'NEEDS_DETAILS', 'READY_TO_SHARE'] as const;
export type HandoffReadiness = (typeof HANDOFF_READINESS)[number];
export const HANDOFF_READINESS_LABELS: Record<HandoffReadiness, string> = {
  NOT_PREPARED: '尚未整理交接資訊',
  NEEDS_DETAILS: '交接資訊尚待補充',
  READY_TO_SHARE: '交接資訊已整理，可提供接手者確認'
};
export const HANDOFF_REVIEW_INTERVAL_OPTIONS = [14, 30, 90] as const;
export type HandoffReviewIntervalDays = (typeof HANDOFF_REVIEW_INTERVAL_OPTIONS)[number];

export const MEDICATION_ASSISTANCE_TYPES = ['REMINDER', 'PICKUP', 'ADMINISTRATION_SUPPORT'] as const;
export const TOILETING_METHODS = ['TOILET', 'COMMODE', 'DIAPER', 'OTHER'] as const;
export const BATHING_METHODS = ['SHOWER', 'BED_BATH', 'OTHER'] as const;

export type MedicationAssistanceType = (typeof MEDICATION_ASSISTANCE_TYPES)[number];
export type ToiletingMethod = (typeof TOILETING_METHODS)[number];
export type BathingMethod = (typeof BATHING_METHODS)[number];

export interface MedicationHandoffDetails {
  official_information_ready?: boolean;
  official_information_location?: string;
  assistance_types?: MedicationAssistanceType[];
  swallowing_caution?: string;
}

export interface MealHandoffDetails {
  meal_arrangement?: string;
  feeding_assistance_required?: boolean;
  diet_form?: string;
  swallowing_caution?: string;
  equipment?: string[];
}

export interface ToiletingHandoffDetails {
  toileting_method?: ToiletingMethod;
  accompaniment_required?: boolean;
  transfer_assistance_required?: boolean;
  supplies_location?: string;
}

export interface BathingHandoffDetails {
  bathing_method?: BathingMethod;
  transfer_assistance_required?: boolean;
  continuous_supervision_required?: boolean;
  equipment?: string[];
  supplies_location?: string;
}

export interface MobilityHandoffDetails {
  mobility_method?: string;
  assistance_required?: boolean;
  equipment?: string[];
  cautions?: string;
}

export interface MedicalHandoffDetails {
  medical_destination?: string;
  transport_method?: string;
  accompaniment_required?: boolean;
  items_to_bring?: string[];
  cautions?: string;
}

export interface NightCareHandoffDetails {
  care_method?: string;
  continuous_supervision_required?: boolean;
  equipment?: string[];
  supplies_location?: string;
  cautions?: string;
}

export interface TransportHandoffDetails {
  origin?: string;
  destination?: string;
  transport_method?: string;
  accompaniment_required?: boolean;
  cautions?: string;
}

export interface OtherHandoffDetails {
  care_method?: string;
  equipment?: string[];
  supplies_location?: string;
  cautions?: string;
}

export interface TaskHandoffDetailsByCategory {
  MEDICATION: MedicationHandoffDetails;
  MEAL: MealHandoffDetails;
  TOILETING: ToiletingHandoffDetails;
  BATHING: BathingHandoffDetails;
  MOBILITY: MobilityHandoffDetails;
  MEDICAL: MedicalHandoffDetails;
  NIGHT_CARE: NightCareHandoffDetails;
  TRANSPORT: TransportHandoffDetails;
  OTHER: OtherHandoffDetails;
}

export type TaskHandoffDetails = TaskHandoffDetailsByCategory[TaskCategory];

export interface TaskHandoffRecordContract {
  handoff_id: string;
  task_id: string;
  details: TaskHandoffDetails;
  additional_notes: string | null;
  created_at: string;
  updated_at: string;
  reviewed_at: string | null;
  review_interval_days: number | null;
}

export interface TaskHandoffWriteInput {
  task_id: string;
  details: TaskHandoffDetails;
  additional_notes: string | null;
  review_interval_days: HandoffReviewIntervalDays | null;
}

export interface HandoffValidationIssue {
  field: string;
  message: string;
}

export function normalizeHandoffReviewInterval(value: number | null): HandoffReviewIntervalDays | null {
  if (value === null) return null;
  if (!HANDOFF_REVIEW_INTERVAL_OPTIONS.includes(value as HandoffReviewIntervalDays)) {
    throw new Error('請選擇有效的交接資訊提醒頻率');
  }
  return value as HandoffReviewIntervalDays;
}

type ValueRule =
  | { kind: 'boolean' }
  | { kind: 'string' }
  | { kind: 'enum-string'; values: readonly string[] }
  | { kind: 'string-array'; values?: readonly string[] };

const CATEGORY_RULES: Record<TaskCategory, Record<string, ValueRule>> = {
  MEDICATION: {
    official_information_ready: { kind: 'boolean' },
    official_information_location: { kind: 'string' },
    assistance_types: { kind: 'string-array', values: MEDICATION_ASSISTANCE_TYPES },
    swallowing_caution: { kind: 'string' }
  },
  MEAL: {
    meal_arrangement: { kind: 'string' }, feeding_assistance_required: { kind: 'boolean' },
    diet_form: { kind: 'string' }, swallowing_caution: { kind: 'string' }, equipment: { kind: 'string-array' }
  },
  TOILETING: {
    toileting_method: { kind: 'enum-string', values: TOILETING_METHODS }, accompaniment_required: { kind: 'boolean' },
    transfer_assistance_required: { kind: 'boolean' }, supplies_location: { kind: 'string' }
  },
  BATHING: {
    bathing_method: { kind: 'enum-string', values: BATHING_METHODS }, transfer_assistance_required: { kind: 'boolean' },
    continuous_supervision_required: { kind: 'boolean' }, equipment: { kind: 'string-array' }, supplies_location: { kind: 'string' }
  },
  MOBILITY: {
    mobility_method: { kind: 'string' }, assistance_required: { kind: 'boolean' },
    equipment: { kind: 'string-array' }, cautions: { kind: 'string' }
  },
  MEDICAL: {
    medical_destination: { kind: 'string' }, transport_method: { kind: 'string' }, accompaniment_required: { kind: 'boolean' },
    items_to_bring: { kind: 'string-array' }, cautions: { kind: 'string' }
  },
  NIGHT_CARE: {
    care_method: { kind: 'string' }, continuous_supervision_required: { kind: 'boolean' }, equipment: { kind: 'string-array' },
    supplies_location: { kind: 'string' }, cautions: { kind: 'string' }
  },
  TRANSPORT: {
    origin: { kind: 'string' }, destination: { kind: 'string' }, transport_method: { kind: 'string' },
    accompaniment_required: { kind: 'boolean' }, cautions: { kind: 'string' }
  },
  OTHER: { care_method: { kind: 'string' }, equipment: { kind: 'string-array' }, supplies_location: { kind: 'string' }, cautions: { kind: 'string' } }
};

const REQUIRED_FIELDS: Record<TaskCategory, readonly string[]> = {
  MEDICATION: ['official_information_location', 'assistance_types'],
  MEAL: ['meal_arrangement', 'feeding_assistance_required', 'diet_form'],
  TOILETING: ['toileting_method', 'accompaniment_required', 'transfer_assistance_required'],
  BATHING: ['bathing_method', 'transfer_assistance_required', 'continuous_supervision_required'],
  MOBILITY: ['mobility_method', 'assistance_required'],
  MEDICAL: ['medical_destination', 'transport_method', 'accompaniment_required'],
  NIGHT_CARE: ['care_method', 'continuous_supervision_required'],
  TRANSPORT: ['origin', 'destination', 'transport_method', 'accompaniment_required'],
  OTHER: []
};

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function hasMeaningfulValue(value: unknown) {
  if (typeof value === 'string') return value.trim().length > 0;
  if (Array.isArray(value)) return value.length > 0;
  return value !== undefined && value !== null;
}

export function validateTaskHandoffDetails(category: TaskCategory, details: unknown): HandoffValidationIssue[] {
  const issues = validateTaskHandoffDetailsShape(category, details);
  if (!isRecord(details)) return issues;
  for (const field of REQUIRED_FIELDS[category]) {
    if (!hasMeaningfulValue(details[field])) issues.push({ field, message: '這項交接資訊尚未完成' });
  }
  if (category === 'MEDICATION' && details.official_information_ready !== true) {
    issues.push({ field: 'official_information_ready', message: '請先確認正式用藥資訊已整理' });
  }
  return issues;
}

export function validateTaskHandoffDetailsShape(category: TaskCategory, details: unknown): HandoffValidationIssue[] {
  if (!isRecord(details)) return [{ field: 'details', message: '交接資訊格式無效' }];
  const rules = CATEGORY_RULES[category];
  const issues: HandoffValidationIssue[] = [];

  for (const [field, value] of Object.entries(details)) {
    const rule = rules[field];
    if (!rule) {
      issues.push({ field, message: '這個欄位不適用於目前的照顧工作類型' });
      continue;
    }
    if (rule.kind === 'boolean' && typeof value !== 'boolean') issues.push({ field, message: '請選擇是或否' });
    if (rule.kind === 'string' && (typeof value !== 'string' || !value.trim())) issues.push({ field, message: '請輸入有效內容' });
    if (rule.kind === 'enum-string' && (typeof value !== 'string' || !rule.values.includes(value))) {
      issues.push({ field, message: '請選擇有效項目' });
    }
    if (rule.kind === 'string-array') {
      const validArray = Array.isArray(value) && value.length > 0 && value.every((item) => typeof item === 'string' && item.trim().length > 0);
      const allowedValues = !rule.values || (Array.isArray(value) && value.every((item) => typeof item === 'string' && rule.values?.includes(item)));
      if (!validArray || !allowedValues) issues.push({ field, message: '請至少選擇一個有效項目' });
    }
  }

  return issues;
}

export function normalizeTaskHandoffDetails(category: TaskCategory, details: unknown): TaskHandoffDetails {
  if (!isRecord(details)) throw new Error('交接資訊格式無效');
  const normalized: Record<string, unknown> = {};
  for (const [field, rule] of Object.entries(CATEGORY_RULES[category])) {
    const value = details[field];
    if (value === undefined || value === null) continue;
    if (rule.kind === 'boolean') {
      if (typeof value !== 'boolean') throw new Error('請選擇是或否');
      normalized[field] = value;
      continue;
    }
    if (rule.kind === 'string' || rule.kind === 'enum-string') {
      if (typeof value !== 'string') throw new Error('請輸入有效內容');
      const trimmed = value.trim();
      if (!trimmed) continue;
      normalized[field] = trimmed;
      continue;
    }
    if (!Array.isArray(value)) throw new Error('請輸入有效項目');
    const values = [...new Set(value.map((item) => typeof item === 'string' ? item.trim() : '').filter(Boolean))];
    if (values.length) normalized[field] = values;
  }
  const issues = validateTaskHandoffDetailsShape(category, normalized);
  if (issues.length) throw new Error(issues[0].message);
  return normalized as TaskHandoffDetails;
}

export function getHandoffReadiness(
  category: TaskCategory,
  handoff: Pick<TaskHandoffRecordContract, 'details' | 'additional_notes'> | null
): HandoffReadiness {
  if (!handoff) return 'NOT_PREPARED';
  const issues = validateTaskHandoffDetails(category, handoff.details);
  if (category === 'OTHER' && !Object.keys(handoff.details).length && !handoff.additional_notes?.trim()) return 'NEEDS_DETAILS';
  return issues.length ? 'NEEDS_DETAILS' : 'READY_TO_SHARE';
}

export interface HandoffReminderInput {
  updated_at: string;
  reviewed_at: string | null;
  review_interval_days: number | null;
  task: { is_active: boolean; occurrence_pattern: OccurrencePattern };
}

export interface TaskHandoffTaskSemantics {
  category: TaskCategory;
  occurrence_pattern: OccurrencePattern;
  required_support_modes: SupportMode[];
}

export function taskCategoryChangeIsBlockedByHandoff(
  previousCategory: TaskCategory,
  nextCategory: TaskCategory,
  hasHandoff: boolean
) {
  return hasHandoff && previousCategory !== nextCategory;
}

export function taskScheduleOrSupportChangeInvalidatesHandoffReview(
  previous: TaskHandoffTaskSemantics,
  next: TaskHandoffTaskSemantics
) {
  return JSON.stringify(previous.occurrence_pattern) !== JSON.stringify(next.occurrence_pattern)
    || JSON.stringify(previous.required_support_modes) !== JSON.stringify(next.required_support_modes);
}

export function shouldShowHandoffReviewReminder(input: HandoffReminderInput, now = new Date()) {
  if (!input.task.is_active || input.review_interval_days === null || input.review_interval_days <= 0) return false;
  const updatedMs = Date.parse(input.updated_at);
  const reviewedMs = input.reviewed_at ? Date.parse(input.reviewed_at) : Number.NEGATIVE_INFINITY;
  const referenceMs = Math.max(updatedMs, reviewedMs);
  if (!Number.isFinite(referenceMs)) return false;
  const reminderAtMs = referenceMs + input.review_interval_days * 24 * 60 * 60 * 1000;
  if (!Number.isFinite(reminderAtMs) || reminderAtMs > now.getTime()) return false;

  const pattern = input.task.occurrence_pattern;
  if (pattern.type === 'ONCE') {
    const occurrenceMs = Date.parse(`${pattern.date}T${pattern.scheduled_time}:00+08:00`);
    if (!Number.isFinite(occurrenceMs) || occurrenceMs <= now.getTime()) return false;
  }
  return true;
}

export function formatHandoffTimestamp(value: string, includeTime = false) {
  const parsed = new Date(value);
  if (!Number.isFinite(parsed.getTime())) return '時間資料無效';
  return new Intl.DateTimeFormat('zh-TW', {
    timeZone: 'Asia/Taipei',
    year: 'numeric', month: '2-digit', day: '2-digit',
    ...(includeTime ? { hour: '2-digit', minute: '2-digit', hour12: false } : {})
  }).format(parsed);
}

// MVP limitation: reminder and ONCE comparisons use Asia/Taipei (+08:00).
// Reminder intervals are owner preferences, not professional recommendations,
// expiry thresholds, or risk classifications.
