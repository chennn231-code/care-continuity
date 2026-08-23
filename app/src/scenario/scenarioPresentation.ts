import type { OccurrenceEvaluation } from '../../engine/coverageEngine';

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
