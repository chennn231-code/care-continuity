import {
  evaluateScenario,
  type BackupAssignment,
  type CareScenario,
  type CareTask,
  type CoverageEvaluationResult,
  type CurrentAssignment
} from '../../engine/coverageEngine';
import type { CareSourceRow } from '../lib/careSources';
import type { CareTaskRow } from '../lib/careTasks';
import type { CurrentAssignmentRow } from '../lib/currentAssignments';
import type { BackupAssignmentRow } from '../lib/backupAssignments';
import { isValidCalendarDate, isValidScheduledTime, SUPPORT_MODES, WEEKDAYS } from '../tasks/taskContract';

export const SCENARIO_DURATIONS = [24, 72, 168] as const;
export type ScenarioDurationHours = (typeof SCENARIO_DURATIONS)[number];
export class ScenarioContractError extends Error {
  constructor(public code: 'SELF_SOURCE_MISSING' | 'SELF_SOURCE_AMBIGUOUS' | 'INVALID_DATA' | 'INVALID_START', message: string) {
    super(message);
  }
}

function assertTask(task: CareTaskRow): CareTask {
  const pattern = task.occurrence_pattern;
  if (pattern.type === 'AS_NEEDED') return { task_id: task.task_id, occurrence_pattern: { type: 'AS_NEEDED' }, required_support_modes: task.required_support_modes };
  if (pattern.type === 'ONCE') {
    if (!isValidCalendarDate(pattern.date) || !isValidScheduledTime(pattern.scheduled_time)) {
      throw new ScenarioContractError('INVALID_DATA', `照顧工作「${task.title}」的特定日期或時間無效`);
    }
    return { task_id: task.task_id, occurrence_pattern: pattern, required_support_modes: task.required_support_modes };
  }
  if (!pattern.scheduled_times.length || pattern.scheduled_times.some((time) => !isValidScheduledTime(time))) {
    throw new ScenarioContractError('INVALID_DATA', `照顧工作「${task.title}」的時間資料無效`);
  }
  if (pattern.type === 'WEEKLY' && (!pattern.weekdays.length || pattern.weekdays.some((day) => !WEEKDAYS.includes(day)))) {
    throw new ScenarioContractError('INVALID_DATA', `照顧工作「${task.title}」的每週日期資料無效`);
  }
  return { task_id: task.task_id, occurrence_pattern: pattern, required_support_modes: task.required_support_modes };
}

function assertAssignment(row: CurrentAssignmentRow, tasksById: Map<string, CareTaskRow>): CurrentAssignment {
  const task = tasksById.get(row.task_id);
  if (!task) throw new ScenarioContractError('INVALID_DATA', '照顧分工指向不存在的工作');
  const scope = row.time_scope;
  if (!scope || (!('mode' in scope) && !scope.weekdays?.length && !scope.scheduled_times?.length)) {
    throw new ScenarioContractError('INVALID_DATA', '照顧分工缺少有效的負責時間範圍');
  }
  if ('mode' in scope && scope.mode !== 'SAME_AS_TASK_PATTERN') throw new ScenarioContractError('INVALID_DATA', '照顧分工的完整時間範圍無效');
  if (!('mode' in scope)) {
    if (task.occurrence_pattern.type === 'AS_NEEDED' || task.occurrence_pattern.type === 'ONCE') throw new ScenarioContractError('INVALID_DATA', '視需要或特定日期工作只能使用完整負責範圍');
    const allowedTimes = new Set(task.occurrence_pattern.scheduled_times);
    if (scope.scheduled_times?.some((time) => !isValidScheduledTime(time) || !allowedTimes.has(time))) throw new ScenarioContractError('INVALID_DATA', '照顧分工包含不屬於工作的時間');
    if (scope.weekdays && task.occurrence_pattern.type !== 'WEEKLY') throw new ScenarioContractError('INVALID_DATA', '每日工作不可限制每週日期');
    if (scope.weekdays && task.occurrence_pattern.type === 'WEEKLY') {
      const allowedDays = new Set(task.occurrence_pattern.weekdays);
      if (scope.weekdays.some((day) => !allowedDays.has(day))) throw new ScenarioContractError('INVALID_DATA', '照顧分工包含不屬於工作的日期');
    }
  }
  return { task_id: row.task_id, care_source_id: row.care_source_id, participation_type: row.participation_type, time_scope: scope, support_modes: row.support_modes };
}

