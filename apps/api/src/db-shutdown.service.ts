import { Injectable, OnApplicationShutdown } from '@nestjs/common';
import { pool } from '@iwms/db';

@Injectable()
export class DbShutdownService implements OnApplicationShutdown {
  async onApplicationShutdown(_signal?: string): Promise<void> {
    await pool.end();
  }
}
