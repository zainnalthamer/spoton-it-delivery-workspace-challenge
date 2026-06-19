import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { DatabaseService } from '../database/database.service';
import { generateId } from '../common/id';
import { isValidTransition } from './work-item-transitions';
import { CreateWorkItemDto } from './dto/create-work-item.dto';
import { UpdateWorkItemDto } from './dto/update-work-item.dto';
import { QueryWorkItemsDto } from './dto/query-work-items.dto';
import { CreateQaCheckDto } from './dto/create-qa-check.dto';
import { UpdateQaCheckDto } from './dto/update-qa-check.dto';
import { CreateReleaseDto } from './dto/create-release.dto';
import { UpdateReleaseDto } from './dto/update-release.dto';

@Injectable()
export class ItWorkspaceService {
  constructor(private readonly db: DatabaseService) {}

  async summary() {
    const result = await this.db.query(`
      SELECT
        (SELECT COUNT(*) FROM work_items) AS work_items,
        (SELECT COUNT(*) FROM qa_checks) AS qa_checks,
        (SELECT COUNT(*) FROM releases) AS releases
    `);
    const row = result.rows[0];
    return {
      message: 'IT Delivery Workspace',
      counts: {
        workItems: Number(row.work_items),
        qaChecks: Number(row.qa_checks),
        releases: Number(row.releases),
      },
    };
  }

  async createWorkItem(dto: CreateWorkItemDto, createdBy: string) {
    const id = generateId('wi');
    const result = await this.db.query(
      `INSERT INTO work_items (id, title, description, type, priority, assignee, due_date, created_by)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
       RETURNING *`,
      [id, dto.title, dto.description, dto.type, dto.priority, dto.assignee ?? null, dto.dueDate ?? null, createdBy],
    );
    return result.rows[0];
  }

  async listWorkItems(query: QueryWorkItemsDto, currentUserName: string) {
    const conditions: string[] = [];
    const params: any[] = [];

    if (query.status) {
      params.push(query.status);
      conditions.push(`status = $${params.length}`);
    }
    if (query.priority) {
      params.push(query.priority);
      conditions.push(`priority = $${params.length}`);
    }
    if (query.assignee) {
      params.push(query.assignee);
      conditions.push(`assignee = $${params.length}`);
    }
    if (query.mine === 'true') {
      params.push(currentUserName);
      conditions.push(`assignee = $${params.length}`);
    }
    if (query.search) {
      params.push(`%${query.search}%`);
      conditions.push(`(title ILIKE $${params.length} OR description ILIKE $${params.length})`);
    }

    const where = conditions.length ? `WHERE ${conditions.join(' AND ')}` : '';
    const result = await this.db.query(
      `SELECT * FROM work_items ${where} ORDER BY created_at DESC`,
      params,
    );
    return result.rows;
  }

  async getWorkItem(id: string) {
    const result = await this.db.query('SELECT * FROM work_items WHERE id = $1', [id]);
    if (result.rows.length === 0) {
      throw new NotFoundException(`Work item ${id} not found`);
    }
    return result.rows[0];
  }

  private async isQaReady(workItemId: string): Promise<{ ready: boolean; total: number; passed: number }> {
    const result = await this.db.query(
      `SELECT status FROM qa_checks WHERE work_item_id = $1`,
      [workItemId],
    );
    const total = result.rows.length;
    const passed = result.rows.filter((r: any) => r.status === 'passed').length;
    return { ready: total > 0 && passed === total, total, passed };
  }

