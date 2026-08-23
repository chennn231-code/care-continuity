import type { OccurrenceEvaluation } from '../../engine/coverageEngine';
import {
  getHandoffReadiness,
  type HandoffReadiness,
  type TaskHandoffRecordContract
} from '../handoffs/handoffContract';
import type { CareTaskRow } from '../lib/careTasks';
import { listTaskHandoffs } from '../lib/taskHandoffs';

export interface ScenarioHandoffPresentation {
  taskId: string;
  readiness: HandoffReadiness;
  updatedAt: string | null;
  reviewedAt: string | null;
}

export type ScenarioHandoffSummary = Record<HandoffReadiness, number>;

export interface ScenarioOccurrencePresentation {
  coverageStatus: OccurrenceEvaluation['status'];
  handoffReadiness: HandoffReadiness;
}

export function combineScenarioOccurrencePresentation(
  occurrence: Pick<OccurrenceEvaluation, 'status'>,
  handoff: ScenarioHandoffPresentation
): ScenarioOccurrencePresentation {
  return { coverageStatus: occurrence.status, handoffReadiness: handoff.readiness };
}

export async function loadScenarioHandoffs(
  tasks: Pick<CareTaskRow, 'task_id' | 'category'>[],
  loader: typeof listTaskHandoffs = listTaskHandoffs
) {
  try {
    return { handoffs: await loader(tasks), failed: false as const };
  } catch (error) {
    console.error('Unable to load scenario handoff data', error);
    return { handoffs: [] as TaskHandoffRecordContract[], failed: true as const };
  }
}

export function buildScenarioHandoffPresentation(
  task: Pick<CareTaskRow, 'task_id' | 'category'>,
  handoff: TaskHandoffRecordContract | null
): ScenarioHandoffPresentation {
  return {
    taskId: task.task_id,
    readiness: getHandoffReadiness(task.category, handoff),
    updatedAt: handoff?.updated_at ?? null,
    reviewedAt: handoff?.reviewed_at ?? null
  };
}

export function summarizeScenarioHandoffs(
  taskIds: Iterable<string>,
  presentationByTask: ReadonlyMap<string, ScenarioHandoffPresentation>
): ScenarioHandoffSummary {
  const summary: ScenarioHandoffSummary = { NOT_PREPARED: 0, NEEDS_DETAILS: 0, READY_TO_SHARE: 0 };
  for (const taskId of new Set(taskIds)) {
    const presentation = presentationByTask.get(taskId);
    if (presentation) summary[presentation.readiness] += 1;
  }
  return summary;
}

export const SCENARIO_HANDOFF_CTA_LABELS: Record<HandoffReadiness, string> = {
  NOT_PREPARED: '整理交接資訊',
  NEEDS_DETAILS: '補充交接資訊',
  READY_TO_SHARE: '查看交接資訊'
};

export function describeScenarioSources(
  item: OccurrenceEvaluation,
  sourceById: ReadonlyMap<string, string>,
  onMissing?: (sourceId: string) => void
) {
  const ids = item.status === 'COVERED'
    ? (item.source_ids?.length ? item.source_ids : [item.source_id])
    : item.status === 'NEEDS_CONFIRMATION'
      ? item.candidate_ids ?? []
      : item.status === 'COORDINATION_ONLY'
        ? [item.source_id]
        : [];
  const names = [...new Set(ids.filter((id): id is string => Boolean(id)))].map((id) => {
    const name = sourceById.get(id);
    if (!name) onMissing?.(id);
    return name ?? '未命名照顧來源';
  });

  if (item.status === 'COVERED') return `可持續來源：${names.join('、') || '未命名照顧來源'}`;
  if (item.status === 'NEEDS_CONFIRMATION') return `待確認：${names.join('、') || '未命名照顧來源'}`;
  if (item.status === 'COORDINATION_ONLY') return `可提供遠端協調：${names.join('、') || '未命名照顧來源'}`;
  return '目前沒有可確認的照顧來源';
}
