import { Injectable, OnModuleInit, OnModuleDestroy } from '@nestjs/common';
import { Pool } from 'pg';
import * as fs from 'fs';
import * as path from 'path';

@Injectable()
export class DatabaseService implements OnModuleInit, OnModuleDestroy {
  public pool: Pool;

  async onModuleInit() {
    this.pool = new Pool({
      connectionString: process.env.DATABASE_URL,
    });

    const schemaPath = path.join(__dirname, 'schema.sql');
    const schema = fs.readFileSync(schemaPath, 'utf-8');
    await this.pool.query(schema);
    console.log('Database schema ensured.');
  }

  async query(text: string, params?: any[]) {
    return this.pool.query(text, params);
  }

  async onModuleDestroy() {
    await this.pool.end();
  }
}