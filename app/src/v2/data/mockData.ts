import type { ProfessionalType, PrototypeState } from '../types/prototype';

export const DEMO_ROLE_LABELS = {
  FAMILY: '家屬',
  DAY_CARE: '日照人員',
  NURSE: '護理人員'
} as const;

export const SHARING_SCOPE_LABELS = {
  AUTHOR_ONLY: '僅作者',
  SHARED_CARE: '共同照顧',
  FAMILY_ONLY: '僅家庭',
  DIRECT_PARTICIPANTS: '直接參與者'
} as const;

export const IDENTITY_TYPE_LABELS = {
  SELF: '長者本人',
  FAMILY: '家屬／家庭照顧者',
  PROFESSIONAL: '專業照顧人員'
} as const;

export const VERIFICATION_STATUS_LABELS = {
  DECLARED: '已登錄，尚未驗證',
  PENDING_VERIFICATION: '驗證中',
  VERIFIED: '已驗證',
  REJECTED: '驗證未通過',
  EXPIRED: '驗證已失效'
} as const;

export const PROFESSIONAL_TYPE_OPTIONS: Array<{
  value: ProfessionalType;
  category: string;
  label: string;
  description: string;
}> = [
  { value: 'CASE_MANAGER', category: '個案協調與資源連結', label: '個案管理員／A單位個管員', description: '協調服務、連結資源並追蹤個案照顧安排' },
  { value: 'CARE_WORKER', category: '第一線生活照顧', label: '照顧服務員', description: '依服務內容提供日常生活照顧與支持' },
  { value: 'NURSE', category: '醫療與護理', label: '護理師', description: '依專業職責提供護理評估、照護與衛教' },
  { value: 'PHYSICIAN', category: '醫療與護理', label: '醫師', description: '依專業職責提供診療與醫療建議' },
  { value: 'PHYSICAL_THERAPIST', category: '復能與功能維持', label: '物理治療師', description: '協助動作、移動與身體功能的評估及訓練' },
  { value: 'OCCUPATIONAL_THERAPIST', category: '復能與功能維持', label: '職能治療師', description: '協助日常活動能力、環境與輔具調整' },
  { value: 'SPEECH_THERAPIST', category: '復能與功能維持', label: '語言治療師', description: '協助溝通、語言及吞嚥相關功能' },
  { value: 'DIETITIAN', category: '營養、心理與社會支持', label: '營養師', description: '依專業評估提供飲食與營養支持' },
  { value: 'PSYCHOLOGIST', category: '營養、心理與社會支持', label: '心理師', description: '提供心理評估與心理支持服務' },
  { value: 'SOCIAL_WORKER', category: '營養、心理與社會支持', label: '社會工作人員', description: '協助社會資源、家庭支持與服務協調' }
];

