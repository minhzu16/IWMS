import {
  Controller,
  Get,
  Post,
  Query,
  Body,
  UseGuards,
  ParseIntPipe,
  Res,
} from '@nestjs/common';
import { InventoryService } from './inventory.service.js';
import { JwtAuthGuard, RolesGuard } from '../../common/guards.js';
import { Roles, CurrentUser, RequestUser } from '../../common/decorators.js';

@Controller('inventory')
@UseGuards(JwtAuthGuard, RolesGuard)
export class InventoryController {
  constructor(private inventoryService: InventoryService) {}

  @Get('levels')
  async getLevels(
    @Query('warehouseId') warehouseId?: string,
    @Query('productId') productId?: string,
    @Query('lowStock') lowStock?: string,
    @Query('format') format?: string,
    @Res({ passthrough: true }) res?: any,
  ) {
    if (format === 'csv' && res) {
      res.setHeader('Content-Type', 'text/csv');
      res.setHeader('Content-Disposition', 'attachment; filename="stock-levels.csv"');
      return this.inventoryService.exportLevelsCsv(
        warehouseId ? parseInt(warehouseId, 10) : undefined,
      );
    }

    return this.inventoryService.getLevels({
      warehouseId: warehouseId ? parseInt(warehouseId, 10) : undefined,
      productId: productId ? parseInt(productId, 10) : undefined,
      lowStock: lowStock === 'true',
    });
  }

  @Get('movements')
  async getMovements(
    @Query('productId') productId?: string,
    @Query('warehouseId') warehouseId?: string,
    @Query('movementType') movementType?: string,
    @Query('startDate') startDate?: string,
    @Query('endDate') endDate?: string,
    @Query('page') page?: string,
    @Query('limit') limit?: string,
    @Query('format') format?: string,
    @Res({ passthrough: true }) res?: any,
  ) {
    if (format === 'csv' && res) {
      res.setHeader('Content-Type', 'text/csv');
      res.setHeader('Content-Disposition', 'attachment; filename="stock-movements.csv"');
      return this.inventoryService.exportMovementsCsv(
        warehouseId ? parseInt(warehouseId, 10) : undefined,
      );
    }

    return this.inventoryService.getMovements({
      productId: productId ? parseInt(productId, 10) : undefined,
      warehouseId: warehouseId ? parseInt(warehouseId, 10) : undefined,
      movementType,
      startDate,
      endDate,
      page: page ? parseInt(page, 10) : 1,
      limit: limit ? parseInt(limit, 10) : 25,
    });
  }

  @Get('as-of')
  async getAsOf(
    @Query('date') date: string,
    @Query('warehouseId') warehouseId?: string,
  ) {
    const targetDate = date || new Date().toISOString();
    return this.inventoryService.getAsOfStock(
      targetDate,
      warehouseId ? parseInt(warehouseId, 10) : undefined,
    );
  }

  @Post('adjustments')
  @Roles('ADMIN', 'MANAGER')
  async createAdjustment(
    @Body()
    body: {
      warehouseId: number;
      productId: number;
      delta: number;
      reason: string;
    },
    @CurrentUser() user: RequestUser,
  ) {
    return this.inventoryService.createAdjustment(
      body.warehouseId,
      body.productId,
      body.delta,
      body.reason,
      user.id,
    );
  }

  @Get('reconcile')
  @Roles('ADMIN', 'MANAGER')
  async reconcile() {
    return this.inventoryService.reconcile();
  }
}
