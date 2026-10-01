import { Controller, Get, Post, UseGuards } from '@nestjs/common';
import { pool } from '@iwms/db';
import { InventoryService } from '../inventory/inventory.service.js';
import { JwtAuthGuard, RolesGuard } from '../../common/guards.js';
import { Roles } from '../../common/decorators.js';

@Controller()
export class OpsController {
  constructor(private inventoryService: InventoryService) {}

  @Get('health')
  getHealth() {
    return {
      status: 'UP',
      uptime: process.uptime(),
      timestamp: new Date().toISOString(),
    };
  }

  @Get('ready')
  async getReadiness() {
    try {
      await pool.query('SELECT 1');
      return {
        status: 'READY',
        database: 'CONNECTED',
        timestamp: new Date().toISOString(),
      };
    } catch (err: any) {
      return {
        status: 'NOT_READY',
        database: 'DISCONNECTED',
        error: err.message,
      };
    }
  }

  @Post('admin/reconcile')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('ADMIN')
  async triggerReconcile() {
    return this.inventoryService.reconcile();
  }
}