export const INITIAL_PROTOTYPE_STATE: PrototypeState = {
  activeRole: 'FAMILY',
  identities: [{ id: 'demo-identity-family', identityType: 'FAMILY', professionalType: null, verificationStatus: 'VERIFIED', isPrimary: true }],
  identityDraft: { mode: 'PRIMARY', identityType: null, professionalType: null },
  memberships: [{ id: 'demo-membership-family', identityId: 'demo-identity-family', caseId: 'demo-case', relationship: 'FAMILY_MEMBER', status: 'ACTIVE', validUntil: null }],
  roleGrants: [{
    id: 'demo-grant-family', membershipId: 'demo-membership-family', actingRole: 'FAMILY', purpose: '家庭共同照顧',
    sharingScopes: ['SHARED_CARE', 'FAMILY_ONLY', 'DIRECT_PARTICIPANTS'], capabilities: ['VIEW_SHARED_CARE', 'ADD_UPDATE', 'RESOLVE_QUESTION'], validUntil: null
  }],
  successMessage: null,
  timeline: [
    {
      id: 'update-observation-original',
      kind: 'OBSERVATION',
      summary: '沐浴時注意到右手臂有一小片泛紅，長輩表示沒有疼痛',
      occurredAt: '2026-08-24T10:10:00+08:00',
      recordedAt: '2026-08-24T10:25:00+08:00',
      authorRole: 'DAY_CARE',
      source: '日照中心沐浴協助紀錄',
      sharingScope: 'SHARED_CARE',
      version: 1,
      hasUpdatedVersion: true,
      isCurrentVersion: false
    },
    {
      id: 'update-observation-current',
      kind: 'OBSERVATION',
      summary: '更正：沐浴時注意到左手臂有一小片泛紅，長輩表示沒有疼痛',
      occurredAt: '2026-08-24T10:10:00+08:00',
      recordedAt: '2026-08-24T10:42:00+08:00',
      authorRole: 'DAY_CARE',
      source: '日照中心沐浴協助紀錄',
      sharingScope: 'SHARED_CARE',
      version: 2,
      supersedesId: 'update-observation-original',
      hasUpdatedVersion: false,
      isCurrentVersion: true
    },
    {
      id: 'question-skin',
      kind: 'QUESTION',
      summary: '家裡昨晚沒有注意到泛紅，想請護理人員協助看看是否需要持續觀察',
      occurredAt: '2026-08-24T11:05:00+08:00',
      recordedAt: '2026-08-24T11:05:00+08:00',
      authorRole: 'FAMILY',
      source: '家屬提問',
      sharingScope: 'DIRECT_PARTICIPANTS',
      participantRoles: ['FAMILY', 'NURSE'],
      version: 1,
      hasUpdatedVersion: false,
      isCurrentVersion: true
    },
    {
      id: 'answer-skin',
      kind: 'ANSWER',
      summary: '已收到，下午服務時會依目前可見狀況協助觀察並回覆家屬',
      occurredAt: '2026-08-24T11:30:00+08:00',
      recordedAt: '2026-08-24T11:30:00+08:00',
      authorRole: 'NURSE',
      source: '護理人員回覆',
      sharingScope: 'DIRECT_PARTICIPANTS',
      participantRoles: ['FAMILY', 'NURSE'],
      version: 1,
      hasUpdatedVersion: false,
      isCurrentVersion: true
    },
    {
      id: 'action-assigned',
      kind: 'ACTION_EVENT',
      summary: '已指派「服務時協助觀察手臂泛紅情況」給護理人員，等待本人接受',
      occurredAt: '2026-08-24T11:35:00+08:00',
      recordedAt: '2026-08-24T11:35:00+08:00',
      authorRole: 'FAMILY',
      source: '處理事項狀態',
      sharingScope: 'DIRECT_PARTICIPANTS',
      participantRoles: ['FAMILY', 'NURSE'],
      version: 1,
      hasUpdatedVersion: false,
      isCurrentVersion: true
    },
    {
      id: 'family-private-note',
      kind: 'OBSERVATION',
      summary: '週末將由家人陪同，先確認是否需要調整接送時間',
      occurredAt: '2026-08-24T19:00:00+08:00',
      recordedAt: '2026-08-24T19:10:00+08:00',
      authorRole: 'FAMILY',
      source: '家庭照顧備忘',
      sharingScope: 'FAMILY_ONLY',
      version: 1,
      hasUpdatedVersion: false,
      isCurrentVersion: true
    }
  ],
  actions: [
    {
      id: 'action-skin-check',
      title: '服務時協助觀察手臂泛紅情況',
      detail: '依現場可見狀況回覆家屬，不作診斷或醫囑',
      assigneeRole: 'NURSE',
      assigneeName: '陳護理師',
      dueAt: '2026-08-25T17:00:00+08:00',
      status: 'PENDING_ACCEPTANCE',
      linkedQuestionId: 'skin-question'
    },
    {
      id: 'action-meal-followup',
      title: '整理下週餐點取得方式',
      detail: '與家人確認送餐日後更新共同照顧摘要',
      assigneeRole: 'FAMILY',
      assigneeName: '林怡君',
      dueAt: '2026-08-28T18:00:00+08:00',
      status: 'IN_PROGRESS',
      linkedQuestionId: 'meal-question'
    }
  ],
  questions: [
    {
      id: 'skin-question',
      text: '手臂泛紅是否需要持續觀察？',
      status: 'ANSWERED',
      askedBy: '林怡君',
      answer: '護理人員已回覆會於服務時協助觀察'
    },
    {
      id: 'meal-question',
      text: '下週一的午餐由誰準備？',
      status: 'OPEN',
      askedBy: '林怡君'
    }
  ],
  members: [
    {
      id: 'member-family', name: '林怡君', role: 'FAMILY', relationship: '女兒',
      purpose: '家庭照顧協作', scopeSummary: '家庭限定與共同照顧內容',
      validFrom: '2026-08-01', validUntil: null, status: 'ACTIVE'
    },
    {
      id: 'member-day-care', name: '王照服員', role: 'DAY_CARE', relationship: '日照服務人員',
      purpose: '日照服務期間的照顧交接', scopeSummary: '共同照顧與直接參與內容',
      validFrom: '2026-08-01', validUntil: '2026-11-01', status: 'ACTIVE'
    },
    {
      id: 'member-nurse', name: '陳護理師', role: 'NURSE', relationship: '居家護理人員',
      purpose: '指定問題與處理事項', scopeSummary: '共同照顧與直接參與內容',
      validFrom: '2026-08-15', validUntil: '2026-09-05', status: 'EXPIRING'
    }
  ]
};