function assertBackup(row: BackupAssignmentRow, tasksById: Map<string, CareTaskRow>): BackupAssignment {
  const task = tasksById.get(row.task_id);
  if (!task) throw new ScenarioContractError('INVALID_DATA', '備援安排指向不存在的工作');
  if (row.support_modes_committed.some((mode) => !SUPPORT_MODES.includes(mode))) throw new ScenarioContractError('INVALID_DATA', '備援安排包含無效的協助形式');
  if (row.confirmation_status === 'POSSIBLE') {
    if (row.time_scope !== null || row.support_modes_committed.length !== 0) throw new ScenarioContractError('INVALID_DATA', '待確認備援不是 canonical POSSIBLE 資料');
    return { task_id: row.task_id, care_source_id: row.care_source_id, confirmation_status: 'POSSIBLE', time_scope: null, support_modes_committed: [] };
  }
  if (!row.support_modes_committed.length) throw new ScenarioContractError('INVALID_DATA', '已確認備援缺少協助形式');
  if (row.confirmation_status === 'CONFIRMED') {
    if (!row.time_scope || !('mode' in row.time_scope) || row.time_scope.mode !== 'SAME_AS_TASK_PATTERN') throw new ScenarioContractError('INVALID_DATA', '完整接手備援缺少 canonical 時間範圍');
    return { task_id: row.task_id, care_source_id: row.care_source_id, confirmation_status: 'CONFIRMED', time_scope: row.time_scope, support_modes_committed: row.support_modes_committed };
  }
  const scope = row.time_scope;
  if (!scope || 'mode' in scope || (!scope.weekdays?.length && !scope.scheduled_times?.length)) throw new ScenarioContractError('INVALID_DATA', '有條件備援缺少有效限制');
  if (task.occurrence_pattern.type === 'AS_NEEDED' || task.occurrence_pattern.type === 'ONCE') throw new ScenarioContractError('INVALID_DATA', '視需要或特定日期工作不能使用限定時間備援');
  const pattern = task.occurrence_pattern;
  if (scope.scheduled_times?.some((time) => !isValidScheduledTime(time) || !pattern.scheduled_times.includes(time))) throw new ScenarioContractError('INVALID_DATA', '備援安排包含不屬於工作的時間');
  if (scope.weekdays && pattern.type !== 'WEEKLY') throw new ScenarioContractError('INVALID_DATA', '每日工作備援不可限制每週日期');
  if (scope.weekdays && pattern.type === 'WEEKLY' && scope.weekdays.some((day) => !pattern.weekdays.includes(day))) throw new ScenarioContractError('INVALID_DATA', '備援安排包含不屬於工作的日期');
  return { task_id: row.task_id, care_source_id: row.care_source_id, confirmation_status: 'CONFIRMED_WITH_LIMITS', time_scope: scope, support_modes_committed: row.support_modes_committed };
}

function offsetTimestamp(localValue: string) {
  if (!/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}$/.test(localValue) || !isValidCalendarDate(localValue.slice(0, 10)) || !isValidScheduledTime(localValue.slice(11))) {
    throw new ScenarioContractError('INVALID_START', '請選擇有效的日期與時間');
  }
  const timestamp = `${localValue}:00+08:00`;
  if (!Number.isFinite(Date.parse(timestamp))) throw new ScenarioContractError('INVALID_START', '請選擇有效的開始日期與時間');
  return timestamp;
}
function taipeiTimestamp(epochMs: number) {
  return `${new Date(epochMs + 8 * 60 * 60 * 1000).toISOString().slice(0, 19)}+08:00`;
}

