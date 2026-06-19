import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { DatabaseService } from '../database/database.service';
import { generateId } from '../common/id';
import { isValidTransition } from './work-item-transitions';
import { CreateWorkItemDto } from './dto/create-work-item.dto';
import { UpdateWorkItemDto } from './dto/update-work-item.dto';
import { QueryWorkItemsDto } from './dto/query-work-items.dto';

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

  async updateWorkItem(id: string, dto: UpdateWorkItemDto, changedBy: string) {
    const current = await this.getWorkItem(id);

    // Validate status transition before touching anything
    if (dto.status !== undefined && dto.status !== current.status) {
      if (!isValidTransition(current.status, dto.status)) {
        throw new BadRequestException(
          `Cannot transition work item from '${current.status}' to '${dto.status}'`,
        );
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

    // Log status change to history, only if status actually changed
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
    await this.getWorkItem(id); // throws 404 if missing
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
}