export const V2_GUARDED_CASE_ROUTE_SUFFIXES = [
  '',
  'timeline',
  'updates/new',
  'actions',
  'circle',
  'records',
  'records/new',
  'records/:recordId',
  'records/:recordId/correct'
] as const;

export type V2GuardedCaseRouteSuffix = typeof V2_GUARDED_CASE_ROUTE_SUFFIXES[number];
