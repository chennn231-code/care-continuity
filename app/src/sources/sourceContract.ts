export const SOURCE_TYPES = ['FAMILY_MEMBER', 'PROFESSIONAL', 'VOLUNTEER', 'OTHER'] as const;

export type SourceType = (typeof SOURCE_TYPES)[number];

export const SOURCE_TYPE_LABELS: Record<SourceType, string> = {
  FAMILY_MEMBER: '家人／親友',
  PROFESSIONAL: '專業照顧服務',
  VOLUNTEER: '志工／社區協助',
  OTHER: '其他'
};

export interface SourceFormValues {
  displayName: string;
  sourceType: SourceType;
  isSelf: boolean;
}

export interface NormalizedSourceInput {
  display_name: string;
  source_type: SourceType;
  user_id?: string;
}

export interface SelfLinkedSource {
  care_source_id: string;
  user_id: string | null;
}

export class SourceValidationError extends Error {}

export function normalizeSourceInput(values: SourceFormValues, sessionUserId: string) {
  const displayName = values.displayName.trim();
  if (!displayName) throw new SourceValidationError('請輸入照顧來源名稱。');
  if (displayName.length > 100) throw new SourceValidationError('照顧來源名稱不可超過 100 個字。');
  if (!SOURCE_TYPES.includes(values.sourceType)) {
    throw new SourceValidationError('請選擇有效的來源類型。');
  }

  return {
    display_name: displayName,
    source_type: values.sourceType,
    ...(values.isSelf ? { user_id: sessionUserId } : {})
  } satisfies NormalizedSourceInput;
}

// MVP frontend invariant only. The database does not yet enforce one linked
// owner source per receiver; household/multi-account support must redesign it.
export function hasAnotherSelfLinkedSource(
  sources: SelfLinkedSource[],
  sessionUserId: string,
  editingSourceId: string | null
) {
  return sources.some(
    (source) => source.user_id === sessionUserId && source.care_source_id !== editingSourceId
  );
}
