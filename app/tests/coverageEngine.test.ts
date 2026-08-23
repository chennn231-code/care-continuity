import { describe, expect, it } from 'vitest';
import {
  type BackupAssignment,
  type CareScenario,
  type CareTask,
  type CurrentAssignment,
  evaluateScenario
} from '../engine/coverageEngine';

const SOURCE = {
  me: 'source-me',
  father: 'source-father',
  sister: 'source-sister',
  homeCare: 'source-home-care'
};

const TASK = {
  medication: 'task-medication',
  toileting: 'task-toileting',
  bathing: 'task-bathing',
  medical: 'task-medical'
};

const tasks: CareTask[] = [
  {
    task_id: TASK.medication,
    occurrence_pattern: { type: 'DAILY', time_blocks: ['MORNING', 'EVENING'] },
    required_support_modes: ['ON_SITE']
  },
  {
    task_id: TASK.toileting,
    occurrence_pattern: { type: 'DAILY', time_blocks: ['FLEXIBLE'] },
    required_support_modes: ['ON_SITE']
  },
  {
    task_id: TASK.bathing,
    occurrence_pattern: {
      type: 'WEEKLY',
      weekdays: ['MON', 'WED', 'FRI'],
      time_blocks: ['EVENING']
    },
    required_support_modes: ['ON_SITE']
  },
  {
    task_id: TASK.medical,
    occurrence_pattern: { type: 'AS_NEEDED' },
    required_support_modes: ['ON_SITE']
  }
];

const currents: CurrentAssignment[] = [
  {
    task_id: TASK.medication,
    care_source_id: SOURCE.me,
    participation_type: 'REGULAR',
    time_scope: { mode: 'SAME_AS_TASK_PATTERN' },
    support_modes: ['ON_SITE']
  },
  {
    task_id: TASK.toileting,
    care_source_id: SOURCE.me,
    participation_type: 'REGULAR',
    time_scope: { mode: 'SAME_AS_TASK_PATTERN' },
    support_modes: ['ON_SITE']
  },
  {
    task_id: TASK.toileting,
    care_source_id: SOURCE.father,
    participation_type: 'OCCASIONAL',
    time_scope: null,
    support_modes: ['ON_SITE']
  },
  {
    task_id: TASK.bathing,
    care_source_id: SOURCE.homeCare,
    participation_type: 'REGULAR',
    time_scope: { mode: 'SAME_AS_TASK_PATTERN' },
    support_modes: ['ON_SITE']
  },
  {
    task_id: TASK.medical,
    care_source_id: SOURCE.me,
    participation_type: 'REGULAR',
    time_scope: { mode: 'SAME_AS_TASK_PATTERN' },
    support_modes: ['ON_SITE']
  }
];

const backups: BackupAssignment[] = [
  {
    task_id: TASK.medication,
    care_source_id: SOURCE.father,
    confirmation_status: 'CONFIRMED_WITH_LIMITS',
    time_scope: { time_blocks: ['MORNING'] },
    support_modes_committed: ['ON_SITE']
  },
  {
    task_id: TASK.toileting,
    care_source_id: SOURCE.father,
    confirmation_status: 'POSSIBLE',
    time_scope: null,
    support_modes_committed: []
  },
  {
    task_id: TASK.medical,
    care_source_id: SOURCE.sister,
    confirmation_status: 'CONFIRMED',
    time_scope: null,
    support_modes_committed: ['REMOTE_COORDINATION']
  }
];

const baselineScenario: CareScenario = {
  unavailable_care_source_id: SOURCE.me,
  duration_mode: 'EXPLICIT_RANGE',
  valid_from: '2026-08-25T00:00:00+08:00',
  valid_until: '2026-08-27T23:59:59+08:00'
};

function findDetail(
  result: ReturnType<typeof evaluateScenario>,
  taskId: string,
  date: string | null,
  timeBlock: string
) {
  return result.details.find(
    detail => detail.task_id === taskId && detail.date === date && detail.time_block === timeBlock
  );
}

describe('Graduation Project Golden Test Suite MVP v1.0', () => {
  it('TC-MVP-01: baseline golden fixture', () => {
    const result = evaluateScenario(tasks, baselineScenario, currents, backups);

    expect(result.summary).toEqual({
      covered: 4,
      needs_confirmation: 3,
      unprepared: 3,
      coordination_only: 1
    });

    for (const date of ['2026-08-25', '2026-08-26', '2026-08-27']) {
      expect(findDetail(result, TASK.medication, date, 'MORNING')?.status).toBe('COVERED');
      expect(findDetail(result, TASK.medication, date, 'EVENING')?.status).toBe('UNPREPARED');
      expect(findDetail(result, TASK.toileting, date, 'FLEXIBLE')?.status).toBe('NEEDS_CONFIRMATION');
    }

    expect(findDetail(result, TASK.bathing, '2026-08-26', 'EVENING')?.status).toBe('COVERED');
    expect(findDetail(result, TASK.bathing, '2026-08-25', 'EVENING')).toBeUndefined();
    expect(findDetail(result, TASK.bathing, '2026-08-27', 'EVENING')).toBeUndefined();
    expect(findDetail(result, TASK.medical, null, 'AS_NEEDED')?.status).toBe('COORDINATION_ONLY');
  });

  it('TC-MVP-02: confirmed-with-limits only covers the explicitly confirmed evening', () => {
    const limitedEvening: BackupAssignment = {
      task_id: TASK.medication,
      care_source_id: SOURCE.father,
      confirmation_status: 'CONFIRMED_WITH_LIMITS',
      time_scope: { dates: ['2026-08-25'], time_blocks: ['EVENING'] },
      support_modes_committed: ['ON_SITE']
    };

    const result = evaluateScenario(tasks, baselineScenario, currents, [...backups, limitedEvening]);

    expect(findDetail(result, TASK.medication, '2026-08-25', 'EVENING')?.status).toBe('COVERED');
    expect(findDetail(result, TASK.medication, '2026-08-26', 'EVENING')?.status).toBe('UNPREPARED');
    expect(findDetail(result, TASK.medication, '2026-08-27', 'EVENING')?.status).toBe('UNPREPARED');
  });

  it('TC-MVP-03: unavailable filter does not remove an independent professional care source', () => {
    const fatherUnavailable: CareScenario = {
      ...baselineScenario,
      unavailable_care_source_id: SOURCE.father
    };

    const result = evaluateScenario(tasks, fatherUnavailable, currents, backups);

    expect(findDetail(result, TASK.bathing, '2026-08-26', 'EVENING')).toMatchObject({
      status: 'COVERED',
      source_id: SOURCE.homeCare,
      reason: 'CURRENT_REGULAR_MATCH'
    });
  });

  it('TC-MVP-04: UI action state is outside the engine input boundary', () => {
    const before = evaluateScenario(tasks, baselineScenario, currents, backups);

    // UI workflow state intentionally never enters evaluateScenario(...).
    const uiActionStatus = 'WAITING_RESPONSE';
    expect(uiActionStatus).toBe('WAITING_RESPONSE');

    const after = evaluateScenario(tasks, baselineScenario, currents, backups);
    expect(after).toEqual(before);
    expect(findDetail(after, TASK.medication, '2026-08-25', 'EVENING')?.status).toBe('UNPREPARED');
  });
});