  async updateWorkItem(id: string, dto: UpdateWorkItemDto, changedBy: string) {
    const current = await this.getWorkItem(id);

    if (dto.status !== undefined && dto.status !== current.status) {
      if (!isValidTransition(current.status, dto.status)) {
        throw new BadRequestException(
          `Cannot transition work item from '${current.status}' to '${dto.status}'`,
        );
      }

      if (dto.status === 'ready_for_release') {
        const qa = await this.isQaReady(id);
        if (!qa.ready) {
          throw new BadRequestException(
            qa.total === 0
              ? 'Cannot mark work item ready for release: no QA checks have been added yet'
              : `Cannot mark work item ready for release: ${qa.passed}/${qa.total} QA checks have passed (all must pass)`,
          );
        }
      }
    }

    const fields: string[] = [];
    const params: any[] = [];

    const fieldMap: Record<string, any> = {
      title: dto.title,
      description: dto.description,
      type: dto.type,
      status: dto.status,
      priority: dto.priority,
      assignee: dto.assignee,
      due_date: dto.dueDate,
    };

    for (const [column, value] of Object.entries(fieldMap)) {
      if (value !== undefined) {
        params.push(value);
        fields.push(`${column} = $${params.length}`);
      }
    }

    if (fields.length === 0) {
      return current;
    }

    fields.push(`updated_at = now()`);
    params.push(id);

    const result = await this.db.query(
      `UPDATE work_items SET ${fields.join(', ')} WHERE id = $${params.length} RETURNING *`,
      params,
    );
    const updated = result.rows[0];

    if (dto.status !== undefined && dto.status !== current.status) {
      await this.db.query(
        `INSERT INTO work_item_history (id, work_item_id, from_status, to_status, changed_by)
         VALUES ($1, $2, $3, $4, $5)`,
        [generateId('wih'), id, current.status, dto.status, changedBy],
      );
    }

    return updated;
  }

  async getWorkItemHistory(id: string) {
    await this.getWorkItem(id);
    const result = await this.db.query(
      `SELECT * FROM work_item_history WHERE work_item_id = $1 ORDER BY changed_at ASC`,
      [id],
    );
    return result.rows;
  }

  async deleteWorkItem(id: string) {
    await this.getWorkItem(id);
    await this.db.query('DELETE FROM work_items WHERE id = $1', [id]);
    return { deleted: true, id };
  }

  async createQaCheck(workItemId: string, dto: CreateQaCheckDto) {
    await this.getWorkItem(workItemId); // 404 if work item missing
    const id = generateId('qa');
    const result = await this.db.query(
      `INSERT INTO qa_checks (id, work_item_id, test_title, expected_result, tester)
       VALUES ($1, $2, $3, $4, $5)
       RETURNING *`,
      [id, workItemId, dto.testTitle, dto.expectedResult, dto.tester ?? null],
    );
    return result.rows[0];
  }

  async listQaChecks(workItemId: string) {
    await this.getWorkItem(workItemId);
    const result = await this.db.query(
      `SELECT * FROM qa_checks WHERE work_item_id = $1 ORDER BY created_at ASC`,
      [workItemId],
    );
    return result.rows;
  }

  async getQaCheck(id: string) {
    const result = await this.db.query('SELECT * FROM qa_checks WHERE id = $1', [id]);
    if (result.rows.length === 0) {
      throw new NotFoundException(`QA check ${id} not found`);
    }
    return result.rows[0];
  }

  async updateQaCheck(id: string, dto: UpdateQaCheckDto) {
    await this.getQaCheck(id);

    const fields: string[] = [];
    const params: any[] = [];

    const fieldMap: Record<string, any> = {
      test_title: dto.testTitle,
      expected_result: dto.expectedResult,
      actual_result: dto.actualResult,
      status: dto.status,
      tester: dto.tester,
      notes: dto.notes,
    };

    for (const [column, value] of Object.entries(fieldMap)) {
      if (value !== undefined) {
        params.push(value);
        fields.push(`${column} = $${params.length}`);
      }
    }

    if (fields.length === 0) {
      return this.getQaCheck(id);
    }

    fields.push(`updated_at = now()`);
    params.push(id);

    const result = await this.db.query(
      `UPDATE qa_checks SET ${fields.join(', ')} WHERE id = $${params.length} RETURNING *`,
      params,
    );
    return result.rows[0];
  }

  async deleteQaCheck(id: string) {
    await this.getQaCheck(id);
    await this.db.query('DELETE FROM qa_checks WHERE id = $1', [id]);
    return { deleted: true, id };
  }

