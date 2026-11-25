import { Controller, Get, HttpStatus, Post, Res, UseGuards } from '@nestjs/common';
import { SkipThrottle } from '@nestjs/throttler';
import { Response } from 'express';
import { pool } from '@iwms/db';
import { InventoryService } from '../inventory/inventory.service.js';
import { JwtAuthGuard, RolesGuard } from '../../common/guards.js';
import { Roles } from '../../common/decorators.js';

@Controller()
export class OpsController {
  constructor(private inventoryService: InventoryService) {}

  @SkipThrottle()
  @Get('health')
  getHealth() {
    return {
      status: 'UP',
      uptime: process.uptime(),
      timestamp: new Date().toISOString(),
    };
  }

  @SkipThrottle()
  @Get('ready')
  async getReadiness(@Res({ passthrough: true }) res?: Response) {
    try {
      await pool.query('SELECT 1');
      return {
        status: 'READY',
        database: 'CONNECTED',
        timestamp: new Date().toISOString(),
      };
    } catch {
      if (res) {
        res.status(HttpStatus.SERVICE_UNAVAILABLE);
      }
      return { status: 'not_ready' };
    }
  }

  @Post('admin/reconcile')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('ADMIN')
  async triggerReconcile() {
    return this.inventoryService.reconcile();
  }
}
