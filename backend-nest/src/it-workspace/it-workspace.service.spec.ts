import { BadRequestException, NotFoundException } from '@nestjs/common';
import { ItWorkspaceService } from './it-workspace.service';
import { DatabaseService } from '../database/database.service';
import { ScoreService } from '../score/score.service';
import type { RequestUser } from '../common/request-user';

const testUser: RequestUser = {
  id: 'usr_test_001',
  name: 'Test User',
  email: 'test@spoton.test',
  role: 'intern',
};

function makeWorkItemRow(overrides: Partial<any> = {}) {
  return {
    id: 'wi_test',
    title: 'Test Item',
    description: 'A test item',
    type: 'bug',
    status: 'qa',
    priority: 'high',
    assignee: null,
    due_date: null,
    created_by: 'Test User',
    created_at: '2026-01-01T00:00:00.000Z',
    updated_at: '2026-01-01T00:00:00.000Z',
    ...overrides,
  };
}

describe('ItWorkspaceService - QA readiness gate', () => {
  let service: ItWorkspaceService;
  let db: { query: jest.Mock };
  let score: { awardForEntity: jest.Mock };

  beforeEach(() => {
    db = { query: jest.fn() };
    score = { awardForEntity: jest.fn().mockResolvedValue({ id: 'score_1' }) };
    service = new ItWorkspaceService(db as unknown as DatabaseService, score as unknown as ScoreService);
  });

  it('blocks ready_for_release when the work item has zero QA checks', async () => {
    const item = makeWorkItemRow({ status: 'qa' });

    db.query
      .mockResolvedValueOnce({ rows: [item] })
      .mockResolvedValueOnce({ rows: [] });

    await expect(
      service.updateWorkItem(item.id, { status: 'ready_for_release' } as any, testUser),
    ).rejects.toThrow(BadRequestException);
  });

  it('blocks ready_for_release when QA checks exist but are not all passed', async () => {
    const item = makeWorkItemRow({ status: 'qa' });

    db.query
      .mockResolvedValueOnce({ rows: [item] })
      .mockResolvedValueOnce({ rows: [{ status: 'passed' }, { status: 'pending' }] });

    await expect(
      service.updateWorkItem(item.id, { status: 'ready_for_release' } as any, testUser),
    ).rejects.toThrow(/1\/2 QA checks have passed/i);
  });

  it('allows ready_for_release when all QA checks have passed', async () => {
    const item = makeWorkItemRow({ status: 'qa' });
    const updatedItem = makeWorkItemRow({ status: 'ready_for_release' });

    db.query
      .mockResolvedValueOnce({ rows: [item] })
      .mockResolvedValueOnce({ rows: [{ status: 'passed' }, { status: 'passed' }] })
      .mockResolvedValueOnce({ rows: [updatedItem] })
      .mockResolvedValueOnce({ rows: [] });

    const result = await service.updateWorkItem(item.id, { status: 'ready_for_release' } as any, testUser);

    expect(result.status).toBe('ready_for_release');
    expect(score.awardForEntity).toHaveBeenCalledWith(testUser.id, 'ready_for_release', 'work_item', item.id, 2);
  });

  it('rejects an invalid state transition before ever checking QA', async () => {
    const item = makeWorkItemRow({ status: 'backlog' });
    db.query.mockResolvedValueOnce({ rows: [item] });

    await expect(
      service.updateWorkItem(item.id, { status: 'released' } as any, testUser),
    ).rejects.toThrow(/Cannot transition work item from 'backlog' to 'released'/);

    expect(db.query).toHaveBeenCalledTimes(1);
  });

  it('throws NotFoundException when the work item does not exist', async () => {
    db.query.mockResolvedValueOnce({ rows: [] });

    await expect(
      service.updateWorkItem('wi_does_not_exist', { status: 'planned' } as any, testUser),
    ).rejects.toThrow(NotFoundException);
  });
});

