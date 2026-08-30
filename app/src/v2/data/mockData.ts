import type { ActionStatus, ProfessionalType, PrototypeState, QuestionStatus } from '../types/prototype';

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

export const ACTION_STATUS_LABELS: Record<ActionStatus, string> = {
  PENDING_ACCEPTANCE: '等待接受', ACCEPTED: '已接受', IN_PROGRESS: '處理中', COMPLETED: '已完成',
  DECLINED: '已拒絕', NEEDS_REASSIGNMENT: '需要重新指派', CANCELLED: '已取消'
};

export const QUESTION_STATUS_LABELS: Record<QuestionStatus, string> = {
  OPEN: '待回覆', ANSWERED: '已回覆／待確認解決', RESOLVED: '已解決'
};

export const PROFESSIONAL_TYPE_OPTIONS: Array<{
  value: ProfessionalType;
  category: string;
  label: string;
}> = [
  { value: 'CASE_MANAGER', category: '個案協調與資源連結', label: '個案管理員／A單位個管員' },
  { value: 'CARE_WORKER', category: '第一線生活照顧', label: '照顧服務員' },
  { value: 'NURSE', category: '醫療與護理', label: '護理師' },
  { value: 'PHYSICIAN', category: '醫療與護理', label: '醫師' },
  { value: 'PHYSICAL_THERAPIST', category: '復能與功能維持', label: '物理治療師' },
  { value: 'OCCUPATIONAL_THERAPIST', category: '復能與功能維持', label: '職能治療師' },
  { value: 'SPEECH_THERAPIST', category: '復能與功能維持', label: '語言治療師' },
  { value: 'DIETITIAN', category: '營養、心理與社會支持', label: '營養師' },
  { value: 'PSYCHOLOGIST', category: '營養、心理與社會支持', label: '心理師' },
  { value: 'SOCIAL_WORKER', category: '營養、心理與社會支持', label: '社會工作人員' }
];

export const PROFESSIONAL_VERIFICATION_HINT = '需完成相應身分及資格驗證後才能開通相關權限';

