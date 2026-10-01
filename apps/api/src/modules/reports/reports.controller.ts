import { Controller, Get, Query, UseGuards } from '@nestjs/common';
import { ReportsService } from './reports.service.js';
import { JwtAuthGuard, RolesGuard } from '../../common/guards.js';

@Controller('reports')
@UseGuards(JwtAuthGuard, RolesGuard)
export class ReportsController {
  constructor(private reportsService: ReportsService) {}

  @Get('stock-valuation')
  async getStockValuation(@Query('warehouseId') warehouseId?: string) {
    return this.reportsService.getStockValuation(
      warehouseId ? parseInt(warehouseId, 10) : undefined,
    );
  }

  @Get('low-stock')
  async getLowStockAlerts(@Query('warehouseId') warehouseId?: string) {
    return this.reportsService.getLowStockAlerts(
      warehouseId ? parseInt(warehouseId, 10) : undefined,
    );
  }

  @Get('abc')
  async getABCAnalysis() {
    return this.reportsService.getABCAnalysis();
  }

  @Get('movement-summary')
  async getMovementSummary(@Query('days') days?: string) {
    return this.reportsService.getMovementSummary(days ? parseInt(days, 10) : 30);
  }
}