  async createRelease(dto: CreateReleaseDto) {
    const id = generateId('rel');
    const result = await this.db.query(
      `INSERT INTO releases (id, version, release_date, summary)
       VALUES ($1, $2, $3, $4)
       RETURNING *`,
      [id, dto.version, dto.releaseDate ?? null, dto.summary ?? null],
    );
    return result.rows[0];
  }

  async listReleases() {
    const result = await this.db.query(`SELECT * FROM releases ORDER BY created_at DESC`);
    return result.rows;
  }

  async getRelease(id: string) {
    const result = await this.db.query('SELECT * FROM releases WHERE id = $1', [id]);
    if (result.rows.length === 0) {
      throw new NotFoundException(`Release ${id} not found`);
    }
    const linked = await this.db.query(
      `SELECT wi.* FROM work_items wi
       JOIN release_work_items rwi ON rwi.work_item_id = wi.id
       WHERE rwi.release_id = $1
       ORDER BY rwi.linked_at ASC`,
      [id],
    );
    return { ...result.rows[0], linkedWorkItems: linked.rows };
  }

  async updateRelease(id: string, dto: UpdateReleaseDto) {
    await this.getRelease(id);

    const fields: string[] = [];
    const params: any[] = [];
    const fieldMap: Record<string, any> = {
      version: dto.version,
      release_date: dto.releaseDate,
      summary: dto.summary,
    };
    for (const [column, value] of Object.entries(fieldMap)) {
      if (value !== undefined) {
        params.push(value);
        fields.push(`${column} = $${params.length}`);
      }
    }
    if (fields.length === 0) return this.getRelease(id);

    fields.push(`updated_at = now()`);
    params.push(id);
    const result = await this.db.query(
      `UPDATE releases SET ${fields.join(', ')} WHERE id = $${params.length} RETURNING *`,
      params,
    );
    return result.rows[0];
  }

  async linkWorkItem(releaseId: string, workItemId: string) {
    const release = await this.getRelease(releaseId);
    if (release.deployment_status === 'deployed') {
      throw new BadRequestException('Cannot link work items to a release that has already been deployed');
    }

    const workItem = await this.getWorkItem(workItemId);
    if (workItem.status !== 'ready_for_release') {
      throw new BadRequestException(
        `Only work items with status 'ready_for_release' can be linked to a release (this item is '${workItem.status}')`,
      );
    }

    await this.db.query(
      `INSERT INTO release_work_items (release_id, work_item_id)
       VALUES ($1, $2)
       ON CONFLICT (release_id, work_item_id) DO NOTHING`,
      [releaseId, workItemId],
    );
    return this.getRelease(releaseId);
  }

  async unlinkWorkItem(releaseId: string, workItemId: string) {
    await this.getRelease(releaseId);
    await this.db.query(
      `DELETE FROM release_work_items WHERE release_id = $1 AND work_item_id = $2`,
      [releaseId, workItemId],
    );
    return this.getRelease(releaseId);
  }

  async deployRelease(id: string, deployedBy: string) {
    const release = await this.getRelease(id);

    if (release.deployment_status === 'deployed') {
      throw new BadRequestException('This release has already been deployed');
    }

    if (release.linkedWorkItems.length === 0) {
      throw new BadRequestException('Cannot deploy a release with no linked work items');
    }

    await this.db.query(
      `UPDATE releases SET deployment_status = 'deployed', updated_at = now() WHERE id = $1`,
      [id],
    );

    for (const item of release.linkedWorkItems) {
      await this.db.query(
        `UPDATE work_items SET status = 'released', updated_at = now() WHERE id = $1`,
        [item.id],
      );
      await this.db.query(
        `INSERT INTO work_item_history (id, work_item_id, from_status, to_status, changed_by)
         VALUES ($1, $2, $3, $4, $5)`,
        [generateId('wih'), item.id, item.status, 'released', deployedBy],
      );
    }

    return this.getRelease(id);
  }
}