export function buildScenarioInterval(startLocal: string, durationHours: ScenarioDurationHours) {
  if (!SCENARIO_DURATIONS.includes(durationHours)) throw new ScenarioContractError('INVALID_START', '請選擇有效的模擬期間');
  const valid_from = offsetTimestamp(startLocal);
  const valid_until = taipeiTimestamp(Date.parse(valid_from) + durationHours * 60 * 60 * 1000);
  return { valid_from, valid_until };
}

export function buildCustomScenarioInterval(startLocal: string, endLocal: string) {
  const valid_from = offsetTimestamp(startLocal);
  const valid_until = offsetTimestamp(endLocal);
  const durationHours = (Date.parse(valid_until) - Date.parse(valid_from)) / 3_600_000;
  if (durationHours <= 0) throw new ScenarioContractError('INVALID_START', '結束時間必須晚於開始時間');
  if (durationHours > 168) throw new ScenarioContractError('INVALID_START', '自訂期間最長為 7 天');
  return { valid_from, valid_until };
}

export function describeScenarioInterval(interval: { valid_from: string; valid_until: string }) {
  const format = (value: string) => value.slice(0, 16).replace('T', ' ').replaceAll('-', '/');
  return {
    start: format(interval.valid_from),
    end: format(interval.valid_until),
    durationHours: (Date.parse(interval.valid_until) - Date.parse(interval.valid_from)) / 3_600_000
  };
}

export function defaultScenarioStart(now = new Date()) {
  const taipei = new Date(now.getTime() + 8 * 60 * 60 * 1000);
  taipei.setUTCDate(taipei.getUTCDate() + 1);
  return `${taipei.toISOString().slice(0, 10)}T08:00`;
}

export interface RunScenarioInput {
  tasks: CareTaskRow[];
  assignments: CurrentAssignmentRow[];
  backups: BackupAssignmentRow[];
  sources: CareSourceRow[];
  authenticatedUserId: string;
  startLocal: string;
  durationHours?: ScenarioDurationHours;
  endLocal?: string;
}

export function runPrimaryCaregiverScenario(input: RunScenarioInput): CoverageEvaluationResult {
  const selfSources = input.sources.filter((source) => source.user_id === input.authenticatedUserId);
  if (!selfSources.length) throw new ScenarioContractError('SELF_SOURCE_MISSING', '尚未設定「主要照顧者本人」，請先回到照顧來源設定');
  if (selfSources.length > 1) throw new ScenarioContractError('SELF_SOURCE_AMBIGUOUS', '找到多個主要照顧者本人來源，請先整理照顧來源');
  const tasksById = new Map(input.tasks.map((task) => [task.task_id, task]));
  const tasks = input.tasks.map(assertTask);
  const assignments = input.assignments.map((assignment) => assertAssignment(assignment, tasksById));
  const backups = input.backups.map((backup) => assertBackup(backup, tasksById));
  const interval = input.endLocal
    ? buildCustomScenarioInterval(input.startLocal, input.endLocal)
    : buildScenarioInterval(input.startLocal, input.durationHours ?? 24);
  const scenario: CareScenario = {
    unavailable_care_source_id: selfSources[0].care_source_id,
    duration_mode: 'EXPLICIT_RANGE',
    ...interval
  };
  return evaluateScenario(tasks, scenario, assignments, backups);
}

export const SCENARIO_STATUS_LABELS = {
  COVERED: '已有目前照顧安排可持續',
  NEEDS_CONFIRMATION: '可能有人可協助，但需要再確認',
  UNPREPARED: '目前沒有可確認的照顧安排',
  COORDINATION_ONLY: '目前只有遠端協調，仍需安排現場協助'
} as const;