export const INITIAL_PROTOTYPE_STATE: PrototypeState = {
  currentAccountId: 'demo-account',
  demoActorSelections: {
    'demo-case': { participant: { identityId: 'demo-identity-family', membershipId: 'demo-membership-family' }, displayRole: 'FAMILY' },
    'river-case': { participant: { identityId: 'demo-identity-nurse', membershipId: 'demo-membership-river' }, displayRole: 'NURSE' },
    'future-case': { participant: { identityId: 'demo-identity-nurse', membershipId: 'demo-membership-future' }, displayRole: 'NURSE' },
    'sun-case': { participant: { identityId: 'demo-identity-sun-manager', membershipId: 'demo-membership-sun-manager' }, displayRole: 'FAMILY' }
  },
  activeRole: 'FAMILY',
  identities: [
    { id: 'demo-identity-family', accountId: 'demo-account', identityType: 'FAMILY', professionalType: null, verificationStatus: 'VERIFIED', isPrimary: true },
    { id: 'demo-identity-nurse', accountId: 'demo-account', identityType: 'PROFESSIONAL', professionalType: 'NURSE', verificationStatus: 'VERIFIED', isPrimary: false },
    { id: 'demo-identity-day-care', accountId: 'demo-account', identityType: 'PROFESSIONAL', professionalType: 'CARE_WORKER', verificationStatus: 'VERIFIED', isPrimary: false },
    { id: 'demo-identity-invited-nurse', accountId: 'invited-nurse-account', identityType: 'PROFESSIONAL', professionalType: 'NURSE', verificationStatus: 'PENDING_VERIFICATION', isPrimary: false },
    { id: 'demo-identity-sun-manager', accountId: 'sun-manager-account', identityType: 'FAMILY', professionalType: null, verificationStatus: 'VERIFIED', isPrimary: true }
  ],
  identityDraft: { mode: 'PRIMARY', identityType: null, professionalType: null },
  memberships: [
    { id: 'demo-membership-family', identityId: 'demo-identity-family', caseId: 'demo-case', relationship: 'FAMILY_MEMBER', status: 'ACTIVE', validUntil: null },
    { id: 'demo-membership-nurse', identityId: 'demo-identity-nurse', caseId: 'demo-case', relationship: 'PROFESSIONAL_SERVICE', status: 'ACTIVE', validUntil: '2026-11-30' },
    { id: 'demo-membership-day-care', identityId: 'demo-identity-day-care', caseId: 'demo-case', relationship: 'PROFESSIONAL_SERVICE', status: 'ACTIVE', validUntil: '2026-11-01' },
    { id: 'demo-membership-river', identityId: 'demo-identity-nurse', caseId: 'river-case', relationship: 'PROFESSIONAL_SERVICE', status: 'ACTIVE', validUntil: '2026-09-05' },
    { id: 'demo-membership-future', identityId: 'demo-identity-nurse', caseId: 'future-case', relationship: 'PROFESSIONAL_SERVICE', status: 'WAITING_START', validUntil: '2026-11-30' },
    { id: 'demo-membership-sun-manager', identityId: 'demo-identity-sun-manager', caseId: 'sun-case', relationship: 'FAMILY_MEMBER', status: 'ACTIVE', validUntil: null }
  ],
  roleGrants: [
    {
      id: 'demo-grant-family', membershipId: 'demo-membership-family', actingRole: 'FAMILY', purpose: '家庭共同照顧',
      targetScopes: ['CASE', 'RECORD'], sharingScopes: ['SHARED_CARE', 'FAMILY_ONLY', 'DIRECT_PARTICIPANTS'], capabilities: ['RECORD_VIEW', 'CARE_UPDATE_CREATE', 'QUESTION_RESOLVE', 'ACCESS_INVITE', 'ACCESS_REVOKE', 'ACTION_CREATE', 'ACTION_ASSIGN', 'ACTION_REASSIGN', 'ACTION_ACCEPT', 'ACTION_START', 'ACTION_COMPLETE'], validUntil: null
    },
    {
      id: 'demo-grant-nurse', membershipId: 'demo-membership-nurse', actingRole: 'NURSE', purpose: '日照護理服務紀錄與交接', startsAt: '2026-08-01',
      targetScopes: ['CASE', 'RECORD'], sharingScopes: ['AUTHOR_ONLY', 'SHARED_CARE', 'DIRECT_PARTICIPANTS'], capabilities: ['RECORD_VIEW', 'CARE_UPDATE_CREATE', 'CREATE_PROFESSIONAL_RECORD', 'ACTION_ACCEPT', 'ACTION_START', 'ACTION_COMPLETE'], validUntil: '2026-11-30'
    },
    {
      id: 'demo-grant-day-care', membershipId: 'demo-membership-day-care', actingRole: 'DAY_CARE', purpose: '日照服務期間的照顧交接', startsAt: '2026-08-01',
      targetScopes: ['CASE', 'RECORD'], sharingScopes: ['SHARED_CARE', 'DIRECT_PARTICIPANTS'], capabilities: ['RECORD_VIEW', 'CARE_UPDATE_CREATE', 'ACTION_ACCEPT', 'ACTION_START', 'ACTION_COMPLETE'], validUntil: '2026-11-01'
    },
    {
      id: 'demo-grant-river', membershipId: 'demo-membership-river', actingRole: 'NURSE', purpose: '居家護理服務與協作管理', startsAt: '2026-08-15',
      targetScopes: ['CASE', 'RECORD'], sharingScopes: ['SHARED_CARE', 'DIRECT_PARTICIPANTS'], capabilities: ['RECORD_VIEW', 'CARE_UPDATE_CREATE', 'ACCESS_INVITE', 'ACCESS_REVOKE', 'ACTION_REASSIGN'], validUntil: '2026-09-05'
    },
    {
      id: 'demo-grant-future', membershipId: 'demo-membership-future', actingRole: 'NURSE', purpose: '日照護理服務', startsAt: '2026-09-01',
      targetScopes: ['CASE', 'RECORD'], sharingScopes: ['SHARED_CARE', 'DIRECT_PARTICIPANTS'], capabilities: ['RECORD_VIEW', 'CARE_UPDATE_CREATE'], validUntil: '2026-11-30'
    },
    {
      id: 'demo-grant-sun-manager', membershipId: 'demo-membership-sun-manager', actingRole: 'FAMILY', purpose: '家庭個案協作管理',
      targetScopes: ['CASE', 'RECORD'], sharingScopes: ['SHARED_CARE', 'DIRECT_PARTICIPANTS'], capabilities: ['RECORD_VIEW', 'CARE_UPDATE_CREATE', 'ACCESS_INVITE', 'ACCESS_REVOKE', 'ACTION_CREATE', 'ACTION_ASSIGN', 'ACTION_REASSIGN', 'QUESTION_RESOLVE'], validUntil: null
    }
  ],
  successMessage: null,
  lastInvitationId: null,
  invitationSessionIds: [],
  readCursors: [],
  invitations: [
    {
      id: 'invite-family-ready', previousInvitationId: null, caseId: 'harbor-case', caseDisplayName: '王奶奶', maskedCaseDisplayName: '王○○長輩', inviterName: '王家協作管理者',
      recipientType: 'FAMILY', recipientEmailHint: 'd***@example.invalid', roleLabel: '家屬／家庭照顧者', purpose: '家庭照顧協作', scopeSummary: '共同照顧與家庭限定資訊',
      proposedTargetScopes: ['CASE', 'RECORD'], proposedSharingScopes: ['SHARED_CARE', 'FAMILY_ONLY', 'DIRECT_PARTICIPANTS'], proposedCapabilities: ['RECORD_VIEW', 'CARE_UPDATE_CREATE', 'QUESTION_RESOLVE', 'ACTION_CREATE', 'ACTION_ASSIGN', 'ACTION_ACCEPT', 'ACTION_START', 'ACTION_COMPLETE'],
      serviceStartsAt: '2026-08-25', serviceEndsAt: '2027-08-24', expiresAt: '2026-09-01T23:59:59+08:00', status: 'INVITED', recipientIdentityId: 'demo-identity-family',
      credentialId: 'credential-family-ready', linkRepresentation: 'https://winwin.example.invalid/invite/DEMO-FAMILY-READY', codeRepresentation: 'DEMO-FAMILY-READY'
    },
    {
      id: 'invite-professional-pending', previousInvitationId: null, caseId: 'sun-case', caseDisplayName: '陳爺爺', maskedCaseDisplayName: '陳○○長輩', inviterName: '陳家協作管理者',
      recipientType: 'PROFESSIONAL', recipientEmailHint: 'n***@example.invalid', roleLabel: '護理師', purpose: '皮膚狀況追蹤與護理建議', scopeSummary: '共同照顧與直接參與事項',
      proposedTargetScopes: ['CASE', 'RECORD'], proposedSharingScopes: ['SHARED_CARE', 'DIRECT_PARTICIPANTS'], proposedCapabilities: ['RECORD_VIEW', 'CARE_UPDATE_CREATE', 'CREATE_PROFESSIONAL_RECORD', 'ACTION_ACCEPT', 'ACTION_START', 'ACTION_COMPLETE'],
      serviceStartsAt: '2026-08-25', serviceEndsAt: '2026-11-30', expiresAt: '2026-09-02T23:59:59+08:00', status: 'INVITED', recipientIdentityId: 'demo-identity-invited-nurse',
      credentialId: 'credential-professional-pending', linkRepresentation: 'https://winwin.example.invalid/invite/DEMO-NURSE-PENDING', codeRepresentation: 'DEMO-NURSE-PENDING'
    },
    {
      id: 'invite-expired', previousInvitationId: null, caseId: 'expired-case', caseDisplayName: '周奶奶', maskedCaseDisplayName: '周○○長輩', inviterName: '周家協作管理者',
      recipientType: 'FAMILY', recipientEmailHint: 'f***@example.invalid', roleLabel: '家屬／家庭照顧者', purpose: '家庭照顧協作', scopeSummary: '共同照顧資訊',
      proposedTargetScopes: ['CASE', 'RECORD'], proposedSharingScopes: ['SHARED_CARE'], proposedCapabilities: ['RECORD_VIEW', 'CARE_UPDATE_CREATE'],
      serviceStartsAt: '2026-08-01', serviceEndsAt: '2027-07-31', expiresAt: '2026-08-20T23:59:59+08:00', status: 'INVITED', recipientIdentityId: 'demo-identity-family',
      credentialId: 'credential-expired', linkRepresentation: 'https://winwin.example.invalid/invite/DEMO-EXPIRED', codeRepresentation: 'DEMO-EXPIRED'
    }
  ],
  workspaceCases: [
    { id: 'demo-case', displayName: '林奶奶', relationshipLabel: '家屬／家庭照顧者', serviceSource: '家庭照顧', serviceStartsAt: '2026-08-01', serviceEndsAt: null, accessStatus: 'ACTIVE', visibleActionCount: 2, lastVisibleUpdateLabel: '今天 11:35' },
    { id: 'river-case', displayName: '吳爺爺', relationshipLabel: '居家護理師', serviceSource: '安心居家護理所（虛構）', serviceStartsAt: '2026-08-15', serviceEndsAt: '2026-09-05', accessStatus: 'EXPIRING', visibleActionCount: 1, lastVisibleUpdateLabel: '昨天 16:20' },
    { id: 'future-case', displayName: '許奶奶', relationshipLabel: '護理師', serviceSource: '安心日照（虛構）', serviceStartsAt: '2026-09-01', serviceEndsAt: '2026-11-30', accessStatus: 'WAITING_START', visibleActionCount: 0, lastVisibleUpdateLabel: '' }
  ],
  privateTags: [
    { id: 'tag-day-care', label: '安心日照', color: 'MIST' },
    { id: 'tag-this-week', label: '本週追蹤', color: 'SUN' },
    { id: 'tag-home-nursing', label: '居家護理', color: 'SAGE' }
  ],
  privateTagAssignments: [
    { caseId: 'demo-case', tagId: 'tag-this-week' },
    { caseId: 'river-case', tagId: 'tag-home-nursing' },
    { caseId: 'river-case', tagId: 'tag-this-week' }
  ],
  responsibilityHistory: [
    {
      id: 'responsibility-history-river', caseId: 'river-case', actionId: 'action-river-followup', formerAssigneeName: '前任護理師',
      formerAssignee: { identityId: 'demo-identity-nurse', membershipId: 'demo-membership-river' },
      formerAssigneeDisplayRole: 'NURSE', previousStatus: 'IN_PROGRESS', endedAt: '2026-08-24T17:00:00+08:00', activitySequence: 1, reason: 'SERVICE_EXPIRED', summary: '原負責人因服務到期而結束責任週期'
    }
  ],
  responsibilityCycles: [
    {
      id: 'responsibility-cycle-skin', actionId: 'action-skin-check', caseId: 'demo-case',
      assignee: { identityId: 'demo-identity-nurse', membershipId: 'demo-membership-nurse' }, assignedBy: { identityId: 'demo-identity-family', membershipId: 'demo-membership-family' }, status: 'ASSIGNED', endedAt: null
    },
    {
      id: 'responsibility-cycle-meal', actionId: 'action-meal-followup', caseId: 'demo-case',
      assignee: { identityId: 'demo-identity-family', membershipId: 'demo-membership-family' }, assignedBy: { identityId: 'demo-identity-family', membershipId: 'demo-membership-family' }, status: 'IN_PROGRESS', endedAt: null
    }
  ],
  actionStatusHistory: [],
  professionalRecordVersions: [
    {
      id: 'professional-record-demo-existing-v1', recordId: 'professional-record-demo-existing', caseId: 'demo-case', versionNumber: 1,
      authorName: '陳護理師', actingRole: 'NURSE', purpose: '日照護理服務紀錄與交接', sharingScope: 'SHARED_CARE',
      author: { identityId: 'demo-identity-nurse', membershipId: 'demo-membership-nurse' },
      occurredAt: '2026-08-24T14:00:00+08:00', recordedAt: '2026-08-24T14:35:00+08:00', publishedAt: '2026-08-24T14:35:00+08:00',
      activitySequence: 6,
      content: {
        serviceDate: '2026-08-24', startedAt: '14:00', endedAt: '14:30', serviceLocation: '安心日照（虛構）',
        subjectReport: '長輩表示手臂沒有疼痛，願意配合查看。',
        objectiveObservation: '左前臂可見約硬幣大小的局部泛紅；觀察時未見破皮或滲液。',
        assessmentSummary: '依本次可見狀況記錄，持續觀察外觀變化；本段不作醫療診斷。',
        serviceProvided: '協助清潔周邊皮膚並提醒避免抓揉，已向家屬說明本次客觀觀察。',
        followUpPlan: '下次服務時再次觀察外觀，如有明顯變化由家屬依需要尋求醫療專業協助。',
        followUpDueDate: '2026-08-26',
        professionalOnlyNotes: '虛構專業工作備註：後續紀錄時維持相同觀察位置描述。'
      }
    }
  ],
  timeline: [
    {
      id: 'update-observation-original',
      caseId: 'demo-case',
      kind: 'OBSERVATION',
      summary: '沐浴時注意到右手臂有一小片泛紅，長輩表示沒有疼痛',
      occurredAt: '2026-08-24T10:10:00+08:00',
      recordedAt: '2026-08-24T10:25:00+08:00',
      author: { identityId: 'demo-identity-day-care', membershipId: 'demo-membership-day-care' },
      authorDisplayRole: 'DAY_CARE',
      source: '日照中心沐浴協助紀錄',
      sharingScope: 'SHARED_CARE',
      activitySequence: 1,
      version: 1,
      hasUpdatedVersion: true,
      isCurrentVersion: false
    },
    {
      id: 'update-observation-current',
      caseId: 'demo-case',
      kind: 'OBSERVATION',
      summary: '更正：沐浴時注意到左手臂有一小片泛紅，長輩表示沒有疼痛',
      occurredAt: '2026-08-24T10:10:00+08:00',
      recordedAt: '2026-08-24T10:42:00+08:00',
      author: { identityId: 'demo-identity-day-care', membershipId: 'demo-membership-day-care' },
      authorDisplayRole: 'DAY_CARE',
      source: '日照中心沐浴協助紀錄',
      sharingScope: 'SHARED_CARE',
      activitySequence: 2,
      version: 2,
      supersedesId: 'update-observation-original',
      hasUpdatedVersion: false,
      isCurrentVersion: true
    },
    {
      id: 'question-skin',
      caseId: 'demo-case',
      kind: 'QUESTION',
      summary: '家裡昨晚沒有注意到泛紅，想請護理人員協助看看是否需要持續觀察',
      occurredAt: '2026-08-24T11:05:00+08:00',
      recordedAt: '2026-08-24T11:05:00+08:00',
      author: { identityId: 'demo-identity-family', membershipId: 'demo-membership-family' },
      authorDisplayRole: 'FAMILY',
      source: '家屬提問',
      sharingScope: 'DIRECT_PARTICIPANTS',
      participantRefs: [
        { identityId: 'demo-identity-family', membershipId: 'demo-membership-family' },
        { identityId: 'demo-identity-nurse', membershipId: 'demo-membership-nurse' }
      ],
      participantDisplayRoles: ['FAMILY', 'NURSE'],
      activitySequence: 3,
      version: 1,
      hasUpdatedVersion: false,
      isCurrentVersion: true
    },
    {
      id: 'answer-skin',
      caseId: 'demo-case',
      kind: 'ANSWER',
      summary: '已收到，下午服務時會依目前可見狀況協助觀察並回覆家屬',
      occurredAt: '2026-08-24T11:30:00+08:00',
      recordedAt: '2026-08-24T11:30:00+08:00',
      author: { identityId: 'demo-identity-nurse', membershipId: 'demo-membership-nurse' },
      authorDisplayRole: 'NURSE',
      source: '護理人員回覆',
      sharingScope: 'DIRECT_PARTICIPANTS',
      participantRefs: [
        { identityId: 'demo-identity-family', membershipId: 'demo-membership-family' },
        { identityId: 'demo-identity-nurse', membershipId: 'demo-membership-nurse' }
      ],
      participantDisplayRoles: ['FAMILY', 'NURSE'],
      activitySequence: 4,
      version: 1,
      hasUpdatedVersion: false,
      isCurrentVersion: true
    },
    {
      id: 'action-assigned',
      caseId: 'demo-case',
      kind: 'ACTION_EVENT',
      summary: '已指派「服務時協助觀察手臂泛紅情況」給護理人員，等待本人接受',
      occurredAt: '2026-08-24T11:35:00+08:00',
      recordedAt: '2026-08-24T11:35:00+08:00',
      author: { identityId: 'demo-identity-family', membershipId: 'demo-membership-family' },
      authorDisplayRole: 'FAMILY',
      source: '處理事項狀態',
      sharingScope: 'DIRECT_PARTICIPANTS',
      participantRefs: [
        { identityId: 'demo-identity-family', membershipId: 'demo-membership-family' },
        { identityId: 'demo-identity-nurse', membershipId: 'demo-membership-nurse' }
      ],
      participantDisplayRoles: ['FAMILY', 'NURSE'],
      activitySequence: 5,
      version: 1,
      hasUpdatedVersion: false,
      isCurrentVersion: true
    },
    {
      id: 'family-private-note',
      caseId: 'demo-case',
      kind: 'OBSERVATION',
      summary: '週末將由家人陪同，先確認是否需要調整接送時間',
      occurredAt: '2026-08-24T19:00:00+08:00',
      recordedAt: '2026-08-24T19:10:00+08:00',
      author: { identityId: 'demo-identity-family', membershipId: 'demo-membership-family' },
      authorDisplayRole: 'FAMILY',
      source: '家庭照顧備忘',
      sharingScope: 'FAMILY_ONLY',
      activitySequence: 7,
      version: 1,
      hasUpdatedVersion: false,
      isCurrentVersion: true
    }
  ],
  actions: [
    {
      id: 'action-skin-check',
      caseId: 'demo-case',
      title: '服務時協助觀察手臂泛紅情況',
      detail: '依現場可見狀況回覆家屬，不作診斷或醫囑',
      creator: { identityId: 'demo-identity-family', membershipId: 'demo-membership-family' },
      dueAt: '2026-08-25T17:00:00+08:00',
      status: 'PENDING_ACCEPTANCE',
      linkedQuestionId: 'skin-question'
    },
    {
      id: 'action-meal-followup',
      caseId: 'demo-case',
      title: '整理下週餐點取得方式',
      detail: '與家人確認送餐日後更新共同照顧摘要',
      creator: { identityId: 'demo-identity-family', membershipId: 'demo-membership-family' },
      dueAt: '2026-08-28T18:00:00+08:00',
      status: 'IN_PROGRESS',
      linkedQuestionId: 'meal-question'
    },
    {
      id: 'action-river-followup',
      caseId: 'river-case',
      title: '確認下次護理服務交接窗口',
      detail: '原負責人的服務期間已結束，等待協作管理者重新指派',
      creator: { identityId: 'demo-identity-nurse', membershipId: 'demo-membership-river' },
      dueAt: '2026-08-29T17:00:00+08:00',
      status: 'NEEDS_REASSIGNMENT',
      linkedQuestionId: 'skin-question'
    }
  ],
  questions: [
    {
      id: 'skin-question',
      caseId: 'demo-case',
      sourceTimelineEntryId: 'question-skin',
      text: '手臂泛紅是否需要持續觀察？',
      status: 'ANSWERED',
      askedBy: '林怡君',
      author: { identityId: 'demo-identity-family', membershipId: 'demo-membership-family' },
      answer: '護理人員已回覆會於服務時協助觀察'
    },
    {
      id: 'meal-question',
      caseId: 'demo-case',
      sourceTimelineEntryId: 'family-private-note',
      text: '下週一的午餐由誰準備？',
      status: 'OPEN',
      askedBy: '林怡君'
      , author: { identityId: 'demo-identity-family', membershipId: 'demo-membership-family' }
    }
  ],
  members: [
    {
      id: 'member-family', caseId: 'demo-case', name: '林怡君', role: 'FAMILY', participant: { identityId: 'demo-identity-family', membershipId: 'demo-membership-family' }, relationship: '女兒',
      purpose: '家庭照顧協作', scopeSummary: '家庭限定與共同照顧內容',
      validFrom: '2026-08-01', validUntil: null, status: 'ACTIVE'
    },
    {
      id: 'member-day-care', caseId: 'demo-case', name: '王照服員', role: 'DAY_CARE', participant: { identityId: 'demo-identity-day-care', membershipId: 'demo-membership-day-care' }, relationship: '日照服務人員',
      purpose: '日照服務期間的照顧交接', scopeSummary: '共同照顧與直接參與內容',
      validFrom: '2026-08-01', validUntil: '2026-11-01', status: 'ACTIVE'
    },
    {
      id: 'member-nurse', caseId: 'demo-case', name: '陳護理師', role: 'NURSE', participant: { identityId: 'demo-identity-nurse', membershipId: 'demo-membership-nurse' }, relationship: '居家護理人員',
      purpose: '指定問題與處理事項', scopeSummary: '共同照顧與直接參與內容',
      validFrom: '2026-08-15', validUntil: '2026-09-05', status: 'EXPIRING'
    }
  ]
};
