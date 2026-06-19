import { Injectable } from '@nestjs/common';
import { DatabaseService } from '../database/database.service';
import { generateId } from '../common/id';
import type { RequestUser } from '../common/request-user';

@Injectable()
export class ScoreService {
  constructor(private readonly db: DatabaseService) {}

  async summaryFor(user: RequestUser) {
    const result = await this.db.query(
      `SELECT id, action, points, created_at FROM score_events WHERE user_id = $1 ORDER BY created_at DESC`,
      [user.id],
    );
    const total = result.rows.reduce((sum: number, row: any) => sum + Number(row.points), 0);
    return {
      total,
      events: result.rows.map((row: any) => ({
        id: row.id,
        action: row.action,
        points: row.points,
        createdAt: row.created_at,
      })),
    };
  }
  
  async awardForEntity(userId: string, action: string, entityType: string, entityId: string, points: number) {
    const id = generateId('score');
    const result = await this.db.query(
      `INSERT INTO score_events (id, user_id, action, entity_type, entity_id, points)
       VALUES ($1, $2, $3, $4, $5, $6)
       ON CONFLICT (action, entity_type, entity_id) DO NOTHING
       RETURNING *`,
      [id, userId, action, entityType, entityId, points],
    );
    return result.rows[0] ?? null;
  }

  async award(user: RequestUser, action: string, points: number) {
    const id = generateId('score');
    const result = await this.db.query(
      `INSERT INTO score_events (id, user_id, action, entity_type, entity_id, points)
       VALUES ($1, $2, $3, $4, $5, $6)
       RETURNING *`,
      [id, user.id, action, 'manual', id, points],
    );
    return result.rows[0];
  }
}