describe('ItWorkspaceService - release linking and deployment rules', () => {
  let service: ItWorkspaceService;
  let db: { query: jest.Mock };
  let score: { awardForEntity: jest.Mock };

  beforeEach(() => {
    db = { query: jest.fn() };
    score = { awardForEntity: jest.fn().mockResolvedValue({ id: 'score_1' }) };
    service = new ItWorkspaceService(db as unknown as DatabaseService, score as unknown as ScoreService);
  });

  function makeReleaseRow(overrides: Partial<any> = {}) {
    return {
      id: 'rel_test',
      version: 'v1.0.0',
      release_date: null,
      summary: 'Test release',
      deployment_status: 'draft',
      created_at: '2026-01-01T00:00:00.000Z',
      updated_at: '2026-01-01T00:00:00.000Z',
      ...overrides,
    };
  }

  it('rejects linking a work item that is not ready_for_release', async () => {
    const release = makeReleaseRow();
    const item = makeWorkItemRow({ status: 'in_progress' });

    db.query
      .mockResolvedValueOnce({ rows: [release] })
      .mockResolvedValueOnce({ rows: [] })
      .mockResolvedValueOnce({ rows: [item] });

    await expect(service.linkWorkItem(release.id, item.id)).rejects.toThrow(
      /Only work items with status 'ready_for_release' can be linked/,
    );
  });

  it('rejects linking to a release that is already deployed', async () => {
    const release = makeReleaseRow({ deployment_status: 'deployed' });

    db.query
      .mockResolvedValueOnce({ rows: [release] })
      .mockResolvedValueOnce({ rows: [] });

    await expect(service.linkWorkItem(release.id, 'wi_anything')).rejects.toThrow(
      /already been deployed/,
    );
  });

  it('rejects deploying a release that is already deployed', async () => {
    const release = makeReleaseRow({ deployment_status: 'deployed' });

    db.query
      .mockResolvedValueOnce({ rows: [release] })
      .mockResolvedValueOnce({ rows: [{ id: 'wi_1' }] });

    await expect(service.deployRelease(release.id, testUser)).rejects.toThrow(
      /This release has already been deployed/,
    );

    expect(score.awardForEntity).not.toHaveBeenCalled();
  });

  it('rejects deploying a release with zero linked work items', async () => {
    const release = makeReleaseRow({ deployment_status: 'draft' });

    db.query
      .mockResolvedValueOnce({ rows: [release] })
      .mockResolvedValueOnce({ rows: [] });

    await expect(service.deployRelease(release.id, testUser)).rejects.toThrow(
      /Cannot deploy a release with no linked work items/,
    );
  });
});

describe('ItWorkspaceService - score idempotency for QA check completion', () => {
  let service: ItWorkspaceService;
  let db: { query: jest.Mock };
  let score: { awardForEntity: jest.Mock };

  beforeEach(() => {
    db = { query: jest.fn() };
    score = { awardForEntity: jest.fn().mockResolvedValue({ id: 'score_1' }) };
    service = new ItWorkspaceService(db as unknown as DatabaseService, score as unknown as ScoreService);
  });

  it('awards points the first time a QA check is marked passed', async () => {
    const current = { id: 'qa_1', work_item_id: 'wi_1', status: 'pending' };
    const updated = { id: 'qa_1', work_item_id: 'wi_1', status: 'passed' };

    db.query
      .mockResolvedValueOnce({ rows: [current] })
      .mockResolvedValueOnce({ rows: [updated] });

    await service.updateQaCheck('qa_1', { status: 'passed' } as any, testUser);

    expect(score.awardForEntity).toHaveBeenCalledWith(testUser.id, 'complete_qa_check', 'qa_check', 'qa_1', 1);
  });

  it('does NOT award points again if the QA check is already passed', async () => {
    const current = { id: 'qa_1', work_item_id: 'wi_1', status: 'passed' };
    const updated = { id: 'qa_1', work_item_id: 'wi_1', status: 'passed', notes: 'updated note' };

    db.query
      .mockResolvedValueOnce({ rows: [current] })
      .mockResolvedValueOnce({ rows: [updated] });

    await service.updateQaCheck('qa_1', { status: 'passed', notes: 'updated note' } as any, testUser);

    expect(score.awardForEntity).not.toHaveBeenCalled();
  });
});